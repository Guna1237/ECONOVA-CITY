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

export interface PersistedTransition {
  readonly roomId: string;
  readonly gameId: string;
  readonly previousVersion: number;
  readonly actorPlayerId: string | null;
  readonly nextState: GameState;
  readonly events: readonly GameEvent[];
  readonly receipt: CommandReceipt;
  readonly adminAudit?: {
    readonly adminSessionId: string;
    readonly actionType: string;
    readonly requestId: string;
    readonly actionId: string;
  };
}

export interface GamePersistence {
  persistInitialState(state: GameState): Promise<void>;
  loadLatestState(gameId: string): Promise<GameState | null>;
  getActionReceipt(gameId: string, actionId: string): Promise<CommandReceipt | null>;
  persistTransition(transition: PersistedTransition): Promise<void>;
  persistRejectedReceipt(
    gameId: string,
    roomId: string,
    receipt: Extract<CommandReceipt, { status: "rejected" }>
  ): Promise<void>;
}
