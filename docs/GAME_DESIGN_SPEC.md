# ECONOVA: CITY — CANONICAL GAME DESIGN SPECIFICATION

**Version:** 2.0
**Status:** APPROVED — IMPLEMENTATION-READY
**Purpose:** Single source of truth for all gameplay. Supersedes all prior conflicting descriptions in PRODUCT.md, GAME_RULES.md, GAME_CONTENT.md, and DECISIONS.md where conflicts exist.
**Approved:** 2026-09-04

> [!IMPORTANT]
> This specification resolves DECISION-044, DECISION-045, and DECISION-046. Those decisions are APPROVED in `docs/DECISIONS.md`, and all affected documents must match this specification.

---

## 1. Game Overview

ECONOVA: CITY is a browser-based multiplayer strategy game for 4–6 players. Players compete to build the strongest economic position inside a fictional city over exactly 8 rounds, targeting a 20–30 minute session. The game combines property acquisition, development, market manipulation, negotiation, city-wide events, and secret objectives. The server is the sole authority over all game state.

---

## 2. Player Objective

Achieve the highest **Final Score** after Round 8.

Final Score = Credits + Property Portfolio Value + District Control Bonuses + Influence Points + Secret Objective Bonus + Full District Control Bonuses.

All components are whole numbers. All are public at game end.

---

## 3. Game Components

| Component | Count |
|---|---|
| City spaces | 20 (circular loop) |
| Properties | 16 |
| Special Spaces | 4 (including City Center) |
| Districts | 4 (Food, Tech, Entertainment, Mobility) |
| Properties per district | 4 (1 Cheap, 2 Mid, 1 Premium) |
| Strategy Cards pool | 12 unique cards |
| Breaking News deck | 10 events |
| Special Event deck | 8 events |
| City Council policy pairs | 4 pairs (8 policies total) |
| Secret Objectives pool | 10 objectives |
| Rounds | 8 |
| Currency | City Credits (fictional, no real value) |
| Secondary resource | Influence |

---

## 4. Setup

1. Room is created by admin; 4–6 players join.
2. Each player starts at **Space 0: City Center**.
3. Starting resources per player:
   - **1,000 Credits**
   - **5 Influence**
   - **2 Strategy Cards** (drawn randomly from the 12-card pool without replacement; each player gets unique cards)
   - **0 Properties**
4. All 16 properties begin unowned at Level 0.
5. All 4 districts begin at **Demand 0**.
6. **Secret Objectives:** For 4–6 players, the server uses the same 10-objective pool and shuffles it. In player order, the server sequentially deals 2 objectives to one player, that player privately chooses exactly 1, the chosen objective is removed from the deck and cannot be selected by another player, and the unchosen objective is returned to the bottom of the objective deck before the next player receives their 2-objective offer. All selections must be complete before Round 1 begins.
7. **Turn order:** Server randomly assigns a turn order (positions 1 through N). This order is fixed for Round 1. Each subsequent round, the starting position rotates by +1 (i.e., in Round 2, the player who was position 2 goes first; wraps around).
8. Admin starts the game.

---

## 5. City Map

The city is a circular loop of 20 spaces, numbered 0–19. Players move clockwise. City Center is Space 0 and counts as one of the 4 special spaces.

20 spaces = 16 properties + 4 special spaces.

| Space | Type | Name | District / Tier |
|:---:|---|---|---|
| 0 | **Special: City Center** | City Center | — |
| 1 | Property | Street Bites | Food / Cheap |
| 2 | Property | CloudNine Labs | Tech / Cheap |
| 3 | Property | Neon Arena | Entertainment / Cheap |
| 4 | Property | Metro Link | Mobility / Cheap |
| 5 | **Special: Innovation Hub** | Innovation Hub | — |
| 6 | Property | Harvest Table | Food / Mid |
| 7 | Property | DataForge | Tech / Mid |
| 8 | Property | Velocity Motors | Mobility / Mid |
| 9 | Property | Pixel Palace | Entertainment / Mid |
| 10 | **Special: Market Square** | Market Square | — |
| 11 | Property | Quantum Dynamics | Tech / Mid |
| 12 | Property | FreshFusion | Food / Mid |
| 13 | Property | SkyRail Transit | Mobility / Mid |
| 14 | Property | The Grand Stage | Entertainment / Mid |
| 15 | Property | Cyber Coliseum | Entertainment / Premium |
| 16 | Property | NexGen AI | Tech / Premium |
| 17 | Property | Epicurean Tower | Food / Premium |
| 18 | Property | AutoPilot HQ | Mobility / Premium |
| 19 | **Special: Observatory** | Observatory | — |

**District verification:**

| District | Cheap | Mid 1 | Mid 2 | Premium | Total |
|---|---|---|---|---|---|
| Food | Street Bites (1) | Harvest Table (6) | FreshFusion (12) | Epicurean Tower (17) | 4 ✓ |
| Tech | CloudNine Labs (2) | DataForge (7) | Quantum Dynamics (11) | NexGen AI (16) | 4 ✓ |
| Entertainment | Neon Arena (3) | Pixel Palace (9) | The Grand Stage (14) | Cyber Coliseum (15) | 4 ✓ |
| Mobility | Metro Link (4) | Velocity Motors (8) | SkyRail Transit (13) | AutoPilot HQ (18) | 4 ✓ |

Properties from different districts are intentionally interleaved to reduce the advantage of landing streaks in one district. The 4 special spaces are distributed at positions 0, 5, 10, 19.

---

## 6. Properties

### 6.1 Property Economics Table

| ID | Name | Tier | Base Price | Base Value | L1 Dev Cost | L2 Dev Cost | L3 Dev Cost | Total Investment |
|---|---|---|---|---|---|---|---|---|
| P01 | Street Bites | Cheap | 80 | 80 | 40 | 60 | 80 | 260 |
| P02 | CloudNine Labs | Cheap | 80 | 80 | 40 | 60 | 80 | 260 |
| P03 | Neon Arena | Cheap | 80 | 80 | 40 | 60 | 80 | 260 |
| P04 | Metro Link | Cheap | 80 | 80 | 40 | 60 | 80 | 260 |
| P05 | Harvest Table | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P06 | DataForge | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P07 | Velocity Motors | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P08 | Pixel Palace | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P09 | Quantum Dynamics | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P10 | FreshFusion | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P11 | SkyRail Transit | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P12 | The Grand Stage | Mid | 150 | 150 | 60 | 90 | 120 | 420 |
| P13 | Cyber Coliseum | Premium | 300 | 300 | 100 | 150 | 200 | 750 |
| P14 | NexGen AI | Premium | 300 | 300 | 100 | 150 | 200 | 750 |
| P15 | Epicurean Tower | Premium | 300 | 300 | 100 | 150 | 200 | 750 |
| P16 | AutoPilot HQ | Premium | 300 | 300 | 100 | 150 | 200 | 750 |

### 6.2 Property Value Formula

**Property Value** (used for final scoring):

```
PropertyValue = BaseValue + (DevLevel × DevValueBonus)
```

**DevValueBonus** per tier:

| Tier | DevValueBonus per level |
|---|---|
| Cheap | 30 |
| Mid | 50 |
| Premium | 100 |

