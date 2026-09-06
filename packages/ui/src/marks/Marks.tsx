/*
 * ECONOVA: CITY — the icon set.
 *
 * One family, drawn on a 24-unit grid with a 2-unit stroke. These are the
 * only symbols in the product: no icon library, no emoji, no mixed styles.
 * Each mark exists because a game concept needs a non-text identifier.
 */

import type { ReactElement, SVGProps } from 'react';

import type { DistrictMarkId } from '../theme.js';

type MarkProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'color-mix(in srgb, currentColor 16%, transparent)',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const Svg = ({ children, ...props }: MarkProps): ReactElement => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    {children}
  </svg>
);

/* ---- districts ------------------------------------------------- */

/** Food: cultivation feeding the city. */
export const SproutMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M12 21V10" />
    <path {...stroke} d="M12 12c0-3.3 2.6-6 6-6 0 3.3-2.7 6-6 6Z" />
    <path {...stroke} d="M12 15c-3.3 0-6-2.4-6-5.4 3.3 0 6 2.4 6 5.4Z" />
  </Svg>
);

/** Tech: connected systems. */
export const NodeMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <circle {...stroke} cx="12" cy="12" r="2.6" />
    <path {...stroke} d="M12 3v6.4M12 14.6V21M3 12h6.4M14.6 12H21" />
  </Svg>
);

/** Entertainment: the venue arch. */
export const MarqueeMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M4 20V11a8 8 0 0 1 16 0v9" />
    <path {...stroke} d="M4 20h16M9 20v-5a3 3 0 0 1 6 0v5" />
  </Svg>
);

/** Mobility: a route through the city. */
export const RouteMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M6 21V8a4 4 0 0 1 8 0v8a4 4 0 0 0 4 4" />
    <circle {...stroke} cx="6" cy="4" r="2" />
    <circle {...stroke} cx="18" cy="21" r="2" fill="currentColor" />
  </Svg>
);

const DISTRICT_MARKS: Record<DistrictMarkId, (props: MarkProps) => ReactElement> = {
  sprout: SproutMark,
  node: NodeMark,
  marquee: MarqueeMark,
  route: RouteMark
};

export const DistrictMark = ({
  mark,
  ...props
}: MarkProps & { mark: DistrictMarkId }): ReactElement => {
  const Component = DISTRICT_MARKS[mark];
  return <Component {...props} />;
};

/* ---- special spaces -------------------------------------------- */

/** City Center: the civic core all routes return to. */
export const CityCenterMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M12 3 4 8v13h16V8l-8-5Z" />
    <path {...stroke} d="M9 21v-6h6v6" />
  </Svg>
);

/** Innovation Hub. */
export const InnovationMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M9 18h6M10 21h4" />
    <path {...stroke} d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.2h6c0-.4.2-.9.6-1.2A6 6 0 0 0 12 3Z" />
  </Svg>
);

/** Market Square. */
export const MarketMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M4 9h16l-1.5-4h-13L4 9Z" />
    <path {...stroke} d="M5.5 9v11h13V9" />
    <path {...stroke} d="M10 20v-6h4v6" />
  </Svg>
);

/** Observatory. */
export const ObservatoryMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M3 20h18" />
    <path {...stroke} d="M5 20a7 7 0 0 1 14 0" />
    <path {...stroke} d="m16 4-9 5 1.6 3L18 7l-2-3Z" />
  </Svg>
);

export const SPECIAL_MARKS: Record<string, (props: MarkProps) => ReactElement> = {
  city_center: CityCenterMark,
  innovation_hub: InnovationMark,
  market_square: MarketMark,
  observatory: ObservatoryMark
};

/* ---- resources -------------------------------------------------- */

/** Credits: the city treasury. */
export const CreditsMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <circle {...stroke} cx="12" cy="12" r="8.5" />
    <path {...stroke} d="M15 9.2A4 4 0 0 0 12 8a4 4 0 0 0 0 8 4 4 0 0 0 3-1.2" />
    <path {...stroke} d="M7.5 12h4" />
  </Svg>
);

/** Influence: leverage in the council chamber. */
export const InfluenceMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M12 3 5 6.2V11c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6.2L12 3Z" />
    <path {...stroke} d="M9.2 12.3 11.3 14.5 15 10.5" />
  </Svg>
);

/* ---- game objects ----------------------------------------------- */

export const PropertyMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M4 21V9l6-4 6 4v12" />
    <path {...stroke} d="M16 21V12h4v9M3 21h18" />
  </Svg>
);

export const CardMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <rect {...stroke} x="4" y="3" width="12" height="17" rx="2" />
    <path {...stroke} d="M18.5 6.5 20 7.2v11a2 2 0 0 1-1.2 1.8l-4.6 1.9" />
  </Svg>
);

export const ObjectiveMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <circle {...stroke} cx="12" cy="12" r="8.5" />
    <circle {...stroke} cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
  </Svg>
);

export const BoardMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <rect {...stroke} x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path {...stroke} d="M8.5 3.5v17M3.5 8.5h17" />
  </Svg>
);

export const TradeMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M4 8h13l-3-3M20 16H7l3 3" />
  </Svg>
);

export const CloseMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const AlertMark = (props: MarkProps): ReactElement => (
  <Svg {...props}>
    <path {...stroke} d="M12 4 2.5 20h19L12 4Z" />
    <path {...stroke} d="M12 10v4.5" />
    <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
  </Svg>
);
