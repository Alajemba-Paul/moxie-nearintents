import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { base58 } from "@scure/base";
import {
  commitmentOf,
  decodeHex,
  encodeIntent,
  fillMessage,
  solverAuthMessage,
  verifyIntent,
} from "./codec.ts";
import { ErrorCodes, ProtocolError } from "./errors.ts";
import type { EscrowSnapshot, FillProof, Intent, Ledger } from "./types.ts";

export function nonceKey(taker: string, nonce: number): string {
  return `${taker}:${nonce}`;
}

export function cloneLedger(ledger: Ledger): Ledger {
  return {
    available: ledger.available,
    locked: ledger.locked,
    consumed: [...ledger.consumed],
  };
}

function assertSize(sizeMicro: number): void {
  if (!Number.isSafeInteger(sizeMicro) || sizeMicro <= 0) {
    throw new ProtocolError(ErrorCodes.ZERO_SIZE, "Size must be greater than zero");
  }
}

export function lockEscrow(input: {
  ledger: Ledger;
  intent: Intent;
  signature: Uint8Array;
  now: number;
}): { ledger: Ledger; escrow: EscrowSnapshot; commitmentHex: string } {
  assertSize(input.intent.sizeMicro);
  encodeIntent(input.intent);
  if (input.intent.expiryUnix <= input.now) {
    throw new ProtocolError(ErrorCodes.EXPIRED, "Intent expiry is not in the future");
  }
  const key = nonceKey(input.intent.taker, input.intent.nonce);
  if (input.ledger.consumed.includes(key)) {
    throw new ProtocolError(
      ErrorCodes.REPLAY,
      `Nonce ${input.intent.nonce} was already consumed for this Solana key`,
    );
  }
  if (!verifyIntent(input.intent, input.signature)) {
    throw new ProtocolError(ErrorCodes.BAD_SIGNATURE, "Ed25519 signature does not cover the canonical intent");
  }
  if (input.ledger.available < input.intent.sizeMicro) {
    throw new ProtocolError(ErrorCodes.INSUFFICIENT_BALANCE, "Free USDC is below the ticket size");
  }
  const commitmentHex = bytesToHex(commitmentOf(input.intent));
  return {
    ledger: {
      available: input.ledger.available - input.intent.sizeMicro,
      locked: input.ledger.locked + input.intent.sizeMicro,
      consumed: [...input.ledger.consumed, key],
    },
    commitmentHex,
    escrow: {
      phase: "escrow_locked",
      commitmentHex,
      sizeMicro: input.intent.sizeMicro,
      expiryUnix: input.intent.expiryUnix,
      nonce: input.intent.nonce,
      taker: input.intent.taker,
    },
  };
}

export function matchSolver(input: {
  escrow: EscrowSnapshot;
  intent: Intent;
  solverPubkey: Uint8Array;
  solverAuthSignature: Uint8Array;
  now: number;
}): EscrowSnapshot {
  if (input.escrow.phase !== "escrow_locked") {
    throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, "Solver match requires a locked escrow");
  }
  if (input.now >= input.escrow.expiryUnix) {
    throw new ProtocolError(ErrorCodes.EXPIRED, "Escrow expired before a solver was bound");
  }
  if (input.solverPubkey.length !== 32) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Solver key is missing");
  }
  const commitment = hexToBytes(input.escrow.commitmentHex);
  const taker = base58.decode(input.intent.taker);
  const message = solverAuthMessage(commitment, input.solverPubkey);
  if (!ed25519.verify(input.solverAuthSignature, message, taker)) {
    throw new ProtocolError(ErrorCodes.BAD_SIGNATURE, "Taker did not authorize this solver");
  }
  return {
    ...input.escrow,
    phase: "solver_matched",
    solverPubkey: base58.encode(input.solverPubkey),
  };
}

export function maxPrice(referenceAskMicro: number, slippageBps: number): number {
  const price = (BigInt(referenceAskMicro) * BigInt(10_000 + slippageBps)) / 10_000n;
  if (price > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ProtocolError(ErrorCodes.OVERFLOW, "Ceiling overflowed");
  }
  return Number(price);
}

export function sharesFor(fillMicro: number, priceMicro: number): number {
  if (priceMicro <= 0) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Fill price is missing");
  }
  const shares = (BigInt(fillMicro) * 1_000_000n) / BigInt(priceMicro);
  if (shares <= 0n || shares > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ProtocolError(ErrorCodes.OVERFLOW, "Share amount is out of range");
  }
  return Number(shares);
}

