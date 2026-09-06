/*
 * A demonstration board, built entirely from canonical game content.
 *
 * Every identifier here exists in @econova/game-content: properties P01–P16,
 * strategy cards SC01–SC12, objectives OBJ01–OBJ10, policies POL01A–POL04B,
 * breaking news BN01–BN10. Every value respects the canonical configuration —
 * demand stays within ±2, hands stay within the card limit, rounds stay within
 * the configured total.
 *
 * This is never presented as live play: the interface labels it as a
 * demonstration and refuses every command, because only the server may
 * change game state.
 */

import type {
  CardId,
  ObjectiveId,
  PlayerId,
  PlayerProjectionDto,
  PropertyId,
  PublicProjectionDto,
  RoomId
} from '@econova/contracts';
import { GAME_CONFIG, PROPERTIES } from '@econova/game-content';

const player = (value: string) => value as PlayerId;
const property = (value: string) => value as PropertyId;
const card = (value: string) => value as CardId;

const P1 = player('demo_player_1');
const P2 = player('demo_player_2');
const P3 = player('demo_player_3');
const P4 = player('demo_player_4');

/** Owner and development level per canonical property id. */
const HOLDINGS: Readonly<Record<string, readonly [PlayerId | null, 0 | 1 | 2 | 3]>> = {
  P01: [P1, 2],
  P02: [P2, 1],
  P03: [P3, 0],
  P04: [P4, 1],
  P05: [P1, 1],
  P06: [P2, 2],
  P10: [P1, 0],
  P12: [P3, 1]
};

const properties = PROPERTIES.map((definition) => {
  const holding = HOLDINGS[definition.id];
  return {
    propertyId: property(definition.id),
    ownerId: holding?.[0] ?? null,
    developmentLevel: holding?.[1] ?? (0 as const)
  };
});

const ownedBy = (owner: PlayerId): PropertyId[] =>
  properties
    .filter((entry) => entry.ownerId === owner)
    .map((entry) => entry.propertyId);

export const demonstrationPublicState: PublicProjectionDto = {
  gameId: 'demonstration',
  roomId: 'DEMO01' as RoomId,
  stateVersion: 0,
  phase: 'player_turn',
  round: 3,
  turnOrder: [P1, P2, P3, P4],
  currentTurnIndex: 0,
  turn: {
    number: 9,
    playerId: P1,
    stage: 'action_phase',
    actionsRemaining: 1,
    roll: 4,
    deadlineAt: Date.now() + 42_000
  },
  players: [
    { playerId: P1, name: 'Ada', position: 6, propertyIds: ownedBy(P1), connected: true },
    { playerId: P2, name: 'Rafa', position: 12, propertyIds: ownedBy(P2), connected: true },
    { playerId: P3, name: 'Mei', position: 15, propertyIds: ownedBy(P3), connected: true },
    { playerId: P4, name: 'Jonas', position: 0, propertyIds: ownedBy(P4), connected: false }
  ],
  properties,
  // Canonical range is demandMinimum..demandMaximum (-2..+2).
  demand: { food: 1, tech: 2, entertainment: -1, mobility: 0 },
  activeBreakingNewsId: 'BN01',
  activePolicyIds: ['POL01B'],
  auction: null,
  council: null,
  emergencySale: null,
  tradePending: false,
  results: [],
  announcements: [
    { type: 'council_resolved', payload: { policyId: 'POL01B' } },
    { type: 'breaking_news', payload: { eventId: 'BN01' } }
  ]
};

export const demonstrationPlayerState: PlayerProjectionDto = {
  public: demonstrationPublicState,
  self: {
    playerId: P1,
    credits: 620,
    influence: 7,
    // Canonical hand limit is GAME_CONFIG.strategyCardHandLimit.
    cards: ['SC01', 'SC06', 'SC11']
      .slice(0, GAME_CONFIG.strategyCardHandLimit)
      .map(card),
    propertyIds: ownedBy(P1),
    objectiveId: 'OBJ03' as ObjectiveId,
    objectiveOffer: null,
    pendingLandingFee: null,
    pendingEventChoice: null,
    auction: null,
    councilAllocation: null,
    trade: null,
    capabilities: {
      expectedStateVersion: 0,
      commandTypes: [
        'develop_property',
        'change_demand',
        'play_card',
        'propose_trade',
        'end_turn'
      ]
    }
  }
};
