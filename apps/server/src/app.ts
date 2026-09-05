import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import websocket from "@fastify/websocket";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyServerOptions
} from "fastify";
import { z } from "zod";

import {
  adminCommandSchema,
  clientCommandSchema,
  pingMessageSchema,
  resumeMessageSchema
} from "@econova/contracts";

import type { AuthenticatedSession } from "./auth/types.js";
import { SessionStore } from "./auth/session-store.js";
import { ConnectionHub } from "./realtime/connection-hub.js";
import { RoomManager } from "./rooms/room-manager.js";

export interface BuildServerOptions {
  readonly now: () => number;
  readonly sessions: SessionStore;
  readonly roomManager: RoomManager;
  readonly connections: ConnectionHub;
  readonly adminAccessKey: string;
  readonly projectorAccessKey: string;
  readonly sessionTtlMilliseconds: number;
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
const adminLoginSchema = z.object({ accessKey: z.string().min(1).max(512) }).strict();
const createRoomSchema = z
  .object({
    roomId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/).optional(),
    code: z.string().regex(/^[A-Za-z0-9]{6}$/)
  })
  .strict();
const joinSchema = z.object({ name: z.string().trim().min(1).max(40) }).strict();
const projectorSchema = z.object({ accessKey: z.string().min(1).max(512) }).strict();