export function recordFill(input: {
  escrow: EscrowSnapshot;
  intent: Intent;
  proof: FillProof;
  now: number;
}): EscrowSnapshot {
  if (input.escrow.phase !== "solver_matched" || !input.escrow.solverPubkey) {
    throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, "CLOB fill requires a matched solver");
  }
  if (input.now >= input.escrow.expiryUnix) {
    throw new ProtocolError(ErrorCodes.EXPIRED, "Escrow expired before the fill was recorded");
  }
  if (input.proof.solverPubkey !== input.escrow.solverPubkey) {
    throw new ProtocolError(ErrorCodes.UNAUTHORIZED, "Fill is not signed by the matched solver");
  }
  if (input.proof.commitmentHex !== input.escrow.commitmentHex) {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Fill commitment does not match the escrow");
  }
  const commitment = hexToBytes(input.escrow.commitmentHex);
  const recomputed = bytesToHex(commitmentOf(input.intent));
  if (recomputed !== input.escrow.commitmentHex) {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Revealed intent does not match the lock commitment");
  }
  if (input.proof.fillMicro <= 0 || input.proof.fillMicro > input.escrow.sizeMicro) {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Fill size is outside the locked amount");
  }
  const expectedShares = sharesFor(input.proof.fillMicro, input.proof.priceMicro);
  if (input.proof.sharesMicro !== expectedShares) {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Share count does not match the fill price");
  }
  const ceiling = maxPrice(input.intent.referenceAskMicro, input.intent.maxSlippageBps);
  if (input.proof.priceMicro > ceiling) {
    throw new ProtocolError(ErrorCodes.SLIPPAGE_EXCEEDED, "Fill price is through the taker's ceiling");
  }
  const polygonTx = decodeHex(input.proof.polygonTxHex, 32);
  if (polygonTx.every((byte) => byte === 0)) {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Polygon transaction id is empty");
  }
  const message = fillMessage({
    commitment,
    polygonTx,
    fillMicro: input.proof.fillMicro,
    sharesMicro: input.proof.sharesMicro,
    priceMicro: input.proof.priceMicro,
    solverPubkey: base58.decode(input.proof.solverPubkey),
  });
  let signature: Uint8Array;
  try {
    signature = hexToBytes(input.proof.signatureHex);
  } catch {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Fill signature is malformed");
  }
  const solver = base58.decode(input.escrow.solverPubkey);
  if (signature.length !== 64 || !ed25519.verify(signature, message, solver)) {
    throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Solver fill signature does not verify");
  }
  return {
    ...input.escrow,
    phase: "clob_filled",
    fillMicro: input.proof.fillMicro,
    sharesMicro: input.proof.sharesMicro,
    quotePriceMicro: input.proof.priceMicro,
  };
}

export function settleRelease(input: { ledger: Ledger; escrow: EscrowSnapshot }): {
  ledger: Ledger;
  escrow: EscrowSnapshot;
} {
  if (input.escrow.phase !== "clob_filled" || input.escrow.fillMicro === undefined) {
    throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, "Release requires a recorded CLOB fill");
  }
  const remainder = input.escrow.sizeMicro - input.escrow.fillMicro;
  if (remainder < 0 || input.ledger.locked < input.escrow.sizeMicro) {
    throw new ProtocolError(ErrorCodes.OVERFLOW, "Locked balance does not cover release");
  }
  return {
    ledger: {
      available: input.ledger.available + remainder,
      locked: input.ledger.locked - input.escrow.sizeMicro,
      consumed: input.ledger.consumed,
    },
    escrow: { ...input.escrow, phase: "settled" },
  };
}

export function refundEscrow(input: { ledger: Ledger; escrow: EscrowSnapshot; now: number }): {
  ledger: Ledger;
  escrow: EscrowSnapshot;
} {
  const { escrow } = input;
  const cancellable =
    escrow.phase === "escrow_locked" ||
    (escrow.phase === "solver_matched" && input.now >= escrow.expiryUnix);
  if (!cancellable) {
    throw new ProtocolError(
      ErrorCodes.INVALID_TRANSITION,
      escrow.phase === "solver_matched"
        ? "A matched escrow can only be refunded after expiry"
        : "This phase cannot return the vault",
    );
  }
  if (input.ledger.locked < escrow.sizeMicro) {
    throw new ProtocolError(ErrorCodes.OVERFLOW, "Locked balance does not cover the refund");
  }
  return {
    ledger: {
      available: input.ledger.available + escrow.sizeMicro,
      locked: input.ledger.locked - escrow.sizeMicro,
      consumed: input.ledger.consumed,
    },
    escrow: { ...escrow, phase: "refunded" },
  };
}
