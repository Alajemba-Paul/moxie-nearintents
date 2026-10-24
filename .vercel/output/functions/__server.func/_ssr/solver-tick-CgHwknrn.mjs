import { i as POLYGON_AMOY_RPC } from "./constants-D25iXV32.mjs";
// node_modules/.nitro/vite/services/ssr/assets/solver-tick-CgHwknrn.js
var SOLANA_SIG = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
function isSolanaSignature(value) {
	return Boolean(value && SOLANA_SIG.test(value));
}
async function broadcastAmoy(to, data) {
	const key = process.env.SOLVER_EVM_PRIVATE_KEY?.trim();
	if (!key) throw new Error("No solver key on this server, so the Amoy fill was not broadcast.");
	const { ethers } = await import("../_libs/ethers.mjs").then((n) => n.t);
	const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC, 80002, { staticNetwork: true });
	return (await new ethers.Wallet(key, provider).sendTransaction({
		to,
		data,
		value: 0n
	})).hash;
}
async function stepIntent(sql, id) {
	const row = (await sql.query(`select id::text, status::text, derived_polygon_address, market_condition_id,
            near_mpc_signature, polygon_order_hash
     from intents where id = $1::uuid`, [id]))[0];
	if (!row) return {
		row: null,
		note: "intent missing",
		blocked: "That intent is not in the database."
	};
	if (!isSolanaSignature(row.near_mpc_signature)) return {
		row,
		note: "paper row",
		blocked: null
	};
	if (row.status === "ESCROW_LOCKED") return {
		row: (await sql.query(`update intents set status = 'SOLVER_BIDDING'
       where id = $1::uuid and status = 'ESCROW_LOCKED'
       returning id::text, status::text, derived_polygon_address, market_condition_id,
         near_mpc_signature, polygon_order_hash`, [id]))[0] ?? row,
		note: "solver bidding",
		blocked: null
	};
	if (row.status === "SOLVER_BIDDING" || row.status === "CLOB_SUBMITTED" && !row.polygon_order_hash) try {
		const hash = await broadcastAmoy(row.derived_polygon_address, row.market_condition_id);
		return {
			row: (await sql.query(`update intents set status = 'CLOB_SUBMITTED', polygon_order_hash = $2
         where id = $1::uuid and status::text in ('SOLVER_BIDDING', 'CLOB_SUBMITTED')
         returning id::text, status::text, derived_polygon_address, market_condition_id,
           near_mpc_signature, polygon_order_hash`, [id, hash]))[0] ?? {
				...row,
				status: "CLOB_SUBMITTED",
				polygon_order_hash: hash
			},
			note: `amoy ${hash}`,
			blocked: null
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Amoy broadcast failed";
		return {
			row,
			note: message,
			blocked: message
		};
	}
	if (row.status === "CLOB_SUBMITTED" && row.polygon_order_hash) return {
		row: (await sql.query(`update intents set status = 'SETTLED'
       where id = $1::uuid and status = 'CLOB_SUBMITTED'
       returning id::text, status::text, derived_polygon_address, market_condition_id,
         near_mpc_signature, polygon_order_hash`, [id]))[0] ?? {
			...row,
			status: "SETTLED"
		},
		note: "settled",
		blocked: null
	};
	return {
		row,
		note: row.status.toLowerCase(),
		blocked: null
	};
}
export { stepIntent };