Example: A Mid property at Level 3 = 150 + (3 × 50) = **300**.

Example: A Premium property at Level 3 = 300 + (3 × 100) = **600**.

### 6.3 Development States

| Level | Name | Description |
|---|---|---|
| 0 | Undeveloped | Just purchased |
| 1 | Developed | Basic operations |
| 2 | Advanced | Expanded operations |
| 3 | Landmark | Flagship venue |

### 6.4 Development Restriction

A property **cannot be developed on the same turn it was purchased**. It may first be developed on the owner's next turn.

---

## 7. Resources

### 7.1 City Credits
- Starting: 1,000
- Floor: 0 (never negative)
- No debt. No loans.
- Used for: purchasing properties, developing, trading, auctions
- Earned from: passing City Center, property income, landing fees paid to you, special events, Breaking News

### 7.2 Influence
- Starting: 5
- Floor: 0
- Cannot be traded
- Earned from: district control bonuses, special events, specific strategy cards
- Spent on: changing district Demand (1 Influence → ±1 Demand), City Council voting (1 Influence = 1 vote)

---

## 8. Round Structure

> [!IMPORTANT]
> **This resolves DECISION-044 and DECISION-045.** The canonical round/phase sequence is defined below. All other documents must be updated to match.

### 8.1 Canonical Round Sequence

```
ROUND START
  │
  ├── 1. BREAKING NEWS (announced, effects applied immediately)
  │
  ├── 1b. STRATEGY CARD DRAW (Round 4 only: each player draws 1 card)
  │
  ├── 2. CITY COUNCIL (Rounds 3 and 6 only — after Breaking News, before player turns)
  │      ├── Present 2 policy options
  │      ├── Players vote using Influence (45-second timer)
  │      ├── Winning policy takes effect immediately
  │      └── Policy remains active until replaced or game ends
  │
  ├── 3. PLAYER TURNS (sequential, in turn order)
  │      ├── Roll dice
  │      ├── Move
  │      ├── Resolve landing
  │      ├── Take 2 Actions
  │      └── End turn → next player
  │
  ├── 4. ROUND RESOLUTION
  │      ├── 4a. Property income calculated and paid
  │      ├── 4b. District control recalculated
  │      ├── 4c. District control benefits applied
  │      └── 4d. Full District Control status recorded for final scoring
  │
  └── 5. ROUND END → next round (or Final Scoring after Round 8)
```

### 8.2 Timing Clarifications (DECISION-044 Resolution)

- **Breaking News resolves BEFORE player turns.** Players see the new market conditions and then act under them.
- Market/event state that changes due to Breaking News is fully applied before any player rolls.

### 8.3 City Council Timing (DECISION-045 Resolution)

- City Council occurs at the **START** of Rounds 3 and 6, after Breaking News but before player turns.
- The winning policy takes effect **immediately** upon resolution. Players act under the new policy during that same round's player turns.
- A policy remains active until replaced by a new Council vote or the game ends.
- At most 2 policies can be active simultaneously (one from Round 3, one from Round 6). They do not replace each other; they stack.

### 8.4 Round 8 Special Rules

Round 8 follows the same structure. After Round 8's resolution step (including normal property income), the game proceeds to Final Scoring. **Yes, Round 8 pays normal income.**

---

## 9. Turn Structure

Each player's turn within a round:

```
1. ROLL DICE (server generates 1d6, result 1–6)
2. RESOLVE MOVEMENT DIRECTION (normal forward movement, or SC11 Shortcut backward movement)
3. DETERMINE MOVEMENT DISTANCE (apply Entertainment control only to normal forward movement; Shortcut backward movement uses the unmodified die result)
4. MOVE (use the resulting movement distance in the selected direction)
5. RESOLVE LANDING (depends on space type)
6. TAKE REMAINING ACTIONS (from: Develop, Influence, Trade, Use Strategy Card)
7. END TURN (automatic after 2 actions used, or player explicitly ends turn)
```

### 9.1 Action Details

Each player gets exactly **2 Actions** per turn. Available actions:

| Action | Effect | Can use twice? |
|---|---|---|
| **Develop** | Pay development cost to upgrade one owned property by 1 level | Yes (on different properties, or same property twice if affordable and levels permit) |
| **Influence** | Spend 1 Influence to change one district's Demand by +1 or −1 | Yes |
| **Trade** | Propose/confirm a trade with another player | Yes (different trades) |
| **Use Strategy Card** | Play 1 Strategy Card from hand | **No — max 1 card per turn** |

**Buying/auctioning happens during Landing Resolution (step 3), NOT as an Action.**

A player may skip unused actions (end turn early).

A property may be developed twice in one turn (using both actions) **only if it was NOT purchased this turn** and the player can afford both upgrades.

---

## 10. Movement

### 10.1 Dice
- Server generates a random integer 1–6 (uniform distribution).
- Player moves exactly that many spaces clockwise.
- Movement wraps around: Space 19 → Space 0 → Space 1 → ...

### 10.2 Passing City Center
Whenever forward movement carries a player past or onto City Center (Space 0), award **+150 Credits** total. This fires at most once per turn. Backward movement caused by Shortcut never awards this bonus.

### 10.3 Landing on City Center
Landing exactly on City Center during forward movement counts as passing it. The player receives the +150 Credits. Landing on City Center during backward movement caused by Shortcut does not award the bonus. City Center does NOT trigger a special event. The player proceeds to their remaining Actions.

### 10.4 City Center Passing Detection (Implementation Rule)
City Center passing is determined using the player's total forward movement distance after all applicable movement modifiers, including Entertainment district movement bonuses. If the resulting forward movement crosses or lands on Space 0, award the City Center passing bonus. Backward movement caused by Shortcut never triggers the City Center passing bonus.

### 10.5 Entertainment District Control Movement Bonus
See Section 18 (District Control). The Entertainment movement bonus applies only to normal forward movement. After the roll, it adds +1 (or +2 for Full Control) to produce the total forward movement distance; it does NOT change the die face. This can cause forward movement beyond 6 (up to 8 with Full Control), and that modified total forward movement distance is used for City Center passing detection. If SC11 Shortcut changes the direction to backward, the Entertainment bonus does not apply: the player moves backward by the unmodified die result, and no City Center passing bonus can be awarded.

---

## 11. Landing Resolution

After movement, the player resolves the space they landed on:

| Space Type | Resolution |
|---|---|
| **City Center** | No special resolution (bonus already awarded during movement). Proceed to Actions. |
| **Unowned Property** | Player may Buy or trigger Auction (Section 12). Then proceed to Actions. |
| **Owned by this player** | No fee. Proceed to Actions. |
| **Owned by another player** | Pay Landing Fee (Section 15) immediately. SC12 Insurance Policy may be played as the explicit reaction exception immediately before payment. Then proceed to remaining Actions. May use 1 Action to propose a Trade with the owner. |
| **Special Space** (not City Center) | Draw and resolve 1 Special Event (Section 21). Then proceed to Actions. |

**Key rule:** Landing fee is paid **immediately** upon landing, before the normal Action phase. SC12 Insurance Policy is the explicit reaction exception: it may be played immediately before fee payment, consumes 1 Action from the current turn, and counts toward the one-card-per-turn limit. The fee payment cannot otherwise be deferred.

