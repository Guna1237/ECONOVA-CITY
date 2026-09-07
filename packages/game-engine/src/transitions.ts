import type { ClientCommand } from "@econova/contracts";
import {
  BOARD_SPACES,
  BREAKING_NEWS,
  GAME_CONFIG,
  POLICY_PAIRS,
  PROPERTY_BY_ID,
  SPECIAL_EVENTS,
  STRATEGY_CARD_BY_ID,
  type DistrictId
} from "@econova/game-content";

import {
  calculateFinalScore,
  calculateDevelopmentCost,
  calculateLandingFee,
  calculateLiquidationValue,
  calculatePropertyIncome,
  calculatePurchasePrice,
  getDistrictControl,
  resolveMovement,
  sortPropertiesForAutomaticLiquidation
} from "./calculations.js";
import { GameInvariantError, GameRuleError } from "./errors.js";
import { assertGameInvariants } from "./invariants.js";
import type { RandomSource } from "./random.js";
import { evaluateSecretObjective, rankFinalScores } from "./scoring.js";
import { chooseSecretObjective } from "./setup.js";
import type {
  GameState,
  PlayerState,
  PropertyState,
  TurnState
} from "./state.js";

export interface GameEvent {
  readonly type: string;
  readonly visibility: "public" | "player" | "admin";
  readonly playerId?: string;
  readonly payload: Record<string, unknown>;
}

export interface TransitionResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export interface TransitionContext {
  readonly now: number;
  readonly random: RandomSource;
}

const cloneState = (state: GameState): GameState =>
  JSON.parse(JSON.stringify(state)) as GameState;

const publicEvent = (type: string, payload: Record<string, unknown>): GameEvent => ({
  type,
  visibility: "public",
  payload
});

const requirePlayer = (state: GameState, playerId: string): PlayerState => {
  const player = state.players[playerId];
  if (player === undefined) throw new GameRuleError("UNKNOWN_PLAYER", "Player does not exist.");
  return player;
};

const requireTurn = (state: GameState): TurnState => {
  if (state.phase !== "player_turn" || state.turn === null) {
    throw new GameRuleError("INVALID_PHASE", "A player turn is not active.");
  }
  return state.turn;
};

const requireActivePlayer = (state: GameState, playerId: string): TurnState => {
  const turn = requireTurn(state);
  if (turn.playerId !== playerId) {
    throw new GameRuleError("NOT_CURRENT_PLAYER", "It is not this player's turn.");
  }
  return turn;
};

const clampDemand = (value: number): number =>
  Math.max(GAME_CONFIG.demandMinimum, Math.min(GAME_CONFIG.demandMaximum, value));

const createTurn = (state: GameState, playerId: string, now: number): TurnState => ({
  number: (state.round - 1) * state.turnOrder.length + state.currentTurnIndex + 1,
  playerId,
  stage: "awaiting_roll",
  actionsRemaining: GAME_CONFIG.turnActions,
  cardPlayed: false,
  roll: null,
  actionsUsed: 0,
  turnDeadlineAt: now + GAME_CONFIG.turnTimerSeconds * 1_000,
  remainingTurnMilliseconds: null,
  effects: []
});

const pauseNormalTurnTimer = (turn: TurnState, now: number): void => {
  if (turn.turnDeadlineAt === null) {
    if (turn.remainingTurnMilliseconds === null) {
      throw new GameInvariantError("Normal turn timer cannot be paused without a deadline.");
    }
    return;
  }
  turn.remainingTurnMilliseconds = Math.max(0, turn.turnDeadlineAt - now);
  turn.turnDeadlineAt = null;
};

const resumeNormalTurnTimer = (turn: TurnState, now: number): void => {
  if (turn.remainingTurnMilliseconds === null) {
    throw new GameInvariantError("Normal turn timer cannot resume without stored remaining time.");
  }
  turn.turnDeadlineAt = now + turn.remainingTurnMilliseconds;
  turn.remainingTurnMilliseconds = null;
};

const startFirstTurn = (state: GameState, now: number): void => {
  state.phase = "player_turn";
  state.currentTurnIndex = 0;
  const playerId = state.currentTurnOrder[0];
  if (playerId === undefined) throw new GameInvariantError("Current turn order is empty.");
  state.turn = createTurn(state, playerId, now);
};

const districtIds = ["food", "tech", "entertainment", "mobility"] as const;

const applyBreakingNews = (
  state: GameState,
  random: RandomSource,
  events: GameEvent[]
): void => {
  const definition = BREAKING_NEWS[random.nextInt(BREAKING_NEWS.length)];
  if (definition === undefined) throw new GameInvariantError("Breaking News catalog is empty.");
  state.activeBreakingNewsId = definition.id;
  events.push(publicEvent("breaking_news_revealed", { eventId: definition.id }));

  switch (definition.id) {
    case "BN01":
      state.demand.tech = clampDemand(state.demand.tech + 1);
      break;
    case "BN02":
      state.demand.food = clampDemand(state.demand.food + 1);
      break;
    case "BN03":
      state.demand.mobility = clampDemand(state.demand.mobility - 1);
      break;
    case "BN04":
      state.demand.entertainment = clampDemand(state.demand.entertainment + 1);
      break;
    case "BN05":
      for (const player of Object.values(state.players)) player.credits += 60;
      break;
    case "BN06": {
      const available = [...districtIds];
      for (let count = 0; count < 2; count += 1) {
        const index = random.nextInt(available.length);
        const district = available.splice(index, 1)[0];
        if (district === undefined) throw new GameInvariantError("Unable to select a district.");
        const delta = random.nextInt(2) === 0 ? -1 : 1;
        state.demand[district] = clampDemand(state.demand[district] + delta);
      }
      break;
    }
    case "BN07":
    case "BN08":
    case "BN10":
      state.activeRoundEffects.push(definition.id);
      break;
    case "BN09": {
      const propertyCounts = Object.values(state.players).map(({ propertyIds }) => propertyIds.length);
      const fewest = Math.min(...propertyCounts);
      for (const player of Object.values(state.players)) {
        if (player.propertyIds.length === fewest) player.credits += 100;
      }
      break;
    }
  }
};

const beginRound = (
  state: GameState,
  round: number,
  random: RandomSource,
  now: number,
  events: GameEvent[]
): void => {
  state.round = round;
  state.phase = "breaking_news";
  state.turn = null;
  const rotation = (round - 1) % state.turnOrder.length;
  state.currentTurnOrder = [
    ...state.turnOrder.slice(rotation),
    ...state.turnOrder.slice(0, rotation)
  ];
  applyBreakingNews(state, random, events);

  if (round === 4) {
    for (const playerId of state.currentTurnOrder) {
      const player = requirePlayer(state, playerId);
      if (player.cards.length >= GAME_CONFIG.strategyCardHandLimit) {
        state.pendingCardDrawPlayerIds.push(playerId);
      } else {
        const drawn = state.strategyDeck.shift();
        if (drawn !== undefined) player.cards.push(drawn);
      }
    }
    if (state.pendingCardDrawPlayerIds.length > 0) {
      const playerId = state.pendingCardDrawPlayerIds.shift();
      if (playerId === undefined) throw new GameInvariantError("Missing pending card-draw player.");
      state.phase = "strategy_draw";
      state.pendingCardDraw = { playerId, count: 1, resumePhase: "player_turn" };
      return;
    }
  }

  if (round === 3 || round === 6) {
    const eligiblePairs = POLICY_PAIRS.filter((pair) => pair.round === round);
    const pair = eligiblePairs[random.nextInt(eligiblePairs.length)];
    if (pair === undefined) throw new GameInvariantError("No eligible Council policy pair.");
    state.phase = "council";
    state.council = {
      id: `council-round-${round}`,
      round,
      optionAId: pair.policyIds[0],
      optionBId: pair.policyIds[1],
      allocations: {},
      deadlineAt: now + GAME_CONFIG.councilTimerSeconds * 1_000
    };
    events.push(
      publicEvent("council_started", {
        councilId: state.council.id,
        optionAId: state.council.optionAId,
        optionBId: state.council.optionBId
      })
    );
    // Presence may have changed before this phase existed; no new disconnect event will arrive.
    for (const player of Object.values(state.players)) {
      if (!player.connected) applyDisconnectEffects(state, player.id, now, events);
    }
    return;
  }

  startFirstTurn(state, now);
};

