import type { AdminCommand, ClientCommand } from "@econova/contracts";
import {
  GameInvariantError,
  GameRuleError,
  assertGameInvariants,
  executeGameCommand,
  pauseGame,
  resumeGame,
  startGame,
  type GameEvent,
  type GameState,
  type RandomSource
} from "@econova/game-engine";

import type { AuthenticatedSession } from "../auth/types.js";
import type { CommandReceipt, GamePersistence } from "../persistence/types.js";

export interface RoomRuntimeOptions {
  readonly state: GameState;
  readonly persistence: GamePersistence;
  readonly random: RandomSource;
  readonly now: () => number;
  readonly onCommitted?: (
    state: GameState,
    events: readonly GameEvent[],
    receipt: CommandReceipt
  ) => void | Promise<void>;
}

export class RoomRuntime {
  status: "active" | "quarantined" = "active";
  quarantineReason: string | null = null;
  private state: GameState;
  private readonly persistence: GamePersistence;
  private readonly random: RandomSource;
  private readonly now: () => number;
  private readonly onCommitted: RoomRuntimeOptions["onCommitted"];
  private queue: Promise<void> = Promise.resolve();
  private readonly receiptCache = new Map<string, CommandReceipt>();

  constructor(options: RoomRuntimeOptions) {
    assertGameInvariants(options.state);
    this.state = options.state;
    this.persistence = options.persistence;
    this.random = options.random;
    this.now = options.now;
    this.onCommitted = options.onCommitted;
  }

  getState(): GameState {
    return this.state;
  }

