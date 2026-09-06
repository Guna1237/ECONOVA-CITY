/*
 * A demonstration board for a projector with no room assigned — the screen
 * an operator sees while setting up. Built entirely from canonical content
 * (properties P01–P16, breaking news BN01–BN10, policies POL01A–POL04B) and
 * containing public information only.
 */

import type { PlayerId, PropertyId, PublicProjectionDto, RoomId } from '@econova/contracts';
import { PROPERTIES } from '@econova/game-content';

const player = (value: string) => value as PlayerId;

const P1 = player('demo_player_1');
const P2 = player('demo_player_2');
const P3 = player('demo_player_3');
const P4 = player('demo_player_4');

const HOLDINGS: Readonly<Record<string, readonly [PlayerId, 0 | 1 | 2 | 3]>> = {
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
    propertyId: definition.id as PropertyId,
    ownerId: holding?.[0] ?? null,
    developmentLevel: holding?.[1] ?? (0 as const)
  };
});

const ownedBy = (owner: PlayerId): PropertyId[] =>
  properties.filter((entry) => entry.ownerId === owner).map((entry) => entry.propertyId);

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
