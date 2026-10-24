import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Plus, SlidersHorizontal, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  formatCents,
  formatShares,
  formatUsdc,
  markValue,
  MAX_TICKET,
  parseUsdc,
  type EnrichedPosition,
} from "@/lib/moxie/format";
import { sharesFor } from "@/lib/moxie/machine";
import { sfx } from "@/lib/moxie/sound";
import { useDesk } from "@/lib/moxie/store";

export function PositionManagerCard({
  item,
  showMarketLink = true,
  defaultOpen = false,
}: {
  item: EnrichedPosition;
  showMarketLink?: boolean;
  defaultOpen?: boolean;
}) {
  const defaultCents = formatCents(item.liveMarkPriceMicro);
  const [open, setOpen] = useState(defaultOpen);
  const [actionMode, setActionMode] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPriceCents, setLimitPriceCents] = useState(defaultCents);

  // Buy (Add to position) state
  const [buyUsdcInput, setBuyUsdcInput] = useState("25");
  const [buyBalancePct, setBuyBalancePct] = useState<number | null>(null);

  // Sell (Reduce position) state
  const [sellPct, setSellPct] = useState(100);
  const [customSellPctInput, setCustomSellPctInput] = useState("100");

  const connected = useDesk((s) => s.connected);
  const available = useDesk((s) => s.available);
  const addToPosition = useDesk((s) => s.addToPosition);
  const cashOutPosition = useDesk((s) => s.cashOutPosition);
  const pushConsoleLog = useDesk((s) => s.pushConsoleLog);

  const positive = item.pnlMicro >= 0;
  const avgEntryCents =
    item.sharesMicro > 0 ? ((item.costMicro / item.sharesMicro) * 100).toFixed(1) : "0.0";

  const executionPriceMicro =
    orderType === "limit"
      ? Math.round(
          Math.max(1, Math.min(99, Number.parseFloat(limitPriceCents) || 50)) * 10_000,
        )
      : item.liveMarkPriceMicro;

  // Buy calculations
  const parsedBuyMicro = parseUsdc(buyUsdcInput) ?? 0;
  const estAddedSharesMicro =
    parsedBuyMicro > 0 ? sharesFor(parsedBuyMicro, Math.max(10_000, executionPriceMicro)) : 0;

  // Sell calculations
  const parsedCustomSellPct = Number.parseFloat(customSellPctInput);
  const effectiveSellPct = Number.isFinite(parsedCustomSellPct)
    ? Math.max(1, Math.min(100, parsedCustomSellPct))
    : sellPct;
  const sharesToSellMicro = Math.min(
    item.sharesMicro,
    Math.max(1, Math.round((item.sharesMicro * effectiveSellPct) / 100)),
  );
  const estProceedsMicro = markValue(sharesToSellMicro, executionPriceMicro);

  function handleSelectBuyPct(pct: number) {
    sfx.tap();
    setBuyBalancePct(pct);
    const maxUsableMicro = Math.min(MAX_TICKET, Math.max(0, available));
    const targetMicro = Math.floor((maxUsableMicro * pct) / 100);
    const dollars = Math.max(0.01, targetMicro / 1_000_000);
    setBuyUsdcInput(dollars >= 1 ? String(Math.floor(dollars)) : dollars.toFixed(2));
  }

  function handleExecuteBuy() {
    if (!connected) {
      sfx.nope();
      toast("Log in or connect your wallet in the top header first.");
      return;
    }
    const usdcMicro = parseUsdc(buyUsdcInput);
    if (usdcMicro === null || usdcMicro <= 0) {
      sfx.nope();
      toast("Enter a valid USDC amount between $0.01 and $5,000.00.");
      return;
    }
    if (usdcMicro > available) {
      sfx.nope();
      toast(`Order exceeds your Available Balance ($${formatUsdc(available)} USDC).`);
      return;
    }
    if (orderType === "limit") {
      const parsedLimit = Number.parseFloat(limitPriceCents);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 99) {
        sfx.nope();
        toast("Enter a valid limit price between 1¢ and 99¢.");
        return;
      }
    }

    try {
      const { addedSharesMicro } = addToPosition({
        marketId: item.marketId,
        side: item.side,
        tokenId: item.tokenId,
        usdcMicro,
        executionPriceMicro,
        orderType,
      });
      sfx.bought();
      pushConsoleLog(
        `[buy:${orderType}] added +${formatShares(addedSharesMicro)} ${item.side.toUpperCase()} shares on "${item.market.question}" for $${formatUsdc(usdcMicro)} USDC`,
      );
      toast(
        `${orderType === "limit" ? `Limit buy (${limitPriceCents}¢)` : "Market buy"} filled: Added ${formatShares(addedSharesMicro)} ${item.side.toUpperCase()} shares ($${formatUsdc(usdcMicro)} USDC).`,
      );
    } catch (err) {
      sfx.nope();
      toast(err instanceof Error ? err.message : "Could not add to position.");
    }
  }

  function handleExecuteSell() {
    if (!connected) {
      sfx.nope();
      toast("Log in or connect your wallet in the top header first.");
      return;
    }
    if (item.sharesMicro <= 0) {
      sfx.nope();
      toast("No shares available to sell in this position.");
      return;
    }
    const rawPct = Number.parseFloat(customSellPctInput);
    if (!Number.isFinite(rawPct) || rawPct <= 0 || rawPct > 100) {
      sfx.nope();
      toast(
        `Enter a sell percentage between 1% and 100%. You hold ${formatShares(item.sharesMicro)} shares.`,
      );
      return;
    }
    if (sharesToSellMicro > item.sharesMicro) {
      sfx.nope();
      toast(`Cannot sell more than your ${formatShares(item.sharesMicro)} held shares.`);
      return;
    }
    if (orderType === "limit") {
      const parsedLimit = Number.parseFloat(limitPriceCents);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 99) {
        sfx.nope();
        toast("Enter a valid limit price between 1¢ and 99¢.");
        return;
      }
    }

    sfx.bought();
    cashOutPosition(item.tokenId, estProceedsMicro, effectiveSellPct);
    pushConsoleLog(
      `[sell:${orderType}] sold ${effectiveSellPct}% of "${item.market.question}" for +$${formatUsdc(estProceedsMicro)} USDC`,
    );
    toast(
      `${orderType === "limit" ? `Limit sell (${limitPriceCents}¢)` : "Market sell"} filled: Sold ${effectiveSellPct}% (${formatShares(sharesToSellMicro)} shares) for $${formatUsdc(estProceedsMicro)} USDC.`,
    );
  }

  return (
    <article className="fey-card p-5 sm:p-6 space-y-4 w-full max-w-full box-border">
      {/* Position Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-pill px-3 py-0.5 text-caption ${
                item.side === "yes"
                  ? "bg-fey-growth/15 text-fey-growth border border-fey-growth/50"
                  : "bg-fey-ember/15 text-fey-ember border border-fey-ember/50"
              }`}
            >
              {item.side.toUpperCase()} POSITION
            </span>
            <span className="text-caption text-fey-graphite">{item.market.venue}</span>
          </div>

          {showMarketLink ? (
            <Link
              to="/trade/$marketId"
              params={{ marketId: item.market.id }}
              className="mt-2 block text-heading-sm sm:text-heading text-fey-white hover:text-fey-signal transition-colors"
            >
              {item.market.question}
            </Link>
          ) : (
            <h3 className="mt-2 text-heading-sm sm:text-heading text-fey-white">
              {item.market.question}
            </h3>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="text-caption text-fey-graphite block">Position Value</span>
          <span className="tnum text-heading text-fey-white">
            ${formatUsdc(item.currentValueMicro)}
          </span>
          <span
            className={`block tnum text-xs font-medium ${
              positive ? "text-fey-growth" : "text-fey-ember"
            }`}
          >
            {positive ? "+" : ""}
            ${formatUsdc(item.pnlMicro)} ({positive ? "+" : ""}
            {item.pnlPct}%)
          </span>
        </div>
      </div>

      {/* Compact Position Metrics Grid (Shares, Entry Price, Mark Price, Current PnL) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="fey-well p-3">
          <span className="text-caption text-fey-graphite block">Shares</span>
          <span className="tnum mt-1 block text-body font-semibold text-fey-white">
            {formatShares(item.sharesMicro)}
          </span>
        </div>
        <div className="fey-well p-3">
          <span className="text-caption text-fey-graphite block">Entry Price</span>
          <span className="tnum mt-1 block text-body font-semibold text-fey-mist">
            {avgEntryCents}¢
          </span>
        </div>
        <div className="fey-well p-3">
          <span className="text-caption text-fey-graphite block">Mark Price</span>
          <span className="tnum mt-1 block text-body font-semibold text-fey-signal">
            {defaultCents}¢
          </span>
        </div>
        <div className="fey-well p-3">
          <span className="text-caption text-fey-graphite block">Current PnL</span>
          <span
            className={`tnum mt-1 block text-body font-semibold ${
              positive ? "text-fey-growth" : "text-fey-ember"
            }`}
          >
            {positive ? "+" : ""}${formatUsdc(item.pnlMicro)}
          </span>
        </div>
      </div>

      {/* Collapsible Manage Position Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-fey-smoke text-xs">
        <span className="text-fey-mist font-medium inline-flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5 text-fey-signal" />
          <span>Position Management (Buy / Sell)</span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            sfx.tap();
            setOpen((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 rounded-pill bg-fey-obsidian border border-fey-smoke px-3.5 py-1.5 text-xs font-medium text-fey-white hover:border-fey-pale transition-colors"
        >
          <span>{open ? "Hide Controls" : "Manage Position"}</span>
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      {/* Two-Way Position Management Controls (Buy / Add & Sell / Reduce) */}
      {open ? (
        <div className="fey-well p-4 sm:p-5 space-y-4 text-xs">
          {/* Top Row: Buy (Add) / Sell Toggle + Market / Limit Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-fey-smoke/60">
            {/* Buy / Sell Toggle */}
            <div className="inline-flex rounded-pill bg-fey-charcoal border border-fey-smoke p-1">
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setActionMode("buy");
                }}
                className={`inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors ${
                  actionMode === "buy"
                    ? "bg-fey-growth/20 text-fey-growth border border-fey-growth"
                    : "text-fey-graphite hover:text-fey-mist border border-transparent"
                }`}
              >
                <Plus className="size-3.5" />
                <span>Buy (Add)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sfx.tap();
                  setActionMode("sell");
                }}
                className={`inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-colors ${
                  actionMode === "sell"
                    ? "bg-fey-ember/20 text-fey-ember border border-fey-ember"
                    : "text-fey-graphite hover:text-fey-mist border border-transparent"
                }`}
              >
                <TrendingDown className="size-3.5" />
                <span>Sell</span>
              </button>
            </div>

            {/* Market / Limit Order Type Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-caption text-fey-graphite">Order Type</span>
              <div className="inline-flex rounded-pill bg-fey-charcoal border border-fey-smoke p-0.5">
                {(["market", "limit"] as const).map((mode) => {
                  const active = orderType === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        setOrderType(mode);
                      }}
                      className={`rounded-pill px-3.5 py-1 text-xs font-medium capitalize transition-colors ${
                        active
                          ? "bg-fey-ink text-fey-white border border-fey-signal"
                          : "text-fey-graphite hover:text-fey-mist border border-transparent"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Target Limit Price Input (shown for both Buy & Sell when Limit is selected) */}
          {orderType === "limit" ? (
            <div className="space-y-1.5">
              <label className="text-caption text-fey-graphite block">
                Target Limit Price (¢)
              </label>
              <div className="flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-smoke px-4 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="Target limit price in cents"
                  value={limitPriceCents}
                  onChange={(e) => setLimitPriceCents(e.target.value)}
                  placeholder={defaultCents}
                  className="w-full min-w-0 bg-transparent tnum text-body text-fey-white outline-none"
                />
                <span className="text-fey-graphite shrink-0">¢ / share</span>
              </div>
            </div>
          ) : null}

          {/* BUY (ADD TO POSITION) CONTROLS */}
          {actionMode === "buy" ? (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-caption text-fey-graphite">Add Stake (USDC)</span>
                <span className="tnum text-fey-mist">
                  Available: <strong className="text-fey-white">${formatUsdc(available)}</strong>
                </span>
              </div>

              <div className="flex items-center justify-between rounded-pill bg-fey-charcoal border border-fey-smoke px-4 py-2.5 focus-within:border-fey-signal">
                <span className="text-fey-graphite font-medium">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="USDC amount to add"
                  value={buyUsdcInput}
                  onChange={(e) => {
                    setBuyBalancePct(null);
                    setBuyUsdcInput(e.target.value);
                  }}
                  placeholder="25"
                  className="w-full min-w-0 bg-transparent px-2 tnum text-body font-semibold text-fey-white outline-none"
                />
                <span className="text-caption text-fey-graphite shrink-0">USDC</span>
              </div>

              {/* Quick-select percentages of Available Balance */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((pct) => {
                  const isSelected = buyBalancePct === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleSelectBuyPct(pct)}
                      className={`h-8 rounded-pill text-xs font-medium tnum border transition-colors ${
                        isSelected
                          ? "bg-fey-ink border-fey-growth text-fey-growth"
                          : "bg-fey-charcoal border-fey-smoke text-fey-mist hover:text-fey-white"
                      }`}
                    >
                      {pct}% Bal
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-fey-smoke/60">
                <div>
                  <span className="text-fey-graphite block">Estimated Shares Added</span>
                  <span className="tnum text-body font-semibold text-fey-growth">
                    +{formatShares(estAddedSharesMicro)} {item.side.toUpperCase()} shares
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteBuy}
                  className="ghost-pill-cta h-10 px-5 text-xs font-semibold"
                >
                  {orderType === "limit"
                    ? `Limit Buy +$${buyUsdcInput || "0"} (${limitPriceCents}¢)`
                    : `Market Buy +$${buyUsdcInput || "0"} USDC`}
                </button>
              </div>
            </div>
          ) : (
            /* SELL (REDUCE POSITION) CONTROLS */
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-caption text-fey-graphite">Position Size to Sell (%)</span>
                <span className="tnum text-fey-mist">
                  Selling {formatShares(sharesToSellMicro)} shares ({effectiveSellPct}%)
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[25, 50, 75, 100].map((preset) => {
                  const isSelected = Math.abs(effectiveSellPct - preset) < 0.01;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        setSellPct(preset);
                        setCustomSellPctInput(String(preset));
                      }}
                      className={`h-8 rounded-pill text-xs font-medium tnum border transition-colors ${
                        isSelected
                          ? "bg-fey-ink border-fey-white text-fey-white"
                          : "bg-fey-charcoal border-fey-smoke text-fey-mist hover:text-fey-white"
                      }`}
                    >
                      {preset}%
                    </button>
                  );
                })}

                <div className="flex items-center rounded-pill bg-fey-charcoal border border-fey-smoke px-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Custom sell percentage"
                    value={customSellPctInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = Number.parseFloat(raw);
                      setCustomSellPctInput(raw);
                      if (Number.isFinite(parsed)) {
                        setSellPct(Math.max(1, Math.min(100, parsed)));
                      }
                    }}
                    className="w-full min-w-0 bg-transparent text-center tnum text-xs text-fey-white outline-none"
                  />
                  <span className="text-[10px] text-fey-graphite">%</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-fey-smoke/60">
                <div>
                  <span className="text-fey-graphite block">Estimated Proceeds</span>
                  <span className="tnum text-body font-semibold text-fey-growth">
                    ${formatUsdc(estProceedsMicro)} USDC
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExecuteSell}
                  className="ghost-pill-cta h-10 px-5 text-xs font-semibold"
                >
                  {orderType === "limit"
                    ? `Submit Limit Sell (${effectiveSellPct}%)`
                    : `Market Sell (${effectiveSellPct}%)`}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
