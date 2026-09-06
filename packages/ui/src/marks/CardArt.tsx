/*
 * ECONOVA: CITY — strategy card artwork.
 *
 * One illustration per canonical strategy card (SC01–SC12), drawn in the same
 * printed language as the property motifs: a 32×24 stage, 1.5 stroke, flat
 * weight. Each picture describes the card's canonical effect — nothing here
 * invents a mechanic.
 */

import type { ReactElement, SVGProps } from 'react';

type ArtProps = SVGProps<SVGSVGElement>;

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const solid = { fill: 'currentColor', stroke: 'none' };

const Stage = ({ children, ...props }: ArtProps): ReactElement => (
  <svg viewBox="0 0 32 24" aria-hidden="true" focusable="false" {...props}>
    {children}
  </svg>
);

/** SC01 Rush Hour — the next roll is 6. Speed lines behind a six-pip face. */
const RushHour = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M2 7h7M2 12h5M2 17h7" />
    <path {...line} d="M13 4h16v16H13z" />
    <g {...solid}>
      <circle cx="17.5" cy="8" r="1.3" />
      <circle cx="17.5" cy="12" r="1.3" />
      <circle cx="17.5" cy="16" r="1.3" />
      <circle cx="24.5" cy="8" r="1.3" />
      <circle cx="24.5" cy="12" r="1.3" />
      <circle cx="24.5" cy="16" r="1.3" />
    </g>
  </Stage>
);

/** SC02 Market Boom — a district's demand set to +2. */
const MarketBoom = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 20h24" />
    <path {...solid} d="M7 20v-5h4v5zM14 20v-9h4v9zM21 20v-13h4v13z" />
    <path {...line} d="M22 4h6v6" />
    <path {...line} d="M28 4l-8 8" />
  </Stage>
);

/** SC03 Market Crash — a district's demand set to -2. */
const MarketCrash = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 20h24" />
    <path {...solid} d="M7 20v-13h4v13zM14 20v-9h4v9zM21 20v-5h4v5z" />
    <path {...line} d="M28 16v-6h-6" />
    <path {...line} d="M22 10l6 6" />
  </Stage>
);

/** SC04 Flash Sale — the next purchase costs less. */
const FlashSale = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M17 3h10v10L15 25 5 15 17 3Z" />
    <circle {...solid} cx="22.5" cy="7.5" r="1.6" />
    <path {...line} d="M10 14l6 6" />
  </Stage>
);

/** SC05 Quick Build — develop one property for free. */
const QuickBuild = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M6 21V6h2v15" />
    <path {...line} d="M7 6h16M20 6v5" />
    <path {...line} d="M15 21v-6h11v6z" />
    <path {...line} d="M20 11v4" />
  </Stage>
);

/** SC06 Tax Refund — gain credits. */
const TaxRefund = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <circle {...line} cx="13" cy="12" r="7" />
    <path {...line} d="M15.5 9.6A3.4 3.4 0 0 0 13 8.6a3.4 3.4 0 0 0 0 6.8 3.4 3.4 0 0 0 2.5-1" />
    <path {...line} d="M10.5 12h3.5" />
    <path {...line} d="M23 8a7 7 0 0 1 0 8" />
    <path {...line} d="M27 5a11 11 0 0 1 0 14" />
  </Stage>
);

/** SC07 City Connections — gain credits and influence. */
const CityConnections = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M9 9l7 3 7-3M9 9v6l7 3 7-3V9" />
    <circle {...solid} cx="9" cy="9" r="2.2" />
    <circle {...solid} cx="23" cy="9" r="2.2" />
    <circle {...solid} cx="16" cy="18.5" r="2.2" />
    <circle {...line} cx="16" cy="5" r="2.4" />
  </Stage>
);

/** SC08 Urban Renewal — one property earns double income this round. */
const UrbanRenewal = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M10 21V9l6-4 6 4v12" />
    <path {...line} d="M13 21v-5h6v5" />
    <path {...line} d="M5 12a6 6 0 0 1 5-5" />
    <path {...line} d="M5 8v4h4" />
    <path {...line} d="M27 12a6 6 0 0 1-5 5" />
    <path {...line} d="M27 16v-4h-4" />
  </Stage>
);

/** SC09 Lobbying Power — gain influence. */
const LobbyingPower = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M11 21h10M16 21v-6" />
    <path {...line} d="M9 6h14l-2 6a5 5 0 0 1-10 0z" />
    <path {...line} d="M13 3h6" />
    <circle {...solid} cx="16" cy="10" r="1.6" />
  </Stage>
);

/** SC10 Toll Booth — the next landing fee this round is doubled. */
const TollBooth = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M6 21V11h7v10z" />
    <path {...line} d="M6 11l3.5-4L13 11" />
    <path {...line} d="M15 13h13" />
    <path {...solid} d="M16 12h3v2h-3zM22 12h3v2h-3z" />
    <path {...line} d="M28 10v6" />
  </Stage>
);

/** SC11 Shortcut — move backward by the unmodified roll. */
const Shortcut = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M26 19h-9a6 6 0 0 1 0-12h7" />
    <path {...line} d="M11 3L6 7l5 4" />
    <circle {...solid} cx="26" cy="19" r="2.2" />
  </Stage>
);

/** SC12 Insurance Policy — the landing fee becomes zero. */
const InsurancePolicy = (props: ArtProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M16 3l9 3.5V13c0 5-3.7 8.6-9 10-5.3-1.4-9-5-9-10V6.5L16 3Z" />
    <path {...line} d="M12.5 12.5l2.6 2.6 5-5" />
  </Stage>
);

const CARD_ART: Readonly<Record<string, (props: ArtProps) => ReactElement>> = {
  SC01: RushHour,
  SC02: MarketBoom,
  SC03: MarketCrash,
  SC04: FlashSale,
  SC05: QuickBuild,
  SC06: TaxRefund,
  SC07: CityConnections,
  SC08: UrbanRenewal,
  SC09: LobbyingPower,
  SC10: TollBooth,
  SC11: Shortcut,
  SC12: InsurancePolicy
};

export const StrategyCardArt = ({
  cardId,
  ...props
}: ArtProps & { cardId: string }): ReactElement | null => {
  const Art = CARD_ART[cardId];
  return Art === undefined ? null : <Art {...props} />;
};
