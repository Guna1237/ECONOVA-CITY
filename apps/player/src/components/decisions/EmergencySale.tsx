import { useState } from 'react';
import type { ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import {
  Button,
  PropertyRecord,
  Sheet,
  Timer,
  formatCredits,
  seatOf
} from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/**
 * The player owes more than they hold. This has to stay calm and completely
 * unambiguous: what is owed, what is on hand, what is still short, and what
 * can be sold. Sale values are set by the city, so none are quoted here.
 */
export const EmergencySale = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;
  const [selected, setSelected] = useState<readonly string[]>([]);

  const sale = view.emergencySale;
  if (sale === null || sale.playerId !== self.playerId) return null;

  const owed = self.pendingLandingFee?.amount ?? null;
  const shortfall = owed === null ? null : Math.max(0, owed - self.credits);
  const seat = seatOf(self.playerId, view.turnOrder);

  const toggle = (propertyId: string) =>
    setSelected((current) =>
      current.includes(propertyId)
        ? current.filter((entry) => entry !== propertyId)
        : [...current, propertyId]
    );

  return (
    <Sheet
      title="Raise credits now"
      kicker="Emergency sale"
      onClose={() => undefined}
      footer={
        <Button
          tone="risk"
          block
          disabled={selected.length === 0}
          request={requestState('emergency')}
          title={selected.length === 0 ? 'Select at least one property to sell' : undefined}
          onClick={() =>
            selected.length === 0
              ? undefined
              : dispatch('emergency', {
                  type: 'emergency_sell',
                  propertyIds: selected as never
                })
          }
        >
          {selected.length === 0
            ? 'Select a property to sell'
            : `Sell ${selected.length} propert${selected.length === 1 ? 'y' : 'ies'}`}
        </Button>
      }
    >
      <div className="eco-decision">
        <div className="player-ledger">
          <div className="player-ledger__row">
            <span className="eco-label">Owed</span>
            <b className="eco-num">{owed === null ? '—' : formatCredits(owed)}</b>
          </div>
          <div className="player-ledger__row">
            <span className="eco-label">You hold</span>
            <b className="eco-num">{formatCredits(self.credits)}</b>
          </div>
          <div className="player-ledger__row" data-emphasis="true">
            <span className="eco-label">Still short</span>
            <b className="eco-num" data-tone={shortfall === 0 ? 'settled' : 'short'}>
              {shortfall === null ? '—' : formatCredits(shortfall)}
            </b>
          </div>
        </div>

        <Timer
          deadlineAt={sale.deadlineAt}
          windowSeconds={GAME_CONFIG.emergencySaleTimerSeconds}
          label="Time to decide"
        />

        <div>
          <div className="eco-decision__question">Choose what to liquidate</div>
          {self.propertyIds.length === 0 ? (
            <p className="eco-empty">
              You hold no properties. The city will settle this for you.
            </p>
          ) : (
            self.propertyIds.map((propertyId) => {
              const record = view.properties.find(
                (entry) => entry.propertyId === propertyId
              );
              const chosen = selected.includes(propertyId);
              return (
                <PropertyRecord
                  key={propertyId}
                  propertyId={propertyId}
                  developmentLevel={record?.developmentLevel ?? 0}
                  ownerSeat={seat}
                  onSelect={toggle}
                  trailing={
                    <span
                      className="eco-record__value"
                      style={{ color: chosen ? 'var(--signal-loss)' : 'var(--ink-faint)' }}
                    >
                      {chosen ? 'Selling' : 'Keep'}
                    </span>
                  }
                />
              );
            })
          )}
        </div>

        <p className="eco-empty" style={{ padding: 0 }}>
          The city sets the sale value. If the timer runs out it chooses for you.
        </p>
      </div>
    </Sheet>
  );
};
