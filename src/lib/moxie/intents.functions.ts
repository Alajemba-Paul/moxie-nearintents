import { createServerFn } from "@tanstack/react-start";

export const INTENT_STATUSES = [
  "PENDING_ESCROW",
  "ESCROW_LOCKED",
  "SOLVER_BIDDING",
  "CLOB_SUBMITTED",
  "SETTLED",
  "REFUNDED",
  "EXPIRED",
] as const;

export type IntentStatus = (typeof INTENT_STATUSES)[number];

export interface IntentRow {
  id: string;
  user_solana_pubkey: string;
  derived_polygon_address: string;
  market_condition_id: string;
  outcome_index: number;
  usdc_amount_in: string;
  min_shares_out: string;
  solana_escrow_pda: string | null;
  polygon_order_hash: string | null;
  status: IntentStatus;
  nonce: number;
  created_at: string;
}

export interface SaveIntentInput {
  id: string;
  userSolanaPubkey: string;
  derivedPolygonAddress: string;
  marketConditionId: string;
  outcomeIndex: number;
  usdcAmountIn: string;
  minSharesOut: string;
  solanaEscrowPda: string | null;
  polygonOrderHash: string | null;
  nearMpcSignature: string | null;
  status: IntentStatus;
  expiryTimestamp: string;
  nonce: number;
}

function assertSave(input: SaveIntentInput): SaveIntentInput {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("bad id");
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.userSolanaPubkey)) throw new Error("bad key");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.derivedPolygonAddress)) throw new Error("bad polygon address");
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.marketConditionId)) throw new Error("bad market");
  if (input.outcomeIndex !== 0 && input.outcomeIndex !== 1) throw new Error("bad outcome");
  if (!/^\d{1,12}\.\d{6}$/.test(input.usdcAmountIn)) throw new Error("bad amount");
  if (!/^\d{1,12}\.\d{6}$/.test(input.minSharesOut)) throw new Error("bad shares");
  if (input.solanaEscrowPda && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.solanaEscrowPda)) {
    throw new Error("bad pda");
  }
  if (input.polygonOrderHash && !/^0x[0-9a-fA-F]{64}$/.test(input.polygonOrderHash)) {
    throw new Error("bad fill hash");
  }
  if (input.nearMpcSignature && !/^[0-9a-f]{64,256}$/i.test(input.nearMpcSignature)) {
    throw new Error("bad signature");
  }
  if (!INTENT_STATUSES.includes(input.status)) throw new Error("bad status");
  if (Number.isNaN(Date.parse(input.expiryTimestamp))) throw new Error("bad expiry");
  if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) throw new Error("bad nonce");
  return input;
}

export const saveIntent = createServerFn({ method: "POST" })
  .validator(assertSave)
  .handler(async ({ data }) => {
    const { getSql, dbSource } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<IntentRow>`
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
    `;
    const row = rows[0];
    if (!row) throw new Error("intent was not saved");
    return { source: dbSource, row };
  });

export const listIntents = createServerFn({ method: "GET" })
  .validator((pubkey: string) => {
    if (typeof pubkey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) {
      throw new Error("bad key");
    }
    return pubkey;
  })
  .handler(async ({ data }) => {
    const { getSql, dbSource } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<IntentRow>`
      select id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
        outcome_index, usdc_amount_in::text, min_shares_out::text, solana_escrow_pda,
        polygon_order_hash, status::text, nonce::int, created_at::text
      from intents
      where user_solana_pubkey = ${data}
      order by created_at desc
      limit 8
    `;
    return { source: dbSource, rows };
  });
