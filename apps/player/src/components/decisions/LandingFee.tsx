import type { CSSProperties, ReactElement } from 'react';

import { PROPERTY_BY_ID } from '@econova/game-content';
import {
  Button,
  DISTRICTS,
  GameCard,
  Sheet,
  formatCredits
} from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

const INSURANCE = 'SC12';

/**
 * A fee is due. The only reaction the rules allow here is Insurance Policy,
 * so it is offered when it is in hand and never implied when it is not.
 */
export const LandingFee = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;

  const fee = self.pendingLandingFee;
  if (fee === null || fee.payerId !== self.playerId) return null;

  const property = PROPERTY_BY_ID.get(fee.propertyId);
  const owner = view.players.find((player) => player.playerId === fee.ownerId);
  const holdsInsurance = self.cards.includes(INSURANCE as never);
  const short = self.credits < fee.amount;

  return (
    <Sheet title="Landing fee due" kicker="Your reaction" onClose={() => undefined}>
      <div className="eco-decision">
        <div
          className="eco-decision__subject"
          style={
            (property === undefined ? {} : DISTRICTS[property.district].vars) as CSSProperties
          }
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eco-label" style={{ color: 'var(--district-lit)' }}>
              {property?.name ?? fee.propertyId}
            </div>
            <div style={{ fontWeight: 700 }}>
              Owned by {owner?.name ?? 'another player'}
            </div>
          </div>
          <div className="eco-num" style={{ fontSize: 'var(--type-title)' }}>
            {formatCredits(fee.amount)}
          </div>
        </div>

        <div className="player-ledger">
          <div className="player-ledger__row">
            <span className="eco-label">You hold</span>
            <b className="eco-num">{formatCredits(self.credits)}</b>
          </div>
          {short ? (
            <div className="player-ledger__row" data-emphasis="true">
              <span className="eco-label">Short by</span>
              <b className="eco-num" data-tone="short">
                {formatCredits(fee.amount - self.credits)}
              </b>
            </div>
          ) : null}
        </div>

        <div className="player-actions">
          {holdsInsurance ? (
            <>
              <GameCard cardId={INSURANCE} />
              <Button
                tone="primary"
                block
                request={requestState('insurance')}
                onClick={() =>
                  dispatch('insurance', {
                    type: 'play_card',
                    cardId: INSURANCE as never,
                    reactionTo: 'landing_fee'
                  })
                }
              >
                Play Insurance Policy
              </Button>
            </>
          ) : null}

          <Button
            tone="commit"
            block
            hint={formatCredits(fee.amount)}
            request={requestState('payfee')}
            onClick={() => dispatch('payfee', { type: 'pay_landing_fee' })}
          >
            Pay the fee
          </Button>
        </div>

        {short ? (
          <p className="eco-empty" style={{ padding: 0 }}>
            You cannot cover this. Paying will put the city into an emergency
            sale so you can raise the difference.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
};
