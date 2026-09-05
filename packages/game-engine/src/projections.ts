import { GameRuleError } from "./errors.js";
import type { GameState } from "./state.js";

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
      trade
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
