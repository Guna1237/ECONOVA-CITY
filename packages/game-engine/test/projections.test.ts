import { describe, expect, it } from "vitest";

import {
  adminProjectionSchema,
  playerProjectionSchema,
  projectorProjectionSchema,
  publicProjectionSchema
} from "@econova/contracts";

import {
  chooseSecretObjective,
  createAdminProjection,
  createInitialGame,
  createPlayerProjection,
  createProjectorProjection,
  createPublicProjection,
  createSeededRandom,
  startGame,
  type GameState
} from "../src/index.js";

const createState = (): GameState => {
  let state = createInitialGame({
    gameId: "game-a",
    roomId: "room-a",
    players: Array.from({ length: 4 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`
    })),
    random: createSeededRandom(55)
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0]
    );
  }
  return state;
};

describe("recipient-specific projections", () => {
  it("never includes private cards, objectives, Credits, decks, bids, or votes publicly", () => {
    const state = createState();
    const firstId = state.turnOrder[0]!;
    state.auction = {
      id: "auction-1",
      propertyId: "P01",
      triggeringPlayerId: firstId,
      eligiblePlayerIds: state.turnOrder,
      bids: Object.fromEntries(state.turnOrder.map((id) => [id, id === firstId ? 80 : null])),
      submittedPlayerIds: [firstId],
      deadlineAt: 30_000
    };
    state.council = {
      id: "council-3",
      round: 3,
      optionAId: "POL01A",
      optionBId: "POL01B",
      allocations: { [firstId]: { optionAInfluence: 2, optionBInfluence: 1 } },
      deadlineAt: 45_000
    };

    const encoded = JSON.stringify(createPublicProjection(state));

    expect(encoded).not.toContain("strategyDeck");
    expect(encoded).not.toContain("objectiveDeck");
    expect(encoded).not.toContain("secretObjectiveId");
    expect(encoded).not.toContain('"cards"');
    expect(encoded).not.toContain('"credits"');
    expect(encoded).not.toContain('"bids"');
    expect(encoded).not.toContain("optionAInfluence");
  });

  it("adds only the authenticated player's private state", () => {
    const state = createState();
    const playerId = state.turnOrder[0]!;
    const otherId = state.turnOrder[1]!;
    state.players[playerId]!.cards = ["SC12"];
    state.players[otherId]!.cards = ["SC11"];
    state.players[playerId]!.secretObjectiveId = "OBJ01";
    state.players[otherId]!.secretObjectiveId = "OBJ02";

    const projection = createPlayerProjection(state, playerId);
    const encoded = JSON.stringify(projection);

    expect(projection.self).toMatchObject({ playerId, cards: ["SC12"], objectiveId: "OBJ01" });
    expect(encoded).not.toContain("SC11");
    expect(encoded).not.toContain("OBJ02");
    expect(encoded).not.toContain("strategyDeck");
  });

  it("uses a dedicated projector projection and an explicit admin projection", () => {
    const state = createState();
    const projector = createProjectorProjection(state);
    const admin = createAdminProjection(state);

    expect(projector).toEqual(createPublicProjection(state));
    expect(admin.players).toHaveLength(4);
    expect(admin).not.toHaveProperty("strategyDeck");
    expect(admin).not.toHaveProperty("objectiveDeck");
  });

  it("emits projections that conform to every role contract", () => {
    const state = createState();
    const playerId = state.turnOrder[0]!;

    expect(publicProjectionSchema.safeParse(createPublicProjection(state)).success).toBe(true);
    expect(projectorProjectionSchema.safeParse(createProjectorProjection(state)).success).toBe(true);
    expect(playerProjectionSchema.safeParse(createPlayerProjection(state, playerId)).success).toBe(
      true
    );
    expect(adminProjectionSchema.safeParse(createAdminProjection(state)).success).toBe(true);
  });

  it("derives interaction capabilities from the authoritative turn state", () => {
    const state = createState();
    const started = startGame(state, createSeededRandom(8), 1_000).state;
    const playerId = started.turn!.playerId;

    expect(createPlayerProjection(started, playerId).self.capabilities).toEqual({
      expectedStateVersion: started.version,
      commandTypes: ["roll"]
    });
    expect(
      createPlayerProjection(started, started.turnOrder.find((id) => id !== playerId)!).self
        .capabilities.commandTypes
    ).toEqual([]);
  });
});
