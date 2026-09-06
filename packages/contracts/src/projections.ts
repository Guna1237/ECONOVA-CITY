import { z } from "zod";

import {
  auctionIdSchema,
  cardIdSchema,
  districtIdSchema,
  identifierSchema,
  objectiveIdSchema,
  playerIdSchema,
  propertyIdSchema,
  roomIdSchema,
  tradeIdSchema
} from "./primitives.js";

export const gamePhaseSchema = z.enum([
  "objective_selection",
  "ready",
  "breaking_news",
  "strategy_draw",
  "council",
  "player_turn",
  "round_resolution",
  "paused",
  "completed"
]);

export const turnStageSchema = z.enum([
  "awaiting_roll",
  "awaiting_shortcut_choice",
  "awaiting_property_decision",
  "auction",
  "landing_fee_reaction",
  "emergency_sale",
  "awaiting_event_choice",
  "awaiting_card_discard",
  "action_phase"
]);

export const clientCommandTypeSchema = z.enum([
  "choose_objective",
  "roll",
  "choose_shortcut",
  "buy_property",
  "decline_property",
  "start_auction",
  "submit_bid",
  "pass_auction",
  "develop_property",
  "change_demand",
  "play_card",
  "propose_trade",
  "respond_trade",
  "council_vote",
  "select_event_district",
  "discard_card",
  "emergency_sell",
  "pay_landing_fee",
  "end_turn"
]);

export const interactionCapabilitiesSchema = z
  .object({
    expectedStateVersion: z.number().int().nonnegative(),
    commandTypes: z.array(clientCommandTypeSchema).max(clientCommandTypeSchema.options.length)
  })
  .strict();

const scoreBreakdownSchema = z
  .object({
    credits: z.number().int().nonnegative(),
    propertyValue: z.number().int().nonnegative(),
    districtControl: z.number().int().nonnegative(),
    influence: z.number().int().nonnegative(),
    objective: z.number().int().nonnegative(),
    fullDistrictControl: z.number().int().nonnegative(),
    total: z.number().int().nonnegative()
  })
  .strict();

const pendingLandingFeeSchema = z
  .object({
    payerId: playerIdSchema,
    ownerId: playerIdSchema,
    propertyId: propertyIdSchema,
    amount: z.number().int().nonnegative()
  })
  .strict();

const emergencySaleSchema = pendingLandingFeeSchema.extend({
  deadlineAt: z.number().int().nonnegative()
}).strict();

const councilAllocationSchema = z
  .object({
    optionAInfluence: z.number().int().nonnegative(),
    optionBInfluence: z.number().int().nonnegative()
  })
  .strict();

const tradeSchema = z
  .object({
    id: tradeIdSchema,
    proposerPlayerId: playerIdSchema,
    counterpartyPlayerId: playerIdSchema,
    offeredCredits: z.number().int().nonnegative(),
    offeredPropertyIds: z.array(propertyIdSchema).max(16),
    requestedCredits: z.number().int().nonnegative(),
    requestedPropertyIds: z.array(propertyIdSchema).max(16),
    createdOnTurn: z.number().int().positive()
  })
  .strict();

export const publicProjectionSchema = z
  .object({
    gameId: identifierSchema,
    roomId: roomIdSchema,
    stateVersion: z.number().int().nonnegative(),
    phase: gamePhaseSchema,
    round: z.number().int().nonnegative(),
    turnOrder: z.array(playerIdSchema),
    currentTurnIndex: z.number().int().nonnegative(),
    turn: z
      .object({
        number: z.number().int().positive(),
        playerId: playerIdSchema,
        stage: turnStageSchema,
        actionsRemaining: z.number().int().nonnegative(),
        roll: z.number().int().min(1).max(6).nullable(),
        deadlineAt: z.number().int().nonnegative().nullable()
      })
      .strict()
      .nullable(),
    players: z.array(
      z
        .object({
          playerId: playerIdSchema,
          name: z.string().min(1).max(40),
          position: z.number().int().min(0).max(19),
          propertyIds: z.array(propertyIdSchema).max(16),
          connected: z.boolean()
        })
        .strict()
    ),
    properties: z.array(
      z
        .object({
          propertyId: propertyIdSchema,
          ownerId: playerIdSchema.nullable(),
          developmentLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
        })
        .strict()
    ),
    demand: z
      .object({
        food: z.number().int(),
        tech: z.number().int(),
        entertainment: z.number().int(),
        mobility: z.number().int()
      })
      .strict(),
    activeBreakingNewsId: identifierSchema.nullable(),
    activePolicyIds: z.array(identifierSchema),
    auction: z
      .object({
        auctionId: auctionIdSchema,
        propertyId: propertyIdSchema,
        triggeringPlayerId: playerIdSchema,
        eligiblePlayerIds: z.array(playerIdSchema),
        submittedCount: z.number().int().nonnegative(),
        deadlineAt: z.number().int().nonnegative()
      })
      .strict()
      .nullable(),
    council: z
      .object({
        councilId: identifierSchema,
        optionAId: identifierSchema,
        optionBId: identifierSchema,
        submittedCount: z.number().int().nonnegative(),
        deadlineAt: z.number().int().nonnegative()
      })
      .strict()
      .nullable(),
    emergencySale: z
      .object({ playerId: playerIdSchema, deadlineAt: z.number().int().nonnegative() })
      .strict()
      .nullable(),
    tradePending: z.boolean(),
    results: z.array(
      z
        .object({
          playerId: playerIdSchema,
          rank: z.number().int().positive(),
          propertyCount: z.number().int().nonnegative(),
          objectiveId: objectiveIdSchema,
          objectiveCompleted: z.boolean(),
          breakdown: scoreBreakdownSchema
        })
        .strict()
    ),
    announcements: z.array(
      z
        .object({ type: identifierSchema, payload: z.record(z.string(), z.unknown()) })
        .strict()
    )
  })
  .strict();