  processCommand(
    session: AuthenticatedSession,
    command: ClientCommand
  ): Promise<CommandReceipt> {
    const task = this.queue.then(() => this.processSerialized(session, command));
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  processAdminCommand(
    session: AuthenticatedSession,
    command: AdminCommand
  ): Promise<CommandReceipt> {
    const task = this.queue.then(() => this.processAdminSerialized(session, command));
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  private rejection(
    command: { readonly requestId: string; readonly actionId: string },
    code: string,
    message: string
  ): Extract<CommandReceipt, { status: "rejected" }> {
    return {
      status: "rejected",
      requestId: command.requestId,
      actionId: command.actionId,
      stateVersion: this.state.version,
      code,
      message
    };
  }

  private quarantine(reason: unknown): void {
    this.status = "quarantined";
    this.quarantineReason = reason instanceof Error ? reason.message : "Unknown room failure";
  }

  private async processSerialized(
    session: AuthenticatedSession,
    command: ClientCommand
  ): Promise<CommandReceipt> {
    if (this.status === "quarantined") {
      return this.rejection(command, "ROOM_QUARANTINED", "This room is paused for operator review.");
    }
    if (
      session.role !== "player" ||
      session.roomId !== this.state.roomId ||
      session.playerId === null ||
      session.expiresAt <= this.now()
    ) {
      return this.rejection(
        command,
        "AUTHORIZATION_DENIED",
        "This session cannot act in this room."
      );
    }

    const cached =
      this.receiptCache.get(command.actionId) ??
      (await this.persistence.getActionReceipt(this.state.gameId, command.actionId));
    if (cached !== null && cached !== undefined) {
      this.receiptCache.set(command.actionId, cached);
      return cached;
    }

    try {
      assertGameInvariants(this.state);
      const transition = executeGameCommand(this.state, session.playerId, command, {
        now: this.now(),
        random: this.random
      });
      assertGameInvariants(transition.state);
      const receipt: CommandReceipt = {
        status: "accepted",
        requestId: command.requestId,
        actionId: command.actionId,
        stateVersion: transition.state.version
      };

      await this.persistence.persistTransition({
        roomId: this.state.roomId,
        gameId: this.state.gameId,
        previousVersion: this.state.version,
        actorPlayerId: session.playerId,
        nextState: transition.state,
        events: transition.events,
        receipt
      });
      this.state = transition.state;
      this.receiptCache.set(command.actionId, receipt);
      await this.onCommitted?.(this.state, transition.events, receipt);
      return receipt;
    } catch (error) {
      if (error instanceof GameRuleError) {
        const receipt = this.rejection(command, error.code, error.message);
        try {
          await this.persistence.persistRejectedReceipt(
            this.state.gameId,
            this.state.roomId,
            receipt
          );
          this.receiptCache.set(command.actionId, receipt);
          return receipt;
        } catch (persistenceError) {
          this.quarantine(persistenceError);
          return this.rejection(
            command,
            "ROOM_QUARANTINED",
            "This room is paused for operator review."
          );
        }
      }
      this.quarantine(error instanceof GameInvariantError ? error : error);
      return this.rejection(
        command,
        "ROOM_QUARANTINED",
        "This room is paused for operator review."
      );
    }
  }

  private async processAdminSerialized(
    session: AuthenticatedSession,
    command: AdminCommand
  ): Promise<CommandReceipt> {
    if (this.status === "quarantined") {
      return this.rejection(command, "ROOM_QUARANTINED", "This room is paused for operator review.");
    }
    if (
      session.role !== "admin" ||
      session.expiresAt <= this.now() ||
      (session.roomId !== null && session.roomId !== this.state.roomId)
    ) {
      return this.rejection(command, "AUTHORIZATION_DENIED", "A valid admin session is required.");
    }
    const cached =
      this.receiptCache.get(command.actionId) ??
      (await this.persistence.getActionReceipt(this.state.gameId, command.actionId));
    if (cached !== null && cached !== undefined) return cached;
    if (command.expectedStateVersion !== this.state.version) {
      const receipt = this.rejection(
        command,
        "STALE_STATE",
        "Admin command was based on an outdated game state."
      );
      await this.persistence.persistRejectedReceipt(this.state.gameId, this.state.roomId, receipt);
      this.receiptCache.set(command.actionId, receipt);
      return receipt;
    }

    try {
      let transition;
      switch (command.type) {
        case "admin_start_game":
          transition = startGame(this.state, this.random, this.now());
          break;
        case "admin_pause_game":
          transition = pauseGame(this.state, this.now(), command.reason);
          break;
        case "admin_resume_game":
          transition = resumeGame(this.state, this.now());
          break;
        case "admin_skip_turn":
        case "admin_end_game":
          throw new GameRuleError(
            "ADMIN_ACTION_UNAVAILABLE",
            "This destructive admin operation is not enabled in Phase 1."
          );
      }
      assertGameInvariants(transition.state);
      const receipt: CommandReceipt = {
        status: "accepted",
        requestId: command.requestId,
        actionId: command.actionId,
        stateVersion: transition.state.version
      };
      await this.persistence.persistTransition({
        roomId: this.state.roomId,
        gameId: this.state.gameId,
        previousVersion: this.state.version,
        actorPlayerId: null,
        nextState: transition.state,
        events: transition.events,
        receipt,
        adminAudit: {
          adminSessionId: session.sessionId,
          actionType: command.type,
          requestId: command.requestId,
          actionId: command.actionId
        }
      });
      this.state = transition.state;
      this.receiptCache.set(command.actionId, receipt);
      await this.onCommitted?.(this.state, transition.events, receipt);
      return receipt;
    } catch (error) {
      if (error instanceof GameRuleError) {
        const receipt = this.rejection(command, error.code, error.message);
        try {
          await this.persistence.persistRejectedReceipt(
            this.state.gameId,
            this.state.roomId,
            receipt
          );
          this.receiptCache.set(command.actionId, receipt);
          return receipt;
        } catch (persistenceError) {
          this.quarantine(persistenceError);
        }
      } else {
        this.quarantine(error);
      }
      return this.rejection(
        command,
        "ROOM_QUARANTINED",
        "This room is paused for operator review."
      );
    }
  }
}
