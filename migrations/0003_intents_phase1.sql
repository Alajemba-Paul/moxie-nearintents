alter table intents add column if not exists slippage_bps int not null default 100;
alter table intents add column if not exists source_client varchar(20) not null default 'WEB';
alter table intents add column if not exists telegram_chat_id varchar(64);
alter table intents add column if not exists solana_tx_signature varchar(88);

create index if not exists idx_intents_status on intents(status);
create index if not exists idx_intents_user on intents(user_solana_pubkey);
