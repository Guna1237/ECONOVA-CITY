import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyServerOptions
} from "fastify";
import { z } from "zod";

import {
  adminLoginRequestSchema,
  adminRealtimeSessionResponseSchema,
  roomListResponseSchema,
  commandReceiptSchema,
  adminLoginResponseSchema,
  adminCommandSchema,
  createRoomRequestSchema,
  createRoomResponseSchema,
  healthLiveResponseSchema,
  healthReadyResponseSchema,
  initializeRoomResponseSchema,
  joinRoomRequestSchema,
  joinRoomResponseSchema,
  projectorSessionRequestSchema,
  projectorSessionResponseSchema
} from "@econova/contracts";

import type { PersistedSessionRecord } from "./auth/session-store.js";
import type { AuthenticatedSession } from "./auth/types.js";
import { SessionStore } from "./auth/session-store.js";
import { ConnectionHub } from "./realtime/connection-hub.js";
import { RoomManager } from "./rooms/room-manager.js";
import { AttemptLimiter } from "./security/attempt-limiter.js";
import { RoomRealtime } from "./realtime/room-realtime.js";
import { registerSocketRoute } from "./realtime/socket-route.js";
import { registerPrivateInspection, type InspectionAudit } from "./security/private-inspection.js";

export interface BuildServerOptions {
  readonly now: () => number;
  readonly sessions: SessionStore;
  readonly roomManager: RoomManager;
  readonly connections: ConnectionHub;
  readonly adminAccessKey: string;
  readonly projectorAccessKey: string;
  readonly sessionTtlMilliseconds: number;
  readonly adminRealtimeTtlMilliseconds: number;
  readonly allowedOrigins: readonly string[];
  readonly authAttemptLimit: number;
  readonly authAttemptWindowMilliseconds: number;
  readonly persistSession?: (record: PersistedSessionRecord) => Promise<void>;
  readonly revokeSession?: (sessionId: string) => Promise<void>;
  readonly joinSessionPersistedByRoomManager?: boolean;
  readonly auditInspection?: (audit: InspectionAudit) => Promise<void>;
  readonly readinessCheck: () => Promise<boolean>;
  readonly logger?: FastifyServerOptions["logger"];
}

const secretMatches = (provided: string, expected: string): boolean => {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
};

const bearerToken = (header: string | undefined): string | null => {
  if (header === undefined || !header.startsWith("Bearer ")) return null;
  const value = header.slice("Bearer ".length);
  return value.length > 0 ? value : null;
};

const roomParamsSchema = z.object({ roomId: z.string().min(1).max(128) }).strict();
const codeParamsSchema = z
  .object({ code: z.string().regex(/^[A-Za-z0-9]{6}$/) })
  .strict();
