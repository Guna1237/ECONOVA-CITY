import type { CSSProperties, ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import {
  ConnectionStatus,
  PHASE_LABEL,
  Resource,
  STAGE_LABEL,
  Timer,
  seatOf
} from '@econova/ui';

import { usePlayerSession } from '../state/PlayerSession.js';

/**
 * Always on screen, always answering the same two questions in the same
 * place: what do I have, and what is happening right now.
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

  return (
    <header className="player-rail">
      <div className="player-rail__meta">
        <div className="player-rail__turn">
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

        <span className="eco-label" style={{ whiteSpace: 'nowrap' }}>
          Round {view.round}/{GAME_CONFIG.rounds}
          {view.turn !== null && view.phase === 'player_turn'
            ? ` · ${STAGE_LABEL[view.turn.stage] ?? ''}`
            : ''}
        </span>

        {view.turn?.deadlineAt != null && isMe ? (
          <Timer
            deadlineAt={view.turn.deadlineAt}
            windowSeconds={GAME_CONFIG.turnTimerSeconds}
          />
        ) : mode === 'live' ? (
          <ConnectionStatus state={link} />
        ) : (
          <span className="eco-link">Demo</span>
        )}
      </div>

      <Resource kind="credits" value={self.credits} />
      <Resource kind="influence" value={self.influence} />
    </header>
  );
};
