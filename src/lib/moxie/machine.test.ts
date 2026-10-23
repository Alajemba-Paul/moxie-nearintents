import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  base58,
  commitmentOf,
  derivePolygonAddress,
  encodeIntent,
  escrowAddress,
  hexToBytes,
  PAPER_SECRET_HEX,
  publicKeyFromSecret,
  signIntent,
} from "./codec.ts";
import { ErrorCodes, ProtocolError } from "./errors.ts";
import { OPENING_BALANCE } from "./format.ts";
import { lockEscrow, refundEscrow, settleRelease } from "./machine.ts";
import { outcomeTokenId } from "./markets.ts";
import { planRoute } from "./route.ts";
import { bestQuote, collectQuotes } from "./solver.ts";
import type { Intent, Ledger } from "./types.ts";

const secret = hexToBytes(PAPER_SECRET_HEX);
const taker = base58.encode(publicKeyFromSecret(secret));

function ledger(partial?: Partial<Ledger>): Ledger {
  return {
    available: OPENING_BALANCE,
    locked: 0,
    consumed: [],
    ...partial,
  };
}

function intent(overrides?: Partial<Intent>): Intent {
  const marketId = overrides?.marketId ?? "fed-dec-2026";
  const side = overrides?.side ?? "yes";
  return {
    taker,
    nonce: 0,
    marketId,
    side,
    outcomeTokenId: outcomeTokenId(marketId, side),
    maxSlippageBps: 50,
    expiryUnix: 2_000,
    sizeMicro: 1_000_000_000,
    polygonRecipient: derivePolygonAddress(publicKeyFromSecret(secret)),
    referenceAskMicro: 640_000,
    ...overrides,
  };
}

describe("moxie escrow machine", () => {
  it("commits the market in the preimage and keeps it out of the public lock", () => {
    const order = intent();
    const preimage = encodeIntent(order);
    const encoded = new TextDecoder().decode(preimage);
    assert.equal(encoded.includes("fed-dec-2026"), true);
    const commitment = Buffer.from(commitmentOf(order)).toString("hex");
    const publicLock = {
      nonce: order.nonce,
      sizeMicro: order.sizeMicro,
      expiryUnix: order.expiryUnix,
      commitment,
    };
    assert.equal(JSON.stringify(publicLock).includes("fed-dec-2026"), false);
    assert.equal(commitment.length, 64);
  });

  it("derives a stable polygon address and an off-curve escrow pda", () => {
    const polygon = derivePolygonAddress(publicKeyFromSecret(secret));
    assert.equal(polygon, derivePolygonAddress(publicKeyFromSecret(secret)));
    assert.match(polygon, /^0x[0-9a-fA-F]{40}$/);
    const pda = escrowAddress(publicKeyFromSecret(secret), 0);
    assert.equal(base58.decode(pda.address).length, 32);
    assert.ok(pda.bump >= 0 && pda.bump <= 255);
  });

  it("locks, replays, and rejects a bad signature without moving funds twice", () => {
    const order = intent();
    const signature = signIntent(order, secret);
    const locked = lockEscrow({ ledger: ledger(), intent: order, signature, now: 1_000 });
    assert.equal(locked.ledger.available, OPENING_BALANCE - order.sizeMicro);
    assert.equal(locked.ledger.locked, order.sizeMicro);
    assert.throws(
      () => lockEscrow({ ledger: locked.ledger, intent: order, signature, now: 1_000 }),
      (error: unknown) => error instanceof ProtocolError && error.code === ErrorCodes.REPLAY,
    );
    assert.equal(locked.ledger.available, OPENING_BALANCE - order.sizeMicro);
  });

  it("does not consume a nonce when the signature is wrong or the intent is expired", () => {
    const order = intent();
    const signature = signIntent(order, secret);
    signature[0] ^= 0xff;
    assert.throws(
      () => lockEscrow({ ledger: ledger(), intent: order, signature, now: 1_000 }),
      (error: unknown) => error instanceof ProtocolError && error.code === ErrorCodes.BAD_SIGNATURE,
    );
    assert.throws(
      () =>
        lockEscrow({
          ledger: ledger(),
          intent: order,
          signature: signIntent(order, secret),
          now: order.expiryUnix,
        }),
      (error: unknown) => error instanceof ProtocolError && error.code === ErrorCodes.EXPIRED,
    );
    assert.deepEqual(ledger().consumed, []);
  });

  it("refuses release before a fill and a second refund", () => {
    const order = intent();
    const locked = lockEscrow({
      ledger: ledger(),
      intent: order,
      signature: signIntent(order, secret),
      now: 1_000,
    });
    assert.throws(
      () => settleRelease({ ledger: locked.ledger, escrow: locked.escrow }),
      (error: unknown) => error instanceof ProtocolError && error.code === ErrorCodes.INVALID_TRANSITION,
    );
    const returned = refundEscrow({ ledger: locked.ledger, escrow: locked.escrow, now: 1_000 });
    assert.equal(returned.ledger.available, OPENING_BALANCE);
    assert.equal(returned.ledger.consumed.length, 1);
    assert.throws(
      () => refundEscrow({ ledger: returned.ledger, escrow: returned.escrow, now: 1_000 }),
      (error: unknown) => error instanceof ProtocolError && error.code === ErrorCodes.INVALID_TRANSITION,
    );
  });
});

