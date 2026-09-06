import {
  GAME_CONFIG,
  PROPERTIES,
  SECRET_OBJECTIVES,
  STRATEGY_CARDS
} from "@econova/game-content";

import { GameInvariantError } from "./errors.js";
import type { GameState } from "./state.js";

export const validateGameState = (state: GameState): string[] => {
  const issues: string[] = [];
  const playerIds = new Set(Object.keys(state.players));
  const canonicalPropertyIds = new Set(PROPERTIES.map(({ id }) => id));
  if (state.pauseStartedAt != null && (!Number.isSafeInteger(state.pauseStartedAt) || state.pauseStartedAt < 0)) issues.push("Invalid operator pause timestamp");
  if (state.deferredDisconnectPlayerIds !== undefined && (!Array.isArray(state.deferredDisconnectPlayerIds) || state.deferredDisconnectPlayerIds.some(id => !playerIds.has(id)) || new Set(state.deferredDisconnectPlayerIds).size !== state.deferredDisconnectPlayerIds.length)) issues.push("Invalid deferred disconnect identities");

  if (!Number.isInteger(state.version) || state.version < 0) {
    issues.push("State version must be a non-negative integer");
  }
  if (new Set(state.turnOrder).size !== state.turnOrder.length) {
    issues.push("Base turn order contains duplicate players");
  }
  if (
    state.turnOrder.length !== playerIds.size ||
    state.turnOrder.some((playerId) => !playerIds.has(playerId))
  ) {
    issues.push("Base turn order must contain every player exactly once");
  }
  if (
    state.currentTurnOrder.length !== playerIds.size ||
    new Set(state.currentTurnOrder).size !== playerIds.size ||
    state.currentTurnOrder.some((playerId) => !playerIds.has(playerId))
  ) {
    issues.push("Current turn order must contain every player exactly once");
  }

  for (const player of Object.values(state.players)) {
    if (player.credits < 0) issues.push(`Player ${player.id} has negative Credits`);
    if (player.influence < 0) issues.push(`Player ${player.id} has negative Influence`);
    if (player.position < 0 || player.position >= GAME_CONFIG.boardSpaces) {
      issues.push(`Player ${player.id} has invalid board position`);
    }
    if (player.cards.length > GAME_CONFIG.strategyCardHandLimit) {
      issues.push(`Player ${player.id} exceeds the Strategy Card hand limit`);
    }
    if (new Set(player.propertyIds).size !== player.propertyIds.length) {
      issues.push(`Player ${player.id} has duplicate property references`);
    }
    for (const propertyId of player.propertyIds) {
      if (!canonicalPropertyIds.has(propertyId)) {
        issues.push(`Player ${player.id} references unknown property ${propertyId}`);
      } else if (state.properties[propertyId]?.ownerId !== player.id) {
        issues.push(`Property ${propertyId} ownership contradicts Player ${player.id}`);
      }
    }
  }

  if (Object.keys(state.properties).length !== PROPERTIES.length) {
    issues.push("Authoritative property collection has an invalid size");
  }
  for (const definition of PROPERTIES) {
    const property = state.properties[definition.id];
    if (property === undefined) {
      issues.push(`Missing property state ${definition.id}`);
      continue;
    }
    if (
      !Number.isInteger(property.developmentLevel) ||
      property.developmentLevel < 0 ||
      property.developmentLevel > GAME_CONFIG.maximumDevelopmentLevel
    ) {
      issues.push(`Property ${property.id} has an invalid development level`);
    }
    const listedOwners = Object.values(state.players).filter((player) =>
      player.propertyIds.includes(property.id)
    );
    if (property.ownerId === null && listedOwners.length > 0) {
      issues.push(`Property ${property.id} is unowned but appears in a player portfolio`);
    } else if (
      property.ownerId !== null &&
      (listedOwners.length !== 1 || listedOwners[0]?.id !== property.ownerId)
    ) {
      issues.push(`Property ${property.id} owner and portfolio references disagree`);
    }
  }

  for (const [district, demand] of Object.entries(state.demand)) {
    if (
      !Number.isInteger(demand) ||
      demand < GAME_CONFIG.demandMinimum ||
      demand > GAME_CONFIG.demandMaximum
    ) {
      issues.push(`District ${district} has Demand outside the approved range`);
    }
  }

  if (state.phase === "player_turn" && state.turn === null) {
    issues.push("Player-turn phase requires an active turn");
  }
  if (state.turn !== null && !playerIds.has(state.turn.playerId)) {
    issues.push("Active turn references an unknown player");
  }
  if (state.auction !== null && state.turn?.stage !== "auction") {
    issues.push("Auction state requires the auction turn stage");
  }
  if (state.emergencySale !== null && state.turn?.stage !== "emergency_sale") {
    issues.push("Emergency-sale state requires the emergency-sale turn stage");
  }
  if (state.phase === "council" && state.council === null) {
    issues.push("Council phase requires Council state");
  }

  const validCardIds = new Set(STRATEGY_CARDS.map(({ id }) => id));
  const allCardIds = [
    ...state.strategyDeck,
    ...Object.values(state.players).flatMap(({ cards }) => cards)
  ];
  for (const cardId of allCardIds) {
    if (!validCardIds.has(cardId)) issues.push(`Unknown Strategy Card ${cardId}`);
  }
  if (new Set(allCardIds).size !== allCardIds.length) {
    issues.push("Strategy Card state contains duplicate physical cards");
  }
  if (allCardIds.length !== STRATEGY_CARDS.length) {
    issues.push("Strategy Card state does not account for all physical cards");
  }

  const validObjectiveIds = new Set(SECRET_OBJECTIVES.map(({ id }) => id));
  const selectedObjectives = Object.values(state.players).flatMap(({ secretObjectiveId }) =>
    secretObjectiveId === null ? [] : [secretObjectiveId]
  );
  if (new Set(selectedObjectives).size !== selectedObjectives.length) {
    issues.push("Secret Objective selections contain duplicates");
  }
  for (const objectiveId of selectedObjectives) {
    if (!validObjectiveIds.has(objectiveId)) issues.push(`Unknown Secret Objective ${objectiveId}`);
  }

  return issues;
};

export const assertGameInvariants = (state: GameState): void => {
  const issues = validateGameState(state);
  if (issues.length > 0) {
    throw new GameInvariantError(`Game-state invariant violation: ${issues.join("; ")}`);
  }
};
