import { useState, type ReactElement } from 'react';
import { Button, NovaArt, Sheet } from '@econova/ui';

export const HowToPlay = (): ReactElement => {
  const [open, setOpen] = useState(false);
  return <>
    <Button tone="quiet" size="sm" onClick={() => setOpen(true)}>How to play</Button>
    {open ? <Sheet title="How to play" kicker="A quick guide to ECONOVA: CITY" onClose={() => setOpen(false)}>
      <div className="player-guide">
        <div className="player-guide__intro">
          <NovaArt kind="trophy" />
          <div><h3>Build the highest score.</h3><p>You have 8 rounds. Buy properties, improve them, and work toward your secret objective. Having the most Credits is only part of winning.</p></div>
        </div>
        <p className="player-guide__timer" role="note">The game keeps running while you read. Close this guide to return to your decision.</p>
        <h3>Your turn, in three steps</h3>
        <ol className="player-guide__steps">
          <li><NovaArt kind="dice" /><div><strong>Roll and move</strong><p>Tap Roll when it is your turn. The game moves your piece and applies movement effects.</p></div></li>
          <li><NovaArt kind="property" /><div><strong>Resolve your space</strong><p>Buy an unowned property, start an auction, or leave it. Pay a landing fee or make the choice shown on your phone.</p></div></li>
          <li><NovaArt kind="influence" /><div><strong>Use your available Actions</strong><p>You normally have 2 Actions: develop, use Influence, trade, or play a card at its allowed time. Check your remaining count, then end your turn.</p></div></li>
        </ol>
        <details><summary>Reading the board</summary><p>The coloured outer bands show districts. A numbered marker identifies a property's owner; match the number to a player in the Players tab. The dark outline marks the current player's space.</p><p>Tap a property to see its full name, owner, development, and costs. The centre shows the current turn and district Demand. A base price is a printed reference, not necessarily the amount you will pay.</p></details>
        <details><summary>Properties, income, and development</summary><p>Properties earn income at the end of each round. Development improves income, landing fees, and final value. You can develop a property you own without standing on it, but not one bought this turn. Buying your landing property does not use an Action.</p></details>
        <details><summary>Using Influence and trading</summary><p>When allowed, spend 1 Influence and 1 Action to raise or lower a district's Demand by 1. Demand changes property income and landing fees. Policies can restrict this action.</p><p>A trade lets you offer Credits or properties in exchange for another player's. Review both sides carefully. Nothing changes hands unless the other player accepts.</p></details>
        <details><summary>Cards and your secret objective</summary><p>Follow each card's timing and cost. Play at most one card per turn. Insurance Policy is a reaction before landing-fee payment and uses 1 Action. Your chosen secret objective earns 200 points if its condition is met at game end. Other players cannot see it.</p></details>
        <details><summary>Auctions and Council votes</summary><p>Auctions allow up to 30 seconds for one sealed bid or a pass. Highest bid wins; ties use the current round's turn order. Auctions can finish early when everyone responds.</p><p>Council meets in Rounds 3 and 6. Spend Influence on either policy, split it, or abstain. You can keep some Influence. Voting lasts up to 45 seconds; ties go to Option A. Only the totals and winning policy are public.</p></details>
        <details><summary>Timers and landing fees</summary><p>A normal turn lasts 60 seconds. Auctions and emergency property sales pause that timer and use their own 30 seconds. An operator pause freezes timers.</p><p>If you cannot pay a landing fee, choose properties to sell for half their current value, rounded down. On timeout or disconnect, automatic sales start with the lowest liquidation value, then lowest property ID for ties. If you still cannot pay fully, you pay your remaining Credits and stay in the game.</p></details>
        <details><summary>How your final score works</summary><p>After Round 8, add remaining Credits, property values, district-control bonuses, 10 points per remaining Influence, and 200 for a completed secret objective. The highest total wins.</p></details>
        <details><summary>If your connection drops</summary><p>Keep this tab open and let it reconnect. Do not join as a new player. If an action could not be confirmed, review your refreshed board and resources before continuing. Ask your organizer for help if you cannot recover your seat.</p></details>
      </div>
    </Sheet> : null}
  </>;
};
