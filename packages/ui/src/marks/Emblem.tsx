/*
 * ECONOVA: CITY — the mark of the city itself.
 *
 * The emblem is the one piece of branding on the board, struck into the
 * centre plate like a seal. The skyline sits behind the centre composition as
 * printed scenery, not as decoration bolted on top.
 */

import type { ReactElement, SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

/**
 * A civic seal: four wedges for the four districts around a central tower.
 * The wedges are drawn in district order — food, tech, entertainment,
 * mobility — so the emblem encodes the city's structure rather than being
 * an arbitrary shape.
 */
export const CityEmblem = (props: Props): ReactElement => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
    <circle
      cx="32"
      cy="32"
      r="29"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      opacity="0.55"
    />
    <circle
      cx="32"
      cy="32"
      r="24.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
      opacity="0.35"
    />

    {/* Four district wedges. */}
    <g opacity="0.9">
      <path d="M32 32 12.6 12.6a27.5 27.5 0 0 1 19.4-8V32Z" fill="var(--district-food)" />
      <path d="M32 32V4.6a27.5 27.5 0 0 1 19.4 8L32 32Z" fill="var(--district-tech)" />
      <path
        d="M32 32h27.4a27.5 27.5 0 0 1-8 19.4L32 32Z"
        fill="var(--district-entertainment)"
      />
      <path
        d="M32 32 12.6 51.4a27.5 27.5 0 0 1-8-19.4H32Z"
        fill="var(--district-mobility)"
      />
    </g>

    {/* The tower at the centre of the seal. */}
    <path
      d="M32 16.5 41 25v22H23V25l9-8.5Z"
      fill="var(--board-plate, #1e262b)"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M28.5 47V37h7v10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M31.2 8.5h1.6V15h-1.6z" fill="currentColor" />
  </svg>
);

/**
 * The city itself, printed along the foot of the centre plate: shopfronts,
 * labs, venues and transit in their districts' colours. Pure scenery — it
 * carries no state and never re-renders against game data.
 */
export const CitySkyline = (props: Props): ReactElement => (
  <svg
    viewBox="0 0 240 48"
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <g opacity="0.5">
      {/* food — low shopfronts and market halls */}
      <g fill="var(--district-food)">
        <path d="M4 48V32h16v16zM10 26h4v6h-4z" />
        <path d="M24 48V22h14v26zM24 22l7-5 7 5z" />
        <path d="M44 48V34h10v14z" />
      </g>
      {/* tech — stepped towers */}
      <g fill="var(--district-tech)">
        <path d="M60 48V16h12v32zM64 16V9h4v7zM65 9h2V3h-2z" />
        <path d="M76 48V26h10v22z" />
        <path d="M90 48V20h11v28zM94 20v-5h3v5z" />
      </g>
      {/* entertainment — arched and domed venues */}
      <g fill="var(--district-entertainment)">
        <path d="M107 48V30a9 9 0 0 1 18 0v18z" />
        <path d="M129 48V28h13v20zM129 28a6.5 6.5 0 0 1 13 0z" />
        <path d="M146 48V34h9v14z" />
      </g>
      {/* mobility — platforms and viaducts */}
      <g fill="var(--district-mobility)">
        <path d="M159 48V38h20v10zM159 38v-4h20v4zM163 34v-5h12v5z" />
        <path d="M183 48V24h11v24zM186 24v-5h5v5z" />
        <path d="M198 48V36h14v12zM198 36l7-4 7 4z" />
      </g>
      {/* a last food block to close the run */}
      <g fill="var(--district-food)">
        <path d="M216 48V30h12v18zM220 24h4v6h-4z" />
        <path d="M232 48V36h6v12z" />
      </g>
    </g>
  </svg>
);
