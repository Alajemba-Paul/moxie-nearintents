import { complementAsk, type Market } from "./markets.ts";
import type { DeskOrder } from "./types.ts";

export const INITIAL_ONBOARD_USDC = 1_000 * 1_000_000;
export const OPENING_BALANCE = INITIAL_ONBOARD_USDC;
export const MAX_TICKET = 5_000 * 1_000_000;

export function formatUsdc(micro: number): string {
  const sign = micro < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(micro));
  const whole = Math.floor(abs / 1_000_000);
  const frac = abs % 1_000_000;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0) return `${sign}${grouped}`;
  const digits = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${sign}${grouped}.${digits}`;
}

export function formatCents(priceMicro: number): string {
  return (priceMicro / 10_000).toFixed(1);
}

export function money6(micro: number): string {
  const abs = Math.abs(Math.trunc(micro));
  const whole = Math.floor(abs / 1_000_000);
  const frac = (abs % 1_000_000).toString().padStart(6, "0");
  return `${whole}.${frac}`;
}

export function formatShares(sharesMicro: number): string {
  const whole = Math.floor(sharesMicro / 1_000_000);
  const frac = Math.floor((sharesMicro % 1_000_000) / 10_000);
  return `${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac.toString().padStart(2, "0")}`;
}

export function parseUsdc(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const micro = Number(whole) * 1_000_000 + Number(frac.padEnd(2, "0")) * 10_000;
  if (!Number.isSafeInteger(micro) || micro <= 0 || micro > MAX_TICKET) return null;
  return micro;
}

export function shortKey(value: string, lead = 4, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function shortHex(value: string, lead = 6, tail = 4): string {
  const hex = value.replace(/^0x/i, "");
  if (hex.length <= lead + tail + 1) return value;
  const body = `${hex.slice(0, lead)}…${hex.slice(-tail)}`;
  return value.startsWith("0x") || value.startsWith("0X") ? `0x${body}` : body;
}

export function markValue(sharesMicro: number, askMicro: number): number {
  return Number((BigInt(sharesMicro) * BigInt(askMicro)) / 1_000_000n);
}

export interface Position {
  marketId: string;
  side: "yes" | "no";
  tokenId: string;
  sharesMicro: number;
  costMicro: number;
}

export interface EnrichedPosition extends Position {
  market: Market;
  liveMarkPriceMicro: number;
  currentValueMicro: number;
  pnlMicro: number;
  pnlPct: string;
}

export function enrichPosition(
  pos: Position,
  market: Market,
  overrideAskMicro?: number,
): EnrichedPosition {
  const currentAskMicro =
    overrideAskMicro ??
    (pos.side === "yes" ? market.yesAskMicro : complementAsk(market.yesAskMicro));
  const liveMarkPriceMicro = Math.min(980_000, currentAskMicro + 20_000);
  const currentValueMicro = markValue(pos.sharesMicro, liveMarkPriceMicro);
  const pnlMicro = currentValueMicro - pos.costMicro;
  const pnlPct =
    pos.costMicro > 0 ? ((pnlMicro / pos.costMicro) * 100).toFixed(1) : "0.0";
  return {
    ...pos,
    market,
    liveMarkPriceMicro,
    currentValueMicro,
    pnlMicro,
    pnlPct,
  };
}

export function positionsOf(orders: DeskOrder[]): Position[] {
  const map = new Map<string, Position>();
  for (const order of orders) {
    if (order.phase !== "settled" || !order.sharesMicro || !order.fillMicro) continue;
    const key = order.intent.outcomeTokenId;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        marketId: order.intent.marketId,
        side: order.intent.side,
        tokenId: order.intent.outcomeTokenId,
        sharesMicro: order.sharesMicro,
        costMicro: order.fillMicro,
      });
    } else {
      current.sharesMicro += order.sharesMicro;
      current.costMicro += order.fillMicro;
    }
  }
  return [...map.values()];
}
