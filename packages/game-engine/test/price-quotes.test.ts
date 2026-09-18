import { describe, expect, it } from "vitest";

import { BOARD_SPACES } from "@econova/game-content";
import type { ClientCommand } from "@econova/contracts";

import {
  chooseSecretObjective,
  createInitialGame,
  createPlayerProjection,
  createSeededRandom,
  executeGameCommand,
  quotePrices,
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
    players: Array.from({ length: 4 }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Player ${index + 1}`
    })),
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

/** Put the active player on an unowned property, waiting to decide. */
const offeredProperty = (): { state: GameState; playerId: string; propertyId: string } => {
  const state = playing();
  const playerId = state.turn!.playerId;
  const index = BOARD_SPACES.findIndex((space) => space.type === "property");
  const space = BOARD_SPACES[index]!;
  if (space.type !== "property") throw new Error("board has no property");
  state.players[playerId]!.position = index;
  state.turn!.stage = "awaiting_property_decision";
  return { state, playerId, propertyId: space.propertyId };
};

/** Give the active player one developable property in their action phase. */
const developable = (): { state: GameState; playerId: string; propertyId: string } => {
  const state = playing();
  const playerId = state.turn!.playerId;
  state.properties["P02"]!.ownerId = playerId;
  state.players[playerId]!.propertyIds = ["P02"];
  state.players[playerId]!.credits = 5_000;
  state.turn!.stage = "action_phase";
  state.turn!.actionsRemaining = 2;
  return { state, playerId, propertyId: "P02" };
};

const command = (state: GameState, body: Record<string, unknown>): ClientCommand =>
  ({
    requestId: "r",
    actionId: "a",
    expectedStateVersion: state.version,
    ...body
  }) as ClientCommand;

/**
 * The base figures in the content package are not what players are charged:
 * policies, breaking news, district control and card effects all move the
 * price. A quote is only worth showing if it is exactly what is taken.
 */
describe("price quotes are what the server actually charges", () => {
  it("quotes the purchase price the buy command then takes", () => {
    const { state, playerId, propertyId } = offeredProperty();
    const quoted = quotePrices(state, playerId).purchase;
    const before = state.players[playerId]!.credits;

    const after = executeGameCommand(state, playerId, command(state, {
      type: "buy_property",
      propertyId
    }), { now: 1_000, random: sequenceRandom(0) }).state;

    expect(quoted?.propertyId).toBe(propertyId);
    expect(before - after.players[playerId]!.credits).toBe(quoted?.price);
  });

  it("quotes the development cost the develop command then takes", () => {
    const { state, playerId, propertyId } = developable();
    const quoted = quotePrices(state, playerId).development.find(
      (entry) => entry.propertyId === propertyId
    );
    const before = state.players[playerId]!.credits;

    const after = executeGameCommand(state, playerId, command(state, {
      type: "develop_property",
      propertyId
    }), { now: 1_000, random: sequenceRandom(0) }).state;

    expect(before - after.players[playerId]!.credits).toBe(quoted?.cost);
  });

  it("reflects a policy discount instead of the printed base", () => {
    const { state, playerId, propertyId } = developable();
    const base = quotePrices(state, playerId).development[0]!.cost;

    // POL03B takes 20 off every development.
    state.activePolicyIds = ["POL03B"];
    const discounted = quotePrices(state, playerId).development[0]!.cost;

    expect(discounted).toBeLessThan(base);
    expect(
      quotePrices(state, playerId).development.find((entry) => entry.propertyId === propertyId)
    ).toBeDefined();
  });

  it("leaves out a property bought this turn, which cannot be developed yet", () => {
    const { state, playerId } = developable();
    state.properties["P02"]!.purchasedOnTurn = state.turn!.number;
    expect(quotePrices(state, playerId).development).toEqual([]);
  });

  it("quotes nothing on another player's turn, where turn effects are theirs", () => {
    const { state, playerId } = developable();
    const other = state.currentTurnOrder.find((id) => id !== playerId)!;
    expect(quotePrices(state, other)).toEqual({ purchase: null, development: [] });
  });

  it("reaches the player through their private projection", () => {
    const { state, playerId } = developable();
    const projection = createPlayerProjection(state, playerId);
    expect(projection.self.quotes.development).toHaveLength(1);
  });
});
