import { bytesToHex } from "@noble/hashes/utils.js";
import { base58 } from "@scure/base";
import {
  commitmentOf,
  ed25519,
  encodeIntent,
  publicKeyFromSecret,
  signIntent,
  solverAuthMessage,
} from "./codec.ts";
import { asProtocolError, ErrorCodes, ProtocolError } from "./errors.ts";
import { lockEscrow, matchSolver, recordFill, refundEscrow, settleRelease } from "./machine.ts";
import { bestQuote, buildFillProof, collectQuotes, corruptProof } from "./solver.ts";
import type { DeskOrder, EscrowSnapshot, Intent, Ledger, RouteEvent } from "./types.ts";

export interface PlanInput {
  ledger: Ledger;
  takerSecret: Uint8Array;
  intent: Intent;
  now: number;
  corruptProof?: boolean;
}

function errorOf(error: ProtocolError): { code: ProtocolError["code"]; message: string } {
  return { code: error.code, message: error.message };
}

function blankOrder(intent: Intent, signature: Uint8Array, commitmentHex: string, now: number): DeskOrder {
  return {
    id: `${commitmentHex.slice(0, 12)}-${intent.nonce}`,
    intent,
    signatureHex: bytesToHex(signature),
    commitmentHex,
    phase: "intent_signed",
    quotes: [],
    logs: [],
    createdAt: now,
  };
}

function withLog(order: DeskOrder, title: string, detail: string): DeskOrder {
  return { ...order, logs: [...order.logs, { title, detail }] };
}

export function planRoute(input: PlanInput): RouteEvent[] {
  const events: RouteEvent[] = [];
  let ledger: Ledger = {
    available: input.ledger.available,
    locked: input.ledger.locked,
    consumed: [...input.ledger.consumed],
  };
  const pubkey = publicKeyFromSecret(input.takerSecret);
  const taker = base58.encode(pubkey);
  if (input.intent.taker !== taker) {
    const order = withLog(
      {
        ...blankOrder(input.intent, new Uint8Array(64), "00".repeat(32), input.now),
        phase: "rejected",
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: "Intent taker does not match the signing key",
        },
      },
      "Rejected",
      "The Solana key that signed is not the taker on the intent.",
    );
    events.push({ type: "rejected", order, ledger, error: order.error });
    return events;
  }

  let signature: Uint8Array;
  let commitment: Uint8Array;
  try {
    encodeIntent(input.intent);
    signature = signIntent(input.intent, input.takerSecret);
    commitment = commitmentOf(input.intent);
  } catch (error) {
    const protocol = asProtocolError(error);
    const order = withLog(
      {
        ...blankOrder(input.intent, new Uint8Array(64), "00".repeat(32), input.now),
        phase: "rejected",
        error: errorOf(protocol),
      },
      "Rejected",
      protocol.message,
    );
    events.push({ type: "rejected", order, ledger, error: order.error });
    return events;
  }

  const commitmentHex = bytesToHex(commitment);
  let order = withLog(
    blankOrder(input.intent, signature, commitmentHex, input.now),
    "Intent signed",
    "Ed25519 over the canonical preimage. The market id is not in the Solana instruction.",
  );
  events.push({ type: "signed", order, ledger });

  let escrow: EscrowSnapshot;
  try {
    const locked = lockEscrow({ ledger, intent: input.intent, signature, now: input.now });
    ledger = locked.ledger;
    escrow = locked.escrow;
    order = withLog(
      { ...order, phase: "escrow_locked" },
      "Escrow locked",
      `Nonce ${input.intent.nonce} is spent. The vault holds the USDC against commitment ${commitmentHex.slice(0, 8)}.`,
    );
    events.push({ type: "locked", order, ledger });
  } catch (error) {
    const protocol = asProtocolError(error);
    order = withLog({ ...order, phase: "rejected", error: errorOf(protocol) }, "Rejected", protocol.message);
    events.push({ type: "rejected", order, ledger, error: order.error });
    return events;
  }

  const quotes = collectQuotes(commitment, input.intent.referenceAskMicro);
  order = withLog(
    { ...order, quotes },
    "Solver bus",
    "Quotes arrived on the private bus. Nothing about the market was written to the Solana mempool.",
  );
  events.push({ type: "quotes", order, ledger });

  const chosen = bestQuote(quotes, input.intent.referenceAskMicro, input.intent.maxSlippageBps, commitment);
  if (!chosen) {
    const returned = refundEscrow({ ledger, escrow, now: input.now });
    ledger = returned.ledger;
    escrow = returned.escrow;
    const slip = new ProtocolError(
      ErrorCodes.SLIPPAGE_EXCEEDED,
      "Every solver quote was through the maximum slippage",
    );
    order = withLog(
      { ...order, phase: "refunded", error: errorOf(slip) },
      "Refunded",
      "No quote cleared the ceiling, so the vault returned the USDC. The nonce stays spent.",
    );
    events.push({ type: "refunded", order, ledger, error: order.error });
    return events;
  }

  const solverPubkey = base58.decode(chosen.solverPubkey);
  const auth = ed25519.sign(solverAuthMessage(commitment, solverPubkey), input.takerSecret);
  try {
    escrow = matchSolver({
      escrow,
      intent: input.intent,
      solverPubkey,
      solverAuthSignature: auth,
      now: input.now,
    });
  } catch (error) {
    const protocol = asProtocolError(error);
    order = withLog({ ...order, phase: escrow.phase, error: errorOf(protocol) }, "Match failed", protocol.message);
    events.push({ type: "stuck", order, ledger, error: order.error });
    return events;
  }
  order = withLog(
    { ...order, phase: "solver_matched", solverName: chosen.solverName, solverPubkey: chosen.solverPubkey },
    "Solver matched",
    `${chosen.solverName} is bound. The taker signature names that key and no other.`,
  );
  events.push({ type: "matched", order, ledger });

  let proof = buildFillProof({
    commitment,
    solverPubkey: chosen.solverPubkey,
    priceMicro: chosen.priceMicro,
    fillMicro: input.intent.sizeMicro,
  });
  if (input.corruptProof) proof = corruptProof(proof);

  try {
    escrow = recordFill({ escrow, intent: input.intent, proof, now: input.now });
  } catch (error) {
    const protocol = asProtocolError(error);
    order = withLog(
      { ...order, phase: "solver_matched", error: errorOf(protocol) },
      "Fill rejected",
      `${protocol.message} Funds stay in the vault until expiry, then a refund is allowed.`,
    );
    events.push({ type: "stuck", order, ledger, error: order.error });
    return events;
  }
  order = withLog(
    {
      ...order,
      phase: "clob_filled",
      polygonTxHex: proof.polygonTxHex,
      sharesMicro: proof.sharesMicro,
      fillMicro: proof.fillMicro,
      error: undefined,
    },
    "CLOB fill",
    "Outcome tokens were bought on Polygon for the chain-sig address. The vault has not moved yet.",
  );
  events.push({ type: "filled", order, ledger });

  const settled = settleRelease({ ledger, escrow });
  ledger = settled.ledger;
  order = withLog(
    { ...order, phase: "settled" },
    "Settlement release",
    "The solver was paid from the vault. Unspent USDC, if any, is back on the free balance.",
  );
  events.push({ type: "settled", order, ledger });
  return events;
}
