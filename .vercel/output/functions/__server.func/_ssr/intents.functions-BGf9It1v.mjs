import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
// node_modules/.nitro/vite/services/ssr/assets/intents.functions-BGf9It1v.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
	return /^[0-9a-f]{64,256}$/i.test(value) || /^[1-9A-HJ-NP-Za-km-z]{32,128}$/.test(value);
}
function assertSave(input) {
	if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid intent ID");
	if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.userSolanaPubkey)) throw new Error("Invalid Solana public key");
	if (!/^0x[0-9a-fA-F]{40}$/.test(input.derivedPolygonAddress)) throw new Error("Invalid Polygon address");
	if (!/^0x[0-9a-fA-F]{64}$/.test(input.marketConditionId)) throw new Error("Invalid market conditionId");
	if (input.outcomeIndex !== 0 && input.outcomeIndex !== 1) throw new Error("Invalid outcome index");
	if (!/^\d{1,12}\.\d{6}$/.test(input.usdcAmountIn)) throw new Error("Invalid USDC amount");
	if (!/^\d{1,12}\.\d{6}$/.test(input.minSharesOut)) throw new Error("Invalid minimum shares");
	if (input.slippageBps !== void 0) {
		if (!Number.isInteger(input.slippageBps) || input.slippageBps < 0 || input.slippageBps > 5e3) throw new Error("Slippage must be between 0.1% and 50.0%");
	}
	if (input.solanaEscrowPda && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.solanaEscrowPda)) throw new Error("Invalid Solana escrow PDA");
	if (input.polygonOrderHash && !/^0x[0-9a-fA-F]{64}$/.test(input.polygonOrderHash)) throw new Error("Invalid Polygon order hash");
	if (input.nearMpcSignature && !okSignature(input.nearMpcSignature)) throw new Error("Invalid signature");
	if (!INTENT_STATUSES.includes(input.status)) throw new Error("Invalid status");
	if (Number.isNaN(Date.parse(input.expiryTimestamp))) throw new Error("Invalid expiry timestamp");
	if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) throw new Error("Invalid nonce");
	return input;
}
function getMemoryIntentStore() {
	const g = globalThis;
	g.__moxieIntentStore__ ??= /* @__PURE__ */ new Map();
	return g.__moxieIntentStore__;
}
var saveIntent_createServerFn_handler = createServerRpc({
	id: "4171eb3af87777ea8da45346db515e8da1f783eb714190edc94b99627465be45",
	name: "saveIntent",
	filename: "src/lib/moxie/intents.functions.ts"
}, (opts) => saveIntent.__executeServer(opts));
var saveIntent = createServerFn({ method: "POST" }).validator(assertSave).handler(saveIntent_createServerFn_handler, async ({ data }) => {
	const slippageBps = data.slippageBps ?? 100;
	const sourceClient = data.sourceClient ?? "WEB";
	const telegramChatId = data.telegramChatId ?? null;
	const solanaTxSig = data.solanaTxSignature ?? null;
	const fallbackRow = {
		id: data.id,
		user_solana_pubkey: data.userSolanaPubkey,
		derived_polygon_address: data.derivedPolygonAddress,
		market_condition_id: data.marketConditionId,
		outcome_index: data.outcomeIndex,
		usdc_amount_in: data.usdcAmountIn,
		min_shares_out: data.minSharesOut,
		slippage_bps: slippageBps,
		source_client: sourceClient,
		telegram_chat_id: telegramChatId,
		solana_escrow_pda: data.solanaEscrowPda,
		solana_tx_signature: solanaTxSig,
		polygon_order_hash: data.polygonOrderHash,
		status: data.status,
		expiry_timestamp: data.expiryTimestamp,
		nonce: data.nonce,
		created_at: (/* @__PURE__ */ new Date()).toISOString()
	};
	const mem = getMemoryIntentStore();
	const prev = mem.get(data.id);
	const mergedRow = {
		...fallbackRow,
		solana_tx_signature: solanaTxSig ?? prev?.solana_tx_signature ?? null,
		created_at: prev?.created_at ?? fallbackRow.created_at
	};
	mem.set(data.id, mergedRow);
	try {
		const { getSql, dbSource } = await import("./db-DopB8LNR.mjs");
		const row = (await (await getSql())`
        insert into intents (
          id, user_solana_pubkey, derived_polygon_address, market_condition_id,
          outcome_index, usdc_amount_in, min_shares_out, slippage_bps,
          source_client, telegram_chat_id, solana_escrow_pda, solana_tx_signature,
          polygon_order_hash, near_mpc_signature, status, expiry_timestamp, nonce
        ) values (
          ${data.id}::uuid,
          ${data.userSolanaPubkey},
          ${data.derivedPolygonAddress},
          ${data.marketConditionId},
          ${data.outcomeIndex},
          ${data.usdcAmountIn}::numeric,
          ${data.minSharesOut}::numeric,
          ${slippageBps},
          ${sourceClient},
          ${telegramChatId},
          ${data.solanaEscrowPda},
          ${solanaTxSig},
          ${data.polygonOrderHash},
          ${data.nearMpcSignature},
          ${data.status}::intent_status,
          ${data.expiryTimestamp}::timestamptz,
          ${data.nonce}
        )
        on conflict (id) do update set
          status = excluded.status,
          solana_escrow_pda = excluded.solana_escrow_pda,
          solana_tx_signature = coalesce(excluded.solana_tx_signature, intents.solana_tx_signature),
          polygon_order_hash = excluded.polygon_order_hash,
          near_mpc_signature = excluded.near_mpc_signature,
          min_shares_out = excluded.min_shares_out,
          slippage_bps = excluded.slippage_bps
        returning id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
          outcome_index, usdc_amount_in::text, min_shares_out::text, slippage_bps,
          source_client, telegram_chat_id, solana_escrow_pda, solana_tx_signature,
          polygon_order_hash, status::text, expiry_timestamp::text, nonce::int, created_at::text
      `)[0] ?? mergedRow;
		mem.set(data.id, row);
		return {
			source: dbSource,
			row
		};
	} catch {
		return {
			source: "pglite",
			row: mergedRow
		};
	}
});
var listIntents_createServerFn_handler = createServerRpc({
	id: "fff1395232e8903f4a50b2aaea3d494ba3acc1139b862d32066e38c9da373fb2",
	name: "listIntents",
	filename: "src/lib/moxie/intents.functions.ts"
}, (opts) => listIntents.__executeServer(opts));
var listIntents = createServerFn({ method: "GET" }).validator((pubkey) => {
	if (typeof pubkey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) throw new Error("Invalid Solana public key");
	return pubkey;
}).handler(listIntents_createServerFn_handler, async ({ data }) => {
	const mem = getMemoryIntentStore();
	const memRows = [...mem.values()].filter((r) => r.user_solana_pubkey === data).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 20);
	try {
		const { getSql, dbSource } = await import("./db-DopB8LNR.mjs");
		const rows = await (await getSql())`
        select id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
          outcome_index, usdc_amount_in::text, min_shares_out::text, slippage_bps,
          source_client, telegram_chat_id, solana_escrow_pda, solana_tx_signature,
          polygon_order_hash, status::text, expiry_timestamp::text, nonce::int, created_at::text
        from intents
        where user_solana_pubkey = ${data}
        order by created_at desc
        limit 20
      `;
		if (rows.length > 0) {
			for (const r of rows) mem.set(r.id, r);
			return {
				source: dbSource,
				rows
			};
		}
		return {
			source: dbSource,
			rows: memRows
		};
	} catch {
		return {
			source: "pglite",
			rows: memRows
		};
	}
});
var reclaimIntentDb_createServerFn_handler = createServerRpc({
	id: "d8831bd592b710cad049ac3195206124bf388bdd9f0ae2475de8af7285d74d4e",
	name: "reclaimIntentDb",
	filename: "src/lib/moxie/intents.functions.ts"
}, (opts) => reclaimIntentDb.__executeServer(opts));
var reclaimIntentDb = createServerFn({ method: "POST" }).validator((id) => {
	if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid intent ID");
	return id;
}).handler(reclaimIntentDb_createServerFn_handler, async ({ data }) => {
	const mem = getMemoryIntentStore();
	const existing = mem.get(data);
	if (existing && [
		"PENDING_ESCROW",
		"ESCROW_LOCKED",
		"SOLVER_BIDDING",
		"EXPIRED"
	].includes(existing.status)) mem.set(data, {
		...existing,
		status: "REFUNDED"
	});
	try {
		const { getSql, dbSource } = await import("./db-DopB8LNR.mjs");
		const row = (await (await getSql())`
        update intents
        set status = 'REFUNDED'
        where id = ${data}::uuid
          and status::text in ('PENDING_ESCROW', 'ESCROW_LOCKED', 'SOLVER_BIDDING', 'EXPIRED')
        returning id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
          outcome_index, usdc_amount_in::text, min_shares_out::text, slippage_bps,
          source_client, telegram_chat_id, solana_escrow_pda, solana_tx_signature,
          polygon_order_hash, status::text, expiry_timestamp::text, nonce::int, created_at::text
      `)[0] ?? mem.get(data) ?? null;
		if (row) mem.set(data, row);
		return {
			source: dbSource,
			row
		};
	} catch {
		return {
			source: "pglite",
			row: mem.get(data) ?? null
		};
	}
});
var stepSolver_createServerFn_handler = createServerRpc({
	id: "11f195d7f2d0fe5b71a98dfff85b6ad125f398a9d4b01f1972baf81163ce55ef",
	name: "stepSolver",
	filename: "src/lib/moxie/intents.functions.ts"
}, (opts) => stepSolver.__executeServer(opts));
var stepSolver = createServerFn({ method: "POST" }).validator((id) => {
	if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid intent ID");
	return id;
}).handler(stepSolver_createServerFn_handler, async ({ data }) => {
	try {
		const { getSql, dbSource } = await import("./db-DopB8LNR.mjs");
		const { stepIntent } = await import("./solver-tick-DacdKc0h.mjs");
		return {
			source: dbSource,
			...await stepIntent(await getSql(), data)
		};
	} catch {
		const row = getMemoryIntentStore().get(data) ?? null;
		return {
			source: "pglite",
			row: row ? {
				id: row.id,
				status: row.status,
				derived_polygon_address: row.derived_polygon_address,
				market_condition_id: row.market_condition_id,
				near_mpc_signature: row.solana_tx_signature,
				polygon_order_hash: row.polygon_order_hash
			} : null,
			note: "fallback",
			blocked: null
		};
	}
});
export { listIntents_createServerFn_handler, reclaimIntentDb_createServerFn_handler, saveIntent_createServerFn_handler, stepSolver_createServerFn_handler };
