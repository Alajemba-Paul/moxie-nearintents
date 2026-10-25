import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Droplets,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PositionManagerCard } from "@/components/position-manager-card";
import { derivePolygonAddress } from "@/lib/derive-proxy";
import {
  enrichPosition,
  formatUsdc,
  positionsOf,
  shortHex,
  shortKey,
} from "@/lib/moxie/format";
import {
  listIntents,
  reclaimIntentDb,
} from "@/lib/moxie/intents.functions";
import { MARKETS } from "@/lib/moxie/markets";
import { sfx } from "@/lib/moxie/sound";
import { useDesk } from "@/lib/moxie/store";
import { requestDevnetSolAirdrop } from "@/lib/solana/wallet";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio · Moxie Markets" },
      {
        name: "description",
        content:
          "View your total portfolio value, available balance, live market positions, testnet faucets, and trade history.",
      },
    ],
  }),
  component: PortfolioPage,
});

function formatBalanceOrZero(micro: number, isConnected: boolean): string {
  if (!isConnected || micro <= 0) return "0.00";
  return formatUsdc(micro);
}

function PortfolioPage() {
  const [ready, setReady] = useState(false);
  const [solFaucetBusy, setSolFaucetBusy] = useState(false);
  const [usdcFaucetBusy, setUsdcFaucetBusy] = useState(false);
  const [polFaucetBusy, setPolFaucetBusy] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<{
    type: "success" | "error";
    text: string;
    txUrl?: string;
  } | null>(null);

  const list = useServerFn(listIntents);
  const reclaimDb = useServerFn(reclaimIntentDb);

  const connected = useDesk((s) => s.connected);
  const orders = useDesk((s) => s.orders);
  const available = useDesk((s) => s.available);
  const publicKeyB58 = useDesk((s) => s.publicKeyB58);
  const externalPublicKey = useDesk((s) => s.externalPublicKey);
  const setActiveModal = useDesk((s) => s.setActiveModal);
  const refundOrder = useDesk((s) => s.refundOrder);
  const mintTestUsdc = useDesk((s) => s.mintTestUsdc);
  const pushConsoleLog = useDesk((s) => s.pushConsoleLog);
  const hydrateFromDb = useDesk((s) => s.hydrateFromDb);

  const isConnected = ready && connected;
  const activeSolanaKey = (externalPublicKey ?? publicKeyB58).trim();
  const derivedPolygon = useMemo(
    () => (activeSolanaKey ? derivePolygonAddress(activeSolanaKey) : ""),
    [activeSolanaKey],
  );

  useEffect(() => {
    void Promise.resolve(useDesk.persist.rehydrate()).finally(() => setReady(true));
  }, []);

  // Strictly scope DB queries to the currently connected wallet and rehydrate positions/trades
  useEffect(() => {
    if (!ready || !connected || !activeSolanaKey) {
      return;
    }
    const targetWallet = activeSolanaKey;
    let cancelled = false;
    void list({ data: targetWallet })
      .then((res) => {
        if (!cancelled) {
          hydrateFromDb(targetWallet, res.rows);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ready, connected, activeSolanaKey, list, hydrateFromDb]);

  // Strictly filter orders to the active wallet address to prevent any cross-wallet leak
  const hydratedOrders = useMemo(
    () =>
      isConnected && activeSolanaKey
        ? orders.filter((o) => o.intent.taker === activeSolanaKey)
        : [],
    [isConnected, activeSolanaKey, orders],
  );

  const positions = useMemo(() => positionsOf(hydratedOrders), [hydratedOrders]);

  // Calculate active share mark value and P&L
  const shareSummary = useMemo(() => {
    let totalMarkMicro = 0;
    let totalCostMicro = 0;
    const enriched = positions.map((pos) => {
      const m = MARKETS.find((item) => item.id === pos.marketId) ?? MARKETS[0]!;
      const item = enrichPosition(pos, m);
      totalMarkMicro += item.currentValueMicro;
      totalCostMicro += item.costMicro;
      return item;
    });
    return { enriched, totalMarkMicro, totalCostMicro };
  }, [positions]);

  const effectiveAvailable = isConnected ? available : 0;
  const totalPortfolioMicro = effectiveAvailable + shareSummary.totalMarkMicro;

  async function handleReclaimUsdc(orderId: string, dbRowId?: string) {
    sfx.tap();
    const now = Math.floor(Date.now() / 1000) + 3600;
    refundOrder(orderId, now);
    if (dbRowId) {
      await reclaimDb({ data: dbRowId }).catch(() => undefined);
      const updated = await list({ data: activeSolanaKey }).catch(() => null);
      if (updated) hydrateFromDb(activeSolanaKey, updated.rows);
    }
    pushConsoleLog(`[solana:userRefund] reclaimed locked USDC for intent ${shortKey(orderId, 6, 4)}`);
    toast("Reclaimed locked USDC back to your Available Balance.");
  }

  async function handleRequestSolAirdrop() {
    if (!isConnected) {
      toast("Log in or connect your wallet in the top header first.");
      return;
    }
    if (solFaucetBusy) return;
    sfx.tap();
    setSolFaucetBusy(true);
    setFaucetStatus(null);
    try {
      const res = await requestDevnetSolAirdrop(activeSolanaKey, 0.1);
      sfx.bought();
      setFaucetStatus({
        type: "success",
        text: `Airdropped ${res.amountSol} Devnet SOL to ${shortKey(activeSolanaKey, 6, 4)}.`,
        txUrl: `https://explorer.solana.com/tx/${res.signature}?cluster=devnet`,
      });
      toast(`Airdropped ${res.amountSol} Devnet SOL.`);
    } catch (err) {
      sfx.nope();
      const message =
        err instanceof Error
          ? err.message
          : "Solana Devnet RPC rate limit reached. Use the official Solana Faucet link.";
      setFaucetStatus({
        type: "error",
        text: message,
      });
      toast(message);
    } finally {
      setSolFaucetBusy(false);
    }
  }

  async function handleMintTestUsdc() {
    if (!isConnected) {
      toast("Log in or connect your wallet in the top header first.");
      return;
    }
    if (usdcFaucetBusy) return;
    sfx.tap();
    setUsdcFaucetBusy(true);
    setFaucetStatus(null);
    try {
      const res = await fetch("/api/faucet/usdc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: activeSolanaKey,
          amountUsdc: 100,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        signature?: string;
        amountUsdc?: number;
        explorerUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to mint Devnet Test USDC.");
      }
      sfx.bought();
      const amount = data.amountUsdc ?? 100;
      mintTestUsdc(amount * 1_000_000);
      setFaucetStatus({
        type: "success",
        text: `Minted $${amount} Test USDC to ${shortKey(activeSolanaKey, 6, 4)}.`,
        txUrl: data.explorerUrl,
      });
      toast(`Minted $${amount} Test USDC.`);
    } catch (err) {
      sfx.nope();
      const message = err instanceof Error ? err.message : "Test USDC mint failed.";
      setFaucetStatus({
        type: "error",
        text: message,
      });
      toast(message);
    } finally {
      setUsdcFaucetBusy(false);
    }
  }

  async function handleRequestTestnetPol() {
    if (!isConnected) {
      toast("Log in or connect your wallet in the top header first.");
      return;
    }
    if (polFaucetBusy) return;
    sfx.tap();
    setPolFaucetBusy(true);
    setFaucetStatus(null);
    try {
      const res = await fetch("/api/faucet/pol", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: derivedPolygon,
          amountPol: "0.1",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        txHash?: string;
        amountPol?: string;
        explorerUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to transfer Testnet POL.");
      }
      sfx.bought();
      setFaucetStatus({
        type: "success",
        text: `Sent ${data.amountPol ?? "0.1"} Testnet POL to ${shortHex(derivedPolygon, 6, 4)} on Polygon Amoy.`,
        txUrl: data.explorerUrl,
      });
      toast(`Sent ${data.amountPol ?? "0.1"} Testnet POL.`);
    } catch (err) {
      sfx.nope();
      const message = err instanceof Error ? err.message : "Testnet POL transfer failed.";
      setFaucetStatus({
        type: "error",
        text: message,
      });
      toast(message);
    } finally {
      setPolFaucetBusy(false);
    }
  }

  return (
    <main className="py-10 space-y-12 w-full max-w-full overflow-x-hidden box-border">
      {/* 1. Top Portfolio Overview Header (Clean metric cards, no redundant auth CTA) */}
      <section className="fey-card p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-fey-graphite">Total Portfolio Value</span>
          {!isConnected ? (
            <span className="rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-1 text-caption text-fey-graphite">
              Disconnected
            </span>
          ) : null}
        </div>

        {/* 54px Calibre 700 Total Value + Deposit & Withdraw Controls */}
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="tnum text-display-lg text-fey-white">
            ${formatBalanceOrZero(totalPortfolioMicro, isConnected)}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isConnected}
              onClick={() => {
                sfx.tap();
                setActiveModal("deposit");
              }}
              className="ghost-pill-cta inline-flex h-10 items-center gap-2 px-4 text-xs font-medium disabled:opacity-50"
            >
              <ArrowDownLeft className="size-3.5 text-fey-growth" />
              <span>Deposit (Add cash)</span>
            </button>

            <button
              type="button"
              disabled={!isConnected}
              onClick={() => {
                sfx.tap();
                setActiveModal("withdraw");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-4 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors disabled:opacity-50"
            >
              <ArrowUpRight className="size-3.5 text-fey-ember" />
              <span>Withdraw (Cash out)</span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div className="fey-well p-3.5">
            <span className="text-caption text-fey-graphite block">Available Balance</span>
            <span className="tnum mt-1 block text-heading text-fey-white">
              ${formatBalanceOrZero(effectiveAvailable, isConnected)}
            </span>
          </div>
          <div className="fey-well p-3.5">
            <span className="text-caption text-fey-graphite block">Active Share Value</span>
            <span className="tnum mt-1 block text-heading text-fey-growth">
              ${formatBalanceOrZero(shareSummary.totalMarkMicro, isConnected)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Live Markets (Active Positions & Two-Way Buy/Sell Position Management) */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-caption text-fey-graphite">Active Positions</p>
            <h2 className="text-heading text-fey-white">Live Markets</h2>
          </div>
          <Link
            to="/markets"
            className="rounded-pill bg-fey-charcoal border border-fey-smoke px-4 py-2 text-xs font-medium text-fey-white hover:border-fey-pale"
          >
            Trade More Markets
          </Link>
        </div>

        {!isConnected ? (
          <div className="fey-card p-8">
            <h3 className="text-heading-sm text-fey-white">
              Connect a wallet to view your portfolio.
            </h3>
            <p className="mt-1 text-body text-fey-graphite">
              Use the Log in / Sign up button in the top header to view your balances and manage live positions.
            </p>
          </div>
        ) : shareSummary.enriched.length === 0 ? (
          <div className="fey-card p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-heading-sm text-fey-white">
                No open positions in Live Markets yet.
              </h3>
              <p className="mt-1 text-body text-fey-graphite">
                Trade on any market to manage your live positions here.
              </p>
            </div>
            <Link
              to="/markets"
              className="ghost-pill-cta inline-flex h-10 items-center px-5 text-xs font-medium shrink-0"
            >
              Browse Markets
            </Link>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              shareSummary.enriched.length > 1 ? "xl:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {shareSummary.enriched.map((item) => (
              <PositionManagerCard key={item.tokenId} item={item} showMarketLink />
            ))}
          </div>
        )}
      </section>

      {/* 3. Testnet Faucets & Setup Hub */}
      <section className="fey-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-fey-smoke">
          <div>
            <p className="text-caption text-fey-signal">Devnet &amp; Amoy Sandbox</p>
            <h2 className="text-heading text-fey-white">Testnet Faucets &amp; Setup</h2>
          </div>
          <span className="text-xs text-fey-graphite">
            New wallets are auto-funded with 0.1 SOL, 1,000 USDC &amp; 0.1 POL
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* 1. Get Devnet SOL */}
          <div className="fey-well p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-8 items-center justify-center rounded-icon bg-fey-charcoal border border-fey-smoke text-fey-signal">
                  <Droplets className="size-4" />
                </span>
                <span className="text-caption text-fey-graphite">Solana Devnet</span>
              </div>
              <h3 className="text-heading-sm text-fey-white">Get Devnet SOL</h3>
              <p className="text-xs text-fey-mist">
                Request 0.1 Devnet SOL to cover transaction fees on{" "}
                <span className="tnum text-fey-white">
                  {isConnected ? shortKey(activeSolanaKey, 4, 4) : "your wallet"}
                </span>
                .
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={solFaucetBusy || !isConnected}
                onClick={() => void handleRequestSolAirdrop()}
                className="ghost-pill-cta flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-medium disabled:opacity-50"
              >
                <Droplets className="size-3.5 text-fey-signal" />
                <span>{solFaucetBusy ? "Requesting SOL…" : "Request 0.1 Devnet SOL"}</span>
              </button>
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors"
              >
                <span>Open Solana Faucet</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* 2. One-Click Test USDC Mint */}
          <div className="fey-well p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-8 items-center justify-center rounded-icon bg-fey-charcoal border border-fey-smoke text-fey-growth">
                  <Coins className="size-4" />
                </span>
                <span className="text-caption text-fey-growth">SPL Token Mint</span>
              </div>
              <h3 className="text-heading-sm text-fey-white">One-Click Test USDC Mint</h3>
              <p className="text-xs text-fey-mist">
                Mint $100 Test USDC directly to your Solana wallet via our Devnet treasury authority.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={usdcFaucetBusy || !isConnected}
                onClick={() => void handleMintTestUsdc()}
                className="ghost-pill-cta flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-medium disabled:opacity-50"
              >
                <Sparkles className="size-3.5 text-fey-growth" />
                <span>{usdcFaucetBusy ? "Minting Test USDC…" : "Mint 100 Test USDC"}</span>
              </button>
              <button
                type="button"
                disabled={!isConnected}
                onClick={() => setActiveModal("deposit")}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors disabled:opacity-50"
              >
                <span>Open Add Cash Modal</span>
              </button>
            </div>
          </div>

          {/* 3. Airdrop Testnet POL */}
          <div className="fey-well p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-8 items-center justify-center rounded-icon bg-fey-charcoal border border-fey-smoke text-fey-ember">
                  <ArrowUpRight className="size-4" />
                </span>
                <span className="text-caption text-fey-ember">Polygon Amoy</span>
              </div>
              <h3 className="text-heading-sm text-fey-white">Airdrop Testnet POL</h3>
              <p className="text-xs text-fey-mist">
                Transfer 0.1 Testnet POL on Polygon Amoy to your derived address{" "}
                <span className="tnum text-fey-white">
                  {isConnected ? shortHex(derivedPolygon, 6, 4) : "0x0000…0000"}
                </span>
                .
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={polFaucetBusy || !isConnected}
                onClick={() => void handleRequestTestnetPol()}
                className="ghost-pill-cta flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-medium disabled:opacity-50"
              >
                <ArrowUpRight className="size-3.5 text-fey-ember" />
                <span>{polFaucetBusy ? "Sending Testnet POL…" : "Airdrop 0.1 Testnet POL"}</span>
              </button>
              <a
                href="https://faucet.polygon.technology"
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 text-xs text-fey-mist hover:text-fey-white hover:border-fey-pale transition-colors"
              >
                <span>Polygon Amoy Faucet</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>

        {faucetStatus ? (
          <div
            className={`rounded-well border px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 ${
              faucetStatus.type === "success"
                ? "bg-fey-obsidian border-fey-growth/60 text-fey-growth"
                : "bg-fey-obsidian border-fey-ember/60 text-fey-ember"
            }`}
          >
            <span>{faucetStatus.text}</span>
            {faucetStatus.txUrl ? (
              <a
                href={faucetStatus.txUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium underline"
              >
                <span>View Transaction</span>
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* 4. Trade History & Reclaim Table (Strictly Scoped to Active Wallet, No Copy Button) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-caption text-fey-graphite">Activity Ledger</p>
            <h2 className="text-heading text-fey-white">Trade History &amp; Reclaim</h2>
          </div>
          <span className="tnum text-xs text-fey-graphite">
            {isConnected ? hydratedOrders.length : 0} total trades
          </span>
        </div>

        <div className="fey-card overflow-hidden">
          {!isConnected || hydratedOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-body text-fey-graphite">
                {!isConnected
                  ? "Connect your wallet to view your trade history and reclaimable escrows."
                  : "No trades recorded for this wallet yet. When you trade on a market, your status and transaction hash appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-fey-smoke text-caption text-fey-graphite bg-fey-obsidian">
                    <th className="py-3 px-4">Market / Side</th>
                    <th className="py-3 px-4">Amount (USDC)</th>
                    <th className="py-3 px-4">Slippage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Txn Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fey-smoke/50 text-xs tnum">
                  {hydratedOrders.map((order) => {
                    const m = MARKETS.find((item) => item.id === order.intent.marketId);
                    const canReclaim =
                      order.phase === "escrow_locked" || order.phase === "solver_matched";
                    const solSig = order.solanaTxSignature || order.signatureHex;
                    const polygonTx = order.polygonTxHex
                      ? order.polygonTxHex.startsWith("0x")
                        ? order.polygonTxHex
                        : `0x${order.polygonTxHex}`
                      : null;

                    return (
                      <tr key={order.id} className="hover:bg-fey-obsidian/50">
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-fey-white block">
                            {m?.question ?? order.intent.marketId}
                          </span>
                          <span
                            className={
                              order.intent.side === "yes" ? "text-fey-growth" : "text-fey-ember"
                            }
                          >
                            {order.intent.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-fey-white font-medium">
                          ${formatUsdc(order.intent.sizeMicro)}
                        </td>
                        <td className="py-3.5 px-4 text-fey-mist">
                          {(order.intent.maxSlippageBps / 100).toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                              order.phase === "settled"
                                ? "bg-fey-growth/15 text-fey-growth"
                                : order.phase === "refunded"
                                  ? "bg-fey-obsidian text-fey-mist border border-fey-smoke"
                                  : "bg-fey-ember/15 text-fey-ember"
                            }`}
                          >
                            {order.phase.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            {polygonTx ? (
                              <a
                                href={`https://amoy.polygonscan.com/tx/${polygonTx}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-fey-growth hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                              >
                                <span>Polygon: {shortHex(polygonTx, 6, 4)}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            ) : null}
                            {solSig ? (
                              <a
                                href={`https://explorer.solana.com/tx/${solSig}?cluster=devnet`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-fey-signal hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                              >
                                <span>Solana: {shortHex(solSig, 6, 4)}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            ) : null}
                            {canReclaim ? (
                              <button
                                type="button"
                                onClick={() => void handleReclaimUsdc(order.id)}
                                className="inline-flex items-center gap-1 rounded-pill bg-fey-obsidian border border-fey-ember px-2.5 py-0.5 text-[11px] font-medium text-fey-ember hover:bg-fey-ember/15 mt-1 self-start"
                              >
                                <RotateCcw className="size-3" />
                                <span>Reclaim USDC</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
