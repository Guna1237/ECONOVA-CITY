import { describe, expect, it } from "vitest";

import { SessionStore } from "../src/index.js";

describe("session store", () => {
  it("issues opaque tokens and resolves only their hashes", () => {
    const store = new SessionStore();
    const issued = store.issue({
      role: "player",
      roomId: "room-a",
      playerId: "player-a",
      expiresAt: 100_000
    });

    expect(issued.token).toHaveLength(64);
    expect(store.resume(issued.token, 50_000)).toEqual(issued.session);
    expect(store.exportRecordsForPersistence()[0]).not.toHaveProperty("token");
    expect(JSON.stringify(store.exportRecordsForPersistence())).not.toContain(issued.token);
  });

  it("rejects expired, malformed, and revoked tokens", () => {
    const store = new SessionStore();
    const issued = store.issue({
      role: "projector",
      roomId: "room-a",
      playerId: null,
      expiresAt: 100_000
    });

    expect(store.resume("not-a-token", 1)).toBeNull();
    expect(store.resume(issued.token, 100_000)).toBeNull();
    store.revoke(issued.session.sessionId);
    expect(store.resume(issued.token, 1)).toBeNull();
  });

  it("cannot use one player's token as another identity", () => {
    const store = new SessionStore();
    const first = store.issue({
      role: "player",
      roomId: "room-a",
      playerId: "player-a",
      expiresAt: 100_000
    });

    expect(store.resume(first.token, 1)?.playerId).toBe("player-a");
    expect(store.resume(first.token, 1)?.roomId).toBe("room-a");
  });
});
