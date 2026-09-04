# ECONOVA: CITY — Gameplay Test Matrix

**Source of truth:** `docs/GAME_DESIGN_SPEC.md` (v2.0). Do not test against any other doc where it conflicts.
**Priority key:** P0 = blocks event/launch, P1 = major gameplay bug, P2 = minor/cosmetic or rare-path.

Legend for columns: **Test ID | Scenario | Preconditions | Action | Expected Result | Priority**

---

## 1. Setup

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| SETUP-01 | Room creation | Admin logged in | Admin creates room | Room created, joinable, empty player list | P0 |
| SETUP-02 | Min/max players | Room open | 4, 5, and 6 players join separately (3 runs) | All three counts allowed to start; 3 players cannot start; 7th join rejected | P0 |
| SETUP-03 | Starting resources | Game starts | Inspect each player's state | Each player has 1,000 Credits, 5 Influence, 2 unique Strategy Cards, 0 Properties, positioned at Space 0 | P0 |
| SETUP-04 | Unique starting cards | Game starts | Compare all players' starting hands | No two players share a starting card (drawn without replacement) | P1 |
| SETUP-05 | Districts/properties initial state | Game starts | Inspect board | All 16 properties unowned, Level 0; all 4 districts at Demand 0 | P0 |
| SETUP-06 | Secret Objective deal & select | Game starts with 4, 5, or 6 players | Shuffle the same 10-objective pool; sequentially offer 2 to each player, who chooses exactly 1 before the next offer | Every player has exactly 1 private objective; chosen objectives are unique and removed; each unchosen objective returns to the bottom before the next offer | P0 |
| SETUP-07 | Turn order randomization | New game, repeated | Start several games | Turn order differs across games (random assignment) | P2 |
| SETUP-08 | Admin start gate | Players joined, admin has not started | Non-admin attempts to start game | Rejected; only admin can start | P1 |

---

## 2. Movement

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| MOVE-01 | Basic roll & move | Player's turn | Roll dice | Server generates 1–6 uniformly, applies movement modifiers, and moves by the resulting total movement distance | P0 |
| MOVE-02 | Wrap-around | Player near Space 19 | Total forward movement crosses Space 0 | Position wraps via (current + total forward movement distance) mod 20 | P0 |
| MOVE-03 | Dice fairness | Many turns sampled | Aggregate dice results | Roughly uniform distribution 1–6 | P2 |
| MOVE-04 | Rush Hour override | Player has SC01 in hand | Play SC01 before rolling | No roll occurs; result is forced 6; Entertainment bonus still applies on top | P1 |
| MOVE-05 | Shortcut backward move | Player has SC11, has rolled, applicable Entertainment modifier known | Play SC11, choose backward | Player moves backward by the same total movement distance after modifiers; no City Center passing bonus is awarded | P1 |

---

## 3. City Center

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| CC-01 | Passing City Center | Player's forward move crosses Space 0 (not landing) | Move | +150 Credits awarded once | P0 |
| CC-02 | Landing exactly on City Center | Forward move lands exactly on Space 0 | Move | +150 Credits awarded; no special event triggered; proceeds to remaining Actions | P0 |
| CC-03 | Multiple-pass protection | Move theoretically could pass 0 more than once (roll max 8 with Entertainment Full Control on 20-space board) | Move | Bonus awarded at most once per turn | P1 |
| CC-04 | Backward move does not trigger bonus | Player uses SC11 (Shortcut) and crosses or lands on Space 0 backward | Move | No +150 Credits awarded | P1 |
| CC-05 | Passing detection formula | Player at position P has total forward distance D after all modifiers, including Entertainment | Move | Bonus triggers iff the resulting forward movement crosses or lands on Space 0 | P0 |

---

