/** Owner-supplied PNG pawns. Shape keys remain stable for existing consumers. */
import type { ReactElement, SVGProps } from 'react';
import { useId } from 'react';
import pawnSheet from '../assets/nova-pawn-sheet.png';

export type SeatShape = 'tower' | 'bridge' | 'market' | 'transit' | 'spire' | 'rotunda';
export const SEAT_SHAPES: readonly SeatShape[] = ['tower', 'bridge', 'market', 'transit', 'spire', 'rotunda'];
const PAWN_X = [33, 79, 124, 168, 213, 258] as const;

export interface SeatPieceProps extends SVGProps<SVGSVGElement> {
  readonly shape: SeatShape;
  readonly grounded?: boolean;
}

export const SeatPiece = ({ shape, grounded = true, ...props }: SeatPieceProps): ReactElement => {
  const clipId = useId();
  const x = PAWN_X[SEAT_SHAPES.indexOf(shape)] ?? 33;
  return <svg viewBox={`${x} 305 46 75`}
    aria-hidden="true" focusable="false" overflow="hidden" data-grounded={grounded} {...props}>
    <defs><clipPath id={clipId}><rect x={x} y="305" width="46" height="75" /></clipPath></defs>
    <image href={pawnSheet} width="724" height="1024" clipPath={`url(#${clipId})`} />
  </svg>;
};
