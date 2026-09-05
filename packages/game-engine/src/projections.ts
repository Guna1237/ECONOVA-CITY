import type { ClientCommandType, InteractionCapabilities } from "@econova/contracts";

import { GameRuleError } from "./errors.js";
import type { GameState } from "./state.js";

const interactionCapabilities = (
  state: GameState,
  playerId: string
): InteractionCapabilities => {
  const commandTypes: ClientCommandType[] = [];
  const player = state.players[playerId];
  if (player === undefined) throw new GameRuleError("UNKNOWN_PLAYER", "Player does not exist.");

  if (state.phase === "objective_selection" && state.objectiveSelection?.playerId === playerId) {
    commandTypes.push("choose_objective");
  }

  if (
    state.phase === "council" &&
    state.council !== null &&
    state.council.allocations[playerId] === undefined
  ) {
    commandTypes.push("council_vote");
  }

  if (state.trade?.counterpartyPlayerId === playerId) commandTypes.push("respond_trade");

  const turn = state.turn;
  if (state.phase !== "player_turn" || turn === null) {
    return { expectedStateVersion: state.version, commandTypes };
  }

  if (turn.stage === "auction" && state.auction !== null) {
    if (
      state.auction.eligiblePlayerIds.includes(playerId) &&
      !state.auction.submittedPlayerIds.includes(playerId)
    ) {
      commandTypes.push("submit_bid", "pass_auction");
    }
    return { expectedStateVersion: state.version, commandTypes };
  }

  if (turn.playerId !== playerId) {
    return { expectedStateVersion: state.version, commandTypes };
  }

  switch (turn.stage) {
    case "awaiting_roll":
      commandTypes.push("roll");
      break;
    case "awaiting_shortcut_choice":
      commandTypes.push("choose_shortcut");
      break;
    case "awaiting_property_decision":
      commandTypes.push("buy_property", "decline_property", "start_auction");
      break;
    case "landing_fee_reaction":
      if (!turn.cardPlayed && player.cards.includes("SC12")) commandTypes.push("play_card");
      commandTypes.push("pay_landing_fee");
      break;
    case "emergency_sale":
      commandTypes.push("emergency_sell");
      break;
    case "awaiting_event_choice":
      commandTypes.push("select_event_district");
      break;
    case "awaiting_card_discard":
      commandTypes.push("discard_card");
      break;
    case "action_phase":
      if (turn.actionsRemaining > 0) {
        if (player.propertyIds.length > 0) commandTypes.push("develop_property");
        if (player.influence > 0 && !state.activePolicyIds.includes("POL04A")) {
          commandTypes.push("change_demand");
        }
        if (!turn.cardPlayed && player.cards.length > 0) commandTypes.push("play_card");
        if (state.trade === null && state.currentTurnOrder.length > 1) {
          commandTypes.push("propose_trade");
        }
      }
      commandTypes.push("end_turn");
      break;
    case "auction":
      break;
  }

  return { expectedStateVersion: state.version, commandTypes };
};

const publicPlayers = (state: GameState) =>
  state.currentTurnOrder.map((playerId) => {
    const player = state.players[playerId];
    if (player === undefined) throw new GameRuleError("UNKNOWN_PLAYER", "Player does not exist.");
    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      propertyIds: [...player.propertyIds],
      connected: player.connected
    };
  });

