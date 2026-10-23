import { sha256 } from "@noble/hashes/sha2.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Settings, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { ParticleOrb } from "@/components/particle-orb";
import { derivePolygonAddress as deriveProxyAddress } from "@/lib/derive-proxy";
import { base58, escrowAddress } from "@/lib/moxie/codec";
import {
  formatCents,
  formatShares,
  formatUsdc,
  MAX_TICKET,
  money6,
  parseUsdc,
  positionsOf,
  shortHex,
  shortKey,
} from "@/lib/moxie/format";
import { listIntents, saveIntent, stepSolver, type IntentRow, type IntentStatus } from "@/lib/moxie/intents.functions";
import { maxPrice, sharesFor } from "@/lib/moxie/machine";
import { complementAsk, MARKETS, outcomeTokenId, type Market } from "@/lib/moxie/markets";
import { planRoute } from "@/lib/moxie/route";
import { lockDevnetIntent } from "@/lib/solana/escrow-tx";
import { formatToken, injectedProvider, openMobileWallet, readDevnetBalance, type InjectedWallet, type SolanaProvider } from "@/lib/solana/wallet";
import { sfx } from "@/lib/moxie/sound";
import { useDesk } from "@/lib/moxie/store";
import type { DeskOrder, Phase } from "@/lib/moxie/types";

type Books = Record<string, { yes: number; no: number }>;
type Drill = "route" | "expire" | "replay" | "slip" | "badproof";
type Side = "yes" | "no";

type ConnectId = InjectedWallet | "Mobile" | "Google" | "X";

const CONNECTS: { id: ConnectId; label: string; hint: string }[] = [
  { id: "Phantom", label: "Phantom", hint: "Devnet extension" },
  { id: "Solflare", label: "Solflare", hint: "Devnet extension" },
  { id: "Backpack", label: "Backpack", hint: "Devnet extension" },
  { id: "Mobile", label: "Mobile wallet", hint: "Opens the phone wallet" },
  { id: "Google", label: "Google", hint: "On-device Solana key" },
  { id: "X", label: "X", hint: "On-device Solana key" },
];

type ExternalWallet = {
  label: InjectedWallet;
  publicKey: string;
  provider: SolanaProvider;
  balance: bigint | null;
  decimals: number;
};
const DRILLS: { id: Drill; label: string }[] = [
  { id: "route", label: "Normal" },
  { id: "expire", label: "Expired" },
  { id: "replay", label: "Reuse ticket" },
  { id: "slip", label: "No wiggle" },
  { id: "badproof", label: "Break fill" },
];

const TRACK = [
  { title: "Locking USDC on Solana", hint: "Held until the bet fills or you cancel." },
  { title: "Matching via NEAR solvers", hint: "Solvers compete off the public book." },
  { title: "Filling on Polymarket", hint: "The position lands on your Polygon address. You don't hold gas." },
];

function initialBooks(): Books {
  return Object.fromEntries(
    MARKETS.map((market) => [market.id, { yes: market.yesAskMicro, no: complementAsk(market.yesAskMicro) }]),
  );
}

function hexToSecret(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function wait(ms: number, reduce: boolean): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, reduce ? 0 : ms);
  });
}

function pct(micro: number): string {
  return (micro / 10_000).toFixed(0);
}

function dbStatus(order: DeskOrder): IntentStatus | null {
  if (order.phase === "rejected") return order.error?.code === "EXPIRED" ? "EXPIRED" : null;
  if (order.phase === "intent_signed") return "PENDING_ESCROW";
  if (order.phase === "escrow_locked") return "ESCROW_LOCKED";
  if (order.phase === "solver_matched") return "SOLVER_BIDDING";
  if (order.phase === "clob_filled") return "CLOB_SUBMITTED";
  if (order.phase === "settled") return "SETTLED";
  if (order.phase === "refunded") return "REFUNDED";
  return null;
}

function chainPhase(status: string): Phase {
  if (status === "SOLVER_BIDDING") return "solver_matched";
  if (status === "CLOB_SUBMITTED") return "clob_filled";
  if (status === "SETTLED") return "settled";
  if (status === "REFUNDED") return "refunded";
  return "escrow_locked";
}

