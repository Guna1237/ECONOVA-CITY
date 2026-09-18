import { BREAKING_NEWS, SPECIAL_EVENTS, POLICY_BY_ID, PROPERTY_BY_ID } from '@econova/game-content';
import type { GameEvent, GameState } from '@econova/game-engine';
import { activityItemSchema } from '@econova/contracts';

/** Build display receipts from committed facts, never forward raw engine payloads.
 * Called before persistence; a failed commit publishes neither state nor receipts. */
export function recordActivity(before: GameState, after: GameState, events: readonly GameEvent[]): void {
  const history = [...(before.activity ?? [])];
  let sequence = 0;
  const add = (recipientPlayerId: string | null, title: string, text: string, round = before.round) => {
    if (recipientPlayerId !== null && !after.players[recipientPlayerId]) return;
    const item = activityItemSchema.parse({ id: `${after.gameId}:${after.version}:${sequence++}`, round, title, text });
    history.push({ ...item, recipientPlayerId });
  };
  const name = (id: unknown) => typeof id === 'string' ? after.players[id]?.name ?? 'A player' : 'A player';
  const propertyName = (id: unknown) => typeof id === 'string' ? PROPERTY_BY_ID.get(id)?.name ?? 'a property' : 'a property';
  const rent = (payerId: unknown, ownerId: unknown, propertyId: unknown, amount: unknown) => {
    if (typeof payerId !== 'string' || typeof ownerId !== 'string' || typeof amount !== 'number') return;
    add(ownerId, 'Rent received', `${name(payerId)} paid you ${amount} Credits for ${propertyName(propertyId)}.`);
    add(payerId, 'Rent paid', `You paid ${name(ownerId)} ${amount} Credits for ${propertyName(propertyId)}.`);
  };
  for (const event of events) {
    const p = event.payload;
    switch (event.type) {
      case 'landing_fee_paid': rent(p['payerId'], p['ownerId'], p['propertyId'], p['amount']); break;
      case 'emergency_sale_completed':
      case 'emergency_sale_auto_completed': {
        const fee = before.pendingLandingFee;
        if (fee) rent(fee.payerId, fee.ownerId, fee.propertyId, p['paid']);
        break;
      }
      case 'property_income_awarded':
        if (typeof p['playerId'] === 'string' && typeof p['amount'] === 'number')
          add(p['playerId'], 'Property income', `${propertyName(p['propertyId'])} earned you ${p['amount']} Credits.`);
        break;
      case 'trade_proposed':
      case 'trade_completed':
      case 'trade_rejected': {
        const trade = event.type === 'trade_proposed' ? after.trade : before.trade;
        if (!trade || trade.id !== p['tradeId']) break;
        const expired = events.some(e => e.type === 'turn_ended');
        const title = event.type === 'trade_proposed' ? 'Trade offered' : event.type === 'trade_completed' ? 'Trade completed' : expired ? 'Trade expired' : 'Trade declined';
        for (const id of [trade.proposerPlayerId, trade.counterpartyPlayerId]) {
          const other = id === trade.proposerPlayerId ? trade.counterpartyPlayerId : trade.proposerPlayerId;
          add(id, event.type === 'trade_proposed' && id === trade.counterpartyPlayerId ? 'Trade received' : title,
            event.type === 'trade_proposed' ? `Offer with ${name(other)}. Review it before the turn ends.` :
              event.type === 'trade_completed' ? `Your trade with ${name(other)} is complete. Credits and properties have been transferred.` :
                expired ? 'The turn ended before this offer was accepted. Nothing was exchanged.' : `${id === trade.counterpartyPlayerId ? 'You' : name(trade.counterpartyPlayerId)} declined the offer. Nothing was exchanged.`);
        }
        break;
      }
      case 'council_resolved': {
        const policy = typeof p['winnerId'] === 'string' ? POLICY_BY_ID.get(p['winnerId']) : undefined;
        if (policy) add(null, 'Policy passed', `${policy.name}. ${policy.description}`, after.round);
        break;
      }
      case 'breaking_news_revealed': {
        const news = BREAKING_NEWS.find(n => n.id === p['eventId']);
        if (news) add(null, 'City news', `${news.name}. ${news.description}`, after.round);
        break;
      }
      case 'special_event_revealed': {
        const event = SPECIAL_EVENTS.find(entry => entry.id === p['eventId']);
        if (event) add(null, 'Special event', `${name(p['playerId'])}: ${event.name}. ${event.description}`);
        break;
      }
    }
  }
  // Private balance receipts cover card rewards, bonuses, purchases and other
  // changes without guessing their cause from a net balance delta.
  for (const [id, player] of Object.entries(after.players)) {
    const old = before.players[id];
    if (!old) continue;
    const credits = player.credits - old.credits;
    const influence = player.influence - old.influence;
    const cards = player.cards.length - old.cards.length;
    const parts = [credits ? `${credits > 0 ? '+' : ''}${credits} Credits (balance ${player.credits})` : '',
      influence ? `${influence > 0 ? '+' : ''}${influence} Influence (now ${player.influence})` : '',
      cards > 0 ? `${cards} strategy card${cards === 1 ? '' : 's'} received` : ''].filter(Boolean);
    if (parts.length) add(id, 'Your resources', parts.join(' · '));
  }
  // Forty entries per audience prevents another player's actions evicting yours.
  const counts = new Map<string | null, number>();
  after.activity = history.reverse().filter(item => {
    const count = (counts.get(item.recipientPlayerId) ?? 0) + 1;
    counts.set(item.recipientPlayerId, count);
    return count <= 40;
  }).reverse();
}
