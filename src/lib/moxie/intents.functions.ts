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
  slippage_bps: number;
  source_client: string;
  telegram_chat_id: string | null;
  solana_escrow_pda: string | null;
  solana_tx_signature: string | null;
  polygon_order_hash: string | null;
  status: IntentStatus;
  expiry_timestamp: string;
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
  slippageBps?: number;
  sourceClient?: "WEB" | "MCP" | "TELEGRAM";
  telegramChatId?: string | null;
  solanaEscrowPda: string | null;
  solanaTxSignature?: string | null;
  polygonOrderHash: string | null;
  nearMpcSignature: string | null;
  status: IntentStatus;
  expiryTimestamp: string;
  nonce: number;
}

function okSignature(value: string): boolean {
  return /^[0-9a-f]{64,256}$/i.test(value) || /^[1-9A-HJ-NP-Za-km-z]{32,128}$/.test(value);
}

function assertSave(input: SaveIntentInput): SaveIntentInput {
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid intent ID");
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.userSolanaPubkey)) throw new Error("Invalid Solana public key");
  if (!/^0x[0-9a-fA-F]{40}$/.test(input.derivedPolygonAddress)) throw new Error("Invalid Polygon address");
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.marketConditionId)) throw new Error("Invalid market conditionId");
  if (input.outcomeIndex !== 0 && input.outcomeIndex !== 1) throw new Error("Invalid outcome index");
  if (!/^\d{1,12}\.\d{6}$/.test(input.usdcAmountIn)) throw new Error("Invalid USDC amount");
  if (!/^\d{1,12}\.\d{6}$/.test(input.minSharesOut)) throw new Error("Invalid minimum shares");
  if (input.slippageBps !== undefined) {
    if (!Number.isInteger(input.slippageBps) || input.slippageBps < 0 || input.slippageBps > 5000) {
      throw new Error("Slippage must be between 0.1% and 50.0%");
    }
  }
  if (input.solanaEscrowPda && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input.solanaEscrowPda)) {
    throw new Error("Invalid Solana escrow PDA");
  }
  if (input.polygonOrderHash && !/^0x[0-9a-fA-F]{64}$/.test(input.polygonOrderHash)) {
    throw new Error("Invalid Polygon order hash");
  }
  if (input.nearMpcSignature && !okSignature(input.nearMpcSignature)) {
    throw new Error("Invalid signature");
  }
  if (!INTENT_STATUSES.includes(input.status)) throw new Error("Invalid status");
  if (Number.isNaN(Date.parse(input.expiryTimestamp))) throw new Error("Invalid expiry timestamp");
  if (!Number.isSafeInteger(input.nonce) || input.nonce < 0) throw new Error("Invalid nonce");
  return input;
}

export const saveIntent = createServerFn({ method: "POST" })
  .validator(assertSave)
  .handler(async ({ data }) => {
    const { getSql, dbSource } = await import("@/lib/db");
    const sql = await getSql();
    const slippageBps = data.slippageBps ?? 100;
    const sourceClient = data.sourceClient ?? "WEB";
    const telegramChatId = data.telegramChatId ?? null;
    const solanaTxSig = data.solanaTxSignature ?? null;

    const rows = await sql<IntentRow>`
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
    `;
    const row = rows[0];
    if (!row) throw new Error("Intent was not saved");
    return { source: dbSource, row };
  });

export const listIntents = createServerFn({ method: "GET" })
  .validator((pubkey: string) => {
    if (typeof pubkey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) {
      throw new Error("Invalid Solana public key");
    }
    return pubkey;
  })
  .handler(async ({ data }) => {
    const { getSql, dbSource } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<IntentRow>`
      select id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
        outcome_index, usdc_amount_in::text, min_shares_out::text, slippage_bps,
        source_client, telegram_chat_id, solana_escrow_pda, solana_tx_signature,
        polygon_order_hash, status::text, expiry_timestamp::text, nonce::int, created_at::text
      from intents
      where user_solana_pubkey = ${data}
      order by created_at desc
      limit 20
    `;
    return { source: dbSource, rows };
  });

export const reclaimIntentDb = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid intent ID");
    return id;
  })
  .handler(async ({ data }) => {
    const { getSql, dbSource } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<IntentRow>`
      update intents
      set status = 'REFUNDED'
      where id = ${data}::uuid
        and status::text in ('PENDING_ESCROW', 'ESCROW_LOCKED', 'SOLVER_BIDDING', 'EXPIRED')
      returning id::text, user_solana_pubkey, derived_polygon_address, market_condition_id,
        outcome_index, usdc_amount_in::text, min_shares_out::text, slippage_bps,
        source_client, telegram_chat_id, solana_escrow_pda, solana_tx_signature,
        polygon_order_hash, status::text, expiry_timestamp::text, nonce::int, created_at::text
    `;
    return { source: dbSource, row: rows[0] ?? null };
  });

export const stepSolver = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid intent ID");
    return id;
  })
  .handler(async ({ data }) => {
    const { getSql, dbSource } = await import("@/lib/db");
    const { stepIntent } = await import("./solver-tick.ts");
    const sql = await getSql();
    const stepped = await stepIntent(sql, data);
    return { source: dbSource, ...stepped };
  });
