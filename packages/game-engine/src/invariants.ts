import {
  GAME_CONFIG,
  PROPERTIES,
  SECRET_OBJECTIVES,
  STRATEGY_CARDS
} from "@econova/game-content";

import { GameInvariantError } from "./errors.js";
import type { GameState } from "./state.js";

const phases = new Set(["objective_selection", "ready", "breaking_news", "strategy_draw", "council", "player_turn", "round_resolution", "paused", "completed"]);
const resumablePhases = new Set([...phases].filter(phase => phase !== "paused"));
const stages = new Set(["awaiting_roll", "awaiting_shortcut_choice", "awaiting_property_decision", "auction", "landing_fee_reaction", "emergency_sale", "awaiting_event_choice", "awaiting_card_discard", "action_phase"]);
const districts = ["food", "tech", "entertainment", "mobility"] as const;
const nonNegativeInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

export const validateGameState = (state: GameState): string[] => {
  const issues: string[] = [];
  const playerIds = new Set(Object.keys(state.players));
  const canonicalPropertyIds = new Set(PROPERTIES.map(({ id }) => id));
  if (state.schemaVersion !== 1) issues.push("Unsupported state schema version");
  if (state.pauseStartedAt != null && (!Number.isSafeInteger(state.pauseStartedAt) || state.pauseStartedAt < 0)) issues.push("Invalid operator pause timestamp");
  if (state.deferredDisconnectPlayerIds !== undefined && (!Array.isArray(state.deferredDisconnectPlayerIds) || state.deferredDisconnectPlayerIds.some(id => !playerIds.has(id)) || new Set(state.deferredDisconnectPlayerIds).size !== state.deferredDisconnectPlayerIds.length)) issues.push("Invalid deferred disconnect identities");

  if (!nonNegativeInteger(state.version)) {
    issues.push("State version must be a non-negative integer");
  }
  if (playerIds.size < GAME_CONFIG.minPlayers || playerIds.size > GAME_CONFIG.maxPlayers) issues.push("Invalid player count");
  if (!phases.has(state.phase)) issues.push("Invalid game phase");
  const effectivePhase = state.phase === "paused" ? state.phaseBeforePause : state.phase;
  if (effectivePhase === null || !resumablePhases.has(effectivePhase)) issues.push("Invalid resumable game phase");
  if (!nonNegativeInteger(state.round) || state.round > GAME_CONFIG.rounds) issues.push("Invalid round");
  if (effectivePhase !== "objective_selection" && effectivePhase !== "ready" && state.round === 0) issues.push("An active game requires a positive round");
  if (!nonNegativeInteger(state.currentTurnIndex) || state.currentTurnIndex >= playerIds.size) issues.push("Invalid current turn index");
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

  for (const [id, player] of Object.entries(state.players)) {
    if (player.id !== id) issues.push(`Player ${id} has a mismatched identity`);
    if (player.credits < 0) issues.push(`Player ${player.id} has negative Credits`);
    if (player.influence < 0) issues.push(`Player ${player.id} has negative Influence`);
    if (!nonNegativeInteger(player.credits)) issues.push(`Player ${player.id} has invalid Credits`);
    if (!nonNegativeInteger(player.influence)) issues.push(`Player ${player.id} has invalid Influence`);
    if (!nonNegativeInteger(player.position) || player.position >= GAME_CONFIG.boardSpaces) {
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
    if (property.id !== definition.id) issues.push(`Property ${definition.id} has a mismatched identity`);
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

  if (Object.keys(state.demand).length !== districts.length) issues.push("Invalid district collection");
  for (const district of districts) {
    const demand = state.demand[district];
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
  if (state.turn !== null) {
    const turn = state.turn;
    if (!stages.has(turn.stage)) issues.push("Invalid turn stage");
    if (!nonNegativeInteger(turn.actionsRemaining) || turn.actionsRemaining > GAME_CONFIG.turnActions || !nonNegativeInteger(turn.actionsUsed) || turn.actionsUsed > GAME_CONFIG.turnActions) issues.push("Invalid turn Action count");
    if (turn.roll !== null && (!Number.isInteger(turn.roll) || turn.roll < 1 || turn.roll > 6)) issues.push("Invalid die result");
    if (turn.turnDeadlineAt !== null && !nonNegativeInteger(turn.turnDeadlineAt)) issues.push("Invalid turn deadline");
    if (turn.remainingTurnMilliseconds !== null && (!nonNegativeInteger(turn.remainingTurnMilliseconds) || turn.remainingTurnMilliseconds > GAME_CONFIG.turnTimerSeconds * 1000)) issues.push("Invalid remaining turn time");
    if (turn.stage === "auction" && state.auction === null) issues.push("Auction stage requires auction state");
    if (turn.stage === "emergency_sale" && state.emergencySale === null) issues.push("Emergency-sale stage requires emergency-sale state");
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
  const allObjectives = [...selectedObjectives, ...state.objectiveDeck, ...(state.objectiveSelection?.offeredObjectiveIds ?? [])];
  if (allObjectives.length !== SECRET_OBJECTIVES.length || new Set(allObjectives).size !== allObjectives.length || allObjectives.some(id => !validObjectiveIds.has(id))) {
    issues.push("Secret Objective state must account for each objective exactly once");
  }

  return issues;
};

export const assertGameInvariants = (state: GameState): void => {
  const issues = validateGameState(state);
  if (issues.length > 0) {
    throw new GameInvariantError(`Game-state invariant violation: ${issues.join("; ")}`);
  }
};
