import { POLYGON_AMOY_RPC } from "../../config/constants.ts";

export interface TickRow {
  id: string;
  status: string;
  derived_polygon_address: string;
  market_condition_id: string;
  near_mpc_signature: string | null;
  polygon_order_hash: string | null;
}

export interface TickSql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface TickResult {
  row: TickRow | null;
  note: string;
  blocked: string | null;
}

const SOLANA_SIG = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export function isSolanaSignature(value: string | null | undefined): boolean {
  return Boolean(value && SOLANA_SIG.test(value));
}

async function broadcastAmoy(to: string, data: string): Promise<string> {
  const key = process.env.SOLVER_EVM_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error("No solver key on this server, so the Amoy fill was not broadcast.");
  }
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC, 80002, { staticNetwork: true });
  const wallet = new ethers.Wallet(key, provider);
  const sent = await wallet.sendTransaction({ to, data, value: 0n });
  return sent.hash;
}

export async function stepIntent(sql: TickSql, id: string): Promise<TickResult> {
  const found = await sql.query<TickRow>(
    `select id::text, status::text, derived_polygon_address, market_condition_id,
            near_mpc_signature, polygon_order_hash
     from intents where id = $1::uuid`,
    [id],
  );
  const row = found[0];
  if (!row) return { row: null, note: "intent missing", blocked: "That intent is not in the database." };
  if (!isSolanaSignature(row.near_mpc_signature)) {
    return { row, note: "paper row", blocked: null };
  }

  if (row.status === "ESCROW_LOCKED") {
    const next = await sql.query<TickRow>(
      `update intents set status = 'SOLVER_BIDDING'
       where id = $1::uuid and status = 'ESCROW_LOCKED'
       returning id::text, status::text, derived_polygon_address, market_condition_id,
         near_mpc_signature, polygon_order_hash`,
      [id],
    );
    return { row: next[0] ?? row, note: "solver bidding", blocked: null };
  }

  if (row.status === "SOLVER_BIDDING" || (row.status === "CLOB_SUBMITTED" && !row.polygon_order_hash)) {
    try {
      const hash = await broadcastAmoy(row.derived_polygon_address, row.market_condition_id);
      const next = await sql.query<TickRow>(
        `update intents set status = 'CLOB_SUBMITTED', polygon_order_hash = $2
         where id = $1::uuid and status::text in ('SOLVER_BIDDING', 'CLOB_SUBMITTED')
         returning id::text, status::text, derived_polygon_address, market_condition_id,
           near_mpc_signature, polygon_order_hash`,
        [id, hash],
      );
      return { row: next[0] ?? { ...row, status: "CLOB_SUBMITTED", polygon_order_hash: hash }, note: `amoy ${hash}`, blocked: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Amoy broadcast failed";
      return { row, note: message, blocked: message };
    }
  }

  if (row.status === "CLOB_SUBMITTED" && row.polygon_order_hash) {
    const next = await sql.query<TickRow>(
      `update intents set status = 'SETTLED'
       where id = $1::uuid and status = 'CLOB_SUBMITTED'
       returning id::text, status::text, derived_polygon_address, market_condition_id,
         near_mpc_signature, polygon_order_hash`,
      [id],
    );
    return { row: next[0] ?? { ...row, status: "SETTLED" }, note: "settled", blocked: null };
  }

  return { row, note: row.status.toLowerCase(), blocked: null };
}

export async function actionableIds(sql: TickSql): Promise<string[]> {
  const rows = await sql.query<{ id: string }>(
    `select id::text from intents
     where status::text in ('ESCROW_LOCKED', 'SOLVER_BIDDING', 'CLOB_SUBMITTED')
       and near_mpc_signature ~ '^[1-9A-HJ-NP-Za-km-z]{80,90}$'
     order by created_at asc
     limit 8`,
  );
  return rows.map((row) => row.id);
}
