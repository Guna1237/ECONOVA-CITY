import type { ReactElement } from 'react';

import type { PlayerProjectionDto } from '@econova/contracts';

import { usePlayerSession } from '../../state/PlayerSession.js';
import { Auction } from './Auction.js';
import { CardDiscard } from './CardDiscard.js';
import { Council } from './Council.js';
import { DistrictChoice } from './DistrictChoice.js';
import { EmergencySale } from './EmergencySale.js';
import { LandingFee } from './LandingFee.js';
import { ObjectiveChoice } from './ObjectiveChoice.js';
import { TradeResponse } from './TradeResponse.js';

export { TradeProposal } from './TradeProposal.js';

export type DecisionKind =
  | 'objective'
  | 'emergency'
  | 'landing_fee'
  | 'auction'
  | 'council'
  | 'trade'
  | 'district'
  | 'discard';

/**
 * Which decision the player owes the city right now, in the order the rules
 * resolve them. This is a pure read of the projection so it can be tested on
 * its own and so exactly one surface is ever mounted — mounting them all and
 * letting each return null would make the hook order depend on game state.
 */
export const selectDecision = (
  projection: PlayerProjectionDto
): DecisionKind | null => {
  const { public: view, self } = projection;
  const allowed = new Set<string>(self.capabilities.commandTypes);

  if (self.objectiveOffer !== null && allowed.has('choose_objective')) return 'objective';
  if (view.emergencySale !== null && view.emergencySale.playerId === self.playerId) {
    return 'emergency';
  }
  if (self.pendingLandingFee !== null && self.pendingLandingFee.payerId === self.playerId) {
    return 'landing_fee';
  }
  if (view.auction !== null && self.auction !== null) return 'auction';
  if (view.council !== null && self.councilAllocation === null) return 'council';
  if (self.trade !== null && self.trade.counterpartyPlayerId === self.playerId) {
    return 'trade';
  }
  if (self.pendingEventChoice !== null) return 'district';
  if (allowed.has('discard_card')) {
    return 'discard';
  }
  return null;
};

export const DecisionSurface = (): ReactElement | null => {
  const { projection } = usePlayerSession();

  switch (selectDecision(projection)) {
    case 'objective':
      return <ObjectiveChoice />;
    case 'emergency':
      return <EmergencySale />;
    case 'landing_fee':
      return <LandingFee />;
    case 'auction':
      return <Auction />;
    case 'council':
      return <Council />;
    case 'trade':
      return <TradeResponse />;
    case 'district':
      return <DistrictChoice />;
    case 'discard':
      return <CardDiscard />;
    default:
      return null;
  }
};
