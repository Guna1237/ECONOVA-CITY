import type { CSSProperties, ReactElement } from 'react';

import { PROPERTY_BY_ID, BOARD_SPACES, GAME_CONFIG } from '@econova/game-content';
import {
  BoardMark,
  Button,
  CardMark,
  ObjectiveMark,
  PropertyMark,
  formatCredits,
  seatOf
} from '@econova/ui';

import { usePlayerSession } from '../state/PlayerSession.js';
import { HINTS, briefFor } from '../state/briefing.js';
import { useHints } from '../state/useHints.js';
import {
  CardsPanel,
  HoldingsPanel,
  ObjectivePanel,
  RosterPanel
} from './Panels.js';

export type PanelId = 'holdings' | 'cards' | 'objective' | 'roster' | null;

/**
 * The dock changes with the stage. It never lists every possible action —
 * it presents the decision the rules are waiting on, and the four places a
 * player might want to look while waiting.
 */
export const ActionDock = ({
  panel,
  onPanel,
  onInspectSpace,
  onTrade,
  wide
}: {
  readonly panel: PanelId;
  readonly onPanel: (panel: PanelId) => void;
  readonly onInspectSpace: (propertyId: string) => void;
  readonly onTrade: () => void;
  /** Wide layouts stand the panels up beside the board instead of hiding
      them behind tabs — there is room, so nothing needs to be reached for. */
  readonly wide: boolean;
}): ReactElement => {
  const { projection, dispatch, requestState, can } = usePlayerSession();
  const { public: view, self } = projection;

  const mine = view.turn?.playerId === self.playerId;
  const stage = view.turn?.stage ?? null;
  const seat = seatOf(self.playerId, view.turnOrder);

  const me = view.players.find((player) => player.playerId === self.playerId);
  const space = me === undefined ? undefined : BOARD_SPACES[me.position];
  const standingOn =
    space !== undefined && space.type === 'property' ? space.propertyId : null;
  const standingRecord =
    standingOn === null
      ? undefined
      : view.properties.find((entry) => entry.propertyId === standingOn);
  const standingDefinition = standingOn === null ? undefined : PROPERTY_BY_ID.get(standingOn);

  const currentName =
    view.turn === null
      ? null
      : view.players.find((player) => player.playerId === view.turn?.playerId)?.name ?? null;

  /* The situation, stated with hierarchy, and the note that explains it. */
  const briefing = briefFor(projection);
  const hints = useHints();
  const showHint = hints.shouldShow(briefing.hint);

  /* ---- what the dock offers ------------------------------------- */

  let actions: ReactElement | null = null;

  if (!mine) {
    /* Another player is up — the briefing says who, and we offer nothing. */
  } else if (stage === 'awaiting_roll') {
    actions = (
      <Button
        tone="primary"
        block
        request={requestState('roll')}
        disabled={!can('roll')}
        title={can('roll') ? undefined : 'The city is still resolving the last action'}
        onClick={() => dispatch('roll', { type: 'roll' })}
      >
        Roll the dice
      </Button>
    );
  } else if (stage === 'awaiting_shortcut_choice') {
    actions = (
      <>
        <Button
          tone="quiet"
          request={requestState('shortcut-no')}
          onClick={() =>
            dispatch('shortcut-no', { type: 'choose_shortcut', useShortcut: false })
          }
        >
          Move forward
        </Button>
        <Button
          tone="primary"
          request={requestState('shortcut-yes')}
          onClick={() =>
            dispatch('shortcut-yes', { type: 'choose_shortcut', useShortcut: true })
          }
        >
          Move backward
        </Button>
      </>
    );
  } else if (stage === 'awaiting_property_decision' && standingOn !== null) {
    actions = (
      <>
        <Button
          tone="quiet"
          request={requestState('decline')}
          onClick={() =>
            dispatch('decline', {
              type: 'decline_property',
              propertyId: standingOn as never
            })
          }
        >
          Decline
        </Button>
        <Button
          tone="commit"
          request={requestState('buy-dock')}
          hint={formatCredits(standingDefinition?.basePrice ?? 0)}
          disabled={!can('buy_property')}
          title={
            can('buy_property')
              ? undefined
              : self.credits < (standingDefinition?.basePrice ?? 0)
                ? `You hold ${formatCredits(self.credits)} and this costs ${formatCredits(standingDefinition?.basePrice ?? 0)}`
                : 'Buying is not available right now'
          }
          onClick={() =>
            dispatch('buy-dock', {
              type: 'buy_property',
              propertyId: standingOn as never
            })
          }
        >
          Buy
        </Button>
      </>
    );
  } else if (stage === 'action_phase') {
    const remaining = view.turn?.actionsRemaining ?? 0;
    const level = standingRecord?.developmentLevel ?? 0;
    const ownHere = standingRecord?.ownerId === self.playerId;
    const maxed = level >= GAME_CONFIG.maximumDevelopmentLevel;
    const developReason =
      standingOn === null
        ? 'Stand on one of your properties to develop it'
        : !ownHere
          ? 'You can only develop a property you own'
          : maxed
            ? 'This property is already at level 3'
            : !can('develop_property')
              ? remaining === 0
                ? 'No actions left this turn'
                : 'Developing is not available right now'
              : null;

    const tradeReason = !can('propose_trade')
      ? remaining === 0
        ? 'No actions left this turn'
        : 'Trading is not available right now'
      : null;

    actions = (
      <>
        <Button
          tone="primary"
          disabled={developReason !== null}
          title={developReason ?? undefined}
          onClick={() => (standingOn === null ? undefined : onInspectSpace(standingOn))}
        >
          Develop
        </Button>
        <Button
          tone="default"
          disabled={tradeReason !== null}
          title={tradeReason ?? undefined}
          onClick={onTrade}
        >
          Trade
        </Button>
        <Button
          tone="commit"
          request={requestState('end')}
          disabled={!can('end_turn')}
          title={can('end_turn') ? undefined : 'The city is still resolving an action'}
          onClick={() => dispatch('end', { type: 'end_turn' })}
        >
          End turn
        </Button>
      </>
    );
  } else {
    /* A stage the rules resolve on their own, or one a decision sheet owns. */
  }

  const tabs: readonly {
    id: Exclude<PanelId, null>;
    label: string;
    Icon: typeof BoardMark;
    count?: number;
  }[] = [
    { id: 'holdings', label: 'Holdings', Icon: PropertyMark, count: self.propertyIds.length },
    { id: 'cards', label: 'Cards', Icon: CardMark, count: self.cards.length },
    { id: 'objective', label: 'Goal', Icon: ObjectiveMark },
    { id: 'roster', label: 'Players', Icon: BoardMark }
  ];

  return (
    <div className="eco-dock player-dock">
      <div className="player-brief" data-tone={briefing.tone}>
        <div className="player-brief__line">
          <span
            className="player-dock__you"
            style={{ '--seat': seat.color } as CSSProperties}
          >
            You · #{seat.index + 1}
          </span>
          {briefing.roll === null ? null : (
            <span className="player-brief__roll">Rolled {briefing.roll}</span>
          )}
        </div>

        <h2 className="player-brief__headline">{briefing.headline}</h2>
        {briefing.detail === null ? null : (
          <p className="player-brief__detail">{briefing.detail}</p>
        )}

        {showHint && briefing.hint !== null ? (
          <p className="player-brief__hint">
            <span>{HINTS[briefing.hint]}</span>
            <button
              type="button"
              onClick={() => hints.dismiss(briefing.hint!)}
              aria-label="Dismiss this tip"
            >
              Got it
            </button>
          </p>
        ) : null}
      </div>

      {actions === null ? null : (
        <div className="eco-dock__actions" data-stack={false}>
          {actions}
        </div>
      )}

      {wide ? (
        <div className="player-standing eco-scroll">
          <section className="player-panel">
            <h2 className="player-panel__title">
              <PropertyMark width={16} height={16} />
              Holdings
              <span>{self.propertyIds.length}</span>
            </h2>
            <HoldingsPanel onInspect={onInspectSpace} />
          </section>

          <section className="player-panel">
            <h2 className="player-panel__title">
              <CardMark width={16} height={16} />
              Strategy cards
              <span>{self.cards.length}</span>
            </h2>
            <CardsPanel />
          </section>

          <section className="player-panel">
            <h2 className="player-panel__title">
              <ObjectiveMark width={16} height={16} />
              Secret objective
            </h2>
            <ObjectivePanel />
          </section>

          <section className="player-panel">
            <h2 className="player-panel__title">
              <BoardMark width={16} height={16} />
              At the table
            </h2>
            <RosterPanel />
          </section>
        </div>
      ) : (
        <div className="eco-dock__tabs">
          {tabs.map(({ id, label, Icon, count }) => (
            <button
              key={id}
              type="button"
              className="eco-dock__tab"
              data-active={panel === id}
              aria-pressed={panel === id}
              onClick={() => onPanel(panel === id ? null : id)}
            >
              <Icon />
              <span>{label}</span>
              {count !== undefined && count > 0 ? (
                <span className="eco-dock__tab-count">{count}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
