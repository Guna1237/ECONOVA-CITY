import { describe, expect, it } from 'vitest';

import type { PublicProjectionDto } from '@econova/contracts';

import { narrate } from '../src/narration.js';
import { demonstrationPublicState } from '../src/demonstrationState.js';

const base = demonstrationPublicState;

const at = (patch: Partial<PublicProjectionDto>): PublicProjectionDto =>
  ({ ...base, ...patch }) as PublicProjectionDto;

const stage = (value: string): PublicProjectionDto =>
  at({ turn: { ...base.turn!, stage: value as never } });

/**
 * The projector faces a room, so its narration must say something useful and
 * must never be able to say something private.
 */
describe('projector narration', () => {
  it('names what the current player is doing', () => {
    expect(narrate(stage('awaiting_roll'))).toBe('Rolling the dice');
    expect(narrate(stage('emergency_sale'))).toBe('Raising credits');
    expect(narrate(stage('awaiting_card_discard'))).toBe('Discarding a card');
  });

  it('counts the actions left during the action phase', () => {
    expect(narrate(base)).toBe('Taking actions · 1 left');
    expect(
      narrate(at({ turn: { ...base.turn!, actionsRemaining: 0 } }))
    ).toBe('Finishing the turn');
  });

  it('names the property a decision is about', () => {
    // The demonstration current player stands on Harvest Table.
    expect(narrate(stage('awaiting_property_decision'))).toContain('Harvest Table');
    expect(narrate(stage('landing_fee_reaction'))).toContain('Harvest Table');
  });

  it('lets a whole-city phase speak over the individual turn', () => {
    expect(narrate(at({ phase: 'council' as never }))).toBe('City council in session');
    expect(narrate(at({ phase: 'paused' as never }))).toBe('Paused by the operator');
  });

  it('says nothing rather than guessing when there is no turn', () => {
    expect(narrate(at({ turn: null }))).toBeNull();
  });

  it('never leaks a bid, a hand or an objective', () => {
    const stages = [
      'awaiting_roll',
      'awaiting_property_decision',
      'auction',
      'landing_fee_reaction',
      'emergency_sale',
      'awaiting_event_choice',
      'awaiting_card_discard',
      'action_phase'
    ];
    for (const value of stages) {
      const line = narrate(stage(value)) ?? '';
      expect(line).not.toMatch(/bid|credits held|objective|card:/i);
      // Narration is a short line, not a data dump.
      expect(line.length).toBeLessThan(60);
    }
  });
});
