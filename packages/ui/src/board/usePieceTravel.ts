import { useLayoutEffect, useRef, type RefObject } from 'react';

const SPACES = 20;
/** A die is 1–6, so no legal move is longer than six spaces in either direction. */
const MAX_TRAVEL = 6;

interface Traveller {
  readonly playerId: string;
  readonly position: number;
}

/**
 * Moves a piece along the board instead of letting it jump.
 *
 * The server sends only the space a player ended on. The path between the two
 * is presentation: the piece is drawn travelling over the intervening spaces
 * in the direction the rules allow, then settles on the space the server
 * actually reported. No game state is inferred from it.
 *
 * Uses FLIP — the new layout is already committed, so the piece is offset back
 * to where it was and animated forward to zero, which keeps the board's grid
 * as the single source of position.
 */
export const usePieceTravel = (
  board: RefObject<HTMLElement | null>,
  players: readonly Traveller[]
): void => {
  const previous = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const root = board.current;
    if (root === null) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (const player of players) {
      const from = previous.current.get(player.playerId);
      previous.current.set(player.playerId, player.position);
      if (from === undefined || from === player.position || reduced) continue;

      const path = travelPath(from, player.position);
      if (path === null) continue;

      const piece = root.querySelector<HTMLElement>(
        `[data-piece="${CSS.escape(player.playerId)}"]`
      );
      if (piece === null || typeof piece.animate !== 'function') continue;

      const destination = centreOf(root, player.position);
      if (destination === null) continue;

      const frames = path
        .map((position) => centreOf(root, position))
        .filter((point): point is Point => point !== null)
        .map((point) => ({
          transform: `translate(${point.x - destination.x}px, ${point.y - destination.y}px)`
        }));
      if (frames.length < 2) continue;

      // Land, rather than stop: the final frame overshoots by a hair.
      piece.animate(
        [...frames, { transform: 'translate(0px, -3px)' }, { transform: 'translate(0px, 0px)' }],
        {
          duration: Math.min(900, 150 + frames.length * 110),
          easing: 'cubic-bezier(0.33, 0, 0.2, 1)',
          fill: 'none'
        }
      );
    }

    // Forget pieces that have left the board so a rejoin does not fly in.
    const present = new Set(players.map((player) => player.playerId));
    for (const id of [...previous.current.keys()]) {
      if (!present.has(id)) previous.current.delete(id);
    }
  }, [board, players]);
};

interface Point {
  readonly x: number;
  readonly y: number;
}

const centreOf = (root: HTMLElement, position: number): Point | null => {
  const cell = root.querySelector<HTMLElement>(`[data-position="${position}"]`);
  if (cell === null) return null;
  const rect = cell.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/**
 * The spaces crossed, inclusive of both ends. Forward is the normal direction;
 * backward only happens through the Shortcut card, and a legal move in either
 * direction is at most six spaces, which makes the direction unambiguous.
 */
export const travelPath = (from: number, to: number): readonly number[] | null => {
  const forward = (to - from + SPACES) % SPACES;
  const backward = (from - to + SPACES) % SPACES;

  const step = forward <= MAX_TRAVEL ? 1 : backward <= MAX_TRAVEL ? -1 : 0;
  if (step === 0) return null;

  const length = step === 1 ? forward : backward;
  return Array.from(
    { length: length + 1 },
    (_, index) => (from + step * index + SPACES * 2) % SPACES
  );
};
