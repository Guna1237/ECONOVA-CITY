import type { ReactElement } from 'react';

import { STRATEGY_CARD_BY_ID } from '@econova/game-content';

import { StrategyCardArt } from '../marks/CardArt.js';
import { CARD_TIMING_LABEL } from '../theme.js';

export interface GameCardProps {
  readonly cardId: string;
  readonly selected?: boolean;
  /** False when the current stage does not permit this card's timing. */
  readonly playable?: boolean;
  readonly onSelect?: (cardId: string) => void;
}

/**
 * A Strategy Card as a physical object: it lifts when chosen and states its
 * own timing and action cost, because those are what make it playable now
 * or not. Text is canonical, taken straight from the content package.
 */
export const GameCard = ({
  cardId,
  selected = false,
  playable = true,
  onSelect
}: GameCardProps): ReactElement | null => {
  const card = STRATEGY_CARD_BY_ID.get(cardId);
  if (card === undefined) return null;

  const body = (
    <>
      <span className="eco-card__head">
        <span className="eco-card__timing">
          {CARD_TIMING_LABEL[card.timing] ?? card.timing}
        </span>
        <span className="eco-card__cost" aria-label={
          card.actionCost === 0 ? 'Free, costs no action' : 'Costs one action'
        }>
          {card.actionCost === 0 ? 'FREE' : '1 ACTION'}
        </span>
      </span>

      <span className="eco-card__art" aria-hidden="true">
        <StrategyCardArt cardId={card.id} />
      </span>

      <span className="eco-card__name">{card.name}</span>
      <span className="eco-card__rule" aria-hidden="true" />
      <span className="eco-card__text">{card.description}</span>
    </>
  );

  if (onSelect === undefined) {
    return (
      <div className="eco-card" data-playable={playable}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="eco-card"
      data-selected={selected}
      data-playable={playable}
      aria-pressed={selected}
      onClick={() => onSelect(cardId)}
    >
      {body}
    </button>
  );
};
