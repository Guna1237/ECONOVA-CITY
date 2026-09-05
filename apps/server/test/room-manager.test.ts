import { describe, expect, it } from "vitest";

import { createSeededRandom } from "@econova/game-engine";

import {
  InMemoryGamePersistence,
  RoomManager,
  type AuthenticatedSession
} from "../src/index.js";

const admin: AuthenticatedSession = {
  sessionId: "admin-session",
  role: "admin",
  roomId: null,
  playerId: null,
  expiresAt: 100_000
};

describe("room manager", () => {
  it("creates independent lobbies and initializes only the addressed room", async () => {
    const persistenceByRoom = new Map<string, InMemoryGamePersistence>();
    const manager = new RoomManager({
      now: () => 1_000,
      randomFactory: () => createSeededRandom(5),
      persistenceFactory: (roomId) => {
        const persistence = new InMemoryGamePersistence();
        persistenceByRoom.set(roomId, persistence);
        return persistence;
      }
    });
    manager.createRoom(admin, { roomId: "room-a", code: "ROOMA1" });
    manager.createRoom(admin, { roomId: "room-b", code: "ROOMB1" });
    for (let index = 0; index < 4; index += 1) {
      manager.joinRoom("ROOMA1", { playerId: `a${index}`, name: `A ${index}` });
      manager.joinRoom("ROOMB1", { playerId: `b${index}`, name: `B ${index}` });
    }

    const roomA = await manager.initializeRoom(admin, "room-a");

    expect(roomA.getState().roomId).toBe("room-a");
    expect(manager.getRoom("room-a")?.runtime).toBe(roomA);
    expect(manager.getRoom("room-b")?.runtime).toBeNull();
    expect(persistenceByRoom.get("room-a")?.initialStates).toHaveLength(1);
  });

  it("enforces 4-6 players, unique membership, and immutable room binding", async () => {
    const manager = new RoomManager({
      now: () => 1_000,
      randomFactory: () => createSeededRandom(5),
      persistenceFactory: () => new InMemoryGamePersistence()
    });
    manager.createRoom(admin, { roomId: "room-a", code: "ROOMA1" });
    for (let index = 0; index < 6; index += 1) {
      manager.joinRoom("ROOMA1", { playerId: `a${index}`, name: `A ${index}` });
    }

    expect(() =>
      manager.joinRoom("ROOMA1", { playerId: "a6", name: "Overflow" })
    ).toThrow(/full/i);
    expect(() =>
      manager.joinRoom("ROOMA1", { playerId: "a0", name: "Duplicate" })
    ).toThrow(/already/i);

    const runtime = await manager.initializeRoom(admin, "room-a");
    const session: AuthenticatedSession = {
      sessionId: "s",
      role: "player",
      roomId: "room-a",
      playerId: runtime.getState().turnOrder[0]!,
      expiresAt: 100_000
    };
    expect(manager.getRuntimeForSession(session)).toBe(runtime);
    expect(() => manager.getRuntimeForSession({ ...session, roomId: "room-b" })).toThrow(
      /room/i
    );
  });

  it("rejects non-admin room creation and initialization", async () => {
    const manager = new RoomManager({
      now: () => 1_000,
      randomFactory: () => createSeededRandom(5),
      persistenceFactory: () => new InMemoryGamePersistence()
    });
    const player = { ...admin, role: "player" as const, playerId: "p", roomId: "room-a" };

    expect(() => manager.createRoom(player, { roomId: "room-a", code: "ROOMA1" })).toThrow(
      /admin/i
    );
    await expect(manager.initializeRoom(player, "room-a")).rejects.toThrow(/admin/i);
  });
});
