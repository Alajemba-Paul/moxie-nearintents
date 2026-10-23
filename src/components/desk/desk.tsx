import { sha256 } from "@noble/hashes/sha2.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Settings, X } from "lucide-react";
import { toast, Toaster } from "sonner";
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
import { formatToken, injectedProvider, readDevnetBalance, type SolanaProvider } from "@/lib/solana/wallet";
import { sfx } from "@/lib/moxie/sound";
import { useDesk } from "@/lib/moxie/store";
import type { DeskOrder, Phase } from "@/lib/moxie/types";

type Books = Record<string, { yes: number; no: number }>;
type Drill = "route" | "expire" | "replay" | "slip" | "badproof";
type Side = "yes" | "no";

const CONNECTS = ["Phantom", "Solflare", "Google", "X", "Discord"] as const;

type ExternalWallet = {
  label: "Phantom" | "Solflare";
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
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState<Books>(initialBooks);
  const [side, setSide] = useState<Side>("yes");
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

  async function chooseConnect(label: (typeof CONNECTS)[number]) {
    if (!ready) return;
    sfx.tap();
    if (label === "Phantom" || label === "Solflare") {
      const provider = injectedProvider(label);
      if (provider) {
        try {
          const session = await provider.connect();
          const owner = session.publicKey.toString();
          const balance = await readDevnetBalance(owner);
          setWallet({ label, publicKey: owner, provider, balance: balance.amount, decimals: balance.decimals });
          useDesk.getState().connect(label);
          setConnectOpen(false);
          toast(`${label} is on Devnet`);
          pushLog(`[solana] ${label.toLowerCase()} ${shortKey(owner, 4, 4)}`);
          return;
        } catch (error) {
          toast(error instanceof Error ? error.message : "The wallet connection was cancelled.");
          return;
        }
      }
      toast(`${label} isn't in this browser. Using the on-device key instead.`);
    }
    setWallet(null);
    useDesk.getState().connect(label);
    setConnectOpen(false);
    toast(`Connected with ${label}`);
    pushLog(`[auth] ${label.toLowerCase()} → local solana key ${shortKey(useDesk.getState().publicKeyB58, 4, 4)}`);
  }

  function openTrade(marketId: string, dollars: string) {
    if (!ready) return;
    sfx.tap();
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
      } else {
        sfx.nope();
        toast(friendly(last.order));
      }
    } finally {
      setBusy(false);
    }
  }

  const maxDollars = Math.min(MAX_TICKET, Math.max(0, available)) / 1_000_000;

  return (
    <div className="min-h-screen bg-ink text-cream">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: { background: "#10141c", color: "#e8fff6", border: "1px solid #1c2433" },
        }}
      />
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-mint">Moxie</p>
            <p className="hidden text-sm text-mute sm:block">One signature. Private fill.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-mute sm:flex">
              <span className="pulse-dot size-2 rounded-full bg-mint" />
              Solana · NEAR · Polygon
            </span>
            {wallet || connected ? (
              <>
                <div className="rounded-full border border-line px-3 py-2 text-right">
                  <p className="font-mono text-sm leading-none text-mint">
                    {wallet
                      ? wallet.balance === null
                        ? "…"
                        : formatToken(wallet.balance, wallet.decimals)
                      : ready
                        ? formatUsdc(available)
                        : "—"}
                  </p>
                  <p className="text-xs text-mute">
                    {wallet ? "Devnet USDC" : `USDC${locked > 0 ? ` · ${formatUsdc(locked)} locked` : ""}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setConnectOpen(true);
                  }}
                  className="max-w-36 truncate rounded-full border border-cyan/40 px-3 py-2 font-mono text-xs text-cyan"
                >
                  {shortHex(polygon)}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!ready}
                onClick={() => setConnectOpen(true)}
                className="h-11 rounded-full bg-mint px-4 text-sm font-semibold text-ink disabled:opacity-50"
              >
                Connect
              </button>
            )}
            <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettings((open) => !open)}
              className="flex size-11 items-center justify-center rounded-full border border-line"
            >
              <Settings className="size-4" />
            </button>
          </div>
        </div>
        {settings ? (
          <div className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Price room">
                {[25, 50, 100].map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    aria-pressed={slippage === bps}
                    onClick={() => setSlippage(bps)}
                    className={`h-10 rounded-full px-3 text-sm ${slippage === bps ? "bg-mint text-ink" : "border border-line text-mute"}`}
                  >
                    {(bps / 100).toFixed(2)}% room
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Practice modes">
                {DRILLS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={drill === item.id}
                    onClick={() => setDrill(item.id)}
                    className={`h-10 rounded-full px-3 text-sm ${drill === item.id ? "bg-violet text-cream" : "border border-line text-mute"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Markets</h1>
            <p className="text-sm text-mute">Tap a price, then a size. We lock USDC and buy the side.</p>
          </div>
          <p className="font-mono text-xs text-cyan">
            {wallet ? `via ${wallet.label} · Devnet` : connectLabel ? `via ${connectLabel}` : "not connected"}
          </p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
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
                    setSide(next);
                  }}
                  onChip={(dollars) => openTrade(item.id, dollars)}
                />
              </li>
            );
          })}
        </ul>

        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-mute">Your bets</h2>
          {positions.length === 0 && chainFills.length === 0 ? (
            <p className="mt-2 text-sm text-mute">Nothing bought yet. Wins show up on your Polygon address.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {chainFills.map((fill) => (
                <li key={fill.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{fill.question}</span>
                    <span className="font-mono text-xs text-cyan">
                      {fill.side.toUpperCase()} · Devnet ${fill.amount}
                    </span>
                  </span>
                </li>
              ))}
              {positions.map((position) => {
                const listed = MARKETS.find((item) => item.id === position.marketId);
                return (
                  <li key={position.tokenId} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{listed?.question}</span>
                      <span className="font-mono text-xs text-mint">{position.side.toUpperCase()}</span>
                    </span>
                    <span className="font-mono text-sm tabular-nums">{formatShares(position.sharesMicro)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <button
        type="button"
        onClick={() => setDrawer((open) => !open)}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel px-4 py-3 text-left"
      >
        <span className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-cyan">Dev console</span>
          <span className="text-xs text-mute">{drawer ? "Hide" : `${rows.length} db rows`}</span>
        </span>
      </button>
      {drawer ? (
        <section className="fixed inset-x-0 bottom-12 z-40 max-h-72 overflow-auto border-t border-line bg-ink px-4 py-3">
          <p className="font-mono text-xs text-violet">intents · Devnet DiiRjj…CwK5g · Amoy</p>
          <ul className="mt-2 space-y-1">
            {rows.length === 0 ? <li className="font-mono text-xs text-mute">no rows yet</li> : null}
            {rows.map((row) => (
              <li key={row.id} className="font-mono text-xs text-cream">
                {row.status} · nonce {row.nonce} · {row.usdc_amount_in} USDC
                {row.polygon_order_hash ? ` · ${shortHex(row.polygon_order_hash)}` : ""}
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-1 border-t border-line pt-2">
            {logs.length === 0 ? <li className="font-mono text-xs text-mute">rpc log is empty</li> : null}
            {logs.map((line, index) => (
              <li key={`${line}-${index}`} className="break-all font-mono text-xs text-mute">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AnimatePresence>
        {connectOpen ? (
          <Sheet key="connect" onClose={() => setConnectOpen(false)} title="Connect">
            <p className="text-sm text-mute">
              Phantom and Solflare sign the Devnet escrow if the extension is in this browser. Otherwise the desk
              signs with a Solana key kept on this device. The Polygon address is derived from that key. You still
              don't hold gas or bridge.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {CONNECTS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void chooseConnect(label)}
                  className="h-12 rounded-xl border border-line bg-ink text-sm font-medium hover:border-mint"
                >
                  {label}
                </button>
              ))}
            </div>
            {connected || wallet ? (
              <button
                type="button"
                className="mt-3 h-11 text-sm text-mute"
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
            <p className="mt-3 font-mono text-xs text-cyan">
              {polygon ? `Polygon ${shortHex(polygon)} · moxie-intents` : "Polygon address appears after you connect"}
            </p>
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
                    className="h-12 flex-1 rounded-full border border-line text-sm"
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
                  className="h-12 flex-1 rounded-full bg-mint font-semibold text-ink disabled:opacity-50"
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
                  className={`h-11 flex-1 rounded-full text-sm ${trade.amount === (index === 3 ? String(Math.floor(maxDollars)) : amount) ? "bg-mint text-ink" : "border border-line"}`}
                >
                  {index === 3 ? "Max" : `$${amount}`}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs uppercase tracking-widest text-mute" htmlFor="ticket">
              Dollars
            </label>
            <input
              id="ticket"
              inputMode="decimal"
              value={trade.amount}
              onChange={(event) => setTrade({ ...trade, amount: event.target.value })}
              className="mt-2 h-12 w-full rounded-xl border border-line bg-ink px-3 font-mono text-cream outline-none"
            />
            <p className="mt-2 text-sm text-mute">
              {wallet
                ? "This locks Devnet USDC in the escrow. Keep the wallet on Devnet."
                : `Ceiling ${formatCents(maxPrice(side === "yes" ? book.yes : book.no, drill === "slip" ? 0 : slippage))}¢ · pays from Solana USDC`}
            </p>
            <ol className="mt-4 space-y-3">
              {TRACK.map((step, index) => {
                const visual = trackState(live);
                const mark = !live ? "wait" : index < visual.index ? "done" : index === visual.index ? visual.mark : "wait";
                return (
                  <li key={step.title} className="flex gap-3">
                    <span
                      className={`mt-1 size-2.5 shrink-0 rounded-full ${
                        mark === "done" ? "bg-mint" : mark === "run" ? "pulse-dot bg-cyan" : mark === "fail" ? "bg-violet" : "bg-line"
                      }`}
                    />
                    <span>
                      <span className={`block text-sm ${mark === "wait" ? "text-mute" : "text-cream"}`}>{step.title}</span>
                      <span className="block text-xs text-mute">{step.hint}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {live?.error ? <p className="mt-3 rounded-xl bg-violet/15 px-3 py-2 text-sm text-cream">{friendly(live)}</p> : null}
            {live?.phase === "settled" ? (
              <p className="mt-3 text-sm text-mint">Bought {live.intent.side.toUpperCase()}. Shares are on your Polygon address.</p>
            ) : null}
            {chainSig ? (
              <a
                className="mt-3 block font-mono text-xs text-cyan"
                href={`https://explorer.solana.com/tx/${chainSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
              >
                View the Solana lock
              </a>
            ) : null}
            {chainHash ? (
              <a
                className="mt-1 block font-mono text-xs text-mint"
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
  const yesPct = Math.max(8, Math.min(92, Number(pct(yes))));
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-xs uppercase tracking-widest text-mute">
        {market.venue} · {market.resolves} · 24h {market.volume}
      </p>
      <h2 className="mt-2 text-lg font-semibold leading-snug">{market.question}</h2>
      <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full bg-mint" style={{ width: `${yesPct}%` }} />
        <div className="h-full flex-1 bg-cyan" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={side === "yes"}
          onClick={() => onSide("yes")}
          className={`h-14 rounded-xl border px-3 text-left ${side === "yes" ? "border-mint bg-mint/10" : "border-line"}`}
        >
          <span className="block text-xs text-mute">Yes</span>
          <span className="font-mono text-lg text-mint">{pct(yes)}%</span>
        </button>
        <button
          type="button"
          aria-pressed={side === "no"}
          onClick={() => onSide("no")}
          className={`h-14 rounded-xl border px-3 text-left ${side === "no" ? "border-cyan bg-cyan/10" : "border-line"}`}
        >
          <span className="block text-xs text-mute">No</span>
          <span className="font-mono text-lg text-cyan">{pct(no)}%</span>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {["5", "25", "50", "max"].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChip(chip === "max" ? String(Math.max(1, Math.floor(maxDollars))) : chip)}
            className="h-11 flex-1 rounded-full border border-line text-sm hover:border-mint"
          >
            {chip === "max" ? "Max" : `$${chip}`}
          </button>
        ))}
      </div>
    </article>
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
      className={`h-14 rounded-xl border px-3 text-left ${pressed ? "border-mint" : "border-line"}`}
    >
      <span className="block text-xs text-mute">{label}</span>
      <span className="font-mono">{cents}¢</span>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-3 sm:items-center"
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
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-panel p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-auto">{children}</div>
        {footer ? <div className="mt-4 shrink-0">{footer}</div> : null}
      </motion.div>
    </motion.div>
  );
}
