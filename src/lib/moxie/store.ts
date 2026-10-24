import { sha256 } from "@noble/hashes/sha2.js";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  base58,
  bytesToHex,
  commitmentOf,
  derivePolygonAddress,
  ed25519,
  hexToBytes,
  PAPER_SECRET_HEX,
  publicKeyFromSecret,
  signIntent,
} from "./codec.ts";
import { asProtocolError } from "./errors.ts";
import { INITIAL_ONBOARD_USDC, positionsOf, type Position } from "./format.ts";
import type { IntentRow } from "./intents.functions.ts";
import { refundEscrow, sharesFor } from "./machine.ts";
import { complementAsk, MARKETS, outcomeTokenId } from "./markets.ts";
import type { DeskOrder, Intent, Ledger, Phase, RouteEvent } from "./types.ts";

const ssrSafeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // ignore storage quota or privacy errors
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore storage errors
    }
  },
};

function identity(secretHex: string): { secretKeyHex: string; publicKeyB58: string } {
  try {
    return {
      secretKeyHex: secretHex,
      publicKeyB58: base58.encode(publicKeyFromSecret(hexToBytes(secretHex))),
    };
  } catch {
    return {
      secretKeyHex: PAPER_SECRET_HEX,
      publicKeyB58: "11111111111111111111111111111111",
    };
  }
}

export function deriveWalletIdentity(
  label: string,
  externalPubkey?: string | null,
): {
  secretKeyHex: string;
  publicKeyB58: string;
  externalPublicKey: string | null;
  walletAddress: string;
} {
  const cleanExt = externalPubkey?.trim() || null;
  const seedTag = cleanExt
    ? `moxie.wallet.ext.v2|${cleanExt}`
    : `moxie.wallet.auth.v2|${label.trim().toLowerCase()}`;
  const secretBytes = sha256(new TextEncoder().encode(seedTag));
  const secretKeyHex = bytesToHex(secretBytes);
  const publicKeyB58 = base58.encode(publicKeyFromSecret(secretBytes));
  const walletAddress = cleanExt ?? publicKeyB58;
  return {
    secretKeyHex,
    publicKeyB58,
    externalPublicKey: cleanExt,
    walletAddress,
  };
}

let cachedDefaultPaper: { secretKeyHex: string; publicKeyB58: string } | null = null;
function getDefaultPaper(): { secretKeyHex: string; publicKeyB58: string } {
  cachedDefaultPaper ??= identity(PAPER_SECRET_HEX);
  return cachedDefaultPaper;
}

function upsert(orders: DeskOrder[], order: DeskOrder): DeskOrder[] {
  return [order, ...orders.filter((item) => item.id !== order.id)].slice(0, 50);
}

export function validateSlippagePercent(raw: number): {
  valid: boolean;
  clamped: number;
  bps: number;
  error?: string;
} {
  if (!Number.isFinite(raw)) {
    return { valid: false, clamped: 1.0, bps: 100, error: "Enter a number between 0.1% and 50.0%." };
  }
  if (raw < 0.1 || raw > 50.0) {
    return {
      valid: false,
      clamped: Math.max(0.1, Math.min(50.0, raw)),
      bps: Math.round(Math.max(0.1, Math.min(50.0, raw)) * 100),
      error: "Price room must be between 0.1% and 50.0%.",
    };
  }
  const rounded = Math.round(raw * 10) / 10;
  return { valid: true, clamped: rounded, bps: Math.round(rounded * 100) };
}

export type ActiveModal = "connect" | "deposit" | "withdraw" | "cmdk" | "export-key" | null;
export type ThemePreference = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "moxie_theme";

export function resolveThemePreference(pref: ThemePreference): "dark" | "light" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export function applyThemeToDocument(pref: ThemePreference): "dark" | "light" {
  const resolved = resolveThemePreference(pref);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("light", resolved === "light");
    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // ignore storage errors
    }
  }
  return resolved;
}

