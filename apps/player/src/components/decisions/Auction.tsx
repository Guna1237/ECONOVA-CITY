import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { GAME_CONFIG, PROPERTY_BY_ID } from '@econova/game-content';
import {
  Button,
  DISTRICTS,
  DistrictMark,
  Sheet,
  Stepper,
  TIER_LABEL,
  Timer,
  formatCredits
} from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/**
 * A sealed-bid auction. Four questions have to be answerable at a glance:
 * what is on the block, how do I bid, how much can I bid, and how long have
 * I got. Other players' bids are hidden by the projection, not by the UI.
 */
export const Auction = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;
  const [bid, setBid] = useState(0);

  const auction = view.auction;
  const mine = self.auction;
  if (auction === null || mine === null) return null;

  const property = PROPERTY_BY_ID.get(auction.propertyId);
  const district = property === undefined ? null : DISTRICTS[property.district];
  const submitted = mine.hasSubmitted;
  const broke = self.credits === 0;

  return (
    <Sheet
      title={property?.name ?? 'Property auction'}
      kicker="Sealed bid"
      onClose={() => undefined}
      footer={
        submitted ? (
          <Button tone="quiet" block disabled>
            Bid sealed — waiting for the room
          </Button>
        ) : (
          <>
            <Button
              tone="quiet"
              request={requestState('pass')}
              onClick={() =>
                dispatch('pass', {
                  type: 'pass_auction',
                  auctionId: auction.auctionId as never
                })
              }
            >
              Pass
            </Button>
            <Button
              tone="primary"
              disabled={broke}
              title={broke ? 'You have no credits to bid with' : undefined}
              request={requestState('bid')}
              onClick={() =>
                dispatch('bid', {
                  type: 'submit_bid',
                  auctionId: auction.auctionId as never,
                  amount: bid
                })
              }
            >
              Submit bid
            </Button>
          </>
        )
      }
    >
      <div className="eco-decision">
        <div
          className="eco-decision__subject"
          style={(district?.vars ?? {}) as CSSProperties}
        >
          {district === null ? null : (
            <DistrictMark
              mark={district.mark}
              width={30}
              height={30}
              style={{ color: 'var(--district-lit)', flex: 'none' }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eco-label" style={{ color: 'var(--district-lit)' }}>
              {district?.label ?? ''}
              {property === undefined ? '' : ` · ${TIER_LABEL[property.tier] ?? property.tier}`}
            </div>
            <div style={{ fontWeight: 700 }}>
              Printed price {formatCredits(property?.basePrice ?? 0)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Timer
            deadlineAt={auction.deadlineAt}
            windowSeconds={GAME_CONFIG.auctionTimerSeconds}
            label="Closes in"
          />
          <span className="eco-label" style={{ marginLeft: 'auto' }}>
            {auction.submittedCount} of {auction.eligiblePlayerIds.length} in
          </span>
        </div>

        {submitted ? (
          <p className="eco-empty">
            Your bid of {formatCredits(mine.ownBid ?? 0)} is sealed. Every bid
            stays hidden until the auction closes.
          </p>
        ) : (
          <>
            <div className="eco-decision__question">Your sealed bid</div>
            <Stepper
              value={bid}
              min={0}
              max={self.credits}
              step={10}
              caption={`You hold ${formatCredits(self.credits)}`}
              onChange={setBid}
              disabled={broke}
            />
            <p className="eco-empty" style={{ padding: 0 }}>
              You cannot see other bids, and they cannot see yours.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
};
