import { useCallback, useEffect, useState } from 'react';

import type { HintId } from './briefing.js';

/*
 * One-off coaching notes.
 *
 * A first-time player gets a single sentence the first time each situation
 * comes up, and never sees it again once dismissed. Kept in localStorage so it
 * survives a reconnect, and failing silently when storage is unavailable —
 * a coaching note is never worth breaking a turn over.
 */

const KEY = 'econova.player.hints-seen';

const read = (): ReadonlySet<string> => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return new Set(raw === null ? [] : (JSON.parse(raw) as string[]));
  } catch {
    return new Set();
  }
};

export interface Hints {
  /** True when this note has not been dismissed yet. */
  readonly shouldShow: (hint: HintId | null) => boolean;
  readonly dismiss: (hint: HintId) => void;
  /** Brings every note back, for a player who wants the guidance again. */
  readonly reset: () => void;
}

export const useHints = (): Hints => {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  /* Read after mount so the first server-rendered paint is never blocked. */
  useEffect(() => setSeen(read()), []);

  const persist = useCallback((next: ReadonlySet<string>) => {
    setSeen(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* Guidance is a convenience; play continues without it. */
    }
  }, []);

  return {
    shouldShow: (hint) => hint !== null && !seen.has(hint),
    dismiss: (hint) => persist(new Set([...seen, hint])),
    reset: () => persist(new Set())
  };
};
