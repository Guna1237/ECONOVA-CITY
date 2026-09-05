import { describe, expect, it } from "vitest";

import {
  adminLoginRequestSchema,
  adminLoginResponseSchema,
  adminRealtimeSessionResponseSchema,
  createRoomRequestSchema,
  createRoomResponseSchema,
  errorResponseSchema,
  joinRoomRequestSchema,
  joinRoomResponseSchema,
  projectorSessionRequestSchema,
  projectorSessionResponseSchema
} from "../src/index.js";

describe("HTTP contracts", () => {
  it("validates strict authentication and room requests", () => {
    expect(adminLoginRequestSchema.parse({ accessKey: "a".repeat(32) })).toBeDefined();
    expect(createRoomRequestSchema.parse({ code: "CITY01" })).toEqual({ code: "CITY01" });
    expect(joinRoomRequestSchema.parse({ name: "Asha" })).toEqual({ name: "Asha" });
    expect(projectorSessionRequestSchema.parse({ accessKey: "p".repeat(32) })).toBeDefined();
    expect(
      joinRoomRequestSchema.safeParse({ name: "Asha", playerId: "forged-player" }).success
    ).toBe(false);
  });

  it("validates session and room responses", () => {
    const session = { token: "f".repeat(64), expiresAt: 10_000 };
    expect(adminLoginResponseSchema.parse(session)).toEqual(session);
    expect(
      joinRoomResponseSchema.parse({
        ...session,
        roomId: "room-a",
        playerId: "player-a"
      })
    ).toBeDefined();
    expect(
      projectorSessionResponseSchema.parse({ ...session, roomId: "room-a" })
    ).toBeDefined();
    expect(
      adminRealtimeSessionResponseSchema.parse({ ...session, roomId: "room-a" })
    ).toBeDefined();
    expect(createRoomResponseSchema.parse({ roomId: "room-a", code: "CITY01" })).toBeDefined();
  });

  it("rejects unsafe response fields and constrains public errors", () => {
    expect(
      errorResponseSchema.parse({ code: "AUTHORIZATION_DENIED", message: "Admin access required." })
    ).toBeDefined();
    expect(
      adminLoginResponseSchema.safeParse({
        token: "f".repeat(64),
        expiresAt: 10_000,
        tokenHash: "secret"
      }).success
    ).toBe(false);
  });
});
