import { describe, expect, it } from 'vitest';
import { createInitialGame, createSeededRandom, createPlayerProjection, createPublicProjection, createAdminProjection } from '@econova/game-engine';
import { playerProjectionSchema } from '@econova/contracts';
import { recordActivity } from '../src/rooms/activity.js';

const initial = () => createInitialGame({ gameId: 'game', roomId: 'room',
  players: ['a', 'b', 'c', 'd'].map(id => ({ id, name: id })), random: createSeededRandom(1) });

describe('durable recipient-scoped activity', () => {
  it('records rent only for payer and owner, with no private fields in public/admin or another player', () => {
    const before = initial();
    const after = structuredClone(before); after.version++;
    recordActivity(before, after, [{ type: 'landing_fee_paid', visibility: 'public', payload: { payerId: 'a', ownerId: 'b', propertyId: 'F01', amount: 73 } }]);
    expect(createPlayerProjection(after, 'a').self.activity.at(-1)?.text).toContain('73');
    expect(createPlayerProjection(after, 'b').self.activity.at(-1)?.title).toBe('Rent received');
    expect(createPlayerProjection(after, 'c').self.activity).toEqual([]);
    expect(JSON.stringify(createPublicProjection(after))).not.toContain('73 Credits');
    expect(JSON.stringify(createAdminProjection(after))).not.toContain('73 Credits');
    expect(playerProjectionSchema.safeParse(createPlayerProjection(after, 'b')).success).toBe(true);
    expect(createPlayerProjection(JSON.parse(JSON.stringify(after)), 'b')).toEqual(createPlayerProjection(after, 'b'));
  });

  it('distinguishes declined trades from expired offers and excludes non-participants', () => {
    const before = initial(); before.trade = { id: 'offer', proposerPlayerId: 'a', counterpartyPlayerId: 'b', offeredCredits: 10, requestedCredits: 0, offeredPropertyIds: [], requestedPropertyIds: [], createdOnTurn: 1 };
    const after = structuredClone(before); after.trade = null; after.version++;
    const rejected = { type: 'trade_rejected', visibility: 'public' as const, payload: { tradeId: 'offer' } };
    recordActivity(before, after, [rejected]);
    expect(createPlayerProjection(after, 'a').self.activity.at(-1)?.title).toBe('Trade declined');
    expect(createPlayerProjection(after, 'c').self.activity).toEqual([]);
    recordActivity(before, after, [rejected, { type: 'turn_ended', visibility: 'public', payload: {} }]);
    expect(createPlayerProjection(after, 'a').self.activity.at(-1)?.title).toBe('Trade expired');
  });

  it('bounds history, ignores arbitrary event payloads, and publishes only approved policy results', () => {
    let before = initial();
    for (let i = 0; i < 100; i++) {
      const after = structuredClone(before); after.version++;
      recordActivity(before, after, [{ type: 'council_resolved', visibility: 'public', payload: { winnerId: 'POL01A', secret: 'never-copy-me' } }]);
      before = after;
    }
    expect(before.activity).toHaveLength(40);
    expect(JSON.stringify(createPublicProjection(before))).not.toContain('never-copy-me');
    expect(createPlayerProjection(initial(), 'a').self.activity).toEqual([]);
  });

  it('labels end-of-round income with the round that earned it and excludes unknown events', () => {
    const before = initial(); before.round = 2;
    const after = structuredClone(before); after.round = 3; after.version++;
    recordActivity(before, after, [
      { type: 'property_income_awarded', visibility: 'public', payload: { playerId: 'a', propertyId: 'P01', amount: 20 } },
      { type: 'unknown', visibility: 'public', payload: { hidden: 'do-not-forward' } }
    ]);
    expect(createPlayerProjection(after, 'a').self.activity).toHaveLength(1);
    expect(createPlayerProjection(after, 'a').self.activity[0]?.round).toBe(2);
    expect(JSON.stringify(after.activity)).not.toContain('do-not-forward');
  });
});