---

## 12. Buying & Auctions

### 12.1 Buying
When landing on an unowned property, the player may **buy it at the calculated purchase price**, starting from Base Price:
- Apply the universal purchase-price calculation order in Section 15A.
- Server verifies the player has sufficient Credits.
- Credits are deducted; ownership is assigned.
- The property starts at Level 0.
- If the player cannot afford it or declines, they may trigger an auction.

### 12.2 Auction
If the landing player declines to buy (or cannot afford to buy), they **may choose to trigger an auction**. If they also decline to auction, the property remains unowned and the turn continues.

**Auction rules:**
1. All players (including the triggering player) may place exactly one sealed bid. Minimum bid = 1 Credit.
2. Bidding has a **30-second timer**. Players submit bids privately on their devices.
3. After timer expires (or all eligible players have submitted/passed), bids are revealed.
4. **Highest bid wins.** The winning bidder pays their bid amount to the bank. Ownership transfers.
5. **Tie bid:** If multiple players bid the same highest amount, the one with the **earliest turn-order position** (in the current round) wins.
6. **No bids:** If nobody bids, the property remains unowned.
7. The auction winner **cannot** develop the property this turn (same-turn purchase restriction applies).

---

## 13. Development

### 13.1 Rules
- Development is an **Action** (costs 1 of the player's 2 Actions).
- Player must own the property.
- Property must NOT have been purchased this turn.
- Property must be below Level 3.
- Player must have sufficient Credits.
- Credits are deducted; level increases by 1.

### 13.2 Development Costs

| Tier | L0→L1 | L1→L2 | L2→L3 |
|---|---|---|---|
| Cheap | 40 | 60 | 80 |
| Mid | 60 | 90 | 120 |
| Premium | 100 | 150 | 200 |

Apply the universal development-cost calculation order in Section 15A. SC05 Quick Build's instruction to skip the Credit cost remains a free development: it is not converted into a 10-Credit payment by the minimum development-cost clamp.

### 13.3 Effect of Development
Development increases:
- **Property Value** (for final scoring) — see Section 6.2
- **Landing Fee** — see Section 15
- **Property Income** — see Section 14

---

## 14. Property Income

At the end of every round (Round Resolution step 4a), **every owned property generates income** paid to its owner.

### 14.1 Income Formula

```
Income = BaseIncome + (DevLevel × DevIncomeBonus) + DemandModifier
```

Where `DemandModifier = Demand × DemandIncomeMultiplier`

Apply the universal property-income calculation order in Section 15A whenever temporary or policy modifiers are active.

**BaseIncome** per tier:

| Tier | BaseIncome |
|---|---|
| Cheap | 10 |
| Mid | 15 |
| Premium | 25 |

**DevIncomeBonus** per tier:

| Tier | Per level |
|---|---|
| Cheap | 5 |
| Mid | 8 |
| Premium | 15 |

**DemandIncomeMultiplier** per tier:

| Tier | DemandIncomeMultiplier |
|---|---|
| Cheap | 3 |
| Mid | 5 |
| Premium | 8 |

**Examples:**
- Cheap L0 at Demand 0: 10 + 0 + 0 = **10 Credits**
- Cheap L3 at Demand +2: 10 + 15 + 6 = **31 Credits**
- Mid L2 at Demand +1: 15 + 16 + 5 = **36 Credits**
- Premium L3 at Demand +2: 25 + 45 + 16 = **86 Credits**
- Mid L0 at Demand −2: 15 + 0 + (−10) = **5 Credits** (minimum 0)

### 14.2 Minimum Income Rule
Property income **cannot be negative**. If the formula yields a negative number, income for that property is **0** for that round.

---

## 15. Landing Fees

When a player lands on another player's property, they must pay a **Landing Fee** to the property owner.

### 15.1 Landing Fee Formula

```
LandingFee = BaseFee + (DevLevel × DevFeeBonus) + DemandFeeModifier
```

Where `DemandFeeModifier = Demand × DemandFeeMultiplier`

Apply the universal landing-fee calculation order in Section 15A whenever temporary or policy modifiers are active.

**BaseFee** per tier:

| Tier | BaseFee |
|---|---|
| Cheap | 15 |
| Mid | 25 |
| Premium | 50 |

**DevFeeBonus** per tier:

| Tier | Per level |
|---|---|
| Cheap | 10 |
| Mid | 15 |
| Premium | 30 |

**DemandFeeMultiplier** per tier:

| Tier | DemandFeeMultiplier |
|---|---|
| Cheap | 5 |
| Mid | 8 |
| Premium | 15 |

**Examples:**
- Cheap L0 at Demand 0: 15 + 0 + 0 = **15 Credits**
- Mid L2 at Demand +2: 25 + 30 + 16 = **71 Credits**
- Premium L3 at Demand +2: 50 + 90 + 30 = **170 Credits**
- Premium L0 at Demand −2: 50 + 0 + (−30) = **20 Credits** (minimum 5)

### 15.2 Minimum Fee Rule
Landing fee **cannot be less than 5 Credits**. If the formula yields less than 5, the fee is 5.

### 15.3 Payment
- The fee is paid from the landing player to the property owner.
- If the landing player cannot afford the full fee, see Section 28 (Insufficient Funds).

---

## 15A. Universal Modifier Calculation Order

All calculations use the following order. Existing effects map into the listed categories; no additional modifier category is implied.

### Purchase price

1. Base property price
2. Applicable temporary purchase modifiers
3. Minimum purchase-price clamp
4. Payment

### Development cost

1. Base development cost
2. District-control discount
3. Applicable policy/event/card modifiers
4. Minimum development-cost clamp
5. Payment

### Property income

1. Base income
2. Development bonus
3. Demand modifier
4. Temporary event/card modifiers
5. Applicable policy modifiers
6. Minimum income clamp
7. Award Credits

### Landing fee

1. Base fee
2. Development bonus
3. Demand modifier
4. Temporary event/card modifiers
5. Applicable policy modifiers
6. Minimum fee clamp
7. Apply Insurance reaction if played
8. Collect payment

### Existing modifier mapping

- **Purchase price:** SC04 Flash Sale and BN10 Urban Expansion are temporary purchase modifiers. Their documented minimum prices are enforced at the minimum purchase-price clamp stage.
- **Development cost:** Tech district control is the district-control discount. SE06 Renovation Subsidy, BN07 Construction Boom, Infrastructure Investment, Expansion Subsidies, and any other documented development-cost policy/event/card effect are applied at the policy/event/card modifier stage. SC05 Quick Build retains its documented effect of skipping the Credit payment entirely.
- **Property income:** SE08 City Festival and SC08 Urban Renewal are temporary event/card modifiers. Austerity Measures and Free Market are policy modifiers; Free Market changes only the Demand contribution as its policy text states.
- **Landing fee:** SC10 Toll Booth and BN08 Recession Fears are temporary event/card modifiers. Tourism Drive and Free Market are policy modifiers; Free Market changes only the Demand contribution as its policy text states. SC12 Insurance Policy is applied only at the Insurance reaction stage after the minimum fee clamp.

---

## 16. Demand

### 16.1 Scale
Each district has Demand: integer from **−2** to **+2**. Starting value: **0**.

### 16.2 Demand Effects
Demand affects:
- Property income (Section 14)
- Landing fees (Section 15)

Demand does **NOT** affect:
- Base property value (for final scoring)
- Development costs
- Purchase price

### 16.3 How Demand Changes
1. **Breaking News** — automatic, see Section 22
2. **Player Influence action** — spend 1 Influence to move one district's Demand by +1 or −1 (costs 1 Action)
3. **City Council policies** — may change Demand
4. **Strategy Cards** — specific cards may change Demand
5. **Special Events** — may change Demand

### 16.4 Demand Bounds
Demand cannot exceed +2 or go below −2. Any effect that would push it beyond these bounds is clamped.

---

## 17. Influence

### 17.1 Earning Influence
Influence is earned from these sources **only**:

| Source | Amount | Timing |
|---|---|---|
| Game start | 5 | Setup |
| Mobility District Control (3/4) | +2 per round | Round Resolution |
| Mobility Full Control (4/4) | +3 per round (replaces the +2) | Round Resolution |
| Special Events (specific ones) | varies | When event resolves |
| Strategy Cards (specific ones) | varies | When card is played |

### 17.2 Spending Influence
- **Demand manipulation:** 1 Influence → change one district's Demand by ±1 (costs 1 Action)
- **City Council voting:** 1 Influence = 1 vote (during Council phase)

Influence spent is gone permanently.

### 17.3 Influence in Final Scoring
Each remaining Influence point = **+10 Final Score points**.

---

## 18. District Control

### 18.1 Control Thresholds
- **District Control:** Own ≥ 3 of 4 properties in a district.
- **Full District Control:** Own all 4 properties in a district.

### 18.2 Control Changes
District control is **recalculated at Round Resolution** (step 4b) and **immediately whenever ownership changes** (purchase, trade, emergency sale). The most recent state is what matters.

### 18.3 District Control Benefits (applied at Round Resolution step 4c)

| District | Identity | 3/4 Control Benefit | 4/4 Control Benefit |
|---|---|---|---|
| **Food** | Income | +30 Credits per round | +50 Credits per round (replaces the 30) |
| **Tech** | Development | −20 Credits discount on all development costs this round | −30 Credits discount (replaces the 20) |
| **Entertainment** | Movement | +1 to normal forward movement distance after the roll (not retroactively) | +2 to normal forward movement distance after the roll (replaces the +1) |
| **Mobility** | Influence | +2 Influence per round | +3 Influence per round (replaces the 2) |

**Important rules:**
- Benefits are **simple fixed effects**, not percentages.
- The 4/4 benefit **replaces** the 3/4 benefit (not additive).
- **Tech discount:** Development costs for all properties (not just Tech properties) are reduced by the stated amount, to a minimum cost of 10 Credits. The discount is checked and applied at the moment a player performs a development action (during their turn), using the most recent district-control state, rather than waiting for Round Resolution.
- **Entertainment bonus:** Applies only to normal forward movement. Example: Player rolls 3 with Entertainment Control → moves forward 4 spaces. With Full Control → moves forward 5 spaces. If SC11 Shortcut changes the direction to backward, the bonus does not apply and the player moves backward by the unmodified die result. Forward movement can exceed 6 (up to 8 with Full Control); backward Shortcut movement never triggers the City Center passing bonus.
- **Food bonus:** Flat Credits added to the owner's balance at Round Resolution.
- **Mobility bonus:** Influence added at Round Resolution.

### 18.4 Full District Control Final Score Bonus
In addition to the recurring round benefits, **Full District Control (4/4) awards a one-time Final Score bonus** at the end of the game:

| District | Full Control Final Bonus |
|---|---|
| Food | +100 |
| Tech | +100 |
| Entertainment | +100 |
| Mobility | +100 |

This bonus is awarded if the player holds 4/4 at the time of final scoring. Losing the 4th property before the game ends removes eligibility.

---

## 19. Trading

### 19.1 What Can Be Traded
- **Credits** (any whole amount the player possesses)
- **Properties** (any owned property)

**Cannot trade:** Influence, Strategy Cards.

### 19.2 Trade Procedure
1. Active player uses 1 Action to initiate a Trade.
2. Negotiation happens **face-to-face** (not through the app).
3. Once terms are agreed, the **proposing player** enters the trade on their device:
   - What they give (Credits and/or properties)
   - What they receive (Credits and/or properties)
   - Who the other party is
4. The **other player** sees the trade proposal on their device and **confirms** or **rejects**.
5. If confirmed, the server **validates**:
   - Both players exist and are in the same room/game
   - Both players own what they're offering
   - Both players have sufficient Credits
   - Trade is legal under current game phase
   - No duplicate execution
6. If valid, the trade executes **atomically**. All items transfer simultaneously.
7. If invalid, the trade is rejected with an error. No items move.

### 19.3 Trade Restrictions
- A traded property **retains its development level**.
- The new owner may develop it on their **next turn** (not the current turn if it was just received).
- Only the current turn player may **initiate** a trade (using their Action), but the other party can be any player.
- A player may initiate up to 2 trades per turn (using both Actions).

---

## 20. Strategy Cards

### 20.1 Card Pool (12 unique cards)

| ID | Name | Effect | Timing |
|---|---|---|---|
| SC01 | **Rush Hour** | Your next dice roll this turn is automatically 6 (replaces the roll). | Play before rolling. Does NOT cost an Action. |
| SC02 | **Market Boom** | Set one district's Demand to +2. | Play during Action phase. Costs 1 Action. |
| SC03 | **Market Crash** | Set one district's Demand to −2. | Play during Action phase. Costs 1 Action. |
| SC04 | **Flash Sale** | Your next unowned property purchase this turn costs 40 Credits less, with a minimum purchase price of 40 Credits. | Play before buying. Does NOT cost an Action. |
| SC05 | **Quick Build** | Develop one owned property by 1 level for free (skip the Credit cost). | Play during Action phase. Costs 1 Action. |
| SC06 | **Tax Refund** | Gain +120 Credits from the bank. | Play during Action phase. Costs 1 Action. |
| SC07 | **City Connections** | Gain +60 Credits and +1 Influence. | Play during Action phase. Costs 1 Action. |
| SC08 | **Urban Renewal** | Choose one of your properties. It generates double income this round (applied at Round Resolution). | Play during Action phase. Costs 1 Action. |
| SC09 | **Lobbying Power** | Gain +3 Influence. | Play during Action phase. Costs 1 Action. |
| SC10 | **Toll Booth** | The next player to land on any of your properties this round pays double the normal Landing Fee. | Play during Action phase. Costs 1 Action. Effect expires at end of round. |
| SC11 | **Shortcut** | After rolling, you may choose to move backward instead of forward using the unmodified die result. Entertainment movement bonuses do not apply to this backward movement. | Play after rolling, before moving. Does NOT cost an Action. |
| SC12 | **Insurance Policy** | When a player would owe a landing fee, they may play Insurance Policy immediately before fee payment. The landing fee becomes 0. Playing the card consumes 1 Action from the current turn and counts toward the one-card-per-turn limit. | Explicit reaction exception before fee payment. |

### 20.2 Card Rules
- **Hand limit:** 3 cards maximum.
- **Usage:** Max 1 card per turn. Cards that cost an Action consume 1 of the player's 2 Actions. Cards played at roll time (SC01, SC04, SC11) do NOT cost an Action. SC12 is an explicit reaction exception that may be played before the normal Action phase, but it still consumes 1 Action from the current turn.
- **One-time use:** All cards are consumed when played.
- **Visibility:** A player's hand is private. When a card is played, its effect is publicly announced.

### 20.3 Receiving Strategy Cards
- **Setup:** 2 random cards per player.
- **Round 4 start:** Each player draws 1 random card (after Breaking News, before City Council if applicable).
- **Special Spaces:** Some special events grant a card (see Section 21).
- When drawing, if the pool is empty, no card is drawn.
- If a player is already at hand limit (3), they must discard 1 card of their choice before drawing the new one.

### 20.4 Card Pool Management
The 12 cards form a shared deck. Cards that are dealt to players leave the deck. Used/discarded cards return to the deck and can be redrawn later.

---

## 21. Special Spaces & Events

### 21.1 Special Spaces
The 3 non-City-Center special spaces (Innovation Hub, Market Square, Observatory) trigger a **random Special Event** when a player lands on them. City Center does NOT trigger a special event.

### 21.2 Special Event Deck (8 events)

When triggered, the server randomly selects one event from the deck. Events are drawn with replacement (the same event can occur multiple times in a game).

| ID | Name | Effect |
|---|---|---|
| SE01 | **Startup Grant** | Gain +80 Credits. |
| SE02 | **Community Support** | Gain +2 Influence. |
| SE03 | **Demand Surge** | Choose one district: its Demand increases by +1 (capped at +2). |
| SE04 | **Economic Downturn** | Choose one district: its Demand decreases by −1 (floored at −2). |
| SE05 | **Lucky Find** | Draw 1 Strategy Card (if hand is full, must discard 1 first). |
| SE06 | **Renovation Subsidy** | Your next development action this turn costs 30 Credits less (minimum cost 10). |
| SE07 | **Networking Event** | Gain +1 Influence and +40 Credits. |
| SE08 | **City Festival** | All properties in the district with the highest current Demand generate +10 extra income this round. If tied, all tied districts benefit. |

### 21.3 Resolution
1. Player lands on a special space (not City Center).
2. Server randomly selects an event.
3. Event effect is applied immediately.
4. If the event requires a player choice (SE03, SE04), the player makes the choice on their device.
5. After resolution, the player proceeds to their 2 Actions.

---

## 22. Breaking News

### 22.1 Timing
One Breaking News event is drawn at the **start of every round**, before any other round activity. It is the first thing that happens each round.

### 22.2 Breaking News Deck (10 events)

Events are drawn randomly with replacement (same event may repeat).

| ID | Title | Effect | Duration |
|---|---|---|---|
| BN01 | **Tech Boom** | Tech Demand +1. | Instant (permanent until changed) |
| BN02 | **Food Festival** | Food Demand +1. | Instant |
| BN03 | **Transportation Strike** | Mobility Demand −1. | Instant |
| BN04 | **Entertainment Craze** | Entertainment Demand +1. | Instant |
| BN05 | **Economic Stimulus** | Every player receives +60 Credits. | Instant |
| BN06 | **Market Volatility** | Two randomly chosen districts each change Demand by +1 or −1 (randomly chosen direction for each). | Instant |
| BN07 | **Construction Boom** | All development costs are reduced by 20 Credits this round (minimum 10). | This round only |
| BN08 | **Recession Fears** | All landing fees are reduced by 10 Credits this round (minimum 5). | This round only |
| BN09 | **Innovation Wave** | The player with the fewest properties gains +100 Credits. If tied, all tied players receive it. | Instant |
| BN10 | **Urban Expansion** | All undeveloped (Level 0) properties have their purchase price reduced by 20 Credits this round (minimum 50). | This round only |

### 22.3 Breaking News Presentation
- The event is displayed prominently on the projector.
- All players see it on their devices.
- Effects are applied by the server immediately (for "instant" events) or tracked for the round (for "this round" events).
- "This round" effects expire at the end of that round's Resolution phase.

---

## 23. City Council

### 23.1 Timing
City Council occurs at the **start of Round 3** and **start of Round 6**, after Breaking News, before player turns.

### 23.2 Procedure
1. Server presents 2 policy options (drawn from the policy deck — see 23.4).
2. Each player secretly allocates Influence as votes: they may split votes between the two policies, vote all on one, or abstain (vote 0).
3. Voting has a **45-second timer**.
4. Votes are **private** during voting. After the timer expires (or all players have submitted), results are tallied.
5. The policy with more total votes wins.
6. **Tie-break:** If votes are tied, the policy listed first (Option A) wins. This is predetermined and visible to players before voting.
7. The winning policy takes effect immediately.
8. Individual vote allocations are **never** publicly revealed. Only the winning policy and total vote counts are announced.

### 23.3 Policy Duration
- A policy remains active until replaced or the game ends.
- The Round 3 policy and Round 6 policy can both be active simultaneously (they stack).
- If a Round 6 policy directly contradicts a Round 3 policy, the Round 6 policy takes precedence for the contradicted element.

### 23.4 Policy Deck (4 pairs = 8 total)

**Round 3** — server randomly selects 1 pair from Pairs 1–2:

**Pair 1:**

| Option | Name | Effect |
|---|---|---|
| A | **Green Initiative** | Food and Mobility Demand each +1. Entertainment Demand −1. |
| B | **Digital Transformation** | Tech Demand +2. Food Demand −1. |

**Pair 2:**

| Option | Name | Effect |
|---|---|---|
| A | **Tourism Drive** | Entertainment Demand +1. All landing fees +10 Credits for the rest of the game. |
| B | **Infrastructure Investment** | Mobility Demand +1. All development costs −10 Credits for the rest of the game (minimum 10). |

**Round 6** — server randomly selects 1 pair from Pairs 3–4:

**Pair 3:**

| Option | Name | Effect |
|---|---|---|
| A | **Austerity Measures** | All property income −5 Credits per property per round (minimum 0). Every player gains +80 Credits immediately. |
| B | **Expansion Subsidies** | All development costs −20 Credits for the rest of the game (minimum 10). |

**Pair 4:**

| Option | Name | Effect |
|---|---|---|
| A | **Market Regulation** | Demand changes from player Influence actions are disabled for the rest of the game. All Demand is set to 0. |
| B | **Free Market** | All Demand effects are doubled for the rest of the game (DemandModifiers ×2 in income and fee formulas). |

---

## 24. Secret Objectives

### 24.1 Pool (10 objectives)

Each objective is worth **+200 Final Score points** if completed. 0 if failed.

| ID | Name | Condition |
|---|---|---|
| OBJ01 | **Mogul** | Own 5 or more properties at game end. |
| OBJ02 | **Developer** | Have at least 3 properties at Level 3 at game end. |
| OBJ03 | **Food Baron** | Own all 4 Food district properties at game end. |
| OBJ04 | **Tech Titan** | Own all 4 Tech district properties at game end. |
| OBJ05 | **Cash Reserve** | Have 1,200 or more Credits at game end. |
| OBJ06 | **Diversified** | Own at least 1 property in each of the 4 districts and at least 5 properties total at game end. |
| OBJ07 | **Influencer** | Have 10 or more Influence at game end. |
| OBJ08 | **Entertainment Empire** | Own all 4 Entertainment district properties at game end. |
| OBJ09 | **Premium Collector** | Own 3 or more Premium-tier properties at game end. |
| OBJ10 | **Urban Planner** | Have at least 6 properties at Level 1 or higher at game end. |

### 24.2 Objective Rules
- The same 10-objective pool is used for every supported player count (4–6 players), and the server shuffles it before dealing.
- In player order, objectives are offered sequentially: deal 2 objectives to one player, then complete that player's choice before dealing to the next player.
- Each player privately chooses exactly 1 objective. The chosen objective is removed from the deck and cannot be selected by another player.
- The unchosen objective is returned to the bottom of the objective deck before the next 2-objective offer is dealt.
- Objective remains secret until final scoring reveal.
- Objective completion is evaluated by the server from authoritative end-game state.
- All objectives have equal value (+200).
- During final scoring, each player's objective is revealed along with whether it was completed.

---

## 25. Final Round

Round 8 follows the exact same structure as all other rounds:
1. Breaking News
2. Player turns (with movement, landing, 2 actions each)
3. Round Resolution (property income is paid, district control applied)

After Round 8 Resolution completes, the game enters **Final Scoring**. No further player actions are accepted.

---

## 26. Final Scoring

### 26.1 Score Components

```
FINAL SCORE = Credits
            + Σ PropertyValue (for all owned properties)
            + District Control Bonus (from 26.3)
            + (Remaining Influence × 10)
            + Secret Objective Bonus (0 or 200)
            + Full District Control Bonus (from 26.4)
```

### 26.2 Property Value at Game End

```
PropertyValue = BaseValue + (DevLevel × DevValueBonus)
```

See Section 6.2 for DevValueBonus by tier.

### 26.3 District Control Bonus (Final Scoring)

| Control Level | Bonus |
|---|---|
| 3/4 District Control | +50 per controlled district |
| 4/4 Full District Control | +100 per fully controlled district (replaces the 50) |

### 26.4 Full District Control Bonus
+100 per district where the player has 4/4 at game end. This is **in addition to** the 26.3 bonus.

**Effective total for Full Control of one district:** 100 (from 26.3) + 100 (from 26.4) = **+200 Final Score points**.

### 26.5 Scoring Procedure
1. Freeze all game state.
2. Calculate each player's Credits.
3. Calculate each player's total Property Value.
4. Calculate District Control bonuses.
5. Calculate remaining Influence × 10.
6. Evaluate Secret Objectives.
7. Calculate Full District Control bonuses.
8. Sum all components.
9. Rank players by Final Score (descending).
10. Apply tie-breakers if needed (Section 27).
11. Reveal results on all screens.

### 26.6 Score Display
The final scoreboard shows for each player:
- Total Final Score
- Score breakdown (Credits, Property Value, District Bonuses, Influence, Objective)
- Secret Objective name and completion status
- Final rank

---

## 27. Tie-Breakers

If two or more players have the same Final Score:

1. **Higher remaining Credits** wins.
2. If still tied: **Higher total Property Value** wins.
3. If still tied: **More properties owned** wins.
4. If still tied: **Joint placement** (co-winners). No random selection.

---

## 28. Insufficient Funds

### 28.1 Cannot Afford Optional Payment
If a player cannot afford an optional action (buying, developing, bidding), the action is simply **rejected**. No state changes.

### 28.2 Cannot Afford Mandatory Payment (Landing Fee)

> [!IMPORTANT]
> **This resolves DECISION-046.** Emergency bank sale IS included for mandatory payments only.

1. If a player cannot pay the full Landing Fee, they must **emergency-sell properties to the bank** until they can pay.
2. **Emergency sale price:** 50% of the property's current Property Value (rounded down to nearest whole number).
3. The player chooses which property/properties to sell.
4. Sold properties become unowned at Level 0 (development is lost).
5. The player has **30 seconds** to select properties to sell.
6. If the 30-second emergency-sale timer expires before the player completes the selection, the server automatically liquidates eligible properties in ascending order of current liquidation value until the fee can be paid. If two eligible properties have the same current liquidation value, the property with the lowest property ID is liquidated first.
7. The same deterministic automatic liquidation occurs immediately if the player disconnects during the emergency-sale phase.
8. If the player still cannot fully pay the fee after all eligible properties are sold, they pay all remaining Credits and their balance becomes 0. The fee is considered "partially paid." **The player is NOT eliminated.**
9. Emergency sale is **only** available for mandatory payments (landing fees). It cannot be used voluntarily to raise cash.

### 28.3 Credit Floor
Credits can never be negative. Any calculation that would result in negative Credits is clamped to 0.

---

## 29. Disconnect/Timeout Behavior

### 29.1 Turn Timer
Each player's normal turn has a **60-second timer**, starting when their turn becomes active and ending when their actions finish.

- At **45 seconds** of elapsed normal-turn time, a warning is shown.
- When the turn enters a sub-phase with its own timer, the normal turn timer pauses. This includes:
  - Auction: **30 seconds**
  - Emergency property sale: **30 seconds**
- When the sub-phase completes, the normal turn timer resumes with the time that remained when it was paused.
- At **60 seconds**, the turn auto-ends:
  - If dice hasn't been rolled: server auto-rolls.
  - If landing hasn't been resolved: unowned properties are skipped (no buy, no auction). Fees are processed automatically; if a mandatory fee cannot be paid, the 30-second emergency-sale sub-phase begins and follows Section 28.2.
  - Any remaining Actions are forfeited.

City Council is not part of a player turn and uses its own separate **45-second timer**.

### 29.2 Disconnect During Turn
If the active player disconnects during their turn:
- If they disconnect during the emergency-sale phase, Section 28.2's deterministic automatic liquidation occurs immediately instead of opening a reconnection window for that selection.
- Otherwise, a **60-second reconnection window** starts and the normal turn timer pauses.
- If they reconnect within 60 seconds, they resume their turn with the normal-turn time that remained.
- If they do NOT reconnect within 60 seconds:
  - The turn auto-completes (same as timeout behavior).
  - The game continues with the next player.

### 29.3 Disconnect While Not Active
If a non-active player disconnects:
- Game continues normally.
- When their turn comes, the 60-second reconnection window applies.
- If still disconnected when their turn arrives, the turn auto-completes.

### 29.3a Operator Pause (product-owner approval, 2026-09-06)

An operator pause freezes all remaining game timers, including the normal turn, Auction, Emergency Sale, City Council, and reconnect grace. Pause duration does not consume their remaining time. Outstanding trades remain pending under their existing rules; any reconnect clock affecting a trade is frozen as well.

Connection status may update while paused, but disconnect-triggered gameplay effects (including liquidation, auction passing, and Council abstention/resolution) are deferred until resume. Resume applies those deferred effects once and resumes the remaining timers. Reconnecting during a pause does not restart a gameplay timer or cancel an already deferred disconnect effect.

### 29.4 Reconnection State
When a player reconnects:
- They receive the full current public game state.
- They receive their private state (Credits, cards, objective, properties).
- They are placed back into the game at their correct position.
- No duplicate resources or actions are created.

### 29.5 Auction/Council Timeout
- If a player is disconnected during an auction, they automatically pass (bid 0).
- If a player is disconnected during City Council voting, they automatically abstain (vote 0).
- Auction uses its own 30-second timer and pauses the active player's normal turn timer until the auction completes.
- City Council uses its own separate 45-second timer; it is not charged against any player's normal turn timer.

---

## 30. Complete Player Turn Example

**Scenario:** Round 4. Player "Ava" has Food District Control (3/4). She is at Space 12. She has 450 Credits, 3 Influence, and the "Quick Build" card.

1. **Roll:** Server generates 4.
2. **Movement bonus:** Ava does not control Entertainment, so no bonus. She moves 4 spaces: 12 → 13 → 14 → 15 → 16.
3. **Passing City Center?** No (she moved from 12 to 16, didn't pass Space 0). No Credits bonus.
4. **Landing:** Space 16 = NexGen AI (Tech / Premium). It's owned by player "Ben" at Level 1.
5. **Landing Fee:** BaseFee 50 + (1 × 30) + (Demand × 15). Suppose Tech Demand is +1: 50 + 30 + 15 = **95 Credits**. Ava pays 95 to Ben. Ava now has 355 Credits.
6. **Action 1:** Ava plays "Quick Build" (SC05) on her property FreshFusion (Food/Mid, currently Level 1). It upgrades to Level 2 for free. Card is consumed.
7. **Action 2:** Ava uses Influence action. Spends 1 Influence to increase Food Demand by +1 (from 0 to +1). Ava now has 2 Influence.
8. **End Turn.** Next player's turn begins.

---

## 31. Complete Round Example

**Round 3 with 4 players (Ava, Ben, Cal, Dana). Turn order this round: Cal, Dana, Ava, Ben.**

1. **Breaking News:** Server draws BN02 "Food Festival" → Food Demand +1 (now +1). Displayed on projector.
2. **Strategy Card draw:** Not Round 4, so skip.
3. **City Council:** This IS Round 3.
   - Server selects Policy Pair 1: Green Initiative (A) vs Digital Transformation (B).
   - Players vote secretly. Cal: 2 votes for A. Dana: 1 vote for B. Ava: 3 votes for A. Ben: 2 votes for B. Totals: A=5, B=3. Green Initiative wins.
   - Effect applied: Food +1 (now +2), Mobility +1, Entertainment −1.
4. **Player Turns:**
   - Cal rolls, moves, resolves, takes 2 actions, ends turn.
   - Dana rolls, moves, resolves, takes 2 actions, ends turn.
   - Ava rolls, moves, resolves, takes 2 actions, ends turn.
   - Ben rolls, moves, resolves, takes 2 actions, ends turn.
5. **Round Resolution:**
   - 5a. Property income: All owned properties generate income based on current Demand and development.
   - 5b. District control recalculated.
   - 5c. District control benefits: Food controller gets +30 Credits, Mobility controller gets +2 Influence, etc.
   - 5d. Full Control status recorded.
6. **Round 3 ends.** Round 4 begins.

---

## 32. Balance Rationale

### 32.1 Economy Flow Analysis

**Income sources per player over 8 rounds (estimated for 5-player game):**

| Source | Estimate per player | Reasoning |
|---|---|---|
| Starting Credits | 1,000 | Fixed |
| City Center passing (~2–3 passes) | 300–450 | 20 spaces, avg 3.5/turn, 8 turns = 28 total spaces ≈ 1.4 laps. With turn order, ~2–3 passes at 150 each. |
| Property income (~3–4 properties, 8 rounds) | 400–800 | Mid L1 property at Demand 0 = 23/round. 3 properties avg ≈ 70/round × 8 = 560. |
| Landing fees received | 100–300 | ~2–3 fee payments received across the game. |
| Breaking News/events | 100–200 | Stimulus events, special spaces. |
| **Total estimated income** | **~1,900–2,750** | |

**Expense sinks:**

| Sink | Estimate per player |
|---|---|
| Property purchases (2–4 properties) | 300–700 |
| Development (4–8 levels total) | 200–600 |
| Landing fees paid | 100–400 |
| **Total estimated expenses** | **~600–1,700** |

**End-game Credits estimate:** ~800–1,500 Credits remaining.

### 32.2 Property Accessibility
- A Cheap property (80) is affordable by Round 1 for every player.
- A Mid property (150) is affordable by Round 1 for every player.
- A Premium property (300) requires ~30% of starting money — risky but possible.
- Players should reasonably own 3–5 properties by game end.

### 32.3 Scoring Range Estimate

| Component | Low | Average | High |
|---|---|---|---|
| Credits | 200 | 800 | 1,500 |
| Property Value | 200 | 600 | 1,500 |
| District Control | 0 | 50 | 200 |
| Influence (×10) | 0 | 30 | 100 |
| Secret Objective | 0 | 100 | 200 |
| Full District Control | 0 | 0 | 200 |
| **Total** | **~400** | **~1,580** | **~3,700** |

This range ensures competitive games without runaway leaders. The ~200-point Secret Objective swing is meaningful (~13% of average score) but not dominant.

### 32.4 Premium Properties
A Premium property costs 300 and at L3 has value 600. Total investment: 750. Return via income: 25+45=70 per round at L3 Demand 0, plus fees. Over 5 rounds of ownership ≈ 350 income + 600 value = 950 vs 750 invested. **Profitable but slow to pay off — rewarding but risky**, as intended.

### 32.5 District Control Feasibility
With 4–6 players and 4 properties per district, achieving 3/4 requires significant investment or trading. With 5 players and 16 properties, each player averages ~3.2 properties, making district control competitive but achievable.

---

## 33. Implementation-Critical Rules

These rules must be enforced exactly. Misimplementation would cause gameplay bugs.

1. **Turn order rotates each round.** In Round R, the player at position ((R−1) mod N) goes first, where N = player count and positions are 0-indexed.

2. **A property cannot be developed on the turn it was purchased.** Track `purchasedThisTurn` flag per property per player-turn.

3. **No auction commission exists.** The winning bid goes fully to the bank.

4. **Landing fee is paid BEFORE the normal Action phase.** SC12 Insurance Policy is the only reaction exception: it may be played immediately before payment, makes the fee 0, consumes 1 Action from the current turn, and counts toward the one-card-per-turn limit.

5. **Movement wraps modularly.** For forward movement, new position = (current + total forward movement distance after applicable forward modifiers) mod 20. For Shortcut backward movement, subtract the unmodified die result and normalize to the 0–19 range; Entertainment does not apply.

6. **City Center passing detection uses modified forward distance.** City Center passing is determined using the player's total forward movement distance after all applicable movement modifiers, including Entertainment district movement bonuses. If the resulting forward movement crosses or lands on Space 0, award +150 Credits. Backward movement caused by Shortcut never triggers the bonus.

7. **Demand is clamped to [−2, +2]** after every modification.

8. **Property income minimum is 0.** Landing fee minimum is 5.

9. **Strategy Card "Rush Hour" replaces the roll entirely.** The player does NOT roll; the result is 6. Entertainment bonus still applies on top for normal forward movement.

10. **"Flash Sale" discount** is a flat 40 Credits off the Base Price. Minimum purchase price = 40.

11. **All randomness is server-side.** Dice, card draws, event selection, objective shuffling/dealing — all server-generated.

12. **Emergency bank sale resets development to 0.** The property becomes unowned at Level 0. Timeout or disconnect auto-liquidation uses ascending current liquidation value, then lowest property ID for ties.

13. **Council votes are private.** Individual vote counts are never revealed to other players.

14. **Breaking News "this round" effects expire at the end of Round Resolution** (after income and control benefits are applied).

15. **Multiple district control benefits can stack.** A player controlling both Food and Tech gets both the +30 Credits and the −20 development discount.

16. **Policies stack unless contradictory.** If two policies both modify the same value, they are applied additively. If directly contradictory, the Round 6 policy takes precedence.

17. **Universal modifier precedence is fixed.** Purchase price, development cost, property income, and landing fee calculations use Section 15A's ordered stages.

18. **Timed sub-phases pause the normal turn timer.** Auction and emergency property sale each use their own 30-second timer. City Council uses its own separate 45-second timer.

19. **Secret Objective offers are sequential and unique on selection.** Each chosen objective leaves the deck; each unchosen objective returns to the bottom before the next player's offer.

---

## 34. Final Rules Checklist

| # | Rule | Status |
|---|---|---|
| 1 | 20-space city layout | ✅ Defined (Section 5) |
| 2 | 16 property names | ✅ Defined (Section 5, 6) |
| 3 | Property tier, base price, base value | ✅ Defined (Section 6.1) |
| 4 | Development costs for all 16 properties | ✅ Defined (Section 6.1, 13.2) |
| 5 | Development/value/fee formulas | ✅ Defined (Sections 6.2, 14, 15) |
| 6 | Property income formula | ✅ Defined (Section 14) |
| 7 | Landing fee formula | ✅ Defined (Section 15) |
| 8 | City Center passing/lap bonuses | ✅ Simplified to +150 (Section 10) |
| 9 | District control bonuses | ✅ Defined (Section 18.3) |
| 10 | Full District Control final bonuses | ✅ Defined (Section 18.4, 26.4) |
| 11 | Influence earning rules | ✅ Defined (Section 17.1) |
| 12 | Special Spaces and events | ✅ Defined (Section 21) |
| 13 | 8 Special Events | ✅ Defined (Section 21.2) |
| 14 | 12 Strategy Cards | ✅ Defined (Section 20.1) |
| 15 | Strategy Card receiving rules | ✅ Defined (Section 20.3) |
| 16 | Breaking News deck | ✅ Defined (Section 22.2) |
| 17 | City Council policy deck | ✅ Defined (Section 23.4) |
| 18 | Council tie-breaking rule | ✅ Policy A wins (Section 23.2) |
| 19 | Secret Objective pool | ✅ Defined (Section 24) |
| 20 | Final scoring procedure | ✅ Defined (Section 26) |
| 21 | Final round handling | ✅ Defined (Section 25) |
| 22 | Income/demand/control timing | ✅ Defined (Section 8.1) |
| 23 | Insufficient funds handling | ✅ Defined (Section 28) |
| 24 | Auction handling | ✅ Defined (Section 12.2) |
| 25 | Trade handling | ✅ Defined (Section 19) |
| 26 | Movement around the loop | ✅ Defined (Section 10) |
| 27 | Turn timing / timeout | ✅ Defined (Section 29.1) |
| 28 | Disconnect/reconnect behavior | ✅ Defined (Section 29) |
| 29 | Win/tie-break procedure | ✅ Defined (Section 27) |
| 30 | All remaining ambiguities | ✅ Resolved |

---

## Consistency Audit

| Question | Resolution |
|---|---|
| When does Breaking News happen? | Start of each round, before player turns. (Section 8.1) |
| When does City Council happen? | Start of Rounds 3 and 6, after Breaking News, before player turns. (Section 23.1) |
| When do player actions happen? | During player turns, after Breaking News and any Council. (Section 8.1) |
| When does property income happen? | Round Resolution, after all player turns. (Section 8.1, step 4a) |
| When does Demand change? | Immediately when caused (Breaking News, player Influence, Council, cards, events). (Sections 16.3, 22.2) |
| When is district control checked? | At Round Resolution (4b) and immediately on ownership change. (Section 18.2) |
| Does Round 8 pay normal income? | **Yes.** (Section 25) |
| Can a player develop a property they just purchased? | **No.** Earliest is their next turn. (Section 6.4) |
| Can the triggering player bid in their auction? | **Yes.** All players may submit exactly one sealed bid. (Section 12.2) |
| Is landing fee paid before or after actions? | **Before the normal Action phase.** SC12 is the explicit reaction exception immediately before payment; it consumes 1 Action and makes the fee 0. (Sections 11, 15A, 20.1) |
| How does movement wrap? | Modular using total movement distance after applicable movement modifiers. (Sections 10.1, 10.4) |
| How do City Center passing and lap bonuses differ? | **Unified for forward movement.** +150 Credits whenever forward movement passes or lands on Space 0; Shortcut backward movement never awards it. (Section 10.2) |
| How is Influence earned? | Setup (5), Mobility control, special events, specific cards. (Section 17.1) |
| How is Influence spent? | Demand manipulation (1 per ±1) and Council voting (1 = 1 vote). (Section 17.2) |
| How does Entertainment movement bonus work? | +1 (or +2 for full control) applies only to normal forward movement after rolling. Shortcut backward movement uses the unmodified die result and receives no Entertainment bonus. (Sections 10.4, 18.3) |
| How does Mobility Influence bonus work? | +2 (or +3) Influence awarded at Round Resolution. (Section 18.3) |
| How is final Property Value calculated? | BaseValue + (DevLevel × DevValueBonus). (Section 6.2) |
| How is Full District Control scored? | +100 in District Control bonus + +100 in Full Control bonus = +200 total per district. (Sections 26.3, 26.4) |
| How are Secret Objectives scored? | +200 if condition met, 0 if not. Evaluated at game end from server state. (Section 24) |
| How are ties broken? | Credits → Property Value → Property Count → Joint placement. (Section 27) |
| How are Secret Objectives dealt? | Use one shuffled 10-objective pool for 4–6 players; sequentially offer 2, remove the chosen objective, and return the unchosen objective to the bottom before the next offer. (Section 24.2) |
| What happens when emergency-sale selection times out or the player disconnects? | Deterministic automatic liquidation by ascending current liquidation value, then lowest property ID. (Section 28.2) |
| How do turn and sub-phase timers interact? | The 60-second normal turn timer pauses for 30-second Auction and Emergency Sale sub-phases, then resumes; Council has a separate 45-second timer. (Section 29) |

---

**GAME DESIGN STATUS: READY FOR IMPLEMENTATION**

All listed open questions have been resolved. Decisions 044, 045, and 046 are APPROVED. The economy has been balance-checked against the 8-round, 4–6 player, 1000-Credit starting state. No contradictions remain in the specification.

This document is the **single source of truth** for ECONOVA: CITY gameplay.
