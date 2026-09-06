import type { CSSProperties, ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import {
  ConnectionStatus,
  PHASE_LABEL,
  Resource,
  Timer,
  seatOf
} from '@econova/ui';

import { usePlayerSession } from '../state/PlayerSession.js';

/**
 * The standing facts: how far through the game we are, who is up, how long
 * they have, and what the player holds.
 *
 * What the player should *do* is the briefing's job, so the rail deliberately
 * carries no stage label and no instruction — repeating them here only split
 * the player's attention.
 */
export const StatusRail = (): ReactElement => {
  const { projection, link, mode } = usePlayerSession();
  const { public: view, self } = projection;

  const current =
    view.turn === null
      ? null
      : view.players.find((player) => player.playerId === view.turn?.playerId) ?? null;
  const seat = current === null ? null : seatOf(current.playerId, view.turnOrder);
  const isMe = current?.playerId === self.playerId;
  const deadline = view.turn?.deadlineAt ?? null;

  return (
    <header className="player-rail">
      <div className="player-rail__meta">
        <span className="player-rail__round">
          Round <b>{view.round}</b>
          <span>/{GAME_CONFIG.rounds}</span>
        </span>

        <div className="player-rail__turn" data-you={isMe}>
          {seat === null ? null : (
            <span
              className="eco-rail__seat-dot"
              style={{ '--seat': seat.color } as CSSProperties}
              aria-hidden="true"
            />
          )}
          <span>
            {current === null
              ? PHASE_LABEL[view.phase] ?? view.phase
              : isMe
                ? 'Your turn'
                : current.name}
          </span>
        </div>

        {/* The clock belongs to whoever is up, so a waiting player can see
            how long they have to wait. */}
        {deadline !== null && view.phase === 'player_turn' ? (
          <Timer
            deadlineAt={deadline}
            windowSeconds={GAME_CONFIG.turnTimerSeconds}
            label={isMe ? 'Your time' : 'Time left'}
          />
        ) : null}

        {/* Connection stays visible during your own turn — that is exactly
            when losing it matters most. */}
        <span className="player-rail__link">
          {mode === 'live' ? (
            <ConnectionStatus state={link} />
          ) : (
            <span className="eco-link">Demo</span>
          )}
        </span>
      </div>

      <Resource kind="credits" value={self.credits} />
      <Resource kind="influence" value={self.influence} />
    </header>
  );
};