export const startGame = (
  state: GameState,
  random: RandomSource,
  now: number
): TransitionResult => {
  if (state.phase !== "ready") {
    throw new GameRuleError("INVALID_PHASE", "Game cannot start before setup is complete.");
  }
  const next = cloneState(state);
  const events: GameEvent[] = [];
  beginRound(next, 1, random, now, events);
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};

const entertainmentOwned = (state: GameState, playerId: string): number =>
  requirePlayer(state, playerId).propertyIds.filter(
    (propertyId) => PROPERTY_BY_ID.get(propertyId)?.district === "entertainment"
  ).length;

const beginActionPhase = (state: GameState): void => {
  const turn = requireTurn(state);
  turn.stage = "action_phase";
  turn.roll = turn.roll;
};

const landingFeePolicyModifiers = (state: GameState): number[] => {
  const modifiers: number[] = [];
  if (state.activePolicyIds.includes("POL02A")) modifiers.push(10);
  return modifiers;
};

const demandPolicyMultiplier = (state: GameState): number =>
  state.activePolicyIds.includes("POL04B") ? 2 : 1;

const resolveLanding = (
  state: GameState,
  playerId: string,
  random: RandomSource,
  events: GameEvent[]
): void => {
  const player = requirePlayer(state, playerId);
  const turn = requireActivePlayer(state, playerId);
  const space = BOARD_SPACES[player.position];
  if (space === undefined) throw new GameInvariantError("Player is not on the board.");

  if (space.type === "special") {
    if (space.specialId === "city_center") {
      beginActionPhase(state);
      return;
    }
    const event = SPECIAL_EVENTS[random.nextInt(SPECIAL_EVENTS.length)];
    if (event === undefined) throw new GameInvariantError("Special Event catalog is empty.");
    events.push(publicEvent("special_event_revealed", { eventId: event.id, playerId }));
    switch (event.id) {
      case "SE01":
        player.credits += 80;
        break;
      case "SE02":
        player.influence += 2;
        break;
      case "SE03":
      case "SE04":
        state.pendingEventChoice = { playerId, eventId: event.id };
        turn.stage = "awaiting_event_choice";
        return;
      case "SE05":
        if (player.cards.length >= GAME_CONFIG.strategyCardHandLimit) {
          state.pendingCardDraw = { playerId, count: 1, resumePhase: "player_turn" };
          turn.stage = "awaiting_card_discard";
          return;
        }
        {
          const card = state.strategyDeck.shift();
          if (card !== undefined) player.cards.push(card);
        }
        break;
      case "SE06":
        turn.effects.push("SE06");
        break;
      case "SE07":
        player.influence += 1;
        player.credits += 40;
        break;
      case "SE08":
        state.activeRoundEffects.push("SE08");
        break;
    }
    beginActionPhase(state);
    return;
  }

  const property = state.properties[space.propertyId];
  if (property === undefined) throw new GameInvariantError("Board property has no state.");
  if (property.ownerId === null) {
    turn.stage = "awaiting_property_decision";
    return;
  }
  if (property.ownerId === playerId) {
    beginActionPhase(state);
    return;
  }

  const temporaryAdditiveModifiers = state.activeRoundEffects.includes("BN08") ? [-10] : [];
  const tollEffect = `SC10:${property.ownerId}`;
  const temporaryMultipliers = state.activeRoundEffects.includes(tollEffect) ? [2] : [];
  const definition = PROPERTY_BY_ID.get(property.id);
  if (definition === undefined) throw new GameInvariantError("Property definition is missing.");
  const amount = calculateLandingFee({
    propertyId: property.id,
    developmentLevel: property.developmentLevel,
    demand: state.demand[definition.district],
    temporaryAdditiveModifiers,
    temporaryMultipliers,
    policyAdditiveModifiers: landingFeePolicyModifiers(state),
    demandMultiplier: demandPolicyMultiplier(state),
    insured: false
  });
  if (temporaryMultipliers.length > 0) {
    state.activeRoundEffects = state.activeRoundEffects.filter((effect) => effect !== tollEffect);
  }
  state.pendingLandingFee = {
    payerId: playerId,
    ownerId: property.ownerId,
    propertyId: property.id,
    amount
  };
  turn.stage = "landing_fee_reaction";
};

const payPendingLandingFee = (state: GameState, now: number): GameEvent[] => {
  const fee = state.pendingLandingFee;
  if (fee === null) throw new GameRuleError("NO_LANDING_FEE", "No landing fee is pending.");
  const payer = requirePlayer(state, fee.payerId);
  const owner = requirePlayer(state, fee.ownerId);
  if (payer.credits < fee.amount) {
    state.emergencySale = { ...fee, deadlineAt: now + GAME_CONFIG.emergencySaleTimerSeconds * 1_000 };
    const turn = requireTurn(state);
    pauseNormalTurnTimer(turn, now);
    turn.stage = "emergency_sale";
    return [publicEvent("emergency_sale_started", { playerId: fee.payerId })];
  }
  payer.credits -= fee.amount;
  owner.credits += fee.amount;
  state.pendingLandingFee = null;
  beginActionPhase(state);
  return [
    publicEvent("landing_fee_paid", {
      payerId: fee.payerId,
      ownerId: fee.ownerId,
      propertyId: fee.propertyId,
      amount: fee.amount
    })
  ];
};

const purchasePriceFor = (state: GameState, property: PropertyState): number => {
  const definition = PROPERTY_BY_ID.get(property.id);
  if (definition === undefined) throw new GameInvariantError("Property definition is missing.");
  const turn = requireTurn(state);
  const temporaryModifiers: Array<{ amount: number; minimum: number }> = [];
  if (turn.effects.includes("SC04")) temporaryModifiers.push({ amount: -40, minimum: 40 });
  if (state.activeRoundEffects.includes("BN10") && property.developmentLevel === 0) {
    temporaryModifiers.push({ amount: -20, minimum: 50 });
  }
  return calculatePurchasePrice({ basePrice: definition.basePrice, temporaryModifiers });
};

