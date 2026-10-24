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

function getMemoryIntentStore(): Map<string, IntentRow> {
  const g = globalThis as typeof globalThis & {
    __moxieIntentStore__?: Map<string, IntentRow>;
  };
  g.__moxieIntentStore__ ??= new Map<string, IntentRow>();
  return g.__moxieIntentStore__;
}

export const saveIntent = createServerFn({ method: "POST" })
  .validator(assertSave)
  .handler(async ({ data }) => {
    const slippageBps = data.slippageBps ?? 100;
    const sourceClient = data.sourceClient ?? "WEB";
    const telegramChatId = data.telegramChatId ?? null;
    const solanaTxSig = data.solanaTxSignature ?? null;

    const fallbackRow: IntentRow = {
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
      created_at: new Date().toISOString(),
    };

    const mem = getMemoryIntentStore();
    const prev = mem.get(data.id);
    const mergedRow: IntentRow = {
      ...fallbackRow,
      solana_tx_signature: solanaTxSig ?? prev?.solana_tx_signature ?? null,
      created_at: prev?.created_at ?? fallbackRow.created_at,
    };
    mem.set(data.id, mergedRow);

    try {
      const { getSql, dbSource } = await import("@/lib/db");
      const sql = await getSql();

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
      const row = rows[0] ?? mergedRow;
      mem.set(data.id, row);
      return { source: dbSource, row };
    } catch {
      return { source: "pglite" as const, row: mergedRow };
    }
  });

export const listIntents = createServerFn({ method: "GET" })
  .validator((pubkey: string) => {
    if (typeof pubkey !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) {
      throw new Error("Invalid Solana public key");
    }
    return pubkey;
  })
  .handler(async ({ data }) => {
    const mem = getMemoryIntentStore();
    const memRows = [...mem.values()]
      .filter((r) => r.user_solana_pubkey === data)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 20);

    try {
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
      if (rows.length > 0) {
        for (const r of rows) mem.set(r.id, r);
        return { source: dbSource, rows };
      }
      return { source: dbSource, rows: memRows };
    } catch {
      return { source: "pglite" as const, rows: memRows };
    }
  });

export const reclaimIntentDb = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid intent ID");
    return id;
  })
  .handler(async ({ data }) => {
    const mem = getMemoryIntentStore();
    const existing = mem.get(data);
    if (
      existing &&
      ["PENDING_ESCROW", "ESCROW_LOCKED", "SOLVER_BIDDING", "EXPIRED"].includes(existing.status)
    ) {
      mem.set(data, { ...existing, status: "REFUNDED" });
    }

    try {
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
      const row = rows[0] ?? mem.get(data) ?? null;
      if (row) mem.set(data, row);
      return { source: dbSource, row };
    } catch {
      return { source: "pglite" as const, row: mem.get(data) ?? null };
    }
  });

export const stepSolver = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid intent ID");
    return id;
  })
  .handler(async ({ data }) => {
    try {
      const { getSql, dbSource } = await import("@/lib/db");
      const { stepIntent } = await import("./solver-tick.ts");
      const sql = await getSql();
      const stepped = await stepIntent(sql, data);
      return { source: dbSource, ...stepped };
    } catch {
      const mem = getMemoryIntentStore();
      const row = mem.get(data) ?? null;
      return {
        source: "pglite" as const,
        row: row
          ? {
              id: row.id,
              status: row.status,
              derived_polygon_address: row.derived_polygon_address,
              market_condition_id: row.market_condition_id,
              near_mpc_signature: row.solana_tx_signature,
              polygon_order_hash: row.polygon_order_hash,
            }
          : null,
        note: "fallback",
        blocked: null,
      };
    }
  });

