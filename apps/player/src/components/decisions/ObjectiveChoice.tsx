import type { ReactElement } from 'react';

import { OBJECTIVE_BY_ID } from '@econova/game-content';
import { Sheet, formatCredits } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/** Two objectives, one choice, kept private for the rest of the game. */
export const ObjectiveChoice = (): ReactElement | null => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const offer = projection.self.objectiveOffer;
  if (offer === null || !can('choose_objective')) return null;

  return (
    <Sheet
      title="Choose your secret objective"
      kicker="No one else will see this"
      onClose={() => undefined}
    >
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        {offer.map((objectiveId) => {
          const objective = OBJECTIVE_BY_ID.get(objectiveId);
          if (objective === undefined) return null;
          const key = `objective:${objectiveId}`;
          return (
            <button
              key={objectiveId}
              type="button"
              className="eco-option"
              data-chosen={requestState(key) !== 'idle'}
              onClick={() =>
                dispatch(key, {
                  type: 'choose_objective',
                  objectiveId: objectiveId as never
                })
              }
            >
              <span className="eco-card__name">{objective.name}</span>
              <span className="eco-card__text">{objective.description}</span>
              <span className="eco-card__cost">
                {formatCredits(objective.score)} at scoring
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
};
