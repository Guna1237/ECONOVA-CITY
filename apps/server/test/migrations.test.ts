import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../database/migrations/001_initial.sql", import.meta.url)
);
const recoveryMigrationPath = fileURLToPath(
  new URL("../../../database/migrations/002_phase2_recovery.sql", import.meta.url)
);

describe("initial PostgreSQL migration", () => {
  it("defines every approved Phase 1 persistence table", async () => {
    const sql = await readFile(migrationPath, "utf8");
    for (const table of [
      "games",
      "players",
      "sessions",
      "game_events",
      "action_receipts",
      "game_results",
      "admin_audit",
      "schema_migrations"
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"));
    }
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("COMMIT;");
  });

  it("constrains action receipts and event order for idempotent recovery", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toMatch(/PRIMARY KEY \(game_id, action_id\)/i);
    expect(sql).toMatch(/UNIQUE \(game_id, state_version, event_index\)/i);
    expect(sql).toMatch(/token_hash CHAR\(64\) NOT NULL UNIQUE/i);
  });

  it("adds recoverable room codes and room-bound admin sessions", async () => {
    const sql = await readFile(recoveryMigrationPath, "utf8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS room_code TEXT/i);
    expect(sql).toMatch(/role = 'admin' AND player_id IS NULL/i);
    expect(sql).not.toMatch(/role = 'admin' AND room_id IS NULL AND player_id IS NULL/i);
  });
});
