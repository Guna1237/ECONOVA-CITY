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
