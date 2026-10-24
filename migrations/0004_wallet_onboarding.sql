create table if not exists wallet_onboarding (
  solana_pubkey varchar(44) primary key,
  polygon_address varchar(42) not null,
  sol_tx_sig varchar(128) not null,
  usdc_tx_sig varchar(128) not null,
  pol_tx_hash varchar(80) not null,
  sol_amount varchar(16) not null default '0.1',
  usdc_amount int not null default 1000,
  pol_amount varchar(16) not null default '0.1',
  funded_at timestamptz not null default now()
);
