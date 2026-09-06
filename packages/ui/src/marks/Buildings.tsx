/*
 * ECONOVA: CITY — development.
 *
 * Development is a skyline growing on the space, not a number. Each district
 * builds in its own architectural language, and each level adds a structure
 * rather than replacing one, so a level-3 property reads as visibly bigger
 * than a level-1 property from across a room.
 *
 * Drawn as flat silhouettes filled with the owner's colour, with a lit top
 * edge and a contact shadow, so they sit on the printed space like miniatures.
 */

import type { ReactElement, SVGProps } from 'react';

import type { DistrictId } from '@econova/game-content';

export type DevelopmentLevel = 0 | 1 | 2 | 3;

/**
 * Structures per district, ordered small → landmark. A level renders the
 * first N of them, so growth is additive.
 *
 * Coordinates share a 48×24 stage with the ground line at y=22.
 */
const ARCHITECTURE: Readonly<Record<DistrictId, readonly string[]>> = {
  // Shopfronts and market halls: low, wide, awninged.
  food: [
    'M3 22v-6h9v6z M3 16l4.5-3 4.5 3z',
    'M14 22v-9h10v9z M14 13h10v-2H14z',
    'M26 22V8h12v14z M26 8h12l-6-4z M29 22v-5h6v5z'
  ],
  // Labs and research towers: precise, stepped, antenna-topped.
  tech: [
    'M3 22v-7h8v7z M6 15v-2h2v2z',
    'M13 22V10h9v12z M15 10V7h5v3z',
    'M24 22V5h10v17z M27 5V1h4v4z M29 1h-1v-3h1z'
  ],
  // Venues: arched, marquee-lit, domed.
  entertainment: [
    'M3 22v-6a4.5 4.5 0 0 1 9 0v6z',
    'M14 22v-8h11v8z M14 14a5.5 5.5 0 0 1 11 0z',
    'M27 22V9h12v13z M27 9a6 6 0 0 1 12 0z M31 22v-6h4v6z'
  ],
  // Transit: platforms, canopies, viaducts.
  mobility: [
    'M3 22v-5h10v5z M3 17h10v-2l-5-2-5 2z',
    'M15 22v-4h11v4z M15 18v-7h11v7z M17 11V8h7v3z',
    'M28 22v-3h12v3z M28 19V6h12v13z M31 6V2h6v4z'
  ]
};

export interface DevelopmentProps extends SVGProps<SVGSVGElement> {
  readonly district: DistrictId;
  readonly level: DevelopmentLevel;
  /** Level 3 is finished construction and earns a brass roofline. */
  readonly landmark?: boolean;
}

export const Development = ({
  district,
  level,
  landmark = true,
  ...props
}: DevelopmentProps): ReactElement | null => {
  if (level === 0) return null;
  const structures = ARCHITECTURE[district].slice(0, level);
  const centring = level === 1 ? 17 : level === 2 ? 9 : 3;

  return (
    <svg
      viewBox="0 0 48 24"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
      {...props}
    >
      <g transform={`translate(${centring} 0)`}>
      {/* Contact shadow: the miniatures are standing on the print. */}
      <ellipse
        cx={level === 1 ? 7.5 : level === 2 ? 14 : 21}
        cy="22.7"
        rx={level === 1 ? 7 : level === 2 ? 13 : 20}
        ry="1.5"
        fill="rgba(90,68,34,0.3)"
      />

      {structures.map((path, index) => (
        <g key={index}>
          {/* A cast shadow to one side, then the body, then a lit face and a
              seated outline — enough to read as a solid object. */}
          <path d={path} fill="rgba(90,68,34,0.22)" transform="translate(1.2 0.4)" />
          <path d={path} fill="currentColor" />
          <path
            d={path}
            fill="rgba(255,255,255,0.34)"
            transform="translate(-0.5 -0.5)"
            clipPath="inset(0 55% 0 0)"
          />
          <path d={path} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.6" />
        </g>
      ))}

      {level === 3 && landmark ? (
        <path
          d={structures[2]}
          fill="none"
          stroke="var(--brass-lit, #7a4f10)"
          strokeWidth="1.1"
        />
      ) : null}
      </g>
    </svg>
  );
};