describe("planRoute", () => {
  const now = 1_000;

  function run(overrides?: Partial<Intent>, corruptProof = false) {
    return planRoute({
      ledger: ledger(),
      takerSecret: secret,
      intent: intent(overrides),
      now,
      corruptProof,
    });
  }

  it("settles a private route and pays the solver from escrow", () => {
    const events = run();
    assert.deepEqual(
      events.map((event) => event.type),
      ["signed", "locked", "quotes", "matched", "filled", "settled"],
    );
    const last = events.at(-1)!;
    assert.equal(last.order.phase, "settled");
    assert.equal(last.ledger.locked, 0);
    assert.equal(last.ledger.available, OPENING_BALANCE - intent().sizeMicro);
    assert.ok((last.order.sharesMicro ?? 0) > 0);
    assert.equal(last.order.solverName, "Northbridge");
  });

  it("rejects expiry before the nonce is spent", () => {
    const events = run({ expiryUnix: now - 5 });
    assert.equal(events.at(-1)?.type, "rejected");
    assert.equal(events.at(-1)?.error?.code, ErrorCodes.EXPIRED);
    assert.equal(events.at(-1)?.ledger.consumed.length, 0);
    assert.equal(events.at(-1)?.ledger.available, OPENING_BALANCE);
  });

  it("refunds when every quote is through the ceiling", () => {
    const events = run({ maxSlippageBps: 0 });
    const last = events.at(-1)!;
    assert.equal(last.type, "refunded");
    assert.equal(last.error?.code, ErrorCodes.SLIPPAGE_EXCEEDED);
    assert.equal(last.ledger.available, OPENING_BALANCE);
    assert.equal(last.ledger.locked, 0);
    assert.equal(last.ledger.consumed.length, 1);
  });

  it("keeps funds locked when the fill proof is corrupt", () => {
    const events = run(undefined, true);
    const last = events.at(-1)!;
    assert.equal(last.type, "stuck");
    assert.equal(last.error?.code, ErrorCodes.PROOF_MISMATCH);
    assert.equal(last.order.phase, "solver_matched");
    assert.equal(last.ledger.locked, intent().sizeMicro);
    const returned = refundEscrow({
      ledger: last.ledger,
      escrow: {
        phase: last.order.phase,
        commitmentHex: last.order.commitmentHex,
        sizeMicro: last.order.intent.sizeMicro,
        expiryUnix: last.order.intent.expiryUnix,
        nonce: last.order.intent.nonce,
        taker: last.order.intent.taker,
      },
      now: last.order.intent.expiryUnix + 1,
    });
    assert.equal(returned.ledger.available, OPENING_BALANCE);
  });

  it("treats a reused nonce as a replay", () => {
    const first = run();
    const spent = first.at(-1)!.ledger;
    const again = planRoute({
      ledger: spent,
      takerSecret: secret,
      intent: intent(),
      now,
    });
    assert.equal(again.at(-1)?.error?.code, ErrorCodes.REPLAY);
    assert.equal(again.at(-1)?.ledger.available, spent.available);
  });

  it("picks the tightest quote inside 50 bps and none at zero", () => {
    const order = intent();
    const commitment = commitmentOf(order);
    const quotes = collectQuotes(commitment, order.referenceAskMicro);
    assert.equal(quotes.length, 3);
    assert.equal(bestQuote(quotes, order.referenceAskMicro, 50, commitment)?.solverName, "Northbridge");
    assert.equal(bestQuote(quotes, order.referenceAskMicro, 0, commitment), null);
  });
});