export const createPublicProjection = (state: GameState) => ({
  gameId: state.gameId,
  roomId: state.roomId,
  stateVersion: state.version,
  phase: state.phase,
  round: state.round,
  turnOrder: [...state.currentTurnOrder],
  currentTurnIndex: state.currentTurnIndex,
  turn:
    state.turn === null
      ? null
      : {
          number: state.turn.number,
          playerId: state.turn.playerId,
          stage: state.turn.stage,
          actionsRemaining: state.turn.actionsRemaining,
          roll: state.turn.roll,
          deadlineAt: state.turn.turnDeadlineAt
        },
  players: publicPlayers(state),
  properties: Object.values(state.properties).map((property) => ({
    propertyId: property.id,
    ownerId: property.ownerId,
    developmentLevel: property.developmentLevel
  })),
  demand: { ...state.demand },
  activeBreakingNewsId: state.activeBreakingNewsId,
  activePolicyIds: [...state.activePolicyIds],
  auction:
    state.auction === null
      ? null
      : {
          auctionId: state.auction.id,
          propertyId: state.auction.propertyId,
          triggeringPlayerId: state.auction.triggeringPlayerId,
          eligiblePlayerIds: [...state.auction.eligiblePlayerIds],
          submittedCount: state.auction.submittedPlayerIds.length,
          deadlineAt: state.auction.deadlineAt
        },
  council:
    state.council === null
      ? null
      : {
          councilId: state.council.id,
          optionAId: state.council.optionAId,
          optionBId: state.council.optionBId,
          submittedCount: Object.keys(state.council.allocations).length,
          deadlineAt: state.council.deadlineAt
        },
  emergencySale:
    state.emergencySale === null
      ? null
      : {
          playerId: state.emergencySale.payerId,
          deadlineAt: state.emergencySale.deadlineAt
        },
  tradePending: state.trade !== null,
  results: state.phase === "completed" ? state.results : [],
  announcements: [...state.publicAnnouncements]
});

export type PublicProjection = ReturnType<typeof createPublicProjection>;

export const createProjectorProjection = (state: GameState): PublicProjection =>
  createPublicProjection(state);

export const createPlayerProjection = (state: GameState, playerId: string) => {
  const player = state.players[playerId];
  if (player === undefined) throw new GameRuleError("UNKNOWN_PLAYER", "Player does not exist.");
  const trade =
    state.trade !== null &&
    (state.trade.proposerPlayerId === playerId || state.trade.counterpartyPlayerId === playerId)
      ? { ...state.trade }
      : null;
  const ownBid = state.auction?.bids[playerId];
  const ownCouncilAllocation = state.council?.allocations[playerId];

  return {
    public: createPublicProjection(state),
    self: {
      playerId,
      credits: player.credits,
      influence: player.influence,
      cards: [...player.cards],
      propertyIds: [...player.propertyIds],
      objectiveId: player.secretObjectiveId,
      objectiveOffer:
        state.objectiveSelection?.playerId === playerId
          ? [...state.objectiveSelection.offeredObjectiveIds]
          : null,
      pendingLandingFee:
        state.pendingLandingFee?.payerId === playerId ? { ...state.pendingLandingFee } : null,
      auction:
        state.auction === null
          ? null
          : {
              auctionId: state.auction.id,
              ownBid: ownBid ?? null,
              hasSubmitted: state.auction.submittedPlayerIds.includes(playerId)
            },
      councilAllocation: ownCouncilAllocation ?? null,
      trade,
      capabilities: interactionCapabilities(state, playerId)
    }
  };
};

export const createAdminProjection = (state: GameState) => ({
  public: createPublicProjection(state),
  players: Object.values(state.players).map((player) => ({
    playerId: player.id,
    name: player.name,
    credits: player.credits,
    influence: player.influence,
    cards: [...player.cards],
    propertyIds: [...player.propertyIds],
    objectiveId: player.secretObjectiveId,
    connected: player.connected,
    disconnectedAt: player.disconnectedAt
  })),
  objectiveSelection: state.objectiveSelection,
  auction:
    state.auction === null
      ? null
      : {
          ...state.auction,
          bids: { ...state.auction.bids },
          submittedPlayerIds: [...state.auction.submittedPlayerIds]
        },
  council:
    state.council === null
      ? null
      : { ...state.council, allocations: { ...state.council.allocations } },
  pendingLandingFee: state.pendingLandingFee,
  emergencySale: state.emergencySale,
  pendingEventChoice: state.pendingEventChoice,
  pendingCardDraw: state.pendingCardDraw,
  trade: state.trade
});
