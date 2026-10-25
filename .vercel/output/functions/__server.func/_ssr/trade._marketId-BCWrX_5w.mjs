import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, J as require_react, b as Link, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { F as ed25519, H as bytesToHex, I as sha256 } from "../_libs/noble__curves+noble__hashes.mjs";
import { A as ChevronDown, C as ExternalLink, O as CircleCheck, P as ArrowLeft, b as Lock, k as ChevronUp } from "../_libs/lucide-react.mjs";
import { n as motion, r as AnimatePresence, t as useReducedMotion } from "../_libs/framer-motion+[...].mjs";
import { l as SOLANA_ESCROW_PROGRAM_ID, s as POLYMARKET_WS_URL, t as DEVNET_USDC_MINT } from "./constants-D25iXV32.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as base58 } from "../_libs/scure__base.mjs";
import { a as Transaction, i as SystemProgram, o as TransactionInstruction, r as PublicKey } from "../_libs/@solana/web3.js.mjs";
import { A as derivePolygonAddress, B as signIntent, C as formatUsdc, D as positionsOf, E as parseUsdc, F as escrowAddress, G as useServerFn, H as ErrorCodes, I as fillMessage, J as outcomeTokenId, K as buildPriceHistory, L as publicKeyFromSecret, M as commitmentOf, O as shortHex, P as encodeIntent, R as quoteMessage, S as formatShares, T as money6, U as ProtocolError, V as solverAuthMessage, W as asProtocolError, Y as sfx, _ as saveIntent, b as enrichPosition, c as lockEscrow, d as recordFill, f as refundEscrow, i as injectedProvider, j as MARKETS, k as shortKey, l as matchSolver, m as sharesFor, n as Route$5, o as withSolanaFailover, p as settleRelease, q as complementAsk, s as useDesk, u as maxPrice, v as stepSolver, x as formatCents, y as MAX_TICKET, z as buildOrderbook } from "./router-CSvPMnxF.mjs";
import { t as PositionManagerCard } from "./position-manager-card-V72seBW7.mjs";
// node_modules/.nitro/vite/services/ssr/assets/trade._marketId-BCWrX_5w.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
var cachedSolverKeys = null;
function getSolverKeys() {
	if (!cachedSolverKeys) cachedSolverKeys = [
		solverKey("Northbridge", 12),
		solverKey("Quiet Lot", 28),
		solverKey("Harbor", 70)
	];
	return cachedSolverKeys;
}
function collectQuotes(commitment, referenceAskMicro) {
	return getSolverKeys().map((solver) => {
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
	const solver = getSolverKeys().find((key) => base58.encode(key.pubkey) === input.solverPubkey);
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
var textEncoder = new TextEncoder();
var cachedTokenProgramId = null;
var cachedProgramId = null;
var cachedMint = null;
var cachedAssociatedProgramId = null;
function getTokenProgramId() {
	cachedTokenProgramId ??= new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
	return cachedTokenProgramId;
}
function getProgramId() {
	cachedProgramId ??= new PublicKey(SOLANA_ESCROW_PROGRAM_ID);
	return cachedProgramId;
}
function getMint() {
	cachedMint ??= new PublicKey(DEVNET_USDC_MINT);
	return cachedMint;
}
function getAssociatedProgramId() {
	cachedAssociatedProgramId ??= new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
	return cachedAssociatedProgramId;
}
function bytesToBase64(bytes) {
	if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
	let binary = "";
	for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}
/** Confirmed on Devnet: seeds `["escrow", maker]` and `["vault", escrow]`. */
function escrowPda(maker) {
	return PublicKey.findProgramAddressSync([textEncoder.encode("escrow"), maker.toBytes()], getProgramId())[0];
}
function vaultPda(escrow) {
	return PublicKey.findProgramAddressSync([textEncoder.encode("vault"), escrow.toBytes()], getProgramId())[0];
}
function makerTokenAccount(maker) {
	return PublicKey.findProgramAddressSync([
		maker.toBytes(),
		getTokenProgramId().toBytes(),
		getMint().toBytes()
	], getAssociatedProgramId())[0];
}
function initializeIntentData(amount, intentHash, timeout) {
	if (intentHash.length !== 32) throw new Error("Intent hash must be 32 bytes");
	const disc = sha256(textEncoder.encode("global:initialize_intent")).subarray(0, 8);
	const raw = /* @__PURE__ */ new Uint8Array(56);
	raw.set(disc, 0);
	const view = new DataView(raw.buffer);
	view.setBigUint64(8, amount, true);
	raw.set(intentHash, 16);
	view.setBigInt64(48, timeout, true);
	return Buffer.from(raw);
}
/**
* Matches IDL instruction `initializeIntent` in `src/idl/moxie_escrow.json`
*/
function initializeIntentTransaction(input) {
	const escrow = escrowPda(input.maker);
	const vault = vaultPda(escrow);
	const ix = new TransactionInstruction({
		programId: getProgramId(),
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
				pubkey: getMint(),
				isSigner: false,
				isWritable: false
			},
			{
				pubkey: getTokenProgramId(),
				isSigner: false,
				isWritable: false
			},
			{
				pubkey: SystemProgram.programId,
				isSigner: false,
				isWritable: false
			}
		],
		data: initializeIntentData(input.amount, input.intentHash, input.timeout)
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
	const maker = new PublicKey(input.publicKey);
	const { result, usedFallback } = await withSolanaFailover(async (connection, endpoint) => {
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
		const preview = await (await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "simulateTransaction",
				params: [bytesToBase64(raw), {
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
	});
	return {
		...result,
		usedFallback
	};
}
var SPRING = {
	type: "spring",
	stiffness: 300,
	damping: 28,
	mass: .8
};
var TIMEFRAMES = [
	"1H",
	"1D",
	"1W",
	"ALL"
];
var TRACKER_STEPS = [
	{
		code: "STEP 1",
		title: "1. Lock USDC on Solana",
		detail: "Funds lock in escrow until your order fills or expires."
	},
	{
		code: "STEP 2",
		title: "2. Private routing via NEAR",
		detail: "Solvers bid privately through Aurora Intents Connect & NEAR Intents."
	},
	{
		code: "STEP 3",
		title: "3. Settle on Polymarket",
		detail: "Shares land automatically in your derived Polygon address."
	}
];
function hexToSecret(hex) {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return out;
}
function wait(ms, reduce) {
	return new Promise((resolve) => {
		setTimeout(resolve, reduce ? 0 : ms);
	});
}
function dbStatusOf(order) {
	if (order.phase === "rejected") return order.error?.code === "EXPIRED" ? "EXPIRED" : null;
	if (order.phase === "intent_signed") return "PENDING_ESCROW";
	if (order.phase === "escrow_locked") return "ESCROW_LOCKED";
	if (order.phase === "solver_matched") return "SOLVER_BIDDING";
	if (order.phase === "clob_filled") return "CLOB_SUBMITTED";
	if (order.phase === "settled") return "SETTLED";
	if (order.phase === "refunded") return "REFUNDED";
	return null;
}
function trackerStepIndex(order) {
	if (!order) return {
		activeStep: -1,
		state: "idle"
	};
	if (order.phase === "rejected" || order.phase === "refunded") return {
		activeStep: order.solverName ? 1 : 0,
		state: "failed"
	};
	if (order.phase === "intent_signed" || order.phase === "escrow_locked") return {
		activeStep: 0,
		state: "running"
	};
	if (order.phase === "solver_matched") return {
		activeStep: 1,
		state: "running"
	};
	if (order.phase === "clob_filled") return {
		activeStep: 2,
		state: "running"
	};
	if (order.phase === "settled") return {
		activeStep: 2,
		state: "done"
	};
	return {
		activeStep: 0,
		state: "running"
	};
}
function TradeExecutionDesk() {
	const { marketId } = Route$5.useParams();
	const search = Route$5.useSearch();
	const navigate = useNavigate();
	const reduce = useReducedMotion();
	const baseMarket = (0, import_react.useMemo)(() => MARKETS.find((m) => m.id === marketId) ?? MARKETS[0], [marketId]);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [market, setMarket] = (0, import_react.useState)(baseMarket);
	const [side, setSide] = (0, import_react.useState)(search.side ?? "yes");
	const [amountInput, setAmountInput] = (0, import_react.useState)(search.amount ?? "25");
	const [formError, setFormError] = (0, import_react.useState)(null);
	const [timeframe, setTimeframe] = (0, import_react.useState)("1D");
	const [hoverIdx, setHoverIdx] = (0, import_react.useState)(null);
	const [orderbook, setOrderbook] = (0, import_react.useState)(() => buildOrderbook(baseMarket));
	const [orderbookOpen, setOrderbookOpen] = (0, import_react.useState)(false);
	const [rulesOpen, setRulesOpen] = (0, import_react.useState)(false);
	const [wsConnected, setWsConnected] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [liveOrder, setLiveOrder] = (0, import_react.useState)(null);
	const [solanaSig, setSolanaSig] = (0, import_react.useState)(null);
	const [polygonHash, setPolygonHash] = (0, import_react.useState)(null);
	const dbIdRef = (0, import_react.useRef)("");
	const save = useServerFn(saveIntent);
	const step = useServerFn(stepSolver);
	const connected = useDesk((s) => s.connected);
	const orders = useDesk((s) => s.orders);
	const available = useDesk((s) => s.available);
	const publicKeyB58 = useDesk((s) => s.publicKeyB58);
	const externalPublicKey = useDesk((s) => s.externalPublicKey);
	const connectLabel = useDesk((s) => s.connectLabel);
	const slippagePct = useDesk((s) => s.slippagePct);
	const pushConsoleLog = useDesk((s) => s.pushConsoleLog);
	const setActiveModal = useDesk((s) => s.setActiveModal);
	const activeSolanaKey = (externalPublicKey ?? publicKeyB58).trim();
	const effectiveAvailable = ready && connected ? available : 0;
	const slippageRoomUnits = Math.round(slippagePct * 100);
	(0, import_react.useEffect)(() => {
		Promise.resolve(useDesk.persist.rehydrate()).finally(() => setReady(true));
	}, []);
	(0, import_react.useEffect)(() => {
		setMarket(baseMarket);
		setOrderbook(buildOrderbook(baseMarket));
	}, [baseMarket]);
	(0, import_react.useEffect)(() => {
		if (search.side) setSide(search.side);
	}, [search.side]);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		let cancelled = false;
		async function fetchBook() {
			try {
				const res = await fetch(`/api/polymarket/book?marketId=${encodeURIComponent(market.id)}&tokenId=${encodeURIComponent(market.clobTokenIds[0])}`);
				if (res.ok) {
					const data = await res.json();
					if (!cancelled) setOrderbook(data);
				}
			} catch {}
		}
		fetchBook();
		let ws = null;
		try {
			if (typeof WebSocket !== "undefined") {
				ws = new WebSocket(POLYMARKET_WS_URL);
				ws.onopen = () => {
					if (!cancelled) {
						setWsConnected(true);
						ws?.send(JSON.stringify({
							assets_ids: market.clobTokenIds,
							type: "market"
						}));
					}
				};
				ws.onmessage = () => {
					if (!cancelled) setOrderbook((prev) => {
						const delta = (Math.random() - .48) * 1e4;
						const nextYes = Math.max(8e4, Math.min(92e4, prev.lastPriceCents * 1e4 + delta));
						return buildOrderbook(market, nextYes);
					});
				};
				ws.onerror = () => {
					if (!cancelled) setWsConnected(false);
				};
				ws.onclose = () => {
					if (!cancelled) setWsConnected(false);
				};
			}
		} catch {
			setWsConnected(false);
		}
		const tick = window.setInterval(() => {
			if (!cancelled) setOrderbook((prev) => {
				const jitter = Math.round((Math.random() - .49) * 1e4);
				const nextYesMicro = Math.max(6e4, Math.min(94e4, prev.lastPriceCents * 1e4 + jitter));
				return buildOrderbook(market, nextYesMicro);
			});
		}, 2400);
		return () => {
			cancelled = true;
			window.clearInterval(tick);
			try {
				ws?.close();
			} catch {}
		};
	}, [market]);
	const liveYesMicro = orderbook.lastPriceCents * 1e4;
	const liveNoMicro = complementAsk(liveYesMicro);
	const activeAskMicro = side === "yes" ? liveYesMicro : liveNoMicro;
	const ceilingMicro = maxPrice(activeAskMicro, slippageRoomUnits);
	const parsedMicro = parseUsdc(amountInput);
	const estSharesMicro = parsedMicro ? sharesFor(parsedMicro, Math.max(activeAskMicro, 1e4)) : 0;
	const minSharesMicro = parsedMicro ? sharesFor(parsedMicro, Math.max(ceilingMicro, 1e4)) : 0;
	const maxDollars = Math.min(MAX_TICKET, Math.max(0, effectiveAvailable)) / 1e6;
	const historyPoints = (0, import_react.useMemo)(() => buildPriceHistory(market, timeframe, liveYesMicro), [
		market,
		timeframe,
		liveYesMicro
	]);
	const marketPositions = (0, import_react.useMemo)(() => {
		if (!ready || !connected || !activeSolanaKey) return [];
		const walletOrders = orders.filter((o) => o.intent.taker === activeSolanaKey);
		return positionsOf(walletOrders).filter((p) => p.marketId === market.id).map((pos) => enrichPosition(pos, market, pos.side === "yes" ? liveYesMicro : liveNoMicro));
	}, [
		ready,
		connected,
		activeSolanaKey,
		orders,
		market,
		liveYesMicro,
		liveNoMicro
	]);
	async function syncIntentRecord(order, dbId, txSig) {
		const status = dbStatusOf(order);
		if (!status) return;
		const walletPubkey = activeSolanaKey || order.intent.taker;
		const pda = escrowAddress(base58.decode(walletPubkey), order.intent.nonce).address;
		const hash = order.polygonTxHex ? order.polygonTxHex.startsWith("0x") ? order.polygonTxHex : `0x${order.polygonTxHex}` : null;
		const ceiling = maxPrice(order.intent.referenceAskMicro, Math.max(order.intent.maxSlippageBps, 0));
		const minShares = order.sharesMicro ?? sharesFor(order.intent.sizeMicro, Math.max(ceiling, 1));
		try {
			await save({ data: {
				id: dbId,
				userSolanaPubkey: walletPubkey,
				derivedPolygonAddress: derivePolygonAddress(walletPubkey),
				marketConditionId: market.conditionId,
				outcomeIndex: order.intent.side === "yes" ? 0 : 1,
				usdcAmountIn: money6(order.intent.sizeMicro),
				minSharesOut: money6(minShares),
				slippageBps: order.intent.maxSlippageBps,
				sourceClient: "WEB",
				solanaEscrowPda: order.phase === "intent_signed" ? null : pda,
				solanaTxSignature: txSig ?? null,
				polygonOrderHash: hash,
				nearMpcSignature: order.signatureHex,
				status,
				expiryTimestamp: (/* @__PURE__ */ new Date(order.intent.expiryUnix * 1e3)).toISOString(),
				nonce: order.intent.nonce
			} });
		} catch {}
	}
	async function handleTrade() {
		if (busy) return;
		setFormError(null);
		const state = useDesk.getState();
		if (!state.connected) {
			sfx.nope();
			setFormError("Log in or connect your wallet in the top header before placing a trade.");
			setActiveModal("connect");
			return;
		}
		const sizeMicro = parseUsdc(amountInput);
		if (sizeMicro === null || sizeMicro <= 0) {
			sfx.nope();
			setFormError("Enter a USDC amount between $0.01 and $5,000.00.");
			return;
		}
		if (sizeMicro > state.available) {
			sfx.nope();
			setFormError(`Order exceeds your Available Balance ($${formatUsdc(state.available)} USDC).`);
			return;
		}
		const now = Math.floor(Date.now() / 1e3);
		const nonce = Math.max(state.nextNonce, now);
		const dbId = crypto.randomUUID();
		dbIdRef.current = dbId;
		setBusy(true);
		setSolanaSig(null);
		setPolygonHash(null);
		sfx.lock();
		const extWalletName = connectLabel === "Phantom" || connectLabel === "Solflare" || connectLabel === "Backpack" ? connectLabel : null;
		const extProvider = extWalletName ? injectedProvider(extWalletName) : null;
		if (extProvider && externalPublicKey) try {
			const intentHash = sha256(new TextEncoder().encode(`moxie.intent.v1|${market.id}|${side}|${nonce}|${sizeMicro}|${externalPublicKey}`));
			const locked = await lockDevnetIntent({
				provider: extProvider,
				publicKey: externalPublicKey,
				amount: BigInt(sizeMicro),
				intentHash,
				timeout: BigInt(nonce + 180)
			});
			setSolanaSig(locked.signature);
			pushConsoleLog(`[solana] locked pda=${shortKey(locked.escrowPda, 4, 4)}`);
			await step({ data: dbId }).catch(() => void 0);
		} catch {}
		try {
			const events = planRoute({
				ledger: {
					available: state.available,
					locked: state.locked,
					consumed: state.consumed
				},
				takerSecret: hexToSecret(state.secretKeyHex),
				now,
				intent: {
					taker: state.publicKeyB58,
					nonce,
					marketId: market.id,
					side,
					outcomeTokenId: outcomeTokenId(market.id, side),
					maxSlippageBps: slippageRoomUnits,
					expiryUnix: now + 180,
					sizeMicro,
					polygonRecipient: derivePolygonAddress(state.publicKeyB58),
					referenceAskMicro: activeAskMicro
				}
			});
			for (let i = 0; i < events.length; i += 1) {
				const ev = events[i];
				useDesk.getState().apply(ev);
				setLiveOrder(ev.order);
				if (ev.type === "locked") {
					const mockSig = `5MoxieLock${ev.order.signatureHex.slice(0, 44)}`;
					setSolanaSig(mockSig);
					await syncIntentRecord(ev.order, dbId, mockSig);
				} else if (ev.type === "matched") await syncIntentRecord(ev.order, dbId);
				else if (ev.type === "filled") {
					const txHash = ev.order.polygonTxHex ? `0x${ev.order.polygonTxHex.replace(/^0x/, "")}` : null;
					setPolygonHash(txHash);
					await syncIntentRecord(ev.order, dbId);
				} else if (ev.type === "settled") await syncIntentRecord(ev.order, dbId);
				if (i < events.length - 1) await wait(420, Boolean(reduce));
			}
			const finalEvent = events.at(-1);
			if (finalEvent?.order.phase === "settled") {
				sfx.bought();
				toast(`Traded ${side.toUpperCase()} on "${market.question}" for $${amountInput} USDC.`);
			} else if (finalEvent?.error) {
				sfx.nope();
				setFormError(finalEvent.error.message);
			}
		} finally {
			setBusy(false);
		}
	}
	const tracker = trackerStepIndex(liveOrder);
	const chartPoints = historyPoints;
	const activePoint = hoverIdx !== null && chartPoints[hoverIdx] ? chartPoints[hoverIdx] : chartPoints.at(-1);
	const svgWidth = 520;
	const svgHeight = 190;
	const padX = 16;
	const padY = 18;
	const polylinePoints = chartPoints.map((pt, idx) => {
		const x = padX + idx / Math.max(1, chartPoints.length - 1) * 488;
		const y = padY + (100 - pt.yesCents) / 100 * 154;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	}).join(" ");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "py-8 space-y-6 w-full max-w-full overflow-x-hidden box-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/markets",
					className: "inline-flex items-center gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke px-3.5 py-1.5 text-xs font-medium text-fey-mist hover:text-fey-white transition-colors",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Back to Markets" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2 sm:gap-3 text-caption text-fey-graphite",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fey-signal",
							children: market.category
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tnum",
							children: ["24h Vol ", market.volume]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Ends ", market.resolves] })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-5 lg:grid-cols-[1.25fr_0.95fr] items-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5 min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "fey-card p-5 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-caption text-fey-signal",
											children: market.venue
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
											className: "mt-1 text-heading text-fey-white",
											children: market.question
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-right shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "tnum text-display text-fey-growth",
											children: [activePoint.yesCents, "%"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block text-caption text-fey-graphite",
											children: activePoint.label
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center justify-between gap-2 pt-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "inline-flex items-center gap-1 rounded-pill bg-fey-obsidian border border-fey-smoke p-1",
										children: TIMEFRAMES.map((tf) => {
											const active = timeframe === tf;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													sfx.tap();
													setTimeframe(tf);
												},
												className: `relative rounded-pill px-3 py-1 text-xs font-medium tnum transition-colors ${active ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"}`,
												children: [active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
													layoutId: "chart-tf-pill",
													initial: false,
													transition: SPRING,
													className: "absolute inset-0 rounded-pill bg-fey-charcoal border border-fey-signal/70"
												}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "relative z-10",
													children: tf
												})]
											}, tf);
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum text-xs text-fey-graphite",
										children: [
											"YES ",
											activePoint.yesCents,
											"¢ · NO ",
											activePoint.noCents,
											"¢"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "fey-well p-3 relative overflow-hidden",
									onMouseLeave: () => setHoverIdx(null),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
										viewBox: `0 0 ${svgWidth} ${svgHeight}`,
										className: "w-full h-44 overflow-visible",
										role: "img",
										"aria-label": `Price history chart for ${market.question}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
												id: "yesAreaGrad",
												x1: "0",
												y1: "0",
												x2: "0",
												y2: "1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
													offset: "0%",
													stopColor: "var(--color-fey-growth)",
													stopOpacity: "0.32"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
													offset: "100%",
													stopColor: "var(--color-fey-growth)",
													stopOpacity: "0.0"
												})]
											}) }),
											[
												25,
												50,
												75
											].map((lvl) => {
												const y = padY + (100 - lvl) / 100 * 154;
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
													x1: padX,
													y1: y,
													x2: 504,
													y2: y,
													stroke: "var(--color-fey-smoke)",
													strokeDasharray: "3 3",
													strokeWidth: "0.75"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
													x: 508,
													y: y + 3,
													fill: "var(--color-fey-graphite)",
													fontSize: "9",
													children: [lvl, "%"]
												})] }, lvl);
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
												points: `${padX},172 ${polylinePoints} 504,172`,
												fill: "url(#yesAreaGrad)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
												fill: "none",
												stroke: "var(--color-fey-growth)",
												strokeWidth: "2.5",
												strokeLinecap: "round",
												strokeLinejoin: "round",
												points: polylinePoints
											}),
											chartPoints.map((pt, idx) => {
												const x = padX + idx / Math.max(1, chartPoints.length - 1) * 488;
												const y = padY + (100 - pt.yesCents) / 100 * 154;
												const isHovered = hoverIdx === idx || hoverIdx === null && idx === chartPoints.length - 1;
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
													x: x - svgWidth / chartPoints.length / 2,
													y: 0,
													width: svgWidth / chartPoints.length,
													height: svgHeight,
													fill: "transparent",
													className: "cursor-crosshair",
													onMouseEnter: () => setHoverIdx(idx)
												}), isHovered ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
													x1: x,
													y1: padY,
													x2: x,
													y2: 172,
													stroke: "var(--color-fey-signal)",
													strokeWidth: "1"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
													cx: x,
													cy: y,
													r: "4.5",
													fill: "var(--color-fey-growth)",
													stroke: "var(--color-fey-charcoal)",
													strokeWidth: "1.5"
												})] }) : null] }, pt.label + idx);
											})
										]
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "fey-card overflow-hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-expanded": orderbookOpen,
								onClick: () => {
									sfx.tap();
									setOrderbookOpen((v) => !v);
								},
								className: "flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-fey-obsidian/50 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-heading-sm text-fey-white",
									children: "Orderbook"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-fey-graphite",
									children: [
										wsConnected ? "Live Streaming" : "Orderbook Active",
										" · Last Matched ",
										orderbook.lastPriceCents,
										".0¢"
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5 shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-1 text-xs text-fey-mist",
										children: [
											"Spread ",
											orderbook.spreadCents,
											"¢"
										]
									}), orderbookOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-4 text-fey-mist" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-fey-mist" })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
								initial: false,
								children: orderbookOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
									initial: {
										height: 0,
										opacity: 0
									},
									animate: {
										height: "auto",
										opacity: 1
									},
									exit: {
										height: 0,
										opacity: 0
									},
									transition: SPRING,
									className: "border-t border-fey-smoke p-5 space-y-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-3 text-caption text-fey-graphite px-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Price (¢)" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-right",
													children: "Shares"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-right",
													children: "Total (USDC)"
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1.5",
											"aria-label": "Orderbook Asks",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-caption text-fey-ember px-2",
												children: "Asks (Sell YES / Buy NO)"
											}), [...orderbook.asks].reverse().map((level, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													sfx.tap();
													setSide("yes");
												},
												className: "relative flex w-full items-center justify-between overflow-hidden rounded-well bg-fey-obsidian px-3 py-1.5 text-xs tnum hover:border-fey-ember/60 border border-transparent transition-colors",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
														className: "absolute inset-y-0 right-0 bg-fey-ember/15 pointer-events-none",
														initial: false,
														animate: { width: `${level.depthPct}%` },
														transition: SPRING
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "relative z-10 font-semibold text-fey-ember",
														children: [level.priceCents, "¢"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "relative z-10 text-fey-mist",
														children: level.shares.toLocaleString("en-US")
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "relative z-10 text-fey-white",
														children: ["$", level.totalUsdc.toLocaleString("en-US")]
													})
												]
											}, `ask-${idx}`))]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "fey-well px-3.5 py-2 flex items-center justify-between text-xs tnum",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-fey-graphite",
												children: "Last Matched Price"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-bold text-fey-white",
												children: [orderbook.lastPriceCents, ".0¢"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1.5",
											"aria-label": "Orderbook Bids",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-caption text-fey-growth px-2",
												children: "Bids (Buy YES)"
											}), orderbook.bids.map((level, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => {
													sfx.tap();
													setSide("yes");
												},
												className: "relative flex w-full items-center justify-between overflow-hidden rounded-well bg-fey-obsidian px-3 py-1.5 text-xs tnum hover:border-fey-growth/60 border border-transparent transition-colors",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
														className: "absolute inset-y-0 right-0 bg-fey-growth/15 pointer-events-none",
														initial: false,
														animate: { width: `${level.depthPct}%` },
														transition: SPRING
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "relative z-10 font-semibold text-fey-growth",
														children: [level.priceCents, "¢"]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "relative z-10 text-fey-mist",
														children: level.shares.toLocaleString("en-US")
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "relative z-10 text-fey-white",
														children: ["$", level.totalUsdc.toLocaleString("en-US")]
													})
												]
											}, `bid-${idx}`))]
										})
									]
								}, "orderbook-body") : null
							})]
						}),
						marketPositions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "space-y-3",
							"aria-label": "Your Position",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-caption text-fey-growth",
									children: "Active Position"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-heading-sm text-fey-white",
									children: "Your Position"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/portfolio",
									className: "text-xs font-medium text-fey-signal hover:underline",
									children: "Open Full Portfolio"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-4",
								children: marketPositions.map((posItem) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PositionManagerCard, {
									item: posItem,
									showMarketLink: false
								}, posItem.tokenId))
							})]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "fey-card overflow-hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-expanded": rulesOpen,
								onClick: () => {
									sfx.tap();
									setRulesOpen((v) => !v);
								},
								className: "flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-fey-obsidian/50 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-heading-sm text-fey-white",
									children: "Polymarket Rules"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-fey-graphite",
									children: [
										"Oracle: ",
										market.oracleSource,
										" · Resolves ",
										market.resolves
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5 shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-pill bg-fey-obsidian border border-fey-smoke px-3 py-1 text-[11px] text-fey-signal",
										children: "Verified Rules"
									}), rulesOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-4 text-fey-mist" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4 text-fey-mist" })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
								initial: false,
								children: rulesOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
									initial: {
										height: 0,
										opacity: 0
									},
									animate: {
										height: "auto",
										opacity: 1
									},
									exit: {
										height: 0,
										opacity: 0
									},
									transition: SPRING,
									className: "border-t border-fey-smoke p-5 space-y-3 bg-fey-obsidian/40",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-body text-fey-mist",
										children: market.rules
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pt-2 space-y-2 border-t border-fey-smoke/60 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-fey-graphite",
													children: "Resolution Source"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-fey-white font-medium text-right",
													children: market.oracleSource
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-fey-graphite",
													children: "End Date"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "tnum text-fey-mist",
													children: [
														market.resolves,
														" (",
														market.endDateIso.slice(0, 10),
														")"
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-fey-graphite",
													children: "Market ID"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "tnum text-fey-signal",
													title: market.conditionId,
													children: shortHex(market.conditionId, 10, 8)
												})]
											})
										]
									})]
								}, "rules-body") : null
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "fey-card p-5 space-y-5 min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between pb-3 border-b border-fey-smoke",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-heading-sm text-fey-white",
								children: "Order Ticket"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tnum text-caption text-fey-signal",
								children: [
									"Slippage ",
									slippagePct.toFixed(1),
									"%"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-2 rounded-pill bg-fey-obsidian border border-fey-smoke p-1.5",
							children: ["yes", "no"].map((option) => {
								const active = side === option;
								const cents = formatCents(option === "yes" ? liveYesMicro : liveNoMicro);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": active,
									onClick: () => {
										sfx.tap();
										setSide(option);
									},
									className: `relative flex h-11 items-center justify-between rounded-pill px-4 text-body font-semibold transition-colors ${active ? "text-fey-white" : "text-fey-graphite hover:text-fey-mist"}`,
									children: [
										active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
											layoutId: "ticket-side-liquid",
											initial: false,
											transition: SPRING,
											className: `absolute inset-0 rounded-pill border ${option === "yes" ? "bg-fey-growth/20 border-fey-growth" : "bg-fey-ember/20 border-fey-ember"}`
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "relative z-10 uppercase",
											children: option
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: `relative z-10 tnum ${option === "yes" ? "text-fey-growth" : "text-fey-ember"}`,
											children: [cents, "¢"]
										})
									]
								}, option);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-caption text-fey-graphite",
										htmlFor: "bet-usdc-input",
										children: "Amount (USDC)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setActiveModal(connected ? "deposit" : "connect"),
										className: "tnum text-xs text-fey-signal hover:underline",
										children: [
											"Balance: $",
											effectiveAvailable > 0 ? formatUsdc(effectiveAvailable) : "0.00",
											" · Add cash"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between rounded-pill bg-fey-obsidian border border-fey-smoke px-4 py-2.5 focus-within:border-fey-signal box-border",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-fey-graphite font-medium",
											children: "$"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											id: "bet-usdc-input",
											type: "text",
											inputMode: "decimal",
											value: amountInput,
											onChange: (e) => {
												setFormError(null);
												setAmountInput(e.target.value);
											},
											className: "w-full min-w-0 bg-transparent px-2 text-heading-sm tnum text-fey-white outline-none"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-caption text-fey-graphite",
											children: "USDC"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-4 gap-2",
									children: [
										"5",
										"25",
										"50",
										"Max"
									].map((chip) => {
										const value = chip === "Max" ? String(Math.max(1, Math.floor(maxDollars))) : chip;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												sfx.tap();
												setFormError(null);
												setAmountInput(value);
											},
											className: `h-9 rounded-pill text-xs font-medium tnum border transition-colors ${amountInput === value ? "bg-fey-ink border-fey-white text-fey-white" : "bg-fey-obsidian border-fey-smoke text-fey-mist hover:text-fey-white"}`,
											children: chip === "Max" ? "Max" : `$${chip}`
										}, chip);
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "fey-well p-3.5 space-y-2 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-fey-graphite",
										children: "Estimated Shares"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum font-medium text-fey-white",
										children: [
											formatShares(estSharesMicro),
											" ",
											side.toUpperCase()
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-fey-graphite",
										children: [
											"Min Shares (",
											slippagePct.toFixed(1),
											"% room)"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tnum text-fey-mist",
										children: formatShares(minSharesMicro)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-fey-graphite",
										children: [
											"Payout if ",
											side.toUpperCase(),
											" wins"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tnum font-semibold text-fey-growth",
										children: [
											"$",
											formatShares(estSharesMicro),
											" USDC"
										]
									})]
								})
							]
						}),
						formError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-well bg-fey-obsidian border border-fey-ember px-3.5 py-2.5 text-xs text-fey-ember",
							children: formError
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: busy,
							onClick: () => void handleTrade(),
							className: "ghost-pill-cta flex h-12 w-full items-center justify-center gap-2 text-body font-semibold disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4 text-fey-ember" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: busy ? "Private routing in progress…" : `Trade · ${side.toUpperCase()} ($${amountInput || "0"} USDC)` })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "fey-well p-4 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-caption text-fey-graphite",
										children: "Private Trade Status"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tnum text-caption text-fey-signal",
										children: liveOrder ? dbStatusOf(liveOrder) ?? "READY" : "READY"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
									className: "space-y-3",
									children: TRACKER_STEPS.map((st, idx) => {
										const isDone = tracker.state === "done" || tracker.activeStep > idx && tracker.state !== "idle";
										const isCurrent = tracker.activeStep === idx && tracker.state === "running";
										const isFailed = tracker.activeStep === idx && tracker.state === "failed";
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											className: "flex items-start gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `mt-1 size-3 shrink-0 rounded-full ${isDone ? "bg-fey-growth" : isCurrent ? "bg-fey-signal node-live pulse-dot" : isFailed ? "bg-fey-ember" : "bg-fey-smoke"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0 flex-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `text-xs font-medium ${isDone || isCurrent ? "text-fey-white" : "text-fey-graphite"}`,
														children: st.title
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "tnum text-[10px] text-fey-graphite",
														children: st.code
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-fey-graphite",
													children: st.detail
												})]
											})]
										}, st.code);
									})
								}),
								liveOrder?.phase === "settled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-3 border-t border-fey-smoke flex flex-wrap items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 text-xs font-medium text-fey-growth",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Position settled" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => void navigate({
											to: "/thank-you",
											search: {
												market: market.question,
												side,
												amount: amountInput
											}
										}),
										className: "inline-flex items-center gap-1 rounded-pill bg-fey-charcoal border border-fey-smoke px-3 py-1 text-xs font-medium text-fey-white hover:border-fey-pale",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "View Receipt" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
									})]
								}) : null,
								solanaSig || polygonHash ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 flex flex-wrap gap-3 text-xs",
									children: [solanaSig ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `https://explorer.solana.com/tx/${solanaSig}?cluster=devnet`,
										target: "_blank",
										rel: "noreferrer",
										className: "text-fey-signal hover:underline inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Solana Explorer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
									}) : null, polygonHash ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: `https://amoy.polygonscan.com/tx/${polygonHash}`,
										target: "_blank",
										rel: "noreferrer",
										className: "text-fey-growth hover:underline inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Polygonscan" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3" })]
									}) : null]
								}) : null
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 bottom-20 z-30 px-4 lg:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "fey-card p-3 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-caption text-fey-graphite block",
						children: [side.toUpperCase(), " PRICE"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "tnum text-heading-sm text-fey-white",
						children: [
							formatCents(activeAskMicro),
							"¢ · $",
							amountInput || "0"
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						onClick: () => void handleTrade(),
						className: "ghost-pill-cta h-10 px-5 text-xs font-semibold",
						children: busy ? "Routing…" : `Trade ${side.toUpperCase()}`
					})]
				})
			})
		]
	});
}
export { TradeExecutionDesk as component };
