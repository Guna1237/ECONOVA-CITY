import { describe, it, expect } from "vitest";
import { createSeededRandom } from "@econova/game-engine";
import { RoomManager, InMemoryGamePersistence, type AuthenticatedSession } from "../src/index.js";

const admin: AuthenticatedSession = { sessionId: "admin", role: "admin", roomId: null, playerId: null, expiresAt: 999999 };
describe("durable lobby lifecycle", () => {
  it("does not publish a room or ghost player if persistence fails", async () => {
    let fail = true;
    const manager = new RoomManager({ now: () => 1000, randomFactory: () => createSeededRandom(1), persistenceFactory: () => new InMemoryGamePersistence(), persistLobby: async () => { if (fail) throw Error("offline"); } });
    await expect(manager.createRoom(admin, { code: "ROOMA1" })).rejects.toThrow();
    expect(manager.listRooms()).toHaveLength(0);
    fail = false;
    const room = await manager.createRoom(admin, { code: "ROOMA1" });
    fail = true;
    await expect(manager.joinRoom(room.code, { playerId: "p1", name: "Ada" })).rejects.toThrow();
    expect(room.players).toHaveLength(0);
  });
  it("serializes initialization and refuses room-admin elevation", async () => {
    const manager = new RoomManager({ now: () => 1000, randomFactory: () => createSeededRandom(1), persistenceFactory: () => new InMemoryGamePersistence() });
    const room = await manager.createRoom(admin, { code: "ROOMA1" });
    for (let i = 0; i < 4; i++) await manager.joinRoom(room.code, { playerId: `p${i}`, name: `Player ${i}` });
    const results = await Promise.allSettled([manager.initializeRoom(admin, room.roomId), manager.initializeRoom(admin, room.roomId)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    await expect(manager.createRoom({ ...admin, roomId: room.roomId }, { code: "ROOMB1" })).rejects.toThrow(/admin/);
  });
});
