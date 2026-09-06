import type { CSSProperties, ReactElement } from 'react';

import { SeatPiece } from '../marks/Pieces.js';
import type { SeatTheme } from '../theme.js';

export interface PlayerPieceProps {
  readonly seat: SeatTheme;
  readonly name: string;
  /** Identifies the piece to the travel animation across re-parenting. */
  readonly playerId: string;
  /** Whose turn it is — the active piece is lifted and lit. */
  readonly active?: boolean;
  readonly connected?: boolean;
  readonly style?: CSSProperties;
}

/**
 * A physical playing piece. It sits on a board space, casts a shadow onto
 * the print, and carries three independent identifiers — colour, silhouette
 * and seat number — so it is never ambiguous.
 */
export const PlayerPiece = ({
  seat,
  name,
  playerId,
  active = false,
  connected = true,
  style
}: PlayerPieceProps): ReactElement => (
  <span
    className="eco-piece"
    data-piece={playerId}
    data-active={active}
    data-connected={connected}
    style={{ '--seat': seat.color, ...style } as CSSProperties}
    title={connected ? name : `${name} — disconnected`}
  >
    <SeatPiece shape={seat.shape} />
    <span className="eco-visually-hidden">
      {name}
      {active ? ' — current turn' : ''}
      {connected ? '' : ' — disconnected'}
    </span>
  </span>
);