const transferProperty = (
  state: GameState,
  property: PropertyState,
  newOwnerId: string,
  acquisition: "purchase" | "trade"
): void => {
  if (property.ownerId !== null) {
    const previousOwner = requirePlayer(state, property.ownerId);
    previousOwner.propertyIds = previousOwner.propertyIds.filter((id) => id !== property.id);
  }
  const owner = requirePlayer(state, newOwnerId);
  if (!owner.propertyIds.includes(property.id)) owner.propertyIds.push(property.id);
  property.ownerId = newOwnerId;
  const turnNumber = state.turn?.number ?? null;
  if (acquisition === "purchase") property.purchasedOnTurn = turnNumber;
  else property.receivedOnTurn = turnNumber;
};

const finalizeAuction = (state: GameState, events: GameEvent[], now: number): void => {
  const auction = state.auction;
  if (auction === null) throw new GameInvariantError("No auction to finalize.");
  const bids = auction.eligiblePlayerIds
    .map((playerId) => ({ playerId, amount: auction.bids[playerId] ?? 0 }))
    .filter(({ amount }) => amount > 0)
    .sort(
      (left, right) =>
        right.amount - left.amount ||
        state.currentTurnOrder.indexOf(left.playerId) -
          state.currentTurnOrder.indexOf(right.playerId)
    );
  const winner = bids[0];
  if (winner !== undefined) {
    const player = requirePlayer(state, winner.playerId);
    if (player.credits < winner.amount) {
      throw new GameRuleError("INSUFFICIENT_CREDITS", "Winning bidder cannot pay the bid.");
    }
    const property = state.properties[auction.propertyId];
    if (property === undefined || property.ownerId !== null) {
      throw new GameInvariantError("Auction property is unavailable.");
    }
    player.credits -= winner.amount;
    transferProperty(state, property, winner.playerId, "purchase");
    events.push(
      publicEvent("auction_won", {
        auctionId: auction.id,
        propertyId: auction.propertyId,
        winnerId: winner.playerId,
        amount: winner.amount
      })
    );
  } else {
    events.push(publicEvent("auction_no_bids", { auctionId: auction.id }));
  }
  state.auction = null;
  beginActionPhase(state);
  resumeNormalTurnTimer(requireTurn(state), now);
};

const consumeCard = (state: GameState, player: PlayerState, cardId: string): void => {
  const index = player.cards.indexOf(cardId);
  if (index === -1) throw new GameRuleError("CARD_NOT_OWNED", "Player does not own this card.");
  player.cards.splice(index, 1);
  state.strategyDeck.push(cardId);
};

const consumeAction = (turn: TurnState): void => {
  if (turn.actionsRemaining < 1) {
    throw new GameRuleError("NO_ACTIONS_REMAINING", "No Actions remain this turn.");
  }
  turn.actionsRemaining -= 1;
  turn.actionsUsed += 1;
};

const useInsurance = (state: GameState, playerId: string): GameEvent[] => {
  const turn = requireActivePlayer(state, playerId);
  if (turn.stage !== "landing_fee_reaction" || state.pendingLandingFee?.payerId !== playerId) {
    throw new GameRuleError("INVALID_CARD_TIMING", "Insurance can only react to a pending fee.");
  }
  if (turn.cardPlayed) throw new GameRuleError("CARD_LIMIT", "Only one card may be played per turn.");
  const player = requirePlayer(state, playerId);
  consumeAction(turn);
  consumeCard(state, player, "SC12");
  turn.cardPlayed = true;
  const prevented = state.pendingLandingFee.amount;
  state.pendingLandingFee = null;
  beginActionPhase(state);
  return [publicEvent("insurance_played", { playerId, preventedAmount: prevented })];
};

const isDistrictId = (value: string | undefined): value is DistrictId =>
  value !== undefined && districtIds.includes(value as DistrictId);

const resolvePendingEventChoice = (
  state: GameState,
  districtId: DistrictId,
  events: GameEvent[]
): void => {
  const pending = state.pendingEventChoice;
  if (pending === null) {
    throw new GameRuleError("INVALID_EVENT_CHOICE", "No Special Event choice is pending.");
  }
  const delta = pending.eventId === "SE03" ? 1 : -1;
  state.demand[districtId] = clampDemand(state.demand[districtId] + delta);
  state.pendingEventChoice = null;
  beginActionPhase(state);
  events.push(
    publicEvent("special_event_choice_resolved", {
      eventId: pending.eventId,
      districtId,
      value: state.demand[districtId]
    })
  );
};

const automaticEventDistrict = (state: GameState): DistrictId => {
  const pending = state.pendingEventChoice;
  if (pending === null) throw new GameInvariantError("Pending Special Event choice is missing.");
  const canChange =
    pending.eventId === "SE03"
      ? (districtId: DistrictId) => state.demand[districtId] < GAME_CONFIG.demandMaximum
      : (districtId: DistrictId) => state.demand[districtId] > GAME_CONFIG.demandMinimum;
  return districtIds.find(canChange) ?? districtIds[0];
};

const resolvePendingCardDiscard = (
  state: GameState,
  playerId: string,
  cardId: string,
  now: number
): void => {
  const pending = state.pendingCardDraw;
  if (pending === null || pending.playerId !== playerId) {
    throw new GameRuleError("INVALID_CARD_DISCARD", "No card discard is pending for this player.");
  }
  const player = requirePlayer(state, playerId);
  consumeCard(state, player, cardId);
  const drawn = state.strategyDeck.shift();
  if (drawn !== undefined) player.cards.push(drawn);
  state.pendingCardDraw = null;
  if (state.phase === "strategy_draw") {
    const nextPlayerId = state.pendingCardDrawPlayerIds.shift();
    if (nextPlayerId !== undefined) {
      state.pendingCardDraw = { playerId: nextPlayerId, count: 1, resumePhase: "player_turn" };
    } else {
      startFirstTurn(state, now);
    }
  } else {
    beginActionPhase(state);
  }
};

const developmentCostFor = (
  state: GameState,
  playerId: string,
  property: PropertyState,
  skipPayment = false
): number => {
  const definition = PROPERTY_BY_ID.get(property.id);
  if (definition === undefined) throw new GameInvariantError("Property definition is missing.");
  if (property.developmentLevel === 3) {
    throw new GameRuleError("MAX_DEVELOPMENT", "Property is already at maximum development.");
  }
  const baseCost = definition.developmentCosts[property.developmentLevel];
  if (baseCost === undefined) {
    throw new GameRuleError("MAX_DEVELOPMENT", "Property is already at maximum development.");
  }
  const controls = getDistrictControl(requirePlayer(state, playerId).propertyIds);
  const districtControlDiscount = controls.tech === 4 ? 30 : controls.tech === 3 ? 20 : 0;
  const otherModifiers: number[] = [];
  if (state.activeRoundEffects.includes("BN07")) otherModifiers.push(-20);
  if (state.activePolicyIds.includes("POL02B")) otherModifiers.push(-10);
  if (state.activePolicyIds.includes("POL03B")) otherModifiers.push(-20);
  if (requireTurn(state).effects.includes("SE06")) otherModifiers.push(-30);
  return calculateDevelopmentCost({
    baseCost,
    districtControlDiscount,
    otherModifiers,
    skipPayment
  });
};

