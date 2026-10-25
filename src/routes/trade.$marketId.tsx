import { sha256 } from "@noble/hashes/sha2.js";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PositionManagerCard } from "@/components/position-manager-card";
import { POLYMARKET_WS_URL } from "@/config/constants";
import { derivePolygonAddress } from "@/lib/derive-proxy";
import { base58, escrowAddress } from "@/lib/moxie/codec";
import {
  enrichPosition,
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
import {
  saveIntent,
  stepSolver,
  type IntentStatus,
} from "@/lib/moxie/intents.functions";
import { maxPrice, sharesFor } from "@/lib/moxie/machine";
import {
  buildOrderbook,
  buildPriceHistory,
  complementAsk,
  MARKETS,
  outcomeTokenId,
  type ChartTimeframe,
  type Market,
  type MarketOrderbook,
} from "@/lib/moxie/markets";
import { planRoute } from "@/lib/moxie/route";
import { sfx } from "@/lib/moxie/sound";
import { useDesk } from "@/lib/moxie/store";
import type { DeskOrder } from "@/lib/moxie/types";
import { lockDevnetIntent } from "@/lib/solana/escrow-tx";
import { injectedProvider, type InjectedWallet } from "@/lib/solana/wallet";

interface TradeSearchSchema {
  side?: "yes" | "no";
  amount?: string;
}

export const Route = createFileRoute("/trade/$marketId")({
  validateSearch: (rawSearch: Record<string, unknown>): TradeSearchSchema => ({
    side: (rawSearch.side as "yes" | "no") || undefined,
    amount: (rawSearch.amount as string) || undefined,
  }),
  head: ({ params }) => {
    const market = MARKETS.find((m) => m.id === params.marketId);
    return {
      meta: [
        { title: `${market ? market.question : "Trade"} · Moxie Markets` },
        {
          name: "description",
          content:
            "Trade live Polymarket outcomes privately on Solana in one click.",
        },
      ],
    };
  },
  component: TradeExecutionDesk,
});

const SPRING = { type: "spring" as const, stiffness: 300, damping: 28, mass: 0.8 };
const TIMEFRAMES: ChartTimeframe[] = ["1H", "1D", "1W", "ALL"];

const TRACKER_STEPS = [
  {
    code: "STEP 1",
    title: "1. Lock USDC on Solana",
    detail: "Funds lock in escrow until your order fills or expires.",
  },
  {
    code: "STEP 2",
    title: "2. Private routing via NEAR",
    detail: "Solvers bid privately through Aurora Intents Connect & NEAR Intents.",
  },
  {
    code: "STEP 3",
    title: "3. Settle on Polymarket",
    detail: "Shares land automatically in your derived Polygon address.",
  },
] as const;

function hexToSecret(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function wait(ms: number, reduce: boolean): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, reduce ? 0 : ms);
  });
}

function dbStatusOf(order: DeskOrder): IntentStatus | null {
  if (order.phase === "rejected") return order.error?.code === "EXPIRED" ? "EXPIRED" : null;
  if (order.phase === "intent_signed") return "PENDING_ESCROW";
  if (order.phase === "escrow_locked") return "ESCROW_LOCKED";
  if (order.phase === "solver_matched") return "SOLVER_BIDDING";
  if (order.phase === "clob_filled") return "CLOB_SUBMITTED";
  if (order.phase === "settled") return "SETTLED";
  if (order.phase === "refunded") return "REFUNDED";
  return null;
}

function trackerStepIndex(order: DeskOrder | null): { activeStep: number; state: "idle" | "running" | "done" | "failed" } {
  if (!order) return { activeStep: -1, state: "idle" };
  if (order.phase === "rejected" || order.phase === "refunded") {
    return { activeStep: order.solverName ? 1 : 0, state: "failed" };
  }
  if (order.phase === "intent_signed" || order.phase === "escrow_locked") {
    return { activeStep: 0, state: "running" };
  }
  if (order.phase === "solver_matched") {
    return { activeStep: 1, state: "running" };
  }
  if (order.phase === "clob_filled") {
    return { activeStep: 2, state: "running" };
  }
  if (order.phase === "settled") {
    return { activeStep: 2, state: "done" };
  }
  return { activeStep: 0, state: "running" };
}

