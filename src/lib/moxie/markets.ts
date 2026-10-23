import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export interface Market {
  id: string;
  question: string;
  venue: string;
  resolves: string;
  volume: string;
  yesAskMicro: number;
}

export function outcomeTokenId(marketId: string, side: "yes" | "no"): string {
  const digest = sha256(new TextEncoder().encode(`moxie.ctf.v1|${marketId}|${side}`));
  return `0x${bytesToHex(digest)}`;
}

export const MARKETS: Market[] = [
  {
    id: "house-2026",
    question: "Will Republicans hold the House after the 2026 midterms?",
    venue: "Congress",
    resolves: "Nov 4",
    volume: "$41.2m",
    yesAskMicro: 570_000,
  },
  {
    id: "fed-dec-2026",
    question: "Will the Fed cut the funds rate in December 2026?",
    venue: "Rates",
    resolves: "Dec 16",
    volume: "$18.4m",
    yesAskMicro: 640_000,
  },
  {
    id: "btc-150k-2026",
    question: "Will Bitcoin trade above $150,000 before 2027?",
    venue: "Crypto",
    resolves: "Dec 31",
    volume: "$9.7m",
    yesAskMicro: 410_000,
  },
  {
    id: "spacex-list-2026",
    question: "Will SpaceX price a public listing in 2026?",
    venue: "Listings",
    resolves: "Dec 31",
    volume: "$6.1m",
    yesAskMicro: 230_000,
  },
  {
    id: "nber-2026",
    question: "Will the NBER date a US recession starting in 2026?",
    venue: "Macro",
    resolves: "Dec 31",
    volume: "$3.4m",
    yesAskMicro: 180_000,
  },
];

export function complementAsk(yesAskMicro: number): number {
  return 1_020_000 - yesAskMicro;
}