const developProperty = (
  state: GameState,
  playerId: string,
  propertyId: string,
  options: { readonly skipPayment: boolean; readonly consumeTurnAction: boolean }
): number => {
  const turn = requireActivePlayer(state, playerId);
  if (turn.stage !== "action_phase") {
    throw new GameRuleError("INVALID_PHASE", "Development is only available in the Action phase.");
  }
  const property = state.properties[propertyId];
  if (property === undefined || property.ownerId !== playerId) {
    throw new GameRuleError("PROPERTY_NOT_OWNED", "Player does not own this property.");
  }
  if (
    property.purchasedOnTurn === turn.number ||
    property.receivedOnTurn === turn.number
  ) {
    throw new GameRuleError(
      "SAME_TURN_DEVELOPMENT",
      "A property acquired this turn cannot be developed."
    );
  }
  if (property.developmentLevel >= GAME_CONFIG.maximumDevelopmentLevel) {
    throw new GameRuleError("MAX_DEVELOPMENT", "Property is already at maximum development.");
  }
  const cost = developmentCostFor(state, playerId, property, options.skipPayment);
  const player = requirePlayer(state, playerId);
  if (player.credits < cost) {
    throw new GameRuleError("INSUFFICIENT_CREDITS", "Not enough Credits to develop this property.");
  }
  if (options.consumeTurnAction) consumeAction(turn);
  player.credits -= cost;
  property.developmentLevel = (property.developmentLevel + 1) as 1 | 2 | 3;
  turn.effects = turn.effects.filter((effect) => effect !== "SE06");
  return cost;
};

const playCard = (
  state: GameState,
  playerId: string,
  command: Extract<ClientCommand, { type: "play_card" }>
): GameEvent[] => {
  const turn = requireActivePlayer(state, playerId);
  if (turn.cardPlayed) throw new GameRuleError("CARD_LIMIT", "Only one card may be played per turn.");
  const player = requirePlayer(state, playerId);
  const definition = STRATEGY_CARD_BY_ID.get(command.cardId);
  if (definition === undefined) throw new GameRuleError("UNKNOWN_CARD", "Unknown Strategy Card.");
  if (!player.cards.includes(command.cardId)) {
    throw new GameRuleError("CARD_NOT_OWNED", "Player does not own this card.");
  }

  if (command.cardId === "SC12") return useInsurance(state, playerId);
  if (command.cardId === "SC11") {
    throw new GameRuleError("INVALID_CARD_TIMING", "Shortcut is played through movement choice.");
  }
  if (command.cardId === "SC01" && turn.stage !== "awaiting_roll") {
    throw new GameRuleError("INVALID_CARD_TIMING", "Rush Hour must be played before rolling.");
  }
  if (command.cardId === "SC04" && turn.stage !== "awaiting_property_decision") {
    throw new GameRuleError("INVALID_CARD_TIMING", "Flash Sale must be played before buying.");
  }
  if (
    !["SC01", "SC04"].includes(command.cardId) &&
    turn.stage !== "action_phase"
  ) {
    throw new GameRuleError("INVALID_CARD_TIMING", "This card must be played in the Action phase.");
  }

  if (definition.actionCost === 1) consumeAction(turn);

  switch (command.cardId) {
    case "SC01":
      turn.effects.push("SC01");
      break;
    case "SC02":
    case "SC03":
      if (!isDistrictId(command.targetDistrictId)) {
        throw new GameRuleError("INVALID_TARGET", "A valid district is required.");
      }
      state.demand[command.targetDistrictId] = command.cardId === "SC02" ? 2 : -2;
      break;
    case "SC04":
      turn.effects.push("SC04");
      break;
    case "SC05":
      if (command.targetPropertyId === undefined) {
        throw new GameRuleError("INVALID_TARGET", "A property is required.");
      }
      developProperty(state, playerId, command.targetPropertyId, {
        skipPayment: true,
        consumeTurnAction: false
      });
      break;
    case "SC06":
      player.credits += 120;
      break;
    case "SC07":
      player.credits += 60;
      player.influence += 1;
      break;
    case "SC08": {
      const property =
        command.targetPropertyId === undefined
          ? undefined
          : state.properties[command.targetPropertyId];
      if (property === undefined || property.ownerId !== playerId) {
        throw new GameRuleError("INVALID_TARGET", "An owned property is required.");
      }
      state.activeRoundEffects.push(`SC08:${property.id}`);
      break;
    }
    case "SC09":
      player.influence += 3;
      break;
    case "SC10":
      state.activeRoundEffects.push(`SC10:${playerId}`);
      break;
  }

  consumeCard(state, player, command.cardId);
  turn.cardPlayed = true;
  return [publicEvent("strategy_card_played", { playerId, cardId: command.cardId })];
};

const validateTradeAssets = (
  state: GameState,
  playerId: string,
  credits: number,
  propertyIds: readonly string[]
): void => {
  const player = requirePlayer(state, playerId);
  if (player.credits < credits) {
    throw new GameRuleError("INSUFFICIENT_CREDITS", "Trade Credits are no longer available.");
  }
  if (new Set(propertyIds).size !== propertyIds.length) {
    throw new GameRuleError("INVALID_TRADE", "A property cannot appear twice in one offer.");
  }
  for (const propertyId of propertyIds) {
    if (state.properties[propertyId]?.ownerId !== playerId) {
      throw new GameRuleError("PROPERTY_NOT_OWNED", "A traded property is not owned by its offerer.");
    }
  }
};

const applyPolicy = (state: GameState, policyId: string): void => {
  if (!state.activePolicyIds.includes(policyId)) state.activePolicyIds.push(policyId);
  switch (policyId) {
    case "POL01A":
      state.demand.food = clampDemand(state.demand.food + 1);
      state.demand.mobility = clampDemand(state.demand.mobility + 1);
      state.demand.entertainment = clampDemand(state.demand.entertainment - 1);
      break;
    case "POL01B":
      state.demand.tech = clampDemand(state.demand.tech + 2);
      state.demand.food = clampDemand(state.demand.food - 1);
      break;
    case "POL02A":
      state.demand.entertainment = clampDemand(state.demand.entertainment + 1);
      break;
    case "POL02B":
      state.demand.mobility = clampDemand(state.demand.mobility + 1);
      break;
    case "POL03A":
      for (const player of Object.values(state.players)) player.credits += 80;
      break;
    case "POL03B":
      break;
    case "POL04A":
      state.demand = { food: 0, tech: 0, entertainment: 0, mobility: 0 };
      break;
    case "POL04B":
      break;
    default:
      throw new GameInvariantError(`Unknown Council policy: ${policyId}`);
  }
};

const resolveCouncil = (state: GameState, now: number, events: GameEvent[]): void => {
  const council = state.council;
  if (council === null) throw new GameInvariantError("No Council vote to resolve.");
  const totals = Object.values(council.allocations).reduce(
    (sum, allocation) => ({
      optionA: sum.optionA + allocation.optionAInfluence,
      optionB: sum.optionB + allocation.optionBInfluence
    }),
    { optionA: 0, optionB: 0 }
  );
  const winnerId = totals.optionA >= totals.optionB ? council.optionAId : council.optionBId;
  applyPolicy(state, winnerId);
  state.council = null;
  events.push(
    publicEvent("council_resolved", {
      winnerId,
      optionATotal: totals.optionA,
      optionBTotal: totals.optionB
    })
  );
  startFirstTurn(state, now);
};

