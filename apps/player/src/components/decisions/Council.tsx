import { useState } from 'react';
import type { ReactElement } from 'react';

import { GAME_CONFIG, POLICY_BY_ID } from '@econova/game-content';
import { Button, Sheet, Stepper, Timer } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';
import { HowToPlay } from '../HowToPlay.js';

/**
 * Council is a different kind of turn: no board movement, one political
 * decision, everyone at once. Influence is split between two policies and
 * the split stays hidden until the vote closes.
 */
export const Council = (): ReactElement | null => {
  const { projection, dispatch, requestState } = usePlayerSession();
  const { public: view, self } = projection;
  /*
   * Two independent allocations, not one split. The rules let a player back
   * only one policy, spend part of their Influence, or abstain outright, and
   * Influence kept is worth points at scoring, so deriving B from A would
   * quietly spend everything they hold on every vote.
   */
  const [toA, setToA] = useState(0);
  const [toB, setToB] = useState(0);

  const council = view.council;
  if (council === null || self.councilAllocation !== null) return null;

  const spent = toA + toB;
  const kept = self.influence - spent;

  const options = [
    {
      letter: 'A' as const,
      policy: POLICY_BY_ID.get(council.optionAId),
      influence: toA,
      set: setToA
    },
    {
      letter: 'B' as const,
      policy: POLICY_BY_ID.get(council.optionBId),
      influence: toB,
      set: setToB
    }
  ];

  const noInfluence = self.influence === 0;
  const submit = (optionAInfluence: number, optionBInfluence: number) =>
    dispatch('council', {
      type: 'council_vote',
      councilId: council.councilId,
      optionAInfluence,
      optionBInfluence
    });

  return (
    <Sheet
      title="City council"
      kicker={`Round ${view.round} policy vote`}
      onClose={() => undefined}
      dismissible={false}
      headerAction={<HowToPlay />}
      footer={
        <div style={{ display: 'grid', gap: 'var(--s2)' }}>
          <Button
            tone="primary"
            block
            request={requestState('council')}
            onClick={() => submit(toA, toB)}
          >
            {spent === 0
              ? 'Abstain, keep all influence'
              : `Submit vote, spend ${spent} of ${self.influence}`}
          </Button>
          {noInfluence || spent === 0 ? null : (
            <Button tone="quiet" block onClick={() => submit(0, 0)}>
              Abstain instead
            </Button>
          )}
        </div>
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

        {options.map(({ letter, policy, influence, set }) => (
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
            {noInfluence ? null : (
              <Stepper
                value={influence}
                min={0}
                /* Each side can only reach what is still unspent. */
                max={influence + kept}
                step={1}
                onChange={set}
              />
            )}
          </div>
        ))}

        {noInfluence ? (
          <p className="eco-empty" style={{ padding: 0 }}>
            You hold no influence this round, so you can only abstain.
          </p>
        ) : (
          <div className="eco-decision__question">
            Keeping {kept} of {self.influence} influence
            {kept > 0 ? `, worth ${kept * GAME_CONFIG.influenceFinalScoreMultiplier} points at scoring` : ''}
          </div>
        )}

        <p className="eco-empty" style={{ padding: 0 }}>
          Only the winning policy and the vote totals are public. What you
          personally put behind each option is never shown to other players.
        </p>
      </div>
    </Sheet>
  );
};
