import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createPostgresPool } from "./postgres.js";

const migrationDirectory = fileURLToPath(
  new URL("../../../../database/migrations/", import.meta.url)
);

export const runMigrations = async (connectionString: string): Promise<string[]> => {
  const pool = createPostgresPool(connectionString);
  const applied: string[] = [];
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );
    const files = (await readdir(migrationDirectory))
      .filter((file) => /^\d+.*\.sql$/.test(file))
      .sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      const exists = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [
        version
      ]);
      if ((exists.rowCount ?? 0) > 0) continue;
      const sql = await readFile(`${migrationDirectory}/${file}`, "utf8");
      await pool.query(sql);
      applied.push(version);
    }
    return applied;
  } finally {
    await pool.end();
  }
};

if (process.argv[1] !== undefined && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href) {
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined) throw new Error("DATABASE_URL is required");
  const applied = await runMigrations(connectionString);
  process.stdout.write(`Applied migrations: ${applied.join(", ") || "none"}\n`);
}