const resolveRound = (
  state: GameState,
  random: RandomSource,
  now: number,
  events: GameEvent[]
): void => {
  state.phase = "round_resolution";
  const highestDemand = Math.max(...Object.values(state.demand));
  const festivalDistricts = new Set(
    districtIds.filter((district) => state.demand[district] === highestDemand)
  );

  for (const property of Object.values(state.properties)) {
    if (property.ownerId === null) continue;
    const definition = PROPERTY_BY_ID.get(property.id);
    if (definition === undefined) throw new GameInvariantError("Property definition is missing.");
    const income = calculatePropertyIncome({
      propertyId: property.id,
      developmentLevel: property.developmentLevel,
      demand: state.demand[definition.district],
      temporaryAdditiveModifiers:
        state.activeRoundEffects.includes("SE08") && festivalDistricts.has(definition.district)
          ? [10]
          : [],
      temporaryMultipliers: state.activeRoundEffects.includes(`SC08:${property.id}`) ? [2] : [],
      policyAdditiveModifiers: state.activePolicyIds.includes("POL03A") ? [-5] : [],
      demandMultiplier: demandPolicyMultiplier(state)
    });
    requirePlayer(state, property.ownerId).credits += income;
    events.push(
      publicEvent("property_income_awarded", {
        playerId: property.ownerId,
        propertyId: property.id,
        amount: income
      })
    );
  }

  for (const player of Object.values(state.players)) {
    const controls = getDistrictControl(player.propertyIds);
    if (controls.food === 4) player.credits += 50;
    else if (controls.food === 3) player.credits += 30;
    if (controls.mobility === 4) player.influence += 3;
    else if (controls.mobility === 3) player.influence += 2;
  }

  state.activeRoundEffects = [];
  state.activeBreakingNewsId = null;
  if (state.round >= GAME_CONFIG.rounds) {
    const unranked = Object.values(state.players).map((player) => {
      const properties = player.propertyIds.map((propertyId) => {
        const property = state.properties[propertyId];
        if (property === undefined) throw new GameInvariantError("Owned property is missing.");
        return { propertyId, developmentLevel: property.developmentLevel };
      });
      if (player.secretObjectiveId === null) {
        throw new GameInvariantError("Player has no selected objective at final scoring.");
      }
      const objectiveCompleted = evaluateSecretObjective(player.secretObjectiveId, {
        credits: player.credits,
        influence: player.influence,
        properties
      });
      const breakdown = calculateFinalScore({
        credits: player.credits,
        influence: player.influence,
        properties,
        objectiveCompleted
      });
      return {
        playerId: player.id,
        credits: breakdown.credits,
        propertyValue: breakdown.propertyValue,
        propertyCount: properties.length,
        total: breakdown.total,
        objectiveId: player.secretObjectiveId,
        objectiveCompleted,
        breakdown
      };
    });
    const ranked = rankFinalScores(unranked);
    state.results = ranked.map(
      ({ playerId, rank, propertyCount, objectiveId, objectiveCompleted, breakdown }) => ({
        playerId,
        rank,
        propertyCount,
        objectiveId,
        objectiveCompleted,
        breakdown
      })
    );
    state.phase = "completed";
    state.turn = null;
    events.push(publicEvent("game_completed", { results: state.results }));
    return;
  }

  beginRound(state, state.round + 1, random, now, events);
};

const endCurrentTurn = (
  state: GameState,
  random: RandomSource,
  now: number,
  events: GameEvent[]
): void => {
  const turn = requireTurn(state);
  if (state.trade !== null) {
    const tradeId = state.trade.id;
    state.trade = null;
    events.push(publicEvent("trade_rejected", { tradeId }));
  }
  events.push(publicEvent("turn_ended", { playerId: turn.playerId, turnNumber: turn.number }));
  if (state.currentTurnIndex + 1 < state.currentTurnOrder.length) {
    state.currentTurnIndex += 1;
    const nextPlayerId = state.currentTurnOrder[state.currentTurnIndex];
    if (nextPlayerId === undefined) throw new GameInvariantError("Next player is missing.");
    state.turn = createTurn(state, nextPlayerId, now);
    return;
  }
  resolveRound(state, random, now, events);
};

const sellProperties = (
  state: GameState,
  propertyIds: readonly string[],
  stopWhenPayable: boolean
): string[] => {
  const fee = state.pendingLandingFee;
  if (fee === null) throw new GameRuleError("NO_LANDING_FEE", "No landing fee is pending.");
  const payer = requirePlayer(state, fee.payerId);
  const sold: string[] = [];
  for (const propertyId of propertyIds) {
    if (stopWhenPayable && payer.credits >= fee.amount) break;
    const property = state.properties[propertyId];
    if (property === undefined || property.ownerId !== payer.id) {
      throw new GameRuleError("PROPERTY_NOT_OWNED", "Emergency-sale property is not owned.");
    }
    payer.credits += calculateLiquidationValue(property.id, property.developmentLevel);
    payer.propertyIds = payer.propertyIds.filter((id) => id !== property.id);
    property.ownerId = null;
    property.developmentLevel = 0;
    property.purchasedOnTurn = null;
    property.receivedOnTurn = null;
    sold.push(property.id);
  }
  return sold;
};

const completeEmergencyPayment = (state: GameState, now: number): number => {
  const fee = state.pendingLandingFee;
  if (fee === null) throw new GameRuleError("NO_LANDING_FEE", "No landing fee is pending.");
  const payer = requirePlayer(state, fee.payerId);
  const owner = requirePlayer(state, fee.ownerId);
  const paid = Math.min(payer.credits, fee.amount);
  payer.credits -= paid;
  owner.credits += paid;
  state.pendingLandingFee = null;
  state.emergencySale = null;
  beginActionPhase(state);
  resumeNormalTurnTimer(requireTurn(state), now);
  return paid;
};

const automaticLiquidation = (state: GameState, now: number): { sold: string[]; paid: number } => {
  const fee = state.pendingLandingFee;
  if (fee === null) throw new GameRuleError("NO_LANDING_FEE", "No landing fee is pending.");
  const payer = requirePlayer(state, fee.payerId);
  const ordered = sortPropertiesForAutomaticLiquidation(
    payer.propertyIds.map((propertyId) => {
      const property = state.properties[propertyId];
      if (property === undefined) throw new GameInvariantError("Owned property state is missing.");
      return { propertyId, developmentLevel: property.developmentLevel };
    })
  );
  const sold = sellProperties(
    state,
    ordered.map(({ propertyId }) => propertyId),
    true
  );
  const paid = completeEmergencyPayment(state, now);
  return { sold, paid };
};

export const handleEmergencySaleTimeout = (state: GameState, now: number): TransitionResult => {
  if (state.emergencySale === null || requireTurn(state).stage !== "emergency_sale") {
    throw new GameRuleError("INVALID_PHASE", "Emergency sale is not active.");
  }
  if (now < state.emergencySale.deadlineAt) {
    throw new GameRuleError("TIMER_ACTIVE", "Emergency-sale timer has not expired.");
  }
  const next = cloneState(state);
  const result = automaticLiquidation(next, now);
  next.version += 1;
  assertGameInvariants(next);
  return {
    state: next,
    events: [publicEvent("emergency_sale_auto_completed", result)]
  };
};

