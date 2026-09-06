import type { CSSProperties, ReactElement } from 'react';

import {
  GAME_CONFIG,
  OBJECTIVE_BY_ID,
  PROPERTY_BY_ID,
  STRATEGY_CARD_BY_ID
} from '@econova/game-content';
import {
  Button,
  CARD_TIMING_LABEL,
  GameCard,
  PropertyInspector,
  PropertyRecord,
  SeatPiece,
  formatCredits,
  seatOf
} from '@econova/ui';

import { usePlayerSession } from '../state/PlayerSession.js';

/* -----------------------------------------------------------------
 * Holdings — what I own, and what I can do with it.
 * -------------------------------------------------------------- */

export const HoldingsPanel = ({
  onInspect
}: {
  readonly onInspect: (propertyId: string) => void;
}): ReactElement => {
  const { projection } = usePlayerSession();
  const { public: view, self } = projection;

  if (self.propertyIds.length === 0) {
    return (
      <p className="eco-empty">
        You hold no properties yet. Land on an unowned space to buy one.
      </p>
    );
  }

  const seat = seatOf(self.playerId, view.turnOrder);

  return (
    <div>
      {self.propertyIds.map((propertyId) => {
        const record = view.properties.find((entry) => entry.propertyId === propertyId);
        return (
          <PropertyRecord
            key={propertyId}
            propertyId={propertyId}
            ownerSeat={seat}
            developmentLevel={record?.developmentLevel ?? 0}
            onSelect={onInspect}
          />
        );
      })}
    </div>
  );
};

/* -----------------------------------------------------------------
 * Property inspection — including the actions this space allows now.
 * -------------------------------------------------------------- */

