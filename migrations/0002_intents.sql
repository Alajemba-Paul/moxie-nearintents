do $$ begin
  create type intent_status as enum (
    'PENDING_ESCROW',
    'ESCROW_LOCKED',
    'SOLVER_BIDDING',
    'CLOB_SUBMITTED',
    'SETTLED',
    'REFUNDED',
    'EXPIRED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists intents (
  id uuid primary key,
  user_solana_pubkey varchar(44) not null,
  derived_polygon_address varchar(42) not null,
  market_condition_id varchar(66) not null,
  outcome_index int not null,
  usdc_amount_in numeric(18, 6) not null,
  min_shares_out numeric(18, 6) not null,
  solana_escrow_pda varchar(44),
  polygon_order_hash varchar(66),
  near_mpc_signature text,
  status intent_status not null default 'PENDING_ESCROW',
  expiry_timestamp timestamptz not null,
  nonce bigint not null,
  created_at timestamptz not null default now(),
  unique (user_solana_pubkey, nonce)
);

create index if not exists intents_created_idx on intents (created_at desc);
