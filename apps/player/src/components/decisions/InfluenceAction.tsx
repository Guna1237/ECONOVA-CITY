import type { ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import { Button, DISTRICTS, DISTRICT_ORDER, Sheet, formatSigned } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/**
 * Spending Influence to move a district's demand is a real action the server
 * has always accepted, but the player had no way to reach it. It costs one
 * Action and one Influence, and the Market Regulation policy disables it
 * outright, so the server stays the authority on whether any given press is
 * legal; this surface only says what it can already see.
 */
export const InfluenceAction = ({ onClose }: { readonly onClose: () => void }): ReactElement => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const { public: view, self } = projection;

  const allowed = can('change_demand');
  const broke = self.influence < 1;

  return (
    <Sheet
      title="Spend influence"
      kicker="Shift a district's demand"
      onClose={onClose}
      footer={
        <Button tone="quiet" block onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="eco-decision">
        <div className="eco-decision__question">
          One influence moves one district by one step. It costs one of your
          actions, and demand changes what every property there earns.
        </div>

        {broke ? (
          <p className="eco-empty" style={{ padding: 0 }}>
            You hold no influence to spend.
          </p>
        ) : null}

        <div style={{ display: 'grid', gap: 'var(--s2)' }}>
          {DISTRICT_ORDER.map((districtId) => {
            const district = DISTRICTS[districtId];
            const current = view.demand[districtId];

            return (
              <div
                key={districtId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--s2)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eco-card__name">{district.label}</div>
                  <div className="eco-label">Demand {formatSigned(current)}</div>
                </div>
                {([-1, 1] as const).map((delta) => {
                  const key = `demand:${districtId}:${delta}`;
                  const atLimit =
                    delta === 1
                      ? current >= GAME_CONFIG.demandMaximum
                      : current <= GAME_CONFIG.demandMinimum;

                  return (
                    <Button
                      key={delta}
                      tone={delta === 1 ? 'primary' : 'default'}
                      request={requestState(key)}
                      disabled={!allowed || broke || atLimit}
                      title={
                        atLimit
                          ? `${district.label} demand is already at its ${delta === 1 ? 'maximum' : 'minimum'}`
                          : !allowed
                            ? 'This action is not available right now'
                            : undefined
                      }
                      onClick={() =>
                        dispatch(key, { type: 'change_demand', districtId, delta })
                      }
                    >
                      {delta === 1 ? 'Raise' : 'Lower'}
                    </Button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
};