export const projectorProjectionSchema = publicProjectionSchema;

export const playerProjectionSchema = z
  .object({
    public: publicProjectionSchema,
    self: z
      .object({
        playerId: playerIdSchema,
        credits: z.number().int().nonnegative(),
        influence: z.number().int().nonnegative(),
        cards: z.array(cardIdSchema),
        propertyIds: z.array(propertyIdSchema).max(16),
        objectiveId: objectiveIdSchema.nullable(),
        objectiveOffer: z.tuple([objectiveIdSchema, objectiveIdSchema]).nullable(),
        pendingEventChoice: z.object({ eventId: z.enum(["SE03", "SE04"]) }).strict().nullable(),
        pendingLandingFee: pendingLandingFeeSchema.nullable(),
        auction: z
          .object({
            auctionId: auctionIdSchema,
            ownBid: z.number().int().nonnegative().nullable(),
            hasSubmitted: z.boolean()
          })
          .strict()
          .nullable(),
        councilAllocation: councilAllocationSchema.nullable(),
        trade: tradeSchema.nullable(),
        capabilities: interactionCapabilitiesSchema
      })
      .strict()
  })
  .strict();

const adminAuctionSchema = z
  .object({
    id: auctionIdSchema,
    propertyId: propertyIdSchema,
    triggeringPlayerId: playerIdSchema,
    eligiblePlayerIds: z.array(playerIdSchema),
    bids: z.record(playerIdSchema, z.number().int().nonnegative().nullable()),
    submittedPlayerIds: z.array(playerIdSchema),
    deadlineAt: z.number().int().nonnegative()
  })
  .strict();

const adminCouncilSchema = z
  .object({
    id: identifierSchema,
    round: z.union([z.literal(3), z.literal(6)]),
    optionAId: identifierSchema,
    optionBId: identifierSchema,
    allocations: z.record(playerIdSchema, councilAllocationSchema),
    deadlineAt: z.number().int().nonnegative()
  })
  .strict();

export const privateInspectionProjectionSchema = z
  .object({
    public: publicProjectionSchema,
    players: z.array(
      z
        .object({
          playerId: playerIdSchema,
          name: z.string().min(1).max(40),
          credits: z.number().int().nonnegative(),
          influence: z.number().int().nonnegative(),
          cards: z.array(cardIdSchema),
          propertyIds: z.array(propertyIdSchema).max(16),
          objectiveId: objectiveIdSchema.nullable(),
          connected: z.boolean(),
          disconnectedAt: z.number().int().nonnegative().nullable()
        })
        .strict()
    ),
    objectiveSelection: z
      .object({
        playerId: playerIdSchema,
        offeredObjectiveIds: z.tuple([objectiveIdSchema, objectiveIdSchema])
      })
      .strict()
      .nullable(),
    auction: adminAuctionSchema.nullable(),
    council: adminCouncilSchema.nullable(),
    pendingLandingFee: pendingLandingFeeSchema.nullable(),
    emergencySale: emergencySaleSchema.nullable(),
    pendingEventChoice: z
      .object({
        playerId: playerIdSchema,
        eventId: z.union([z.literal("SE03"), z.literal("SE04")])
      })
      .strict()
      .nullable(),
    pendingCardDraw: z
      .object({
        playerId: playerIdSchema,
        count: z.number().int().positive(),
        resumePhase: z.union([z.literal("player_turn"), z.literal("council")])
      })
      .strict()
      .nullable(),
    trade: tradeSchema.nullable()
  })
  .strict();

export type PublicProjectionDto = z.infer<typeof publicProjectionSchema>;
export const adminProjectionSchema = z.object({
  public: publicProjectionSchema,
  players: z.array(z.object({ playerId: playerIdSchema, name: z.string().min(1).max(40), connected: z.boolean(), disconnectedAt: z.number().int().nonnegative().nullable() }).strict())
}).strict();
export type PrivateInspectionProjectionDto = z.infer<typeof privateInspectionProjectionSchema>;
export type ProjectorProjectionDto = z.infer<typeof projectorProjectionSchema>;
export type PlayerProjectionDto = z.infer<typeof playerProjectionSchema>;
export type AdminProjectionDto = z.infer<typeof adminProjectionSchema>;
export type InteractionCapabilities = z.infer<typeof interactionCapabilitiesSchema>;
export type ClientCommandType = z.infer<typeof clientCommandTypeSchema>;
