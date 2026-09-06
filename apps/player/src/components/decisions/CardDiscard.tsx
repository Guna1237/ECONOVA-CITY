import type { ReactElement } from 'react';

import { GAME_CONFIG } from '@econova/game-content';
import { Button, GameCard, Sheet } from '@econova/ui';

import { usePlayerSession } from '../../state/PlayerSession.js';

/** Over the hand limit. One card goes, and the player chooses which. */
export const CardDiscard = (): ReactElement | null => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const { public: view, self } = projection;

  const mine = view.turn?.playerId === self.playerId;
  if (!mine || view.turn?.stage !== 'awaiting_card_discard' || !can('discard_card')) {
    return null;
  }

  const over = self.cards.length - GAME_CONFIG.strategyCardHandLimit;

  return (
    <Sheet
      title="Over the hand limit"
      kicker={`Keep ${GAME_CONFIG.strategyCardHandLimit} cards`}
      onClose={() => undefined}
    >
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>
        <p className="eco-empty" style={{ padding: 0, textAlign: 'left' }}>
          Discard {over > 0 ? over : 1} card
          {over > 1 ? 's' : ''} to continue.
        </p>
        {self.cards.map((cardId) => {
          const key = `discard:${cardId}`;
          return (
            <div key={cardId} style={{ display: 'grid', gap: 'var(--s2)' }}>
              <GameCard cardId={cardId} />
              <Button
                tone="risk"
                size="sm"
                block
                request={requestState(key)}
                onClick={() =>
                  dispatch(key, { type: 'discard_card', cardId: cardId as never })
                }
              >
                Discard
              </Button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};