export const buildServer = (options: BuildServerOptions): FastifyInstance => {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 64 * 1024,
    requestTimeout: 10_000,
    connectionTimeout: 10_000
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

  app.get("/health/live", async () => ({ status: "ok", time: options.now() }));
  app.get("/health/ready", async (_request, reply) => {
    const ready = await options.readinessCheck();
    return reply.code(ready ? 200 : 503).send({ status: ready ? "ready" : "not_ready" });
  });

  app.post("/api/admin/login", async (request, reply) => {
    const body = adminLoginSchema.safeParse(request.body);
    if (!body.success) return invalid(reply);
    if (!secretMatches(body.data.accessKey, options.adminAccessKey)) {
      return reply.code(401).send({ code: "AUTHENTICATION_FAILED", message: "Invalid credential." });
    }
    const issued = options.sessions.issue({
      role: "admin",
      roomId: null,
      playerId: null,
      expiresAt: options.now() + options.sessionTtlMilliseconds
    });
    return reply.send({ token: issued.token, expiresAt: issued.session.expiresAt });
  });

  app.post("/api/admin/rooms", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    if (session?.role !== "admin") {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    }
    const body = createRoomSchema.safeParse(request.body);
    if (!body.success) return invalid(reply);
    try {
      const room = options.roomManager.createRoom(
        session,
        body.data.roomId === undefined
          ? { code: body.data.code }
          : { roomId: body.data.roomId, code: body.data.code }
      );
      return reply.code(201).send({ roomId: room.roomId, code: room.code });
    } catch {
      return reply.code(409).send({ code: "ROOM_CREATE_FAILED", message: "Room could not be created." });
    }
  });

  app.post("/api/rooms/:code/join", async (request, reply) => {
    const params = codeParamsSchema.safeParse(request.params);
    const body = joinSchema.safeParse(request.body);
    if (!params.success || !body.success) return invalid(reply);
    const playerId = randomUUID();
    try {
      const room = options.roomManager.joinRoom(params.data.code, {
        playerId,
        name: body.data.name
      });
      const issued = options.sessions.issue({
        role: "player",
        roomId: room.roomId,
        playerId,
        expiresAt: options.now() + options.sessionTtlMilliseconds
      });
      return reply.code(201).send({
        token: issued.token,
        roomId: room.roomId,
        playerId,
        expiresAt: issued.session.expiresAt
      });
    } catch {
      return reply.code(409).send({ code: "JOIN_FAILED", message: "Unable to join this room." });
    }
  });

  app.post("/api/rooms/:code/projector", async (request, reply) => {
    const params = codeParamsSchema.safeParse(request.params);
    const body = projectorSchema.safeParse(request.body);
    if (!params.success || !body.success) return invalid(reply);
    if (!secretMatches(body.data.accessKey, options.projectorAccessKey)) {
      return reply.code(401).send({ code: "AUTHENTICATION_FAILED", message: "Invalid credential." });
    }
    const room = options.roomManager.getRoomByCode(params.data.code);
    if (room === undefined) {
      return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    }
    const issued = options.sessions.issue({
      role: "projector",
      roomId: room.roomId,
      playerId: null,
      expiresAt: options.now() + options.sessionTtlMilliseconds
    });
    return reply.code(201).send({
      token: issued.token,
      roomId: room.roomId,
      expiresAt: issued.session.expiresAt
    });
  });

  app.post("/api/admin/rooms/:roomId/initialize", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    const params = roomParamsSchema.safeParse(request.params);
    if (session?.role !== "admin") {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    }
    if (!params.success) return invalid(reply);
    try {
      const runtime = await options.roomManager.initializeRoom(session, params.data.roomId);
      options.connections.broadcastState(runtime.getState());
      return reply.send({
        roomId: runtime.getState().roomId,
        gameId: runtime.getState().gameId,
        stateVersion: runtime.getState().version
      });
    } catch {
      return reply
        .code(409)
        .send({ code: "INITIALIZATION_FAILED", message: "Room could not be initialized." });
    }
  });

  app.post("/api/admin/rooms/:roomId/command", async (request, reply) => {
    const session = authenticated(request.headers.authorization);
    const params = roomParamsSchema.safeParse(request.params);
    const command = adminCommandSchema.safeParse(request.body);
    if (session?.role !== "admin") {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin access required." });
    }
    if (!params.success || !command.success) return invalid(reply);
    const room = options.roomManager.getRoom(params.data.roomId);
    if (room?.runtime === null || room?.runtime === undefined) {
      return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    }
    const receipt = await room.runtime.processAdminCommand(session, command.data);
    if (receipt.status === "accepted") options.connections.broadcastState(room.runtime.getState());
    return reply.code(receipt.status === "accepted" ? 200 : 409).send(receipt);
  });

  app.get("/ws", { websocket: true }, (socket) => {
    let session: AuthenticatedSession | null = null;
    let connectionId: string | null = null;
    const authenticationTimer = setTimeout(() => socket.close(4401, "Authentication required"), 5_000);

    socket.on("message", (raw) => {
      void (async () => {
        let rawBuffer: Buffer;
        if (Array.isArray(raw)) rawBuffer = Buffer.concat(raw);
        else if (Buffer.isBuffer(raw)) rawBuffer = raw;
        else rawBuffer = Buffer.from(raw);
        if (rawBuffer.byteLength > 64 * 1024) {
          socket.close(1009, "Message too large");
          return;
        }
        let decoded: unknown;
        try {
          decoded = JSON.parse(rawBuffer.toString("utf8"));
        } catch {
          socket.send(
            JSON.stringify({ type: "action_rejected", code: "INVALID_COMMAND", message: "Invalid message." })
          );
          return;
        }

        if (session === null) {
          const resume = resumeMessageSchema.safeParse(decoded);
          if (!resume.success) {
            socket.close(4401, "Authentication required");
            return;
          }
          const resolved = options.sessions.resume(resume.data.sessionToken, options.now());
          if (resolved === null || resolved.roomId === null || resolved.role === "admin") {
            socket.close(4403, "Session denied");
            return;
          }
          try {
            const runtime = options.roomManager.getRuntimeForSession(resolved);
            session = resolved;
            clearTimeout(authenticationTimer);
            connectionId = options.connections.add(resolved, (message) =>
              socket.send(JSON.stringify(message))
            );
            options.connections.sendCurrentState(runtime.getState(), resolved.sessionId);
          } catch {
            socket.close(4404, "Room unavailable");
          }
          return;
        }

        const ping = pingMessageSchema.safeParse(decoded);
        if (ping.success) {
          socket.send(
            JSON.stringify({
              type: "pong",
              clientTime: ping.data.clientTime,
              serverTime: options.now()
            })
          );
          return;
        }
        const command = clientCommandSchema.safeParse(decoded);
        if (!command.success || session.role !== "player") {
          socket.send(
            JSON.stringify({ type: "action_rejected", code: "INVALID_COMMAND", message: "Invalid command." })
          );
          return;
        }
        const runtime = options.roomManager.getRuntimeForSession(session);
        const receipt = await runtime.processCommand(session, command.data);
        socket.send(
          JSON.stringify(
            receipt.status === "accepted"
              ? {
                  type: "action_accepted",
                  requestId: receipt.requestId,
                  actionId: receipt.actionId,
                  stateVersion: receipt.stateVersion
                }
              : {
                  type: "action_rejected",
                  requestId: receipt.requestId,
                  actionId: receipt.actionId,
                  code: receipt.code,
                  message: receipt.message,
                  currentStateVersion: receipt.stateVersion
                }
          )
        );
        if (receipt.status === "accepted") options.connections.broadcastState(runtime.getState());
      })().catch(() => socket.close(1011, "Internal error"));
    });

    socket.on("close", () => {
      clearTimeout(authenticationTimer);
      if (session !== null && connectionId !== null) {
        options.connections.remove(session.sessionId, connectionId);
      }
    });
  });

  app.setErrorHandler((_error, _request, reply) => {
    void reply.code(500).send({ code: "INTERNAL_ERROR", message: "Request could not be completed." });
  });

  return app;
};
