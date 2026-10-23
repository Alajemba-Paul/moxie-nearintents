import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { base58 } from "@scure/base";
import { ErrorCodes, ProtocolError } from "./errors.ts";
import type { Intent } from "./types.ts";

export const PROGRAM_ID = "Fp8YfZhD52nPSvagqpVD9gDwMvQ7d1a2K7JXkDL3HMUV";
export const PAPER_SECRET_HEX = "69489837016c26e637c8c94a8eec4faa79a571dadc37d517746d186c37775485";
export const INTENT_DOMAIN = "moxie.intent.v1";
export const SOLVER_AUTH_DOMAIN = "moxie.solver-auth.v1";
export const QUOTE_DOMAIN = "moxie.quote.v1";
export const FILL_DOMAIN = "moxie.fill.v1";
export const CHAIN_SIG_DOMAIN = "moxie.chain-sig.v1|ethereum,137|";

const text = new TextEncoder();

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function u16le(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

export function u32le(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

export function u64le(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ProtocolError(ErrorCodes.OVERFLOW, "Unsigned amount is out of range");
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
}

export function i64le(value: number): Uint8Array {
  if (!Number.isSafeInteger(value)) {
    throw new ProtocolError(ErrorCodes.OVERFLOW, "Timestamp is out of range");
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigInt64(0, BigInt(value), true);
  return bytes;
}

export function strip0x(value: string): string {
  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}

export function decodeHex(value: string, expected?: number): Uint8Array {
  const hex = strip0x(value);
  if (hex.length % 2 !== 0 || (expected !== undefined && hex.length !== expected * 2)) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Expected a fixed-width hex field");
  }
  return hexToBytes(hex);
}

/**
 * Canonical preimage. Must match `intent_commitment` in the Anchor program:
 * domain || taker || nonce || size || expiry || u32le(market_len) || market ||
 * outcome_token || slippage || polygon_recipient || reference_ask.
 */
export function encodeIntent(intent: Intent): Uint8Array {
  const market = text.encode(intent.marketId);
  if (market.length === 0 || market.length > 64) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Market id must be 1–64 bytes");
  }
  const token = decodeHex(intent.outcomeTokenId, 32);
  const recipient = decodeHex(intent.polygonRecipient, 20);
  const taker = base58.decode(intent.taker);
  if (taker.length !== 32) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Taker is not a Solana public key");
  }
  if (!Number.isSafeInteger(intent.nonce) || intent.nonce < 0) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Nonce is missing");
  }
  if (!Number.isSafeInteger(intent.maxSlippageBps) || intent.maxSlippageBps < 0 || intent.maxSlippageBps > 10_000) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Slippage must be between 0 and 10,000 bps");
  }
  if (!Number.isSafeInteger(intent.referenceAskMicro) || intent.referenceAskMicro <= 0) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Reference ask is missing");
  }
  return concatBytes([
    text.encode(INTENT_DOMAIN),
    taker,
    u64le(intent.nonce),
    u64le(intent.sizeMicro),
    i64le(intent.expiryUnix),
    u32le(market.length),
    market,
    token,
    u16le(intent.maxSlippageBps),
    recipient,
    u64le(intent.referenceAskMicro),
  ]);
}

export function commitmentOf(intent: Intent): Uint8Array {
  return sha256(encodeIntent(intent));
}

export function signIntent(intent: Intent, secretKey: Uint8Array): Uint8Array {
  return ed25519.sign(encodeIntent(intent), secretKey);
}

export function verifyIntent(intent: Intent, signature: Uint8Array): boolean {
  const taker = base58.decode(intent.taker);
  return ed25519.verify(signature, encodeIntent(intent), taker);
}

export function solverAuthMessage(commitment: Uint8Array, solverPubkey: Uint8Array): Uint8Array {
  return concatBytes([text.encode(SOLVER_AUTH_DOMAIN), commitment, solverPubkey]);
}

export function quoteMessage(
  commitment: Uint8Array,
  priceMicro: number,
  solverPubkey: Uint8Array,
): Uint8Array {
  return concatBytes([text.encode(QUOTE_DOMAIN), commitment, u64le(priceMicro), solverPubkey]);
}

export function fillMessage(proof: {
  commitment: Uint8Array;
  polygonTx: Uint8Array;
  fillMicro: number;
  sharesMicro: number;
  priceMicro: number;
  solverPubkey: Uint8Array;
}): Uint8Array {
  return concatBytes([
    text.encode(FILL_DOMAIN),
    proof.commitment,
    proof.polygonTx,
    u64le(proof.fillMicro),
    u64le(proof.sharesMicro),
    u64le(proof.priceMicro),
    proof.solverPubkey,
  ]);
}

/** Domain-separated stand-in for a NEAR chain-signature on path `ethereum,137`. */
export function derivePolygonAddress(solanaPubkey: Uint8Array): string {
  if (solanaPubkey.length !== 32) {
    throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Solana key must be 32 bytes");
  }
  const digest = keccak_256(concatBytes([text.encode(CHAIN_SIG_DOMAIN), solanaPubkey]));
  return toChecksumAddress(digest.slice(12));
}

export function toChecksumAddress(addr: Uint8Array): string {
  const hex = bytesToHex(addr);
  const hash = bytesToHex(keccak_256(text.encode(hex)));
  let out = "0x";
  for (let i = 0; i < hex.length; i += 1) {
    const nibble = Number.parseInt(hash[i] ?? "0", 16);
    out += nibble >= 8 ? hex[i]!.toUpperCase() : hex[i];
  }
  return out;
}

export function publicKeyFromSecret(secretKey: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(secretKey);
}

export function isOnCurve(bytes: Uint8Array): boolean {
  return ed25519.utils.isValidPublicKey(bytes);
}

/** Solana PDA: sha256(seeds || bump || program || "ProgramDerivedAddress") off-curve. */
export function findProgramAddress(seeds: Uint8Array[], programId: Uint8Array): { address: Uint8Array; bump: number } {
  const marker = text.encode("ProgramDerivedAddress");
  for (let bump = 255; bump >= 0; bump -= 1) {
    const hash = sha256(concatBytes([...seeds, Uint8Array.of(bump), programId, marker]));
    if (!isOnCurve(hash)) return { address: hash, bump };
  }
  throw new ProtocolError(ErrorCodes.OVERFLOW, "No off-curve program address");
}

export function escrowAddress(taker: Uint8Array, nonce: number): { address: string; bump: number } {
  const found = findProgramAddress(
    [text.encode("escrow"), taker, u64le(nonce)],
    base58.decode(PROGRAM_ID),
  );
  return { address: base58.encode(found.address), bump: found.bump };
}

export { base58, bytesToHex, hexToBytes, sha256, ed25519 };
