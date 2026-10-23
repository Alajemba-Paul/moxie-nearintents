import { o as __toESM } from "../_runtime.mjs";
import { J as require_react, W as isRedirect, b as useRouter, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { r as Settings, t as X } from "../_libs/lucide-react.mjs";
import { i as SOLANA_ESCROW_PROGRAM_ID, r as SOLANA_DEVNET_RPC, t as DEVNET_USDC_MINT } from "./constants-C-g3w5gT.mjs";
import { I as sha256, L as bytesToHex, R as hexToBytes, y as ed25519 } from "../_libs/noble__curves+noble__hashes.mjs";
import { n as motion, r as AnimatePresence, t as useReducedMotion } from "../_libs/framer-motion+[...].mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { i as toUtf8Bytes, n as getAddress, r as keccak256 } from "../_libs/ethers+ws.mjs";
import { t as base58 } from "../_libs/scure__base.mjs";
import { a as TransactionInstruction, i as Transaction, n as PublicKey, r as SystemProgram, t as Connection } from "../_libs/@solana/web3.js.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BCsYm5n0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
/**
* Derives a deterministic EVM address on Polygon Amoy
* from the user's Solana public key using the NEAR MPC derivation path standard.
*/
function derivePolygonAddress(solanaPubkey, nearContractId = "v1.signer-prod.testnet") {
	const combinedSeed = `${nearContractId},${`moxie-intents,${solanaPubkey}`}`;
	const hash = keccak256(toUtf8Bytes(combinedSeed));
	return getAddress("0x" + hash.slice(-40));
}
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
var PROGRAM_ID$1 = "Fp8YfZhD52nPSvagqpVD9gDwMvQ7d1a2K7JXkDL3HMUV";
var PAPER_SECRET_HEX = "69489837016c26e637c8c94a8eec4faa79a571dadc37d517746d186c37775485";
var INTENT_DOMAIN = "moxie.intent.v1";
var SOLVER_AUTH_DOMAIN = "moxie.solver-auth.v1";
var QUOTE_DOMAIN = "moxie.quote.v1";
var FILL_DOMAIN = "moxie.fill.v1";
var text$1 = new TextEncoder();
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
	const market = text$1.encode(intent.marketId);
	if (market.length === 0 || market.length > 64) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Market id must be 1–64 bytes");
	const token = decodeHex(intent.outcomeTokenId, 32);
	const recipient = decodeHex(intent.polygonRecipient, 20);
	const taker = base58.decode(intent.taker);
	if (taker.length !== 32) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Taker is not a Solana public key");
	if (!Number.isSafeInteger(intent.nonce) || intent.nonce < 0) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Nonce is missing");
	if (!Number.isSafeInteger(intent.maxSlippageBps) || intent.maxSlippageBps < 0 || intent.maxSlippageBps > 1e4) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Slippage must be between 0 and 10,000 bps");
	if (!Number.isSafeInteger(intent.referenceAskMicro) || intent.referenceAskMicro <= 0) throw new ProtocolError(ErrorCodes.INTENT_INCOMPLETE, "Reference ask is missing");
	return concatBytes([
		text$1.encode(INTENT_DOMAIN),
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
		text$1.encode(SOLVER_AUTH_DOMAIN),
		commitment,
		solverPubkey
	]);
}
function quoteMessage(commitment, priceMicro, solverPubkey) {
	return concatBytes([
		text$1.encode(QUOTE_DOMAIN),
		commitment,
		u64le(priceMicro),
		solverPubkey
	]);
}
function fillMessage(proof) {
	return concatBytes([
		text$1.encode(FILL_DOMAIN),
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
	const marker = text$1.encode("ProgramDerivedAddress");
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
		text$1.encode("escrow"),
		taker,
		u64le(nonce)
	], base58.decode(PROGRAM_ID$1));
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
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var INTENT_STATUSES = [
	"PENDING_ESCROW",
	"ESCROW_LOCKED",
	"SOLVER_BIDDING",
	"CLOB_SUBMITTED",
	"SETTLED",
	"REFUNDED",
	"EXPIRED"
];
function okSignature(value) {
	return /^[0-9a-f]{64,256}$/i.test(value) || /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(value);
}
function assertSave(input) {
	if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("bad id");
	if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.userSolanaPubkey)) throw new Error("bad key");
	if (!/^0x[0-9a-fA-F]{40}$/.test(input.derivedPolygonAddress)) throw new Error("bad polygon address");
	if (!/^0x[0-9a-fA-F]{64}$/.test(input.marketConditionId)) throw new Error("bad market");
	if (input.outcomeIndex !== 0 && input.outcomeIndex !== 1) throw new Error("bad outcome");
	if (!/^\d{1,12}\.\d{6}$/.test(input.usdcAmountIn)) throw new Error("bad amount");
	if (!/^\d{1,12}\.\d{6}$/.test(input.minSharesOut)) throw new Error("bad shares");
	if (input.solanaEscrowPda && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.solanaEscrowPda)) throw new Error("bad pda");
	if (input.polygonOrderHash && !/^0x[0-9a-fA-F]{64}$/.test(input.polygonOrderHash)) throw new Error("bad fill hash");
	if (input.nearMpcSignature && !okSignature(input.nearMpcSignature)) throw new Error("bad signature");
	if (!INTENT_STATUSES.includes(input.status)) throw new Error("bad status");
	if (Number.isNaN(Date.parse(input.expiryTimestamp))) throw new Error("bad expiry");
	if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) throw new Error("bad nonce");
	return input;
}
var saveIntent = createServerFn({ method: "POST" }).validator(assertSave).handler(createSsrRpc("4171eb3af87777ea8da45346db515e8da1f783eb714190edc94b99627465be45"));
var listIntents = createServerFn({ method: "GET" }).validator((pubkey) => {
	if (typeof pubkey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) throw new Error("bad key");
	return pubkey;
}).handler(createSsrRpc("fff1395232e8903f4a50b2aaea3d494ba3acc1139b862d32066e38c9da373fb2"));
var stepSolver = createServerFn({ method: "POST" }).validator((id) => {
	if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("bad id");
	return id;
}).handler(createSsrRpc("11f195d7f2d0fe5b71a98dfff85b6ad125f398a9d4b01f1972baf81163ce55ef"));
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
var text = new TextEncoder();
function solverKey(name, edgeBps) {
	const secret = sha256(text.encode(`moxie.solver.v1|${name}`));
	return {
		name,
		edgeBps,
		secret,
		pubkey: ed25519.getPublicKey(secret)
	};
}
var SOLVER_KEYS = [
	solverKey("Northbridge", 12),
	solverKey("Quiet Lot", 28),
	solverKey("Harbor", 70)
];
SOLVER_KEYS.map((solver) => solver.name);
function collectQuotes(commitment, referenceAskMicro) {
	return SOLVER_KEYS.map((solver) => {
		const priceMicro = Number(BigInt(referenceAskMicro) * BigInt(1e4 + solver.edgeBps) / 10000n);
		const signature = ed25519.sign(quoteMessage(commitment, priceMicro, solver.pubkey), solver.secret);
		return {
			solverName: solver.name,
			solverPubkey: base58.encode(solver.pubkey),
			priceMicro,
			edgeBps: solver.edgeBps,
			signatureHex: bytesToHex(signature)
		};
	});
}
function quoteVerified(quote, commitment) {
	try {
		const pubkey = base58.decode(quote.solverPubkey);
		return ed25519.verify(hexToSignature(quote.signatureHex), quoteMessage(commitment, quote.priceMicro, pubkey), pubkey);
	} catch {
		return false;
	}
}
function hexToSignature(hex) {
	if (!/^[0-9a-f]+$/i.test(hex) || hex.length !== 128) throw new ProtocolError(ErrorCodes.BAD_SIGNATURE, "Quote signature is malformed");
	const out = /* @__PURE__ */ new Uint8Array(64);
	for (let i = 0; i < 64; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}
function bestQuote(quotes, referenceAskMicro, slippageBps, commitment) {
	const ceiling = maxPrice(referenceAskMicro, slippageBps);
	return quotes.filter((quote) => quote.priceMicro <= ceiling && quoteVerified(quote, commitment)).sort((a, b) => a.priceMicro - b.priceMicro)[0] ?? null;
}
function buildFillProof(input) {
	const solver = SOLVER_KEYS.find((key) => base58.encode(key.pubkey) === input.solverPubkey);
	if (!solver) throw new ProtocolError(ErrorCodes.UNAUTHORIZED, "Unknown solver");
	const sharesMicro = sharesFor(input.fillMicro, input.priceMicro);
	const polygonTx = sha256(concatTx(input.commitment, solver.pubkey));
	const signature = ed25519.sign(fillMessage({
		commitment: input.commitment,
		polygonTx,
		fillMicro: input.fillMicro,
		sharesMicro,
		priceMicro: input.priceMicro,
		solverPubkey: solver.pubkey
	}), solver.secret);
	return {
		commitmentHex: bytesToHex(input.commitment),
		polygonTxHex: bytesToHex(polygonTx),
		fillMicro: input.fillMicro,
		sharesMicro,
		priceMicro: input.priceMicro,
		solverPubkey: input.solverPubkey,
		signatureHex: bytesToHex(signature)
	};
}
function concatTx(commitment, solver) {
	const out = new Uint8Array(text.encode("moxie.polygon-tx.v1").length + commitment.length + solver.length);
	const prefix = text.encode("moxie.polygon-tx.v1");
	out.set(prefix, 0);
	out.set(commitment, prefix.length);
	out.set(solver, prefix.length + commitment.length);
	return out;
}
function corruptProof(proof) {
	const hex = proof.signatureHex;
	const flipped = hex.slice(0, -1) + (hex.endsWith("0") ? "1" : "0");
	return {
		...proof,
		signatureHex: flipped
	};
}
function errorOf(error) {
	return {
		code: error.code,
		message: error.message
	};
}
function blankOrder(intent, signature, commitmentHex, now) {
	return {
		id: `${commitmentHex.slice(0, 12)}-${intent.nonce}`,
		intent,
		signatureHex: bytesToHex(signature),
		commitmentHex,
		phase: "intent_signed",
		quotes: [],
		logs: [],
		createdAt: now
	};
}
function withLog(order, title, detail) {
	return {
		...order,
		logs: [...order.logs, {
			title,
			detail
		}]
	};
}
function planRoute(input) {
	const events = [];
	let ledger = {
		available: input.ledger.available,
		locked: input.ledger.locked,
		consumed: [...input.ledger.consumed]
	};
	const pubkey = publicKeyFromSecret(input.takerSecret);
	const taker = base58.encode(pubkey);
	if (input.intent.taker !== taker) {
		const order = withLog({
			...blankOrder(input.intent, /* @__PURE__ */ new Uint8Array(64), "00".repeat(32), input.now),
			phase: "rejected",
			error: {
				code: ErrorCodes.UNAUTHORIZED,
				message: "Intent taker does not match the signing key"
			}
		}, "Rejected", "The Solana key that signed is not the taker on the intent.");
		events.push({
			type: "rejected",
			order,
			ledger,
			error: order.error
		});
		return events;
	}
	let signature;
	let commitment;
	try {
		encodeIntent(input.intent);
		signature = signIntent(input.intent, input.takerSecret);
		commitment = commitmentOf(input.intent);
	} catch (error) {
		const protocol = asProtocolError(error);
		const order = withLog({
			...blankOrder(input.intent, /* @__PURE__ */ new Uint8Array(64), "00".repeat(32), input.now),
			phase: "rejected",
			error: errorOf(protocol)
		}, "Rejected", protocol.message);
		events.push({
			type: "rejected",
			order,
			ledger,
			error: order.error
		});
		return events;
	}
	const commitmentHex = bytesToHex(commitment);
	let order = withLog(blankOrder(input.intent, signature, commitmentHex, input.now), "Intent signed", "Ed25519 over the canonical preimage. The market id is not in the Solana instruction.");
	events.push({
		type: "signed",
		order,
		ledger
	});
	let escrow;
	try {
		const locked = lockEscrow({
			ledger,
			intent: input.intent,
			signature,
			now: input.now
		});
		ledger = locked.ledger;
		escrow = locked.escrow;
		order = withLog({
			...order,
			phase: "escrow_locked"
		}, "Escrow locked", `Nonce ${input.intent.nonce} is spent. The vault holds the USDC against commitment ${commitmentHex.slice(0, 8)}.`);
		events.push({
			type: "locked",
			order,
			ledger
		});
	} catch (error) {
		const protocol = asProtocolError(error);
		order = withLog({
			...order,
			phase: "rejected",
			error: errorOf(protocol)
		}, "Rejected", protocol.message);
		events.push({
			type: "rejected",
			order,
			ledger,
			error: order.error
		});
		return events;
	}
	const quotes = collectQuotes(commitment, input.intent.referenceAskMicro);
	order = withLog({
		...order,
		quotes
	}, "Solver bus", "Quotes arrived on the private bus. Nothing about the market was written to the Solana mempool.");
	events.push({
		type: "quotes",
		order,
		ledger
	});
	const chosen = bestQuote(quotes, input.intent.referenceAskMicro, input.intent.maxSlippageBps, commitment);
	if (!chosen) {
		const returned = refundEscrow({
			ledger,
			escrow,
			now: input.now
		});
		ledger = returned.ledger;
		escrow = returned.escrow;
		const slip = new ProtocolError(ErrorCodes.SLIPPAGE_EXCEEDED, "Every solver quote was through the maximum slippage");
		order = withLog({
			...order,
			phase: "refunded",
			error: errorOf(slip)
		}, "Refunded", "No quote cleared the ceiling, so the vault returned the USDC. The nonce stays spent.");
		events.push({
			type: "refunded",
			order,
			ledger,
			error: order.error
		});
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
			now: input.now
		});
	} catch (error) {
		const protocol = asProtocolError(error);
		order = withLog({
			...order,
			phase: escrow.phase,
			error: errorOf(protocol)
		}, "Match failed", protocol.message);
		events.push({
			type: "stuck",
			order,
			ledger,
			error: order.error
		});
		return events;
	}
	order = withLog({
		...order,
		phase: "solver_matched",
		solverName: chosen.solverName,
		solverPubkey: chosen.solverPubkey
	}, "Solver matched", `${chosen.solverName} is bound. The taker signature names that key and no other.`);
	events.push({
		type: "matched",
		order,
		ledger
	});
	let proof = buildFillProof({
		commitment,
		solverPubkey: chosen.solverPubkey,
		priceMicro: chosen.priceMicro,
		fillMicro: input.intent.sizeMicro
	});
	if (input.corruptProof) proof = corruptProof(proof);
	try {
		escrow = recordFill({
			escrow,
			intent: input.intent,
			proof,
			now: input.now
		});
	} catch (error) {
		const protocol = asProtocolError(error);
		order = withLog({
			...order,
			phase: "solver_matched",
			error: errorOf(protocol)
		}, "Fill rejected", `${protocol.message} Funds stay in the vault until expiry, then a refund is allowed.`);
		events.push({
			type: "stuck",
			order,
			ledger,
			error: order.error
		});
		return events;
	}
	order = withLog({
		...order,
		phase: "clob_filled",
		polygonTxHex: proof.polygonTxHex,
		sharesMicro: proof.sharesMicro,
		fillMicro: proof.fillMicro,
		error: void 0
	}, "CLOB fill", "Outcome tokens were bought on Polygon for the chain-sig address. The vault has not moved yet.");
	events.push({
		type: "filled",
		order,
		ledger
	});
	ledger = settleRelease({
		ledger,
		escrow
	}).ledger;
	order = withLog({
		...order,
		phase: "settled"
	}, "Settlement release", "The solver was paid from the vault. Unspent USDC, if any, is back on the free balance.");
	events.push({
		type: "settled",
		order,
		ledger
	});
	return events;
}
var TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
var PROGRAM_ID = new PublicKey(SOLANA_ESCROW_PROGRAM_ID);
var MINT = new PublicKey(DEVNET_USDC_MINT);
/** Confirmed on Devnet: seeds `["escrow", maker]` and `["vault", escrow]`. */
function escrowPda(maker) {
	return PublicKey.findProgramAddressSync([Buffer.from("escrow"), maker.toBuffer()], PROGRAM_ID)[0];
}
function vaultPda(escrow) {
	return PublicKey.findProgramAddressSync([Buffer.from("vault"), escrow.toBuffer()], PROGRAM_ID)[0];
}
function makerTokenAccount(maker) {
	const associated = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
	return PublicKey.findProgramAddressSync([
		maker.toBuffer(),
		TOKEN_PROGRAM_ID.toBuffer(),
		MINT.toBuffer()
	], associated)[0];
}
function instructionData(amount, intentHash, timeout) {
	if (intentHash.length !== 32) throw new Error("Intent hash must be 32 bytes");
	const disc = Buffer.from(sha256(new TextEncoder().encode("global:initialize_intent"))).subarray(0, 8);
	const data = Buffer.alloc(56);
	disc.copy(data, 0);
	data.writeBigUInt64LE(amount, 8);
	Buffer.from(intentHash).copy(data, 16);
	data.writeBigInt64LE(timeout, 48);
	return data;
}
function initializeIntentTransaction(input) {
	const escrow = escrowPda(input.maker);
	const vault = vaultPda(escrow);
	const ix = new TransactionInstruction({
		programId: PROGRAM_ID,
		keys: [
			{
				pubkey: input.maker,
				isSigner: true,
				isWritable: true
			},
			{
				pubkey: escrow,
				isSigner: false,
				isWritable: true
			},
			{
				pubkey: makerTokenAccount(input.maker),
				isSigner: false,
				isWritable: true
			},
			{
				pubkey: vault,
				isSigner: false,
				isWritable: true
			},
			{
				pubkey: MINT,
				isSigner: false,
				isWritable: false
			},
			{
				pubkey: TOKEN_PROGRAM_ID,
				isSigner: false,
				isWritable: false
			},
			{
				pubkey: SystemProgram.programId,
				isSigner: false,
				isWritable: false
			}
		],
		data: instructionData(input.amount, input.intentHash, input.timeout)
	});
	return {
		transaction: new Transaction({
			feePayer: input.maker,
			recentBlockhash: input.blockhash
		}).add(ix),
		escrow,
		vault
	};
}
function logMessage(logs) {
	return (logs?.find((item) => item.includes("Error Message:")))?.split("Error Message:")[1]?.trim() || null;
}
async function lockDevnetIntent(input) {
	if (!input.provider.signTransaction) throw new Error("This wallet cannot sign a Solana transaction.");
	const connection = new Connection(SOLANA_DEVNET_RPC, "confirmed");
	const maker = new PublicKey(input.publicKey);
	const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
	const built = initializeIntentTransaction({
		maker,
		amount: input.amount,
		intentHash: input.intentHash,
		timeout: input.timeout,
		blockhash
	});
	const raw = built.transaction.serialize({
		requireAllSignatures: false,
		verifySignatures: false
	});
	const preview = await (await fetch(SOLANA_DEVNET_RPC, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "simulateTransaction",
			params: [Buffer.from(raw).toString("base64"), {
				encoding: "base64",
				sigVerify: false,
				replaceRecentBlockhash: true
			}]
		})
	})).json();
	if (preview.error?.message) throw new Error(preview.error.message);
	if (preview.result?.value?.err) throw new Error(logMessage(preview.result.value.logs) ?? "Devnet rejected the lock before signing.");
	const signed = await input.provider.signTransaction(built.transaction);
	const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
	await connection.confirmTransaction({
		signature,
		blockhash,
		lastValidBlockHeight
	}, "confirmed");
	return {
		signature,
		escrowPda: built.escrow.toBase58()
	};
}
function devnetConnection() {
	return new Connection(SOLANA_DEVNET_RPC, "confirmed");
}
function injectedProvider(which) {
	const host = window;
	if (which === "Phantom") return host.phantom?.solana ?? (host.solana?.isPhantom ? host.solana : null);
	return host.solflare ?? (host.solana?.isSolflare ? host.solana : null);
}
async function readDevnetBalance(owner) {
	const connection = devnetConnection();
	const mint = new PublicKey(DEVNET_USDC_MINT);
	const info = (await connection.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint })).value[0]?.account.data.parsed.info.tokenAmount;
	if (!info) {
		const mintInfo = await connection.getParsedAccountInfo(mint);
		return {
			amount: 0n,
			decimals: mintInfo.value && "parsed" in mintInfo.value.data ? Number(mintInfo.value.data.parsed.info.decimals) : 9
		};
	}
	return {
		amount: BigInt(info.amount),
		decimals: info.decimals
	};
}
function formatToken(amount, decimals) {
	const scale = 10n ** BigInt(decimals);
	const whole = amount / scale;
	const frac = amount % scale;
	const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	if (frac === 0n) return grouped;
	return `${grouped}.${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}
var ctx = null;
function context() {
	if (typeof window === "undefined") return null;
	const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
	if (!AudioCtx) return null;
	ctx ??= new AudioCtx();
	if (ctx.state === "suspended") ctx.resume();
	return ctx;
}
function blip(freq, dur, type, gainValue) {
	const audio = context();
	if (!audio) return;
	const osc = audio.createOscillator();
	const gain = audio.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, audio.currentTime);
	gain.gain.setValueAtTime(1e-4, audio.currentTime);
	gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + .015);
	gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + dur);
	osc.connect(gain);
	gain.connect(audio.destination);
	osc.start();
	osc.stop(audio.currentTime + dur + .02);
}
var sfx = {
	tap() {
		blip(880, .06, "square", .04);
	},
	lock() {
		blip(180, .12, "sine", .07);
		blip(320, .08, "triangle", .04);
	},
	bought() {
		blip(523, .08, "triangle", .05);
		window.setTimeout(() => blip(784, .12, "triangle", .05), 70);
	},
	nope() {
		blip(140, .16, "sawtooth", .03);
	}
};
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
var CONNECTS = [
	"Phantom",
	"Solflare",
	"Google",
	"X",
	"Discord"
];
var DRILLS = [
	{
		id: "route",
		label: "Normal"
	},
	{
		id: "expire",
		label: "Expired"
	},
	{
		id: "replay",
		label: "Reuse ticket"
	},
	{
		id: "slip",
		label: "No wiggle"
	},
	{
		id: "badproof",
		label: "Break fill"
	}
];
var TRACK = [
	{
		title: "Locking USDC on Solana",
		hint: "Held until the bet fills or you cancel."
	},
	{
		title: "Matching via NEAR solvers",
		hint: "Solvers compete off the public book."
	},
	{
		title: "Filling on Polymarket",
		hint: "The position lands on your Polygon address. You don't hold gas."
	}
];
function initialBooks() {
	return Object.fromEntries(MARKETS.map((market) => [market.id, {
		yes: market.yesAskMicro,
		no: complementAsk(market.yesAskMicro)
	}]));
}
function hexToSecret(hex) {
	const out = new Uint8Array(hex.length / 2);
	for (let index = 0; index < out.length; index += 1) out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
	return out;
}
function wait(ms, reduce) {
	return new Promise((resolve) => {
		window.setTimeout(resolve, reduce ? 0 : ms);
	});
}
function pct(micro) {
	return (micro / 1e4).toFixed(0);
}
function dbStatus(order) {
	if (order.phase === "rejected") return order.error?.code === "EXPIRED" ? "EXPIRED" : null;
	if (order.phase === "intent_signed") return "PENDING_ESCROW";
	if (order.phase === "escrow_locked") return "ESCROW_LOCKED";
	if (order.phase === "solver_matched") return "SOLVER_BIDDING";
	if (order.phase === "clob_filled") return "CLOB_SUBMITTED";
	if (order.phase === "settled") return "SETTLED";
	if (order.phase === "refunded") return "REFUNDED";
	return null;
}
function chainPhase(status) {
	if (status === "SOLVER_BIDDING") return "solver_matched";
	if (status === "CLOB_SUBMITTED") return "clob_filled";
	if (status === "SETTLED") return "settled";
	if (status === "REFUNDED") return "refunded";
	return "escrow_locked";
}
function shellOrder(input) {
	return {
		id: input.signature.slice(0, 12),
		intent: {
			taker: input.taker,
			nonce: input.nonce,
			marketId: input.market.id,
			side: input.side,
			outcomeTokenId: outcomeTokenId(input.market.id, input.side),
			maxSlippageBps: 50,
			expiryUnix: input.nonce + 180,
			sizeMicro: input.sizeMicro,
			polygonRecipient: input.proxy,
			referenceAskMicro: input.ask
		},
		signatureHex: input.signature,
		commitmentHex: "00".repeat(32),
		phase: input.phase,
		quotes: [],
		polygonTxHex: input.hash ?? void 0,
		logs: [],
		createdAt: input.nonce
	};
}
function trackState(order) {
	if (!order) return {
		index: 0,
		mark: "run"
	};
	if (order.phase === "rejected" || order.phase === "refunded" && !order.solverName) return {
		index: 0,
		mark: "fail"
	};
	if (order.phase === "intent_signed") return {
		index: 0,
		mark: "run"
	};
	if (order.phase === "escrow_locked") return {
		index: 0,
		mark: "done"
	};
	if (order.phase === "solver_matched") return {
		index: 1,
		mark: order.error ? "fail" : "run"
	};
	if (order.phase === "refunded") return {
		index: 1,
		mark: "fail"
	};
	if (order.phase === "clob_filled") return {
		index: 2,
		mark: "run"
	};
	if (order.phase === "settled") return {
		index: 2,
		mark: "done"
	};
	return {
		index: 0,
		mark: "run"
	};
}
function friendly(order) {
	switch (order.error?.code) {
		case "EXPIRED": return "That bet expired before the deposit locked.";
		case "REPLAY": return "That ticket number was already used.";
		case "SLIPPAGE_EXCEEDED": return "No one could fill it at your price. Deposit is back.";
		case "PROOF_MISMATCH": return "The fill didn't check out. Deposit stays locked until you expire it.";
		case "INSUFFICIENT_BALANCE": return "Not enough free USDC.";
		default: return order.error?.message ?? "That bet stopped.";
	}
}
function Desk() {
	const reduce = useReducedMotion();
	const [ready, setReady] = (0, import_react.useState)(false);
	const [books, setBooks] = (0, import_react.useState)(initialBooks);
	const [side, setSide] = (0, import_react.useState)("yes");
	const [drill, setDrill] = (0, import_react.useState)("route");
	const [slippage, setSlippage] = (0, import_react.useState)(50);
	const [settings, setSettings] = (0, import_react.useState)(false);
	const [connectOpen, setConnectOpen] = (0, import_react.useState)(false);
	const [drawer, setDrawer] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [rows, setRows] = (0, import_react.useState)([]);
	const [trade, setTrade] = (0, import_react.useState)(null);
	const [live, setLive] = (0, import_react.useState)(null);
	const [wallet, setWallet] = (0, import_react.useState)(null);
	const [chainSig, setChainSig] = (0, import_react.useState)(null);
	const [chainHash, setChainHash] = (0, import_react.useState)(null);
	const [chainFills, setChainFills] = (0, import_react.useState)([]);
	const dbIdRef = (0, import_react.useRef)("");
	const save = useServerFn(saveIntent);
	const list = useServerFn(listIntents);
	const step = useServerFn(stepSolver);
	const publicKey = useDesk((state) => state.publicKeyB58);
	const available = useDesk((state) => state.available);
	const locked = useDesk((state) => state.locked);
	const connected = useDesk((state) => state.connected);
	const connectLabel = useDesk((state) => state.connectLabel);
	const orders = useDesk((state) => state.orders);
	(0, import_react.useEffect)(() => {
		let cancel = false;
		Promise.resolve(useDesk.persist.rehydrate()).finally(() => {
			if (!cancel) setReady(true);
		});
		return () => {
			cancel = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const timer = window.setInterval(() => {
			setBooks((current) => {
				const next = { ...current };
				for (const market of MARKETS) {
					const book = next[market.id] ?? {
						yes: market.yesAskMicro,
						no: complementAsk(market.yesAskMicro)
					};
					const yes = Math.max(8e4, Math.min(92e4, book.yes + Math.round((Math.random() - .48) * 4e3)));
					next[market.id] = {
						yes,
						no: complementAsk(yes)
					};
				}
				return next;
			});
		}, 1800);
		return () => window.clearInterval(timer);
	}, []);
	const activeKey = wallet?.publicKey ?? (connected ? publicKey : "");
	const polygon = activeKey ? derivePolygonAddress(activeKey) : "";
	const positions = positionsOf(orders);
	const market = MARKETS.find((item) => item.id === trade?.marketId) ?? null;
	const book = market ? books[market.id] ?? {
		yes: market.yesAskMicro,
		no: complementAsk(market.yesAskMicro)
	} : null;
	function pushLog(line) {
		const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(11, 19);
		setLogs((current) => [`${stamp}  ${line}`, ...current].slice(0, 40));
	}
	async function chooseConnect(label) {
		if (!ready) return;
		sfx.tap();
		if (label === "Phantom" || label === "Solflare") {
			const provider = injectedProvider(label);
			if (provider) try {
				const owner = (await provider.connect()).publicKey.toString();
				const balance = await readDevnetBalance(owner);
				setWallet({
					label,
					publicKey: owner,
					provider,
					balance: balance.amount,
					decimals: balance.decimals
				});
				useDesk.getState().connect(label);
				setConnectOpen(false);
				toast(`${label} is on Devnet`);
				pushLog(`[solana] ${label.toLowerCase()} ${shortKey(owner, 4, 4)}`);
				return;
			} catch (error) {
				toast(error instanceof Error ? error.message : "The wallet connection was cancelled.");
				return;
			}
			toast(`${label} isn't in this browser. Using the on-device key instead.`);
		}
		setWallet(null);
		useDesk.getState().connect(label);
		setConnectOpen(false);
		toast(`Connected with ${label}`);
		pushLog(`[auth] ${label.toLowerCase()} → local solana key ${shortKey(useDesk.getState().publicKeyB58, 4, 4)}`);
	}
	function openTrade(marketId, dollars) {
		if (!ready) return;
		sfx.tap();
		if (!wallet && !useDesk.getState().connected) {
			setConnectOpen(true);
			return;
		}
		setChainSig(null);
		setChainHash(null);
		setLive(null);
		setTrade({
			marketId,
			amount: dollars
		});
	}
	async function mirror(order, dbId) {
		const status = dbStatus(order);
		if (!status || status === "PENDING_ESCROW" || status === "EXPIRED") return;
		const pda = escrowAddress(base58.decode(order.intent.taker), order.intent.nonce).address;
		const hash = order.polygonTxHex ? order.polygonTxHex.startsWith("0x") ? order.polygonTxHex : `0x${order.polygonTxHex}` : null;
		const ceiling = maxPrice(order.intent.referenceAskMicro, Math.max(order.intent.maxSlippageBps, 0));
		const minShares = order.sharesMicro ?? sharesFor(order.intent.sizeMicro, Math.max(ceiling, 1));
		pushLog(`[neon] upsert intents status=${status} nonce=${order.intent.nonce}`);
		try {
			const saved = await save({ data: {
				id: dbId,
				userSolanaPubkey: order.intent.taker,
				derivedPolygonAddress: order.intent.polygonRecipient,
				marketConditionId: order.intent.outcomeTokenId,
				outcomeIndex: order.intent.side === "yes" ? 0 : 1,
				usdcAmountIn: money6(order.intent.sizeMicro),
				minSharesOut: money6(minShares),
				solanaEscrowPda: order.phase === "intent_signed" ? null : pda,
				polygonOrderHash: hash,
				nearMpcSignature: order.signatureHex,
				status,
				expiryTimestamp: (/* @__PURE__ */ new Date(order.intent.expiryUnix * 1e3)).toISOString(),
				nonce: order.intent.nonce
			} });
			pushLog(`[neon:${saved.source}] ${saved.row.status}`);
			const listed = await list({ data: order.intent.taker });
			setRows(listed.rows);
		} catch (error) {
			pushLog(`[neon] ${error instanceof Error ? error.message : "save failed"}`);
		}
	}
	async function runOnDevnet() {
		if (!trade || !market || !book || !wallet || busy) return;
		const sizeMicro = parseUsdc(trade.amount);
		if (sizeMicro === null) {
			toast("Use $0.01 to $5,000.");
			return;
		}
		const amount = BigInt(sizeMicro) * 10n ** BigInt(wallet.decimals) / 1000000n;
		if (wallet.balance !== null && amount > wallet.balance) {
			toast("Not enough Devnet USDC in that wallet.");
			return;
		}
		const nonce = Math.floor(Date.now() / 1e3);
		const dbId = crypto.randomUUID();
		dbIdRef.current = dbId;
		const ask = side === "yes" ? book.yes : book.no;
		const proxy = derivePolygonAddress(wallet.publicKey);
		const intentHash = sha256(new TextEncoder().encode(`moxie.intent.v1|${market.id}|${side}|${nonce}|${amount}|${wallet.publicKey}`));
		setBusy(true);
		sfx.lock();
		pushLog(`[solana] initializeIntent ${side.toUpperCase()} ${market.id} $${trade.amount}`);
		try {
			const locked = await lockDevnetIntent({
				provider: wallet.provider,
				publicKey: wallet.publicKey,
				amount,
				intentHash,
				timeout: BigInt(nonce + 180)
			});
			setChainSig(locked.signature);
			pushLog(`[solana] tx ${shortKey(locked.signature, 4, 4)} pda ${shortKey(locked.escrowPda, 4, 4)}`);
			let order = shellOrder({
				taker: wallet.publicKey,
				nonce,
				market,
				side,
				sizeMicro,
				proxy,
				ask,
				signature: locked.signature,
				phase: "escrow_locked"
			});
			setLive(order);
			const ceiling = maxPrice(ask, 50);
			await save({ data: {
				id: dbId,
				userSolanaPubkey: wallet.publicKey,
				derivedPolygonAddress: proxy,
				marketConditionId: order.intent.outcomeTokenId,
				outcomeIndex: side === "yes" ? 0 : 1,
				usdcAmountIn: money6(sizeMicro),
				minSharesOut: money6(sharesFor(sizeMicro, Math.max(ceiling, 1))),
				solanaEscrowPda: locked.escrowPda,
				polygonOrderHash: null,
				nearMpcSignature: locked.signature,
				status: "ESCROW_LOCKED",
				expiryTimestamp: (/* @__PURE__ */ new Date((nonce + 180) * 1e3)).toISOString(),
				nonce
			} });
			pushLog("[neon] ESCROW_LOCKED");
			for (let attempt = 0; attempt < 6; attempt += 1) {
				await wait(700, Boolean(reduce));
				const stepped = await step({ data: dbId });
				if (stepped.note) pushLog(`[solver] ${stepped.note}`);
				const status = stepped.row?.status;
				if (!status) break;
				order = {
					...order,
					phase: chainPhase(status),
					polygonTxHex: stepped.row?.polygon_order_hash ?? void 0
				};
				setLive(order);
				if (stepped.row?.polygon_order_hash) setChainHash(stepped.row.polygon_order_hash);
				const listed = await list({ data: wallet.publicKey });
				setRows(listed.rows);
				if (status === "SETTLED") {
					sfx.bought();
					toast(`Bought ${side.toUpperCase()} · $${trade.amount}`);
					setChainFills((current) => [{
						id: dbId,
						question: market.question,
						side,
						amount: trade.amount
					}, ...current]);
					const nextBalance = await readDevnetBalance(wallet.publicKey);
					setWallet({
						...wallet,
						balance: nextBalance.amount,
						decimals: nextBalance.decimals
					});
					return;
				}
				if (stepped.blocked) {
					sfx.nope();
					toast(stepped.blocked);
					return;
				}
			}
		} catch (error) {
			sfx.nope();
			const message = error instanceof Error ? error.message : "The Devnet lock failed.";
			toast(message);
			pushLog(`[solana] ${message}`);
		} finally {
			setBusy(false);
		}
	}
	async function runTrade() {
		if (wallet) {
			await runOnDevnet();
			return;
		}
		if (!trade || !market || !book || busy) return;
		const state = useDesk.getState();
		const sizeMicro = parseUsdc(trade.amount);
		if (sizeMicro === null) {
			toast("Use $0.01 to $5,000.");
			return;
		}
		if (drill === "replay" && state.consumed.length === 0) {
			toast("Place one bet first, then try reusing the ticket.");
			return;
		}
		if (drill !== "replay" && sizeMicro > state.available) {
			toast("That's more than your free USDC.");
			return;
		}
		const ask = side === "yes" ? book.yes : book.no;
		const slipBps = drill === "slip" ? 0 : slippage;
		const now = Math.floor(Date.now() / 1e3);
		const lastNonce = state.consumed.at(-1);
		const nonce = drill === "replay" && lastNonce ? Number(lastNonce.split(":")[1]) : state.nextNonce;
		const dbId = crypto.randomUUID();
		dbIdRef.current = dbId;
		setBusy(true);
		sfx.lock();
		pushLog(`[solana] sign ${side.toUpperCase()} ${market.id} $${trade.amount}`);
		try {
			const events = planRoute({
				ledger: {
					available: state.available,
					locked: state.locked,
					consumed: state.consumed
				},
				takerSecret: hexToSecret(state.secretKeyHex),
				now,
				corruptProof: drill === "badproof",
				intent: {
					taker: state.publicKeyB58,
					nonce,
					marketId: market.id,
					side,
					outcomeTokenId: outcomeTokenId(market.id, side),
					maxSlippageBps: slipBps,
					expiryUnix: drill === "expire" ? now - 30 : now + 180,
					sizeMicro,
					polygonRecipient: derivePolygonAddress(state.publicKeyB58),
					referenceAskMicro: ask
				}
			});
			for (let index = 0; index < events.length; index += 1) {
				const event = events[index];
				useDesk.getState().apply(event);
				setLive(event.order);
				if (event.type === "locked") {
					const pda = escrowAddress(base58.decode(event.order.intent.taker), event.order.intent.nonce).address;
					pushLog(`[solana] deposit locked pda ${shortKey(pda, 4, 4)}`);
				}
				if (event.type === "quotes") pushLog(`[near] ${event.order.quotes.map((quote) => `${quote.solverName} ${formatCents(quote.priceMicro)}¢`).join(" · ")}`);
				if (event.type === "matched") pushLog(`[near] took ${event.order.solverName}`);
				if (event.type === "filled" && event.order.polygonTxHex) pushLog(`[polygon] tx 0x${event.order.polygonTxHex.slice(0, 8)}…`);
				if (event.type === "settled") pushLog("[solana] deposit released");
				if (event.type === "rejected" || event.type === "refunded" || event.type === "stuck") pushLog(`[route] ${event.error?.code ?? event.type}`);
				await mirror(event.order, dbId);
				if (index < events.length - 1) await wait(380, Boolean(reduce));
			}
			const last = events.at(-1);
			if (!last) return;
			if (last.order.phase === "settled") {
				sfx.bought();
				toast(`Bought ${side.toUpperCase()} · $${trade.amount}`);
			} else {
				sfx.nope();
				toast(friendly(last.order));
			}
		} finally {
			setBusy(false);
		}
	}
	const maxDollars = Math.min(MAX_TICKET, Math.max(0, available)) / 1e6;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-ink text-cream",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: "dark",
				position: "top-center",
				toastOptions: { style: {
					background: "#10141c",
					color: "#e8fff6",
					border: "1px solid #1c2433"
				} }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs uppercase tracking-widest text-mint",
							children: "Moxie"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hidden text-sm text-mute sm:block",
							children: "One signature. Private fill."
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "hidden items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-mute sm:flex",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pulse-dot size-2 rounded-full bg-mint" }), "Solana · NEAR · Polygon"]
							}),
							wallet || connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-full border border-line px-3 py-2 text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-sm leading-none text-mint",
									children: wallet ? wallet.balance === null ? "…" : formatToken(wallet.balance, wallet.decimals) : ready ? formatUsdc(available) : "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-mute",
									children: wallet ? "Devnet USDC" : `USDC${locked > 0 ? ` · ${formatUsdc(locked)} locked` : ""}`
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									sfx.tap();
									setConnectOpen(true);
								},
								className: "max-w-36 truncate rounded-full border border-cyan/40 px-3 py-2 font-mono text-xs text-cyan",
								children: shortHex(polygon)
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !ready,
								onClick: () => setConnectOpen(true),
								className: "h-11 rounded-full bg-mint px-4 text-sm font-semibold text-ink disabled:opacity-50",
								children: "Connect"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Settings",
								onClick: () => setSettings((open) => !open),
								className: "flex size-11 items-center justify-center rounded-full border border-line",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4" })
							})
						]
					})]
				}), settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-t border-line",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							role: "group",
							"aria-label": "Price room",
							children: [
								25,
								50,
								100
							].map((bps) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": slippage === bps,
								onClick: () => setSlippage(bps),
								className: `h-10 rounded-full px-3 text-sm ${slippage === bps ? "bg-mint text-ink" : "border border-line text-mute"}`,
								children: [(bps / 100).toFixed(2), "% room"]
							}, bps))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							role: "group",
							"aria-label": "Practice modes",
							children: DRILLS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": drill === item.id,
								onClick: () => setDrill(item.id),
								className: `h-10 rounded-full px-3 text-sm ${drill === item.id ? "bg-violet text-cream" : "border border-line text-mute"}`,
								children: item.label
							}, item.id))
						})]
					})
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-6xl px-4 py-6 pb-28",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-semibold",
							children: "Markets"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-mute",
							children: "Tap a price, then a size. We lock USDC and buy the side."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs text-cyan",
							children: wallet ? `via ${wallet.label} · Devnet` : connectLabel ? `via ${connectLabel}` : "not connected"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "grid gap-4 md:grid-cols-2",
						children: MARKETS.map((item) => {
							const prices = books[item.id] ?? {
								yes: item.yesAskMicro,
								no: complementAsk(item.yesAskMicro)
							};
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketCard, {
								market: item,
								yes: prices.yes,
								no: prices.no,
								side,
								maxDollars,
								onSide: (next) => {
									sfx.tap();
									setSide(next);
								},
								onChip: (dollars) => openTrade(item.id, dollars)
							}) }, item.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xs uppercase tracking-widest text-mute",
							children: "Your bets"
						}), positions.length === 0 && chainFills.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-mute",
							children: "Nothing bought yet. Wins show up on your Polygon address."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-2 divide-y divide-line border-t border-line",
							children: [chainFills.map((fill) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "flex items-center justify-between gap-3 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-sm",
										children: fill.question
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono text-xs text-cyan",
										children: [
											fill.side.toUpperCase(),
											" · Devnet $",
											fill.amount
										]
									})]
								})
							}, fill.id)), positions.map((position) => {
								const listed = MARKETS.find((item) => item.id === position.marketId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-center justify-between gap-3 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block truncate text-sm",
											children: listed?.question
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-xs text-mint",
											children: position.side.toUpperCase()
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-sm tabular-nums",
										children: formatShares(position.sharesMicro)
									})]
								}, position.tokenId);
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setDrawer((open) => !open),
				className: "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel px-4 py-3 text-left",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs uppercase tracking-widest text-cyan",
						children: "Dev console"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-mute",
						children: drawer ? "Hide" : `${rows.length} db rows`
					})]
				})
			}),
			drawer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "fixed inset-x-0 bottom-12 z-40 max-h-72 overflow-auto border-t border-line bg-ink px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-violet",
						children: "intents · Devnet DiiRjj…CwK5g · Amoy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-2 space-y-1",
						children: [rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "font-mono text-xs text-mute",
							children: "no rows yet"
						}) : null, rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "font-mono text-xs text-cream",
							children: [
								row.status,
								" · nonce ",
								row.nonce,
								" · ",
								row.usdc_amount_in,
								" USDC",
								row.polygon_order_hash ? ` · ${shortHex(row.polygon_order_hash)}` : ""
							]
						}, row.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-3 space-y-1 border-t border-line pt-2",
						children: [logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "font-mono text-xs text-mute",
							children: "rpc log is empty"
						}) : null, logs.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "break-all font-mono text-xs text-mute",
							children: line
						}, `${line}-${index}`))]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AnimatePresence, { children: [connectOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				onClose: () => setConnectOpen(false),
				title: "Connect",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-mute",
						children: "Phantom and Solflare sign the Devnet escrow if the extension is in this browser. Otherwise the desk signs with a Solana key kept on this device. The Polygon address is derived from that key. You still don't hold gas or bridge."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-2 gap-2",
						children: CONNECTS.map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void chooseConnect(label),
							className: "h-12 rounded-xl border border-line bg-ink text-sm font-medium hover:border-mint",
							children: label
						}, label))
					}),
					connected || wallet ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-3 h-11 text-sm text-mute",
						onClick: () => {
							wallet?.provider.disconnect?.();
							setWallet(null);
							useDesk.getState().disconnect();
							setConnectOpen(false);
						},
						children: "Disconnect"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-mono text-xs text-cyan",
						children: polygon ? `Polygon ${shortHex(polygon)} · moxie-intents` : "Polygon address appears after you connect"
					})
				]
			}, "connect") : null, trade && market && book ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
				onClose: () => busy ? void 0 : setTrade(null),
				title: market.question,
				footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [live && !busy && (live.phase === "escrow_locked" || live.phase === "solver_matched") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-12 flex-1 rounded-full border border-line text-sm",
						onClick: () => {
							const now = live.phase === "solver_matched" ? live.intent.expiryUnix + 1 : Math.floor(Date.now() / 1e3);
							useDesk.getState().refundOrder(live.id, now);
							const next = useDesk.getState().orders.find((order) => order.id === live.id) ?? null;
							setLive(next);
							if (next && dbIdRef.current) mirror(next, dbIdRef.current);
							toast(next?.phase === "refunded" ? "Deposit back in your balance." : "Couldn't return it yet.");
						},
						children: live.phase === "solver_matched" ? "Expire and refund" : "Cancel deposit"
					}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy || live?.phase === "settled",
						onClick: () => void runTrade(),
						className: "h-12 flex-1 rounded-full bg-mint font-semibold text-ink disabled:opacity-50",
						children: busy ? "Routing…" : live?.phase === "settled" ? "Bought" : "Lock deposit"
					})]
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidePick, {
							label: "Yes",
							cents: formatCents(book.yes),
							pressed: side === "yes",
							onClick: () => setSide("yes")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidePick, {
							label: "No",
							cents: formatCents(book.no),
							pressed: side === "no",
							onClick: () => setSide("no")
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex gap-2",
						children: [
							"5",
							"25",
							"50",
							String(Math.max(1, Math.floor(maxDollars)))
						].map((amount, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								sfx.tap();
								setTrade({
									marketId: market.id,
									amount: index === 3 ? String(Math.floor(maxDollars)) : amount
								});
							},
							className: `h-11 flex-1 rounded-full text-sm ${trade.amount === (index === 3 ? String(Math.floor(maxDollars)) : amount) ? "bg-mint text-ink" : "border border-line"}`,
							children: index === 3 ? "Max" : `$${amount}`
						}, amount + index))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "mt-3 block text-xs uppercase tracking-widest text-mute",
						htmlFor: "ticket",
						children: "Dollars"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "ticket",
						inputMode: "decimal",
						value: trade.amount,
						onChange: (event) => setTrade({
							...trade,
							amount: event.target.value
						}),
						className: "mt-2 h-12 w-full rounded-xl border border-line bg-ink px-3 font-mono text-cream outline-none"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-mute",
						children: wallet ? "This locks Devnet USDC in the escrow. Keep the wallet on Devnet." : `Ceiling ${formatCents(maxPrice(side === "yes" ? book.yes : book.no, drill === "slip" ? 0 : slippage))}¢ · pays from Solana USDC`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "mt-4 space-y-3",
						children: TRACK.map((step, index) => {
							const visual = trackState(live);
							const mark = !live ? "wait" : index < visual.index ? "done" : index === visual.index ? visual.mark : "wait";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `mt-1 size-2.5 shrink-0 rounded-full ${mark === "done" ? "bg-mint" : mark === "run" ? "pulse-dot bg-cyan" : mark === "fail" ? "bg-violet" : "bg-line"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `block text-sm ${mark === "wait" ? "text-mute" : "text-cream"}`,
									children: step.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-mute",
									children: step.hint
								})] })]
							}, step.title);
						})
					}),
					live?.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 rounded-xl bg-violet/15 px-3 py-2 text-sm text-cream",
						children: friendly(live)
					}) : null,
					live?.phase === "settled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-sm text-mint",
						children: [
							"Bought ",
							live.intent.side.toUpperCase(),
							". Shares are on your Polygon address."
						]
					}) : null,
					chainSig ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "mt-3 block font-mono text-xs text-cyan",
						href: `https://explorer.solana.com/tx/${chainSig}?cluster=devnet`,
						target: "_blank",
						rel: "noreferrer",
						children: "View the Solana lock"
					}) : null,
					chainHash ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "mt-1 block font-mono text-xs text-mint",
						href: `https://amoy.polygonscan.com/tx/${chainHash}`,
						target: "_blank",
						rel: "noreferrer",
						children: "View the Polygon fill"
					}) : null
				]
			}, "trade") : null] })
		]
	});
}
function MarketCard({ market, yes, no, side, maxDollars, onSide, onChip }) {
	const yesPct = Math.max(8, Math.min(92, Number(pct(yes))));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-2xl border border-line bg-panel p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs uppercase tracking-widest text-mute",
				children: [
					market.venue,
					" · ",
					market.resolves,
					" · 24h ",
					market.volume
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-2 text-lg font-semibold leading-snug",
				children: market.question
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex h-1.5 overflow-hidden rounded-full bg-line",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full bg-mint",
					style: { width: `${yesPct}%` }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full flex-1 bg-cyan" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": side === "yes",
					onClick: () => onSide("yes"),
					className: `h-14 rounded-xl border px-3 text-left ${side === "yes" ? "border-mint bg-mint/10" : "border-line"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-mute",
						children: "Yes"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-lg text-mint",
						children: [pct(yes), "%"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": side === "no",
					onClick: () => onSide("no"),
					className: `h-14 rounded-xl border px-3 text-left ${side === "no" ? "border-cyan bg-cyan/10" : "border-line"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-mute",
						children: "No"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono text-lg text-cyan",
						children: [pct(no), "%"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex gap-2",
				children: [
					"5",
					"25",
					"50",
					"max"
				].map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onChip(chip === "max" ? String(Math.max(1, Math.floor(maxDollars))) : chip),
					className: "h-11 flex-1 rounded-full border border-line text-sm hover:border-mint",
					children: chip === "max" ? "Max" : `$${chip}`
				}, chip))
			})
		]
	});
}
function SidePick({ label, cents, pressed, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-pressed": pressed,
		onClick,
		className: `h-14 rounded-xl border px-3 text-left ${pressed ? "border-mint" : "border-line"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-xs text-mute",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "font-mono",
			children: [cents, "¢"]
		})]
	});
}
function Sheet({ title, onClose, children, footer }) {
	const reduce = useReducedMotion();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-3 sm:items-center",
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: reduce ? 0 : .16 },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-label": "Close",
			className: "absolute inset-0 z-0",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			role: "dialog",
			"aria-modal": "true",
			"aria-label": title,
			initial: reduce ? false : {
				y: 28,
				opacity: 0
			},
			animate: {
				y: 0,
				opacity: 1
			},
			exit: reduce ? void 0 : {
				y: 20,
				opacity: 0
			},
			transition: {
				type: "spring",
				stiffness: 420,
				damping: 34
			},
			className: "relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-panel p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold leading-snug",
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Close dialog",
						onClick: onClose,
						className: "flex size-11 shrink-0 items-center justify-center rounded-full border border-line",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-auto",
					children
				}),
				footer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 shrink-0",
					children: footer
				}) : null
			]
		})]
	});
}
var SplitComponent = Desk;
//#endregion
export { SplitComponent as component };
