import type { ActivityItemDto } from '@econova/contracts';

/** Reconnect resumes the bounded history, never replays commands or old toasts. */
export class ActivityCursor {
  private gameId: string | null = null;
  private version = -1;
  private ids = new Set<string>();
  receive(gameId: string, version: number, items: readonly ActivityItemDto[]): readonly ActivityItemDto[] {
    if (this.gameId === gameId && version <= this.version) return [];
    const fresh = this.gameId === gameId ? items.filter(item => !this.ids.has(item.id)) : [];
    this.gameId = gameId;
    this.version = version;
    this.ids = new Set(items.map(item => item.id));
    return fresh;
  }
}