export const handleAuctionTimeout = (state: GameState, now: number): TransitionResult => {
  if (state.auction === null || requireTurn(state).stage !== "auction") {
    throw new GameRuleError("INVALID_PHASE", "Auction is not active.");
  }
  if (now < state.auction.deadlineAt) {
    throw new GameRuleError("TIMER_ACTIVE", "Auction timer has not expired.");
  }
  const next = cloneState(state);
  const auction = next.auction;
  if (auction === null) throw new GameInvariantError("Auction disappeared during timeout.");
  for (const playerId of auction.eligiblePlayerIds) {
    if (!auction.submittedPlayerIds.includes(playerId)) {
      auction.bids[playerId] = 0;
      auction.submittedPlayerIds.push(playerId);
    }
  }
  const events: GameEvent[] = [];
  finalizeAuction(next, events, now);
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};

export const handleCouncilTimeout = (state: GameState, now: number): TransitionResult => {
  if (state.phase !== "council" || state.council === null) {
    throw new GameRuleError("INVALID_PHASE", "City Council voting is not active.");
  }
  if (now < state.council.deadlineAt) {
    throw new GameRuleError("TIMER_ACTIVE", "Council timer has not expired.");
  }
  const next = cloneState(state);
  const council = next.council;
  if (council === null) throw new GameInvariantError("Council disappeared during timeout.");
  for (const playerId of Object.keys(next.players)) {
    council.allocations[playerId] ??= { optionAInfluence: 0, optionBInfluence: 0 };
  }
  const events: GameEvent[] = [];
  resolveCouncil(next, now, events);
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};

export const disconnectPlayer = (
  state: GameState,
  playerId: string,
  now: number
): TransitionResult => {
  const next = cloneState(state);
  const player = requirePlayer(next, playerId);
  if (!player.connected) return { state, events: [] };
  player.connected = false;
  player.disconnectedAt = now;
  const events: GameEvent[] = [publicEvent("player_disconnected", { playerId })];

  if (next.phase === "paused") {
    next.deferredDisconnectPlayerIds = [...new Set([...(next.deferredDisconnectPlayerIds ?? []), playerId])];
  } else {
    applyDisconnectEffects(next, playerId, now, events);
  }
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};

export const applyDisconnectEffects = (next: GameState, playerId: string, now: number, events: GameEvent[]): void => {

  const auction = next.auction;
  if (
    auction !== null &&
    auction.eligiblePlayerIds.includes(playerId) &&
    !auction.submittedPlayerIds.includes(playerId)
  ) {
    auction.bids[playerId] = 0;
    auction.submittedPlayerIds.push(playerId);
    if (auction.submittedPlayerIds.length === auction.eligiblePlayerIds.length) {
      finalizeAuction(next, events, now);
    }
  }
  const council = next.council;
  if (council !== null && council.allocations[playerId] === undefined) {
    council.allocations[playerId] = { optionAInfluence: 0, optionBInfluence: 0 };
    if (Object.keys(council.allocations).length === Object.keys(next.players).length) {
      resolveCouncil(next, now, events);
    }
  }

  if (next.turn?.playerId === playerId) {
    if (next.turn.stage === "emergency_sale") {
      const result = automaticLiquidation(next, now);
      events.push(publicEvent("emergency_sale_auto_completed", result));
    } else if (next.turn.stage !== "auction" && !requirePlayer(next, playerId).connected) {
      pauseNormalTurnTimer(next.turn, now);
    }
  }

};

export const reconnectPlayer = (
  state: GameState,
  playerId: string,
  now: number
): TransitionResult => {
  const next = cloneState(state);
  const player = requirePlayer(next, playerId);
  player.connected = true;
  player.disconnectedAt = null;
  if (
    next.phase !== "paused" &&
    next.turn?.playerId === playerId &&
    next.turn.turnDeadlineAt === null &&
    next.turn.remainingTurnMilliseconds !== null &&
    next.turn.stage !== "auction" &&
    next.turn.stage !== "emergency_sale"
  ) {
    resumeNormalTurnTimer(next.turn, now);
  }
  next.version += 1;
  assertGameInvariants(next);
  return {
    state: next,
    events: [publicEvent("player_reconnected", { playerId })]
  };
};

const autoCompleteTurn = (
  state: GameState,
  random: RandomSource,
  now: number,
  events: GameEvent[]
): void => {
  const turn = requireTurn(state);
  const playerId = turn.playerId;
  if (turn.stage === "auction" || turn.stage === "emergency_sale") {
    throw new GameRuleError("SUBPHASE_TIMER_ACTIVE", "A separately timed sub-phase is active.");
  }
  if (turn.stage === "awaiting_roll") {
    turn.roll = turn.effects.includes("SC01") ? 6 : random.nextInt(6) + 1;
    turn.stage = "awaiting_shortcut_choice";
  }
  if (turn.stage === "awaiting_shortcut_choice" && turn.roll !== null) {
    const player = requirePlayer(state, playerId);
    const movement = resolveMovement({
      position: player.position,
      dieRoll: turn.roll,
      direction: "forward",
      entertainmentPropertiesOwned: entertainmentOwned(state, playerId)
    });
    player.position = movement.destination;
    if (movement.passedCityCenter) player.credits += GAME_CONFIG.cityCenterPassingBonus;
    resolveLanding(state, playerId, random, events);
  }
  if (turn.stage === "awaiting_property_decision") beginActionPhase(state);
  if (turn.stage === "landing_fee_reaction") {
    events.push(...payPendingLandingFee(state, now));
    if (requireTurn(state).stage === "emergency_sale") {
      if (requirePlayer(state, playerId).connected) return;
      const result = automaticLiquidation(state, now);
      events.push(publicEvent("emergency_sale_auto_completed", result));
    }
  }
  if (turn.stage === "awaiting_event_choice") {
    resolvePendingEventChoice(state, automaticEventDistrict(state), events);
  }
  if (turn.stage === "awaiting_card_discard") {
    const cardId = [...requirePlayer(state, playerId).cards].sort()[0];
    if (cardId === undefined) {
      throw new GameInvariantError("A pending card discard requires at least one card.");
    }
    resolvePendingCardDiscard(state, playerId, cardId, now);
  }
  if (turn.stage === "action_phase") {
    turn.actionsRemaining = 0;
    endCurrentTurn(state, random, now, events);
  }
};

export const handleTurnTimeout = (
  state: GameState,
  now: number,
  random: RandomSource
): TransitionResult => {
  const turn = requireTurn(state);
  if (turn.turnDeadlineAt === null || now < turn.turnDeadlineAt) {
    throw new GameRuleError("TIMER_ACTIVE", "Normal turn timer has not expired.");
  }
  const next = cloneState(state);
  const events: GameEvent[] = [];
  autoCompleteTurn(next, random, now, events);
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};

export const handleReconnectTimeout = (
  state: GameState,
  now: number,
  random: RandomSource
): TransitionResult => {
  const turn = requireTurn(state);
  const player = requirePlayer(state, turn.playerId);
  if (
    player.connected ||
    player.disconnectedAt === null ||
    now < player.disconnectedAt + GAME_CONFIG.reconnectGraceSeconds * 1_000
  ) {
    throw new GameRuleError("RECONNECT_WINDOW_ACTIVE", "Reconnection window has not expired.");
  }
  const next = cloneState(state);
  const events: GameEvent[] = [];
  autoCompleteTurn(next, random, now, events);
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};

