import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import {
  BOARD_SPACES,
  type BoardSpace as BoardSpaceContent
} from '@econova/game-content';
import type { PublicProjectionDto } from '@econova/contracts';

import { BoardSpace } from './BoardSpace.js';
import { CityCentre } from './CityCentre.js';
import { PlayerPiece } from './PlayerPiece.js';
import { EconovaCrest } from '../marks/Crest.js';
import { usePieceTravel } from './usePieceTravel.js';
import { seatOf } from '../theme.js';

export interface GameBoardProps {
  /**
   * Public projection only. This component must never be handed private
   * player state — it renders what everyone in the room may see.
   */
  readonly state: PublicProjectionDto;
  readonly selectedPropertyId?: string | null;
  readonly onSelectSpace?: (space: BoardSpaceContent) => void;
  /** Plays the board-reveal once when the game opens. */
  readonly reveal?: boolean;
}

/**
 * The shared board. Player and projector render the same object from the
 * same public data. How dense the print is follows the board's own width,
 * so no caller has to decide whether it is on a phone or a projector.
 */
export const GameBoard = ({
  state,
  selectedPropertyId = null,
  onSelectSpace,
  reveal = false
}: GameBoardProps): ReactElement => {
  const ownership = new Map(
    state.properties.map((property) => [
      property.propertyId as string,
      property
    ])
  );

  const currentPlayerId = state.turn?.playerId ?? null;

  /* A roll is presented as a tumble only when a new value arrives from the
     server. The die never spins speculatively. */
  const [rolling, setRolling] = useState(false);
  const lastRoll = useRef<number | null>(state.turn?.roll ?? null);
  const roll = state.turn?.roll ?? null;

  useEffect(() => {
    if (roll === lastRoll.current) return;
    lastRoll.current = roll;
    if (roll === null) return;
    setRolling(true);
    const timer = window.setTimeout(() => setRolling(false), 480);
    return () => window.clearTimeout(timer);
  }, [roll]);

  /* Pieces travel across the board rather than jumping to the new space. */
  const board = useRef<HTMLDivElement>(null);
  usePieceTravel(board, state.players);

  return (
    <div className="eco-board" data-reveal={reveal} ref={board}>
      <div className="eco-board__grid">
        <CityCentre state={state} rolling={rolling} />

        {BOARD_SPACES.map((space) => {
          const record =
            space.type === 'property' ? ownership.get(space.propertyId) : undefined;
          const ownerId = record?.ownerId ?? null;

          return (
            <BoardSpace
              key={space.position}
              space={space}
              ownerSeat={ownerId === null ? null : seatOf(ownerId, state.turnOrder)}
              developmentLevel={record?.developmentLevel ?? 0}
              selected={
                space.type === 'property' && space.propertyId === selectedPropertyId
              }
              onSelect={onSelectSpace}
            >
              {state.players
                .filter((player) => player.position === space.position)
                .map((player) => (
                  <PlayerPiece
                    key={player.playerId}
                    seat={seatOf(player.playerId, state.turnOrder)}
                    name={player.name}
                    active={player.playerId === currentPlayerId}
                    playerId={player.playerId}
                    connected={player.connected}
                  />
                ))}
            </BoardSpace>
          );
        })}
      </div>

      {/* The club's mark on the rim: this is an Econova game. */}
      <EconovaCrest className="eco-board__publisher" size={26} />
    </div>
  );
};
