import {
  GAME_CONFIG,
  PROPERTIES,
  SECRET_OBJECTIVES,
  STRATEGY_CARDS
} from "@econova/game-content";

import { GameRuleError } from "./errors.js";
import { shuffle, type RandomSource } from "./random.js";
import type { GameState, PlayerState } from "./state.js";

export interface SetupPlayer {
  readonly id: string;
  readonly name: string;
}

export const createInitialGame = (input: {
  readonly gameId: string;
  readonly roomId: string;
  readonly players: readonly SetupPlayer[];
  readonly random: RandomSource;
}): GameState => {
  if (
    input.players.length < GAME_CONFIG.minPlayers ||
    input.players.length > GAME_CONFIG.maxPlayers
  ) {
    throw new GameRuleError(
      "INVALID_PLAYER_COUNT",
      `A game requires ${GAME_CONFIG.minPlayers}-${GAME_CONFIG.maxPlayers} players.`
    );
  }
  if (new Set(input.players.map(({ id }) => id)).size !== input.players.length) {
    throw new GameRuleError("DUPLICATE_PLAYER", "Player identifiers must be unique.");
  }

  const turnOrder = shuffle(
    input.players.map(({ id }) => id),
    input.random
  );
  const strategyDeck = shuffle(
    STRATEGY_CARDS.map(({ id }) => id),
    input.random
  );
  const objectiveDeck = shuffle(
    SECRET_OBJECTIVES.map(({ id }) => id),
    input.random
  );

  const players: Record<string, PlayerState> = {};
  for (const player of input.players) {
    players[player.id] = {
      id: player.id,
      name: player.name,
      credits: GAME_CONFIG.startingCredits,
      influence: GAME_CONFIG.startingInfluence,
      position: 0,
      cards: strategyDeck.splice(0, GAME_CONFIG.startingCards),
      propertyIds: [],
      secretObjectiveId: null,
      connected: true,
      disconnectedAt: null
    };
  }

  const objectiveOffer = objectiveDeck.splice(0, 2);
  const firstPlayerId = turnOrder[0];
  if (firstPlayerId === undefined || objectiveOffer[0] === undefined || objectiveOffer[1] === undefined) {
    throw new GameRuleError("INVALID_SETUP", "Unable to create the first objective offer.");
  }

  return {
    schemaVersion: 1,
    gameId: input.gameId,
    roomId: input.roomId,
    version: 0,
    phase: "objective_selection",
    phaseBeforePause: null,
    round: 0,
    turnOrder,
    currentTurnOrder: [...turnOrder],
    currentTurnIndex: 0,
    players,
    properties: Object.fromEntries(
      PROPERTIES.map(({ id }) => [
        id,
        {
          id,
          ownerId: null,
          developmentLevel: 0,
          purchasedOnTurn: null,
          receivedOnTurn: null
        }
      ])
    ),
    demand: { food: 0, tech: 0, entertainment: 0, mobility: 0 },
    strategyDeck,
    objectiveDeck,
    objectiveSelection: {
      playerId: firstPlayerId,
      offeredObjectiveIds: [objectiveOffer[0], objectiveOffer[1]]
    },
    turn: null,
    auction: null,
    pendingLandingFee: null,
    emergencySale: null,
    council: null,
    trade: null,
    pendingEventChoice: null,
    pendingCardDraw: null,
    pendingCardDrawPlayerIds: [],
    activeBreakingNewsId: null,
    activeRoundEffects: [],
    activePolicyIds: [],
    results: [],
    publicAnnouncements: []
  };
};

export const chooseSecretObjective = (
  state: GameState,
  playerId: string,
  objectiveId: string
): GameState => {
  if (state.phase !== "objective_selection" || state.objectiveSelection === null) {
    throw new GameRuleError("INVALID_PHASE", "Secret objectives are not being selected.");
  }
  if (state.objectiveSelection.playerId !== playerId) {
    throw new GameRuleError("NOT_OBJECTIVE_PLAYER", "It is not this player's objective choice.");
  }
  if (!state.objectiveSelection.offeredObjectiveIds.includes(objectiveId)) {
    throw new GameRuleError("INVALID_OBJECTIVE", "The objective was not offered to this player.");
  }

  const next = JSON.parse(JSON.stringify(state)) as GameState;
  const player = next.players[playerId];
  if (player === undefined) {
    throw new GameRuleError("UNKNOWN_PLAYER", "Player does not exist.");
  }
  player.secretObjectiveId = objectiveId;
  const unchosenObjectiveId = next.objectiveSelection?.offeredObjectiveIds.find(
    (offeredId) => offeredId !== objectiveId
  );
  if (unchosenObjectiveId === undefined) {
    throw new GameRuleError("INVALID_OBJECTIVE_STATE", "Objective offer did not contain two choices.");
  }
  next.objectiveDeck.push(unchosenObjectiveId);
  next.version += 1;

  const selectedCount = Object.values(next.players).filter(
    ({ secretObjectiveId }) => secretObjectiveId !== null
  ).length;
  if (selectedCount === next.turnOrder.length) {
    next.objectiveSelection = null;
    next.phase = "ready";
    return next;
  }

  const nextPlayerId = next.turnOrder[selectedCount];
  const nextOffer = next.objectiveDeck.splice(0, 2);
  if (nextPlayerId === undefined || nextOffer[0] === undefined || nextOffer[1] === undefined) {
    throw new GameRuleError("INVALID_OBJECTIVE_STATE", "Unable to create the next objective offer.");
  }
  next.objectiveSelection = {
    playerId: nextPlayerId,
    offeredObjectiveIds: [nextOffer[0], nextOffer[1]]
  };
  return next;
};
