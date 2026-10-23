import { F as ed25519, I as sha256, L as bytesToHex, R as hexToBytes } from "../_libs/noble__curves+noble__hashes.mjs";
import { t as base58 } from "../_libs/scure__base.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-CamqHgVu.js
var ErrorCodes = {
	EXPIRED: "EXPIRED",
	REPLAY: "REPLAY",
	INVALID_TRANSITION: "INVALID_TRANSITION",
	SLIPPAGE_EXCEEDED: "SLIPPAGE_EXCEEDED",
	INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
	PROOF_MISMATCH: "PROOF_MISMATCH",
	BAD_SIGNATURE: "BAD_SIGNATURE",
	INTENT_INCOMPLETE: "INTENT_INCOMPLETE",
	ZERO_SIZE: "ZERO_SIZE",
	UNAUTHORIZED: "UNAUTHORIZED",
	WRONG_MINT: "WRONG_MINT",
	OVERFLOW: "OVERFLOW"
};
var ProtocolError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.name = "ProtocolError";
		this.code = code;
	}
};
function asProtocolError(error) {
	if (error instanceof ProtocolError) return error;
	if (error instanceof Error) return new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, error.message);
	return new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Unknown protocol failure");
}
var PROGRAM_ID = "Fp8YfZhD52nPSvagqpVD9gDwMvQ7d1a2K7JXkDL3HMUV";
var PAPER_SECRET_HEX = "69489837016c26e637c8c94a8eec4faa79a571dadc37d517746d186c37775485";
var INTENT_DOMAIN = "moxie.intent.v1";
var SOLVER_AUTH_DOMAIN = "moxie.solver-auth.v1";
var QUOTE_DOMAIN = "moxie.quote.v1";
var FILL_DOMAIN = "moxie.fill.v1";
var text = new TextEncoder();
function concatBytes(parts) {
	const len = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(len);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}
function u16le(value) {
	const bytes = /* @__PURE__ */ new Uint8Array(2);
	new DataView(bytes.buffer).setUint16(0, value, true);
	return bytes;
}
function u32le(value) {
	const bytes = /* @__PURE__ */ new Uint8Array(4);
	new DataView(bytes.buffer).setUint32(0, value, true);
	return bytes;
}
function u64le(value) {
	if (!Number.isSafeInteger(value) || value < 0) throw new ProtocolError(ErrorCodes.OVERFLOW, "Unsigned amount is out of range");
	const bytes = /* @__PURE__ */ new Uint8Array(8);
	new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
	return bytes;
}
function i64le(value) {
	if (!Number.isSafeInteger(value)) throw new ProtocolError(ErrorCodes.OVERFLOW, "Timestamp is out of range");
	const bytes = /* @__PURE__ */ new Uint8Array(8);
	new DataView(bytes.buffer).setBigInt64(0, BigInt(value), true);
	return bytes;
}
function strip0x(value) {
	return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}
