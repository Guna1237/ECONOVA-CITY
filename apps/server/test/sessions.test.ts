import { describe, expect, it } from "vitest";

it("restores parent-bound admin authorization and cascades revocation", () => {
  const sessions = new SessionStore();
  const parent = sessions.issue({ role: "admin", roomId: null, playerId: null, expiresAt: 100000 });
  const child = sessions.issue({ role: "admin", roomId: "room-a", playerId: null, parentSessionId: parent.session.sessionId, expiresAt: 50000 });
  const restored = new SessionStore();
  restored.hydrate(sessions.exportRecordsForPersistence(), 1000);
  expect(restored.resume(child.token, 1000)?.roomId).toBe("room-a");
  expect(restored.descendantsOf(parent.session.sessionId)).toContain(child.session.sessionId);
  restored.revoke(parent.session.sessionId);
  expect(restored.resume(child.token, 1000)).toBeNull();
});

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

  it("hydrates valid hashed sessions without recovering raw tokens", () => {
    const original = new SessionStore();
    const issued = original.issue({
      role: "player",
      roomId: "room-a",
      playerId: "player-a",
      expiresAt: 100_000
    });
    const expired = original.issue({
      role: "projector",
      roomId: "room-a",
      playerId: null,
      expiresAt: 500
    });
    const restored = new SessionStore();

    restored.hydrate(original.exportRecordsForPersistence(), 1_000);

    expect(restored.resume(issued.token, 1_000)).toEqual(issued.session);
    expect(restored.resume(expired.token, 1_000)).toBeNull();
    expect(JSON.stringify(restored.exportRecordsForPersistence())).not.toContain(issued.token);
  });
});
