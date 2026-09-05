import type {
  CommandReceipt,
  GamePersistence,
  PersistedTransition
} from "./types.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class InMemoryGamePersistence implements GamePersistence {
  readonly initialStates: import("@econova/game-engine").GameState[] = [];
  private readonly latestStates = new Map<string, import("@econova/game-engine").GameState>();
  readonly transitions: PersistedTransition[] = [];
  readonly receipts = new Map<string, CommandReceipt>();
  failNextTransition = false;
  failNextReceipt = false;

  async persistInitialState(state: import("@econova/game-engine").GameState): Promise<void> {
    this.initialStates.push(clone(state));
    this.latestStates.set(state.gameId, clone(state));
  }

  async loadLatestState(
    gameId: string
  ): Promise<import("@econova/game-engine").GameState | null> {
    const state = this.latestStates.get(gameId);
    return state === undefined ? null : clone(state);
  }

  async getActionReceipt(gameId: string, actionId: string): Promise<CommandReceipt | null> {
    return this.receipts.get(`${gameId}:${actionId}`) ?? null;
  }

  async persistTransition(transition: PersistedTransition): Promise<void> {
    if (this.failNextTransition) {
      this.failNextTransition = false;
      throw new Error("Injected transition persistence failure");
    }
    this.transitions.push(clone(transition));
    this.latestStates.set(transition.gameId, clone(transition.nextState));
    this.receipts.set(
      `${transition.gameId}:${transition.receipt.actionId}`,
      clone(transition.receipt)
    );
  }

  async persistRejectedReceipt(
    gameId: string,
    _roomId: string,
    receipt: Extract<CommandReceipt, { status: "rejected" }>
  ): Promise<void> {
    if (this.failNextReceipt) {
      this.failNextReceipt = false;
      throw new Error("Injected receipt persistence failure");
    }
    this.receipts.set(`${gameId}:${receipt.actionId}`, clone(receipt));
  }
}
