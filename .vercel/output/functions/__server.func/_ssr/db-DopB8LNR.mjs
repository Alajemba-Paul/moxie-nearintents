// node_modules/.nitro/vite/services/ssr/assets/db-DopB8LNR.js
var _0002_intents_default = "do $$ begin\n  create type intent_status as enum (\n    'PENDING_ESCROW',\n    'ESCROW_LOCKED',\n    'SOLVER_BIDDING',\n    'CLOB_SUBMITTED',\n    'SETTLED',\n    'REFUNDED',\n    'EXPIRED'\n  );\nexception\n  when duplicate_object then null;\nend $$;\n\ncreate table if not exists intents (\n  id uuid primary key,\n  user_solana_pubkey varchar(44) not null,\n  derived_polygon_address varchar(42) not null,\n  market_condition_id varchar(66) not null,\n  outcome_index int not null,\n  usdc_amount_in numeric(18, 6) not null,\n  min_shares_out numeric(18, 6) not null,\n  solana_escrow_pda varchar(44),\n  polygon_order_hash varchar(66),\n  near_mpc_signature text,\n  status intent_status not null default 'PENDING_ESCROW',\n  expiry_timestamp timestamptz not null,\n  nonce bigint not null,\n  created_at timestamptz not null default now(),\n  unique (user_solana_pubkey, nonce)\n);\n\ncreate index if not exists intents_created_idx on intents (created_at desc);\n";
var _0003_intents_phase1_default = "alter table intents add column if not exists slippage_bps int not null default 100;\nalter table intents add column if not exists source_client varchar(20) not null default 'WEB';\nalter table intents add column if not exists telegram_chat_id varchar(64);\nalter table intents add column if not exists solana_tx_signature varchar(88);\n\ncreate index if not exists idx_intents_status on intents(status);\ncreate index if not exists idx_intents_user on intents(user_solana_pubkey);\n";
var _0004_wallet_onboarding_default = "create table if not exists wallet_onboarding (\n  solana_pubkey varchar(44) primary key,\n  polygon_address varchar(42) not null,\n  sol_tx_sig varchar(128) not null,\n  usdc_tx_sig varchar(128) not null,\n  pol_tx_hash varchar(80) not null,\n  sol_amount varchar(16) not null default '0.1',\n  usdc_amount int not null default 1000,\n  pol_amount varchar(16) not null default '0.1',\n  funded_at timestamptz not null default now()\n);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function canLoadPgliteAssets() {
	try {
		if (typeof process !== "undefined" && process?.env && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) return false;
		const { existsSync } = await import("node:fs");
		const { dirname, join } = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const moduleDir = dirname(fileURLToPath(import.meta.url));
		if (moduleDir.includes(".vercel")) return existsSync(join(moduleDir, "pglite.data")) || existsSync(join(moduleDir, "../_libs/pglite.data"));
		return true;
	} catch {
		return false;
	}
}
async function createPgliteSql() {
	if (!await canLoadPgliteAssets()) throw new Error("PGLite WASM data files are not bundled in this serverless runtime");
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({
			"/migrations/0002_intents.sql": _0002_intents_default,
			"/migrations/0003_intents_phase1.sql": _0003_intents_phase1_default,
			"/migrations/0004_wallet_onboarding.sql": _0004_wallet_onboarding_default
		});
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
function createMemorySql() {
	return toSql(async () => []);
}
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	try {
		return dbSource === "neon" ? await createNeonSql() : await createPgliteSql();
	} catch (err) {
		console.warn("[db] Database backend unavailable in this runtime; falling back to in-memory store:", err instanceof Error ? err.message : err);
		return createMemorySql();
	}
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		console.warn("[db] getSql fallback:", err instanceof Error ? err.message : err);
		return createMemorySql();
	});
	return sqlPromise;
}
export { dbSource, getSql };
