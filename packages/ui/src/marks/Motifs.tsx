/*
 * ECONOVA: CITY — property motifs.
 *
 * One printed illustration per canonical property, drawn as if screen-printed
 * onto the board: a 32×24 stage, a 1.5 stroke, flat weight, no gradients and
 * no perspective. They are keyed by canonical property id, so a motif can
 * never attach itself to a property that does not exist.
 *
 * The drawing language is shared on purpose — these read as one manufactured
 * set, not as sixteen unrelated icons.
 */

import type { ReactElement, SVGProps } from 'react';

type MotifProps = SVGProps<SVGSVGElement>;

/* A soft tint inside every closed shape gives the illustrations body without
   needing a second colour per drawing. Open paths are unaffected visually. */
const line = {
  fill: 'color-mix(in srgb, currentColor 15%, transparent)',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const solid = { fill: 'currentColor', stroke: 'none' };

const Stage = ({ children, ...props }: MotifProps): ReactElement => (
  <svg viewBox="0 0 32 24" aria-hidden="true" focusable="false" {...props}>
    {children}
  </svg>
);

/* ---- FOOD — organic curves, market and dining ------------------- */

/** Street Bites: a street-food stall under a scalloped awning. */
const StreetBites = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M6 10h20v11H6z" />
    <path {...line} d="M4 10c1.4 0 1.4-2 2.8-2s1.4 2 2.8 2 1.4-2 2.8-2 1.4 2 2.8 2 1.4-2 2.8-2 1.4 2 2.8 2 1.4-2 2.8-2 1.4 2 2.8 2" />
    <path {...line} d="M11 21v-6h5v6" />
    <path {...line} d="M20 14h3M20 17h3" />
  </Stage>
);

/** Harvest Table: a long table set with produce. */
const HarvestTable = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 15h24M7 15v6M25 15v6" />
    <circle {...line} cx="12" cy="11" r="3" />
    <path {...line} d="M12 8V6" />
    <path {...line} d="M18 14c0-3 1.6-5 4-5 0 3-1.7 5-4 5Z" />
    <path {...line} d="M22 4v5" />
  </Stage>
);

/** FreshFusion: a bowl with rising steam. */
const FreshFusion = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M7 13h18c0 5-4 8-9 8s-9-3-9-8Z" />
    <path {...line} d="M5 21h22" />
    <path {...line} d="M13 9c0-1.6 1.6-1.9 1.6-3.4M18 9c0-1.6 1.6-1.9 1.6-3.4" />
  </Stage>
);

/** Epicurean Tower: fine dining stacked into a tower under a cloche. */
const EpicureanTower = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M9 21V9l7-6 7 6v12" />
    <path {...line} d="M13 21v-5h6v5" />
    <path {...line} d="M13 12h6" />
    <path {...solid} d="M15.2 5.6h1.6v2h-1.6z" />
  </Stage>
);

/* ---- TECH — geometric precision, circuitry and data ------------- */

/** CloudNine Labs: a flask inside a cloud. */
const CloudNineLabs = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M9 12a4 4 0 0 1 7.6-1.7A3.4 3.4 0 0 1 22 13" />
    <path {...line} d="M14 8v5l-4 8h12l-4-8V8z" />
    <path {...line} d="M13 6h6" />
    <circle {...solid} cx="16" cy="18" r="1.1" />
  </Stage>
);

/** DataForge: a server stack struck into shape. */
const DataForge = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M8 5h16v5H8zM8 12h16v5H8z" />
    <path {...line} d="M11 19h10l2 2H9z" />
    <circle {...solid} cx="11.5" cy="7.5" r="1" />
    <circle {...solid} cx="11.5" cy="14.5" r="1" />
    <path {...line} d="M15 7.5h6M15 14.5h6" />
  </Stage>
);

/** Quantum Dynamics: a nucleus on crossed orbits. */
const QuantumDynamics = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <ellipse {...line} cx="16" cy="12" rx="11" ry="4.5" />
    <ellipse {...line} cx="16" cy="12" rx="11" ry="4.5" transform="rotate(60 16 12)" />
    <ellipse {...line} cx="16" cy="12" rx="11" ry="4.5" transform="rotate(-60 16 12)" />
    <circle {...solid} cx="16" cy="12" r="2.2" />
  </Stage>
);

/** NexGen AI: a connected node cluster. */
const NexGenAI = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M16 6v5M16 13v5M10 9l4.5 2.4M22 9l-4.5 2.4M10 16l4.5-2.6M22 16l-4.5-2.6" />
    <circle {...solid} cx="16" cy="4.6" r="2" />
    <circle {...solid} cx="8.4" cy="8.2" r="2" />
    <circle {...solid} cx="23.6" cy="8.2" r="2" />
    <circle {...solid} cx="8.4" cy="17" r="2" />
    <circle {...solid} cx="23.6" cy="17" r="2" />
    <circle {...line} cx="16" cy="12.2" r="2.6" />
  </Stage>
);

