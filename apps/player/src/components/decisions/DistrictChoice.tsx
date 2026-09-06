import type { ReactElement } from 'react';

import { SPECIAL_EVENTS } from '@econova/game-content';
import { Button, DISTRICTS, DISTRICT_ORDER, Sheet, formatSigned } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/**
 * Demand Surge (SE03) and Economic Downturn (SE04) both stop the turn to ask
 * which district moves. The event id comes from the player projection, so the
 * card's own wording can be shown alongside the choice.
 */
export const DistrictChoice = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;

  const pending = self.pendingEventChoice;
  if (pending === null) return null;

  const event = SPECIAL_EVENTS.find((entry) => entry.id === pending.eventId);
  const raising = pending.eventId === 'SE03';

  return (
    <Sheet title="Choose a district" kicker={event?.name ?? 'Special event'} onClose={() => undefined}>
      <div className="eco-decision">
        <div className="eco-decision__question">{event?.description ?? ''}</div>

        <div style={{ display: 'grid', gap: 'var(--s2)' }}>
          {DISTRICT_ORDER.map((districtId) => {
            const district = DISTRICTS[districtId];
            const current = view.demand[districtId];
            const key = `event:${districtId}`;
            /* The server clamps demand; the UI only says what it can see. */
            const atLimit = raising ? current >= 2 : current <= -2;

            return (
              <Button
                key={districtId}
                block
                tone={atLimit ? 'quiet' : 'default'}
                request={requestState(key)}
                title={
                  atLimit
                    ? `${district.label} demand is already at its ${raising ? 'maximum' : 'minimum'}`
                    : undefined
                }
                hint={`Demand ${formatSigned(current)}`}
                onClick={() =>
                  dispatch(key, {
                    type: 'select_event_district',
                    eventId: pending.eventId,
                    districtId
                  })
                }
              >
                {district.label}
              </Button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
};
