import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/intents.functions-BYORkuv0.js
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
	if (input.nearMpcSignature && !/^[0-9a-f]{64,256}$/i.test(input.nearMpcSignature)) throw new Error("bad signature");
	if (!INTENT_STATUSES.includes(input.status)) throw new Error("bad status");
	if (Number.isNaN(Date.parse(input.expiryTimestamp))) throw new Error("bad expiry");
	if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) throw new Error("bad nonce");
	return input;
}
var saveIntent_createServerFn_handler = createServerRpc({
	id: "4171eb3af87777ea8da45346db515e8da1f783eb714190edc94b99627465be45",
	name: "saveIntent",
	filename: "src/lib/moxie/intents.functions.ts"
}, (opts) => saveIntent.__executeServer(opts));
var saveIntent = createServerFn({ method: "POST" }).validator(assertSave).handler(saveIntent_createServerFn_handler, async ({ data }) => {
	const { getSql, dbSource } = await import("./db-DtvRonbb.mjs");
	const row = (await (await getSql())`
      insert into intents (
        id, user_solana_pubkey, derived_polygon_address, market_condition_id,
        outcome_index, usdc_amount_in, min_shares_out, solana_escrow_pda,
        polygon_order_hash, near_mpc_signature, status, expiry_timestamp, nonce
      ) values (
        ${data.id}::uuid,
        ${data.userSolanaPubkey},
        ${data.derivedPolygonAddress},
        ${data.marketConditionId},
        ${data.outcomeIndex},
        ${data.usdcAmountIn}::numeric,
        ${data.minSharesOut}::numeric,
        ${data.solanaEscrowPda},
        ${data.polygonOrderHash},
        ${data.nearMpcSignature},
        ${data.status}::intent_status,
        ${data.expiryTimestamp}::timestamptz,
        ${data.nonce}
      )
      on conflict (id) do update set
        status = excluded.status,
        solana_escrow_pda = excluded.solana_escrow_pda,
        polygon_order_hash = excluded.polygon_order_hash,
        near_mpc_signature = excluded.near_mpc_signature,
        min_shares_out = excluded.min_shares_out
      returning id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
        outcome_index, usdc_amount_in::text, min_shares_out::text, solana_escrow_pda,
        polygon_order_hash, status::text, nonce::int, created_at::text
    `)[0];
	if (!row) throw new Error("intent was not saved");
	return {
		source: dbSource,
		row
	};
});
var listIntents_createServerFn_handler = createServerRpc({
	id: "fff1395232e8903f4a50b2aaea3d494ba3acc1139b862d32066e38c9da373fb2",
	name: "listIntents",
	filename: "src/lib/moxie/intents.functions.ts"
}, (opts) => listIntents.__executeServer(opts));
var listIntents = createServerFn({ method: "GET" }).validator((pubkey) => {
	if (typeof pubkey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) throw new Error("bad key");
	return pubkey;
}).handler(listIntents_createServerFn_handler, async ({ data }) => {
	const { getSql, dbSource } = await import("./db-DtvRonbb.mjs");
	return {
		source: dbSource,
		rows: await (await getSql())`
      select id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
        outcome_index, usdc_amount_in::text, min_shares_out::text, solana_escrow_pda,
        polygon_order_hash, status::text, nonce::int, created_at::text
      from intents
      where user_solana_pubkey = ${data}
      order by created_at desc
      limit 8
    `
	};
});
//#endregion
export { listIntents_createServerFn_handler, saveIntent_createServerFn_handler };
