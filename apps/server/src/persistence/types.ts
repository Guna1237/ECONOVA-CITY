import type { GameEvent, GameState } from "@econova/game-engine";

export type CommandReceipt =
  | {
      readonly status: "accepted";
      readonly requestId: string;
      readonly actionId: string;
      readonly stateVersion: number;
    }
  | {
      readonly status: "rejected";
      readonly requestId: string;
      readonly actionId: string;
      readonly stateVersion: number;
      readonly code: string;
      readonly message: string;
    };

/** Kept outside the public receipt: authentication and payload binding are server-only. */
export interface ReceiptBinding {
  readonly actorKey: string;
  readonly commandHash: string;
}

export interface StoredCommandReceipt {
  readonly receipt: CommandReceipt;
  /** Legacy receipts without a binding must never authorize a replay. */
  readonly binding: ReceiptBinding | null;
}

export interface PersistedTransition {
  readonly roomId: string;
  readonly gameId: string;
  readonly previousVersion: number;
  readonly actorPlayerId: string | null;
  readonly nextState: GameState;
  readonly events: readonly GameEvent[];
  readonly receipt: CommandReceipt;
  readonly receiptBinding?: ReceiptBinding;
  readonly adminAudit?: {
    readonly adminSessionId: string;
    readonly actionType: string;
    readonly requestId: string;
    readonly actionId: string;
  };
}

export interface GamePersistence {
  quarantineRoom(gameId: string, roomId: string): Promise<void>;
  persistInitialState(
    state: GameState,
    recovery?: { readonly roomCode: string }
  ): Promise<void>;
  loadLatestState(gameId: string): Promise<GameState | null>;
  getActionReceipt(gameId: string, actionId: string): Promise<CommandReceipt | null>;
  getCommandReceipts(
    gameId: string,
    actionId: string,
    requestId: string
  ): Promise<readonly StoredCommandReceipt[]>;
  persistTransition(transition: PersistedTransition): Promise<void>;
  persistRejectedReceipt(
    gameId: string,
    roomId: string,
    receipt: Extract<CommandReceipt, { status: "rejected" }>,
    binding?: ReceiptBinding
  ): Promise<void>;
}
