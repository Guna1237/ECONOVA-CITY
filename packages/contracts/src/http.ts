import { z } from "zod";

import {
  accessKeySchema,
  displayNameSchema,
  identifierSchema,
  playerIdSchema,
  roomCodeSchema,
  roomIdSchema,
  sessionTokenSchema
} from "./primitives.js";

export const adminLoginRequestSchema = z.object({ accessKey: accessKeySchema }).strict();
export const createRoomRequestSchema = z
  .object({ roomId: roomIdSchema.optional(), code: roomCodeSchema })
  .strict();
export const joinRoomRequestSchema = z.object({ name: displayNameSchema }).strict();
export const projectorSessionRequestSchema = z.object({ accessKey: accessKeySchema }).strict();

const sessionResponseShape = {
  token: sessionTokenSchema,
  expiresAt: z.number().int().nonnegative()
};

export const adminLoginResponseSchema = z.object(sessionResponseShape).strict();
export const createRoomResponseSchema = z
  .object({ roomId: roomIdSchema, code: roomCodeSchema })
  .strict();
export const joinRoomResponseSchema = z
  .object({ ...sessionResponseShape, roomId: roomIdSchema, playerId: playerIdSchema })
  .strict();
export const projectorSessionResponseSchema = z
  .object({ ...sessionResponseShape, roomId: roomIdSchema })
  .strict();
export const adminRealtimeSessionResponseSchema = projectorSessionResponseSchema;
export const initializeRoomResponseSchema = z
  .object({
    roomId: roomIdSchema,
    gameId: identifierSchema,
    stateVersion: z.number().int().nonnegative()
  })
  .strict();
export const healthLiveResponseSchema = z
  .object({ status: z.literal("ok"), time: z.number().int().nonnegative() })
  .strict();
export const healthReadyResponseSchema = z
  .object({ status: z.union([z.literal("ready"), z.literal("not_ready")]) })
  .strict();
export const errorResponseSchema = z
  .object({
    code: z.string().min(1).max(64).regex(/^[A-Z0-9_]+$/),
    message: z.string().min(1).max(240)
  })
  .strict();

export const lobbyProjectionSchema = z.object({
  roomId: roomIdSchema,
  code: roomCodeSchema,
  revision: z.number().int().nonnegative(),
  players: z.array(z.object({ playerId: playerIdSchema, name: displayNameSchema, connected: z.boolean() }).strict()).max(6)
}).strict();
export const roomSummarySchema = z.object({
  roomId: roomIdSchema,
  code: roomCodeSchema,
  playerCount: z.number().int().min(0).max(6),
  status: z.enum(["lobby", "active", "quarantined", "completed"]),
  stateVersion: z.number().int().nonnegative().nullable()
}).strict();
export const roomListResponseSchema = z.object({ rooms: z.array(roomSummarySchema) }).strict();
export const logoutResponseSchema = z.object({ status: z.literal("signed_out") }).strict();
export const commandReceiptSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("accepted"), requestId: identifierSchema, actionId: identifierSchema, stateVersion: z.number().int().nonnegative() }).strict(),
  z.object({ status: z.literal("rejected"), requestId: identifierSchema, actionId: identifierSchema, stateVersion: z.number().int().nonnegative(), code: errorResponseSchema.shape.code, message: errorResponseSchema.shape.message }).strict()
]);
export type LobbyProjectionDto = z.infer<typeof lobbyProjectionSchema>;
export type RoomSummaryDto = z.infer<typeof roomSummarySchema>;
export type CommandReceiptDto = z.infer<typeof commandReceiptSchema>;

export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>;
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>;
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
export type ProjectorSessionRequest = z.infer<typeof projectorSessionRequestSchema>;
export type ProjectorSessionResponse = z.infer<typeof projectorSessionResponseSchema>;
export type AdminRealtimeSessionResponse = z.infer<typeof adminRealtimeSessionResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
