import type { CSSProperties, ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import type { LobbyProjectionDto } from '@econova/contracts';
import { SeatPiece, seatOf } from '@econova/ui';

/**
 * The room filling up. Entering the game should feel like taking a seat at a
 * table, so this shows the seats — taken and still empty — rather than a
 * spinner. The operator starts the game; nothing here can.
 */
export const Lobby = ({
  lobby,
  selfPlayerId
}: {
  readonly lobby: LobbyProjectionDto;
  readonly selfPlayerId: string;
}): ReactElement => {
  const order = lobby.players.map((player) => player.playerId);
  const empty = Math.max(0, GAME_CONFIG.minPlayers - lobby.players.length);

  return (
    <div className="lobby">
      <div className="lobby__panel">
        <div className="player-join__mark">
          Econova
          <span>City</span>
        </div>

        <div className="lobby__code">
          <span className="eco-label">Room</span>
          <b className="eco-num">{lobby.code}</b>
        </div>

        <div className="lobby__seats">
          {lobby.players.map((player) => {
            const seat = seatOf(player.playerId, order);
            return (
              <div
                key={player.playerId}
                className="lobby__seat"
                data-connected={player.connected}
                style={{ '--seat': seat.color } as CSSProperties}
              >
                <SeatPiece shape={seat.shape} className="lobby__seat-piece" />
                <span className="lobby__seat-name">
                  {player.name}
                  {player.playerId === selfPlayerId ? ' (you)' : ''}
                </span>
                {player.connected ? null : (
                  <span className="eco-label">away</span>
                )}
              </div>
            );
          })}

          {Array.from({ length: empty }, (_, index) => (
            <div key={`empty-${index}`} className="lobby__seat" data-empty="true">
              <span className="lobby__seat-piece" aria-hidden="true" />
              <span className="lobby__seat-name">Waiting for a player</span>
            </div>
          ))}
        </div>

        <p className="lobby__note">
          {lobby.players.length < GAME_CONFIG.minPlayers
            ? `${GAME_CONFIG.minPlayers} players are needed to start. ${lobby.players.length} seated.`
            : `${lobby.players.length} seated. The game begins when the operator starts it.`}
        </p>
      </div>
    </div>
  );
};
