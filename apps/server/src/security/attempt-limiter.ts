export interface AttemptLimiterOptions {
  readonly limit: number;
  readonly windowMilliseconds: number;
  readonly now: () => number;
}

interface AttemptWindow {
  count: number;
  startedAt: number;
}

export class AttemptLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();

  constructor(private readonly options: AttemptLimiterOptions) {}

  consume(key: string): boolean {
    const now = this.options.now();
    if (this.attempts.size >= 1024) {
      for (const [entryKey, entry] of this.attempts) {
        if (now - entry.startedAt >= this.options.windowMilliseconds) this.attempts.delete(entryKey);
      }
      if (this.attempts.size >= 1024 && !this.attempts.has(key)) return false;
    }
    const existing = this.attempts.get(key);
    if (
      existing === undefined ||
      now - existing.startedAt >= this.options.windowMilliseconds
    ) {
      this.attempts.set(key, { count: 1, startedAt: now });
      return true;
    }
    if (existing.count >= this.options.limit) return false;
    existing.count += 1;
    return true;
  }
}