function shellOrder(input: {
  taker: string;
  nonce: number;
  market: Market;
  side: Side;
  sizeMicro: number;
  proxy: string;
  ask: number;
  signature: string;
  phase: Phase;
  hash?: string | null;
}): DeskOrder {
  return {
    id: input.signature.slice(0, 12),
    intent: {
      taker: input.taker,
      nonce: input.nonce,
      marketId: input.market.id,
      side: input.side,
      outcomeTokenId: outcomeTokenId(input.market.id, input.side),
      maxSlippageBps: 50,
      expiryUnix: input.nonce + 180,
      sizeMicro: input.sizeMicro,
      polygonRecipient: input.proxy,
      referenceAskMicro: input.ask,
    },
    signatureHex: input.signature,
    commitmentHex: "00".repeat(32),
    phase: input.phase,
    quotes: [],
    polygonTxHex: input.hash ?? undefined,
    logs: [],
    createdAt: input.nonce,
  };
}

function trackState(order: DeskOrder | null): { index: number; mark: "run" | "done" | "fail" } {
  if (!order) return { index: 0, mark: "run" };
  if (order.phase === "rejected" || (order.phase === "refunded" && !order.solverName)) {
    return { index: 0, mark: "fail" };
  }
  if (order.phase === "intent_signed") return { index: 0, mark: "run" };
  if (order.phase === "escrow_locked") return { index: 0, mark: "done" };
  if (order.phase === "solver_matched") return { index: 1, mark: order.error ? "fail" : "run" };
  if (order.phase === "refunded") return { index: 1, mark: "fail" };
  if (order.phase === "clob_filled") return { index: 2, mark: "run" };
  if (order.phase === "settled") return { index: 2, mark: "done" };
  return { index: 0, mark: "run" };
}

function friendly(order: DeskOrder): string {
  switch (order.error?.code) {
    case "EXPIRED":
      return "That bet expired before the deposit locked.";
    case "REPLAY":
      return "That ticket number was already used.";
    case "SLIPPAGE_EXCEEDED":
      return "No one could fill it at your price. Deposit is back.";
    case "PROOF_MISMATCH":
      return "The fill didn't check out. Deposit stays locked until you expire it.";
    case "INSUFFICIENT_BALANCE":
      return "Not enough free USDC.";
    default:
      return order.error?.message ?? "That bet stopped.";
  }
}

