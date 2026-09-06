import { describe, expect, it } from 'vitest';

import type { PlayerProjectionDto } from '@econova/contracts';

import { HINTS, briefFor } from '../src/state/briefing.js';
import { demonstrationPlayerState } from '../src/fixtures/demonstrationState.js';

const base = demonstrationPlayerState;

const withSelf = (self: Partial<PlayerProjectionDto['self']>): PlayerProjectionDto => ({
  ...base,
  self: { ...base.self, ...self } as PlayerProjectionDto['self']
});

const withPublic = (
  view: Partial<PlayerProjectionDto['public']>
): PlayerProjectionDto => ({
  ...base,
  public: { ...base.public, ...view } as PlayerProjectionDto['public']
});

const atStage = (stage: string): PlayerProjectionDto =>
  withPublic({ turn: { ...base.public.turn!, stage: stage as never } });

/**
 * The briefing is the first thing a player reads, so it has to name the real
 * situation using canonical content — never a stage enum leaked to the screen.
 */
describe('turn briefing', () => {
  it('tells the player to roll when the turn opens', () => {
    const brief = briefFor(atStage('awaiting_roll'));
    expect(brief.headline).toBe('Your turn');
    expect(brief.detail).toMatch(/roll/i);
    expect(brief.tone).toBe('you');
    expect(brief.hint).toBe('roll');
  });

  it('names the property and its price when one is unowned', () => {
    // The demonstration player stands on Harvest Table (a Food property).
    const brief = briefFor(atStage('awaiting_property_decision'));
    expect(brief.headline).toContain('Harvest Table');
    expect(brief.detail).toContain('Food');
    expect(brief.detail).toMatch(/\d/);
    expect(brief.hint).toBe('buy');
  });

  it('leads with the amount owed when a fee is due', () => {
    const brief = briefFor(
      withSelf({
        pendingLandingFee: {
          payerId: base.self.playerId,
          ownerId: 'demo_player_2' as never,
          propertyId: 'P06' as never,
          amount: 38
        } as never
      })
    );
    expect(brief.headline).toBe('Pay 38');
    expect(brief.detail).toContain('DataForge');
    expect(brief.tone).toBe('alert');
  });

  it('says who everyone is waiting on when it is not your turn', () => {
    const brief = briefFor(
      withPublic({ turn: { ...base.public.turn!, playerId: 'demo_player_2' as never } })
    );
    expect(brief.headline).toBe("Rafa's turn");
    expect(brief.tone).toBe('waiting');
    expect(brief.hint).toBeNull();
    // Another player's roll is not narrated as though it were yours.
    expect(brief.roll).toBeNull();
  });

  it('counts down the actions left and points at ending the turn', () => {
    expect(briefFor(base).headline).toBe('Your actions');
    const spent = withPublic({
      turn: { ...base.public.turn!, actionsRemaining: 0 }
    });
    expect(briefFor(spent).headline).toBe('No actions left');
    expect(briefFor(spent).detail).toMatch(/end your turn/i);
  });

  it('puts an emergency sale ahead of the ordinary turn briefing', () => {
    const brief = briefFor(
      withPublic({
        emergencySale: { playerId: base.self.playerId, deadlineAt: 1 } as never
      })
    );
    expect(brief.tone).toBe('alert');
    expect(brief.headline).toMatch(/raise credits/i);
  });

  it('never shows a raw stage identifier to the player', () => {
    const stages = [
      'awaiting_roll',
      'awaiting_shortcut_choice',
      'awaiting_property_decision',
      'awaiting_card_discard',
      'action_phase',
      'landing_fee_reaction'
    ];
    for (const stage of stages) {
      const brief = briefFor(atStage(stage));
      const text = `${brief.headline} ${brief.detail ?? ''}`;
      expect(text).not.toMatch(/_/);
    }
  });

  it('offers a hint for every situation that declares one', () => {
    for (const id of Object.keys(HINTS)) {
      expect(HINTS[id as keyof typeof HINTS].length).toBeGreaterThan(20);
    }
  });
});
