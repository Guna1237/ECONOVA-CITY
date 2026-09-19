import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import { DATA_TABLES, decideReset, inspect, wipe } from "../src/persistence/reset.js";

/**
 * The reset deletes every game, room, session and admin record and cannot be
 * undone, so what matters most is when it refuses to run.
 */
describe("resetting the database", () => {
  it("refuses without a confirmation, and says exactly how to give one", () => {
    const decision = decideReset("econova_prod", undefined);
    expect(decision.proceed).toBe(false);
    if (!decision.proceed) expect(decision.reason).toContain("--confirm=econova_prod");
  });

  it("refuses when the confirmation names a different database", () => {
    // The guard against wiping the wrong database: naming one you meant to
    // reset while connected to another must stop everything.
    expect(decideReset("econova_prod", "econova").proceed).toBe(false);
  });

  it("proceeds only on an exact match", () => {
    expect(decideReset("econova", "econova").proceed).toBe(true);
    expect(decideReset("econova", "ECONOVA").proceed).toBe(false);
  });

  it("keeps the migration record so the schema survives the wipe", () => {
    expect(DATA_TABLES).not.toContain("schema_migrations");
    for (const table of ["games", "rooms", "sessions", "admin_audit", "game_results"]) {
      expect(DATA_TABLES).toContain(table);
    }
  });

  it("empties every data table in one statement inside one transaction", async () => {
    const statements: string[] = [];
    let destroyed: unknown = "not released";
    const pool = {
      connect: async () => ({
        query: async (sql: string) => {
          statements.push(sql.trim());
          return { rows: [] };
        },
        release: (flag?: boolean) => { destroyed = flag; }
      })
    } as unknown as Pool;

    await wipe(pool, ["games", "rooms"]);

    expect(statements).toEqual([
      "BEGIN",
      "TRUNCATE TABLE games, rooms RESTART IDENTITY CASCADE",
      "COMMIT"
    ]);
    expect(destroyed).toBe(false);
  });

  it("reports only tables that exist, without touching anything", async () => {
    const statements: string[] = [];
    const db = {
      query: async (sql: string) => {
        statements.push(sql);
        if (sql.includes("current_database")) return { rows: [{ name: "econova" }] };
        if (sql.includes("information_schema")) {
          return { rows: [{ table_name: "games" }, { table_name: "rooms" }] };
        }
        return { rows: [{ n: 3 }] };
      }
    } as unknown as Pool;

    const plan = await inspect(db);

    expect(plan).toEqual({ database: "econova", counts: { games: 3, rooms: 3 } });
    expect(statements.some((sql) => /TRUNCATE|DELETE|DROP/i.test(sql))).toBe(false);
  });
});
