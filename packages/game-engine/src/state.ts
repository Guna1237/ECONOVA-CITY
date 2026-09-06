import type { DistrictId } from "@econova/game-content";

import type { DevelopmentLevel } from "./calculations.js";
import type { FinalScoreBreakdown } from "./calculations.js";

export type GamePhase =
  | "objective_selection"
  | "ready"
  | "breaking_news"
  | "strategy_draw"
  | "council"
  | "player_turn"
  | "round_resolution"
  | "paused"
  | "completed";

export type TurnStage =
  | "awaiting_roll"
  | "awaiting_shortcut_choice"
  | "awaiting_property_decision"
  | "auction"
  | "landing_fee_reaction"
  | "emergency_sale"
  | "awaiting_event_choice"
  | "awaiting_card_discard"
  | "action_phase";

export interface PlayerState {
  readonly id: string;
  name: string;
  credits: number;
  influence: number;
  position: number;
  cards: string[];
  propertyIds: string[];
  secretObjectiveId: string | null;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface PropertyState {
  readonly id: string;
  ownerId: string | null;
  developmentLevel: DevelopmentLevel;
  purchasedOnTurn: number | null;
  receivedOnTurn: number | null;
}

export interface ObjectiveSelectionState {
  readonly playerId: string;
  readonly offeredObjectiveIds: readonly [string, string];
}

export interface TurnState {
  readonly number: number;
  readonly playerId: string;
  stage: TurnStage;
  actionsRemaining: number;
  cardPlayed: boolean;
  roll: number | null;
  actionsUsed: number;
  turnDeadlineAt: number | null;
  remainingTurnMilliseconds: number | null;
  effects: string[];
}

export interface AuctionState {
  readonly id: string;
  readonly propertyId: string;
  readonly triggeringPlayerId: string;
  readonly eligiblePlayerIds: readonly string[];
  readonly bids: Record<string, number | null>;
  readonly submittedPlayerIds: string[];
  readonly deadlineAt: number;
}

export interface PendingLandingFee {
  readonly payerId: string;
  readonly ownerId: string;
  readonly propertyId: string;
  readonly amount: number;
}

export interface EmergencySaleState extends PendingLandingFee {
  readonly deadlineAt: number;
}

export interface CouncilState {
  readonly id: string;
  readonly round: 3 | 6;
  readonly optionAId: string;
  readonly optionBId: string;
  readonly allocations: Record<
    string,
    { readonly optionAInfluence: number; readonly optionBInfluence: number }
  >;
  readonly deadlineAt: number;
}

export interface TradeState {
  readonly id: string;
  readonly proposerPlayerId: string;
  readonly counterpartyPlayerId: string;
  readonly offeredCredits: number;
  readonly offeredPropertyIds: readonly string[];
  readonly requestedCredits: number;
  readonly requestedPropertyIds: readonly string[];
  readonly createdOnTurn: number;
}

export interface PendingEventChoice {
  readonly playerId: string;
  readonly eventId: "SE03" | "SE04";
}

export interface PendingCardDraw {
  readonly playerId: string;
  readonly count: number;
  readonly resumePhase: "player_turn" | "council";
}

export interface GameState {
  readonly schemaVersion: 1;
  readonly gameId: string;
  readonly roomId: string;
  version: number;
  phase: GamePhase;
  phaseBeforePause: Exclude<GamePhase, "paused"> | null;
  pauseStartedAt?: number | null;
  deferredDisconnectPlayerIds?: string[];
  round: number;
  turnOrder: string[];
  currentTurnOrder: string[];
  currentTurnIndex: number;
  players: Record<string, PlayerState>;
  properties: Record<string, PropertyState>;
  demand: Record<DistrictId, number>;
  strategyDeck: string[];
  objectiveDeck: string[];
  objectiveSelection: ObjectiveSelectionState | null;
  turn: TurnState | null;
  auction: AuctionState | null;
  pendingLandingFee: PendingLandingFee | null;
  emergencySale: EmergencySaleState | null;
  council: CouncilState | null;
  trade: TradeState | null;
  pendingEventChoice: PendingEventChoice | null;
  pendingCardDraw: PendingCardDraw | null;
  pendingCardDrawPlayerIds: string[];
  activeBreakingNewsId: string | null;
  activeRoundEffects: string[];
  activePolicyIds: string[];
  results: Array<{
    readonly playerId: string;
    readonly rank: number;
    readonly propertyCount: number;
    readonly objectiveId: string;
    readonly objectiveCompleted: boolean;
    readonly breakdown: FinalScoreBreakdown;
  }>;
  publicAnnouncements: Array<{ readonly type: string; readonly payload: Record<string, unknown> }>;
}