## 4. Property Purchase

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| BUY-01 | Buy unowned property | Land on unowned property, sufficient Credits | Choose Buy | Credits deducted at Base Price, ownership assigned, property at Level 0 | P0 |
| BUY-02 | Insufficient funds to buy | Land on unowned property, Credits < price | Attempt Buy | Rejected; player may trigger auction instead | P0 |
| BUY-03 | Decline buy and auction | Land on unowned property | Decline both buy and auction | Property remains unowned; turn continues | P1 |
| BUY-04 | Same-turn dev restriction | Just purchased property | Attempt Develop same turn | Rejected — cannot develop property purchased this turn | P0 |
| BUY-05 | Flash Sale discount | Player has SC04 | Play SC04, then buy unowned property | Purchase price reduced by 40, minimum 40 | P1 |
| BUY-06 | Urban Expansion price reduction | BN10 active this round | Buy an undeveloped (L0) property | Price reduced by 20 this round, minimum 50 | P1 |
| BUY-07 | Purchase modifier precedence | Temporary purchase modifiers apply | Buy eligible unowned property | Base price → temporary purchase modifiers → applicable minimum purchase-price clamp → payment | P0 |

---

## 5. Auction

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| AUC-01 | Trigger auction on decline/no funds | Landing player can't or won't buy | Trigger auction | All players get sealed-bid window (30s), min bid 1 Credit | P0 |
| AUC-02 | Highest bid wins | Auction with distinct bids | Timer expires | Highest bidder pays bid to bank, gets ownership | P0 |
| AUC-03 | Triggering player may bid | Auction triggered by player X | X submits a bid | X's bid is valid and can win | P1 |
| AUC-04 | No bids | Auction runs, nobody bids | Timer expires | Property remains unowned | P1 |
| AUC-05 | Auction winner cannot develop same turn | Player wins auction | Attempt Develop same turn | Rejected (same-turn purchase restriction applies) | P0 |
| AUC-06 | No commission | Auction resolves | Check bank ledger | Full winning bid goes to bank; no commission skimmed | P2 |

---

## 6. Development

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| DEV-01 | Basic develop | Own property, not purchased this turn, Level < 3 | Use Develop action | Level +1, Credits deducted per tier cost table | P0 |
| DEV-02 | Develop twice in one turn | Two owned eligible properties (or same property twice if level allows and affordable) | Use both actions on Develop | Both upgrades apply if affordable | P1 |
| DEV-03 | Cannot develop past Level 3 | Property at Level 3 | Attempt Develop | Rejected | P0 |
| DEV-04 | Cannot develop unowned property | Property owned by another player | Attempt Develop | Rejected | P0 |
| DEV-05 | Tech district discount | Player has Tech Control (3/4 or 4/4) | Develop any property | Cost reduced by 20 (3/4) or 30 (4/4), minimum 10; discount uses most recent control state at action time | P0 |
| DEV-06 | Quick Build free upgrade | Player has SC05 | Play SC05 on owned property | Property upgrades 1 level with no Credit cost | P1 |
| DEV-07 | Insufficient funds to develop | Credits < dev cost | Attempt Develop | Rejected, no state change | P1 |
| DEV-08 | Development modifier precedence | Tech control and policy/event/card modifiers apply | Develop eligible property | Base cost → district-control discount → policy/event/card modifiers → minimum-10 clamp → payment; Quick Build still skips payment | P0 |

---

## 7. Property Income

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| INC-01 | Base income formula | Owned property at various tiers/levels/Demand | Round Resolution 4a | Income = BaseIncome + (DevLevel × DevIncomeBonus) + (Demand × DemandIncomeMultiplier) | P0 |
| INC-02 | Minimum income clamp | Negative Demand producing negative formula result | Round Resolution | Income clamped to 0, never negative | P0 |
| INC-03 | All owned properties paid | Player owns multiple properties | Round Resolution | Every owned property pays income independently | P0 |
| INC-04 | Urban Renewal double income | Player played SC08 on a property this round | Round Resolution | That property generates double income this round | P1 |
| INC-05 | Food district control bonus | Player has Food Control (3/4 or 4/4) | Round Resolution 4c | +30 (3/4) or +50 (4/4, replaces) Credits awarded | P0 |
| INC-06 | Round 8 pays income | Game reaches Round 8 Resolution | Round Resolution | Normal income paid same as other rounds | P0 |
| INC-07 | Income modifier precedence | Development, Demand, temporary, and policy modifiers apply | Round Resolution | Base → development → Demand → temporary event/card → policy → minimum-0 clamp → award Credits | P0 |

