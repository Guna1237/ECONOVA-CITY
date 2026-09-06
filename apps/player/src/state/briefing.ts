/*
 * What the player is being asked, in plain language.
 *
 * The dock used to state the situation in one terse line of the same size as
 * everything around it, which left a first-time player scanning for the verb.
 * This turns the projection into a briefing with a hierarchy: a headline that
 * answers "what is happening", a detail line that answers "why it matters",
 * and — where one exists — the id of a one-off coaching note.
 *
 * Pure and derived entirely from the server projection, so it can be tested on
 * its own and can never disagree with authoritative state.
 */

import { BOARD_SPACES, GAME_CONFIG, PROPERTY_BY_ID } from '@econova/game-content';
import type { PlayerProjectionDto } from '@econova/contracts';
import { DISTRICTS, STAGE_LABEL, formatCredits } from '@econova/ui';

export type BriefingTone = 'you' | 'waiting' | 'decision' | 'alert';

/** Coaching notes are keyed so each is shown at most once per player. */
export type HintId =
  | 'roll'
  | 'buy'
  | 'fee'
  | 'develop'
  | 'influence'
  | 'council'
  | 'auction'
  | 'trade';

export const HINTS: Readonly<Record<HintId, string>> = Object.freeze({
  roll: 'Roll to move around Econova City. Where you land decides what you can do.',
  buy: 'Buying a property earns you income each round and counts toward controlling its district.',
  fee: 'Landing on a property someone else owns means paying them a fee.',
  develop: 'Developing a property raises the income it earns and the fee others pay you.',
  influence: 'Influence shifts district demand, which changes income and fees across the board.',
  council: 'The council sets a city policy. Spend influence on the option you want to win.',
  auction: 'Every bid is sealed. The highest bid takes the property when the timer ends.',
  trade: 'Trades move credits and properties between two players. Both sides must agree.'
});

export interface Briefing {
  readonly headline: string;
  readonly detail: string | null;
  readonly tone: BriefingTone;
  readonly hint: HintId | null;
  /** The roll the server committed for this turn, shown as narration. */
  readonly roll: number | null;
}

const nameOf = (
  projection: PlayerProjectionDto,
  playerId: string | undefined
): string | null =>
  projection.public.players.find((player) => player.playerId === playerId)?.name ?? null;

/**
 * Reads the projection and states the player's situation. Never invents a
 * rule: prices, names and districts all come from canonical content, and the
 * stage comes from the server.
 */
export const briefFor = (projection: PlayerProjectionDto): Briefing => {
  const { public: view, self } = projection;
  const turn = view.turn;
  const mine = turn?.playerId === self.playerId;
  const roll = mine ? (turn?.roll ?? null) : null;

  const base = { roll } as const;

  /* ---- decisions the rules are actively waiting on ---------------- */

  if (self.objectiveOffer !== null) {
    return {
      ...base,
      headline: 'Choose your objective',
      detail: 'Kept secret for the rest of the game. It is worth points at the end.',
      tone: 'decision',
      hint: null
    };
  }

  if (view.emergencySale !== null && view.emergencySale.playerId === self.playerId) {
    return {
      ...base,
      headline: 'You need to raise credits',
      detail: 'Sell a property to cover what you owe before the timer runs out.',
      tone: 'alert',
      hint: null
    };
  }

  const fee = self.pendingLandingFee;
  if (fee !== null && fee.payerId === self.playerId) {
    const property = PROPERTY_BY_ID.get(fee.propertyId);
    const owner = nameOf(projection, fee.ownerId);
    return {
      ...base,
      headline: `Pay ${formatCredits(fee.amount)}`,
      detail: `${owner ?? 'Another player'} owns ${property?.name ?? 'this property'}.`,
      tone: 'alert',
      hint: 'fee'
    };
  }

  if (view.auction !== null && self.auction !== null) {
    const property = PROPERTY_BY_ID.get(view.auction.propertyId);
    return {
      ...base,
      headline: self.auction.hasSubmitted ? 'Bid submitted' : 'Place your bid',
      detail: self.auction.hasSubmitted
        ? 'Waiting for the rest of the room.'
        : `${property?.name ?? 'A property'} is up for auction.`,
      tone: 'decision',
      hint: 'auction'
    };
  }

  if (view.council !== null && self.councilAllocation === null) {
    return {
      ...base,
      headline: 'City council',
      detail: `Split your ${self.influence} influence between the two policies.`,
      tone: 'decision',
      hint: 'council'
    };
  }

  if (self.trade !== null && self.trade.counterpartyPlayerId === self.playerId) {
    const proposer = nameOf(projection, self.trade.proposerPlayerId);
    return {
      ...base,
      headline: 'Trade offer',
      detail: `${proposer ?? 'A player'} wants to trade with you.`,
      tone: 'decision',
      hint: 'trade'
    };
  }

  if (self.pendingEventChoice !== null) {
    return {
      ...base,
      headline: 'Choose a district',
      detail: 'A city event is waiting on which district it affects.',
      tone: 'decision',
      hint: 'influence'
    };
  }

  /* ---- somebody else is up ---------------------------------------- */

  if (!mine) {
    const current = nameOf(projection, turn?.playerId);
    const stage = turn === null ? null : STAGE_LABEL[turn.stage] ?? null;
    return {
      ...base,
      headline: current === null ? 'The city is resolving' : `${current}'s turn`,
      detail: stage === null ? 'Waiting for the next player.' : `${stage}.`,
      tone: 'waiting',
      hint: null
    };
  }

  /* ---- your turn --------------------------------------------------- */

  /* The property the player is standing on, when the space is one. */
  const me = view.players.find((player) => player.playerId === self.playerId);
  const occupied = me === undefined ? undefined : BOARD_SPACES[me.position];
  const space =
    occupied !== undefined && occupied.type === 'property'
      ? PROPERTY_BY_ID.get(occupied.propertyId) ?? null
      : null;

  switch (turn?.stage) {
    case 'awaiting_roll':
      return {
        ...base,
        headline: 'Your turn',
        detail: 'Roll the dice to move.',
        tone: 'you',
        hint: 'roll'
      };

    case 'awaiting_shortcut_choice':
      return {
        ...base,
        headline: 'Take the shortcut?',
        detail: 'You can move backward by your roll instead of forward.',
        tone: 'decision',
        hint: null
      };

    case 'awaiting_property_decision': {
      if (space === null) break;
      const district = DISTRICTS[space.district];
      return {
        ...base,
        headline: `${space.name} is unowned`,
        detail: `${district.label} district · ${formatCredits(space.basePrice)} to buy.`,
        tone: 'decision',
        hint: 'buy'
      };
    }

    case 'awaiting_card_discard':
      return {
        ...base,
        headline: 'Discard a card',
        detail: `You may keep ${GAME_CONFIG.strategyCardHandLimit} strategy cards.`,
        tone: 'decision',
        hint: null
      };

    case 'action_phase': {
      const remaining = turn.actionsRemaining;
      return {
        ...base,
        headline: remaining === 0 ? 'No actions left' : 'Your actions',
        detail:
          remaining === 0
            ? 'End your turn to pass to the next player.'
            : `${remaining} of ${GAME_CONFIG.turnActions} remaining${
                space === null ? '' : ` · you are on ${space.name}`
              }.`,
        tone: 'you',
        hint: remaining === 0 ? null : 'develop'
      };
    }

    default:
      break;
  }

  return {
    ...base,
    headline: 'Your turn',
    detail:
      turn === null ? null : `${STAGE_LABEL[turn.stage] ?? 'Resolving'} — hold tight.`,
    tone: 'you',
    hint: null
  };
};
