import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { base58 } from "@scure/base";
import { fillMessage, quoteMessage, sha256 } from "./codec.ts";
import { ErrorCodes, ProtocolError } from "./errors.ts";
import { maxPrice, sharesFor } from "./machine.ts";
import type { FillProof, Quote } from "./types.ts";

const text = new TextEncoder();

interface SolverKey {
  name: string;
  edgeBps: number;
  secret: Uint8Array;
  pubkey: Uint8Array;
}

function solverKey(name: string, edgeBps: number): SolverKey {
  const secret = sha256(text.encode(`moxie.solver.v1|${name}`));
  return { name, edgeBps, secret, pubkey: ed25519.getPublicKey(secret) };
}

export const SOLVER_NAMES = ["Northbridge", "Quiet Lot", "Harbor"];

let cachedSolverKeys: SolverKey[] | null = null;

function getSolverKeys(): SolverKey[] {
  if (!cachedSolverKeys) {
    cachedSolverKeys = [
      solverKey("Northbridge", 12),
      solverKey("Quiet Lot", 28),
      solverKey("Harbor", 70),
    ];
  }
  return cachedSolverKeys;
}

export function collectQuotes(commitment: Uint8Array, referenceAskMicro: number): Quote[] {
  return getSolverKeys().map((solver) => {
    const priceMicro = Number((BigInt(referenceAskMicro) * BigInt(10_000 + solver.edgeBps)) / 10_000n);
    const signature = ed25519.sign(quoteMessage(commitment, priceMicro, solver.pubkey), solver.secret);
    return {
      solverName: solver.name,
      solverPubkey: base58.encode(solver.pubkey),
      priceMicro,
      edgeBps: solver.edgeBps,
      signatureHex: bytesToHex(signature),
    };
  });
}

export function quoteVerified(quote: Quote, commitment: Uint8Array): boolean {
  try {
    const pubkey = base58.decode(quote.solverPubkey);
    return ed25519.verify(
      hexToSignature(quote.signatureHex),
      quoteMessage(commitment, quote.priceMicro, pubkey),
      pubkey,
    );
  } catch {
    return false;
  }
}

function hexToSignature(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length !== 128) {
    throw new ProtocolError(ErrorCodes.BAD_SIGNATURE, "Quote signature is malformed");
  }
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bestQuote(quotes: Quote[], referenceAskMicro: number, slippageBps: number, commitment: Uint8Array): Quote | null {
  const ceiling = maxPrice(referenceAskMicro, slippageBps);
  const eligible = quotes
    .filter((quote) => quote.priceMicro <= ceiling && quoteVerified(quote, commitment))
    .sort((a, b) => a.priceMicro - b.priceMicro);
  return eligible[0] ?? null;
}

export function buildFillProof(input: {
  commitment: Uint8Array;
  solverPubkey: string;
  priceMicro: number;
  fillMicro: number;
}): FillProof {
  const solver = getSolverKeys().find((key) => base58.encode(key.pubkey) === input.solverPubkey);
  if (!solver) throw new ProtocolError(ErrorCodes.UNAUTHORIZED, "Unknown solver");
  const sharesMicro = sharesFor(input.fillMicro, input.priceMicro);
  const polygonTx = sha256(concatTx(input.commitment, solver.pubkey));
  const signature = ed25519.sign(
    fillMessage({
      commitment: input.commitment,
      polygonTx,
      fillMicro: input.fillMicro,
      sharesMicro,
      priceMicro: input.priceMicro,
      solverPubkey: solver.pubkey,
    }),
    solver.secret,
  );
  return {
    commitmentHex: bytesToHex(input.commitment),
    polygonTxHex: bytesToHex(polygonTx),
    fillMicro: input.fillMicro,
    sharesMicro,
    priceMicro: input.priceMicro,
    solverPubkey: input.solverPubkey,
    signatureHex: bytesToHex(signature),
  };
}

function concatTx(commitment: Uint8Array, solver: Uint8Array): Uint8Array {
  const out = new Uint8Array(text.encode("moxie.polygon-tx.v1").length + commitment.length + solver.length);
  const prefix = text.encode("moxie.polygon-tx.v1");
  out.set(prefix, 0);
  out.set(commitment, prefix.length);
  out.set(solver, prefix.length + commitment.length);
  return out;
}

export function corruptProof(proof: FillProof): FillProof {
  const hex = proof.signatureHex;
  const flipped = hex.slice(0, -1) + (hex.endsWith("0") ? "1" : "0");
  return { ...proof, signatureHex: flipped };
}
