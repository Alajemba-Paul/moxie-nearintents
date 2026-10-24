import { POLYMARKET_CLOB_API, POLYMARKET_GAMMA_API } from "@/config/constants";
import {
  buildOrderbook,
  conditionIdOf,
  MARKETS,
  outcomeTokenId,
  type Market,
  type MarketCategory,
  type MarketOrderbook,
} from "./markets.ts";

interface GammaMarketRaw {
  id?: string;
  slug?: string;
  question?: string;
  category?: string;
  endDate?: string;
  volume?: string | number;
  volumeNum?: number;
  outcomePrices?: string | string[];
  conditionId?: string;
  description?: string;
  clobTokenIds?: string | string[];
}

function mapCategory(raw?: string, question?: string): Exclude<MarketCategory, "All"> {
  const text = `${raw ?? ""} ${question ?? ""}`.toLowerCase();
  if (/(bitcoin|btc|eth|solana|sol|crypto|token|defi|etf)/.test(text)) return "Crypto";
  if (/(election|house|senate|fed|rate|president|trump|congress|nber|recession|tariff)/.test(text)) {
    return "Politics";
  }
  if (/(ucl|madrid|nba|nfl|fifa|premier|match|win|champion|league|sport)/.test(text)) return "Sports";
  if (/(spacex|ai|openai|apple|tesla|ipo|tech|starlink|chip)/.test(text)) return "Tech";
  return "Culture";
}

function formatVolume(val: string | number | undefined): string {
  const num = typeof val === "number" ? val : Number(val ?? 0);
  if (!Number.isFinite(num) || num <= 0) return "$4.2M";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export async function fetchPolymarketMarkets(params: {
  query?: string;
  category?: string;
}): Promise<{ markets: Market[]; source: "polymarket-gamma" | "fallback-curated" }> {
  const q = (params.query ?? "").trim().toLowerCase();
  const cat = (params.category ?? "All").trim();

  let liveMarkets: Market[] = [];
  let source: "polymarket-gamma" | "fallback-curated" = "fallback-curated";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const url = new URL(`${POLYMARKET_GAMMA_API}/markets`);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("limit", "16");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as GammaMarketRaw[];
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Market[] = [];
        for (const item of data) {
          if (!item.question) continue;
          const id = (item.slug || item.id || "").toString().slice(0, 48);
          if (!id) continue;
          let prices: string[] = [];
          if (typeof item.outcomePrices === "string") {
            try {
              prices = JSON.parse(item.outcomePrices) as string[];
            } catch {
              prices = [];
            }
          } else if (Array.isArray(item.outcomePrices)) {
            prices = item.outcomePrices;
          }
          const rawYes = Number(prices[0] ?? 0.5);
          const clampedYes = Number.isFinite(rawYes) ? Math.max(0.05, Math.min(0.95, rawYes)) : 0.5;
          const yesAskMicro = Math.round(clampedYes * 1_000_000);
          let tokenIds: [string, string] = [outcomeTokenId(id, "yes"), outcomeTokenId(id, "no")];
          if (typeof item.clobTokenIds === "string") {
            try {
              const parsed = JSON.parse(item.clobTokenIds) as string[];
              if (parsed[0] && parsed[1]) tokenIds = [parsed[0], parsed[1]];
            } catch {
              // keep deterministic fallback token IDs
            }
          }
          const category = mapCategory(item.category, item.question);
          const endIso = item.endDate && !Number.isNaN(Date.parse(item.endDate))
            ? new Date(item.endDate).toISOString()
            : "2026-12-31T23:59:59Z";
          const resolves = new Date(endIso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          mapped.push({
            id,
            question: item.question,
            category,
            venue: `Polymarket · ${category}`,
            resolves,
            endDateIso: endIso,
            volume: formatVolume(item.volumeNum ?? item.volume),
            yesAskMicro,
            conditionId:
              item.conditionId && /^0x[0-9a-fA-F]{64}$/.test(item.conditionId)
                ? item.conditionId
                : conditionIdOf(id),
            oracleSource: "UMA Optimistic Oracle v3 (Polygon)",
            rules:
              item.description?.slice(0, 360) ||
              "Resolves via UMA Optimistic Oracle v3 on Polygon based on the official Polymarket market rules.",
            clobTokenIds: tokenIds,
          });
        }
        if (mapped.length > 0) {
          liveMarkets = mapped;
          source = "polymarket-gamma";
        }
      }
    }
  } catch {
    // Fallback to curated markets seamlessly
  }

  // Always include the core MARKETS so links and existing IDs resolve deterministically
  const combinedMap = new Map<string, Market>();
  for (const m of MARKETS) combinedMap.set(m.id, m);
  for (const m of liveMarkets) {
    if (!combinedMap.has(m.id)) combinedMap.set(m.id, m);
  }

  let results = [...combinedMap.values()];
  if (cat && cat !== "All") {
    results = results.filter((m) => m.category.toLowerCase() === cat.toLowerCase());
  }
  if (q) {
    results = results.filter(
      (m) =>
        m.question.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.venue.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q),
    );
  }

  return { markets: results, source };
}

export async function fetchPolymarketOrderbook(params: {
  marketId: string;
  tokenId?: string;
}): Promise<MarketOrderbook> {
  const baseMarket =
    MARKETS.find((m) => m.id === params.marketId || m.conditionId === params.marketId) ?? MARKETS[0]!;
  const fallback = buildOrderbook(baseMarket);

  const tokenId = params.tokenId || baseMarket.clobTokenIds[0];
  if (!tokenId || tokenId.startsWith("0x")) {
    return fallback;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
    const url = `${POLYMARKET_CLOB_API}/book?token_id=${encodeURIComponent(tokenId)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const raw = (await res.json()) as {
        bids?: { price: string; size: string }[];
        asks?: { price: string; size: string }[];
      };
      if (Array.isArray(raw.bids) && Array.isArray(raw.asks) && (raw.bids.length > 0 || raw.asks.length > 0)) {
        const bids = raw.bids.slice(0, 6).map((b) => {
          const priceCents = Math.max(1, Math.min(99, Math.round(Number(b.price) * 100)));
          const shares = Math.max(10, Math.round(Number(b.size)));
          const totalUsdc = Number(((priceCents / 100) * shares).toFixed(2));
          return { priceCents, priceMicro: priceCents * 10_000, shares, totalUsdc, depthPct: 50 };
        });
        const asks = raw.asks.slice(0, 6).map((a) => {
          const priceCents = Math.max(1, Math.min(99, Math.round(Number(a.price) * 100)));
          const shares = Math.max(10, Math.round(Number(a.size)));
          const totalUsdc = Number(((priceCents / 100) * shares).toFixed(2));
          return { priceCents, priceMicro: priceCents * 10_000, shares, totalUsdc, depthPct: 50 };
        });
        return {
          ...fallback,
          bids: bids.length > 0 ? bids : fallback.bids,
          asks: asks.length > 0 ? asks : fallback.asks,
          source: "polymarket-clob",
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    // Use fallback orderbook
  }

  return fallback;
}
