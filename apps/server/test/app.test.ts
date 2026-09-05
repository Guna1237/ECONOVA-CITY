import { describe, expect, it } from "vitest";

import { createSeededRandom } from "@econova/game-engine";

import {
  ConnectionHub,
  InMemoryGamePersistence,
  RoomManager,
  SessionStore,
  buildServer
} from "../src/index.js";

const ADMIN_KEY = "a".repeat(32);
const PROJECTOR_KEY = "p".repeat(32);

const createApp = () => {
  const now = () => 1_000;
  const sessions = new SessionStore();
  const roomManager = new RoomManager({
    now,
    randomFactory: () => createSeededRandom(4),
    persistenceFactory: () => new InMemoryGamePersistence()
  });
  return buildServer({
    now,
    sessions,
    roomManager,
    connections: new ConnectionHub(),
    adminAccessKey: ADMIN_KEY,
    projectorAccessKey: PROJECTOR_KEY,
    sessionTtlMilliseconds: 60_000,
    readinessCheck: async () => true,
    logger: false
  });
};

describe("Fastify application boundary", () => {
  it("exposes liveness and dependency-aware readiness", async () => {
    const app = createApp();

    const live = await app.inject({ method: "GET", url: "/health/live" });
    const ready = await app.inject({ method: "GET", url: "/health/ready" });

    expect(live.statusCode).toBe(200);
    expect(live.json()).toMatchObject({ status: "ok" });
    expect(ready.statusCode).toBe(200);
    await app.close();
  });

  it("requires the separate admin credential before room operations", async () => {
    const app = createApp();
    const rejected = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { accessKey: "wrong" }
    });
    expect(rejected.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { accessKey: ADMIN_KEY }
    });
    expect(login.statusCode).toBe(200);
    const token = login.json<{ token: string }>().token;
    const created = await app.inject({
      method: "POST",
      url: "/api/admin/rooms",
      headers: { authorization: `Bearer ${token}` },
      payload: { roomId: "room-a", code: "ROOMA1" }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ roomId: "room-a", code: "ROOMA1" });
    await app.close();
  });

  it("binds player and projector sessions to the server-resolved room", async () => {
    const app = createApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { accessKey: ADMIN_KEY }
    });
    const adminToken = login.json<{ token: string }>().token;
    await app.inject({
      method: "POST",
      url: "/api/admin/rooms",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { roomId: "room-a", code: "ROOMA1" }
    });

    const joined = await app.inject({
      method: "POST",
      url: "/api/rooms/ROOMA1/join",
      payload: { name: "Ada" }
    });
    expect(joined.statusCode).toBe(201);
    expect(joined.json()).toMatchObject({ roomId: "room-a", playerId: expect.any(String) });

    const projector = await app.inject({
      method: "POST",
      url: "/api/rooms/ROOMA1/projector",
      payload: { accessKey: PROJECTOR_KEY }
    });
    expect(projector.statusCode).toBe(201);
    expect(projector.json()).toMatchObject({ roomId: "room-a", token: expect.any(String) });
    await app.close();
  });

  it("rejects malformed input without exposing internals", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/rooms/not-valid/join",
      payload: { name: "" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "INVALID_REQUEST",
      message: "Request data is invalid."
    });
    expect(response.body).not.toContain("stack");
    await app.close();
  });
});
