import type { ErrorCode } from "./errors.ts";

/** Off-chain order. The Solana lock stores only the hash of this payload. */
export interface Intent {
  taker: string;
  nonce: number;
  marketId: string;
  side: "yes" | "no";
  /** 0x-prefixed 32-byte CTF outcome token id. */
  outcomeTokenId: string;
  maxSlippageBps: number;
  expiryUnix: number;
  /** USDC base units (6 decimals). */
  sizeMicro: number;
  /** EIP-55 Polygon address derived from the Solana key. */
  polygonRecipient: string;
  /** Reference ask the ceiling is measured against, USDC micro per share. */
  referenceAskMicro: number;
}

export type Phase =
  | "intent_signed"
  | "escrow_locked"
  | "solver_matched"
  | "clob_filled"
  | "settled"
  | "refunded"
  | "rejected";

export interface Quote {
  solverName: string;
  solverPubkey: string;
  priceMicro: number;
  edgeBps: number;
  signatureHex: string;
}

export interface FillProof {
  commitmentHex: string;
  polygonTxHex: string;
  fillMicro: number;
  sharesMicro: number;
  priceMicro: number;
  solverPubkey: string;
  signatureHex: string;
}

export interface LogLine {
  title: string;
  detail: string;
}

export interface DeskOrder {
  id: string;
  intent: Intent;
  signatureHex: string;
  commitmentHex: string;
  phase: Phase;
  quotes: Quote[];
  solverName?: string;
  solverPubkey?: string;
  polygonTxHex?: string;
  sharesMicro?: number;
  fillMicro?: number;
  error?: { code: ErrorCode; message: string };
  logs: LogLine[];
  createdAt: number;
}

export interface Ledger {
  available: number;
  locked: number;
  /** `${taker}:${nonce}` keys. A spent nonce can never lock again. */
  consumed: string[];
}

export interface RouteEvent {
  type:
    | "signed"
    | "locked"
    | "quotes"
    | "matched"
    | "filled"
    | "settled"
    | "refunded"
    | "rejected"
    | "stuck";
  order: DeskOrder;
  ledger: Ledger;
  error?: { code: ErrorCode; message: string };
}

export interface EscrowSnapshot {
  phase: Phase;
  commitmentHex: string;
  sizeMicro: number;
  expiryUnix: number;
  nonce: number;
  taker: string;
  solverPubkey?: string;
  fillMicro?: number;
  sharesMicro?: number;
  quotePriceMicro?: number;
}
