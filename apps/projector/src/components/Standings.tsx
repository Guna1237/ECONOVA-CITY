import type { CSSProperties, ReactElement } from 'react';

import { PROPERTY_BY_ID } from '@econova/game-content';
import type { PublicProjectionDto } from '@econova/contracts';
import { DISTRICTS, SeatPiece, seatOf } from '@econova/ui';

/**
 * Public standing only: who is at the table, where they are, and what they
 * hold. Credits, influence, cards and objectives are private and never
 * reach this client.
 */
export const Standings = ({ state }: { readonly state: PublicProjectionDto }): ReactElement => (
  <div style={{ display: 'grid', gap: 'var(--s2)' }}>
    {state.turnOrder.map((playerId) => {
      const player = state.players.find((entry) => entry.playerId === playerId);
      if (player === undefined) return null;
      const seat = seatOf(playerId, state.turnOrder);
      const current = state.turn?.playerId === playerId;

      return (
        <div
          key={playerId}
          className="cast-standing"
          data-current={current}
          data-connected={player.connected}
          style={{ '--seat': seat.color } as CSSProperties}
        >
          <SeatPiece shape={seat.shape} className="cast-standing__piece" />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cast-standing__name">{player.name}</div>
            <div className="cast-standing__holdings" aria-hidden="true">
              {player.propertyIds.map((propertyId) => {
                const definition = PROPERTY_BY_ID.get(propertyId);
                if (definition === undefined) return null;
                return (
                  <span
                    key={propertyId}
                    className="cast-standing__pip"
                    style={DISTRICTS[definition.district].vars as CSSProperties}
                    title={definition.name}
                  />
                );
              })}
              {player.propertyIds.length === 0 ? (
                <span className="eco-label">No holdings</span>
              ) : null}
            </div>
          </div>

          <div className="cast-standing__count">{player.propertyIds.length}</div>
        </div>
      );
    })}
  </div>
);
