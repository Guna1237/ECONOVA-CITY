import { z } from "zod";
import { lobbyProjectionSchema } from "./http.js";

import {
  actionIdSchema,
  auctionIdSchema,
  cardIdSchema,
  districtIdSchema,
  identifierSchema,
  objectiveIdSchema,
  playerIdSchema,
  propertyIdSchema,
  requestIdSchema,
  roomIdSchema,
  sessionTokenSchema,
  tradeIdSchema
} from "./primitives.js";
import {
  adminProjectionSchema,
  playerProjectionSchema,
  projectorProjectionSchema
} from "./projections.js";

export * from "./primitives.js";

const commandEnvelopeShape = {
  requestId: requestIdSchema,
  actionId: actionIdSchema,
  expectedStateVersion: z.number().int().nonnegative()
};

const command = <T extends z.ZodRawShape>(shape: T) =>
  z.object({ ...commandEnvelopeShape, ...shape }).strict();

const propertyListSchema = z.array(propertyIdSchema).max(16);

export const clientCommandSchema = z.discriminatedUnion("type", [
  command({
    type: z.literal("choose_objective"),
    objectiveId: objectiveIdSchema
  }),
  command({ type: z.literal("roll") }),
  command({
    type: z.literal("choose_shortcut"),
    useShortcut: z.boolean()
  }),
  command({
    type: z.literal("buy_property"),
    propertyId: propertyIdSchema
  }),
  command({
    type: z.literal("decline_property"),
    propertyId: propertyIdSchema
  }),
  command({
    type: z.literal("start_auction"),
    propertyId: propertyIdSchema
  }),
  command({
    type: z.literal("submit_bid"),
    auctionId: auctionIdSchema,
    amount: z.number().int().nonnegative()
  }),
  command({
    type: z.literal("pass_auction"),
    auctionId: auctionIdSchema
  }),
  command({
    type: z.literal("develop_property"),
    propertyId: propertyIdSchema
  }),
  command({
    type: z.literal("change_demand"),
    districtId: districtIdSchema,
    delta: z.union([z.literal(-1), z.literal(1)])
  }),
  command({
    type: z.literal("play_card"),
    cardId: cardIdSchema,
    targetPlayerId: playerIdSchema.optional(),
    targetPropertyId: propertyIdSchema.optional(),
    targetDistrictId: districtIdSchema.optional(),
    reactionTo: z.literal("landing_fee").optional()
  }),
  command({
    type: z.literal("propose_trade"),
    counterpartyPlayerId: playerIdSchema,
    offeredCredits: z.number().int().nonnegative(),
    offeredPropertyIds: propertyListSchema,
    requestedCredits: z.number().int().nonnegative(),
    requestedPropertyIds: propertyListSchema
  }),
  command({
    type: z.literal("respond_trade"),
    tradeId: tradeIdSchema,
    response: z.enum(["accept", "reject"])
  }),
  command({
    type: z.literal("council_vote"),
    councilId: identifierSchema,
    optionAInfluence: z.number().int().nonnegative(),
    optionBInfluence: z.number().int().nonnegative()
  }),
  command({
    type: z.literal("select_event_district"),
    eventId: identifierSchema,
    districtId: districtIdSchema
  }),
  command({
    type: z.literal("discard_card"),
    cardId: cardIdSchema
  }),
  command({
    type: z.literal("emergency_sell"),
    propertyIds: propertyListSchema.min(1)
  }),
  command({ type: z.literal("pay_landing_fee") }),
  command({ type: z.literal("end_turn") })
]);

export const adminCommandSchema = z.discriminatedUnion("type", [
  command({ type: z.literal("admin_start_game") }),
  command({
    type: z.literal("admin_pause_game"),
    reason: z.string().trim().min(1).max(240)
  }),
  command({ type: z.literal("admin_resume_game") }),
  command({
    type: z.literal("admin_skip_turn"),
    reason: z.string().trim().min(1).max(240)
  }),
  command({
    type: z.literal("admin_end_game"),
    reason: z.string().trim().min(1).max(240)
  })
]);

export const resumeMessageSchema = z
  .object({
    type: z.literal("resume"),
    sessionToken: sessionTokenSchema,
    lastSeenStateVersion: z.number().int().nonnegative().optional()
  })
  .strict();

export const pingMessageSchema = z
  .object({
    type: z.literal("ping"),
    clientTime: z.number().int().nonnegative()
  })
  .strict();

export const clientMessageSchema = z.union([
  resumeMessageSchema,
  pingMessageSchema,
  clientCommandSchema
]);

// Engine rule codes are extensible; payload shape and printable code format remain strict.
const rejectionCodeSchema = z.string().min(1).max(64).regex(/^[A-Z0-9_]+$/);

const stateSnapshotMessageSchema = z.discriminatedUnion("audience", [
  z
    .object({
      type: z.literal("state_snapshot"),
      audience: z.literal("player"),
      roomId: roomIdSchema,
      stateVersion: z.number().int().nonnegative(),
      projection: playerProjectionSchema
    })
    .strict(),
  z
    .object({
      type: z.literal("state_snapshot"),
      audience: z.literal("projector"),
      roomId: roomIdSchema,
      stateVersion: z.number().int().nonnegative(),
      projection: projectorProjectionSchema
    })
    .strict(),
  z
    .object({
      type: z.literal("state_snapshot"),
      audience: z.literal("admin"),
      roomId: roomIdSchema,
      stateVersion: z.number().int().nonnegative(),
      projection: adminProjectionSchema
    })
    .strict()
]);

export const serverMessageSchema = z.union([
  stateSnapshotMessageSchema,
  z.object({
    type: z.literal("lobby_snapshot"),
    audience: z.enum(["player", "projector", "admin"]),
    roomId: roomIdSchema,
    projection: lobbyProjectionSchema
  }).strict(),
  z.object({ type: z.literal("room_unavailable"), roomId: roomIdSchema, code: z.literal("ROOM_QUARANTINED"), message: z.string().min(1).max(240) }).strict(),
  z
    .object({
      type: z.literal("action_accepted"),
      requestId: requestIdSchema,
      actionId: actionIdSchema,
      stateVersion: z.number().int().nonnegative()
    })
    .strict(),
  z
    .object({
      type: z.literal("action_rejected"),
      requestId: requestIdSchema.optional(),
      actionId: actionIdSchema.optional(),
      code: rejectionCodeSchema,
      message: z.string().min(1).max(240),
      currentStateVersion: z.number().int().nonnegative().optional()
    })
    .strict(),
  z
    .object({
      type: z.literal("pong"),
      clientTime: z.number().int().nonnegative(),
      serverTime: z.number().int().nonnegative()
    })
    .strict()
]);

export type ClientCommand = z.infer<typeof clientCommandSchema>;
export type AdminCommand = z.infer<typeof adminCommandSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