---

## 8. Landing Fees

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| FEE-01 | Base fee formula | Land on opponent-owned property | Resolve landing | Fee = BaseFee + (DevLevel × DevFeeBonus) + (Demand × DemandFeeMultiplier) | P0 |
| FEE-02 | Minimum fee clamp | Formula yields < 5 | Resolve landing | Fee clamped to 5 | P0 |
| FEE-03 | Fee paid before actions | Land on opponent property without playing SC12 | Resolve landing | Fee deducted immediately before the normal Action phase | P0 |
| FEE-04 | Own property, no fee | Land on own property | Resolve landing | No fee charged; proceed to Actions | P0 |
| FEE-05 | Toll Booth doubles fee | Owner played SC10 this round | Another player lands on that property | Fee doubled for the first player to land this round; expires end of round | P1 |
| FEE-06 | Insurance Policy reaction zeroes fee | Landing player has SC12 and has not played a card this turn | Play SC12 immediately before fee payment | Fee becomes 0; card is consumed; 1 Action is consumed; one-card-per-turn limit is used | P0 |
| FEE-07 | Recession Fears reduction | BN08 active this round | Any landing fee resolves | Fee reduced by 10, minimum 5 | P1 |
| FEE-08 | Landing-fee modifier precedence | Development, Demand, temporary, policy, and Insurance effects apply | Resolve landing | Base → development → Demand → temporary → policy → minimum-5 clamp → Insurance reaction → payment | P0 |

---

## 9. Demand

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| DEM-01 | Influence action changes Demand | Player has ≥1 Influence | Spend Influence action, ±1 on a district | Demand shifts by 1 in chosen direction, costs 1 Action + 1 Influence | P0 |
| DEM-02 | Clamp at +2 | District at Demand +2 | Apply any +Demand effect | Remains at +2 (clamped) | P0 |
| DEM-03 | Clamp at −2 | District at Demand −2 | Apply any −Demand effect | Remains at −2 (clamped) | P0 |
| DEM-04 | Demand does not affect value/cost | District Demand changed | Check property value & dev/purchase cost | Unaffected by Demand | P1 |
| DEM-05 | Market Boom / Crash cards | Player has SC02/SC03 | Play card on a district | Demand set exactly to +2 (SC02) or −2 (SC03), then clamped (no-op if already there) | P1 |

---

## 10. Influence

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| INF-01 | Starting Influence | Game start | Inspect state | Each player has 5 Influence | P0 |
| INF-02 | Mobility control bonus | Player has Mobility Control (3/4 or 4/4) | Round Resolution | +2 (3/4) or +3 (4/4, replaces) Influence awarded | P0 |
| INF-03 | Influence cannot go negative | Player spends last Influence | Spend action | Floor at 0 | P1 |
| INF-04 | Influence cannot be traded | Trade proposal includes Influence | Attempt trade | Rejected/not offerable — only Credits and Properties tradeable | P0 |
| INF-05 | Council voting spends Influence | Council phase active | Player allocates votes | Influence spent is deducted permanently regardless of outcome | P0 |
| INF-06 | Final scoring conversion | Game end | Calculate score | Remaining Influence × 10 added to Final Score | P0 |

---

