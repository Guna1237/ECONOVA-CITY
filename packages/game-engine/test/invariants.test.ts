import { describe, expect, it } from "vitest";

import {
  assertGameInvariants,
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  validateGameState
} from "../src/index.js";

const validState = () => {
  let state = createInitialGame({
    gameId: "g",
    roomId: "r",
    players: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
    random: createSeededRandom(12)
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

describe("game-state invariants", () => {
  it("accepts a canonical setup state", () => {
    expect(validateGameState(validState())).toEqual([]);
    expect(() => assertGameInvariants(validState())).not.toThrow();
  });

  it("detects credit corruption and contradictory property ownership", () => {
    const state = validState();
    state.players.p0!.credits = -1;
    state.properties.P01!.ownerId = "p0";
    state.players.p1!.propertyIds.push("P01");

    const issues = validateGameState(state).join("\n");
    expect(issues).toContain("negative Credits");
    expect(issues).toContain("P01");
    expect(() => assertGameInvariants(state)).toThrow(/invariant/i);
  });

  it("detects impossible Demand, levels, hands, and turn references", () => {
    const state = validState();
    state.demand.tech = 3;
    state.properties.P02!.developmentLevel = 4 as never;
    state.players.p0!.cards = ["SC01", "SC02", "SC03", "SC04"];
    state.phase = "player_turn";
    state.turn = null;

    const issues = validateGameState(state).join("\n");
    expect(issues).toContain("Demand outside");
    expect(issues).toContain("invalid development level");
    expect(issues).toContain("hand limit");
    expect(issues).toContain("requires an active turn");
  });
});
