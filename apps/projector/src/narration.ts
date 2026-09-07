/*
 * What the room is watching, in one line.
 *
 * A spectator standing several metres away should be able to tell what the
 * current player is doing without reading the board. This turns the public
 * projection into that sentence.
 *
 * Public state only — it takes the projector projection, which carries no
 * private player information, so nothing here can leak a hand, a bid or an
 * objective onto a screen the whole room can see.
 */

import { BOARD_SPACES, PROPERTY_BY_ID } from '@econova/game-content';
import type { PublicProjectionDto } from '@econova/contracts';

const propertyAt = (view: PublicProjectionDto, playerId: string): string | null => {
  const player = view.players.find((entry) => entry.playerId === playerId);
  if (player === undefined) return null;
  const space = BOARD_SPACES[player.position];
  if (space === undefined) return null;
  return space.type === 'property'
    ? PROPERTY_BY_ID.get(space.propertyId)?.name ?? space.name
    : space.name;
};

/** A short present-tense line, or null when there is nothing to narrate. */
export const narrate = (view: PublicProjectionDto): string | null => {
  if (view.phase === 'council') return 'City council in session';
  if (view.phase === 'breaking_news') return 'Breaking news';
  if (view.phase === 'strategy_draw') return 'Drawing strategy cards';
  if (view.phase === 'round_resolution') return 'Settling the round';
  if (view.phase === 'objective_selection') return 'Choosing secret objectives';
  if (view.phase === 'paused') return 'Paused by the operator';

  const turn = view.turn;
  if (turn === null) return null;

  const where = propertyAt(view, turn.playerId);

  switch (turn.stage) {
    case 'awaiting_roll':
      return 'Rolling the dice';
    case 'awaiting_shortcut_choice':
      return 'Choosing a shortcut';
    case 'awaiting_property_decision':
      return where === null ? 'Deciding on a property' : `Deciding on ${where}`;
    case 'auction':
      return view.auction === null
        ? 'Auction under way'
        : `Auction — ${PROPERTY_BY_ID.get(view.auction.propertyId)?.name ?? 'a property'}`;
    case 'landing_fee_reaction':
      return where === null ? 'Paying a landing fee' : `Paying a fee on ${where}`;
    case 'emergency_sale':
      return 'Raising credits';
    case 'awaiting_event_choice':
      return 'Choosing a district';
    case 'awaiting_card_discard':
      return 'Discarding a card';
    case 'action_phase':
      return turn.actionsRemaining === 0
        ? 'Finishing the turn'
        : `Taking actions · ${turn.actionsRemaining} left`;
    default:
      return null;
  }
};
