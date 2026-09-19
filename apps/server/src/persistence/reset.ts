import type { Pool } from "pg";

import { createPostgresPool } from "./postgres.js";

/*
 * Wipe every game, room, session, result and admin record, keeping the schema.
 *
 * This is for clearing test and rehearsal data before an event. It cannot be
 * undone, so it will not run until the operator names the database it is
 * about to empty, which is what stops it from being pointed at the wrong one.
 *
 * `schema_migrations` is kept on purpose: it records which migrations the
 * schema already has, and emptying it would make the next deploy try to
 * recreate tables that exist.
 */
export const DATA_TABLES = [
  "admin_audit",
  "game_results",
  "action_receipts",
  "game_events",
  "players",
  "games",
  "sessions",
  "rooms"
] as const;

export interface ResetPlan {
  readonly database: string;
  readonly counts: Readonly<Record<string, number>>;
}

export type ResetDecision =
  | { readonly proceed: true }
  | { readonly proceed: false; readonly reason: string };

/** Only an exact match on the database name authorises the wipe. */
export const decideReset = (database: string, confirm: string | undefined): ResetDecision => {
  if (confirm === undefined) {
    return {
      proceed: false,
      reason: `Nothing was deleted. To wipe "${database}", run again with --confirm=${database}`
    };
  }
  if (confirm !== database) {
    return {
      proceed: false,
      reason: `Nothing was deleted. --confirm=${confirm} does not match the connected database "${database}".`
    };
  }
  return { proceed: true };
};

type Queryable = Pick<Pool, "query">;

/** What is there now. Reads only. */
export const inspect = async (db: Queryable): Promise<ResetPlan> => {
  const name = await db.query<{ name: string }>("SELECT current_database() AS name");
  const present = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ANY($1)`,
    [[...DATA_TABLES]]
  );
  const existing = new Set(present.rows.map((row) => row.table_name));
  const counts: Record<string, number> = {};
  for (const table of DATA_TABLES) {
    if (!existing.has(table)) continue;
    const result = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
    counts[table] = result.rows[0]?.n ?? 0;
  }
  return { database: name.rows[0]?.name ?? "unknown", counts };
};

/** Empty every data table in one transaction: all of it goes, or none of it. */
export const wipe = async (pool: Pool, tables: readonly string[]): Promise<void> => {
  if (tables.length === 0) return;
  const client = await pool.connect();
  let failed = false;
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
    await client.query("COMMIT");
  } catch (error) {
    failed = true;
    try { await client.query("ROLLBACK"); } catch { /* keep the real error */ }
    throw error;
  } finally {
    client.release(failed);
  }
};

const describe = (plan: ResetPlan): string => {
  const rows = Object.entries(plan.counts)
    .map(([table, count]) => `  ${table.padEnd(16)} ${count}`)
    .join("\n");
  return `Database: ${plan.database}\n${rows}\n`;
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href
) {
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined) throw new Error("DATABASE_URL is required");
  const confirm = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--confirm="))
    ?.slice("--confirm=".length);

  const pool = createPostgresPool(connectionString);
  try {
    const plan = await inspect(pool);
    process.stdout.write(`About to delete:\n${describe(plan)}`);
    const decision = decideReset(plan.database, confirm);
    if (!decision.proceed) {
      process.stdout.write(`${decision.reason}\n`);
      process.exitCode = 1;
    } else {
      await wipe(pool, Object.keys(plan.counts));
      process.stdout.write(
        `Deleted all game, room, session, result and admin data from "${plan.database}".\n` +
          "Restart the server now. It still holds the old rooms in memory, and every\n" +
          "move in them would fail to save against the emptied tables.\n"
      );
    }
  } finally {
    await pool.end();
  }
}
