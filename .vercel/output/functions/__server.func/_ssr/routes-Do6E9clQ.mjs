import { o as __toESM } from "../_runtime.mjs";
import { G as isRedirect, S as useRouter, X as require_react, Y as require_jsx_runtime, x as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as ParticleOrb } from "./particle-orb-CMeWoiZI.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { F as ed25519, I as sha256, L as bytesToHex } from "../_libs/noble__curves+noble__hashes.mjs";
import { t as base58 } from "../_libs/scure__base.mjs";
import { A as solverAuthMessage, C as recordFill, D as shortHex, E as sharesFor, O as shortKey, S as quoteMessage, T as settleRelease, _ as money6, a as asProtocolError, b as positionsOf, c as encodeIntent, d as formatCents, f as formatShares, g as maxPrice, h as matchSolver, i as ProtocolError, j as useDesk, k as signIntent, l as escrowAddress, m as lockEscrow, n as MARKETS, o as commitmentOf, p as formatUsdc, r as MAX_TICKET, s as complementAsk, t as ErrorCodes, u as fillMessage, v as outcomeTokenId, w as refundEscrow, x as publicKeyFromSecret, y as parseUsdc } from "./store-CamqHgVu.mjs";
import { r as Settings, t as X } from "../_libs/lucide-react.mjs";
import { i as SOLANA_ESCROW_PROGRAM_ID, r as SOLANA_DEVNET_RPC, t as DEVNET_USDC_MINT } from "./constants-C-g3w5gT.mjs";
import { n as motion, r as AnimatePresence, t as useReducedMotion } from "../_libs/framer-motion+[...].mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { i as toUtf8Bytes, n as getAddress, r as keccak256 } from "../_libs/ethers+ws.mjs";
import { a as TransactionInstruction, i as Transaction, n as PublicKey, r as SystemProgram, t as Connection } from "../_libs/@solana/web3.js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Do6E9clQ.js
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
	const combinedSeed = `${nearContractId},${`solana,${solanaPubkey}`}`;
	const hash = keccak256(toUtf8Bytes(combinedSeed));
	return getAddress("0x" + hash.slice(-40));
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
	if (which === "Solflare") return host.solflare ?? (host.solana?.isSolflare ? host.solana : null);
	return host.backpack ?? (host.solana?.isBackpack ? host.solana : null);
}
function openMobileWallet() {
	const origin = window.location.origin;
	const url = `solana-wallet://v1/connect?cluster=devnet&app_url=${encodeURIComponent(origin)}&redirect_link=${encodeURIComponent(origin)}`;
	window.location.assign(url);
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
var CONNECTS = [
	{
		id: "Phantom",
		label: "Phantom",
		hint: "Devnet extension"
	},
	{
		id: "Solflare",
		label: "Solflare",
		hint: "Devnet extension"
	},
	{
		id: "Backpack",
		label: "Backpack",
		hint: "Devnet extension"
	},
	{
		id: "Mobile",
		label: "Mobile wallet",
		hint: "Opens the phone wallet"
	},
	{
		id: "Google",
		label: "Google",
		hint: "On-device Solana key"
	},
	{
		id: "X",
		label: "X",
		hint: "On-device Solana key"
	}
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
	const navigate = useNavigate();
	const [ready, setReady] = (0, import_react.useState)(false);
	const [books, setBooks] = (0, import_react.useState)(initialBooks);
	const [side, setSide] = (0, import_react.useState)("yes");
	const [focusId, setFocusId] = (0, import_react.useState)(MARKETS[0].id);
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
	async function chooseConnect(choice) {
		if (!ready) return;
		sfx.tap();
		if (choice.id === "Phantom" || choice.id === "Solflare" || choice.id === "Backpack") {
			const provider = injectedProvider(choice.id);
			if (provider) try {
				const owner = (await provider.connect()).publicKey.toString();
				const balance = await readDevnetBalance(owner);
				setWallet({
					label: choice.id,
					publicKey: owner,
					provider,
					balance: balance.amount,
					decimals: balance.decimals
				});
				useDesk.getState().connect(choice.label);
				setConnectOpen(false);
				toast(`${choice.label} is on Devnet`);
				pushLog(`[solana] ${choice.label.toLowerCase()} ${shortKey(owner, 4, 4)}`);
				return;
			} catch (error) {
				toast(error instanceof Error ? error.message : "The wallet connection was cancelled.");
				return;
			}
			toast(`${choice.label} isn't in this browser. Using the on-device key instead.`);
		}
		if (choice.id === "Mobile") {
			if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
				openMobileWallet();
				return;
			}
			toast("Mobile wallets open from a phone. Using the on-device key instead.");
		}
		setWallet(null);
		useDesk.getState().connect(choice.label);
		setConnectOpen(false);
		toast(`Connected with ${choice.label}`);
		pushLog(`[auth] ${choice.label.toLowerCase()} → local solana key ${shortKey(useDesk.getState().publicKeyB58, 4, 4)}`);
	}
	function openTrade(marketId, dollars) {
		if (!ready) return;
		sfx.tap();
		setFocusId(marketId);
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
					navigate({
						to: "/thank-you",
						search: {
							market: market.question,
							side,
							amount: trade.amount
						}
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
				navigate({
					to: "/thank-you",
					search: {
						market: market.question,
						side,
						amount: trade.amount
					}
				});
			} else {
				sfx.nope();
				toast(friendly(last.order));
			}
		} finally {
			setBusy(false);
		}
	}
	const maxDollars = Math.min(MAX_TICKET, Math.max(0, available)) / 1e6;
	const focus = MARKETS.find((item) => item.id === focusId) ?? MARKETS[0];
	const focusBook = books[focus.id] ?? {
		yes: focus.yesAskMicro,
		no: complementAsk(focus.yesAskMicro)
	};
	const focusPrice = side === "yes" ? focusBook.yes : focusBook.no;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-abyss text-platinum",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: "dark",
				position: "top-center",
				toastOptions: { style: {
					background: "#011d1c",
					color: "#ffffff",
					border: "none"
				} }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "sticky top-16 z-30 bg-abyss",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3 px-4 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "kicker hidden text-xs text-slate sm:block",
						children: "Solana · NEAR · Polygon"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							wallet || connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-control bg-deep px-3 py-2 text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "stat text-sm leading-none",
									children: wallet ? wallet.balance === null ? "…" : formatToken(wallet.balance, wallet.decimals) : ready ? formatUsdc(available) : "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-mist",
									children: wallet ? "Devnet USDC" : `USDC${locked > 0 ? ` · ${formatUsdc(locked)} locked` : ""}`
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									sfx.tap();
									setConnectOpen(true);
								},
								className: "max-w-36 truncate rounded-control bg-kelp px-3 py-2 text-xs text-foam",
								children: shortHex(polygon)
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !ready,
								onClick: () => setConnectOpen(true),
								className: "h-11 rounded-control bg-cta px-4 text-sm font-medium text-abyss disabled:opacity-50",
								children: "Connect"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setDrawer(true),
								className: "hidden h-11 rounded-control bg-kelp px-3 text-sm text-foam sm:inline-flex",
								children: "Logs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Settings",
								onClick: () => setSettings(true),
								className: "flex size-11 items-center justify-center rounded-control bg-kelp",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-4" })
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "px-4 py-8 pb-28",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid items-center gap-6 md:grid-cols-[1.2fr_0.8fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "kicker text-xs text-slate",
								children: "Markets"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-2 text-4xl text-platinum",
								children: "Lock once. Fill in private."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 max-w-xl text-mist",
								children: "Tap a price, then a size. USDC stays on Solana until a solver fills the market. You don't hold gas or bridge."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-sm text-foam",
								children: wallet ? `via ${wallet.label} · Devnet` : connectLabel ? `via ${connectLabel}` : "not connected"
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ParticleOrb, { className: "mx-auto h-56 w-56 md:h-72 md:w-72" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-8 grid gap-8 md:grid-cols-2",
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
									setFocusId(item.id);
									setSide(next);
								},
								onChip: (dollars) => openTrade(item.id, dollars)
							}) }, item.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "kicker text-xs text-slate",
							children: "Your bets"
						}), positions.length === 0 && chainFills.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm",
							children: "Nothing bought yet. Wins show up on your Polygon address."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-4 space-y-3",
							children: [chainFills.map((fill) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "flex items-center justify-between gap-3 rounded-card bg-deep px-4 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-sm text-platinum",
										children: fill.question
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs text-foam",
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
									className: "flex items-center justify-between gap-3 rounded-card bg-deep px-4 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block truncate text-sm text-platinum",
											children: listed?.question
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-foam",
											children: position.side.toUpperCase()
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "stat text-sm",
										children: formatShares(position.sharesMicro)
									})]
								}, position.tokenId);
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 bottom-0 z-30 bg-deep px-4 py-3 md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-platinum",
								children: focus.question
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "stat text-sm",
								children: [
									side.toUpperCase(),
									" ",
									pct(focusPrice),
									"%"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 rounded-control bg-kelp px-3 text-sm text-foam",
							onClick: () => setDrawer(true),
							children: "Logs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 rounded-control bg-cta px-4 text-sm font-medium text-abyss",
							onClick: () => openTrade(focus.id, "5"),
							children: "Lock $5"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AnimatePresence, { children: [
				connectOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
					onClose: () => setConnectOpen(false),
					title: "Connect",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: "Phantom, Solflare, and Backpack sign the Devnet escrow when the extension is in this browser. Google and X use a Solana key kept on this device. That is not a Privy login. The Polygon address uses the NEAR path solana, then the pubkey. You don't hold gas or bridge."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 grid grid-cols-2 gap-2",
							children: CONNECTS.map((choice) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void chooseConnect(choice),
								className: "h-14 rounded-control bg-kelp px-3 text-left text-sm hover:bg-tide",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block font-medium text-platinum",
									children: choice.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-mist",
									children: choice.hint
								})]
							}, choice.id))
						}),
						connected || wallet ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-3 h-11 text-sm text-mist",
							onClick: () => {
								wallet?.provider.disconnect?.();
								setWallet(null);
								useDesk.getState().disconnect();
								setConnectOpen(false);
							},
							children: "Disconnect"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs text-foam",
							children: polygon ? `Polygon ${shortHex(polygon)} · solana path` : "Polygon address appears after you connect"
						})
					]
				}, "connect") : null,
				settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
					onClose: () => setSettings(false),
					title: "Settings",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "kicker text-xs text-slate",
							children: "Price room"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 flex flex-wrap gap-2",
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
								className: `h-11 rounded-control px-3 text-sm ${slippage === bps ? "bg-cta font-medium text-abyss" : "bg-kelp text-mist"}`,
								children: [(bps / 100).toFixed(2), "% room"]
							}, bps))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "kicker mt-6 text-xs text-slate",
							children: "Practice"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 flex flex-wrap gap-2",
							role: "group",
							"aria-label": "Practice modes",
							children: DRILLS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": drill === item.id,
								onClick: () => setDrill(item.id),
								className: `h-11 rounded-control px-3 text-sm ${drill === item.id ? "bg-foam font-medium text-abyss" : "bg-kelp text-mist"}`,
								children: item.label
							}, item.id))
						})
					]
				}, "settings") : null,
				drawer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
					onClose: () => setDrawer(false),
					title: "Dev console",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-phosphor",
							children: "intents · Devnet DiiRjj…CwK5g · Amoy"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-3 space-y-2",
							children: [rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-xs text-mist",
								children: "no rows yet"
							}) : null, rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "text-xs text-platinum",
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
							className: "mt-4 space-y-1",
							children: [logs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-xs text-mist",
								children: "rpc log is empty"
							}) : null, logs.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "break-all text-xs text-mist",
								children: line
							}, `${line}-${index}`))]
						})
					]
				}, "logs") : null,
				trade && market && book ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
					onClose: () => busy ? void 0 : setTrade(null),
					title: market.question,
					footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [live && !busy && (live.phase === "escrow_locked" || live.phase === "solver_matched") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-12 flex-1 rounded-control bg-kelp text-sm text-foam",
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
							className: "h-12 flex-1 rounded-control bg-cta text-sm font-medium text-abyss disabled:opacity-50",
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
								className: `h-11 flex-1 rounded-control text-sm ${trade.amount === (index === 3 ? String(Math.floor(maxDollars)) : amount) ? "bg-cta font-medium text-abyss" : "bg-kelp text-foam"}`,
								children: index === 3 ? "Max" : `$${amount}`
							}, amount + index))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "kicker mt-4 block text-xs text-slate",
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
							className: "mt-2 h-12 w-full rounded-control bg-abyss px-3 text-platinum outline-none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm",
							children: wallet ? "This locks Devnet USDC in the escrow. Keep the wallet on Devnet. One escrow account per maker." : `Ceiling ${formatCents(maxPrice(side === "yes" ? book.yes : book.no, drill === "slip" ? 0 : slippage))}¢ · pays from Solana USDC`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "mt-4 space-y-4",
							children: TRACK.map((step, index) => {
								const visual = trackState(live);
								const mark = !live ? "wait" : index < visual.index ? "done" : index === visual.index ? visual.mark : "wait";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `mt-1 size-2.5 shrink-0 rounded-full ${mark === "done" ? "bg-foam" : mark === "run" ? "node-live pulse-dot bg-tide" : mark === "fail" ? "bg-phosphor" : "bg-kelp"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `block text-sm ${mark === "wait" ? "text-slate" : "text-platinum"}`,
										children: step.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs text-mist",
										children: step.hint
									})] })]
								}, step.title);
							})
						}),
						live?.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 rounded-card bg-kelp px-3 py-2 text-sm text-foam",
							children: friendly(live)
						}) : null,
						live?.phase === "settled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-sm text-foam",
							children: [
								"Bought ",
								live.intent.side.toUpperCase(),
								". Shares are on your Polygon address."
							]
						}) : null,
						chainSig ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "mt-3 block text-xs text-foam",
							href: `https://explorer.solana.com/tx/${chainSig}?cluster=devnet`,
							target: "_blank",
							rel: "noreferrer",
							children: "View the Solana lock"
						}) : null,
						chainHash ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "mt-1 block text-xs text-phosphor",
							href: `https://amoy.polygonscan.com/tx/${chainHash}`,
							target: "_blank",
							rel: "noreferrer",
							children: "View the Polygon fill"
						}) : null
					]
				}, "trade") : null
			] })
		]
	});
}
function MarketCard({ market, yes, no, side, maxDollars, onSide, onChip }) {
	const reduce = useReducedMotion();
	const yesPct = Math.max(8, Math.min(92, Number(pct(yes))));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
		className: "rounded-card bg-kelp p-5",
		whileHover: reduce ? void 0 : { scale: 1.02 },
		whileTap: reduce ? void 0 : { scale: .98 },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "kicker text-xs text-slate",
				children: [
					market.venue,
					" · ",
					market.resolves,
					" · 24h ",
					market.volume
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-3 text-lg leading-snug text-platinum",
				children: market.question
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex h-1.5 overflow-hidden rounded-control bg-deep",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full bg-tide",
					style: { width: `${yesPct}%` }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full flex-1 bg-foam" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": side === "yes",
					onClick: () => onSide("yes"),
					className: `h-14 rounded-control px-3 text-left ${side === "yes" ? "bg-deep" : "bg-abyss"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-mist",
						children: "Yes"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "stat text-lg",
						children: [pct(yes), "%"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-pressed": side === "no",
					onClick: () => onSide("no"),
					className: `h-14 rounded-control px-3 text-left ${side === "no" ? "bg-deep" : "bg-abyss"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-xs text-mist",
						children: "No"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "stat text-lg",
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
					className: "h-11 flex-1 rounded-control bg-deep text-sm text-foam",
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
		className: `h-14 rounded-control px-3 text-left ${pressed ? "bg-deep" : "bg-kelp"}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-xs text-mist",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "stat",
			children: [cents, "¢"]
		})]
	});
}
function Sheet({ title, onClose, children, footer }) {
	const reduce = useReducedMotion();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-abyss/80 p-3 sm:items-center",
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
				stiffness: 280,
				damping: 26
			},
			className: "relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-deep p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg leading-snug text-platinum",
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Close dialog",
						onClick: onClose,
						className: "flex size-11 shrink-0 items-center justify-center rounded-control bg-kelp",
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
