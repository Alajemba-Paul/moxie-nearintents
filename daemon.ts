import pg from "pg";
import { actionableIds, stepIntent, type TickSql } from "./src/lib/moxie/solver-tick.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("No DATABASE_URL. Devnet locks in the preview are stepped by the app itself.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: databaseUrl });
const sql: TickSql = {
  query: async <T>(text: string, params: unknown[] = []) => {
    const result = await pool.query(text, params);
    return result.rows as T[];
  },
};

console.log("Moxie solver watching intents");
let stopped = false;
process.on("SIGINT", () => {
  stopped = true;
});

while (!stopped) {
  const ids = await actionableIds(sql);
  for (const id of ids) {
    const stepped = await stepIntent(sql, id);
    console.log(stepped.row?.status ?? "missing", stepped.note);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

await pool.end();
