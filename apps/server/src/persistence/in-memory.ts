import type {
  CommandReceipt,
  GamePersistence,
  PersistedTransition,
  ReceiptBinding,
  StoredCommandReceipt
} from "./types.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class InMemoryGamePersistence implements GamePersistence {
  readonly quarantinedRooms = new Set<string>();
  async quarantineRoom(_gameId: string, roomId: string): Promise<void> { this.quarantinedRooms.add(roomId); }
  readonly initialStates: import("@econova/game-engine").GameState[] = [];
  private readonly latestStates = new Map<string, import("@econova/game-engine").GameState>();
  readonly transitions: PersistedTransition[] = [];
  readonly receipts = new Map<string, CommandReceipt>();
  private readonly bindings = new Map<string, ReceiptBinding>();
  failNextTransition = false;
  failNextReceipt = false;

  async persistInitialState(
    state: import("@econova/game-engine").GameState,
    _recovery?: { readonly roomCode: string }
  ): Promise<void> {
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
    return clone(this.receipts.get(`${gameId}:${actionId}`) ?? null);
  }

  async getCommandReceipts(
    gameId: string,
    actionId: string,
    requestId: string
  ): Promise<readonly StoredCommandReceipt[]> {
    return [...this.receipts.entries()]
      .filter(([key, receipt]) => key.startsWith(`${gameId}:`) &&
        (receipt.actionId === actionId || receipt.requestId === requestId))
      .map(([key, receipt]) => clone({ receipt, binding: this.bindings.get(key) ?? null }));
  }

  async persistTransition(transition: PersistedTransition): Promise<void> {
    if (this.failNextTransition) {
      this.failNextTransition = false;
      throw new Error("Injected transition persistence failure");
    }
    this.assertReceiptAvailable(transition.gameId, transition.receipt);
    this.transitions.push(clone(transition));
    this.latestStates.set(transition.gameId, clone(transition.nextState));
    this.receipts.set(
      `${transition.gameId}:${transition.receipt.actionId}`,
      clone(transition.receipt)
    );
    if (transition.receiptBinding !== undefined) {
      this.bindings.set(`${transition.gameId}:${transition.receipt.actionId}`, clone(transition.receiptBinding));
    }
  }

  async persistRejectedReceipt(
    gameId: string,
    _roomId: string,
    receipt: Extract<CommandReceipt, { status: "rejected" }>,
    binding?: ReceiptBinding
  ): Promise<void> {
    if (this.failNextReceipt) {
      this.failNextReceipt = false;
      throw new Error("Injected receipt persistence failure");
    }
    this.assertReceiptAvailable(gameId, receipt);
    this.receipts.set(`${gameId}:${receipt.actionId}`, clone(receipt));
    if (binding !== undefined) this.bindings.set(`${gameId}:${receipt.actionId}`, clone(binding));
  }

  private assertReceiptAvailable(gameId: string, receipt: CommandReceipt): void {
    for (const [key, stored] of this.receipts) {
      if (key.startsWith(`${gameId}:`) &&
        (stored.actionId === receipt.actionId || stored.requestId === receipt.requestId)) {
        throw new Error("Persistence receipt-identity conflict");
      }
    }
  }
}