export interface AddPositionInput {
  marketId: string;
  side: "yes" | "no";
  tokenId: string;
  usdcMicro: number;
  executionPriceMicro: number;
  orderType: "market" | "limit";
}

export interface WalletLedgerSnapshot {
  onboarded: boolean;
  onboardedUsdcMicro: number;
  faucetMintsMicro: number;
  realizedSellProceedsMicro: number;
  soldCostBasisMicro: number;
  withdrawnMicro: number;
  locked: number;
  nextNonce: number;
  consumed: string[];
  soldOrderIds: string[];
}

const EMPTY_LEDGER_SNAPSHOT: WalletLedgerSnapshot = {
  onboarded: false,
  onboardedUsdcMicro: 0,
  faucetMintsMicro: 0,
  realizedSellProceedsMicro: 0,
  soldCostBasisMicro: 0,
  withdrawnMicro: 0,
  locked: 0,
  nextNonce: 0,
  consumed: [],
  soldOrderIds: [],
};

function tradesKey(walletAddress: string): string {
  return `moxie_trades_${walletAddress}`;
}

function positionsKey(walletAddress: string): string {
  return `moxie_positions_${walletAddress}`;
}

function ledgerKey(walletAddress: string): string {
  return `moxie_ledger_${walletAddress}`;
}

/**
 * Strictly computes Available Balance from:
 * (Initial 1000 Test USDC + Faucet Mints + Realized Sell Proceeds) - (Active Position Cost Basis + Sold Cost Basis + Withdrawn + Locked)
 */
export function computeAvailableBalance(
  orders: DeskOrder[],
  snapshot: WalletLedgerSnapshot,
): number {
  const activePositions = positionsOf(orders);
  const activeCostBasisMicro = activePositions.reduce((sum, pos) => sum + pos.costMicro, 0);
  const credits =
    snapshot.onboardedUsdcMicro +
    snapshot.faucetMintsMicro +
    snapshot.realizedSellProceedsMicro;
  const debits =
    activeCostBasisMicro +
    snapshot.soldCostBasisMicro +
    snapshot.withdrawnMicro +
    snapshot.locked;
  return Math.max(0, Math.round(credits - debits));
}

function loadWalletStorage(walletAddress: string): {
  orders: DeskOrder[];
  positions: Position[];
  ledger: WalletLedgerSnapshot;
} {
  if (typeof window === "undefined" || !walletAddress) {
    return { orders: [], positions: [], ledger: { ...EMPTY_LEDGER_SNAPSHOT } };
  }
  try {
    const rawTrades = window.localStorage.getItem(tradesKey(walletAddress));
    const parsedOrders = rawTrades ? (JSON.parse(rawTrades) as DeskOrder[]) : [];
    const safeOrders = Array.isArray(parsedOrders) ? parsedOrders : [];

    const rawLedger = window.localStorage.getItem(ledgerKey(walletAddress));
    const parsedLedger = rawLedger
      ? (JSON.parse(rawLedger) as Partial<WalletLedgerSnapshot>)
      : {};

    const ledger: WalletLedgerSnapshot = {
      onboarded: Boolean(parsedLedger.onboarded),
      onboardedUsdcMicro: parsedLedger.onboarded ? INITIAL_ONBOARD_USDC : 0,
      faucetMintsMicro: Math.max(0, Number(parsedLedger.faucetMintsMicro ?? 0)),
      realizedSellProceedsMicro: Math.max(0, Number(parsedLedger.realizedSellProceedsMicro ?? 0)),
      soldCostBasisMicro: Math.max(0, Number(parsedLedger.soldCostBasisMicro ?? 0)),
      withdrawnMicro: Math.max(0, Number(parsedLedger.withdrawnMicro ?? 0)),
      locked: Math.max(0, Number(parsedLedger.locked ?? 0)),
      nextNonce: Math.max(0, Number(parsedLedger.nextNonce ?? 0)),
      consumed: Array.isArray(parsedLedger.consumed) ? parsedLedger.consumed : [],
      soldOrderIds: Array.isArray(parsedLedger.soldOrderIds) ? parsedLedger.soldOrderIds : [],
    };

    const computedPositions = positionsOf(safeOrders);
    // If positions were persisted directly in moxie_positions_${walletAddress}, ensure consistency
    window.localStorage.setItem(positionsKey(walletAddress), JSON.stringify(computedPositions));

    return { orders: safeOrders, positions: computedPositions, ledger };
  } catch {
    return { orders: [], positions: [], ledger: { ...EMPTY_LEDGER_SNAPSHOT } };
  }
}