## 11. District Control

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| DIST-01 | 3/4 control threshold | Player owns 3 of 4 in a district | Round Resolution 4b | Control recognized; 3/4 benefit applied | P0 |
| DIST-02 | 4/4 full control | Player owns all 4 in a district | Round Resolution 4b | Full control recognized; 4/4 benefit replaces 3/4 (not additive) | P0 |
| DIST-03 | Immediate recalculation on ownership change | Purchase/trade/emergency sale changes ownership | Ownership change event | Control recalculated immediately, not just at Round Resolution | P0 |
| DIST-04 | Entertainment movement bonus | Player has Entertainment Control | Roll dice | +1 (3/4) or +2 (4/4) added after the roll to produce total movement distance; can move beyond 6 (up to 8) | P0 |
| DIST-05 | Stacking multiple district controls | Player controls 2+ districts | Round Resolution | All applicable benefits apply simultaneously (e.g., Food credits + Tech discount) | P1 |
| DIST-06 | Losing control mid-game | Player sells/trades away 4th property | Ownership change | Control status downgraded immediately; loses future benefits and Full Control final-score eligibility | P1 |
| DIST-07 | Final score district bonus | Game end, player has 3/4 or 4/4 in a district | Final Scoring | +50 (3/4) or +100 (4/4, replaces) per district | P0 |
| DIST-08 | Full control one-time final bonus | Game end, player has 4/4 | Final Scoring | Additional +100 per fully controlled district (on top of 26.3 bonus) — total +200 | P0 |

---

## 12. Strategy Cards

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| SC-01 | Hand limit enforcement | Player at 3 cards | Draw another card | Must discard 1 before drawing | P0 |
| SC-02 | Max 1 card per turn | Player already played a card this turn | Attempt to play a second | Rejected | P0 |
| SC-03 | Action-costing cards consume an Action | Card requires Action (e.g. SC02–SC10, SC12) | Play card | 1 of 2 Actions consumed | P0 |
| SC-04 | Roll-time cards don't cost an Action | SC01/SC04/SC11 | Play card | No Action consumed | P0 |
| SC-05 | Card consumed on use | Any card played | Play | Removed from hand; one-time effect only | P0 |
| SC-06 | Round 4 card draw | Round 4 starts | After Breaking News (before Council if any) | Each player draws 1 random card | P0 |
| SC-07 | Hand privacy | Any player's hand | Other players view game state | Hand contents hidden from others; only played-card effects announced publicly | P0 |
| SC-08 | Empty pool draw | Card pool empty | Trigger a draw | No card drawn, no error | P2 |

---

## 13. Breaking News

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| BN-01 | Fires first each round | Round starts | Round begins | Breaking News resolves before Council/turns | P0 |
| BN-02 | Instant effects apply immediately | Instant-type event drawn | Resolution | Effect (Demand/Credits/etc.) applied before any player rolls | P0 |
| BN-03 | "This round" effects expire correctly | Round-scoped event (e.g. BN07/BN08/BN10) | End of that round's Resolution | Effect no longer applies starting next round | P0 |
| BN-04 | Random with replacement | Multiple rounds sampled | Observe drawn events | Same event can repeat across rounds | P2 |
| BN-05 | Projector/display presentation | Event drawn | Display check | Event shown prominently on projector and all player devices | P1 |

---

## 14. City Council

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| COUNCIL-01 | Timing | Round 3 or 6 starts | After Breaking News | Council phase runs before player turns | P0 |
| COUNCIL-02 | Voting window | Council phase active | 45-second timer | Votes locked after timer or all submitted | P0 |
| COUNCIL-03 | Vote allocation flexibility | Player has Influence | Vote | Player may split, vote all on one, or abstain | P1 |
| COUNCIL-04 | Tie-break rule | Equal votes for A and B | Resolve | Option A (listed first) wins | P0 |
| COUNCIL-05 | Vote privacy | Voting complete | Check UI/state exposed to players | Individual allocations never revealed; only totals and winner announced | P0 |
| COUNCIL-06 | Policy stacking | Round 3 and Round 6 policies both resolved | Round 6 completes | Both active simultaneously unless contradictory | P1 |
| COUNCIL-07 | Contradiction precedence | Round 3 and Round 6 policies conflict on same value | Round 6 resolves | Round 6 policy takes precedence for the contradicted element | P1 |
| COUNCIL-08 | Immediate effect | Policy wins | Resolution | Takes effect immediately; same round's player turns are affected | P0 |

