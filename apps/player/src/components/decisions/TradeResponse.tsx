import type { ReactElement } from 'react';

import { Button, PropertyRecord, Sheet, formatCredits, seatOf } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

const Side = ({
  heading,
  credits,
  propertyIds
}: {
  readonly heading: string;
  readonly credits: number;
  readonly propertyIds: readonly string[];
}): ReactElement => (
  <div>
    <div className="eco-decision__question">{heading}</div>
    {credits === 0 && propertyIds.length === 0 ? (
      <p className="eco-empty" style={{ padding: 'var(--s3) 0' }}>
        Nothing
      </p>
    ) : (
      <>
        {credits > 0 ? (
          <div className="eco-record">
            <span className="eco-record__body">
              <span className="eco-record__name">{formatCredits(credits)} credits</span>
            </span>
          </div>
        ) : null}
        {propertyIds.map((propertyId) => (
          <PropertyRecord key={propertyId} propertyId={propertyId} />
        ))}
      </>
    )}
  </div>
);

/** An offer arrived. Three answers only: what changes, accept, decline. */
export const TradeResponse = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;

  const trade = self.trade;
  if (trade === null || trade.counterpartyPlayerId !== self.playerId) return null;

  const proposer = view.players.find(
    (player) => player.playerId === trade.proposerPlayerId
  );
  const seat = seatOf(trade.proposerPlayerId, view.turnOrder);
  const cannotAfford = self.credits < trade.requestedCredits;

  return (
    <Sheet
      title={`${proposer?.name ?? 'A player'} proposes a trade`}
      kicker={`Seat ${seat.index + 1}`}
      onClose={() => undefined}
      footer={
        <>
          <Button
            tone="quiet"
            request={requestState('trade-no')}
            onClick={() =>
              dispatch('trade-no', {
                type: 'respond_trade',
                tradeId: trade.id as never,
                response: 'reject'
              })
            }
          >
            Decline
          </Button>
          <Button
            tone="commit"
            disabled={cannotAfford}
            title={
              cannotAfford
                ? `You hold ${formatCredits(self.credits)} and this asks for ${formatCredits(trade.requestedCredits)}`
                : undefined
            }
            request={requestState('trade-yes')}
            onClick={() =>
              dispatch('trade-yes', {
                type: 'respond_trade',
                tradeId: trade.id as never,
                response: 'accept'
              })
            }
          >
            Accept
          </Button>
        </>
      }
    >
      <div className="eco-decision">
        <Side
          heading="You receive"
          credits={trade.offeredCredits}
          propertyIds={trade.offeredPropertyIds}
        />
        <Side
          heading="You give up"
          credits={trade.requestedCredits}
          propertyIds={trade.requestedPropertyIds}
        />
        {cannotAfford ? (
          <p className="eco-empty" style={{ padding: 0 }}>
            You cannot cover the credits this asks for.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
};
