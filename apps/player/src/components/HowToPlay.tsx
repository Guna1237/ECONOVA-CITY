import { useState, type ReactElement } from 'react';
import { Button, NovaArt, Sheet } from '@econova/ui';
import { BOARD_HELP, BoardHelpContent, boardHelpTitle, type BoardHelpTopic } from './BoardHelp.js';

export const QuickStartGuide = (): ReactElement => <div className="player-guide">
  <div className="player-guide__intro">
    <NovaArt kind="trophy" />
    <div><h3>Highest score wins.</h3><p>8 rounds. Buy properties, improve them, and complete your secret objective. Credits are only part of your score.</p></div>
  </div>
  <h3>Your turn</h3>
  <ol className="player-guide__steps">
    <li><NovaArt kind="dice" /><div><strong>1. Roll</strong><p>Tap Roll. Your piece moves automatically.</p></div></li>
    <li><NovaArt kind="property" /><div><strong>2. Follow the prompt</strong><p>Buy, auction, or pass on an unowned property. Pay a fee or resolve an event when asked.</p></div></li>
    <li><NovaArt kind="influence" /><div><strong>3. Act, then end your turn</strong><p>You normally get 2 Actions. Develop a property, trade, use Influence, or play a card when allowed.</p></div></li>
  </ol>
  <p className="player-guide__takeaway">Buying your landing property does not use an Action. You do not have to use both Actions.</p>
  <p className="player-help-clock" role="note">Reading help does not pause the game. Watch the timer on your phone.</p>

  <h3>Look it up when you need it</h3>
  <details><summary>What do the special spaces do?</summary>
    <div className="player-guide__places">
      {(Object.keys(BOARD_HELP) as BoardHelpTopic[]).map((topic) => <details key={topic}>
        <summary><NovaArt kind={BOARD_HELP[topic].art} />{boardHelpTitle(topic)}</summary>
        <BoardHelpContent topic={topic} />
      </details>)}
    </div>
  </details>
  <details><summary>How do I read the board?</summary><ul>
    <li>Coloured edge: the property’s district.</li>
    <li>Numbered marker: its owner. Match the number in Players.</li>
    <li>Dark outline: the current player’s space.</li>
    <li>Tap any space for details. The printed base price is not always the price you pay.</li>
  </ul></details>
  <details><summary>What can I do with my 2 Actions?</summary><ul>
    <li><strong>Develop:</strong> improve an eligible property you own, even if you are not standing on it. You cannot develop one bought this turn.</li>
    <li><strong>Influence:</strong> spend 1 Influence and 1 Action to move a district’s Demand up or down by 1, when allowed. Demand changes income and landing fees.</li>
    <li><strong>Trade:</strong> offer Credits or properties. A deal only happens when the other player accepts.</li>
    <li><strong>Play a card:</strong> follow its timing and cost. At most one card per turn. Insurance is an exception you play before a landing fee; it still uses 1 Action.</li>
  </ul></details>
  <details><summary>How do I earn points?</summary><p>Properties earn Credits at the end of each round. Development improves their income, landing fees, and final value.</p><p>Your final score adds Credits, property values, district-control bonuses, 10 points per unspent Influence, and 200 points for a completed secret objective.</p></details>
  <details><summary>An auction appeared. What do I do?</summary><p>Enter one sealed bid or pass within 30 seconds. The highest bid wins. A tie goes to the earlier player in this round’s turn order. Bidding can close early if everyone responds.</p></details>
  <details><summary>I cannot afford a landing fee</summary><p>The game lets you choose properties to sell for half their current value, rounded down. You have 30 seconds.</p><p>If time runs out or you disconnect, the game sells the lowest liquidation-value properties first (lowest property ID breaks ties). If you still cannot pay fully, you pay your remaining Credits and stay in the game.</p></details>
  <details><summary>How much time do I have?</summary><p>A normal turn is 45 seconds, with a warning when 15 seconds remain. Auctions and emergency sales pause that timer and use their own 30 seconds. Council voting has 45 seconds. An operator pause freezes the timers.</p></details>
  <details><summary>My connection dropped</summary><p>Keep this tab open and let it reconnect. Do not join as a new player. Check your refreshed board and resources before trying an unconfirmed action again. Ask your organizer if your seat does not recover.</p></details>
</div>;

export const HowToPlay = (): ReactElement => {
  const [open, setOpen] = useState(false);
  return <>
    <Button tone="quiet" size="sm" onClick={() => setOpen(true)}>How to play</Button>
    {open ? <Sheet title="How to play" onClose={() => setOpen(false)}
      footer={<Button onClick={() => setOpen(false)}>Got it</Button>}>
      <QuickStartGuide />
    </Sheet> : null}
  </>;
};
