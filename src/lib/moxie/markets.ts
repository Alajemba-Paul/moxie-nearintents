import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export type MarketCategory = "All" | "Politics" | "Crypto" | "Sports" | "Tech" | "Culture";

export const MARKET_CATEGORIES: MarketCategory[] = [
  "All",
  "Politics",
  "Crypto",
  "Sports",
  "Tech",
  "Culture",
];

export interface Market {
  id: string;
  question: string;
  category: Exclude<MarketCategory, "All">;
  venue: string;
  resolves: string;
  endDateIso: string;
  volume: string;
  yesAskMicro: number;
  conditionId: string;
  oracleSource: string;
  rules: string;
  clobTokenIds: [string, string];
}

export interface OrderbookLevel {
  priceCents: number;
  priceMicro: number;
  shares: number;
  totalUsdc: number;
  depthPct: number;
}

export interface MarketOrderbook {
  marketId: string;
  conditionId: string;
  spreadCents: number;
  lastPriceCents: number;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  updatedAt: string;
  source: "polymarket-clob" | "fallback-depth";
}

export interface PricePoint {
  label: string;
  yesCents: number;
  noCents: number;
}

export function outcomeTokenId(marketId: string, side: "yes" | "no"): string {
  const digest = sha256(new TextEncoder().encode(`moxie.ctf.v1|${marketId}|${side}`));
  return `0x${bytesToHex(digest)}`;
}

export function conditionIdOf(marketId: string): string {
  const digest = sha256(new TextEncoder().encode(`moxie.condition.v1|${marketId}`));
  return `0x${bytesToHex(digest)}`;
}

