import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import {
  Button,
  PropertyRecord,
  SeatPiece,
  Sheet,
  Stepper,
  formatCredits,
  seatOf
} from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/**
 * Composing an offer. The two sides are shown as two columns — what leaves and
 * what arrives — so the shape of the deal is legible before it is sent. The
 * server decides whether it is legal; nothing here is applied locally.
 */
export const TradeProposal = ({
  onClose
}: {
  readonly onClose: () => void;
}): ReactElement => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const { public: view, self } = projection;

  const [counterparty, setCounterparty] = useState<string | null>(null);
  const [offeredCredits, setOfferedCredits] = useState(0);
  const [requestedCredits, setRequestedCredits] = useState(0);
  const [offered, setOffered] = useState<readonly string[]>([]);
  const [requested, setRequested] = useState<readonly string[]>([]);

  const others = view.players.filter((player) => player.playerId !== self.playerId);
  const theirProperties =
    counterparty === null
      ? []
      : view.players.find((player) => player.playerId === counterparty)?.propertyIds ?? [];

  const toggle =
    (setter: (updater: (current: readonly string[]) => readonly string[]) => void) =>
    (propertyId: string) =>
      setter((current) =>
        current.includes(propertyId)
          ? current.filter((entry) => entry !== propertyId)
          : [...current, propertyId]
      );

  const empty =
    offeredCredits === 0 &&
    requestedCredits === 0 &&
    offered.length === 0 &&
    requested.length === 0;

  const blocked =
    counterparty === null
      ? 'Choose who you are trading with'
      : empty
        ? 'A trade needs something on at least one side'
        : !can('propose_trade')
          ? 'Trading is not available at this point in the turn'
          : null;

  return (
    <Sheet
      title="Propose a trade"
      kicker="Offer"
      onClose={onClose}
      footer={
        <>
          <Button tone="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            tone="primary"
            disabled={blocked !== null}
            title={blocked ?? undefined}
            request={requestState('propose')}
            onClick={() =>
              counterparty === null
                ? undefined
                : dispatch('propose', {
                    type: 'propose_trade',
                    counterpartyPlayerId: counterparty as never,
                    offeredCredits,
                    offeredPropertyIds: offered as never,
                    requestedCredits,
                    requestedPropertyIds: requested as never
                  })
            }
          >
            Send offer
          </Button>
        </>
      }
    >
      <div className="eco-decision">
        <div>
          <div className="eco-decision__question">Trade with</div>
          <div className="trade-partners">
            {others.map((player) => {
              const seat = seatOf(player.playerId, view.turnOrder);
              const chosen = counterparty === player.playerId;
              return (
                <button
                  key={player.playerId}
                  type="button"
                  className="trade-partner"
                  data-chosen={chosen}
                  aria-pressed={chosen}
                  style={{ '--seat': seat.color } as CSSProperties}
                  onClick={() => {
                    setCounterparty(player.playerId);
                    setRequested([]);
                  }}
                >
                  <SeatPiece shape={seat.shape} className="trade-partner__piece" />
                  <span className="trade-partner__name">{player.name}</span>
                  <span className="eco-label">
                    {player.propertyIds.length} propert
                    {player.propertyIds.length === 1 ? 'y' : 'ies'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {blocked !== null && counterparty === null ? null : (
          <>
            <div>
              <div className="eco-decision__question">You give</div>
              <Stepper
                value={offeredCredits}
                min={0}
                max={self.credits}
                step={10}
                caption={`Credits · you hold ${formatCredits(self.credits)}`}
                onChange={setOfferedCredits}
              />
              <div style={{ marginTop: 'var(--s2)' }}>
                {self.propertyIds.length === 0 ? (
                  <p className="eco-empty" style={{ padding: 'var(--s3) 0' }}>
                    You hold no properties to offer.
                  </p>
                ) : (
                  self.propertyIds.map((propertyId) => (
                    <PropertyRecord
                      key={propertyId}
                      propertyId={propertyId}
                      ownerSeat={seatOf(self.playerId, view.turnOrder)}
                      developmentLevel={
                        view.properties.find((e) => e.propertyId === propertyId)
                          ?.developmentLevel ?? 0
                      }
                      onSelect={toggle(setOffered)}
                      trailing={
                        <span className="eco-record__value">
                          {offered.includes(propertyId) ? 'Giving' : ''}
                        </span>
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="eco-decision__question">You receive</div>
              <Stepper
                value={requestedCredits}
                min={0}
                max={9999}
                step={10}
                caption="Credits"
                onChange={setRequestedCredits}
              />
              <div style={{ marginTop: 'var(--s2)' }}>
                {theirProperties.length === 0 ? (
                  <p className="eco-empty" style={{ padding: 'var(--s3) 0' }}>
                    They hold no properties.
                  </p>
                ) : (
                  theirProperties.map((propertyId) => (
                    <PropertyRecord
                      key={propertyId}
                      propertyId={propertyId}
                      ownerSeat={
                        counterparty === null
                          ? null
                          : seatOf(counterparty, view.turnOrder)
                      }
                      developmentLevel={
                        view.properties.find((e) => e.propertyId === propertyId)
                          ?.developmentLevel ?? 0
                      }
                      onSelect={toggle(setRequested)}
                      trailing={
                        <span className="eco-record__value">
                          {requested.includes(propertyId) ? 'Asking' : ''}
                        </span>
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {blocked === null ? null : (
          <p className="eco-empty" style={{ padding: 0 }}>
            {blocked}.
          </p>
        )}
      </div>
    </Sheet>
  );
};
