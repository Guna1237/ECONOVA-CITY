import { GAME_CONFIG } from "@econova/game-content";

import { GameRuleError } from "./errors.js";
import { assertGameInvariants } from "./invariants.js";
import type { GameEvent, TransitionResult } from "./transitions.js";
import type { GameState } from "./state.js";
import type { RandomSource } from "./random.js";
import { chooseSecretObjective } from "./setup.js";
import {
  applyDisconnectEffects,
  handleAuctionTimeout,
  handleCouncilTimeout,
  handleEmergencySaleTimeout,
  handleStrategyDrawTimeout,
  handleTurnTimeout
} from "./transitions.js";

const cloneState = (state: GameState): GameState =>
  JSON.parse(JSON.stringify(state)) as GameState;

const event = (type: string, payload: Record<string, unknown>): GameEvent => ({
  type,
  visibility: "public",
  payload
});

export const pauseGame = (state: GameState, now: number, reason: string): TransitionResult => {
  if (state.phase === "paused" || state.phase === "completed") {
    throw new GameRuleError("INVALID_PHASE", "This game cannot be paused.");
  }
  const previousPhase = state.phase;
  const next = cloneState(state);
  next.phaseBeforePause = previousPhase;
  next.phase = "paused";
  next.pauseStartedAt = now;
  next.deferredDisconnectPlayerIds = [];
  if (next.turn !== null && next.turn.turnDeadlineAt !== null) {
    next.turn.remainingTurnMilliseconds = Math.max(0, next.turn.turnDeadlineAt - now);
    next.turn.turnDeadlineAt = null;
  }
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events: [event("game_paused", { reason })] };
};

/*
 * Forcing reuses the real timeout handlers rather than reimplementing their
 * effects. Each helper expires only the clock the handler guards on, then
 * hands the handler the true `now`, so every timestamp the transition writes
 * downstream stays honest and the forced result is identical to an expiry.
 */
const forceStrategyDraw = (state: GameState, now: number): TransitionResult => {
  const armed = cloneState(state);
  if (armed.pendingCardDraw === null) {
    throw new GameRuleError("NO_PENDING_DECISION", "No strategy draw is pending.");
  }
  armed.pendingCardDraw = { ...armed.pendingCardDraw, deadlineAt: now };
  return handleStrategyDrawTimeout(armed, now);
};

const forceCouncil = (state: GameState, now: number): TransitionResult => {
  const armed = cloneState(state);
  if (armed.council === null) throw new GameRuleError("NO_PENDING_DECISION", "No Council vote is open.");
  armed.council = { ...armed.council, deadlineAt: now };
  return handleCouncilTimeout(armed, now);
};

const forceAuction = (state: GameState, now: number): TransitionResult => {
  const armed = cloneState(state);
  if (armed.auction === null) throw new GameRuleError("NO_PENDING_DECISION", "No auction is open.");
  armed.auction = { ...armed.auction, deadlineAt: now };
  return handleAuctionTimeout(armed, now);
};

const forceEmergencySale = (state: GameState, now: number): TransitionResult => {
  const armed = cloneState(state);
  if (armed.emergencySale === null) {
    throw new GameRuleError("NO_PENDING_DECISION", "No emergency sale is open.");
  }
  armed.emergencySale = { ...armed.emergencySale, deadlineAt: now };
  return handleEmergencySaleTimeout(armed, now);
};

const forceTurn = (state: GameState, now: number, random: RandomSource): TransitionResult => {
  const armed = cloneState(state);
  if (armed.turn === null) throw new GameRuleError("NO_PENDING_DECISION", "No turn is in progress.");
  armed.turn.turnDeadlineAt = now;
  return handleTurnTimeout(armed, now, random);
};

/**
 * Operator escape hatch: resolve whatever decision the room is waiting on,
 * right now, without waiting out its timer.
 *
 * This deliberately reuses the same timeout handlers the server would have
 * run on expiry, so forcing produces exactly the state an expiry would have
 * produced. It is the recovery path for a stall nobody predicted, which
 * previously had no answer short of resetting the room and losing the game.
 */
