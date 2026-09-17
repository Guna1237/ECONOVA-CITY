import { describe, expect, it } from "vitest";

import {
  GameRuleError,
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  forcePendingDecision,
  handleObjectiveSelectionTimeout,
  handleStrategyDrawTimeout,
  pauseGame,
  resumeGame,
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

const setHand = (state: GameState, playerId: string, cardIds: string[]): void => {
  const player = state.players[playerId]!;
  state.strategyDeck.push(...player.cards);
  player.cards = [];
  for (const cardId of cardIds) {
    const deckIndex = state.strategyDeck.indexOf(cardId);
    if (deckIndex >= 0) state.strategyDeck.splice(deckIndex, 1);
    for (const other of Object.values(state.players)) {
      if (other.id !== playerId) other.cards = other.cards.filter((id) => id !== cardId);
    }
  }
  player.cards = [...cardIds];
};

/**
 * A pending decision owed outside a normal turn used to have no deadline at
 * all, so one unresponsive player parked the whole room with no operator
 * recovery. These cover both such decisions and the operator escape hatch.
 */
describe("pending decisions cannot stall a room", () => {
  describe("opening objective pick", () => {
    it("arms a deadline as soon as the game is created", () => {
      const state = freshGame();
      expect(state.objectiveSelection?.deadlineAt).toBe(START + 45_000);
    });

    it("keeps the first offered objective when the timer expires", () => {
      const state = freshGame();
      const selection = state.objectiveSelection!;
      const kept = selection.offeredObjectiveIds[0];

      const resolved = handleObjectiveSelectionTimeout(state, START + 45_000);

      expect(resolved.players[selection.playerId]?.secretObjectiveId).toBe(kept);
      expect(resolved.objectiveSelection?.playerId).not.toBe(selection.playerId);
    });

    it("refuses to resolve before the timer expires", () => {
      const state = freshGame();
      expect(() => handleObjectiveSelectionTimeout(state, START + 44_999)).toThrow(GameRuleError);
    });

    it("gives each following player their own fresh window", () => {
      const state = freshGame();
      const resolved = handleObjectiveSelectionTimeout(state, START + 45_000);
      expect(resolved.objectiveSelection?.deadlineAt).toBe(START + 45_000 + 45_000);
    });

    it("reaches a startable game even if nobody ever picks", () => {
      let state = freshGame();
      let now = START;
      while (state.objectiveSelection !== null) {
        now = state.objectiveSelection.deadlineAt!;
        state = handleObjectiveSelectionTimeout(state, now);
      }
      expect(state.phase).toBe("ready");
      for (const player of Object.values(state.players)) {
        expect(player.secretObjectiveId).not.toBeNull();
      }
    });
  });

  describe("Round 4 discard", () => {
    const roundFourDiscard = (): GameState => {
      const state = startGame(readyGame(), sequenceRandom(0), START).state;
      const playerId = state.turn!.playerId;
      setHand(state, playerId, ["SC03", "SC01", "SC02"]);
      state.phase = "strategy_draw";
      state.turn = null;
      state.round = 4;
      state.pendingCardDraw = {
        playerId,
        count: 1,
        resumePhase: "player_turn",
        deadlineAt: START + 45_000
      };
      return state;
    };

    it("discards the lowest card ID and lets the round continue", () => {
      const state = roundFourDiscard();
      const playerId = state.pendingCardDraw!.playerId;
      const drawnCardId = state.strategyDeck[0];

      const resolved = handleStrategyDrawTimeout(state, START + 45_000).state;

      expect(resolved.players[playerId]?.cards).not.toContain("SC01");
      expect(resolved.players[playerId]?.cards).toEqual(
        expect.arrayContaining(["SC02", "SC03", drawnCardId])
      );
      expect(resolved.pendingCardDraw).toBeNull();
      // The whole point: the room is playing again rather than waiting.
      expect(resolved.phase).toBe("player_turn");
    });

    it("refuses to resolve before the timer expires", () => {
      expect(() => handleStrategyDrawTimeout(roundFourDiscard(), START + 44_999)).toThrow(
        GameRuleError
      );
    });

    it("announces that the discard was made automatically", () => {
      const { events } = handleStrategyDrawTimeout(roundFourDiscard(), START + 45_000);
      expect(events.map(({ type }) => type)).toContain("card_discard_auto_completed");
    });
  });

  describe("operator pause", () => {
    it("does not burn the objective timer while the game is paused", () => {
      const paused = pauseGame(freshGame(), START + 5_000, "projector died").state;
      const resumed = resumeGame(paused, START + 305_000).state;

      // Five minutes of pause must not expire a 45-second decision.
      expect(resumed.objectiveSelection?.deadlineAt).toBe(START + 45_000 + 300_000);
      expect(() =>
        handleObjectiveSelectionTimeout(resumed, START + 305_000)
      ).toThrow(GameRuleError);
    });
  });

  describe("operator force advance", () => {
    it("resolves the opening pick immediately", () => {
      const state = freshGame();
      const selection = state.objectiveSelection!;

      const forced = forcePendingDecision(state, START + 1_000, sequenceRandom(0), "player left");

      expect(forced.state.players[selection.playerId]?.secretObjectiveId).toBe(
        selection.offeredObjectiveIds[0]
      );
      expect(forced.events.map(({ type }) => type)).toContain("operator_forced_decision");
    });

    it("resolves a Round 4 discard immediately", () => {
      const state = startGame(readyGame(), sequenceRandom(0), START).state;
      const playerId = state.turn!.playerId;
      setHand(state, playerId, ["SC03", "SC01", "SC02"]);
      state.phase = "strategy_draw";
      state.turn = null;
      state.round = 4;
      state.pendingCardDraw = {
        playerId,
        count: 1,
        resumePhase: "player_turn",
        deadlineAt: START + 45_000
      };

      const forced = forcePendingDecision(state, START + 1_000, sequenceRandom(0), "phone died");

      expect(forced.state.pendingCardDraw).toBeNull();
      expect(forced.state.phase).toBe("player_turn");
    });

    it("ends a stuck normal turn immediately", () => {
      const state = startGame(readyGame(), sequenceRandom(0), START).state;
      const stuckPlayerId = state.turn!.playerId;

      const forced = forcePendingDecision(state, START + 1_000, sequenceRandom(0), "walked away");

      expect(forced.state.turn?.playerId).not.toBe(stuckPlayerId);
    });

    it("refuses to force a paused or finished game", () => {
      const paused = pauseGame(freshGame(), START + 1_000, "break").state;
      expect(() => forcePendingDecision(paused, START + 2_000, sequenceRandom(0), "x")).toThrow(
        GameRuleError
      );
    });
  });
});
