import { describe, expect, it } from "vitest";

import { createInitialGame, createSeededRandom } from "@econova/game-engine";

import {
  loadRecoverableRooms,
  loadSessionRecords,
  type PersistedSessionRecord
} from "../src/index.js";

describe("PostgreSQL recovery readers", () => {
  it("isolates a corrupt recovered room and retains quarantine status", async () => {
    const state = createInitialGame({ gameId: "game-room-b", roomId: "room-b", players: Array.from({ length: 4 }, (_, seat) => ({ id: `p${seat}`, name: `P${seat}` })), random: createSeededRandom(3) });
    const invalid: string[] = [];
    const queryable = { query: async () => ({ rows: [
      { room_id: "room-a", room_code: "ROOMA1", state: { schemaVersion: 999 } },
      { id: state.gameId, state_version: state.version, room_id: "room-b", room_code: "ROOMB1", state, status: "quarantined" }
    ] }) };
    const recovered = await loadRecoverableRooms(queryable, room => invalid.push(room.roomId));
    expect(invalid).toEqual(["room-a"]);
    expect(recovered).toEqual([{ roomId: "room-b", code: "ROOMB1", state, quarantined: true }]);
  });
  it("loads and validates active authoritative room snapshots", async () => {
    const state = createInitialGame({
      gameId: "game-room-a",
      roomId: "room-a",
      players: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
      random: createSeededRandom(3)
    });
    const queryable = {
      query: async () => ({ rows: [{ id: state.gameId, state_version: String(state.version), room_id: "room-a", room_code: "ROOMA1", state }] })
    };

    await expect(loadRecoverableRooms(queryable)).resolves.toEqual([
      { roomId: "room-a", code: "ROOMA1", state }
    ]);
  });

  it.each(["game", "version"])("rejects a recovered snapshot with mismatched %s binding", async mismatch => {
    const state = createInitialGame({ gameId: "game-a", roomId: "room-a", players: Array.from({ length: 4 }, (_, seat) => ({ id: `p${seat}`, name: `P${seat}` })), random: createSeededRandom(3) });
    const queryable = { query: async () => ({ rows: [{ id: mismatch === "game" ? "another-game" : state.gameId, state_version: mismatch === "version" ? state.version + 1 : state.version, room_id: state.roomId, room_code: "ROOMA1", state }] }) };
    await expect(loadRecoverableRooms(queryable)).rejects.toThrow("binding");
  });

  it("converts active session expiry timestamps for hashed-session hydration", async () => {
    const record: PersistedSessionRecord = {
      tokenHash: "a".repeat(64),
      sessionId: "session-a",
      role: "admin",
      roomId: "room-a",
      playerId: null,
      expiresAt: 50_000,
      revoked: false
    };
    const queryable = {
      query: async () => ({
        rows: [
          {
            id: record.sessionId,
            token_hash: record.tokenHash,
            role: record.role,
            room_id: record.roomId,
            player_id: record.playerId,
            expires_at: new Date(record.expiresAt),
            revoked_at: null
          }
        ]
      })
    };

    await expect(loadSessionRecords(queryable, 1_000)).resolves.toEqual([record]);
  });
});
