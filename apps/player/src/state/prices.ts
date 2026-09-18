import type { PlayerProjectionDto } from '@econova/contracts';
import { PROPERTY_BY_ID } from '@econova/game-content';

/**
 * A price the player can see, and whether it is the real one.
 *
 * `charged` is true only when the server quoted it, meaning it already includes
 * every policy, news, district-control and card modifier and is exactly what
 * will be taken. Otherwise the figure is the printed base price and the
 * interface must say so, because the real charge can be well below it.
 *
 * This never recomputes a modifier. Reproducing the server's modifier order in
 * the client is how the two would drift apart.
 */
export interface ShownPrice {
  readonly amount: number;
  readonly charged: boolean;
}

export const purchasePrice = (
  projection: PlayerProjectionDto,
  propertyId: string
): ShownPrice | null => {
  const quoted = projection.self.quotes?.purchase;
  if (quoted !== undefined && quoted !== null && quoted.propertyId === propertyId) {
    return { amount: quoted.price, charged: true };
  }
  const base = PROPERTY_BY_ID.get(propertyId as never)?.basePrice;
  return base === undefined ? null : { amount: base, charged: false };
};

export const developmentPrice = (
  projection: PlayerProjectionDto,
  propertyId: string,
  currentLevel: number
): ShownPrice | null => {
  const quoted = projection.self.quotes?.development.find(
    (entry) => entry.propertyId === propertyId
  );
  if (quoted !== undefined) return { amount: quoted.cost, charged: true };
  const base = PROPERTY_BY_ID.get(propertyId as never)?.developmentCosts[currentLevel];
  return base === undefined ? null : { amount: base, charged: false };
};

/** How a price reads on a control: the real figure plain, a base one marked. */
export const priceLabel = (price: ShownPrice, format: (value: number) => string): string =>
  price.charged ? format(price.amount) : `${format(price.amount)} base`;
