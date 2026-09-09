import { Client } from "pg";
import { describe, expect, it, vi } from "vitest";

import { createPostgresPool } from "../src/persistence/postgres.js";

describe("PostgreSQL connection failure containment", () => {
  it("contains idle connection errors without logging connection details", async () => {
    const pool = createPostgresPool("postgresql://localhost/econova_test");
    const warning = vi.spyOn(process, "emitWarning").mockImplementation(() => undefined);
    const failure = new Error("Connection failed: sensitive connection details");
    try {
      expect(() => pool.emit("error", failure)).not.toThrow();
      expect(warning).toHaveBeenCalledOnce();
      expect(warning.mock.calls[0]?.[0]).toBe("An idle PostgreSQL connection failed and was removed from the pool.");
      expect(JSON.stringify(warning.mock.calls)).not.toContain("sensitive");
    } finally {
      warning.mockRestore();
      await pool.end();
    }
  });

  it("contains checked-out client error events so transaction failures reach their promise handlers", async () => {
    const pool = createPostgresPool("postgresql://localhost/econova_test");
    const client = new Client();
    try {
      // pg emits connect before checkout and removes its own idle error listener
      // during checkout. The application listener must remain on that client.
      pool.emit("connect", client);
      expect(() => client.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow();
    } finally {
      await client.end();
      await pool.end();
    }
  });
});
