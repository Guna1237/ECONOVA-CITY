import { describe, expect, it } from "vitest";

import { adminCommandSchema } from "@econova/contracts";

import type { AdminCommandInput } from "../src/operations.js";

/**
 * The console must only be able to express commands the server accepts, and
 * must never invent an operator capability. These are the five the contract
 * defines — no reset, no round advance, no direct state edit.
 */
const envelope = {
  requestId: "req1",
  actionId: "act1",
  expectedStateVersion: 0
};

describe("operator commands", () => {
  it("covers exactly the admin commands the contract defines", () => {
    const supported: AdminCommandInput["type"][] = [
      "admin_start_game",
      "admin_pause_game",
      "admin_resume_game",
      "admin_skip_turn",
      "admin_end_game"
    ];
    expect(new Set(supported).size).toBe(supported.length);

    const defined = adminCommandSchema.options.map(
      (option) => option.shape.type.value as string
    );
    expect([...defined].sort()).toEqual([...supported].sort());
  });

  it("produces a valid command for each control the console offers", () => {
    const reason = "fire alarm";
    const inputs: AdminCommandInput[] = [
      { type: "admin_start_game" },
      { type: "admin_pause_game", reason },
      { type: "admin_resume_game" },
      { type: "admin_skip_turn", reason },
      { type: "admin_end_game", reason }
    ];

    for (const input of inputs) {
      const parsed = adminCommandSchema.safeParse({ ...input, ...envelope });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects a pause, skip or end with no reason recorded", () => {
    for (const type of ["admin_pause_game", "admin_skip_turn", "admin_end_game"]) {
      const parsed = adminCommandSchema.safeParse({ type, reason: "  ", ...envelope });
      expect(parsed.success).toBe(false);
    }
  });

  it("rejects an operator capability the server does not implement", () => {
    for (const type of ["admin_reset_room", "admin_advance_round", "admin_set_credits"]) {
      expect(adminCommandSchema.safeParse({ type, ...envelope }).success).toBe(false);
    }
  });
});