export const MARKETS: Market[] = [
  {
    id: "house-2026",
    question: "Will Republicans hold the House after the 2026 midterms?",
    category: "Politics",
    venue: "US Congress",
    resolves: "Nov 4, 2026",
    endDateIso: "2026-11-04T23:59:59Z",
    volume: "$41.2M",
    yesAskMicro: 570_000,
    conditionId: conditionIdOf("house-2026"),
    oracleSource: "UMA Optimistic Oracle v3 · Associated Press Call",
    rules:
      "This market resolves to YES if the Republican Party wins at least 218 seats in the 2026 US House of Representatives general election as called by the Associated Press. Otherwise it resolves to NO.",
    clobTokenIds: [outcomeTokenId("house-2026", "yes"), outcomeTokenId("house-2026", "no")],
  },
  {
    id: "fed-dec-2026",
    question: "Will the Fed cut the funds rate in December 2026?",
    category: "Politics",
    venue: "FOMC Rates",
    resolves: "Dec 16, 2026",
    endDateIso: "2026-12-16T19:00:00Z",
    volume: "$18.4M",
    yesAskMicro: 640_000,
    conditionId: conditionIdOf("fed-dec-2026"),
    oracleSource: "UMA Optimistic Oracle v3 · Federal Reserve FOMC Statement",
    rules:
      "This market resolves to YES if the Federal Open Market Committee lowers the target range for the federal funds rate by at least 25 basis points at its scheduled December 2026 meeting.",
    clobTokenIds: [outcomeTokenId("fed-dec-2026", "yes"), outcomeTokenId("fed-dec-2026", "no")],
  },
  {
    id: "btc-150k-2026",
    question: "Will Bitcoin trade above $150,000 before 2027?",
    category: "Crypto",
    venue: "Spot Crypto",
    resolves: "Dec 31, 2026",
    endDateIso: "2026-12-31T23:59:59Z",
    volume: "$29.7M",
    yesAskMicro: 410_000,
    conditionId: conditionIdOf("btc-150k-2026"),
    oracleSource: "UMA Optimistic Oracle v3 · Coinbase BTC-USD 1m Candle",
    rules:
      "This market resolves to YES if any 1-minute BTC-USD spot candle on Coinbase prints a high price of $150,000.00 or higher before December 31, 2026 at 23:59 UTC.",
    clobTokenIds: [outcomeTokenId("btc-150k-2026", "yes"), outcomeTokenId("btc-150k-2026", "no")],
  },
  {
    id: "sol-etf-2026",
    question: "Will a US spot Solana ETF pass $5B in assets in 2026?",
    category: "Crypto",
    venue: "Digital Assets",
    resolves: "Dec 31, 2026",
    endDateIso: "2026-12-31T23:59:59Z",
    volume: "$14.8M",
    yesAskMicro: 680_000,
    conditionId: conditionIdOf("sol-etf-2026"),
    oracleSource: "UMA Optimistic Oracle v3 · Bloomberg ETF Holdings Feed",
    rules:
      "This market resolves to YES if combined net assets under management across SEC-approved US spot Solana exchange-traded funds reach $5,000,000,000 or more on any trading day in 2026.",
    clobTokenIds: [outcomeTokenId("sol-etf-2026", "yes"), outcomeTokenId("sol-etf-2026", "no")],
  },
  {
    id: "spacex-list-2026",
    question: "Will SpaceX price a public listing in 2026?",
    category: "Tech",
    venue: "Tech Listings",
    resolves: "Dec 31, 2026",
    endDateIso: "2026-12-31T23:59:59Z",
    volume: "$9.6M",
    yesAskMicro: 230_000,
    conditionId: conditionIdOf("spacex-list-2026"),
    oracleSource: "UMA Optimistic Oracle v3 · SEC EDGAR S-1 / NYSE / Nasdaq",
    rules:
      "This market resolves to YES if Space Exploration Technologies Corp. (SpaceX) or its Starlink unit completes an initial public offering or direct listing on a US exchange before 2027.",
    clobTokenIds: [outcomeTokenId("spacex-list-2026", "yes"), outcomeTokenId("spacex-list-2026", "no")],
  },
  {
    id: "real-madrid-ucl",
    question: "Will Real Madrid reach the Champions League Final?",
    category: "Sports",
    venue: "UEFA Football",
    resolves: "May 30, 2027",
    endDateIso: "2027-05-30T22:00:00Z",
    volume: "$22.1M",
    yesAskMicro: 520_000,
    conditionId: conditionIdOf("real-madrid-ucl"),
    oracleSource: "UMA Optimistic Oracle v3 · Official UEFA Match Report",
    rules:
      "This market resolves to YES if Real Madrid CF qualifies for the final match of the current UEFA Champions League season according to official UEFA records.",
    clobTokenIds: [outcomeTokenId("real-madrid-ucl", "yes"), outcomeTokenId("real-madrid-ucl", "no")],
  },
  {
    id: "gta6-launch-sales",
    question: "Will GTA VI sell 35M copies in its opening week?",
    category: "Culture",
    venue: "Gaming & Media",
    resolves: "Dec 15, 2026",
    endDateIso: "2026-12-15T23:59:59Z",
    volume: "$11.9M",
    yesAskMicro: 730_000,
    conditionId: conditionIdOf("gta6-launch-sales"),
    oracleSource: "UMA Optimistic Oracle v3 · Take-Two Interactive Press Release",
    rules:
      "This market resolves to YES if Take-Two Interactive or Rockstar Games reports at least 35,000,000 unit sales of Grand Theft Auto VI within 7 days of commercial release.",
    clobTokenIds: [outcomeTokenId("gta6-launch-sales", "yes"), outcomeTokenId("gta6-launch-sales", "no")],
  },
  {
    id: "nber-2026",
    question: "Will the NBER date a US recession starting in 2026?",
    category: "Politics",
    venue: "US Macro",
    resolves: "Dec 31, 2026",
    endDateIso: "2026-12-31T23:59:59Z",
    volume: "$6.4M",
    yesAskMicro: 180_000,
    conditionId: conditionIdOf("nber-2026"),
    oracleSource: "UMA Optimistic Oracle v3 · NBER Business Cycle Dating Committee",
    rules:
      "This market resolves to YES if the National Bureau of Economic Research officially announces a US business cycle peak dated within calendar year 2026.",
    clobTokenIds: [outcomeTokenId("nber-2026", "yes"), outcomeTokenId("nber-2026", "no")],
  },
];

