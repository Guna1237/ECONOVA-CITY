import { describe, expect, it } from "vitest";

import type { ClientCommand } from "@econova/contracts";

import {
  chooseSecretObjective,
  createInitialGame,
  createPlayerProjection,
  createSeededRandom,
  executeGameCommand,
  startGame,
  type GameState,
  type RandomSource
} from "../src/index.js";

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

const playing = (): GameState => {
  let state = createInitialGame({
    gameId: "game-a",
    roomId: "room-a",
    players: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
    random: createSeededRandom(99),
    now: 1_000
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0],
      1_000
    );
  }
  return startGame(state, sequenceRandom(0), 1_000).state;
};

/** Hand the active player exactly these cards, taking them out of the deck. */
const withHand = (state: GameState, cards: string[]): string => {
  const playerId = state.turn!.playerId;
  // Every physical card must stay accounted for, so the old hand goes back
  // into the deck before the wanted cards are taken from wherever they are.
  state.strategyDeck.push(...state.players[playerId]!.cards);
  state.players[playerId]!.cards = [];
  for (const player of Object.values(state.players)) {
    const held = player.cards.filter((card) => cards.includes(card));
    player.cards = player.cards.filter((card) => !cards.includes(card));
    state.strategyDeck.push(...held);
  }
  state.strategyDeck = state.strategyDeck.filter((card) => !cards.includes(card));
  state.players[playerId]!.cards = [...cards];
  return playerId;
};

let sequence = 0;
const act = (state: GameState, playerId: string, body: Record<string, unknown>): GameState => {
  sequence += 1;
  return executeGameCommand(
    state,
    playerId,
    {
      requestId: `r${sequence}`,
      actionId: `a${sequence}`,
      expectedStateVersion: state.version,
      ...body
    } as ClientCommand,
    { now: 1_000, random: sequenceRandom(2) }
  ).state;
};

/**
 * Moving backward costs the Shortcut card, so a direction choice only means
 * something to a player who holds one and has not already used their one card
 * for the turn. Everyone else should simply move.
 */
describe("the forward or backward choice", () => {
  it("is skipped entirely without the Shortcut card: the roll moves the piece", () => {
    const state = playing();
    const playerId = withHand(state, ["SC02"]);
    const start = state.players[playerId]!.position;

    const rolled = act(state, playerId, { type: "roll" });

    expect(rolled.turn?.stage).not.toBe("awaiting_shortcut_choice");
    expect(rolled.players[playerId]!.position).not.toBe(start);
    expect(createPlayerProjection(rolled, playerId).self.capabilities.commandTypes).not.toContain(
      "choose_shortcut"
    );
  });

  it("is offered to a player holding the Shortcut card", () => {
    const state = playing();
    const playerId = withHand(state, ["SC11"]);

    const rolled = act(state, playerId, { type: "roll" });

    expect(rolled.turn?.stage).toBe("awaiting_shortcut_choice");
    expect(createPlayerProjection(rolled, playerId).self.capabilities.commandTypes).toContain(
      "choose_shortcut"
    );
  });

  it("is skipped when the player's one card this turn is already spent", () => {
    const state = playing();
    const playerId = withHand(state, ["SC11"]);
    state.turn!.cardPlayed = true;

    const rolled = act(state, playerId, { type: "roll" });

    expect(rolled.turn?.stage).not.toBe("awaiting_shortcut_choice");
  });

  it("spends the card and moves backward when the shortcut is taken", () => {
    const state = playing();
    const playerId = withHand(state, ["SC11"]);
    state.players[playerId]!.position = 10;

    const rolled = act(state, playerId, { type: "roll" });
    const moved = act(rolled, playerId, { type: "choose_shortcut", useShortcut: true });

    expect(moved.players[playerId]!.cards).not.toContain("SC11");
    expect(moved.players[playerId]!.position).toBe(10 - rolled.turn!.roll!);
  });

  it("keeps the card when the player chooses to move forward anyway", () => {
    const state = playing();
    const playerId = withHand(state, ["SC11"]);

    const rolled = act(state, playerId, { type: "roll" });
    const moved = act(rolled, playerId, { type: "choose_shortcut", useShortcut: false });

    expect(moved.players[playerId]!.cards).toContain("SC11");
  });
});
