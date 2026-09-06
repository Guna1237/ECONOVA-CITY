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

const createApp = (overrides: Record<string, unknown> = {}) => {
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
    adminRealtimeTtlMilliseconds: 30_000,
    allowedOrigins: ["http://localhost:5173"],
    authAttemptLimit: 10,
    authAttemptWindowMilliseconds: 60_000,
    readinessCheck: async () => true,
    logger: false,
    ...overrides
  });
};

describe("Fastify application boundary", () => {
  it("revokes the parent and room sessions locally even if durable logout fails", async () => {
    const sessions = new SessionStore();
    const parent = sessions.issue({ role: "admin", roomId: null, playerId: null, expiresAt: 100_000 });
    const child = sessions.issue({ role: "admin", roomId: "room-a", playerId: null, expiresAt: 100_000, parentSessionId: parent.session.sessionId });
    const app = createApp({ sessions, revokeSession: async () => { throw new Error("Database unavailable"); } });
    const result = await app.inject({ method: "POST", url: "/api/session/logout", headers: { authorization: `Bearer ${parent.token}` } });
    expect(result.statusCode).toBe(503);
    expect(sessions.resume(parent.token, 1_000)).toBeNull();
    expect(sessions.resume(child.token, 1_000)).toBeNull();
    expect(result.body).not.toContain("Database unavailable");
    await app.close();
  });

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

  it("allows only configured browser origins", async () => {
    const app = createApp();
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/api/admin/login",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST"
      }
    });
    const denied = await app.inject({
      method: "OPTIONS",
      url: "/api/admin/login",
      headers: {
        origin: "https://attacker.example",
        "access-control-request-method": "POST"
      }
    });

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });

  it("bounds repeated authentication attempts by route and client", async () => {
    const app = createApp({ authAttemptLimit: 1 });
    await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { accessKey: "wrong" }
    });
    const limited = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { accessKey: "wrong" }
    });

    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      code: "RATE_LIMITED",
      message: "Too many attempts. Try again shortly."
    });
    await app.close();
  });

  it("persists hashed sessions before returning their raw token", async () => {
    const records: unknown[] = [];
    const app = createApp({ persistSession: async (record: unknown) => records.push(record) });

    const login = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      payload: { accessKey: ADMIN_KEY }
    });

    expect(login.statusCode).toBe(200);
    expect(records).toHaveLength(1);
    expect(JSON.stringify(records[0])).not.toContain(login.json<{ token: string }>().token);
    await app.close();
  });
});