const executeOnClone = (
  next: GameState,
  actorPlayerId: string,
  command: ClientCommand,
  context: TransitionContext,
  events: GameEvent[]
): void => {
  requirePlayer(next, actorPlayerId);
  switch (command.type) {
    case "council_vote": {
      const council = next.council;
      if (next.phase !== "council" || council === null || council.id !== command.councilId) {
        throw new GameRuleError("INVALID_PHASE", "City Council voting is not active.");
      }
      if (council.allocations[actorPlayerId] !== undefined) {
        throw new GameRuleError("DUPLICATE_VOTE", "Player already submitted Council votes.");
      }
      const total = command.optionAInfluence + command.optionBInfluence;
      const player = requirePlayer(next, actorPlayerId);
      if (player.influence < total) {
        throw new GameRuleError("INSUFFICIENT_INFLUENCE", "Council allocation exceeds Influence.");
      }
      player.influence -= total;
      council.allocations[actorPlayerId] = {
        optionAInfluence: command.optionAInfluence,
        optionBInfluence: command.optionBInfluence
      };
      if (Object.keys(council.allocations).length === Object.keys(next.players).length) {
        resolveCouncil(next, context.now, events);
      }
      return;
    }
    case "select_event_district": {
      const turn = requireActivePlayer(next, actorPlayerId);
      const pending = next.pendingEventChoice;
      if (
        turn.stage !== "awaiting_event_choice" ||
        pending === null ||
        pending.playerId !== actorPlayerId ||
        pending.eventId !== command.eventId ||
        !isDistrictId(command.districtId)
      ) {
        throw new GameRuleError("INVALID_EVENT_CHOICE", "This Special Event choice is not active.");
      }
      resolvePendingEventChoice(next, command.districtId, events);
      return;
    }
    case "discard_card": {
      resolvePendingCardDiscard(next, actorPlayerId, command.cardId, context.now);
      return;
    }
    case "roll": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "awaiting_roll") {
        throw new GameRuleError("INVALID_PHASE", "Dice cannot be rolled now.");
      }
      turn.roll = turn.effects.includes("SC01") ? 6 : context.random.nextInt(6) + 1;
      turn.stage = "awaiting_shortcut_choice";
      events.push(publicEvent("dice_rolled", { playerId: actorPlayerId, roll: turn.roll }));
      return;
    }
    case "choose_shortcut": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "awaiting_shortcut_choice" || turn.roll === null) {
        throw new GameRuleError("INVALID_PHASE", "Movement direction cannot be chosen now.");
      }
      if (command.useShortcut) {
        if (turn.cardPlayed) throw new GameRuleError("CARD_LIMIT", "Only one card may be played per turn.");
        const player = requirePlayer(next, actorPlayerId);
        consumeCard(next, player, "SC11");
        turn.cardPlayed = true;
      }
      const player = requirePlayer(next, actorPlayerId);
      const movement = resolveMovement({
        position: player.position,
        dieRoll: turn.roll,
        direction: command.useShortcut ? "backward" : "forward",
        entertainmentPropertiesOwned: entertainmentOwned(next, actorPlayerId)
      });
      player.position = movement.destination;
      if (movement.passedCityCenter) player.credits += GAME_CONFIG.cityCenterPassingBonus;
      events.push(publicEvent("player_moved", { playerId: actorPlayerId, ...movement }));
      resolveLanding(next, actorPlayerId, context.random, events);
      return;
    }
    case "buy_property": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "awaiting_property_decision") {
        throw new GameRuleError("INVALID_PHASE", "A property purchase is not available.");
      }
      const property = next.properties[command.propertyId];
      const space = BOARD_SPACES[requirePlayer(next, actorPlayerId).position];
      if (
        property === undefined ||
        property.ownerId !== null ||
        space?.type !== "property" ||
        space.propertyId !== command.propertyId
      ) {
        throw new GameRuleError("PROPERTY_UNAVAILABLE", "This property cannot be purchased.");
      }
      const player = requirePlayer(next, actorPlayerId);
      const price = purchasePriceFor(next, property);
      if (player.credits < price) {
        throw new GameRuleError("INSUFFICIENT_CREDITS", "Not enough Credits to buy this property.");
      }
      player.credits -= price;
      transferProperty(next, property, actorPlayerId, "purchase");
      turn.effects = turn.effects.filter((effect) => effect !== "SC04");
      beginActionPhase(next);
      events.push(publicEvent("property_purchased", { playerId: actorPlayerId, propertyId: property.id, price }));
      return;
    }
    case "decline_property": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "awaiting_property_decision") {
        throw new GameRuleError("INVALID_PHASE", "No property decision is active.");
      }
      beginActionPhase(next);
      return;
    }
    case "start_auction": {
      const turn = requireActivePlayer(next, actorPlayerId);
      const property = next.properties[command.propertyId];
      const space = BOARD_SPACES[requirePlayer(next, actorPlayerId).position];
      if (
        turn.stage !== "awaiting_property_decision" ||
        property === undefined ||
        property.ownerId !== null ||
        space?.type !== "property" ||
        space.propertyId !== command.propertyId
      ) {
        throw new GameRuleError("INVALID_AUCTION", "This property cannot be auctioned.");
      }
      const auctionId = `auction-${next.version + 1}`;
      const eligiblePlayerIds = [...next.currentTurnOrder];
      next.auction = {
        id: auctionId,
        propertyId: property.id,
        triggeringPlayerId: actorPlayerId,
        eligiblePlayerIds,
        bids: Object.fromEntries(eligiblePlayerIds.map((playerId) => [playerId, null])),
        submittedPlayerIds: [],
        deadlineAt: context.now + GAME_CONFIG.auctionTimerSeconds * 1_000
      };
      pauseNormalTurnTimer(turn, context.now);
      turn.stage = "auction";
      events.push(publicEvent("auction_started", { auctionId, propertyId: property.id }));
      for (const player of Object.values(next.players)) {
        if (!player.connected) applyDisconnectEffects(next, player.id, context.now, events);
      }
      return;
    }
    case "submit_bid":
    case "pass_auction": {
      const auction = next.auction;
      if (auction === null || auction.id !== command.auctionId || requireTurn(next).stage !== "auction") {
        throw new GameRuleError("INVALID_AUCTION", "Auction is not active.");
      }
      if (!auction.eligiblePlayerIds.includes(actorPlayerId)) {
        throw new GameRuleError("NOT_AUCTION_PLAYER", "Player is not eligible for this auction.");
      }
      if (auction.submittedPlayerIds.includes(actorPlayerId)) {
        throw new GameRuleError("DUPLICATE_BID", "Player already submitted an auction response.");
      }
      const amount = command.type === "submit_bid" ? command.amount : 0;
      if (command.type === "submit_bid" && amount < 1) {
        throw new GameRuleError("INVALID_BID", "Minimum auction bid is 1 Credit.");
      }
      if (requirePlayer(next, actorPlayerId).credits < amount) {
        throw new GameRuleError("INSUFFICIENT_CREDITS", "Bid exceeds available Credits.");
      }
      auction.bids[actorPlayerId] = amount;
      auction.submittedPlayerIds.push(actorPlayerId);
      if (auction.submittedPlayerIds.length === auction.eligiblePlayerIds.length) {
        finalizeAuction(next, events, context.now);
      }
      return;
    }
    case "develop_property": {
      const cost = developProperty(next, actorPlayerId, command.propertyId, {
        skipPayment: false,
        consumeTurnAction: true
      });
      events.push(
        publicEvent("property_developed", {
          playerId: actorPlayerId,
          propertyId: command.propertyId,
          cost,
          level: next.properties[command.propertyId]?.developmentLevel
        })
      );
      return;
    }
    case "change_demand": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "action_phase") {
        throw new GameRuleError("INVALID_PHASE", "Demand can only be changed in the Action phase.");
      }
      if (next.activePolicyIds.includes("POL04A")) {
        throw new GameRuleError("DEMAND_ACTION_DISABLED", "Market Regulation disables Demand actions.");
      }
      const player = requirePlayer(next, actorPlayerId);
      if (player.influence < 1) {
        throw new GameRuleError("INSUFFICIENT_INFLUENCE", "Not enough Influence.");
      }
      consumeAction(turn);
      player.influence -= 1;
      next.demand[command.districtId] = clampDemand(
        next.demand[command.districtId] + command.delta
      );
      events.push(
        publicEvent("demand_changed", {
          playerId: actorPlayerId,
          districtId: command.districtId,
          value: next.demand[command.districtId]
        })
      );
      return;
    }
    case "propose_trade": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "action_phase") {
        throw new GameRuleError("INVALID_PHASE", "Trades can only be proposed in the Action phase.");
      }
      if (next.trade !== null) throw new GameRuleError("TRADE_PENDING", "Another trade is pending.");
      if (command.counterpartyPlayerId === actorPlayerId) {
        throw new GameRuleError("INVALID_TRADE", "A player cannot trade with themselves.");
      }
      requirePlayer(next, command.counterpartyPlayerId);
      if (
        command.offeredCredits === 0 &&
        command.requestedCredits === 0 &&
        command.offeredPropertyIds.length === 0 &&
        command.requestedPropertyIds.length === 0
      ) {
        throw new GameRuleError("INVALID_TRADE", "Trade must contain at least one item.");
      }
      validateTradeAssets(
        next,
        actorPlayerId,
        command.offeredCredits,
        command.offeredPropertyIds
      );
      validateTradeAssets(
        next,
        command.counterpartyPlayerId,
        command.requestedCredits,
        command.requestedPropertyIds
      );
      consumeAction(turn);
      next.trade = {
        id: `trade-${next.version + 1}`,
        proposerPlayerId: actorPlayerId,
        counterpartyPlayerId: command.counterpartyPlayerId,
        offeredCredits: command.offeredCredits,
        offeredPropertyIds: [...command.offeredPropertyIds],
        requestedCredits: command.requestedCredits,
        requestedPropertyIds: [...command.requestedPropertyIds],
        createdOnTurn: turn.number
      };
      events.push(
        publicEvent("trade_proposed", {
          tradeId: next.trade.id,
          proposerPlayerId: actorPlayerId,
          counterpartyPlayerId: command.counterpartyPlayerId
        })
      );
      return;
    }
    case "respond_trade": {
      const trade = next.trade;
      if (trade === null || trade.id !== command.tradeId) {
        throw new GameRuleError("TRADE_NOT_FOUND", "Trade is no longer available.");
      }
      if (trade.counterpartyPlayerId !== actorPlayerId) {
        throw new GameRuleError("NOT_TRADE_PARTY", "Only the counterparty may respond.");
      }
      if (command.response === "reject") {
        next.trade = null;
        events.push(publicEvent("trade_rejected", { tradeId: trade.id }));
        return;
      }
      validateTradeAssets(
        next,
        trade.proposerPlayerId,
        trade.offeredCredits,
        trade.offeredPropertyIds
      );
      validateTradeAssets(
        next,
        trade.counterpartyPlayerId,
        trade.requestedCredits,
        trade.requestedPropertyIds
      );
      const proposer = requirePlayer(next, trade.proposerPlayerId);
      const counterparty = requirePlayer(next, trade.counterpartyPlayerId);
      proposer.credits = proposer.credits - trade.offeredCredits + trade.requestedCredits;
      counterparty.credits = counterparty.credits - trade.requestedCredits + trade.offeredCredits;
      for (const propertyId of trade.offeredPropertyIds) {
        const property = next.properties[propertyId];
        if (property === undefined) throw new GameInvariantError("Trade property is missing.");
        transferProperty(next, property, trade.counterpartyPlayerId, "trade");
      }
      for (const propertyId of trade.requestedPropertyIds) {
        const property = next.properties[propertyId];
        if (property === undefined) throw new GameInvariantError("Trade property is missing.");
        transferProperty(next, property, trade.proposerPlayerId, "trade");
      }
      next.trade = null;
      events.push(publicEvent("trade_completed", { tradeId: trade.id }));
      return;
    }
    case "play_card": {
      events.push(...playCard(next, actorPlayerId, command));
      return;
    }
    case "pay_landing_fee": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "landing_fee_reaction" || next.pendingLandingFee?.payerId !== actorPlayerId) {
        throw new GameRuleError("INVALID_PHASE", "No payable landing fee is pending.");
      }
      events.push(...payPendingLandingFee(next, context.now));
      return;
    }
    case "emergency_sell": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "emergency_sale" || next.emergencySale?.payerId !== actorPlayerId) {
        throw new GameRuleError("INVALID_PHASE", "Emergency sale is not active for this player.");
      }
      const sold = sellProperties(next, command.propertyIds, false);
      const payer = requirePlayer(next, actorPlayerId);
      const fee = next.pendingLandingFee;
      if (fee === null || (payer.credits < fee.amount && payer.propertyIds.length > 0)) {
        throw new GameRuleError(
          "EMERGENCY_SALE_INCOMPLETE",
          "More property selections are required to resolve the fee."
        );
      }
      const paid = completeEmergencyPayment(next, context.now);
      events.push(publicEvent("emergency_sale_completed", { playerId: actorPlayerId, sold, paid }));
      return;
    }
    case "choose_objective":
      throw new GameRuleError("INVALID_PHASE", "Objective setup is handled before game start.");
    case "end_turn": {
      const turn = requireActivePlayer(next, actorPlayerId);
      if (turn.stage !== "action_phase") {
        throw new GameRuleError("INVALID_PHASE", "Turn cannot end before landing is resolved.");
      }
      endCurrentTurn(next, context.random, context.now, events);
      return;
    }
    default:
      throw new GameRuleError("COMMAND_NOT_IMPLEMENTED", "Command is not implemented.");
  }
};

export const executeGameCommand = (
  state: GameState,
  actorPlayerId: string,
  command: ClientCommand,
  context: TransitionContext
): TransitionResult => {
  if (command.expectedStateVersion !== state.version) {
    throw new GameRuleError("STALE_STATE", "Command was based on an outdated game state.");
  }
  if (command.type === "choose_objective") {
    const next = chooseSecretObjective(state, actorPlayerId, command.objectiveId);
    assertGameInvariants(next);
    return {
      state: next,
      events: [
        {
          type: "objective_selected",
          visibility: "player",
          playerId: actorPlayerId,
          payload: { playerId: actorPlayerId }
        }
      ]
    };
  }
  const next = cloneState(state);
  const events: GameEvent[] = [];
  executeOnClone(next, actorPlayerId, command, context, events);
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};
