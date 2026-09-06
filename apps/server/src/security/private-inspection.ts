import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requestIdSchema, roomIdSchema, accessKeySchema, privateInspectionProjectionSchema } from "@econova/contracts";
import { createPrivateInspectionProjection } from "@econova/game-engine";
import type { BuildServerOptions } from "../app.js";
import { AttemptLimiter } from "./attempt-limiter.js";

export interface InspectionAudit {
  readonly adminSessionId: string;
  readonly roomId: string;
  readonly gameId: string;
  readonly requestId: string;
  readonly stateVersion: number;
  readonly reason: string;
}

const inspectionRequest = z.object({ accessKey: accessKeySchema, requestId: requestIdSchema, reason: z.string().trim().min(1).max(240) }).strict();
const roomParams = z.object({ roomId: roomIdSchema }).strict();

export const registerPrivateInspection = (app: FastifyInstance, options: BuildServerOptions): void => {
  const limiter = new AttemptLimiter({ limit: options.authAttemptLimit, windowMilliseconds: options.authAttemptWindowMilliseconds, now: options.now });
  app.post("/api/admin/rooms/:roomId/private-inspection", async (request, reply) => {
    void reply.header("cache-control", "no-store, private").header("pragma", "no-cache");
    const token = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : "";
    const session = options.sessions.resume(token, options.now());
    const params = roomParams.safeParse(request.params);
    if (session?.role !== "admin" || session.roomId === null || !params.success || session.roomId !== params.data.roomId) {
      return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Room-scoped admin authorization required." });
    }
    if (!limiter.consume(`${request.ip}:${session.sessionId}`)) return reply.code(429).send({ code: "RATE_LIMITED", message: "Try again shortly." });
    const body = inspectionRequest.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ code: "INVALID_REQUEST", message: "Request data is invalid." });
    if (!timingSafeEqual(createHash("sha256").update(body.data.accessKey).digest(), createHash("sha256").update(options.adminAccessKey).digest())) {
      return reply.code(401).send({ code: "AUTHENTICATION_FAILED", message: "Re-authentication failed." });
    }
    const room = options.roomManager.getRoom(session.roomId);
    if (room === undefined) return reply.code(404).send({ code: "ROOM_NOT_FOUND", message: "Room was not found." });
    if (room.runtime === null) return reply.code(409).send({ code: "ROOM_UNAVAILABLE", message: "Initialize the game before inspecting it." });
    if (options.auditInspection === undefined) return reply.code(503).send({ code: "AUDIT_UNAVAILABLE", message: "Private inspection is unavailable." });
    const state = room.runtime.getState();
    try {
      await options.auditInspection({ adminSessionId: session.sessionId, roomId: room.roomId, gameId: state.gameId, requestId: body.data.requestId, stateVersion: state.version, reason: body.data.reason });
    } catch {
      return reply.code(503).send({ code: "AUDIT_UNAVAILABLE", message: "Private inspection is unavailable." });
    }
    if (!options.sessions.isActive(session.sessionId, options.now())) return reply.code(403).send({ code: "AUTHORIZATION_DENIED", message: "Admin authorization expired." });
    return privateInspectionProjectionSchema.parse(createPrivateInspectionProjection(state));
  });
};
