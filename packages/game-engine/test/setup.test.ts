import { describe, expect, it } from "vitest";

import {
  GameRuleError,
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom
} from "../src/index.js";

const players = Array.from({ length: 6 }, (_, index) => ({
  id: `player-${index + 1}`,
  name: `Player ${index + 1}`
}));

describe("deterministic setup", () => {
  it("creates the approved initial state for six players", () => {
    const game = createInitialGame({
      gameId: "game-a",
      roomId: "room-a",
      players,
      random: createSeededRandom(42)
    });

    expect(game.phase).toBe("objective_selection");
    expect(game.round).toBe(0);
    expect(game.version).toBe(0);
    expect(game.turnOrder).toHaveLength(6);
    expect(Object.values(game.players)).toHaveLength(6);
    expect(Object.values(game.properties)).toHaveLength(16);
    expect(new Set(Object.values(game.players).flatMap(({ cards }) => cards)).size).toBe(12);

    for (const player of Object.values(game.players)) {
      expect(player).toMatchObject({
        credits: 1_000,
        influence: 5,
        position: 0,
        cards: expect.any(Array),
        propertyIds: [],
        secretObjectiveId: null,
        connected: true
      });
      expect(player.cards).toHaveLength(2);
    }
  });

  it("produces identical setup from the same seed", () => {
    const first = createInitialGame({
      gameId: "game-a",
      roomId: "room-a",
      players: players.slice(0, 4),
      random: createSeededRandom(2026)
    });
    const second = createInitialGame({
      gameId: "game-a",
      roomId: "room-a",
      players: players.slice(0, 4),
      random: createSeededRandom(2026)
    });

    expect(second).toEqual(first);
  });

  it("deals objective offers sequentially without duplicate selections", () => {
    let game = createInitialGame({
      gameId: "game-a",
      roomId: "room-a",
      players: players.slice(0, 4),
      random: createSeededRandom(7)
    });

    const selected = new Set<string>();
    for (const expectedPlayerId of game.turnOrder) {
      expect(game.objectiveSelection?.playerId).toBe(expectedPlayerId);
      expect(game.objectiveSelection?.offeredObjectiveIds).toHaveLength(2);
      const selectedId = game.objectiveSelection?.offeredObjectiveIds[0];
      if (selectedId === undefined) throw new Error("Expected objective offer");
      expect(selected.has(selectedId)).toBe(false);
      selected.add(selectedId);
      game = chooseSecretObjective(game, expectedPlayerId, selectedId);
    }

    expect(game.phase).toBe("ready");
    expect(game.objectiveSelection).toBeNull();
    expect(selected.size).toBe(4);
  });

  it("rejects unsupported player counts and out-of-turn objective choices", () => {
    expect(() =>
      createInitialGame({
        gameId: "game-a",
        roomId: "room-a",
        players: players.slice(0, 3),
        random: createSeededRandom(1)
      })
    ).toThrow(GameRuleError);

    const game = createInitialGame({
      gameId: "game-a",
      roomId: "room-a",
      players: players.slice(0, 4),
      random: createSeededRandom(1)
    });
    const wrongPlayer = game.turnOrder[1];
    const objective = game.objectiveSelection?.offeredObjectiveIds[0];
    expect(() => chooseSecretObjective(game, wrongPlayer ?? "", objective ?? "")).toThrow(
      GameRuleError
    );
  });
});