export const buildServer = (options: BuildServerOptions): FastifyInstance => {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 64 * 1024,
    requestTimeout: 10_000,
    connectionTimeout: 10_000
  });
  const attemptLimiter = new AttemptLimiter({
    limit: options.authAttemptLimit,
    windowMilliseconds: options.authAttemptWindowMilliseconds,
    now: options.now
  });
  const realtime = new RoomRealtime(options.roomManager, options.connections, options.now);
  app.addHook("onReady", async () => {
    for (const room of options.roomManager.listRooms()) {
      realtime.attach(room);
      for (const player of room.players) await realtime.presence(room.roomId, player.playerId);
    }
  });
  app.addHook("onClose", async () => {
    realtime.close();
    options.connections.closeAll();
    await Promise.all(options.roomManager.listRooms().map(room => room.runtime?.drain()));
  });
  app.addHook("onRequest", async (request, reply) => {
    if (request.method !== "OPTIONS" && request.headers.origin !== undefined && !options.allowedOrigins.includes(request.headers.origin)) {
      return reply.code(403).send({ code: "ORIGIN_DENIED", message: "Origin is not allowed." });
    }
  });
  void app.register(cors, {
    origin: (origin, callback) => {
      callback(null, origin === undefined || options.allowedOrigins.includes(origin));
    },
    methods: ["GET", "POST", "OPTIONS"]
  });
  void app.register(websocket, { options: { maxPayload: 64 * 1024 } });

  app.addHook("onSend", async (_request, reply, payload) => {
    void reply.header("x-content-type-options", "nosniff");
    void reply.header("x-frame-options", "DENY");
    void reply.header("cache-control", "no-store");
    return payload;
  });

  const invalid = (reply: FastifyReply) =>
    reply.code(400).send({ code: "INVALID_REQUEST", message: "Request data is invalid." });

  const authenticated = (authorization: string | undefined): AuthenticatedSession | null => {
    const token = bearerToken(authorization);
    return token === null ? null : options.sessions.resume(token, options.now());
  };

  app.get("/api/admin/rooms", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    if (session?.role !== "admin" || session.roomId !== null) return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    return roomListResponseSchema.parse({ rooms: options.roomManager.listRooms().map(room => ({
      roomId: room.roomId, code: room.code, playerCount: room.players.length,
      status: room.recoveryBlocked ? "quarantined" : room.runtime === null ? "lobby" : room.runtime.isQuarantined() ? "quarantined" : room.runtime.getState().phase === "completed" ? "completed" : "active",
      stateVersion: room.runtime?.getState().version ?? null
    })) });
  });

  app.post("/api/session/logout", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    if (session === null) return reply.code(401).send({ code: "AUTHENTICATION_FAILED", message: "Session is not valid." });
    const ids = options.sessions.descendantsOf(session.sessionId);
    for (const id of ids) { options.sessions.revoke(id); options.connections.closeSession(id); }
    try {
      for (const id of ids) await options.revokeSession?.(id);
    } catch {
      return reply.code(503).send({ code: "REVOCATION_PERSISTENCE_FAILED", message: "Signed out locally; durable revocation could not be confirmed." });
    }
    return { status: "signed_out" };
  });

  const limited = (operation: string, request: { readonly ip: string }, reply: FastifyReply) => {
    if (attemptLimiter.consume(`${operation}:${request.ip}`)) return false;
    void reply.code(429).send({
      code: "RATE_LIMITED",
      message: "Too many attempts. Try again shortly."
    });
    return true;
  };

  const issueSession = async (input: Omit<AuthenticatedSession, "sessionId">) => {
    const issued = options.sessions.issue(input);
    try {
      await options.persistSession?.(issued.record);
      return issued;
    } catch (error) {
      options.sessions.revoke(issued.session.sessionId);
      throw error;
    }
  };

  app.get("/health/live", async () =>
    healthLiveResponseSchema.parse({ status: "ok", time: options.now() })
  );
  app.get("/health/ready", async (_request, reply) => {
    let ready = false;
    try { ready = await options.readinessCheck(); } catch { /* Report dependency outage as not-ready. */ }
    return reply
      .code(ready ? 200 : 503)
      .send(healthReadyResponseSchema.parse({ status: ready ? "ready" : "not_ready" }));
  });

  app.post("/api/admin/login", async (request, reply) => {
    if (limited("admin-login", request, reply)) return reply;
    const body = adminLoginRequestSchema.safeParse(request.body);
    if (!body.success) return invalid(reply);
    if (!secretMatches(body.data.accessKey, options.adminAccessKey)) {
      return reply.code(401).send({ code: "AUTHENTICATION_FAILED", message: "Invalid credential." });
    }
    try {
      const issued = await issueSession({
        role: "admin",
        roomId: null,
        playerId: null,
        expiresAt: options.now() + options.sessionTtlMilliseconds
      });
      return reply.send(
        adminLoginResponseSchema.parse({ token: issued.token, expiresAt: issued.session.expiresAt })
      );
    } catch {
      return reply.code(503).send({ code: "SESSION_CREATE_FAILED", message: "Session unavailable." });
    }
  });

  app.post("/api/admin/rooms", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    if (session?.role !== "admin" || session.roomId !== null) {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    }
    const body = createRoomRequestSchema.safeParse(request.body);
    if (!body.success) return invalid(reply);
    try {
      const room = await options.roomManager.createRoom(
        session,
        body.data.roomId === undefined
          ? { code: body.data.code }
          : { roomId: body.data.roomId, code: body.data.code }
      );
      return reply
        .code(201)
        .send(createRoomResponseSchema.parse({ roomId: room.roomId, code: room.code }));
    } catch {
      return reply.code(409).send({ code: "ROOM_CREATE_FAILED", message: "Room could not be created." });
    }
  });

  app.post("/api/rooms/:code/join", async (request, reply) => {
    if (limited("player-join", request, reply)) return reply;
    const params = codeParamsSchema.safeParse(request.params);
    const body = joinRoomRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) return invalid(reply);
    const room = options.roomManager.getRoomByCode(params.data.code);
    if (room === undefined) return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    const playerId = randomUUID();
    const issued = options.sessions.issue({ role: "player", roomId: room.roomId, playerId, expiresAt: options.now() + options.sessionTtlMilliseconds });
    try {
      if (!options.joinSessionPersistedByRoomManager) await options.persistSession?.(issued.record);
      await options.roomManager.joinRoom(params.data.code, {
        playerId,
        name: body.data.name
      }, issued.record);
      realtime.broadcast(room);
      return reply.code(201).send(joinRoomResponseSchema.parse({
        token: issued.token,
        roomId: room.roomId,
        playerId,
        expiresAt: issued.session.expiresAt
      }));
    } catch {
      options.sessions.revoke(issued.session.sessionId);
      return reply.code(409).send({ code: "JOIN_FAILED", message: "Unable to join this room." });
    }
  });

  app.post("/api/rooms/:code/projector", async (request, reply) => {
    if (limited("projector-login", request, reply)) return reply;
    const params = codeParamsSchema.safeParse(request.params);
    const body = projectorSessionRequestSchema.safeParse(request.body);
    if (!params.success || !body.success) return invalid(reply);
    if (!secretMatches(body.data.accessKey, options.projectorAccessKey)) {
      return reply.code(401).send({ code: "AUTHENTICATION_FAILED", message: "Invalid credential." });
    }
    const room = options.roomManager.getRoomByCode(params.data.code);
    if (room === undefined) {
      return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    }
    try {
      const issued = await issueSession({
        role: "projector",
        roomId: room.roomId,
        playerId: null,
        expiresAt: options.now() + options.sessionTtlMilliseconds
      });
      return reply.code(201).send(projectorSessionResponseSchema.parse({
        token: issued.token,
        roomId: room.roomId,
        expiresAt: issued.session.expiresAt
      }));
    } catch {
      return reply.code(503).send({ code: "SESSION_CREATE_FAILED", message: "Session unavailable." });
    }
  });

  app.post("/api/admin/rooms/:roomId/initialize", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    const params = roomParamsSchema.safeParse(request.params);
    if (session?.role !== "admin" || session.roomId !== null) {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    }
    if (!params.success) return invalid(reply);
    try {
      const runtime = await options.roomManager.initializeRoom(session, params.data.roomId);
      const room = options.roomManager.getRoom(params.data.roomId)!;
      realtime.attach(room);
      for (const player of room.players) await realtime.presence(room.roomId, player.playerId);
      realtime.broadcast(room);
      return reply.send(initializeRoomResponseSchema.parse({
        roomId: runtime.getState().roomId,
        gameId: runtime.getState().gameId,
        stateVersion: runtime.getState().version
      }));
    } catch {
      return reply
        .code(409)
        .send({ code: "INITIALIZATION_FAILED", message: "Room could not be initialized." });
    }
  });

  app.post("/api/admin/rooms/:roomId/realtime-session", async (request, reply) => {
    const admin = authenticated(request.headers.authorization);
    if (admin?.role !== "admin" || admin.roomId !== null) return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Global admin access required." });
    if (limited("admin-realtime", request, reply)) return reply;
    const params = roomParamsSchema.safeParse(request.params);
    if (!params.success) return invalid(reply);
    if (options.roomManager.getRoom(params.data.roomId) === undefined) return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    const issued = await issueSession({ role: "admin", roomId: params.data.roomId, playerId: null,
      parentSessionId: admin.sessionId,
      expiresAt: Math.min(admin.expiresAt, options.now() + options.adminRealtimeTtlMilliseconds) });
    return reply.code(201).send(adminRealtimeSessionResponseSchema.parse({ token: issued.token, roomId: params.data.roomId, expiresAt: issued.session.expiresAt }));
  });

  app.post("/api/admin/rooms/:roomId/command", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    const params = roomParamsSchema.safeParse(request.params);
    const command = adminCommandSchema.safeParse(request.body);
    if (session?.role !== "admin" || session.roomId !== null) {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    }
    if (!params.success || !command.success) return invalid(reply);
    const room = options.roomManager.getRoom(params.data.roomId);
    if (room?.runtime === null || room?.runtime === undefined) {
      return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    }
    const receipt = await room.runtime.processAdminCommand(session, command.data, () => options.sessions.isActive(session.sessionId, options.now()));
    if (receipt.status === "rejected") realtime.broadcast(room);
    return reply.code(receipt.status === "accepted" ? 200 : 409).send(commandReceiptSchema.parse(receipt));
  });

  void app.register(async instance => { registerSocketRoute(instance, options, realtime); });
  registerPrivateInspection(app, options);

  app.setErrorHandler((failure, _request, reply) => {
    const statusCode = failure !== null && typeof failure === "object" && "statusCode" in failure ? failure.statusCode : undefined;
    if (statusCode === 413) { void reply.code(413).send({ code: "PAYLOAD_TOO_LARGE", message: "Request is too large." }); return; }
    if (statusCode === 400) { void invalid(reply); return; }
    void reply.code(500).send({ code: "INTERNAL_ERROR", message: "Request could not be completed." });
  });

  return app;
};