function decodeHex(value, expected) {
	const hex = strip0x(value);
	if (hex.length % 2 !== 0 || expected !== void 0 && hex.length !== expected * 2) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Expected a fixed-width hex field");
	return hexToBytes(hex);
}
/**
* Canonical preimage. Must match `intent_commitment` in the Anchor program:
* domain || taker || nonce || size || expiry || u32le(market_len) || market ||
* outcome_token || slippage || polygon_recipient || reference_ask.
*/
function encodeIntent(intent) {
	const market = text.encode(intent.marketId);
	if (market.length === 0 || market.length > 64) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Market id must be 1–64 bytes");
	const token = decodeHex(intent.outcomeTokenId, 32);
	const recipient = decodeHex(intent.polygonRecipient, 20);
	const taker = base58.decode(intent.taker);
	if (taker.length !== 32) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Taker is not a Solana public key");
	if (!Number.isSafeInteger(intent.nonce) || intent.nonce < 0) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Nonce is missing");
	if (!Number.isSafeInteger(intent.maxSlippageBps) || intent.maxSlippageBps < 0 || intent.maxSlippageBps > 1e4) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Slippage must be between 0 and 10,000 bps");
	if (!Number.isSafeInteger(intent.referenceAskMicro) || intent.referenceAskMicro <= 0) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Reference ask is missing");
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
		u64le(intent.referenceAskMicro)
	]);
}
function commitmentOf(intent) {
	return sha256(encodeIntent(intent));
}
function signIntent(intent, secretKey) {
	return ed25519.sign(encodeIntent(intent), secretKey);
}
function verifyIntent(intent, signature) {
	const taker = base58.decode(intent.taker);
	return ed25519.verify(signature, encodeIntent(intent), taker);
}
function solverAuthMessage(commitment, solverPubkey) {
	return concatBytes([
		text.encode(SOLVER_AUTH_DOMAIN),
		commitment,
		solverPubkey
	]);
}
function quoteMessage(commitment, priceMicro, solverPubkey) {
	return concatBytes([
		text.encode(QUOTE_DOMAIN),
		commitment,
		u64le(priceMicro),
		solverPubkey
	]);
}
function fillMessage(proof) {
	return concatBytes([
		text.encode(FILL_DOMAIN),
		proof.commitment,
		proof.polygonTx,
		u64le(proof.fillMicro),
		u64le(proof.sharesMicro),
		u64le(proof.priceMicro),
		proof.solverPubkey
	]);
}
function publicKeyFromSecret(secretKey) {
	return ed25519.getPublicKey(secretKey);
}
function isOnCurve(bytes) {
	return ed25519.utils.isValidPublicKey(bytes);
}
/** Solana PDA: sha256(seeds || bump || program || "ProgramDerivedAddress") off-curve. */
function findProgramAddress(seeds, programId) {
	const marker = text.encode("ProgramDerivedAddress");
	for (let bump = 255; bump >= 0; bump -= 1) {
		const hash = sha256(concatBytes([
			...seeds,
			Uint8Array.of(bump),
			programId,
			marker
		]));
		if (!isOnCurve(hash)) return {
			address: hash,
			bump
		};
	}
	throw new ProtocolError(ErrorCodes.OVERFLOW, "No off-curve program address");
}
function escrowAddress(taker, nonce) {
	const found = findProgramAddress([
		text.encode("escrow"),
		taker,
		u64le(nonce)
	], base58.decode(PROGRAM_ID));
	return {
		address: base58.encode(found.address),
		bump: found.bump
	};
}
var OPENING_BALANCE = 25e9;
var MAX_TICKET = 5e9;
function formatUsdc(micro) {
	const sign = micro < 0 ? "-" : "";
	const abs = Math.abs(Math.trunc(micro));
	const whole = Math.floor(abs / 1e6);
	const frac = abs % 1e6;
	const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	if (frac === 0) return `${sign}${grouped}`;
	return `${sign}${grouped}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}
function formatCents(priceMicro) {
	return (priceMicro / 1e4).toFixed(1);
}
function money6(micro) {
	const abs = Math.abs(Math.trunc(micro));
	return `${Math.floor(abs / 1e6)}.${(abs % 1e6).toString().padStart(6, "0")}`;
}
function formatShares(sharesMicro) {
	const whole = Math.floor(sharesMicro / 1e6);
	const frac = Math.floor(sharesMicro % 1e6 / 1e4);
	return `${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac.toString().padStart(2, "0")}`;
}
function parseUsdc(text) {
	const trimmed = text.trim();
	if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
	const [whole, frac = ""] = trimmed.split(".");
	const micro = Number(whole) * 1e6 + Number(frac.padEnd(2, "0")) * 1e4;
	if (!Number.isSafeInteger(micro) || micro <= 0 || micro > 5e9) return null;
	return micro;
}
function shortKey(value, lead = 4, tail = 4) {
	if (value.length <= lead + tail + 1) return value;
	return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
function shortHex(value, lead = 6, tail = 4) {
	const hex = value.replace(/^0x/i, "");
	if (hex.length <= lead + tail + 1) return value;
	const body = `${hex.slice(0, lead)}…${hex.slice(-tail)}`;
	return value.startsWith("0x") || value.startsWith("0X") ? `0x${body}` : body;
}
function positionsOf(orders) {
	const map = /* @__PURE__ */ new Map();
	for (const order of orders) {
		if (order.phase !== "settled" || !order.sharesMicro || !order.fillMicro) continue;
		const key = order.intent.outcomeTokenId;
		const current = map.get(key);
		if (!current) map.set(key, {
			marketId: order.intent.marketId,
			side: order.intent.side,
			tokenId: order.intent.outcomeTokenId,
			sharesMicro: order.sharesMicro,
			costMicro: order.fillMicro
		});
		else {
			current.sharesMicro += order.sharesMicro;
			current.costMicro += order.fillMicro;
		}
	}
	return [...map.values()];
}
function nonceKey(taker, nonce) {
	return `${taker}:${nonce}`;
}
function assertSize(sizeMicro) {
	if (!Number.isSafeInteger(sizeMicro) || sizeMicro <= 0) throw new ProtocolError(ErrorCodes.ZERO_SIZE, "Size must be greater than zero");
}
function lockEscrow(input) {
	assertSize(input.intent.sizeMicro);
	encodeIntent(input.intent);
	if (input.intent.expiryUnix <= input.now) throw new ProtocolError(ErrorCodes.EXPIRED, "Intent expiry is not in the future");
	const key = nonceKey(input.intent.taker, input.intent.nonce);
	if (input.ledger.consumed.includes(key)) throw new ProtocolError(ErrorCodes.REPLAY, `Nonce ${input.intent.nonce} was already consumed for this Solana key`);
	if (!verifyIntent(input.intent, input.signature)) throw new ProtocolError(ErrorCodes.BAD_SIGNATURE, "Ed25519 signature does not cover the canonical intent");
	if (input.ledger.available < input.intent.sizeMicro) throw new ProtocolError(ErrorCodes.INSUFFICIENT_BALANCE, "Free USDC is below the ticket size");
	const commitmentHex = bytesToHex(commitmentOf(input.intent));
	return {
		ledger: {
			available: input.ledger.available - input.intent.sizeMicro,
			locked: input.ledger.locked + input.intent.sizeMicro,
			consumed: [...input.ledger.consumed, key]
		},
		commitmentHex,
		escrow: {
			phase: "escrow_locked",
			commitmentHex,
			sizeMicro: input.intent.sizeMicro,
			expiryUnix: input.intent.expiryUnix,
			nonce: input.intent.nonce,
			taker: input.intent.taker
		}
	};
}
function matchSolver(input) {
	if (input.escrow.phase !== "escrow_locked") throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, "Solver match requires a locked escrow");
	if (input.now >= input.escrow.expiryUnix) throw new ProtocolError(ErrorCodes.EXPIRED, "Escrow expired before a solver was bound");
	if (input.solverPubkey.length !== 32) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Solver key is missing");
	const commitment = hexToBytes(input.escrow.commitmentHex);
	const taker = base58.decode(input.intent.taker);
	const message = solverAuthMessage(commitment, input.solverPubkey);
	if (!ed25519.verify(input.solverAuthSignature, message, taker)) throw new ProtocolError(ErrorCodes.BAD_SIGNATURE, "Taker did not authorize this solver");
	return {
		...input.escrow,
		phase: "solver_matched",
		solverPubkey: base58.encode(input.solverPubkey)
	};
}
function maxPrice(referenceAskMicro, slippageBps) {
	const price = BigInt(referenceAskMicro) * BigInt(1e4 + slippageBps) / 10000n;
	if (price > BigInt(Number.MAX_SAFE_INTEGER)) throw new ProtocolError(ErrorCodes.OVERFLOW, "Ceiling overflowed");
	return Number(price);
}
function sharesFor(fillMicro, priceMicro) {
	if (priceMicro <= 0) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Fill price is missing");
	const shares = BigInt(fillMicro) * 1000000n / BigInt(priceMicro);
	if (shares <= 0n || shares > BigInt(Number.MAX_SAFE_INTEGER)) throw new ProtocolError(ErrorCodes.OVERFLOW, "Share amount is out of range");
	return Number(shares);
}
function recordFill(input) {
	if (input.escrow.phase !== "solver_matched" || !input.escrow.solverPubkey) throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, "CLOB fill requires a matched solver");
	if (input.now >= input.escrow.expiryUnix) throw new ProtocolError(ErrorCodes.EXPIRED, "Escrow expired before the fill was recorded");
	if (input.proof.solverPubkey !== input.escrow.solverPubkey) throw new ProtocolError(ErrorCodes.UNAUTHORIZED, "Fill is not signed by the matched solver");
	if (input.proof.commitmentHex !== input.escrow.commitmentHex) throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Fill commitment does not match the escrow");
	const commitment = hexToBytes(input.escrow.commitmentHex);
	if (bytesToHex(commitmentOf(input.intent)) !== input.escrow.commitmentHex) throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Revealed intent does not match the lock commitment");
	if (input.proof.fillMicro <= 0 || input.proof.fillMicro > input.escrow.sizeMicro) throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Fill size is outside the locked amount");
	const expectedShares = sharesFor(input.proof.fillMicro, input.proof.priceMicro);
	if (input.proof.sharesMicro !== expectedShares) throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Share count does not match the fill price");
	const ceiling = maxPrice(input.intent.referenceAskMicro, input.intent.maxSlippageBps);
	if (input.proof.priceMicro > ceiling) throw new ProtocolError(ErrorCodes.SLIPPAGE_EXCEEDED, "Fill price is through the taker's ceiling");
	const polygonTx = decodeHex(input.proof.polygonTxHex, 32);
	if (polygonTx.every((byte) => byte === 0)) throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Polygon transaction id is empty");
	const message = fillMessage({
		commitment,
		polygonTx,
		fillMicro: input.proof.fillMicro,
		sharesMicro: input.proof.sharesMicro,
		priceMicro: input.proof.priceMicro,
		solverPubkey: base58.decode(input.proof.solverPubkey)
	});
	let signature;
	try {
		signature = hexToBytes(input.proof.signatureHex);
	} catch {
		throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Fill signature is malformed");
	}
	const solver = base58.decode(input.escrow.solverPubkey);
	if (signature.length !== 64 || !ed25519.verify(signature, message, solver)) throw new ProtocolError(ErrorCodes.PROOF_MISMATCH, "Solver fill signature does not verify");
	return {
		...input.escrow,
		phase: "clob_filled",
		fillMicro: input.proof.fillMicro,
		sharesMicro: input.proof.sharesMicro,
		quotePriceMicro: input.proof.priceMicro
	};
}
function settleRelease(input) {
	if (input.escrow.phase !== "clob_filled" || input.escrow.fillMicro === void 0) throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, "Release requires a recorded CLOB fill");
	const remainder = input.escrow.sizeMicro - input.escrow.fillMicro;
	if (remainder < 0 || input.ledger.locked < input.escrow.sizeMicro) throw new ProtocolError(ErrorCodes.OVERFLOW, "Locked balance does not cover release");
	return {
		ledger: {
			available: input.ledger.available + remainder,
			locked: input.ledger.locked - input.escrow.sizeMicro,
			consumed: input.ledger.consumed
		},
		escrow: {
			...input.escrow,
			phase: "settled"
		}
	};
}
function refundEscrow(input) {
	const { escrow } = input;
	if (!(escrow.phase === "escrow_locked" || escrow.phase === "solver_matched" && input.now >= escrow.expiryUnix)) throw new ProtocolError(ErrorCodes.INVALID_TRANSITION, escrow.phase === "solver_matched" ? "A matched escrow can only be refunded after expiry" : "This phase cannot return the vault");
	if (input.ledger.locked < escrow.sizeMicro) throw new ProtocolError(ErrorCodes.OVERFLOW, "Locked balance does not cover the refund");
	return {
		ledger: {
			available: input.ledger.available + escrow.sizeMicro,
			locked: input.ledger.locked - escrow.sizeMicro,
			consumed: input.ledger.consumed
		},
		escrow: {
			...escrow,
			phase: "refunded"
		}
	};
}
function outcomeTokenId(marketId, side) {
	const digest = sha256(new TextEncoder().encode(`moxie.ctf.v1|${marketId}|${side}`));
	return `0x${bytesToHex(digest)}`;
}
var MARKETS = [
	{
		id: "house-2026",
		question: "Will Republicans hold the House after the 2026 midterms?",
		venue: "Congress",
		resolves: "Nov 4",
		volume: "$41.2m",
		yesAskMicro: 57e4
	},
	{
		id: "fed-dec-2026",
		question: "Will the Fed cut the funds rate in December 2026?",
		venue: "Rates",
		resolves: "Dec 16",
		volume: "$18.4m",
		yesAskMicro: 64e4
	},
	{
		id: "btc-150k-2026",
		question: "Will Bitcoin trade above $150,000 before 2027?",
		venue: "Crypto",
		resolves: "Dec 31",
		volume: "$9.7m",
		yesAskMicro: 41e4
	},
	{
		id: "spacex-list-2026",
		question: "Will SpaceX price a public listing in 2026?",
		venue: "Listings",
		resolves: "Dec 31",
		volume: "$6.1m",
		yesAskMicro: 23e4
	},
	{
		id: "nber-2026",
		question: "Will the NBER date a US recession starting in 2026?",
		venue: "Macro",
		resolves: "Dec 31",
		volume: "$3.4m",
		yesAskMicro: 18e4
	}
];
function complementAsk(yesAskMicro) {
	return 102e4 - yesAskMicro;
}
function identity(secretHex) {
	return {
		secretKeyHex: secretHex,
		publicKeyB58: base58.encode(publicKeyFromSecret(hexToBytes(secretHex)))
	};
}
var paper = identity(PAPER_SECRET_HEX);
function upsert(orders, order) {
	return [order, ...orders.filter((item) => item.id !== order.id)].slice(0, 30);
}
var useDesk = create()(persist((set, get) => ({
	...paper,
	available: OPENING_BALANCE,
	locked: 0,
	nextNonce: 0,
	consumed: [],
	orders: [],
	pinnedId: null,
	connected: false,
	connectLabel: null,
	connect: (label) => set({
		connected: true,
		connectLabel: label
	}),
	disconnect: () => set({
		connected: false,
		connectLabel: null
	}),
	ledger: () => {
		const state = get();
		return {
			available: state.available,
			locked: state.locked,
			consumed: state.consumed
		};
	},
	apply: (event) => {
		set((state) => ({
			available: event.ledger.available,
			locked: event.ledger.locked,
			consumed: event.ledger.consumed,
			nextNonce: event.type === "locked" ? Math.max(state.nextNonce, event.order.intent.nonce + 1) : state.nextNonce,
			orders: upsert(state.orders, event.order),
			pinnedId: event.order.id
		}));
	},
	refundOrder: (id, now) => {
		const state = get();
		const order = state.orders.find((item) => item.id === id);
		if (!order) return;
		try {
			const result = refundEscrow({
				ledger: {
					available: state.available,
					locked: state.locked,
					consumed: state.consumed
				},
				escrow: {
					phase: order.phase,
					commitmentHex: order.commitmentHex,
					sizeMicro: order.intent.sizeMicro,
					expiryUnix: order.intent.expiryUnix,
					nonce: order.intent.nonce,
					taker: order.intent.taker,
					solverPubkey: order.solverPubkey,
					fillMicro: order.fillMicro,
					sharesMicro: order.sharesMicro
				},
				now
			});
			const pastExpiry = order.phase === "solver_matched";
			const next = {
				...order,
				phase: "refunded",
				error: void 0,
				logs: [...order.logs, {
					title: "Refunded",
					detail: pastExpiry ? "Clock moved past expiry. The vault returned the USDC. The nonce stays spent." : "Lock cancelled before a solver was bound. The nonce stays spent."
				}]
			};
			set({
				available: result.ledger.available,
				locked: result.ledger.locked,
				consumed: result.ledger.consumed,
				orders: upsert(state.orders, next),
				pinnedId: id
			});
		} catch (error) {
			const protocol = asProtocolError(error);
			set({
				orders: upsert(state.orders, {
					...order,
					error: {
						code: protocol.code,
						message: protocol.message
					},
					logs: [...order.logs, {
						title: "Refund refused",
						detail: protocol.message
					}]
				}),
				pinnedId: id
			});
		}
	},
	resetBook: () => {
		set({
			available: OPENING_BALANCE,
			locked: 0,
			nextNonce: 0,
			consumed: [],
			orders: [],
			pinnedId: null
		});
	},
	rotateKey: () => {
		const secret = ed25519.utils.randomSecretKey();
		set({
			...identity(bytesToHex(secret)),
			available: OPENING_BALANCE,
			locked: 0,
			nextNonce: 0,
			consumed: [],
			orders: [],
			pinnedId: null
		});
	}
}), {
	name: "moxie-desk-v2",
	skipHydration: true,
	partialize: (state) => ({
		secretKeyHex: state.secretKeyHex,
		publicKeyB58: state.publicKeyB58,
		available: state.available,
		locked: state.locked,
		nextNonce: state.nextNonce,
		consumed: state.consumed,
		orders: state.orders,
		pinnedId: state.pinnedId,
		connected: state.connected,
		connectLabel: state.connectLabel
	})
}));
//#endregion
export { solverAuthMessage as A, recordFill as C, shortHex as D, sharesFor as E, shortKey as O, quoteMessage as S, settleRelease as T, money6 as _, asProtocolError as a, positionsOf as b, encodeIntent as c, formatCents as d, formatShares as f, maxPrice as g, matchSolver as h, ProtocolError as i, useDesk as j, signIntent as k, escrowAddress as l, lockEscrow as m, MARKETS as n, commitmentOf as o, formatUsdc as p, MAX_TICKET as r, complementAsk as s, ErrorCodes as t, fillMessage as u, outcomeTokenId as v, refundEscrow as w, publicKeyFromSecret as x, parseUsdc as y };