export function complementAsk(yesAskMicro: number): number {
  return Math.max(10_000, Math.min(990_000, 1_000_000 - yesAskMicro));
}

export function buildOrderbook(market: Market, liveYesMicro?: number): MarketOrderbook {
  const midYesMicro = liveYesMicro ?? market.yesAskMicro;
  const midCents = Math.max(5, Math.min(95, Math.round(midYesMicro / 10_000)));
  const seed = market.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const bids: OrderbookLevel[] = [];
  const asks: OrderbookLevel[] = [];

  let maxBidTotal = 0;
  let maxAskTotal = 0;

  for (let i = 0; i < 6; i += 1) {
    const bidCents = Math.max(1, midCents - 1 - i);
    const bidShares = 1400 + ((seed * (i + 3)) % 3800) + i * 620;
    const bidTotal = Number(((bidCents / 100) * bidShares).toFixed(2));
    if (bidTotal > maxBidTotal) maxBidTotal = bidTotal;
    bids.push({
      priceCents: bidCents,
      priceMicro: bidCents * 10_000,
      shares: bidShares,
      totalUsdc: bidTotal,
      depthPct: 0,
    });

    const askCents = Math.min(99, midCents + i);
    const askShares = 1250 + ((seed * (i + 5)) % 3600) + i * 540;
    const askTotal = Number(((askCents / 100) * askShares).toFixed(2));
    if (askTotal > maxAskTotal) maxAskTotal = askTotal;
    asks.push({
      priceCents: askCents,
      priceMicro: askCents * 10_000,
      shares: askShares,
      totalUsdc: askTotal,
      depthPct: 0,
    });
  }

  for (const b of bids) {
    b.depthPct = Math.max(12, Math.round((b.totalUsdc / Math.max(maxBidTotal, 1)) * 100));
  }
  for (const a of asks) {
    a.depthPct = Math.max(12, Math.round((a.totalUsdc / Math.max(maxAskTotal, 1)) * 100));
  }

  return {
    marketId: market.id,
    conditionId: market.conditionId,
    spreadCents: Math.max(1, (asks[0]?.priceCents ?? midCents) - (bids[0]?.priceCents ?? midCents - 1)),
    lastPriceCents: midCents,
    bids,
    asks,
    updatedAt: "2026-10-24T00:00:00.000Z",
    source: "fallback-depth",
  };
}

export type ChartTimeframe = "1H" | "1D" | "1W" | "ALL";

export function buildPriceHistory(market: Market, timeframe: ChartTimeframe, liveYesMicro?: number): PricePoint[] {
  const currentCents = Math.round((liveYesMicro ?? market.yesAskMicro) / 10_000);
  const seed = market.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const count = timeframe === "1H" ? 12 : timeframe === "1D" ? 16 : timeframe === "1W" ? 14 : 18;
  const points: PricePoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const progress = i / Math.max(1, count - 1);
    const wave = Math.sin((i + seed) * 0.65) * (timeframe === "1H" ? 2.2 : timeframe === "1D" ? 4.5 : 8.5);
    const drift = (progress - 1) * ((seed % 7) - 3) * 1.8;
    const rawYes = i === count - 1 ? currentCents : Math.round(currentCents + wave + drift);
    const yesCents = Math.max(4, Math.min(96, rawYes));
    const noCents = 100 - yesCents;

    let label = "";
    if (timeframe === "1H") {
      label = `-${(count - 1 - i) * 5}m`;
    } else if (timeframe === "1D") {
      label = `${((i * 2) % 24).toString().padStart(2, "0")}:00`;
    } else if (timeframe === "1W") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      label = `${days[i % 7]} ${i < 7 ? "AM" : "PM"}`;
    } else {
      const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
      label = `${months[Math.floor((i / count) * months.length)] ?? "Oct"} ${((i * 2) % 28) + 1}`;
    }

    points.push({ label, yesCents, noCents });
  }

  return points;
}
