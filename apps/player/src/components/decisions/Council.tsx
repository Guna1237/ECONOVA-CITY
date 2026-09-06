import { useState } from 'react';
import type { ReactElement } from 'react';

import { GAME_CONFIG, POLICY_BY_ID } from '@econova/game-content';
import { Button, Sheet, Stepper, Timer } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/**
 * Council is a different kind of turn: no board movement, one political
 * decision, everyone at once. Influence is split between two policies and
 * the split stays hidden until the vote closes.
 */
export const Council = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;
  const [toA, setToA] = useState(0);

  const council = view.council;
  if (council === null || self.councilAllocation !== null) return null;

  const options = [
    { letter: 'A' as const, policy: POLICY_BY_ID.get(council.optionAId), influence: toA },
    {
      letter: 'B' as const,
      policy: POLICY_BY_ID.get(council.optionBId),
      influence: self.influence - toA
    }
  ];

  const noInfluence = self.influence === 0;

  return (
    <Sheet
      title="City council"
      kicker={`Round ${view.round} policy vote`}
      onClose={() => undefined}
      footer={
        <Button
          tone="primary"
          block
          request={requestState('council')}
          onClick={() =>
            dispatch('council', {
              type: 'council_vote',
              councilId: council.councilId,
              optionAInfluence: toA,
              optionBInfluence: self.influence - toA
            })
          }
        >
          {noInfluence ? 'Abstain' : 'Commit influence'}
        </Button>
      }
    >
      <div className="eco-decision">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Timer
            deadlineAt={council.deadlineAt}
            windowSeconds={GAME_CONFIG.councilTimerSeconds}
            label="Vote closes"
          />
          <span className="eco-label" style={{ marginLeft: 'auto' }}>
            {council.submittedCount} of {view.turnOrder.length} voted
          </span>
        </div>

        {options.map(({ letter, policy, influence }) => (
          <div key={letter} className="eco-option" data-chosen={influence > 0}>
            <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center' }}>
              <span className="eco-option__letter">{letter}</span>
              <div className="eco-card__name" style={{ flex: 1, minWidth: 0 }}>
                {policy?.name ?? 'Policy'}
              </div>
              <div className="eco-num" style={{ fontSize: 'var(--type-title)' }}>
                {influence}
              </div>
            </div>
            <div className="eco-card__text">{policy?.description ?? ''}</div>
          </div>
        ))}

        {noInfluence ? (
          <p className="eco-empty" style={{ padding: 0 }}>
            You hold no influence this round, so you can only abstain.
          </p>
        ) : (
          <div>
            <div className="eco-decision__question">
              Split your {self.influence} influence
            </div>
            <Stepper
              value={toA}
              min={0}
              max={self.influence}
              step={1}
              caption="To option A — the remainder goes to B"
              onChange={setToA}
            />
          </div>
        )}

        <p className="eco-empty" style={{ padding: 0 }}>
          Allocations stay hidden until the vote closes.
        </p>
      </div>
    </Sheet>
  );
};