---

## 15. Trading

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| TRADE-01 | Basic proposal & confirm | Active player has Action available | Propose trade, other player confirms | Server validates and executes atomically | P0 |
| TRADE-02 | Reject flow | Trade proposed | Other player rejects | No items transfer | P0 |
| TRADE-03 | Validation: ownership | Proposer offers item they don't own | Confirm | Rejected with error, no state change | P0 |
| TRADE-04 | Validation: insufficient Credits | Offer includes Credits proposer doesn't have | Confirm | Rejected | P0 |
| TRADE-05 | Cannot trade Influence/Cards | Trade proposal attempts to include Influence or Strategy Card | Propose | Not offerable / rejected | P0 |
| TRADE-06 | Dev level retained | Traded property has Level > 0 | Trade executes | New owner keeps existing development level | P0 |
| TRADE-07 | Cannot develop traded property same turn | Property just received via trade | Attempt Develop same turn | Rejected; eligible next turn | P0 |
| TRADE-08 | Only active player initiates | Non-active player attempts to initiate | Propose trade | Rejected — only current turn player can initiate (other party can be any player) | P1 |
| TRADE-09 | Up to 2 trades per turn | Active player has both Actions available | Initiate 2 different trades | Both allowed if both are distinct actions | P1 |
| TRADE-10 | No duplicate execution | Trade confirmed | Attempt to confirm again / replay | Second execution rejected | P0 |

---

## 16. Emergency Sale

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| EMER-01 | Triggered by unaffordable fee | Landing fee owed exceeds Credits | Fee resolution | Player prompted to emergency-sell properties | P0 |
| EMER-02 | Sale price formula | Player selects property to sell | Sell | Receives 50% of current Property Value, rounded down | P0 |
| EMER-03 | Sold property resets | Property sold to bank | Post-sale state | Property becomes unowned, Level 0 (development lost) | P0 |
| EMER-04 | Selection window | Emergency sale triggered | Timer | Player has 30 seconds to choose | P1 |
| EMER-05 | Not enough value even selling all | Total sellable value < fee owed | Sell all properties | Balance goes to 0; fee "partially paid"; player NOT eliminated | P0 |
| EMER-06 | Not usable voluntarily | No mandatory payment due | Attempt emergency sale | Rejected — only available for mandatory landing fee payments | P0 |
| EMER-07 | District control updates after sale | Sale removes 3rd/4th property in a district | Post-sale | Control status recalculated immediately | P1 |
| EMER-08 | Deterministic timeout liquidation | Player makes no complete selection within 30s | Emergency-sale timer expires | Eligible properties liquidate by ascending current liquidation value, ties by lowest property ID, until fee is payable | P0 |
| EMER-09 | Deterministic disconnect liquidation | Player is in emergency-sale phase | Disconnect | Same deterministic liquidation occurs immediately; if all sales are insufficient, all remaining Credits are paid and balance becomes 0 | P0 |

---

## 17. Timeout

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| TIME-01 | 60s turn timer | Player's turn begins | Idle | Warning shown at 45s | P1 |
| TIME-02 | Auto-roll on timeout pre-roll | Player hasn't rolled by 60s | Timeout | Server auto-rolls | P0 |
| TIME-03 | Auto-skip unresolved landing | Player hasn't resolved landing by 60s | Timeout | Unowned property purchase skipped (no buy/auction); fees auto-paid | P0 |
| TIME-04 | Forfeit remaining actions | Actions unused at 60s | Timeout | Remaining Actions forfeited, turn ends | P0 |
| TIME-05 | Auction timeout | Player doesn't bid within 30s | Timer expires | Treated as pass/no bid | P0 |
| TIME-06 | Council vote timeout | Player doesn't vote within 45s | Timer expires | Treated as abstain (0 votes) | P0 |
| TIME-07 | Auction pauses turn timer | Normal turn has time remaining | Enter 30s Auction, then resolve | Normal timer does not advance during Auction and resumes with the same remaining time | P0 |
| TIME-08 | Emergency Sale pauses turn timer | Normal turn has time remaining | Enter 30s Emergency Sale, then resolve | Normal timer does not advance during Emergency Sale and resumes with the same remaining time | P0 |
| TIME-09 | Council timer is separate | Enter Council at start of Round 3 or 6 | Let Council timer run | Separate 45s Council timer runs; no player's normal turn timer is charged | P0 |

