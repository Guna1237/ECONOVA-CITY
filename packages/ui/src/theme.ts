/*
 * ECONOVA: CITY — the single place where game concepts are given a visual
 * identity. Components never invent a colour; they read from here, and here
 * only ever points at a design token.
 */

import type { DistrictId } from '@econova/game-content';

/* -----------------------------------------------------------------
 * Districts — the four canonical economic districts.
 * `mark` is a non-colour identifier, required for accessibility.
 * -------------------------------------------------------------- */

export type DistrictMarkId = 'sprout' | 'node' | 'marquee' | 'route';

export interface DistrictTheme {
  readonly id: DistrictId;
  readonly label: string;
  readonly mark: DistrictMarkId;
  /** Inline custom properties consumed by district-aware CSS. */
  readonly vars: Readonly<Record<string, string>>;
}

const districtTheme = (
  id: DistrictId,
  label: string,
  mark: DistrictMarkId
): DistrictTheme => ({
  id,
  label,
  mark,
  vars: {
    '--district': `var(--district-${id})`,
    '--district-lit': `var(--district-${id}-lit)`,
    '--district-deep': `var(--district-${id}-deep)`
  }
});

export const DISTRICTS: Readonly<Record<DistrictId, DistrictTheme>> = Object.freeze({
  food: districtTheme('food', 'Food', 'sprout'),
  tech: districtTheme('tech', 'Tech', 'node'),
  entertainment: districtTheme('entertainment', 'Entertainment', 'marquee'),
  mobility: districtTheme('mobility', 'Mobility', 'route')
});

export const DISTRICT_ORDER: readonly DistrictId[] = Object.freeze([
  'food',
  'tech',
  'entertainment',
  'mobility'
]);

/* -----------------------------------------------------------------
 * Seats — ownership. A seat is colour + silhouette + number, so two
 * players are never told apart by hue alone.
 * -------------------------------------------------------------- */

import { SEAT_SHAPES, type SeatShape } from './marks/Pieces.js';

export type { SeatShape };

export interface SeatTheme {
  readonly index: number;
  readonly shape: SeatShape;
  readonly color: string;
}

export const SEAT_COUNT = 6;

/**
 * Seats are assigned by turn order, so every surface — board, roster,
 * projector, admin — agrees on which colour belongs to which player.
 */
export const seatOf = (
  playerId: string,
  turnOrder: readonly string[]
): SeatTheme => {
  const found = turnOrder.indexOf(playerId);
  const index = found === -1 ? 0 : found % SEAT_COUNT;
  return {
    index,
    shape: SEAT_SHAPES[index] as SeatShape,
    color: `var(--seat-${index + 1})`
  };
};

export const seatVars = (seat: SeatTheme | null): Record<string, string> =>
  seat === null ? {} : { '--seat': seat.color, '--owner': seat.color };

/* -----------------------------------------------------------------
 * Language — one vocabulary for game state, shared by every client.
 * These strings mirror the canonical contract enums exactly.
 * -------------------------------------------------------------- */

export const PHASE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  objective_selection: 'Choosing objectives',
  ready: 'Ready',
  breaking_news: 'Breaking news',
  strategy_draw: 'Strategy draw',
  council: 'City council',
  player_turn: 'Player turn',
  round_resolution: 'Round resolution',
  paused: 'Paused',
  completed: 'Final results'
});

export const STAGE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  awaiting_roll: 'Rolling',
  awaiting_shortcut_choice: 'Shortcut',
  awaiting_property_decision: 'Property decision',
  auction: 'Auction',
  landing_fee_reaction: 'Landing fee',
  emergency_sale: 'Emergency sale',
  awaiting_event_choice: 'Event choice',
  awaiting_card_discard: 'Discard',
  action_phase: 'Actions'
});

export const TIER_LABEL: Readonly<Record<string, string>> = Object.freeze({
  cheap: 'Standard',
  mid: 'Prime',
  premium: 'Premium'
});

export const CARD_TIMING_LABEL: Readonly<Record<string, string>> = Object.freeze({
  before_roll: 'Before roll',
  before_buy: 'Before buy',
  action_phase: 'Action',
  after_roll_before_move: 'After roll',
  landing_fee_reaction: 'Reaction'
});

/* -----------------------------------------------------------------
 * Formatting — gameplay numbers must read identically everywhere.
 * -------------------------------------------------------------- */

const creditFormatter = new Intl.NumberFormat('en-US');

export const formatCredits = (value: number): string => creditFormatter.format(value);

export const formatSigned = (value: number): string =>
  value > 0 ? `+${value}` : String(value);

export const formatClock = (msRemaining: number): string => {
  const seconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 0
    ? `${minutes}:${String(seconds % 60).padStart(2, '0')}`
    : String(seconds);
};

/* -----------------------------------------------------------------
 * Board geometry — the canonical 20 spaces mapped onto a 6×6 plate.
 * Position 0 sits top-left; travel runs clockwise.
 * -------------------------------------------------------------- */

export type BoardEdge = 'top' | 'right' | 'bottom' | 'left';

export interface BoardCell {
  readonly row: number;
  readonly column: number;
  readonly edge: BoardEdge;
}

export const cellForPosition = (position: number): BoardCell => {
  if (position <= 5) return { row: 1, column: position + 1, edge: 'top' };
  if (position <= 9) return { row: position - 4, column: 6, edge: 'right' };
  if (position <= 15) return { row: 6, column: 16 - position, edge: 'bottom' };
  return { row: 21 - position, column: 1, edge: 'left' };
};