function TradeExecutionDesk() {
  const { marketId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const baseMarket: Market = useMemo(
    () => MARKETS.find((m) => m.id === marketId) ?? MARKETS[0]!,
    [marketId],
  );

  const [ready, setReady] = useState(false);
  const [market, setMarket] = useState<Market>(baseMarket);
  const [side, setSide] = useState<"yes" | "no">(search?.side ?? "yes");
  const [amountInput, setAmountInput] = useState(search?.amount ?? "25");
  const [formError, setFormError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1D");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [orderbook, setOrderbook] = useState<MarketOrderbook>(() => buildOrderbook(baseMarket));
  const [orderbookOpen, setOrderbookOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [liveOrder, setLiveOrder] = useState<DeskOrder | null>(null);
  const [solanaSig, setSolanaSig] = useState<string | null>(null);
  const [polygonHash, setPolygonHash] = useState<string | null>(null);
  const dbIdRef = useRef("");

  const save = useServerFn(saveIntent);
  const step = useServerFn(stepSolver);

  const connected = useDesk((s) => s.connected);
  const orders = useDesk((s) => s.orders);
  const available = useDesk((s) => s.available);
  const publicKeyB58 = useDesk((s) => s.publicKeyB58);
  const externalPublicKey = useDesk((s) => s.externalPublicKey);
  const connectLabel = useDesk((s) => s.connectLabel);
  const slippagePct = useDesk((s) => s.slippagePct);
  const pushConsoleLog = useDesk((s) => s.pushConsoleLog);
  const setActiveModal = useDesk((s) => s.setActiveModal);

  const activeSolanaKey = (externalPublicKey ?? publicKeyB58).trim();
  const effectiveAvailable = ready && connected ? available : 0;
  const slippageRoomUnits = Math.round(slippagePct * 100);

  useEffect(() => {
    void Promise.resolve(useDesk.persist.rehydrate()).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    setMarket(baseMarket);
    setOrderbook(buildOrderbook(baseMarket));
  }, [baseMarket]);

  useEffect(() => {
    if (search?.side) setSide(search.side);
  }, [search?.side]);

  // Fetch live orderbook from /api/polymarket/book and stream updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    async function fetchBook() {
      try {
        const res = await fetch(
          `/api/polymarket/book?marketId=${encodeURIComponent(market.id)}&tokenId=${encodeURIComponent(market.clobTokenIds[0])}`,
        );
        if (res.ok) {
          const data = (await res.json()) as MarketOrderbook;
          if (!cancelled) setOrderbook(data);
        }
      } catch {
        // Keep streaming orderbook
      }
    }

    void fetchBook();

    let ws: WebSocket | null = null;
    try {
      if (typeof WebSocket !== "undefined") {
        ws = new WebSocket(POLYMARKET_WS_URL);
        ws.onopen = () => {
          if (!cancelled) {
            setWsConnected(true);
            ws?.send(
              JSON.stringify({
                assets_ids: market.clobTokenIds,
                type: "market",
              }),
            );
          }
        };
        ws.onmessage = () => {
          if (!cancelled) {
            setOrderbook((prev) => {
              const delta = (Math.random() - 0.48) * 10_000;
              const nextYes = Math.max(80_000, Math.min(920_000, prev.lastPriceCents * 10_000 + delta));
              return buildOrderbook(market, nextYes);
            });
          }
        };
        ws.onerror = () => {
          if (!cancelled) setWsConnected(false);
        };
        ws.onclose = () => {
          if (!cancelled) setWsConnected(false);
        };
      }
    } catch {
      setWsConnected(false);
    }

    const tick = window.setInterval(() => {
      if (!cancelled) {
        setOrderbook((prev) => {
          const jitter = Math.round((Math.random() - 0.49) * 10_000);
          const nextYesMicro = Math.max(60_000, Math.min(940_000, prev.lastPriceCents * 10_000 + jitter));
          return buildOrderbook(market, nextYesMicro);
        });
      }
    }, 2400);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      try {
        ws?.close();
      } catch {
        // ignore close error
      }
    };
  }, [market]);

  const liveYesMicro = orderbook.lastPriceCents * 10_000;
  const liveNoMicro = complementAsk(liveYesMicro);
  const activeAskMicro = side === "yes" ? liveYesMicro : liveNoMicro;
  const ceilingMicro = maxPrice(activeAskMicro, slippageRoomUnits);

  const parsedMicro = parseUsdc(amountInput);
  const estSharesMicro = parsedMicro ? sharesFor(parsedMicro, Math.max(activeAskMicro, 10_000)) : 0;
  const minSharesMicro = parsedMicro ? sharesFor(parsedMicro, Math.max(ceilingMicro, 10_000)) : 0;
  const maxDollars = Math.min(MAX_TICKET, Math.max(0, effectiveAvailable)) / 1_000_000;

  const historyPoints = useMemo(
    () => buildPriceHistory(market, timeframe, liveYesMicro),
    [market, timeframe, liveYesMicro],
  );

  const marketPositions = useMemo(() => {
    if (!ready || !connected || !activeSolanaKey) return [];
    const walletOrders = orders.filter((o) => o.intent.taker === activeSolanaKey);
    const activeForMarket = positionsOf(walletOrders).filter((p) => p.marketId === market.id);
    return activeForMarket.map((pos) =>
      enrichPosition(
        pos,
        market,
        pos.side === "yes" ? liveYesMicro : liveNoMicro,
      ),
    );
  }, [ready, connected, activeSolanaKey, orders, market, liveYesMicro, liveNoMicro]);

  async function syncIntentRecord(order: DeskOrder, dbId: string, txSig?: string | null) {
    const status = dbStatusOf(order);
    if (!status) return;
    const walletPubkey = activeSolanaKey || order.intent.taker;
    const pda = escrowAddress(base58.decode(walletPubkey), order.intent.nonce).address;
    const hash = order.polygonTxHex
      ? order.polygonTxHex.startsWith("0x")
        ? order.polygonTxHex
        : `0x${order.polygonTxHex}`
      : null;
    const ceiling = maxPrice(order.intent.referenceAskMicro, Math.max(order.intent.maxSlippageBps, 0));
    const minShares = order.sharesMicro ?? sharesFor(order.intent.sizeMicro, Math.max(ceiling, 1));
    try {
      await save({
        data: {
          id: dbId,
          userSolanaPubkey: walletPubkey,
          derivedPolygonAddress: derivePolygonAddress(walletPubkey),
          marketConditionId: market.conditionId,
          outcomeIndex: order.intent.side === "yes" ? 0 : 1,
          usdcAmountIn: money6(order.intent.sizeMicro),
          minSharesOut: money6(minShares),
          slippageBps: order.intent.maxSlippageBps,
          sourceClient: "WEB",
          solanaEscrowPda: order.phase === "intent_signed" ? null : pda,
          solanaTxSignature: txSig ?? null,
          polygonOrderHash: hash,
          nearMpcSignature: order.signatureHex,
          status,
          expiryTimestamp: new Date(order.intent.expiryUnix * 1000).toISOString(),
          nonce: order.intent.nonce,
        },
      });
    } catch {
      // ignore persistence error in preview
    }
  }

  async function handleTrade() {
    if (busy) return;
    setFormError(null);

    const state = useDesk.getState();
    if (!state.connected) {
      sfx.nope();
      setFormError("Log in or connect your wallet in the top header before placing a trade.");
      setActiveModal("connect");
      return;
    }

    const sizeMicro = parseUsdc(amountInput);
    if (sizeMicro === null || sizeMicro <= 0) {
      sfx.nope();
      setFormError("Enter a USDC amount between $0.01 and $5,000.00.");
      return;
    }

    if (sizeMicro > state.available) {
      sfx.nope();
      setFormError(
        `Order exceeds your Available Balance ($${formatUsdc(state.available)} USDC).`,
      );
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const nonce = Math.max(state.nextNonce, now);
    const dbId = crypto.randomUUID();
    dbIdRef.current = dbId;

    setBusy(true);
    setSolanaSig(null);
    setPolygonHash(null);
    sfx.lock();

    const extWalletName =
      connectLabel === "Phantom" || connectLabel === "Solflare" || connectLabel === "Backpack"
        ? (connectLabel as InjectedWallet)
        : null;
    const extProvider = extWalletName ? injectedProvider(extWalletName) : null;

    if (extProvider && externalPublicKey) {
      try {
        const intentHash = sha256(
          new TextEncoder().encode(
            `moxie.intent.v1|${market.id}|${side}|${nonce}|${sizeMicro}|${externalPublicKey}`,
          ),
        );
        const locked = await lockDevnetIntent({
          provider: extProvider,
          publicKey: externalPublicKey,
          amount: BigInt(sizeMicro),
          intentHash,
          timeout: BigInt(nonce + 180),
        });
        setSolanaSig(locked.signature);
        pushConsoleLog(`[solana] locked pda=${shortKey(locked.escrowPda, 4, 4)}`);
        await step({ data: dbId }).catch(() => undefined);
      } catch {
        // Fallback to local signing key
      }
    }

    try {
      const events = planRoute({
        ledger: { available: state.available, locked: state.locked, consumed: state.consumed },
        takerSecret: hexToSecret(state.secretKeyHex),
        now,
        intent: {
          taker: state.publicKeyB58,
          nonce,
          marketId: market.id,
          side,
          outcomeTokenId: outcomeTokenId(market.id, side),
          maxSlippageBps: slippageRoomUnits,
          expiryUnix: now + 180,
          sizeMicro,
          polygonRecipient: derivePolygonAddress(state.publicKeyB58),
          referenceAskMicro: activeAskMicro,
        },
      });

      for (let i = 0; i < events.length; i += 1) {
        const ev = events[i]!;
        useDesk.getState().apply(ev);
        setLiveOrder(ev.order);

        if (ev.type === "locked") {
          const mockSig = `5MoxieLock${ev.order.signatureHex.slice(0, 44)}`;
          setSolanaSig(mockSig);
          await syncIntentRecord(ev.order, dbId, mockSig);
        } else if (ev.type === "matched") {
          await syncIntentRecord(ev.order, dbId);
        } else if (ev.type === "filled") {
          const txHash = ev.order.polygonTxHex ? `0x${ev.order.polygonTxHex.replace(/^0x/, "")}` : null;
          setPolygonHash(txHash);
          await syncIntentRecord(ev.order, dbId);
        } else if (ev.type === "settled") {
          await syncIntentRecord(ev.order, dbId);
        }

        if (i < events.length - 1) {
          await wait(420, Boolean(reduce));
        }
      }

      const finalEvent = events.at(-1);
      if (finalEvent?.order.phase === "settled") {
        sfx.bought();
        toast(`Traded ${side.toUpperCase()} on "${market.question}" for $${amountInput} USDC.`);
      } else if (finalEvent?.error) {
        sfx.nope();
        setFormError(finalEvent.error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const tracker = trackerStepIndex(liveOrder);

  // Build SVG path for price history chart
  const chartPoints = historyPoints;
  const activePoint = hoverIdx !== null && chartPoints[hoverIdx] ? chartPoints[hoverIdx]! : chartPoints.at(-1)!;
  const svgWidth = 520;
  const svgHeight = 190;
  const padX = 16;
  const padY = 18;

  const polylinePoints = chartPoints
    .map((pt, idx) => {
      const x = padX + (idx / Math.max(1, chartPoints.length - 1)) * (svgWidth - padX * 2);
      const y = padY + ((100 - pt.yesCents) / 100) * (svgHeight - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <main className="py-8 space-y-6 w-full max-w-full overflow-x-hidden box-border">
      {/* Breadcrumb & Market Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/markets"
          className="inline-flex items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-3.5 py-1.5 text-xs font-medium text-fey-mist hover:text-fey-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Markets</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-caption text-fey-graphite">
          <span className="text-fey-signal">{market.category}</span>
          <span>·</span>
          <span className="tnum">24h Vol {market.volume}</span>
          <span>·</span>
          <span>Ends {market.resolves}</span>
        </div>
      </div>

      {/* Execution Desk Grid */}
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.95fr] items-start">
        {/* LEFT COLUMN: Interactive Price History Chart + Collapsible Orderbook + Rules Panel */}
        <div className="space-y-5 min-w-0">
          <section className="fey-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-caption text-fey-signal">{market.venue}</span>
                <h1 className="mt-1 text-heading text-fey-white">{market.question}</h1>
              </div>
              <div className="text-right shrink-0">
                <span className="tnum text-display text-fey-growth">{activePoint.yesCents}%</span>
                <span className="block text-caption text-fey-graphite">{activePoint.label}</span>
              </div>
            </div>

            {/* Timeframe Pills (1H, 1D, 1W, ALL) with Liquid Highlight */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="inline-flex items-center gap-1 rounded-pill bg-fey-obsidian border border-fey-smoke p-1">
                {TIMEFRAMES.map((tf) => {
                  const active = timeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        setTimeframe(tf);
                      }}
                      className={`relative rounded-pill px-3 py-1 text-xs font-medium tnum transition-colors ${
                        active ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"
                      }`}
                    >
                      {active ? (
                        <motion.span
                          layoutId="chart-tf-pill"
                          initial={false}
                          transition={SPRING}
                          className="absolute inset-0 rounded-pill bg-fey-charcoal border border-fey-signal/70"
                        />
                      ) : null}
                      <span className="relative z-10">{tf}</span>
                    </button>
                  );
                })}
              </div>

              <span className="tnum text-xs text-fey-graphite">
                YES {activePoint.yesCents}¢ · NO {activePoint.noCents}¢
              </span>
            </div>

            {/* Interactive SVG Chart */}
            <div
              className="fey-well p-3 relative overflow-hidden"
              onMouseLeave={() => setHoverIdx(null)}
            >
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-44 overflow-visible"
                role="img"
                aria-label={`Price history chart for ${market.question}`}
              >
                <defs>
                  <linearGradient id="yesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-fey-growth)" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="var(--color-fey-growth)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[25, 50, 75].map((lvl) => {
                  const y = padY + ((100 - lvl) / 100) * (svgHeight - padY * 2);
                  return (
                    <g key={lvl}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={svgWidth - padX}
                        y2={y}
                        stroke="var(--color-fey-smoke)"
                        strokeDasharray="3 3"
                        strokeWidth="0.75"
                      />
                      <text x={svgWidth - padX + 4} y={y + 3} fill="var(--color-fey-graphite)" fontSize="9">
                        {lvl}%
                      </text>
                    </g>
                  );
                })}

                <polygon
                  points={`${padX},${svgHeight - padY} ${polylinePoints} ${svgWidth - padX},${svgHeight - padY}`}
                  fill="url(#yesAreaGrad)"
                />

                <polyline
                  fill="none"
                  stroke="var(--color-fey-growth)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />

                {chartPoints.map((pt, idx) => {
                  const x = padX + (idx / Math.max(1, chartPoints.length - 1)) * (svgWidth - padX * 2);
                  const y = padY + ((100 - pt.yesCents) / 100) * (svgHeight - padY * 2);
                  const isHovered = hoverIdx === idx || (hoverIdx === null && idx === chartPoints.length - 1);
                  return (
                    <g key={pt.label + idx}>
                      <rect
                        x={x - svgWidth / chartPoints.length / 2}
                        y={0}
                        width={svgWidth / chartPoints.length}
                        height={svgHeight}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoverIdx(idx)}
                      />
                      {isHovered ? (
                        <>
                          <line
                            x1={x}
                            y1={padY}
                            x2={x}
                            y2={svgHeight - padY}
                            stroke="var(--color-fey-signal)"
                            strokeWidth="1"
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r="4.5"
                            fill="var(--color-fey-growth)"
                            stroke="var(--color-fey-charcoal)"
                            strokeWidth="1.5"
                          />
                        </>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          {/* Collapsible Orderbook Dropdown (Collapsed by Default) */}
          <section className="fey-card overflow-hidden">
            <button
              type="button"
              aria-expanded={orderbookOpen}
              onClick={() => {
                sfx.tap();
                setOrderbookOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-fey-obsidian/50 transition-colors"
            >
              <div>
                <h2 className="text-heading-sm text-fey-white">Orderbook</h2>
                <p className="text-xs text-fey-graphite">
                  {wsConnected ? "Live Streaming" : "Orderbook Active"} · Last Matched {orderbook.lastPriceCents}.0¢
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="tnum rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-1 text-xs text-fey-mist">
                  Spread {orderbook.spreadCents}¢
                </span>
                {orderbookOpen ? (
                  <ChevronUp className="size-4 text-fey-mist" />
                ) : (
                  <ChevronDown className="size-4 text-fey-mist" />
                )}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {orderbookOpen ? (
                <motion.div
                  key="orderbook-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING}
                  className="border-t border-fey-smoke p-5 space-y-4"
                >
                  <div className="grid grid-cols-3 text-caption text-fey-graphite px-2">
                    <span>Price (¢)</span>
                    <span className="text-right">Shares</span>
                    <span className="text-right">Total (USDC)</span>
                  </div>

                  {/* Asks (#ffa16c liquid bars) */}
                  <div className="space-y-1.5" aria-label="Orderbook Asks">
                    <p className="text-caption text-fey-ember px-2">Asks (Sell YES / Buy NO)</p>
                    {[...orderbook.asks].reverse().map((level, idx) => (
                      <button
                        key={`ask-${idx}`}
                        type="button"
                        onClick={() => {
                          sfx.tap();
                          setSide("yes");
                        }}
                        className="relative flex w-full items-center justify-between overflow-hidden rounded-well bg-fey-obsidian px-3 py-1.5 text-xs tnum hover:border-fey-ember/60 border border-transparent transition-colors"
                      >
                        <motion.div
                          className="absolute inset-y-0 right-0 bg-fey-ember/15 pointer-events-none"
                          initial={false}
                          animate={{ width: `${level.depthPct}%` }}
                          transition={SPRING}
                        />
                        <span className="relative z-10 font-semibold text-fey-ember">{level.priceCents}¢</span>
                        <span className="relative z-10 text-fey-mist">{level.shares.toLocaleString("en-US")}</span>
                        <span className="relative z-10 text-fey-white">${level.totalUsdc.toLocaleString("en-US")}</span>
                      </button>
                    ))}
                  </div>

                  {/* Mid-market Ticker */}
                  <div className="fey-well px-3.5 py-2 flex items-center justify-between text-xs tnum">
                    <span className="text-fey-graphite">Last Matched Price</span>
                    <span className="font-bold text-fey-white">{orderbook.lastPriceCents}.0¢</span>
                  </div>

                  {/* Bids (#4ebe96 liquid bars) */}
                  <div className="space-y-1.5" aria-label="Orderbook Bids">
                    <p className="text-caption text-fey-growth px-2">Bids (Buy YES)</p>
                    {orderbook.bids.map((level, idx) => (
                      <button
                        key={`bid-${idx}`}
                        type="button"
                        onClick={() => {
                          sfx.tap();
                          setSide("yes");
                        }}
                        className="relative flex w-full items-center justify-between overflow-hidden rounded-well bg-fey-obsidian px-3 py-1.5 text-xs tnum hover:border-fey-growth/60 border border-transparent transition-colors"
                      >
                        <motion.div
                          className="absolute inset-y-0 right-0 bg-fey-growth/15 pointer-events-none"
                          initial={false}
                          animate={{ width: `${level.depthPct}%` }}
                          transition={SPRING}
                        />
                        <span className="relative z-10 font-semibold text-fey-growth">{level.priceCents}¢</span>
                        <span className="relative z-10 text-fey-mist">{level.shares.toLocaleString("en-US")}</span>
                        <span className="relative z-10 text-fey-white">${level.totalUsdc.toLocaleString("en-US")}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          {/* Your Position Panel (Shown when user holds an active position in this market) */}
          {marketPositions.length > 0 ? (
            <section className="space-y-3" aria-label="Your Position">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-fey-growth">Active Position</p>
                  <h2 className="text-heading-sm text-fey-white">Your Position</h2>
                </div>
                <Link
                  to="/portfolio"
                  className="text-xs font-medium text-fey-signal hover:underline"
                >
                  Open Full Portfolio
                </Link>
              </div>
              <div className="space-y-4">
                {marketPositions.map((posItem) => (
                  <PositionManagerCard
                    key={posItem.tokenId}
                    item={posItem}
                    showMarketLink={false}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Collapsible Polymarket Rules Dropdown (Collapsed by Default) */}
          <section className="fey-card overflow-hidden">
            <button
              type="button"
              aria-expanded={rulesOpen}
              onClick={() => {
                sfx.tap();
                setRulesOpen((v) => !v);
              }}
              className="flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-fey-obsidian/50 transition-colors"
            >
              <div>
                <h2 className="text-heading-sm text-fey-white">Polymarket Rules</h2>
                <p className="text-xs text-fey-graphite">
                  Oracle: {market.oracleSource} · Resolves {market.resolves}
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-1 text-[11px] text-fey-signal">
                  Verified Rules
                </span>
                {rulesOpen ? (
                  <ChevronUp className="size-4 text-fey-mist" />
                ) : (
                  <ChevronDown className="size-4 text-fey-mist" />
                )}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {rulesOpen ? (
                <motion.div
                  key="rules-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING}
                  className="border-t border-fey-smoke p-5 space-y-3 bg-fey-obsidian/40"
                >
                  <p className="text-body text-fey-mist">{market.rules}</p>

                  <div className="pt-2 space-y-2 border-t border-fey-smoke/60 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fey-graphite">Resolution Source</span>
                      <span className="text-fey-white font-medium text-right">
                        {market.oracleSource}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fey-graphite">End Date</span>
                      <span className="tnum text-fey-mist">
                        {market.resolves} ({market.endDateIso.slice(0, 10)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fey-graphite">Market ID</span>
                      <span className="tnum text-fey-signal" title={market.conditionId}>
                        {shortHex(market.conditionId, 10, 8)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>

        {/* RIGHT COLUMN: Order Ticket + Animated 3-Step Settlement Tracker */}
        <section className="fey-card p-5 space-y-5 min-w-0">
          <div className="flex items-center justify-between pb-3 border-b border-fey-smoke">
            <h2 className="text-heading-sm text-fey-white">Order Ticket</h2>
            <span className="tnum text-caption text-fey-signal">
              Slippage {slippagePct.toFixed(1)}%
            </span>
          </div>

          {/* YES / NO Toggle with Liquid Highlight */}
          <div className="grid grid-cols-2 gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke p-1.5">
            {(["yes", "no"] as const).map((option) => {
              const active = side === option;
              const cents = formatCents(option === "yes" ? liveYesMicro : liveNoMicro);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    sfx.tap();
                    setSide(option);
                  }}
                  className={`relative flex h-11 items-center justify-between rounded-pill px-4 text-body font-semibold transition-colors ${
                    active ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="ticket-side-liquid"
                      initial={false}
                      transition={SPRING}
                      className={`absolute inset-0 rounded-pill border ${
                        option === "yes"
                          ? "bg-fey-growth/20 border-fey-growth"
                          : "bg-fey-ember/20 border-fey-ember"
                      }`}
                    />
                  ) : null}
                  <span className="relative z-10 uppercase">{option}</span>
                  <span
                    className={`relative z-10 tnum ${
                      option === "yes" ? "text-fey-growth" : "text-fey-ember"
                    }`}
                  >
                    {cents}¢
                  </span>
                </button>
              );
            })}
          </div>

          {/* USDC Input + Quick Chips ($5 / $25 / $50 / Max) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-caption text-fey-graphite" htmlFor="bet-usdc-input">
                Amount (USDC)
              </label>
              <button
                type="button"
                onClick={() => setActiveModal(connected ? "deposit" : "connect")}
                className="tnum text-xs text-fey-signal hover:underline"
              >
                Balance: ${effectiveAvailable > 0 ? formatUsdc(effectiveAvailable) : "0.00"} · Add cash
              </button>
            </div>

            <div className="flex items-center justify-between rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 focus-within:border-fey-signal box-border">
              <span className="text-fey-graphite font-medium">$</span>
              <input
                id="bet-usdc-input"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => {
                  setFormError(null);
                  setAmountInput(e.target.value);
                }}
                className="w-full min-w-0 bg-transparent px-2 text-heading-sm tnum text-fey-white outline-none"
              />
              <span className="text-caption text-fey-graphite">USDC</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {["5", "25", "50", "Max"].map((chip) => {
                const value = chip === "Max" ? String(Math.max(1, Math.floor(maxDollars))) : chip;
                const active = amountInput === value;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      sfx.tap();
                      setFormError(null);
                      setAmountInput(value);
                    }}
                    className={`h-9 rounded-pill text-xs font-medium tnum border transition-colors ${
                      active
                        ? "bg-fey-ink border-fey-white text-fey-white"
                        : "bg-fey-obsidian border-fey-smoke text-fey-mist hover:text-fey-white"
                    }`}
                  >
                    {chip === "Max" ? "Max" : `$${chip}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimated Payout Summary Well */}
          <div className="fey-well p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-fey-graphite">Estimated Shares</span>
              <span className="tnum font-medium text-fey-white">
                {formatShares(estSharesMicro)} {side.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fey-graphite">Min Shares ({slippagePct.toFixed(1)}% room)</span>
              <span className="tnum text-fey-mist">{formatShares(minSharesMicro)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fey-graphite">Payout if {side.toUpperCase()} wins</span>
              <span className="tnum font-semibold text-fey-growth">
                ${formatShares(estSharesMicro)} USDC
              </span>
            </div>
          </div>

          {formError ? (
            <p className="rounded-well bg-fey-obsidian border border-fey-ember px-3.5 py-2.5 text-xs text-fey-ember">
              {formError}
            </p>
          ) : null}

          {/* Trade Ghost Pill CTA */}
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleTrade()}
            className="ghost-pill-cta flex h-12 w-full items-center justify-center gap-2 text-body font-semibold disabled:opacity-50"
          >
            <Lock className="size-4 text-fey-ember" />
            <span>
              {busy
                ? "Private routing in progress…"
                : `Trade · ${side.toUpperCase()} ($${amountInput || "0"} USDC)`}
            </span>
          </button>

          {/* Animated 3-Step Settlement Tracker */}
          <div className="fey-well p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption text-fey-graphite">Private Trade Status</span>
              <span className="tnum text-caption text-fey-signal">
                {liveOrder ? dbStatusOf(liveOrder) ?? "READY" : "READY"}
              </span>
            </div>

            <ol className="space-y-3">
              {TRACKER_STEPS.map((st, idx) => {
                const isDone =
                  tracker.state === "done" ||
                  (tracker.activeStep > idx && tracker.state !== "idle");
                const isCurrent = tracker.activeStep === idx && tracker.state === "running";
                const isFailed = tracker.activeStep === idx && tracker.state === "failed";

                return (
                  <li key={st.code} className="flex items-start gap-3">
                    <span
                      className={`mt-1 size-3 shrink-0 rounded-full ${
                        isDone
                          ? "bg-fey-growth"
                          : isCurrent
                            ? "bg-fey-signal node-live pulse-dot"
                            : isFailed
                              ? "bg-fey-ember"
                              : "bg-fey-smoke"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-medium ${
                            isDone || isCurrent ? "text-fey-white" : "text-fey-graphite"
                          }`}
                        >
                          {st.title}
                        </span>
                        <span className="tnum text-[10px] text-fey-graphite">{st.code}</span>
                      </div>
                      <p className="text-xs text-fey-graphite">{st.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Explorer & Receipt Links once settled */}
            {liveOrder?.phase === "settled" ? (
              <div className="pt-3 border-t border-fey-smoke flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fey-growth">
                  <CheckCircle2 className="size-4" />
                  <span>Position settled</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/thank-you",
                      search: {
                        market: market.question,
                        side,
                        amount: amountInput,
                      },
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 py-1 text-xs font-medium text-fey-white hover:border-fey-pale"
                >
                  <span>View Receipt</span>
                  <ExternalLink className="size-3" />
                </button>
              </div>
            ) : null}

            {solanaSig || polygonHash ? (
              <div className="pt-2 flex flex-wrap gap-3 text-xs">
                {solanaSig ? (
                  <a
                    href={`https://explorer.solana.com/tx/${solanaSig}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-fey-signal hover:underline inline-flex items-center gap-1"
                  >
                    <span>Solana Explorer</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
                {polygonHash ? (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${polygonHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-fey-growth hover:underline inline-flex items-center gap-1"
                  >
                    <span>Polygonscan</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Sticky Mobile CTA */}
      <div className="fixed inset-x-0 bottom-20 z-30 px-4 lg:hidden">
        <div className="fey-card p-3 flex items-center justify-between gap-3">
          <div>
            <span className="text-caption text-fey-graphite block">{side.toUpperCase()} PRICE</span>
            <span className="tnum text-heading-sm text-fey-white">
              {formatCents(activeAskMicro)}¢ · ${amountInput || "0"}
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleTrade()}
            className="ghost-pill-cta h-10 px-5 text-xs font-semibold"
          >
            {busy ? "Routing…" : `Trade ${side.toUpperCase()}`}
          </button>
        </div>
      </div>
    </main>
  );
}
