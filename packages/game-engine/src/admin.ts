import { GAME_CONFIG } from "@econova/game-content";

import { GameRuleError } from "./errors.js";
import { assertGameInvariants } from "./invariants.js";
import type { GameEvent, TransitionResult } from "./transitions.js";
import type { GameState } from "./state.js";

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
  const next = cloneState(state);
  next.phase = restoredPhase;
  next.phaseBeforePause = null;
  if (
    next.turn !== null &&
    next.turn.turnDeadlineAt === null &&
    next.turn.remainingTurnMilliseconds !== null &&
    next.turn.stage !== "auction" &&
    next.turn.stage !== "emergency_sale"
  ) {
    next.turn.turnDeadlineAt =
      now + Math.min(next.turn.remainingTurnMilliseconds, GAME_CONFIG.turnTimerSeconds * 1_000);
    next.turn.remainingTurnMilliseconds = null;
  }
  next.version += 1;
  assertGameInvariants(next);
  return { state: next, events: [event("game_resumed", {})] };
};
