import { describe, expect, it } from "vitest";

import {
  adminProjectionSchema,
  playerProjectionSchema,
  projectorProjectionSchema,
  publicProjectionSchema,
  serverMessageSchema
} from "../src/index.js";

const publicProjection = {
  gameId: "game-room-a",
  roomId: "room-a",
  stateVersion: 3,
  phase: "player_turn",
  round: 1,
  turnOrder: ["player-a", "player-b"],
  currentTurnIndex: 0,
  turn: {
    number: 1,
    playerId: "player-a",
    stage: "awaiting_roll",
    actionsRemaining: 2,
    roll: null,
    deadlineAt: 61_000
  },
  players: [
    {
      playerId: "player-a",
      name: "A",
      position: 0,
      propertyIds: [],
      connected: true
    },
    {
      playerId: "player-b",
      name: "B",
      position: 0,
      propertyIds: [],
      connected: true
    }
  ],
  properties: [{ propertyId: "P01", ownerId: null, developmentLevel: 0 }],
  demand: { food: 0, tech: 0, entertainment: 0, mobility: 0 },
  activeBreakingNewsId: null,
  activePolicyIds: [],
  auction: null,
  council: null,
  emergencySale: null,
  tradePending: false,
  results: [],
  announcements: []
} as const;

describe("role projection contracts", () => {
  it("accepts a strict public and projector projection", () => {
    expect(publicProjectionSchema.parse(publicProjection)).toEqual(publicProjection);
    expect(projectorProjectionSchema.parse(publicProjection)).toEqual(publicProjection);
    expect(
      publicProjectionSchema.safeParse({ ...publicProjection, secretDeck: ["SO01"] }).success
    ).toBe(false);
  });

  it("accepts player-private state with server-generated capabilities", () => {
    const projection = {
      public: publicProjection,
      self: {
        playerId: "player-a",
        credits: 500,
        influence: 3,
        cards: ["SC01"],
        propertyIds: [],
        objectiveId: "SO01",
        objectiveOffer: null,
        pendingLandingFee: null,
        auction: null,
        councilAllocation: null,
        trade: null,
        capabilities: {
          expectedStateVersion: 3,
          commandTypes: ["roll"]
        }
      }
    } as const;

    expect(playerProjectionSchema.parse(projection)).toEqual(projection);
    expect(
      playerProjectionSchema.safeParse({
        ...projection,
        self: { ...projection.self, otherPlayersCards: ["SC02"] }
      }).success
    ).toBe(false);
  });

  it("accepts the complete room-scoped admin projection", () => {
    const projection = {
      public: publicProjection,
      players: [
        {
          playerId: "player-a",
          name: "A",
          credits: 500,
          influence: 3,
          cards: ["SC01"],
          propertyIds: [],
          objectiveId: "SO01",
          connected: true,
          disconnectedAt: null
        }
      ],
      objectiveSelection: null,
      auction: null,
      council: null,
      pendingLandingFee: null,
      emergencySale: null,
      pendingEventChoice: null,
      pendingCardDraw: null,
      trade: null
    } as const;

    expect(adminProjectionSchema.parse(projection)).toEqual(projection);
  });

  it("discriminates state snapshots by audience", () => {
    expect(
      serverMessageSchema.parse({
        type: "state_snapshot",
        audience: "projector",
        roomId: "room-a",
        stateVersion: 3,
        projection: publicProjection
      })
    ).toMatchObject({ audience: "projector", stateVersion: 3 });

    expect(
      serverMessageSchema.safeParse({
        type: "state_snapshot",
        audience: "player",
        roomId: "room-a",
        stateVersion: 3,
        projection: publicProjection
      }).success
    ).toBe(false);
  });
});