export const PropertyPanel = ({
  propertyId,
  onClose
}: {
  readonly propertyId: string;
  readonly onClose: () => void;
}): ReactElement | null => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const { public: view, self } = projection;

  const definition = PROPERTY_BY_ID.get(propertyId);
  const record = view.properties.find((entry) => entry.propertyId === propertyId);
  if (definition === undefined || record === undefined) return null;

  const owner =
    record.ownerId === null
      ? null
      : view.players.find((player) => player.playerId === record.ownerId) ?? null;
  const mine = record.ownerId === self.playerId;
  const level = record.developmentLevel;

  const developKey = `develop:${propertyId}`;
  const buyKey = `buy:${propertyId}`;

  const nextLevelCost = level === 3 ? null : definition.developmentCosts[level];
  const canDevelop =
    mine && nextLevelCost !== null && can('develop_property');
  const canBuy = record.ownerId === null && can('buy_property');

  return (
    <>
      <PropertyInspector
        propertyId={propertyId}
        ownerLabel={owner === null ? 'Unowned' : mine ? 'Yours' : owner.name}
        ownerSeat={owner === null ? null : seatOf(owner.playerId, view.turnOrder)}
        developmentLevel={level}
      />

      {canBuy || canDevelop ? (
        <div className="player-actions">
          {canBuy ? (
            <Button
              tone="commit"
              block
              request={requestState(buyKey)}
              hint={formatCredits(definition.basePrice)}
              onClick={() =>
                dispatch(buyKey, { type: 'buy_property', propertyId: propertyId as never })
              }
            >
              Buy this property
            </Button>
          ) : null}
          {canDevelop ? (
            <Button
              tone="primary"
              block
              request={requestState(developKey)}
              hint={formatCredits(nextLevelCost ?? 0)}
              onClick={() =>
                dispatch(developKey, {
                  type: 'develop_property',
                  propertyId: propertyId as never
                })
              }
            >
              Develop to level {level + 1}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 'var(--s3)' }}>
        <Button tone="quiet" block onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
};

/* -----------------------------------------------------------------
 * Strategy cards — a hand, held.
 * -------------------------------------------------------------- */

const TIMING_FOR_STAGE: Readonly<Record<string, readonly string[]>> = {
  awaiting_roll: ['before_roll'],
  after_roll_before_move: ['after_roll_before_move'],
  awaiting_shortcut_choice: ['after_roll_before_move'],
  awaiting_property_decision: ['before_buy'],
  landing_fee_reaction: ['landing_fee_reaction'],
  action_phase: ['action_phase']
};

export const CardsPanel = (): ReactElement => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const { public: view, self } = projection;

  const stage = view.turn?.stage ?? '';
  const mine = view.turn?.playerId === self.playerId;
  const allowedTimings = TIMING_FOR_STAGE[stage] ?? [];

  if (self.cards.length === 0) {
    return (
      <p className="eco-empty">
        No strategy cards in hand. You draw at the start of each round, up to a
        hand limit of {GAME_CONFIG.strategyCardHandLimit}.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s3)' }}>
      {self.cards.map((cardId) => {
        const card = STRATEGY_CARD_BY_ID.get(cardId);
        const playable =
          mine && can('play_card') && card !== undefined && allowedTimings.includes(card.timing);
        const key = `card:${cardId}`;
        return (
          <div key={cardId} style={{ display: 'grid', gap: 'var(--s2)' }}>
            <GameCard cardId={cardId} playable={playable} />
            {playable ? (
              <Button
                tone="primary"
                size="sm"
                block
                request={requestState(key)}
                onClick={() =>
                  dispatch(key, { type: 'play_card', cardId: cardId as never })
                }
              >
                Play card
              </Button>
            ) : (
              <p className="eco-card__note">
                Playable {(CARD_TIMING_LABEL[card?.timing ?? ''] ?? 'later').toLowerCase()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* -----------------------------------------------------------------
 * Secret objective — mine alone.
 * -------------------------------------------------------------- */

export const ObjectivePanel = (): ReactElement => {
  const { projection } = usePlayerSession();
  const { self } = projection;

  if (self.objectiveId === null) {
    return <p className="eco-empty">Your objective has not been assigned yet.</p>;
  }

  const objective = OBJECTIVE_BY_ID.get(self.objectiveId);
  if (objective === undefined) {
    return <p className="eco-empty">Objective unavailable.</p>;
  }

  return (
    <div className="eco-decision">
      <div className="eco-decision__question">Yours alone — no one else can see this</div>
      <div className="eco-card" style={{ minHeight: 0 }}>
        <span className="eco-card__timing">Secret objective</span>
        <span className="eco-card__name">{objective.name}</span>
        <span className="eco-card__rule" aria-hidden="true" />
        <span className="eco-card__text">{objective.description}</span>
        <span className="eco-card__cost">
          Worth {formatCredits(objective.score)} at scoring
        </span>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------
 * Roster — public standing of everyone at the table.
 * -------------------------------------------------------------- */

export const RosterPanel = (): ReactElement => {
  const { projection } = usePlayerSession();
  const { public: view, self } = projection;

  return (
    <div className="player-roster">
      {view.turnOrder.map((playerId) => {
        const player = view.players.find((entry) => entry.playerId === playerId);
        if (player === undefined) return null;
        const seat = seatOf(playerId, view.turnOrder);
        const isCurrent = view.turn?.playerId === playerId;

        return (
          <div
            key={playerId}
            className="player-roster__row"
            data-current={isCurrent}
            style={{ '--seat': seat.color } as CSSProperties}
          >
            <SeatPiece shape={seat.shape} className="player-roster__piece" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>
                {player.name}
                {playerId === self.playerId ? ' (you)' : ''}
              </div>
              <div className="eco-label">
                {player.propertyIds.length} propert
                {player.propertyIds.length === 1 ? 'y' : 'ies'}
                {player.connected ? '' : ' · disconnected'}
              </div>
            </div>
            <div className="eco-num" style={{ color: 'var(--ink-soft)' }}>
              #{seat.index + 1}
            </div>
          </div>
        );
      })}
      <p className="eco-empty" style={{ padding: 'var(--s3) 0 0' }}>
        Credits, influence, cards and objectives stay private to each player.
      </p>
    </div>
  );
};