export function Desk() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState<Books>(initialBooks);
  const [side, setSide] = useState<Side>("yes");
  const [focusId, setFocusId] = useState(MARKETS[0]!.id);
  const [drill, setDrill] = useState<Drill>("route");
  const [slippage, setSlippage] = useState(50);
  const [settings, setSettings] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [rows, setRows] = useState<IntentRow[]>([]);
  const [trade, setTrade] = useState<{ marketId: string; amount: string } | null>(null);
  const [live, setLive] = useState<DeskOrder | null>(null);
  const [wallet, setWallet] = useState<ExternalWallet | null>(null);
  const [chainSig, setChainSig] = useState<string | null>(null);
  const [chainHash, setChainHash] = useState<string | null>(null);
  const [chainFills, setChainFills] = useState<{ id: string; question: string; side: Side; amount: string }[]>([]);
  const dbIdRef = useRef("");

  const save = useServerFn(saveIntent);
  const list = useServerFn(listIntents);
  const step = useServerFn(stepSolver);

  const publicKey = useDesk((state) => state.publicKeyB58);
  const available = useDesk((state) => state.available);
  const locked = useDesk((state) => state.locked);
  const connected = useDesk((state) => state.connected);
  const connectLabel = useDesk((state) => state.connectLabel);
  const orders = useDesk((state) => state.orders);

  useEffect(() => {
    let cancel = false;
    void Promise.resolve(useDesk.persist.rehydrate()).finally(() => {
      if (!cancel) setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBooks((current) => {
        const next: Books = { ...current };
        for (const market of MARKETS) {
          const book = next[market.id] ?? { yes: market.yesAskMicro, no: complementAsk(market.yesAskMicro) };
          const yes = Math.max(80_000, Math.min(920_000, book.yes + Math.round((Math.random() - 0.48) * 4_000)));
          next[market.id] = { yes, no: complementAsk(yes) };
        }
        return next;
      });
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  const activeKey = wallet?.publicKey ?? (connected ? publicKey : "");
  const polygon = activeKey ? deriveProxyAddress(activeKey) : "";
  const positions = positionsOf(orders);
  const market = MARKETS.find((item) => item.id === trade?.marketId) ?? null;
  const book = market ? (books[market.id] ?? { yes: market.yesAskMicro, no: complementAsk(market.yesAskMicro) }) : null;

  function pushLog(line: string) {
    const stamp = new Date().toISOString().slice(11, 19);
    setLogs((current) => [`${stamp}  ${line}`, ...current].slice(0, 40));
  }

  async function chooseConnect(choice: (typeof CONNECTS)[number]) {
    if (!ready) return;
    sfx.tap();
    if (choice.id === "Phantom" || choice.id === "Solflare" || choice.id === "Backpack") {
      const provider = injectedProvider(choice.id);
      if (provider) {
        try {
          const session = await provider.connect();
          const owner = session.publicKey.toString();
          const balance = await readDevnetBalance(owner);
          setWallet({ label: choice.id, publicKey: owner, provider, balance: balance.amount, decimals: balance.decimals });
          useDesk.getState().connect(choice.label);
          setConnectOpen(false);
          toast(`${choice.label} is on Devnet`);
          pushLog(`[solana] ${choice.label.toLowerCase()} ${shortKey(owner, 4, 4)}`);
          return;
        } catch (error) {
          toast(error instanceof Error ? error.message : "The wallet connection was cancelled.");
          return;
        }
      }
      toast(`${choice.label} isn't in this browser. Using the on-device key instead.`);
    }
    if (choice.id === "Mobile") {
      const phone = /Android|iPhone|iPad/i.test(navigator.userAgent);
      if (phone) {
        openMobileWallet();
        return;
      }
      toast("Mobile wallets open from a phone. Using the on-device key instead.");
    }
    setWallet(null);
    useDesk.getState().connect(choice.label);
    setConnectOpen(false);
    toast(`Connected with ${choice.label}`);
    pushLog(`[auth] ${choice.label.toLowerCase()} → local solana key ${shortKey(useDesk.getState().publicKeyB58, 4, 4)}`);
  }

  function openTrade(marketId: string, dollars: string) {
    if (!ready) return;
    sfx.tap();
    setFocusId(marketId);
    if (!wallet && !useDesk.getState().connected) {
      setConnectOpen(true);
      return;
    }
    setChainSig(null);
    setChainHash(null);
    setLive(null);
    setTrade({ marketId, amount: dollars });
  }

  async function mirror(order: DeskOrder, dbId: string) {
    const status = dbStatus(order);
    if (!status || status === "PENDING_ESCROW" || status === "EXPIRED") return;
    const pda = escrowAddress(base58.decode(order.intent.taker), order.intent.nonce).address;
    const hash = order.polygonTxHex
      ? order.polygonTxHex.startsWith("0x")
        ? order.polygonTxHex
        : `0x${order.polygonTxHex}`
      : null;
    const ceiling = maxPrice(order.intent.referenceAskMicro, Math.max(order.intent.maxSlippageBps, 0));
    const minShares = order.sharesMicro ?? sharesFor(order.intent.sizeMicro, Math.max(ceiling, 1));
    pushLog(`[neon] upsert intents status=${status} nonce=${order.intent.nonce}`);
    try {
      const saved = await save({
        data: {
          id: dbId,
          userSolanaPubkey: order.intent.taker,
          derivedPolygonAddress: order.intent.polygonRecipient,
          marketConditionId: order.intent.outcomeTokenId,
          outcomeIndex: order.intent.side === "yes" ? 0 : 1,
          usdcAmountIn: money6(order.intent.sizeMicro),
          minSharesOut: money6(minShares),
          solanaEscrowPda: order.phase === "intent_signed" ? null : pda,
          polygonOrderHash: hash,
          nearMpcSignature: order.signatureHex,
          status,
          expiryTimestamp: new Date(order.intent.expiryUnix * 1000).toISOString(),
          nonce: order.intent.nonce,
        },
      });
      pushLog(`[neon:${saved.source}] ${saved.row.status}`);
      const listed = await list({ data: order.intent.taker });
      setRows(listed.rows);
    } catch (error) {
      pushLog(`[neon] ${error instanceof Error ? error.message : "save failed"}`);
    }
  }

  async function runOnDevnet() {
    if (!trade || !market || !book || !wallet || busy) return;
    const sizeMicro = parseUsdc(trade.amount);
    if (sizeMicro === null) {
      toast("Use $0.01 to $5,000.");
      return;
    }
    const amount = (BigInt(sizeMicro) * 10n ** BigInt(wallet.decimals)) / 1_000_000n;
    if (wallet.balance !== null && amount > wallet.balance) {
      toast("Not enough Devnet USDC in that wallet.");
      return;
    }
    const nonce = Math.floor(Date.now() / 1000);
    const dbId = crypto.randomUUID();
    dbIdRef.current = dbId;
    const ask = side === "yes" ? book.yes : book.no;
    const proxy = deriveProxyAddress(wallet.publicKey);
    const intentHash = sha256(
      new TextEncoder().encode(`moxie.intent.v1|${market.id}|${side}|${nonce}|${amount}|${wallet.publicKey}`),
    );
    setBusy(true);
    sfx.lock();
    pushLog(`[solana] initializeIntent ${side.toUpperCase()} ${market.id} $${trade.amount}`);
    try {
      const locked = await lockDevnetIntent({
        provider: wallet.provider,
        publicKey: wallet.publicKey,
        amount,
        intentHash,
        timeout: BigInt(nonce + 180),
      });
      setChainSig(locked.signature);
      pushLog(`[solana] tx ${shortKey(locked.signature, 4, 4)} pda ${shortKey(locked.escrowPda, 4, 4)}`);
      let order = shellOrder({
        taker: wallet.publicKey,
        nonce,
        market,
        side,
        sizeMicro,
        proxy,
        ask,
        signature: locked.signature,
        phase: "escrow_locked",
      });
      setLive(order);
      const ceiling = maxPrice(ask, 50);
      await save({
        data: {
          id: dbId,
          userSolanaPubkey: wallet.publicKey,
          derivedPolygonAddress: proxy,
          marketConditionId: order.intent.outcomeTokenId,
          outcomeIndex: side === "yes" ? 0 : 1,
          usdcAmountIn: money6(sizeMicro),
          minSharesOut: money6(sharesFor(sizeMicro, Math.max(ceiling, 1))),
          solanaEscrowPda: locked.escrowPda,
          polygonOrderHash: null,
          nearMpcSignature: locked.signature,
          status: "ESCROW_LOCKED",
          expiryTimestamp: new Date((nonce + 180) * 1000).toISOString(),
          nonce,
        },
      });
      pushLog("[neon] ESCROW_LOCKED");
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await wait(700, Boolean(reduce));
        const stepped = await step({ data: dbId });
        if (stepped.note) pushLog(`[solver] ${stepped.note}`);
        const status = stepped.row?.status;
        if (!status) break;
        order = { ...order, phase: chainPhase(status), polygonTxHex: stepped.row?.polygon_order_hash ?? undefined };
        setLive(order);
        if (stepped.row?.polygon_order_hash) setChainHash(stepped.row.polygon_order_hash);
        const listed = await list({ data: wallet.publicKey });
        setRows(listed.rows);
        if (status === "SETTLED") {
          sfx.bought();
          toast(`Bought ${side.toUpperCase()} · $${trade.amount}`);
          setChainFills((current) => [
            { id: dbId, question: market.question, side, amount: trade.amount },
            ...current,
          ]);
          const nextBalance = await readDevnetBalance(wallet.publicKey);
          setWallet({ ...wallet, balance: nextBalance.amount, decimals: nextBalance.decimals });
          void navigate({
            to: "/thank-you",
            search: { market: market.question, side, amount: trade.amount },
          });
          return;
        }
        if (stepped.blocked) {
          sfx.nope();
          toast(stepped.blocked);
          return;
        }
      }
    } catch (error) {
      sfx.nope();
      const message = error instanceof Error ? error.message : "The Devnet lock failed.";
      toast(message);
      pushLog(`[solana] ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function runTrade() {
    if (wallet) {
      await runOnDevnet();
      return;
    }
    if (!trade || !market || !book || busy) return;
    const state = useDesk.getState();
    const sizeMicro = parseUsdc(trade.amount);
    if (sizeMicro === null) {
      toast("Use $0.01 to $5,000.");
      return;
    }
    if (drill === "replay" && state.consumed.length === 0) {
      toast("Place one bet first, then try reusing the ticket.");
      return;
    }
    if (drill !== "replay" && sizeMicro > state.available) {
      toast("That's more than your free USDC.");
      return;
    }
    const ask = side === "yes" ? book.yes : book.no;
    const slipBps = drill === "slip" ? 0 : slippage;
    const now = Math.floor(Date.now() / 1000);
    const lastNonce = state.consumed.at(-1);
    const nonce = drill === "replay" && lastNonce ? Number(lastNonce.split(":")[1]) : state.nextNonce;
    const dbId = crypto.randomUUID();
    dbIdRef.current = dbId;
    setBusy(true);
    sfx.lock();
    pushLog(`[solana] sign ${side.toUpperCase()} ${market.id} $${trade.amount}`);
    try {
      const events = planRoute({
        ledger: { available: state.available, locked: state.locked, consumed: state.consumed },
        takerSecret: hexToSecret(state.secretKeyHex),
        now,
        corruptProof: drill === "badproof",
        intent: {
          taker: state.publicKeyB58,
          nonce,
          marketId: market.id,
          side,
          outcomeTokenId: outcomeTokenId(market.id, side),
          maxSlippageBps: slipBps,
          expiryUnix: drill === "expire" ? now - 30 : now + 180,
          sizeMicro,
          polygonRecipient: deriveProxyAddress(state.publicKeyB58),
          referenceAskMicro: ask,
        },
      });
      for (let index = 0; index < events.length; index += 1) {
        const event = events[index]!;
        useDesk.getState().apply(event);
        setLive(event.order);
        if (event.type === "locked") {
          const pda = escrowAddress(base58.decode(event.order.intent.taker), event.order.intent.nonce).address;
          pushLog(`[solana] deposit locked pda ${shortKey(pda, 4, 4)}`);
        }
        if (event.type === "quotes") {
          pushLog(`[near] ${event.order.quotes.map((quote) => `${quote.solverName} ${formatCents(quote.priceMicro)}¢`).join(" · ")}`);
        }
        if (event.type === "matched") pushLog(`[near] took ${event.order.solverName}`);
        if (event.type === "filled" && event.order.polygonTxHex) {
          pushLog(`[polygon] tx 0x${event.order.polygonTxHex.slice(0, 8)}…`);
        }
        if (event.type === "settled") pushLog("[solana] deposit released");
        if (event.type === "rejected" || event.type === "refunded" || event.type === "stuck") {
          pushLog(`[route] ${event.error?.code ?? event.type}`);
        }
        await mirror(event.order, dbId);
        if (index < events.length - 1) await wait(380, Boolean(reduce));
      }
      const last = events.at(-1);
      if (!last) return;
      if (last.order.phase === "settled") {
        sfx.bought();
        toast(`Bought ${side.toUpperCase()} · $${trade.amount}`);
        void navigate({
          to: "/thank-you",
          search: { market: market.question, side, amount: trade.amount },
        });
      } else {
        sfx.nope();
        toast(friendly(last.order));
      }
    } finally {
      setBusy(false);
    }
  }

  const maxDollars = Math.min(MAX_TICKET, Math.max(0, available)) / 1_000_000;
  const focus = MARKETS.find((item) => item.id === focusId) ?? MARKETS[0]!;
  const focusBook = books[focus.id] ?? { yes: focus.yesAskMicro, no: complementAsk(focus.yesAskMicro) };
  const focusPrice = side === "yes" ? focusBook.yes : focusBook.no;

  return (
    <div className="bg-abyss text-platinum">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: { background: "#011d1c", color: "#ffffff", border: "none" },
        }}
      />
      <div className="sticky top-16 z-30 bg-abyss">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <p className="kicker hidden text-xs text-slate sm:block">Solana · NEAR · Polygon</p>
          <div className="flex items-center gap-2">
            {wallet || connected ? (
              <>
                <div className="rounded-control bg-deep px-3 py-2 text-right">
                  <p className="stat text-sm leading-none">
                    {wallet
                      ? wallet.balance === null
                        ? "…"
                        : formatToken(wallet.balance, wallet.decimals)
                      : ready
                        ? formatUsdc(available)
                        : "—"}
                  </p>
                  <p className="text-xs text-mist">
                    {wallet ? "Devnet USDC" : `USDC${locked > 0 ? ` · ${formatUsdc(locked)} locked` : ""}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setConnectOpen(true);
                  }}
                  className="max-w-36 truncate rounded-control bg-kelp px-3 py-2 text-xs text-foam"
                >
                  {shortHex(polygon)}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!ready}
                onClick={() => setConnectOpen(true)}
                className="h-11 rounded-control bg-cta px-4 text-sm font-medium text-abyss disabled:opacity-50"
              >
                Connect
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="hidden h-11 rounded-control bg-kelp px-3 text-sm text-foam sm:inline-flex"
            >
              Logs
            </button>
            <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettings(true)}
              className="flex size-11 items-center justify-center rounded-control bg-kelp"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-4 py-8 pb-28">
        <div className="grid items-center gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="kicker text-xs text-slate">Markets</p>
            <h1 className="mt-2 text-4xl text-platinum">Lock once. Fill in private.</h1>
            <p className="mt-3 max-w-xl text-mist">
              Tap a price, then a size. USDC stays on Solana until a solver fills the market. You don't hold gas or bridge.
            </p>
            <p className="mt-4 text-sm text-foam">
              {wallet ? `via ${wallet.label} · Devnet` : connectLabel ? `via ${connectLabel}` : "not connected"}
            </p>
          </div>
          <ParticleOrb className="mx-auto h-56 w-56 md:h-72 md:w-72" />
        </div>
        <ul className="mt-8 grid gap-8 md:grid-cols-2">
          {MARKETS.map((item) => {
            const prices = books[item.id] ?? { yes: item.yesAskMicro, no: complementAsk(item.yesAskMicro) };
            return (
              <li key={item.id}>
                <MarketCard
                  market={item}
                  yes={prices.yes}
                  no={prices.no}
                  side={side}
                  maxDollars={maxDollars}
                  onSide={(next) => {
                    sfx.tap();
                    setFocusId(item.id);
                    setSide(next);
                  }}
                  onChip={(dollars) => openTrade(item.id, dollars)}
                />
              </li>
            );
          })}
        </ul>

        <section className="mt-10">
          <h2 className="kicker text-xs text-slate">Your bets</h2>
          {positions.length === 0 && chainFills.length === 0 ? (
            <p className="mt-3 text-sm">Nothing bought yet. Wins show up on your Polygon address.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {chainFills.map((fill) => (
                <li key={fill.id} className="flex items-center justify-between gap-3 rounded-card bg-deep px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-platinum">{fill.question}</span>
                    <span className="text-xs text-foam">
                      {fill.side.toUpperCase()} · Devnet ${fill.amount}
                    </span>
                  </span>
                </li>
              ))}
              {positions.map((position) => {
                const listed = MARKETS.find((item) => item.id === position.marketId);
                return (
                  <li key={position.tokenId} className="flex items-center justify-between gap-3 rounded-card bg-deep px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-platinum">{listed?.question}</span>
                      <span className="text-xs text-foam">{position.side.toUpperCase()}</span>
                    </span>
                    <span className="stat text-sm">{formatShares(position.sharesMicro)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-deep px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-platinum">{focus.question}</p>
            <p className="stat text-sm">
              {side.toUpperCase()} {pct(focusPrice)}%
            </p>
          </div>
          <button
            type="button"
            className="h-11 rounded-control bg-kelp px-3 text-sm text-foam"
            onClick={() => setDrawer(true)}
          >
            Logs
          </button>
          <button
            type="button"
            className="h-11 rounded-control bg-cta px-4 text-sm font-medium text-abyss"
            onClick={() => openTrade(focus.id, "5")}
          >
            Lock $5
          </button>
        </div>
      </div>

      <AnimatePresence>
        {connectOpen ? (
          <Sheet key="connect" onClose={() => setConnectOpen(false)} title="Connect">
            <p className="text-sm">
              Phantom, Solflare, and Backpack sign the Devnet escrow when the extension is in this browser. Google and X
              use a Solana key kept on this device. That is not a Privy login. The Polygon address uses the NEAR
              path solana, then the pubkey. You don't hold gas or bridge.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {CONNECTS.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => void chooseConnect(choice)}
                  className="h-14 rounded-control bg-kelp px-3 text-left text-sm hover:bg-tide"
                >
                  <span className="block font-medium text-platinum">{choice.label}</span>
                  <span className="block text-xs text-mist">{choice.hint}</span>
                </button>
              ))}
            </div>
            {connected || wallet ? (
              <button
                type="button"
                className="mt-3 h-11 text-sm text-mist"
                onClick={() => {
                  void wallet?.provider.disconnect?.();
                  setWallet(null);
                  useDesk.getState().disconnect();
                  setConnectOpen(false);
                }}
              >
                Disconnect
              </button>
            ) : null}
            <p className="mt-3 text-xs text-foam">
              {polygon ? `Polygon ${shortHex(polygon)} · solana path` : "Polygon address appears after you connect"}
            </p>
          </Sheet>
        ) : null}
        {settings ? (
          <Sheet key="settings" onClose={() => setSettings(false)} title="Settings">
            <p className="kicker text-xs text-slate">Price room</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Price room">
              {[25, 50, 100].map((bps) => (
                <button
                  key={bps}
                  type="button"
                  aria-pressed={slippage === bps}
                  onClick={() => setSlippage(bps)}
                  className={`h-11 rounded-control px-3 text-sm ${slippage === bps ? "bg-cta font-medium text-abyss" : "bg-kelp text-mist"}`}
                >
                  {(bps / 100).toFixed(2)}% room
                </button>
              ))}
            </div>
            <p className="kicker mt-6 text-xs text-slate">Practice</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Practice modes">
              {DRILLS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={drill === item.id}
                  onClick={() => setDrill(item.id)}
                  className={`h-11 rounded-control px-3 text-sm ${drill === item.id ? "bg-foam font-medium text-abyss" : "bg-kelp text-mist"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </Sheet>
        ) : null}
        {drawer ? (
          <Sheet key="logs" onClose={() => setDrawer(false)} title="Dev console">
            <p className="text-xs text-phosphor">intents · Devnet DiiRjj…CwK5g · Amoy</p>
            <ul className="mt-3 space-y-2">
              {rows.length === 0 ? <li className="text-xs text-mist">no rows yet</li> : null}
              {rows.map((row) => (
                <li key={row.id} className="text-xs text-platinum">
                  {row.status} · nonce {row.nonce} · {row.usdc_amount_in} USDC
                  {row.polygon_order_hash ? ` · ${shortHex(row.polygon_order_hash)}` : ""}
                </li>
              ))}
            </ul>
            <ul className="mt-4 space-y-1">
              {logs.length === 0 ? <li className="text-xs text-mist">rpc log is empty</li> : null}
              {logs.map((line, index) => (
                <li key={`${line}-${index}`} className="break-all text-xs text-mist">
                  {line}
                </li>
              ))}
            </ul>
          </Sheet>
        ) : null}
        {trade && market && book ? (
          <Sheet
            key="trade"
            onClose={() => (busy ? undefined : setTrade(null))}
            title={market.question}
            footer={
              <div className="flex gap-2">
                {live && !busy && (live.phase === "escrow_locked" || live.phase === "solver_matched") ? (
                  <button
                    type="button"
                    className="h-12 flex-1 rounded-control bg-kelp text-sm text-foam"
                    onClick={() => {
                      const now = live.phase === "solver_matched" ? live.intent.expiryUnix + 1 : Math.floor(Date.now() / 1000);
                      useDesk.getState().refundOrder(live.id, now);
                      const next = useDesk.getState().orders.find((order) => order.id === live.id) ?? null;
                      setLive(next);
                      if (next && dbIdRef.current) void mirror(next, dbIdRef.current);
                      toast(next?.phase === "refunded" ? "Deposit back in your balance." : "Couldn't return it yet.");
                    }}
                  >
                    {live.phase === "solver_matched" ? "Expire and refund" : "Cancel deposit"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy || live?.phase === "settled"}
                  onClick={() => void runTrade()}
                  className="h-12 flex-1 rounded-control bg-cta text-sm font-medium text-abyss disabled:opacity-50"
                >
                  {busy ? "Routing…" : live?.phase === "settled" ? "Bought" : "Lock deposit"}
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              <SidePick label="Yes" cents={formatCents(book.yes)} pressed={side === "yes"} onClick={() => setSide("yes")} />
              <SidePick label="No" cents={formatCents(book.no)} pressed={side === "no"} onClick={() => setSide("no")} />
            </div>
            <div className="mt-3 flex gap-2">
              {["5", "25", "50", String(Math.max(1, Math.floor(maxDollars)))].map((amount, index) => (
                <button
                  key={amount + index}
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setTrade({ marketId: market.id, amount: index === 3 ? String(Math.floor(maxDollars)) : amount });
                  }}
                  className={`h-11 flex-1 rounded-control text-sm ${trade.amount === (index === 3 ? String(Math.floor(maxDollars)) : amount) ? "bg-cta font-medium text-abyss" : "bg-kelp text-foam"}`}
                >
                  {index === 3 ? "Max" : `$${amount}`}
                </button>
              ))}
            </div>
            <label className="kicker mt-4 block text-xs text-slate" htmlFor="ticket">
              Dollars
            </label>
            <input
              id="ticket"
              inputMode="decimal"
              value={trade.amount}
              onChange={(event) => setTrade({ ...trade, amount: event.target.value })}
              className="mt-2 h-12 w-full rounded-control bg-abyss px-3 text-platinum outline-none"
            />
            <p className="mt-2 text-sm">
              {wallet
                ? "This locks Devnet USDC in the escrow. Keep the wallet on Devnet. One escrow account per maker."
                : `Ceiling ${formatCents(maxPrice(side === "yes" ? book.yes : book.no, drill === "slip" ? 0 : slippage))}¢ · pays from Solana USDC`}
            </p>
            <ol className="mt-4 space-y-4">
              {TRACK.map((step, index) => {
                const visual = trackState(live);
                const mark = !live ? "wait" : index < visual.index ? "done" : index === visual.index ? visual.mark : "wait";
                return (
                  <li key={step.title} className="flex gap-3">
                    <span
                      className={`mt-1 size-2.5 shrink-0 rounded-full ${
                        mark === "done" ? "bg-foam" : mark === "run" ? "node-live pulse-dot bg-tide" : mark === "fail" ? "bg-phosphor" : "bg-kelp"
                      }`}
                    />
                    <span>
                      <span className={`block text-sm ${mark === "wait" ? "text-slate" : "text-platinum"}`}>{step.title}</span>
                      <span className="block text-xs text-mist">{step.hint}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {live?.error ? <p className="mt-3 rounded-card bg-kelp px-3 py-2 text-sm text-foam">{friendly(live)}</p> : null}
            {live?.phase === "settled" ? (
              <p className="mt-3 text-sm text-foam">Bought {live.intent.side.toUpperCase()}. Shares are on your Polygon address.</p>
            ) : null}
            {chainSig ? (
              <a
                className="mt-3 block text-xs text-foam"
                href={`https://explorer.solana.com/tx/${chainSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
              >
                View the Solana lock
              </a>
            ) : null}
            {chainHash ? (
              <a
                className="mt-1 block text-xs text-phosphor"
                href={`https://amoy.polygonscan.com/tx/${chainHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View the Polygon fill
              </a>
            ) : null}
          </Sheet>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MarketCard({
  market,
  yes,
  no,
  side,
  maxDollars,
  onSide,
  onChip,
}: {
  market: Market;
  yes: number;
  no: number;
  side: Side;
  maxDollars: number;
  onSide: (side: Side) => void;
  onChip: (dollars: string) => void;
}) {
  const reduce = useReducedMotion();
  const yesPct = Math.max(8, Math.min(92, Number(pct(yes))));
  return (
    <motion.article
      className="rounded-card bg-kelp p-5"
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
    >
      <p className="kicker text-xs text-slate">
        {market.venue} · {market.resolves} · 24h {market.volume}
      </p>
      <h2 className="mt-3 text-lg leading-snug text-platinum">{market.question}</h2>
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-control bg-deep" aria-hidden="true">
        <div className="h-full bg-tide" style={{ width: `${yesPct}%` }} />
        <div className="h-full flex-1 bg-foam" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={side === "yes"}
          onClick={() => onSide("yes")}
          className={`h-14 rounded-control px-3 text-left ${side === "yes" ? "bg-deep" : "bg-abyss"}`}
        >
          <span className="block text-xs text-mist">Yes</span>
          <span className="stat text-lg">{pct(yes)}%</span>
        </button>
        <button
          type="button"
          aria-pressed={side === "no"}
          onClick={() => onSide("no")}
          className={`h-14 rounded-control px-3 text-left ${side === "no" ? "bg-deep" : "bg-abyss"}`}
        >
          <span className="block text-xs text-mist">No</span>
          <span className="stat text-lg">{pct(no)}%</span>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {["5", "25", "50", "max"].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChip(chip === "max" ? String(Math.max(1, Math.floor(maxDollars))) : chip)}
            className="h-11 flex-1 rounded-control bg-deep text-sm text-foam"
          >
            {chip === "max" ? "Max" : `$${chip}`}
          </button>
        ))}
      </div>
    </motion.article>
  );
}

function SidePick({
  label,
  cents,
  pressed,
  onClick,
}: {
  label: string;
  cents: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`h-14 rounded-control px-3 text-left ${pressed ? "bg-deep" : "bg-kelp"}`}
    >
      <span className="block text-xs text-mist">{label}</span>
      <span className="stat">{cents}¢</span>
    </button>
  );
}

function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-abyss/80 p-3 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.16 }}
    >
      <button type="button" aria-label="Close" className="absolute inset-0 z-0" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduce ? false : { y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? undefined : { y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-deep p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg leading-snug text-platinum">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-control bg-kelp">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-auto">{children}</div>
        {footer ? <div className="mt-4 shrink-0">{footer}</div> : null}
      </motion.div>
    </motion.div>
  );
}
