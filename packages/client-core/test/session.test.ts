import { describe, expect, it } from "vitest";
import { clearStoredSession, readStoredSession, saveStoredSession, secureId } from "../src/session.js";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const session = { role: "player" as const, token: "opaque_token_for_client_test_1234567890", expiresAt: 1000, roomId: "room-a", playerId: "player-a" };
describe("tab-scoped sessions", () => {
  it("roundtrips a schema-validated session and version only within its API and role", () => {
    const storage = new MemoryStorage();
    saveStoredSession("http://game.test/", session, 3, storage);
    expect(readStoredSession("http://game.test", "player", storage, 100)).toEqual({ session, lastSeenStateVersion: 3 });
    expect(readStoredSession("http://other.test", "player", storage, 100)).toBeNull();
    expect(readStoredSession("http://game.test", "projector", storage, 100)).toBeNull();
    clearStoredSession("http://game.test", "player", storage);
    expect(storage.values.size).toBe(0);
  });
  it("never writes admin credentials", () => {
    const storage = new MemoryStorage();
    saveStoredSession("http://game.test", { role: "admin", token: session.token, expiresAt: 1000, roomId: "room-a" }, null, storage);
    expect(storage.values.size).toBe(0);
  });
  it("clears expired or corrupted storage and tolerates unavailable storage", () => {
    const storage = new MemoryStorage();
    saveStoredSession("http://game.test", session, null, storage);
    expect(readStoredSession("http://game.test", "player", storage, 1000)).toBeNull();
    expect(storage.values.size).toBe(0);
    saveStoredSession("http://game.test", session, null, storage);
    const key = [...storage.values.keys()][0]!;
    storage.values.set(key, JSON.stringify({ session: { ...session, playerId: 2 }, lastSeenStateVersion: 0 }));
    expect(readStoredSession("http://game.test", "player", storage, 100)).toBeNull();
    expect(storage.values.size).toBe(0);
    expect(() => saveStoredSession("http://game.test", session, null, { ...storage, getItem: () => null, removeItem: () => undefined, setItem: () => { throw new Error("quota"); } })).not.toThrow();
  });
  it("uses secure randomness when randomUUID is unavailable on HTTP LAN", () => {
    const crypto = { getRandomValues: (bytes: Uint8Array) => { bytes.fill(7); return bytes; } };
    expect(secureId(crypto)).toBe("07070707070707070707070707070707");
    expect(() => secureId({})).toThrow("Secure randomness is unavailable");
  });
});
