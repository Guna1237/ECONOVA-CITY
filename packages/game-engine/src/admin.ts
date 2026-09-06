import { GAME_CONFIG } from "@econova/game-content";

import { GameRuleError } from "./errors.js";
import { assertGameInvariants } from "./invariants.js";
import type { GameEvent, TransitionResult } from "./transitions.js";
import type { GameState } from "./state.js";
import { applyDisconnectEffects } from "./transitions.js";

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
