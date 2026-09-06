/*
 * ECONOVA: CITY — the playing pieces.
 *
 * Six carved tokens, each a landmark of the city rather than a geometric
 * marker. They are drawn as objects standing on the board: a footprint
 * shadow, a body in the seat's paint, a lit left face, a shaded right face
 * and a seated outline. That four-part build is what makes them read as
 * physical at 20px and still at 60px.
 *
 * Silhouette is the primary identifier, colour the second and the seat
 * number the third, so a piece is never ambiguous.
 */

import type { ReactElement, SVGProps } from 'react';

export type SeatShape =
  | 'tower'
  | 'bridge'
  | 'market'
  | 'transit'
  | 'spire'
  | 'rotunda';

export const SEAT_SHAPES: readonly SeatShape[] = [
  'tower',
  'bridge',
  'market',
  'transit',
  'spire',
  'rotunda'
];

/**
 * Each token is a body outline plus the edge that catches the light.
 * Drawn on a 32×36 stage with the ground line at y=33.
 */
const TOKENS: Record<SeatShape, { readonly body: string; readonly lit: string }> = {
  // A stepped office tower — the financial district.
  tower: {
    body: 'M11 33V10h10v23zM13 10V6h6v4zM15.2 6V2.5h1.6V6z',
    lit: 'M11 33V10h4.4v23z'
  },
  // A single-span bridge — the crossing.
  bridge: {
    body: 'M3 33v-6h26v6zM6 27c0-8 5-13 10-13s10 5 10 13h-3.4c0-6.4-3.4-10-6.6-10s-6.6 3.6-6.6 10z',
    lit: 'M3 33v-6h9v6zM6 27c0-8 5-13 10-13v3.4c-3.2 0-6.6 3.6-6.6 10z'
  },
  // A market cart under an awning — the food trade.
  market: {
    body: 'M6 33v-12h20v12zM4 21l3-6h18l3 6zM10 33v-7h5v7z',
    lit: 'M6 33v-12h6v12zM4 21l3-6h5l-2.4 6z'
  },
  // A transit pylon carrying the line — movement.
  transit: {
    body: 'M13 33V9h6v24zM4 12h24v4H4zM7 9h18v3H7z',
    lit: 'M13 33V9h2.6v24zM4 12h24v1.6H4z'
  },
  // A tapered spire — the city's high point.
  spire: {
    body: 'M16 2 23 33H9zM6 33h20v2H6z',
    lit: 'M16 2v31H9z'
  },
  // A domed civic rotunda — the council.
  rotunda: {
    body: 'M7 33V18h18v15zM7 18a9 9 0 0 1 18 0zM15.2 5.5h1.6V9h-1.6zM13 33v-8h6v8z',
    lit: 'M7 33V18h5v15zM7 18a9 9 0 0 1 9-9v9z'
  }
};

export interface SeatPieceProps extends SVGProps<SVGSVGElement> {
  readonly shape: SeatShape;
  /** Draws the footprint shadow. Off for flat uses like a legend chip. */
  readonly grounded?: boolean;
}

export const SeatPiece = ({
  shape,
  grounded = true,
  ...props
}: SeatPieceProps): ReactElement => {
  const token = TOKENS[shape];
  return (
    <svg viewBox="0 0 32 36" aria-hidden="true" focusable="false" {...props}>
      {grounded ? (
        <ellipse cx="16" cy="33.6" rx="11" ry="2.2" fill="rgba(90,68,34,0.32)" />
      ) : null}

      {/* Body in the seat's paint. */}
      <path d={token.body} fill="currentColor" />
      {/* The face turned toward the light. */}
      <path d={token.lit} fill="rgba(255,255,255,0.34)" />
      {/* A seated outline so the token separates from the printed space. */}
      <path
        d={token.body}
        fill="none"
        stroke="rgba(0,0,0,0.42)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
};