/* ---- ENTERTAINMENT — stage geometry and spotlights -------------- */

/** Neon Arena: a bowl seen head-on. */
const NeonArena = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 20c0-6.6 5.4-12 12-12s12 5.4 12 12" />
    <path {...line} d="M9 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    <path {...line} d="M2 20h28" />
    <path {...solid} d="M15.2 3h1.6v3.4h-1.6z" />
  </Stage>
);

/** Pixel Palace: an arcade screen. */
const PixelPalace = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M5 4h22v14H5z" />
    <path {...line} d="M12 21h8M16 18v3" />
    <path {...solid} d="M10 9h3v3h-3zM14.5 12h3v3h-3zM19 7h3v3h-3z" />
  </Stage>
);

/** The Grand Stage: a proscenium with drawn curtains. */
const GrandStage = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 4h24v3H4z" />
    <path {...line} d="M7 7c0 6 2 9 2 13H5V7M25 7c0 6-2 9-2 13h4V7" />
    <path {...line} d="M11 20h10" />
    <path {...line} d="M16 9v7M13 12h6" />
  </Stage>
);

/** Cyber Coliseum: tiered arches. */
const CyberColiseum = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M5 21V9a11 11 0 0 1 22 0v12" />
    <path {...line} d="M5 15h22M3 21h26" />
    <path {...line} d="M11 15v-3a2 2 0 0 1 4 0v3M17 15v-3a2 2 0 0 1 4 0v3" />
    <path {...line} d="M11 21v-3a2 2 0 0 1 4 0v3M17 21v-3a2 2 0 0 1 4 0v3" />
  </Stage>
);

/* ---- MOBILITY — directional lines and infrastructure ------------ */

/** Metro Link: a station entrance over the line. */
const MetroLink = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M6 20V11a10 10 0 0 1 20 0v9" />
    <path {...line} d="M11 20v-6h10v6" />
    <path {...line} d="M3 20h26" />
    <path {...solid} d="M14.4 5.4h3.2v2h-3.2z" />
  </Stage>
);

/** Velocity Motors: a car in profile. */
const VelocityMotors = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 16v-2l3-1 3-4h11l3 4 4 1v2" />
    <path {...line} d="M10 9h11" />
    <circle {...line} cx="10" cy="17" r="2.6" />
    <circle {...line} cx="23" cy="17" r="2.6" />
    <path {...line} d="M12.6 17h7.8" />
  </Stage>
);

/** SkyRail Transit: an elevated line on pylons. */
const SkyRailTransit = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M4 9h24v6H4z" />
    <path {...line} d="M8 15v6M24 15v6M4 21h24" />
    <path {...line} d="M9 12h4M19 12h4" />
    <path {...solid} d="M15 11h2v2h-2z" />
  </Stage>
);

/** AutoPilot HQ: a vehicle reading the road ahead. */
const AutoPilotHQ = (props: MotifProps): ReactElement => (
  <Stage {...props}>
    <path {...line} d="M6 18v-2l2.5-1 2.5-4h8l2.5 4 2.5 1v2" />
    <circle {...line} cx="11" cy="19" r="2.2" />
    <circle {...line} cx="21" cy="19" r="2.2" />
    <path {...line} d="M16 9V4" />
    <path {...line} d="M11 5.5a7 7 0 0 1 10 0" />
    <circle {...solid} cx="16" cy="3.2" r="1.4" />
  </Stage>
);

/* ---------------------------------------------------------------- */

const MOTIFS: Readonly<Record<string, (props: MotifProps) => ReactElement>> = {
  P01: StreetBites,
  P02: CloudNineLabs,
  P03: NeonArena,
  P04: MetroLink,
  P05: HarvestTable,
  P06: DataForge,
  P07: VelocityMotors,
  P08: PixelPalace,
  P09: QuantumDynamics,
  P10: FreshFusion,
  P11: SkyRailTransit,
  P12: GrandStage,
  P13: CyberColiseum,
  P14: NexGenAI,
  P15: EpicureanTower,
  P16: AutoPilotHQ
};

/** Renders nothing for an unknown id rather than guessing an illustration. */
export const PropertyMotif = ({
  propertyId,
  ...props
}: MotifProps & { propertyId: string }): ReactElement | null => {
  const Motif = MOTIFS[propertyId];
  return Motif === undefined ? null : <Motif {...props} />;
};

export const hasMotif = (propertyId: string): boolean => propertyId in MOTIFS;
