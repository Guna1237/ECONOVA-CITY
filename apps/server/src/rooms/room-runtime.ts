import { createHash } from "node:crypto";

import type { AdminCommand, ClientCommand } from "@econova/contracts";
import { GAME_CONFIG } from "@econova/game-content";
import {
  GameInvariantError, GameRuleError, assertGameInvariants, disconnectPlayer,
  executeGameCommand, handleAuctionTimeout, handleCouncilTimeout,
  handleEmergencySaleTimeout, handleReconnectTimeout, handleTurnTimeout,
  pauseGame, reconnectPlayer, resumeGame, startGame,
  type GameEvent, type GameState, type RandomSource, type TransitionResult
} from "@econova/game-engine";

import type { AuthenticatedSession } from "../auth/types.js";
import type {
  CommandReceipt, GamePersistence, PersistedTransition, ReceiptBinding, StoredCommandReceipt
} from "../persistence/types.js";

type CommandIdentity = { readonly requestId: string; readonly actionId: string };
export type RoomCommitListener = (
  state: GameState, events: readonly GameEvent[], receipt: CommandReceipt
) => void | Promise<void>;

export interface RoomRuntimeOptions {
  readonly state: GameState;
  readonly persistence: GamePersistence;
  readonly random: RandomSource;
  readonly now: () => number;
  readonly onCommitted?: RoomCommitListener;
  readonly receiptCacheLimit?: number;
}

const clone = <T>(value: T): T => structuredClone(value);
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object") {
    return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => JSON.stringify(key) + ":" + canonicalJson(entry)).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
};
const bindingFor = (actorKey: string, command: unknown): ReceiptBinding => ({
  actorKey,
  commandHash: createHash("sha256").update(canonicalJson(command)).digest("hex")
});

export class RoomRuntime {
  status: "active" | "quarantined" = "active";
  quarantineReason: string | null = null;
  private state: GameState;
  private readonly persistence: GamePersistence;
  private readonly random: RandomSource;
  private readonly now: () => number;
  private readonly listeners = new Set<RoomCommitListener>();
  private readonly receiptCacheLimit: number;
  private queue: Promise<void> = Promise.resolve();
  private readonly receiptCache = new Map<string, StoredCommandReceipt>();

  constructor(options: RoomRuntimeOptions) {
    assertGameInvariants(options.state);
    this.state = clone(options.state);
    this.persistence = options.persistence;
    this.random = options.random;
    this.now = options.now;
    this.receiptCacheLimit = Math.max(1, Math.min(1_024, options.receiptCacheLimit ?? 256));
    if (options.onCommitted !== undefined) this.listeners.add(options.onCommitted);
  }

  getState(): GameState { return clone(this.state); }
  isQuarantined(): boolean { return this.status === "quarantined"; }
  drain(): Promise<void> { return this.queue; }

  subscribe(listener: RoomCommitListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const task = this.queue.then(run);
    this.queue = task.then(() => undefined, () => undefined);
    return task;
  }

  processCommand(session: AuthenticatedSession, command: ClientCommand, stillAuthorized: () => boolean = () => true): Promise<CommandReceipt> {
    const actor = clone(session);
    const input = clone(command);
    return this.enqueue(() => stillAuthorized()
      ? this.processSerialized(actor, input, "player", () => executeGameCommand(this.state, actor.playerId!, input, { now: this.now(), random: this.random }))
      : Promise.resolve(this.rejection(input, "AUTHORIZATION_DENIED", "This connection is no longer authorized.")));
  }

  processAdminCommand(session: AuthenticatedSession, command: AdminCommand, stillAuthorized: () => boolean = () => true): Promise<CommandReceipt> {
    const actor = clone(session);
    const input = clone(command);
    return this.enqueue(() => {
      if (!stillAuthorized()) return Promise.resolve(this.rejection(input, "AUTHORIZATION_DENIED", "This session is no longer authorized."));
      return this.processSerialized(actor, input, "admin", () => {
      switch (input.type) {
        case "admin_start_game": return startGame(this.state, this.random, this.now());
        case "admin_pause_game": return pauseGame(this.state, this.now(), input.reason);
        case "admin_resume_game": return resumeGame(this.state, this.now());
        case "admin_skip_turn":
        case "admin_end_game":
          throw new GameRuleError("ADMIN_ACTION_UNAVAILABLE", "This admin operation is not enabled.");
      }
      });
    });
  }

