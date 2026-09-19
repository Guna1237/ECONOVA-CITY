import type { ReactElement, SVGProps } from 'react';

export type SeatShape = 'tower' | 'bridge' | 'market' | 'transit' | 'spire' | 'rotunda';
export const SEAT_SHAPES: readonly SeatShape[] = ['tower', 'bridge', 'market', 'transit', 'spire', 'rotunda'];

const CLASSIC_PAWN = 'M 16 2 a 5 5 0 1 0 0 10 a 5 5 0 0 0 0 -10 z m -4 11 h 8 v 2 h -8 z m 1 3 c 0 6 -4 12 -6 14 h 18 c -2 -2 -6 -8 -6 -14 z m -8 15 h 22 v 3 h -22 z';

const SHAPE_PATHS: Readonly<Record<SeatShape, string>> = {
  tower: CLASSIC_PAWN,
  bridge: CLASSIC_PAWN,
  market: CLASSIC_PAWN,
  transit: CLASSIC_PAWN,
  spire: CLASSIC_PAWN,
  rotunda: CLASSIC_PAWN
};

export interface SeatPieceProps extends SVGProps<SVGSVGElement> {
  readonly shape: SeatShape;
  readonly grounded?: boolean;
}

export const SeatPiece = ({ shape, grounded = true, ...props }: SeatPieceProps): ReactElement => (
  <svg viewBox="0 0 32 36"
    aria-hidden="true" focusable="false" overflow="hidden" data-grounded={grounded} {...props}>
    <path d={SHAPE_PATHS[shape]} fill="currentColor" />
    <path d={SHAPE_PATHS[shape]} fill="rgba(255,255,255,0.22)" clipPath="inset(0 50% 0 0)" />
    <path d={SHAPE_PATHS[shape]} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
);
