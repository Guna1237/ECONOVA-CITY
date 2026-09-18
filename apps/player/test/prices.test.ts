import { describe, expect, it } from 'vitest';

import type { PlayerProjectionDto } from '@econova/contracts';
import { PROPERTY_BY_ID } from '@econova/game-content';

import { demonstrationPlayerState } from '../src/fixtures/demonstrationState.js';
import { developmentPrice, priceLabel, purchasePrice } from '../src/state/prices.js';

const withQuotes = (quotes: PlayerProjectionDto['self']['quotes']): PlayerProjectionDto => ({
  ...demonstrationPlayerState,
  self: { ...demonstrationPlayerState.self, quotes }
});

const base = (id: string) => PROPERTY_BY_ID.get(id as never)!;
const credits = (value: number) => `${value} cr`;

/**
 * A price is only shown as payable when the server quoted it. Anything else is
 * the printed base, which modifiers can move a long way, so it must say so.
 */
describe('prices shown to the player', () => {
  it('shows the server quote plainly when there is one', () => {
    const price = purchasePrice(
      withQuotes({ purchase: { propertyId: 'P01', price: 60 }, development: [] }),
      'P01'
    );
    expect(price).toEqual({ amount: 60, charged: true });
    expect(priceLabel(price!, credits)).toBe('60 cr');
  });

  it('marks a base figure as base rather than passing it off as the charge', () => {
    const price = purchasePrice(withQuotes(undefined), 'P01');
    expect(price).toEqual({ amount: base('P01').basePrice, charged: false });
    expect(priceLabel(price!, credits)).toBe(`${base('P01').basePrice} cr base`);
  });

  it('does not borrow a quote meant for a different property', () => {
    const price = purchasePrice(
      withQuotes({ purchase: { propertyId: 'P01', price: 60 }, development: [] }),
      'P02'
    );
    expect(price?.charged).toBe(false);
  });

  it('uses the quoted development cost, and the base for the right level otherwise', () => {
    const quoted = withQuotes({
      purchase: null,
      development: [{ propertyId: 'P02', cost: 70 }]
    });
    expect(developmentPrice(quoted, 'P02', 1)).toEqual({ amount: 70, charged: true });
    expect(developmentPrice(withQuotes(undefined), 'P02', 1)).toEqual({
      amount: base('P02').developmentCosts[1],
      charged: false
    });
  });
});