  /** Transport reports verified presence; it never supplies game-state patches. */
  processPresence(playerId: string, connected: boolean): Promise<CommandReceipt | null> {
    return this.enqueue(async () => {
      if (this.isQuarantined()) return null;
      const identity = this.systemIdentity("presence-" + playerId);
      try {
        assertGameInvariants(this.state);
        if (this.state.players[playerId] === undefined) return null;
        // Resolve overdue reconnects before a late socket can resume the old turn.
        await this.processDeadlineSerialized();
        if (this.isQuarantined()) return this.quarantinedReceipt(identity);
        if (this.state.players[playerId]?.connected === connected) return null;
        const transition = connected
          ? reconnectPlayer(this.state, playerId, this.now())
          : disconnectPlayer(this.state, playerId, this.now());
        return await this.commit(transition, this.systemIdentity("presence-" + playerId),
          bindingFor("system", { playerId, connected, version: this.state.version }), playerId);
      } catch (error) {
        await this.quarantine(error);
        return this.quarantinedReceipt(identity);
      }
    });
  }

  /** Resolve one due transition; the scheduler rechecks nextDeadlineAt afterwards. */
  processDeadlines(): Promise<CommandReceipt | null> {
    return this.enqueue(() => this.processDeadlineSerialized());
  }

  nextDeadlineAt(): number | null {
    if (this.isQuarantined() || this.state.phase === "paused" || this.state.phase === "completed") return null;
    if (this.state.phase === "council") return this.state.council?.deadlineAt ?? null;
    if (this.state.phase !== "player_turn" || this.state.turn === null) return null;
    if (this.state.auction !== null) return this.state.auction.deadlineAt;
    if (this.state.emergencySale !== null) return this.state.emergencySale.deadlineAt;
    const player = this.state.players[this.state.turn.playerId];
    if (player?.connected === false && player.disconnectedAt !== null) {
      return player.disconnectedAt + GAME_CONFIG.reconnectGraceSeconds * 1_000;
    }
    return this.state.turn.turnDeadlineAt;
  }

  private async processDeadlineSerialized(): Promise<CommandReceipt | null> {
    if (this.isQuarantined()) return null;
    const identity = this.systemIdentity("deadline");
    try {
      assertGameInvariants(this.state);
      const deadlineAt = this.nextDeadlineAt();
      const now = this.now();
      if (deadlineAt === null || now < deadlineAt) return null;
      let transition: TransitionResult;
      if (this.state.phase === "council") transition = handleCouncilTimeout(this.state, now);
      else if (this.state.auction !== null) transition = handleAuctionTimeout(this.state, now);
      else if (this.state.emergencySale !== null) transition = handleEmergencySaleTimeout(this.state, now);
      else if (this.state.turn !== null && this.state.players[this.state.turn.playerId]?.connected === false) {
        transition = handleReconnectTimeout(this.state, now, this.random);
      } else transition = handleTurnTimeout(this.state, now, this.random);
      return await this.commit(transition, identity,
        bindingFor("system", { type: "deadline", deadlineAt, version: this.state.version }), null);
    } catch (error) {
      await this.quarantine(error);
      return this.quarantinedReceipt(identity);
    }
  }

  private systemIdentity(kind: string): CommandIdentity {
    const id = "system:" + this.state.version + ":" + kind;
    return { requestId: id, actionId: id };
  }

  private rejection(command: CommandIdentity, code: string, message: string): Extract<CommandReceipt, { status: "rejected" }> {
    return { status: "rejected", requestId: command.requestId, actionId: command.actionId,
      stateVersion: this.state.version, code, message };
  }

  private quarantinedReceipt(command: CommandIdentity): CommandReceipt {
    return this.rejection(command, "ROOM_QUARANTINED", "This room is paused for operator review.");
  }

  private async quarantine(error: unknown): Promise<void> {
    this.status = "quarantined";
    this.quarantineReason = error instanceof Error ? error.message : "Unknown room failure";
    try { await this.persistence.quarantineRoom(this.state.gameId, this.state.roomId); } catch { /* Preserve in-memory quarantine even when the database is unavailable. */ }
    const receipt = this.quarantinedReceipt(this.systemIdentity("quarantine"));
    for (const listener of this.listeners) {
      try { void Promise.resolve(listener(clone(this.state), [], receipt)).catch(() => undefined); } catch { /* Isolate observers. */ }
    }
  }

  private cache(stored: StoredCommandReceipt): void {
    this.receiptCache.delete(stored.receipt.actionId);
    this.receiptCache.set(stored.receipt.actionId, clone(stored));
    while (this.receiptCache.size > this.receiptCacheLimit) {
      this.receiptCache.delete(this.receiptCache.keys().next().value!);
    }
  }