function saveWalletStorage(
  walletAddress: string,
  orders: DeskOrder[],
  ledger: WalletLedgerSnapshot,
): void {
  if (typeof window === "undefined" || !walletAddress) return;
  try {
    const activePositions = positionsOf(orders);
    window.localStorage.setItem(tradesKey(walletAddress), JSON.stringify(orders));
    window.localStorage.setItem(positionsKey(walletAddress), JSON.stringify(activePositions));
    window.localStorage.setItem(ledgerKey(walletAddress), JSON.stringify(ledger));
  } catch {
    // Ignore storage quota errors
  }
}

function mapDbStatusToPhase(status: IntentRow["status"]): Phase {
  switch (status) {
    case "PENDING_ESCROW":
      return "intent_signed";
    case "ESCROW_LOCKED":
      return "escrow_locked";
    case "SOLVER_BIDDING":
      return "solver_matched";
    case "CLOB_SUBMITTED":
      return "clob_filled";
    case "SETTLED":
      return "settled";
    case "REFUNDED":
      return "refunded";
    case "EXPIRED":
      return "rejected";
    default:
      return "settled";
  }
}

function intentRowToDeskOrder(row: IntentRow): DeskOrder {
  const matchedMarket =
    MARKETS.find(
      (m) => m.conditionId.toLowerCase() === row.market_condition_id.toLowerCase(),
    ) ?? MARKETS[0]!;
  const side: "yes" | "no" = row.outcome_index === 0 ? "yes" : "no";
  const sizeMicro = Math.max(
    1,
    Math.round(Number.parseFloat(row.usdc_amount_in || "0") * 1_000_000),
  );
  const askMicro =
    side === "yes" ? matchedMarket.yesAskMicro : complementAsk(matchedMarket.yesAskMicro);
  const minSharesMicro = Math.round(
    Number.parseFloat(row.min_shares_out || "0") * 1_000_000,
  );
  const sharesMicro =
    minSharesMicro > 0 ? minSharesMicro : sharesFor(sizeMicro, Math.max(10_000, askMicro));
  const phase = mapDbStatusToPhase(row.status);
  const commitmentHex = (row.polygon_order_hash ?? "").replace(/^0x/i, "").padEnd(64, "0").slice(0, 64);

  return {
    id: row.id,
    intent: {
      taker: row.user_solana_pubkey,
      nonce: row.nonce,
      marketId: matchedMarket.id,
      side,
      outcomeTokenId: outcomeTokenId(matchedMarket.id, side),
      maxSlippageBps: row.slippage_bps || 100,
      expiryUnix: Math.floor(Date.parse(row.expiry_timestamp) / 1000) || Math.floor(Date.now() / 1000) + 180,
      sizeMicro,
      polygonRecipient: row.derived_polygon_address,
      referenceAskMicro: askMicro,
    },
    signatureHex: row.solana_tx_signature ?? commitmentHex,
    commitmentHex,
    phase,
    quotes: [],
    solverName: "Northbridge",
    polygonTxHex: row.polygon_order_hash ?? `0x${commitmentHex}`,
    sharesMicro: phase === "settled" ? sharesMicro : undefined,
    fillMicro: phase === "settled" ? sizeMicro : undefined,
    logs: [
      {
        title: phase === "settled" ? "Settled" : row.status,
        detail: "Rehydrated from wallet intent ledger.",
      },
    ],
    createdAt: Math.floor(Date.parse(row.created_at) / 1000) || Math.floor(Date.now() / 1000),
  };
}