---

## 18. Disconnect/Reconnect

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| DISC-01 | Active player disconnects | Player is mid-turn | Disconnect | 60s reconnection window starts | P0 |
| DISC-02 | Reconnect within window | Within 60s | Player reconnects | Resumes turn with remaining time | P0 |
| DISC-03 | Fail to reconnect | 60s elapses, no reconnect | Timeout | Turn auto-completes same as timeout behavior; game continues | P0 |
| DISC-04 | Non-active disconnect | Player not on turn disconnects | Disconnect | Game continues normally | P1 |
| DISC-05 | Disconnected player's turn arrives | Still disconnected when turn starts | Turn begins | 60s reconnection window applies, then auto-completes if unresolved | P0 |
| DISC-06 | Reconnection state sync | Player reconnects | Reconnect | Receives full public state + own private state (Credits, cards, objective, properties), correct position, no duplicated resources/actions | P0 |
| DISC-07 | Auction disconnect | Player disconnected during auction | Auction resolves | Auto-passes (bid 0) | P1 |
| DISC-08 | Council disconnect | Player disconnected during voting | Council resolves | Auto-abstains (0 votes) | P1 |
| DISC-09 | Emergency-sale disconnect | Player disconnects during emergency-sale phase | Disconnect | Deterministic liquidation runs immediately by value then property ID; normal turn timer remains paused until the sub-phase completes | P0 |

---

## 19. Final Scoring

| Test ID | Scenario | Preconditions | Action | Expected Result | Priority |
|---|---|---|---|---|---|
| SCORE-01 | Score formula components | Game ends after Round 8 Resolution | Calculate | Score = Credits + ΣPropertyValue + District Control Bonus + (Influence×10) + Objective Bonus + Full Control Bonus | P0 |
| SCORE-02 | Property value at end | Owned properties at various levels | Calculate | Value = BaseValue + (DevLevel × DevValueBonus) per tier | P0 |
| SCORE-03 | Secret Objective evaluation | Game ends | Evaluate each player's objective | +200 if condition met from authoritative server state, else 0 | P0 |
| SCORE-04 | District control bonus tiers | Player has 3/4 or 4/4 at end | Calculate | +50 (3/4) or +100 (4/4, replaces) per district | P0 |
| SCORE-05 | Full control bonus stacks with 26.3 | Player has 4/4 in a district | Calculate | Additional +100 on top, total +200 for that district | P0 |
| SCORE-06 | Tie-break order | Two+ players tied on Final Score | Resolve ranking | Credits → Property Value → Property count → joint placement (no random pick) | P0 |
| SCORE-07 | No further actions after Round 8 | Round 8 Resolution completes | Attempt any player action | Rejected — game is in Final Scoring | P0 |
| SCORE-08 | Scoreboard reveal content | Final Scoring complete | Display results | Shows total score, breakdown, objective + completion status, rank for every player | P0 |
| SCORE-09 | Lost 4th property removes eligibility | Player had 4/4 earlier but sold/traded away before end | Calculate | No Full Control bonus for that district | P1 |

---

*Keep this matrix in sync with `docs/GAME_DESIGN_SPEC.md`. If a test appears to contradict the spec, the spec wins — flag the discrepancy rather than editing the rule.*