export const forcePendingDecision = (
  state: GameState,
  now: number,
  random: RandomSource,
  reason: string
): TransitionResult => {
  if (state.phase === "paused" || state.phase === "completed") {
    throw new GameRuleError("INVALID_PHASE", "This game has no pending decision to force.");
  }

  const forced = (result: TransitionResult): TransitionResult => ({
    state: result.state,
    events: [...result.events, event("operator_forced_decision", { reason, phase: state.phase })]
  });

  if (state.phase === "objective_selection" && state.objectiveSelection !== null) {
    const selection = state.objectiveSelection;
    const next = chooseSecretObjective(state, selection.playerId, selection.offeredObjectiveIds[0], now);
    assertGameInvariants(next);
    return forced({ state: next, events: [] });
  }
  if (state.phase === "strategy_draw") return forced(forceStrategyDraw(state, now));
  if (state.phase === "council") return forced(forceCouncil(state, now));
  if (state.auction !== null) return forced(forceAuction(state, now));
  if (state.emergencySale !== null) return forced(forceEmergencySale(state, now));
  if (state.phase === "player_turn" && state.turn !== null) {
    return forced(forceTurn(state, now, random));
  }
  throw new GameRuleError("NO_PENDING_DECISION", "Nothing is currently waiting on a decision.");
};

export const resumeGame = (state: GameState, now: number): TransitionResult => {
  if (state.phase !== "paused" || state.phaseBeforePause === null) {
    throw new GameRuleError("INVALID_PHASE", "This game is not paused.");
  }
  const restoredPhase = state.phaseBeforePause;
  if (state.pauseStartedAt == null || !Number.isSafeInteger(state.pauseStartedAt) || now < state.pauseStartedAt) {
    throw new GameRuleError("PAUSE_RECOVERY_REQUIRED", "Pause timestamp requires operator recovery review.");
  }
  const next = cloneState(state);
  const pausedAt = state.pauseStartedAt;
  const elapsed = now - pausedAt;
  next.phase = restoredPhase;
  next.phaseBeforePause = null;
  next.pauseStartedAt = null;
  if (next.auction !== null) next.auction = { ...next.auction, deadlineAt: next.auction.deadlineAt + elapsed };
  if (next.council !== null) next.council = { ...next.council, deadlineAt: next.council.deadlineAt + elapsed };
  if (next.emergencySale !== null) next.emergencySale = { ...next.emergencySale, deadlineAt: next.emergencySale.deadlineAt + elapsed };
  // Pending decisions are paused like every other clock: without this, a long
  // operator pause would land back already expired and auto-resolve instantly.
  if (next.objectiveSelection?.deadlineAt !== undefined) {
    next.objectiveSelection = {
      ...next.objectiveSelection,
      deadlineAt: next.objectiveSelection.deadlineAt + elapsed
    };
  }
  if (next.pendingCardDraw?.deadlineAt !== undefined) {
    next.pendingCardDraw = {
      ...next.pendingCardDraw,
      deadlineAt: next.pendingCardDraw.deadlineAt + elapsed
    };
  }
  for (const player of Object.values(next.players)) {
    if (!player.connected && player.disconnectedAt !== null) player.disconnectedAt = now - Math.max(0, pausedAt - player.disconnectedAt);
  }
  if (
    next.turn !== null &&
    next.turn.turnDeadlineAt === null &&
    next.turn.remainingTurnMilliseconds !== null &&
    next.players[next.turn.playerId]?.connected === true &&
    next.turn.stage !== "auction" &&
    next.turn.stage !== "emergency_sale"
  ) {
    next.turn.turnDeadlineAt =
      now + Math.min(next.turn.remainingTurnMilliseconds, GAME_CONFIG.turnTimerSeconds * 1_000);
    next.turn.remainingTurnMilliseconds = null;
  }
  const events: GameEvent[] = [event("game_resumed", {})];
  for (const playerId of next.deferredDisconnectPlayerIds ?? []) applyDisconnectEffects(next, playerId, now, events);
  next.deferredDisconnectPlayerIds = [];
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events };
};