interface DeskState {
  secretKeyHex: string;
  publicKeyB58: string;
  available: number;
  locked: number;
  nextNonce: number;
  consumed: string[];
  orders: DeskOrder[];
  pinnedId: string | null;
  connected: boolean;
  connectLabel: string | null;
  externalPublicKey: string | null;
  onboarded: boolean;
  onboardedUsdcMicro: number;
  faucetMintsMicro: number;
  realizedSellProceedsMicro: number;
  soldCostBasisMicro: number;
  withdrawnMicro: number;
  soldOrderIds: string[];
  slippagePct: number;
  theme: ThemePreference;
  activeModal: ActiveModal;
  consoleLogs: string[];
  connect: (label: string, externalPubkey?: string | null) => void;
  disconnect: () => void;
  completeAutoOnboard: (walletAddress: string) => void;
  hydrateFromDb: (
    walletAddress: string,
    rows: IntentRow[],
    alreadyFunded?: boolean,
  ) => void;
  setSlippagePct: (pct: number) => void;
  setTheme: (theme: ThemePreference) => void;
  setActiveModal: (modal: ActiveModal) => void;
  pushConsoleLog: (line: string) => void;
  mintTestUsdc: (amountMicro?: number) => void;
  withdrawUsdc: (amountMicro: number) => void;
  addToPosition: (input: AddPositionInput) => { addedSharesMicro: number };
  cashOutPosition: (tokenId: string, payoutMicro: number, percentage?: number) => void;
  apply: (event: RouteEvent) => void;
  refundOrder: (id: string, now: number) => void;
  resetBook: () => void;
  rotateKey: () => void;
  ledger: () => Ledger;
}

function snapshotOfState(state: DeskState): WalletLedgerSnapshot {
  return {
    onboarded: state.onboarded,
    onboardedUsdcMicro: state.onboardedUsdcMicro,
    faucetMintsMicro: state.faucetMintsMicro,
    realizedSellProceedsMicro: state.realizedSellProceedsMicro,
    soldCostBasisMicro: state.soldCostBasisMicro,
    withdrawnMicro: state.withdrawnMicro,
    locked: state.locked,
    nextNonce: state.nextNonce,
    consumed: state.consumed,
    soldOrderIds: state.soldOrderIds,
  };
}