  private async replay(command: CommandIdentity, binding: ReceiptBinding): Promise<CommandReceipt | null> {
    const cached = [...this.receiptCache.values()].filter(({ receipt }) =>
      receipt.actionId === command.actionId || receipt.requestId === command.requestId);
    const stored = cached.length > 0 ? cached :
      await this.persistence.getCommandReceipts(this.state.gameId, command.actionId, command.requestId);
    if (stored.length === 0) return null;
    const original = stored[0]!;
    if (stored.length !== 1 || original.receipt.actionId !== command.actionId ||
      original.receipt.requestId !== command.requestId ||
      original.binding?.actorKey !== binding.actorKey || original.binding.commandHash !== binding.commandHash) {
      return this.rejection(command, "IDEMPOTENCY_CONFLICT", "These command identifiers were already used.");
    }
    this.cache(original);
    return clone(original.receipt);
  }

  private async processSerialized(
    session: AuthenticatedSession,
    command: ClientCommand | AdminCommand,
    role: "player" | "admin",
    execute: () => TransitionResult
  ): Promise<CommandReceipt> {
    if (this.isQuarantined()) return this.quarantinedReceipt(command);
    if (session.role !== role || session.expiresAt <= this.now() ||
      (session.roomId !== this.state.roomId && !(role === "admin" && session.roomId === null)) ||
      (role === "player" && (session.playerId === null || this.state.players[session.playerId] === undefined))) {
      return this.rejection(command, "AUTHORIZATION_DENIED", "This session cannot act in this room.");
    }
    const binding = bindingFor(role === "player" ? "player:" + session.playerId : "admin:" + session.sessionId, command);
    try {
      assertGameInvariants(this.state);
      const replay = await this.replay(command, binding);
      if (replay !== null) return replay;
      await this.processDeadlineSerialized();
      if (this.isQuarantined()) return this.quarantinedReceipt(command);
      let transition: TransitionResult;
      try {
        if (command.expectedStateVersion !== this.state.version) {
          throw new GameRuleError("STALE_STATE", "Command was based on an outdated game state.");
        }
        if (role === "player" && (this.state.phase === "paused" || this.state.phase === "completed")) {
          throw new GameRuleError("INVALID_PHASE", "Player actions are unavailable in this phase.");
        }
        transition = execute();
      } catch (error) {
        if (!(error instanceof GameRuleError)) throw error;
        const receipt = this.rejection(command, error.code, error.message);
        await this.persistence.persistRejectedReceipt(this.state.gameId, this.state.roomId, receipt, binding);
        this.cache({ receipt, binding });
        return receipt;
      }
      return await this.commit(transition, command, binding, role === "player" ? session.playerId : null,
        role === "admin" ? { adminSessionId: session.sessionId, actionType: command.type,
          requestId: command.requestId, actionId: command.actionId } : undefined);
    } catch (error) {
      await this.quarantine(error);
      return this.quarantinedReceipt(command);
    }
  }

  private async commit(
    transition: TransitionResult,
    command: CommandIdentity,
    binding: ReceiptBinding,
    actorPlayerId: string | null,
    adminAudit?: PersistedTransition["adminAudit"]
  ): Promise<CommandReceipt> {
    assertGameInvariants(transition.state);
    if (transition.state.version !== this.state.version + 1 ||
      transition.state.roomId !== this.state.roomId || transition.state.gameId !== this.state.gameId) {
      throw new GameInvariantError("Transition changed room identity or violated state-version ordering.");
    }
    const receipt: CommandReceipt = { status: "accepted", requestId: command.requestId,
      actionId: command.actionId, stateVersion: transition.state.version };
    await this.persistence.persistTransition({ roomId: this.state.roomId, gameId: this.state.gameId,
      previousVersion: this.state.version, actorPlayerId, nextState: transition.state,
      events: transition.events, receipt, receiptBinding: binding,
      ...(adminAudit === undefined ? {} : { adminAudit }) });
    this.state = transition.state;
    this.cache({ receipt, binding });
    // A downstream observer cannot mutate the snapshot, fail a committed room,
    // or hold the queue hostage with a stalled transport promise.
    for (const listener of this.listeners) {
      try {
        void Promise.resolve(listener(clone(this.state), clone(transition.events), clone(receipt))).catch(() => undefined);
      } catch { /* The transport owns reconnect/retry; the durable game remains healthy. */ }
    }
    return clone(receipt);
  }
}
