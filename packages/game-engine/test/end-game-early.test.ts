import { describe, expect, it } from "vitest";

import {
  GameRuleError,
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  endGameNow,
  startGame,
  type GameState,
  type RandomSource
} from "../src/index.js";

const setupPlayers = Array.from({ length: 4 }, (_, index) => ({
  id: `player-${index + 1}`,
  name: `Player ${index + 1}`
}));

const sequenceRandom = (...values: number[]): RandomSource => {
  let index = 0;
  return {
    nextInt(maxExclusive) {
      const value = values[index] ?? 0;
      index += 1;
      return Math.abs(value) % maxExclusive;
    }
  };
};

const START = 1_000;

const freshGame = (): GameState =>
  createInitialGame({
    gameId: "game-a",
    roomId: "room-a",
    players: setupPlayers,
    random: createSeededRandom(99),
    now: START
  });

const readyGame = (): GameState => {
  let state = freshGame();
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0],
      START
    );
  }
  return state;
};

const playing = (): GameState => startGame(readyGame(), sequenceRandom(0), START).state;

/**
 * Reaching Round 8 used to be the only route to a final score, so an event
 * that ran out of time produced no winner at all and a room that failed
 * mid-game could not report what had happened in it.
 */
describe("operator ends a session early", () => {
  it("produces a ranked result for every player", () => {
    const { state } = endGameNow(playing(), "event slot ended");

    expect(state.phase).toBe("completed");
    expect(state.results).toHaveLength(setupPlayers.length);
    expect(state.turn).toBeNull();
    // Nobody has done anything yet, so every player is genuinely level and the
    // rules share the rank rather than inventing a winner.
    expect(state.results.map(({ rank }) => rank)).toEqual([1, 1, 1, 1]);
  });

  it("scores by exactly the same rules a finished game uses", () => {
    const state = playing();
    const owner = state.turn!.playerId;
    // Give one player something real to be scored on.
    state.players[owner]!.credits = 640;
    state.players[owner]!.influence = 4;
    state.properties["P01"]!.ownerId = owner;
    state.properties["P01"]!.developmentLevel = 2;
    state.players[owner]!.propertyIds = ["P01"];

    const { state: ended } = endGameNow(state, "time");
    const result = ended.results.find((entry) => entry.playerId === owner)!;

    // Credits carry through, Influence is worth 10 each, and the property is
    // counted at its developed value rather than ignored.
    expect(result.breakdown.credits).toBe(640);
    expect(result.breakdown.influence).toBe(40);
    expect(result.breakdown.propertyValue).toBeGreaterThan(0);
    expect(result.breakdown.total).toBe(
      result.breakdown.credits +
        result.breakdown.influence +
        result.breakdown.propertyValue +
        result.breakdown.districtControl +
        result.breakdown.fullDistrictControl +
        result.breakdown.objective
    );
  });

  it("announces the operator reason so the record shows why", () => {
    const { events } = endGameNow(playing(), "projector failed, calling it here");
    const ended = events.find(({ type }) => type === "game_ended_by_operator");
    expect(ended?.payload).toMatchObject({ reason: "projector failed, calling it here" });
  });

  it("does not grant income for the round that was abandoned", () => {
    const state = playing();
    const owner = state.turn!.playerId;
    state.players[owner]!.credits = 500;
    state.properties["P01"]!.ownerId = owner;
    state.players[owner]!.propertyIds = ["P01"];

    const { state: ended } = endGameNow(state, "time");

    // Ending a round pays income; ending the game early must not.
    expect(ended.results.find((e) => e.playerId === owner)!.breakdown.credits).toBe(500);
  });

  it("refuses a game that never finished setup", () => {
    expect(() => endGameNow(freshGame(), "too early")).toThrow(GameRuleError);
  });

  it("refuses a game that already finished", () => {
    const { state } = endGameNow(playing(), "first");
    expect(() => endGameNow(state, "again")).toThrow(GameRuleError);
  });
});