function activeAddressOf(state: {
  externalPublicKey: string | null;
  publicKeyB58: string;
}): string {
  return (state.externalPublicKey ?? state.publicKeyB58).trim();
}

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      ...getDefaultPaper(),
      available: 0,
      locked: 0,
      nextNonce: 0,
      consumed: [],
      orders: [],
      pinnedId: null,
      connected: false,
      connectLabel: null,
      externalPublicKey: null,
      onboarded: false,
      onboardedUsdcMicro: 0,
      faucetMintsMicro: 0,
      realizedSellProceedsMicro: 0,
      soldCostBasisMicro: 0,
      withdrawnMicro: 0,
      soldOrderIds: [],
      slippagePct: 1.0,
      theme: "dark",
      activeModal: null,
      consoleLogs: [],

      connect: (label: string, externalPubkey?: string | null) => {
        const derived = deriveWalletIdentity(label, externalPubkey);
        const stored = loadWalletStorage(derived.walletAddress);
        const available = computeAvailableBalance(stored.orders, stored.ledger);

        // Flush previous in-memory state and hydrate strictly for this walletAddress
        set({
          secretKeyHex: derived.secretKeyHex,
          publicKeyB58: derived.publicKeyB58,
          externalPublicKey: derived.externalPublicKey,
          connected: true,
          connectLabel: label,
          orders: stored.orders,
          pinnedId: stored.orders[0]?.id ?? null,
          onboarded: stored.ledger.onboarded,
          onboardedUsdcMicro: stored.ledger.onboardedUsdcMicro,
          faucetMintsMicro: stored.ledger.faucetMintsMicro,
          realizedSellProceedsMicro: stored.ledger.realizedSellProceedsMicro,
          soldCostBasisMicro: stored.ledger.soldCostBasisMicro,
          withdrawnMicro: stored.ledger.withdrawnMicro,
          locked: stored.ledger.locked,
          nextNonce: stored.ledger.nextNonce,
          consumed: stored.ledger.consumed,
          soldOrderIds: stored.ledger.soldOrderIds,
          available,
        });
      },

      disconnect: () => {
        // Flush in-memory state without wiping per-wallet storage in localStorage
        set({
          connected: false,
          connectLabel: null,
          externalPublicKey: null,
          available: 0,
          locked: 0,
          nextNonce: 0,
          consumed: [],
          orders: [],
          pinnedId: null,
          onboarded: false,
          onboardedUsdcMicro: 0,
          faucetMintsMicro: 0,
          realizedSellProceedsMicro: 0,
          soldCostBasisMicro: 0,
          withdrawnMicro: 0,
          soldOrderIds: [],
        });
      },

      completeAutoOnboard: (walletAddress: string) => {
        const state = get();
        const currentAddr = activeAddressOf(state);
        if (!state.connected || currentAddr !== walletAddress.trim()) return;
        if (state.onboarded && state.onboardedUsdcMicro === INITIAL_ONBOARD_USDC) return;

        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          onboarded: true,
          onboardedUsdcMicro: INITIAL_ONBOARD_USDC,
        };
        const nextAvailable = computeAvailableBalance(state.orders, nextSnap);
        saveWalletStorage(currentAddr, state.orders, nextSnap);

        set({
          onboarded: true,
          onboardedUsdcMicro: INITIAL_ONBOARD_USDC,
          available: nextAvailable,
        });
      },

      hydrateFromDb: (
        walletAddress: string,
        rows: IntentRow[],
        alreadyFunded?: boolean,
      ) => {
        const state = get();
        const currentAddr = activeAddressOf(state);
        if (!state.connected || currentAddr !== walletAddress.trim()) return;

        const scopedRows = rows.filter((r) => r.user_solana_pubkey === currentAddr);
        let mergedOrders = [...state.orders];
        const soldSet = new Set(state.soldOrderIds);

        for (const row of scopedRows) {
          if (soldSet.has(row.id) || soldSet.has(`nonce:${row.nonce}`)) continue;
          const exists = mergedOrders.some(
            (o) =>
              o.id === row.id ||
              o.intent.nonce === row.nonce ||
              (row.polygon_order_hash &&
                o.polygonTxHex?.toLowerCase() === row.polygon_order_hash.toLowerCase()),
          );
          if (!exists) {
            mergedOrders.push(intentRowToDeskOrder(row));
          }
        }

        mergedOrders = mergedOrders
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 50);

        const isOnboarded = state.onboarded || Boolean(alreadyFunded) || mergedOrders.length > 0;
        const onboardedUsdcMicro = isOnboarded ? INITIAL_ONBOARD_USDC : 0;

        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          onboarded: isOnboarded,
          onboardedUsdcMicro,
        };
        const nextAvailable = computeAvailableBalance(mergedOrders, nextSnap);
        saveWalletStorage(currentAddr, mergedOrders, nextSnap);

        set({
          orders: mergedOrders,
          onboarded: isOnboarded,
          onboardedUsdcMicro,
          available: nextAvailable,
        });
      },

      setSlippagePct: (pct: number) => {
        const check = validateSlippagePercent(pct);
        set({ slippagePct: check.clamped });
      },

      setTheme: (theme: ThemePreference) => {
        applyThemeToDocument(theme);
        set({ theme });
      },

      setActiveModal: (modal: ActiveModal) => set({ activeModal: modal }),

      pushConsoleLog: (line: string) => {
        const stamp = new Date().toISOString().slice(11, 19);
        set((state) => ({
          consoleLogs: [`${stamp}  ${line}`, ...state.consoleLogs].slice(0, 60),
        }));
      },

      mintTestUsdc: (amountMicro = 100 * 1_000_000) => {
        const state = get();
        if (!state.connected) return;
        const currentAddr = activeAddressOf(state);
        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          faucetMintsMicro: state.faucetMintsMicro + Math.max(0, amountMicro),
        };
        const nextAvailable = computeAvailableBalance(state.orders, nextSnap);
        saveWalletStorage(currentAddr, state.orders, nextSnap);

        set({
          faucetMintsMicro: nextSnap.faucetMintsMicro,
          available: nextAvailable,
        });
      },

      withdrawUsdc: (amountMicro: number) => {
        const state = get();
        if (!state.connected || amountMicro <= 0 || amountMicro > state.available) return;
        const currentAddr = activeAddressOf(state);
        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          withdrawnMicro: state.withdrawnMicro + amountMicro,
        };
        const nextAvailable = computeAvailableBalance(state.orders, nextSnap);
        saveWalletStorage(currentAddr, state.orders, nextSnap);

        set({
          withdrawnMicro: nextSnap.withdrawnMicro,
          available: nextAvailable,
        });
      },

      addToPosition: (input: AddPositionInput) => {
        const state = get();
        if (!state.connected) {
          throw new Error("Log in or connect your wallet before placing an order.");
        }
        if (input.usdcMicro <= 0 || input.usdcMicro > state.available) {
          throw new Error("Order amount exceeds your Available Balance.");
        }
        const currentAddr = activeAddressOf(state);
        const now = Math.floor(Date.now() / 1000);
        const nonce = Math.max(state.nextNonce, now);
        const addedSharesMicro = Math.max(
          1,
          sharesFor(input.usdcMicro, Math.max(10_000, input.executionPriceMicro)),
        );
        const secretBytes = hexToBytes(state.secretKeyHex);
        const intentObj: Intent = {
          taker: currentAddr,
          nonce,
          marketId: input.marketId,
          side: input.side,
          outcomeTokenId: input.tokenId,
          maxSlippageBps: Math.round(state.slippagePct * 100),
          expiryUnix: now + 180,
          sizeMicro: input.usdcMicro,
          polygonRecipient: derivePolygonAddress(publicKeyFromSecret(secretBytes)),
          referenceAskMicro: input.executionPriceMicro,
        };
        const commitmentHex = bytesToHex(commitmentOf(intentObj));
        const signatureHex = bytesToHex(signIntent(intentObj, secretBytes));
        const newOrder: DeskOrder = {
          id: `${currentAddr}:${nonce}`,
          intent: intentObj,
          signatureHex,
          commitmentHex,
          phase: "settled",
          quotes: [],
          solverName: "Northbridge",
          polygonTxHex: `0x${commitmentHex}`,
          sharesMicro: addedSharesMicro,
          fillMicro: input.usdcMicro,
          logs: [
            {
              title: input.orderType === "limit" ? "Limit Buy Filled" : "Market Buy Filled",
              detail: `Added ${addedSharesMicro} micro-shares to ${input.side.toUpperCase()} position.`,
            },
          ],
          createdAt: now,
        };

        const nextOrders = upsert(state.orders, newOrder);
        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          nextNonce: nonce + 1,
          consumed: [...state.consumed, `${currentAddr}:${nonce}`],
        };
        const nextAvailable = computeAvailableBalance(nextOrders, nextSnap);
        saveWalletStorage(currentAddr, nextOrders, nextSnap);

        set({
          orders: nextOrders,
          nextNonce: nextSnap.nextNonce,
          consumed: nextSnap.consumed,
          available: nextAvailable,
          pinnedId: newOrder.id,
        });

        return { addedSharesMicro };
      },

      cashOutPosition: (tokenId: string, payoutMicro: number, percentage = 100) => {
        const state = get();
        if (!state.connected) return;
        const currentAddr = activeAddressOf(state);
        const clampedPct = Math.max(1, Math.min(100, percentage));
        const ratioRemaining = (100 - clampedPct) / 100;

        // Calculate cost basis of the position being sold
        const matchingSettled = state.orders.filter(
          (o) =>
            o.phase === "settled" &&
            o.intent.outcomeTokenId === tokenId &&
            (o.sharesMicro ?? 0) > 0 &&
            (o.fillMicro ?? 0) > 0,
        );
        if (matchingSettled.length === 0) return;

        const currentPosCostMicro = matchingSettled.reduce(
          (sum, o) => sum + (o.fillMicro ?? o.intent.sizeMicro),
          0,
        );
        const newlySoldOrderIds = [...state.soldOrderIds];

        const nextOrders = state.orders.map((order) => {
          if (
            order.phase !== "settled" ||
            order.intent.outcomeTokenId !== tokenId ||
            !order.sharesMicro ||
            !order.fillMicro
          ) {
            return order;
          }
          if (clampedPct >= 99.99) {
            newlySoldOrderIds.push(order.id, `nonce:${order.intent.nonce}`);
            return {
              ...order,
              sharesMicro: 0,
              fillMicro: 0,
            };
          }
          return {
            ...order,
            sharesMicro: Math.max(1, Math.round(order.sharesMicro * ratioRemaining)),
            fillMicro: Math.max(1, Math.round(order.fillMicro * ratioRemaining)),
          };
        });

        const remainingPosCostMicro = nextOrders
          .filter(
            (o) =>
              o.phase === "settled" &&
              o.intent.outcomeTokenId === tokenId &&
              (o.sharesMicro ?? 0) > 0 &&
              (o.fillMicro ?? 0) > 0,
          )
          .reduce((sum, o) => sum + (o.fillMicro ?? 0), 0);

        const costBasisRemovedMicro = Math.max(0, currentPosCostMicro - remainingPosCostMicro);

        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          realizedSellProceedsMicro: state.realizedSellProceedsMicro + Math.max(0, payoutMicro),
          soldCostBasisMicro: state.soldCostBasisMicro + costBasisRemovedMicro,
          soldOrderIds: Array.from(new Set(newlySoldOrderIds)),
        };
        const nextAvailable = computeAvailableBalance(nextOrders, nextSnap);
        saveWalletStorage(currentAddr, nextOrders, nextSnap);

        set({
          orders: nextOrders,
          realizedSellProceedsMicro: nextSnap.realizedSellProceedsMicro,
          soldCostBasisMicro: nextSnap.soldCostBasisMicro,
          soldOrderIds: nextSnap.soldOrderIds,
          available: nextAvailable,
        });
      },

      ledger: () => {
        const state = get();
        return { available: state.available, locked: state.locked, consumed: state.consumed };
      },

      apply: (event) => {
        const state = get();
        if (!state.connected) return;
        const currentAddr = activeAddressOf(state);
        const normalizedOrder: DeskOrder = {
          ...event.order,
          intent: {
            ...event.order.intent,
            taker: currentAddr,
          },
        };
        const nextOrders = upsert(state.orders, normalizedOrder);
        const nextSnap: WalletLedgerSnapshot = {
          ...snapshotOfState(state),
          locked: event.ledger.locked,
          consumed: event.ledger.consumed,
          nextNonce:
            event.type === "locked"
              ? Math.max(state.nextNonce, event.order.intent.nonce + 1)
              : state.nextNonce,
        };
        const nextAvailable = computeAvailableBalance(nextOrders, nextSnap);
        saveWalletStorage(currentAddr, nextOrders, nextSnap);

        set({
          orders: nextOrders,
          locked: nextSnap.locked,
          consumed: nextSnap.consumed,
          nextNonce: nextSnap.nextNonce,
          available: nextAvailable,
          pinnedId: normalizedOrder.id,
        });
      },

      refundOrder: (id, now) => {
        const state = get();
        if (!state.connected) return;
        const currentAddr = activeAddressOf(state);
        const order = state.orders.find((item) => item.id === id);
        if (!order) return;
        try {
          const result = refundEscrow({
            ledger: { available: state.available, locked: state.locked, consumed: state.consumed },
            escrow: {
              phase: order.phase,
              commitmentHex: order.commitmentHex,
              sizeMicro: order.intent.sizeMicro,
              expiryUnix: order.intent.expiryUnix,
              nonce: order.intent.nonce,
              taker: order.intent.taker,
              solverPubkey: order.solverPubkey,
              fillMicro: order.fillMicro,
              sharesMicro: order.sharesMicro,
            },
            now,
          });
          const pastExpiry = order.phase === "solver_matched";
          const next: DeskOrder = {
            ...order,
            phase: "refunded",
            error: undefined,
            logs: [
              ...order.logs,
              {
                title: "Refunded",
                detail: pastExpiry
                  ? "Clock moved past expiry. The vault returned the USDC. The nonce stays spent."
                  : "Lock cancelled before a solver was bound. The nonce stays spent.",
              },
            ],
          };
          const nextOrders = upsert(state.orders, next);
          const nextSnap: WalletLedgerSnapshot = {
            ...snapshotOfState(state),
            locked: result.ledger.locked,
            consumed: result.ledger.consumed,
          };
          const nextAvailable = computeAvailableBalance(nextOrders, nextSnap);
          saveWalletStorage(currentAddr, nextOrders, nextSnap);

          set({
            orders: nextOrders,
            locked: nextSnap.locked,
            consumed: nextSnap.consumed,
            available: nextAvailable,
            pinnedId: id,
          });
        } catch (error) {
          const protocol = asProtocolError(error);
          const nextOrders = upsert(state.orders, {
            ...order,
            error: { code: protocol.code, message: protocol.message },
            logs: [...order.logs, { title: "Refund refused", detail: protocol.message }],
          });
          set({
            orders: nextOrders,
            pinnedId: id,
          });
        }
      },

      resetBook: () => {
        const state = get();
        const currentAddr = activeAddressOf(state);
        const nextSnap: WalletLedgerSnapshot = {
          ...EMPTY_LEDGER_SNAPSHOT,
          onboarded: state.onboarded,
          onboardedUsdcMicro: state.onboarded ? INITIAL_ONBOARD_USDC : 0,
        };
        const nextAvailable = computeAvailableBalance([], nextSnap);
        if (state.connected) {
          saveWalletStorage(currentAddr, [], nextSnap);
        }
        set({
          ...nextSnap,
          orders: [],
          available: state.connected ? nextAvailable : 0,
          pinnedId: null,
        });
      },

      rotateKey: () => {
        const secret = ed25519.utils.randomSecretKey();
        const nextId = identity(bytesToHex(secret));
        set({
          ...nextId,
          ...EMPTY_LEDGER_SNAPSHOT,
          externalPublicKey: null,
          orders: [],
          available: 0,
          pinnedId: null,
        });
      },
    }),
    {
      name: "moxie-session-v3",
      storage: createJSONStorage(() => ssrSafeStorage),
      skipHydration: true,
      partialize: (state) => ({
        secretKeyHex: state.secretKeyHex,
        publicKeyB58: state.publicKeyB58,
        connected: state.connected,
        connectLabel: state.connectLabel,
        externalPublicKey: state.externalPublicKey,
        slippagePct: state.slippagePct,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (typeof window !== "undefined") {
          try {
            const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "system") {
              state.setTheme(savedTheme);
            } else {
              applyThemeToDocument(state.theme ?? "dark");
            }
          } catch {
            applyThemeToDocument(state.theme ?? "dark");
          }
        }
        if (state.connected && state.connectLabel) {
          // Re-load the active wallet's isolated trades, positions, and balance snapshot
          state.connect(state.connectLabel, state.externalPublicKey);
        } else {
          state.disconnect();
        }
      },
    },
  ),
);
