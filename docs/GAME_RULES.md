# ECONOVA: CITY
# GAME RULES

Version: 1.0
Status: MASTER GAMEPLAY RULESET
Purpose: Authoritative gameplay reference for all development agents

---

# 1. PURPOSE OF THIS DOCUMENT

This document defines the complete gameplay rules for ECONOVA: CITY.

It is the primary source of truth for gameplay.

All game-engine logic, server validation, player actions, scoring, UI states, projector states, and automated tests must follow this document.

If another document or implementation conflicts with this document, the conflict must be reported instead of silently choosing an interpretation.

Agents must not invent gameplay rules that are not defined here.

---

# 2. GAME CONCEPT

ECONOVA: CITY is a multiplayer strategy game in which players compete to build the strongest business empire inside a fictional city.

Players make decisions about:

- acquiring properties
- developing properties
- responding to changing demand
- trading with other players
- managing resources
- using strategic cards
- responding to city events
- influencing city policy
- completing a private objective

The game combines:

- economic decision-making
- strategy
- negotiation
- resource management
- risk and reward
- game theory
- changing market conditions

The game should reward strategic decisions rather than pure luck.

Players should be able to understand the basic objective quickly while still having meaningful strategic choices throughout the game.

---

# 3. PLAYER COUNT

Each game supports:

Minimum players: 4

Maximum players: 6

Two independent games may run simultaneously during the event.

Example:

Room A:
4–6 players

Room B:
4–6 players

The two rooms are completely independent games.

No player, action, property, resource, event, score, or state may cross between rooms.

---

# 4. GAME LENGTH

The standard game lasts:

8 rounds

The game should normally take approximately:

20–30 minutes

The game must have a clear beginning, active gameplay period, and final scoring phase.

There must be no permanent player elimination.

Every player remains capable of making meaningful decisions until the end of the game.

---

# 5. WIN CONDITION

The winner is the player with the highest final wealth/value after the completion of Round 8 and final scoring.

Final scoring combines the player's:

- remaining City Credits
- property value
- development value
- district-related bonuses
- applicable objective rewards
- applicable strategy-card effects
- other explicitly defined end-game bonuses

The exact scoring formula must be implemented exactly as defined in the scoring section of this document.

A player does not win merely by having the most cash.

Building a strong and strategically positioned empire is important.

---

# 6. IN-GAME CURRENCY

The game's fictional currency is:

CITY CREDITS

City Credits have no real-world monetary value.

They are used only inside ECONOVA: CITY.

Players may use City Credits to:

- acquire properties
- develop properties
- complete certain game actions
- participate in other explicitly defined transactions

City Credits cannot be:

- converted into real money
- exchanged for real-world items
- bet for real-world value
- used outside the game

There is no real-money betting or gambling.

---

# 7. CORE GAME COMPONENTS

Each game contains:

- 16 properties
- 4 districts
- City Credits
- property development levels
- district demand values
- Strategy Cards
- Breaking News events
- City Council policies
- Influence
- Secret Objectives
- player ownership
- final scoring

The software must represent every component as authoritative server-side state.

---

# 8. CITY STRUCTURE

The city contains four business districts.

The districts are:

1. FOOD
2. TECH
3. ENTERTAINMENT
4. MOBILITY

Each district contains:

4 properties

Total:

16 properties

The four districts should have distinct identities visually and strategically.

---

# 9. DISTRICTS

## 9.1 FOOD DISTRICT

The Food district represents businesses such as:

- restaurants
- cafés
- food markets
- delivery businesses
- food brands

Food properties respond to changes in consumer demand, city policy, and events affecting consumption.

---

## 9.2 TECH DISTRICT

The Tech district represents businesses such as:

- software
- technology services
- digital platforms
- innovation hubs
- technology companies

Tech properties may benefit from innovation-related events and policies.

---

## 9.3 ENTERTAINMENT DISTRICT

The Entertainment district represents businesses such as:

- cinemas
- gaming venues
- event spaces
- music/entertainment businesses
- lifestyle venues

Entertainment properties may benefit strongly from consumer activity and city events.

---

## 9.4 MOBILITY DISTRICT

The Mobility district represents businesses such as:

- metro-linked businesses
- transport hubs
- mobility services
- logistics
- vehicle-related businesses

Mobility properties may benefit from infrastructure development and transportation-related policies.

---

# 10. PROPERTIES

Every property has a defined:

- property ID
- name
- district
- purchase price
- base income/value
- development cost
- maximum development level
- strategic characteristics
- current owner
- current development level

The property ID must be unique.

Example conceptual structure:

```text
Property
├── id
├── name
├── district
├── purchasePrice
├── baseValue
├── developmentCost
├── maxLevel
├── ownerId
└── developmentLevel

```

The exact property names and numerical values must be maintained in the canonical property configuration.

Agents must not independently invent different property values in different parts of the application.


---

11. PROPERTY OWNERSHIP

A property can have:

no owner

exactly one owner


A property cannot have multiple owners at the same time.

Ownership is determined exclusively by the authoritative game server.

A player may own multiple properties.

There is no hard-coded limit on the number of properties a player may own unless another rule explicitly specifies one.


---

12. BUYING A PROPERTY

A player may purchase an available property when the game phase permits purchasing.

To successfully purchase a property:

1. The player must be allowed to act.


2. The property must currently be unowned.


3. The player must have enough City Credits.


4. Any applicable game restrictions must be satisfied.


5. The server must validate the transaction.


6. The server deducts the purchase price.


7. The server assigns ownership to the player.


8. The property becomes unavailable to other players.


9. The resulting state is broadcast to the appropriate clients.



The client must never directly assign ownership.


---

13. SIMULTANEOUS PURCHASES

If two players attempt to purchase the same property at nearly the same time:

Only one purchase may succeed.

The server must process the actions atomically.

The first valid transaction accepted by the authoritative game state succeeds.

All other attempts must fail cleanly.

A failed player must not lose City Credits.

The UI must clearly communicate that the property is no longer available.


---

14. PROPERTY DEVELOPMENT

Owned properties can be developed.

Development increases the strategic/economic value of the property.

Each property has a development level.

Standard development levels begin at:

Level 0 = undeveloped

and increase up to the property's defined maximum level.

A player may only develop a property they currently own.

A player cannot develop another player's property.

A player cannot develop an unowned property.

A player cannot develop beyond the property's maximum level.


---

15. DEVELOPMENT VALIDATION

Before development, the server must verify:

player identity

room

ownership

game phase

current turn/action permission

available City Credits

current development level

maximum development level

any applicable event/policy restrictions


If any requirement fails:

The development action is rejected.

No resources are deducted.

No development level changes.


---

16. DEMAND SYSTEM

Each district has a Demand value.

Demand represents the current attractiveness of that district.

Demand changes throughout the game.

Demand is dynamic rather than fixed.

The standard Demand scale is:

-2
-1
 0
+1
+2

Where:

-2 = very weak demand

-1 = weak demand

0 = normal demand

+1 = strong demand

+2 = very strong demand


Demand affects the economic performance/value of properties in the corresponding district.


---

17. DEMAND RULE

Demand is district-specific.

A change in Food demand affects Food properties.

It does not automatically affect:

Tech

Entertainment

Mobility


unless an event, policy, or explicitly defined rule states otherwise.

The server must maintain demand separately for every district.


---

18. DEMAND AND PROPERTY VALUE

A property's economic performance is influenced by:

its base value

development level

district demand

applicable events

applicable policies

other explicitly defined modifiers


The exact numerical calculation must be centralized inside the game engine.

The frontend must not independently calculate authoritative payouts.


---

19. DEMAND CHANGES

Demand can change because of:

Breaking News events

City Council policies

other explicitly defined game effects


Demand changes must be applied by the authoritative server.

Whenever demand changes, the relevant clients should receive the updated state.

The projector should visually communicate significant demand changes.


---

20. BREAKING NEWS

Breaking News events introduce changing conditions into the city.

An event may:

increase district demand

decrease district demand

change development economics

alter strategic conditions

create temporary advantages/disadvantages

affect one or more districts

create new opportunities


Every event must have a clearly defined effect.

An event cannot be interpreted differently by different clients.


---

21. EVENT RESOLUTION

When an event occurs:

1. The server selects or determines the event.


2. The event is recorded in the game state.


3. All applicable effects are calculated server-side.


4. State changes are applied.


5. The event is broadcast to the relevant clients.


6. The projector displays the event.


7. Players receive the updated information they are entitled to receive.



Events must never depend on client-side randomness.


---

22. EVENT TIMING

Events occur at predefined points in the game flow.

The game engine must define exactly when an event is resolved.

An event must not randomly interrupt a transaction halfway through.

If an action is currently being resolved, that action must complete according to the server's state-transition rules before the next event begins.


---

23. STRATEGY CARDS

Players may receive Strategy Cards.

Strategy Cards provide strategic abilities or temporary advantages.

A Strategy Card may affect:

a player's resources

a property

development

demand

trading

policy interaction

another explicitly defined game mechanic


Each card must have:

unique ID

name

description

effect

timing

restrictions

usage limit

target requirements if applicable



---

24. CARD OWNERSHIP

Cards belong to individual players.

A player may only play cards they actually possess.

The server must maintain authoritative card ownership.

A client cannot create a card by sending a forged card ID.

The server verifies that the player possesses the card before allowing it to be played.


---

25. CARD CONSUMPTION

If a card is defined as one-time use:

1. Validate the card.


2. Validate the action.


3. Apply its effect.


4. Remove/consume the card.


5. Record the action.


6. Broadcast the resulting state.



A failed card action must not consume the card unless the rules explicitly say otherwise.

Repeated requests must not allow a one-time card to be used twice.


---

26. SECRET OBJECTIVES

Each player receives a Secret Objective.

The objective provides an additional strategic goal.

Examples of objective types may include:

owning a certain number of properties

building a particular district

achieving a specific portfolio

maintaining a particular resource level

strategically positioning an empire


The actual objective assigned to a player is private.


---

27. SECRET OBJECTIVE PRIVACY

A player's Secret Objective must not be revealed to other players before the game-ending reveal unless the rules explicitly require it.

The projector must not display private objectives.

The server must send private objective information only to the relevant player and authorized administrative interfaces.


---

28. SECRET OBJECTIVE SCORING

At the end of the game:

1. The server evaluates the objective.


2. The server determines whether the player completed it.


3. The appropriate bonus is awarded.


4. The result may be revealed during the final scoring sequence.



Objective completion must be evaluated from authoritative game state.

Players cannot manually claim objective completion.


---

29. CITY COUNCIL

The City Council introduces collective decision-making.

City Council sessions occur at designated points in the game.

Standard Council sessions occur after:

Round 3

and

Round 6

The Council may introduce a policy that affects the city.


---

30. INFLUENCE

Players have Influence.

Influence represents their ability to affect City Council decisions.

Influence is separate from City Credits.

Influence cannot automatically be converted into City Credits unless an explicit rule permits it.

The server tracks Influence independently.


---

31. POLICY VOTING

When a Council vote begins:

1. The current game state is frozen appropriately.


2. Eligible policy options are presented.


3. Players receive the voting interface.


4. Players submit votes.


5. The server validates each vote.


6. Each player can vote only according to the defined voting rules.


7. Duplicate votes are rejected.


8. Voting closes.


9. Votes are resolved.


10. The winning policy is determined.


11. The policy effect is applied.


12. The new state is broadcast.




---

32. VOTE PRIVACY

If voting is intended to be secret:

Individual votes must not be revealed before the vote closes.

Players must not be able to inspect another player's vote through client requests or browser state.

The projector should display the appropriate public voting information without exposing private votes prematurely.


---

33. POLICY EFFECTS

Policies may affect:

district demand

development

property economics

trading

Influence

other explicitly defined game systems


Each policy must have a deterministic effect.

Policy effects must be applied by the server.


---

34. NEGOTIATION

Negotiation is an important social component of ECONOVA.

Players may negotiate verbally.

Examples include:

property trades

City Credit trades

strategic agreements

exchanges permitted by the rules


Negotiation happens between players physically or verbally.

The game does not need a private in-game messaging system.


---

35. TRADES

A trade must be explicitly confirmed before becoming official.

A trade may contain only items that are legally tradable under the rules.

The server must validate:

both players

ownership

available resources

tradable items

current game phase

trade legality

exact quantities

duplicate execution


Once confirmed and accepted:

The trade is executed atomically.


---

36. TRADE ATOMICITY

A trade is all-or-nothing.

For example:

If Player A trades:

Property X + 500 City Credits

for

Property Y

the server must ensure that either:

ALL valid changes happen

or:

NONE happen.

There must never be a partially completed trade.


---

37. INVALID TRADES

A trade must be rejected if:

a player does not own the offered property

a player lacks the offered credits

an item is not tradable

the game phase does not allow trading

the trade has expired

the player is no longer eligible

the same trade has already been completed

any other documented rule is violated


No partial resources should be transferred when a trade fails.


---

38. TRADE CONFIRMATION

Important trades should require explicit confirmation.

The player should see:

what they are giving

what they are receiving

the other player

the final terms


The final server-side transaction must match the confirmed terms exactly.

Changing the terms requires a new confirmation.


---

39. NO HIDDEN DIGITAL NEGOTIATION

The game does not require an anonymous/private messaging system for normal negotiation.

Players negotiate socially.

The software records and resolves the final transaction.

This keeps the game social and reduces unnecessary technical complexity.


---

40. GAME PHASES

The game follows a controlled sequence of phases.

The exact internal phase names may vary in implementation, but the authoritative game engine must always know the current phase.

Conceptually:

LOBBY
↓
GAME START
↓
ROUND
↓
EVENT / MARKET UPDATE
↓
PLAYER ACTIONS
↓
TRADING / STRATEGY
↓
COUNCIL WHEN APPLICABLE
↓
ROUND RESOLUTION
↓
NEXT ROUND
↓
FINAL SCORING
↓
GAME COMPLETE

No player may perform an action belonging to another phase.


---

41. ROUND STRUCTURE

There are 8 rounds.

Each round must have a deterministic order of operations.

The game engine must not allow clients to arbitrarily advance phases.

A round only ends when the server determines that all required actions/resolutions are complete.


---

42. PLAYER TURN

When a player has the active turn:

The server identifies the current player.

Only that player may perform actions restricted to the current turn.

Other players may still be able to perform explicitly permitted non-turn actions such as certain negotiations or responses.

The exact permissions are determined by the current game phase and rules.


---

43. TURN VALIDATION

For every turn-restricted action, the server verifies:

player identity

current room

game

current round

current phase

current player

action availability

action-specific requirements


The client must not be trusted to determine whose turn it is.


---

44. TURN COMPLETION

A turn ends when:

the player completes the required action sequence

the player explicitly ends the turn

the server determines the turn is complete

an exceptional administrative action occurs


The server then advances to the next appropriate state.

The client cannot arbitrarily advance the global game state.


---

45. PLAYER ELIMINATION

There is no permanent player elimination.

A player may become financially weak.

However, the player remains in the game and retains the ability to make decisions according to the rules.

The game should avoid situations where one early mistake makes the remaining game meaningless.


---

46. FINANCIAL FAILURE

If a player cannot afford an action:

The action is rejected.

The player may use legal alternatives such as:

selling assets

trading

changing strategy

waiting for future opportunities


if those mechanisms are available under the rules.

The server must never allow negative balances unless the rules explicitly define debt.


---

47. NO NEGATIVE CITY CREDITS

Unless explicitly defined by a future approved rule:

City Credits cannot fall below zero.

The server must enforce:

credits >= 0

A transaction that would create an invalid negative balance must be rejected.


---

48. ASSET SELLING

If asset selling is implemented, it must follow defined rules.

Selling must specify:

what can be sold

sale value

whether development is affected

whether ownership changes

whether restrictions apply

when selling is allowed


Agents must not invent a sale price or mechanic.

If no sale rule is defined, selling is not automatically permitted.


---

49. INFORMATION VISIBILITY

Game information has three categories.

PUBLIC

Examples:

player names

property ownership

public property development levels

public demand

current event

current policy

public scores where applicable


PRIVATE

Examples:

Secret Objective

private cards

private information explicitly designated by the rules


ADMIN

Examples:

full game state

server diagnostics

administrative controls

private information required for game management


The server must enforce these visibility levels.


---

50. PLAYER STATE

Each player should have authoritative state including, where applicable:

playerId
displayName
roomId
cityCredits
influence
ownedProperties
developmentLevels
strategyCards
secretObjective
score
connectionStatus
turnStatus

The actual implementation may use a different internal structure, but the information must remain authoritative.


---

51. GAME STATE

Each game should maintain authoritative state including:

gameId
roomId
status
round
phase
currentPlayer
players
properties
districtDemand
events
activePolicy
policyHistory
trades
cards
objectives
scores
gameHistory

The server must be able to reconstruct the current valid state from its authoritative state and event history where the architecture requires it.


---

52. ACTION MODEL

Player requests should be represented as explicit actions.

Examples:

BUY_PROPERTY
DEVELOP_PROPERTY
PROPOSE_TRADE
ACCEPT_TRADE
REJECT_TRADE
PLAY_CARD
CAST_VOTE
END_TURN

The final action vocabulary may be expanded as the implementation requires.

Every action must have:

action type

player

room

target

payload

unique action identifier

server validation

resulting state transition



---

53. INVALID ACTIONS

Invalid actions must never partially change the game state.

For an invalid action:

REQUEST
↓
VALIDATION
↓
REJECT
↓
NO STATE CHANGE

The server should return a clear error to the requesting player.

The error must not expose sensitive internal information.


---

54. DUPLICATE ACTIONS

Repeated submission of the same action must not cause duplicate effects.

Examples:

Double-clicking:

BUY

must not result in:

two purchases

two deductions

two cards

two developments


The server must protect against duplicate action execution.


---

55. DISCONNECTIONS

If a player disconnects:

authoritative state remains intact

the player remains associated with the game

other players continue according to the defined game rules

the player may reconnect where supported


A disconnected client must not cause the game state to reset.


---

56. RECONNECTION

When a player reconnects:

1. Authenticate/identify the player.


2. Verify room membership.


3. Verify game membership.


4. Send the correct current public state.


5. Send that player's permitted private state.


6. Restore the appropriate interface state.



Do not resend another player's private information.


---

57. GAME RESET

A game reset is an administrative operation.

Resetting a game must:

terminate the current game state

clear players from the active game state as defined by the admin flow

remove temporary state

create a clean new game state

ensure no old property ownership survives

ensure no old cards survive

ensure no old scores survive

ensure no old events survive


Resetting Room A must not affect Room B.


---

58. PAUSING

The game may be paused by an authorized administrator.

While paused:

authoritative state does not advance

restricted player actions are rejected

current state remains preserved

connected clients receive the paused status


Resuming continues from the preserved state.


---

59. GAME COMPLETION

The game ends after Round 8 is fully resolved.

At game completion:

1. No further normal player actions are accepted.


2. Final property values are calculated.


3. Final City Credits are included.


4. Objective bonuses are calculated.


5. Other applicable bonuses are calculated.


6. Final scores are determined.


7. Players are ranked.


8. Ties are resolved using the defined tie-breaker.


9. Final results are displayed.




---

60. FINAL SCORING

Final score should be calculated by the authoritative server.

Conceptually:

FINAL SCORE
=
CITY CREDITS
+
PROPERTY VALUE
+
DEVELOPMENT VALUE
+
DISTRICT BONUSES
+
SECRET OBJECTIVE BONUS
+
OTHER VALID END-GAME BONUSES

The exact numerical values and formulas must be centralized.

The client must never be allowed to submit its own final score.


---

61. TIE-BREAKER

If two or more players have the same final score:

The tie-breaker should be applied deterministically.

Primary tie-breaker:

Higher remaining City Credits.

If still tied:

Higher total property value.

If still tied:

Higher total development value.

If still tied:

The game may declare a joint result rather than using random selection.

The server must apply the same rule every time.


---

62. SCORE DISPLAY

During the game, only information defined as public may be displayed.

At the end of the game, the final ranking may display:

player name

final score

major score components

objective completion

final rank


The final screen should make the winner immediately obvious.


---

63. GAME HISTORY

The server should record important state-changing actions.

Examples:

property purchases

developments

trades

cards played

policy decisions

demand changes

major events

scoring


This history is useful for:

debugging

dispute resolution

testing

admin review

reconstructing what happened



---

64. DISPUTES

If players dispute an outcome:

The authoritative server state and recorded game history are the source of truth.

The admin may inspect the game state/history.

The admin must not manually alter the game simply because a player claims a different result unless an authorized administrative correction is necessary.

Any manual correction must be recorded.


---

65. ADMIN OVERRIDES

Administrative overrides exist only for exceptional situations.

Examples:

correcting an accidental technical state

recovering from an event-day failure

replacing a disconnected player

advancing a frozen game


Admin overrides must be:

authenticated

authorized

logged

clearly separated from normal player actions


Normal players must never access these functions.


---

66. NO REAL-MONEY MECHANICS

ECONOVA is a fictional game.

The game must not contain:

real-money betting

gambling

cash wagering

purchasable advantages

real-money property

real-money rewards

player-to-player real-money transactions


All game resources are fictional.


---

67. FAIRNESS

The game should reward strategic decisions.

No mechanic should unintentionally allow:

permanent runaway advantage from one early action

guaranteed victory from a single card

irreversible elimination

unlimited resource generation

infinite loops

repeated exploitation of one action

impossible-to-counter strategies


Balance changes must be documented and tested.


---

68. NO INFINITE LOOPS

Every action chain must eventually terminate.

Examples of invalid behavior:

Trade
→ Countertrade
→ Trade
→ Countertrade
→ infinite

or:

Card A
→ Card B
→ Card A
→ Card B
→ infinite resources

If mechanics permit chained actions, they must have explicit limits or termination conditions.


---

69. NO DUPLICATION EXPLOITS

The game must prevent duplication of:

City Credits

properties

cards

Influence

development

objective rewards

scoring rewards


Particular attention must be paid to:

reconnects

double clicks

concurrent requests

trade acceptance

browser refresh

stale clients



---

70. NO STATE DESYNCHRONIZATION

The following must always agree with authoritative server state:

player dashboard

projector

admin interface

scoreboard

property ownership

demand

round

turn

game phase


If a client becomes stale, it must be resynchronized rather than becoming an alternative source of truth.


---

71. CLIENT FAILURE

If a player's browser crashes:

The game state must remain valid.

If the projector browser crashes:

The game state must remain valid.

If the admin interface crashes:

The game state must remain valid.

A UI failure must not automatically corrupt or restart the game.


---

72. ROOM INDEPENDENCE

Each room has its own:

game state
players
properties
demand
events
policies
trades
cards
objectives
scores
history

Nothing is shared between active games except static configuration and application infrastructure.


---

73. STANDARD GAME FLOW

The intended high-level flow is:

1. CREATE ROOM

2. PLAYERS JOIN

3. PLAYERS RECEIVE IDENTITIES

4. ADMIN STARTS GAME

5. ROUND 1 BEGINS

6. GAME STATE / MARKET CONDITIONS ARE PRESENTED

7. PLAYERS PERFORM AVAILABLE ACTIONS

8. TRADES / STRATEGIC INTERACTIONS OCCUR

9. ROUND RESOLVES

10. NEXT ROUND

11. BREAKING NEWS / MARKET CONDITIONS CHANGE

12. PLAY CONTINUES

13. CITY COUNCIL OCCURS AT DEFINED ROUNDS

14. POLICY IS RESOLVED

15. ROUNDS 7 AND 8 COMPLETE

16. FINAL SCORING

17. WINNER REVEAL

18. GAME COMPLETE

The exact action ordering within each phase must follow the authoritative implementation and this document.


---

74. DESIGN PRINCIPLE: INFORMATION IS POWER

Public information should allow players to make strategic decisions.

Players should be able to understand:

who owns what

how districts are performing

what the city is currently experiencing

what opportunities exist

what policies are active


Private information should create uncertainty and strategic depth.

The balance between public and private information is intentional.


---

75. DESIGN PRINCIPLE: NEGOTIATION MATTERS

The game should encourage players to talk to each other.

Trading should create moments such as:

mutually beneficial deals

strategic alliances

competitive negotiations

opportunistic purchases

portfolio restructuring


However, the software should keep the transaction process precise.

Players negotiate.

The server executes.


---

76. DESIGN PRINCIPLE: MARKET CONDITIONS CHANGE

A property that looks attractive in one round may become less attractive later.

Players should therefore consider:

current demand

expected future conditions

development costs

district concentration

diversification

other players' strategies


The game should reward adaptation rather than following one fixed strategy.


---

77. DESIGN PRINCIPLE: MULTIPLE PATHS TO VICTORY

Players should be able to pursue different strategic approaches.

Possible approaches include:

concentrated district strategy

diversified portfolio

development-heavy strategy

cash-heavy strategy

trading-focused strategy

policy/influence strategy

objective-focused strategy


No single approach should automatically dominate.


---

78. GAME BALANCE

Balance should be evaluated through actual playtesting.

Important metrics include:

average game length

player wealth distribution

property ownership distribution

win-rate by strategy

usefulness of different districts

usefulness of cards

policy impact

comeback potential

frequency of trades

frequency of meaningful decisions


Do not rebalance based solely on theoretical assumptions.


---

79. RULE CHANGES

Any gameplay rule change requires:

1. Update GAME_RULES.md.


2. Explain the change.


3. Update the game engine.


4. Update affected UI.


5. Update tests.


6. Playtest the change.


7. Record major decisions in DECISIONS.md.



Never change the implementation first and document the new rule later.


---

80. IMPLEMENTATION PRINCIPLE

The software must implement the rules rather than redefine them.

The correct hierarchy is:

GAME RULES
     ↓
GAME ENGINE
     ↓
SERVER STATE
     ↓
CLIENT / PROJECTOR

Not:

UI
↓
whatever the UI happens to allow
↓
game rules

The game engine is responsible for enforcing the rules.


---

81. AUTHORITATIVE RULE

Whenever there is uncertainty about whether an action is legal:

The server must determine legality from:

current game state

current phase

player state

property state

documented rules


The client may suggest available actions, but only the server can authorize them.


---

82. FUTURE EXTENSIONS

Future mechanics may be added only through explicit design approval.

Potential future features must not be implemented merely because they seem interesting.

Any new mechanic must define:

purpose

rules

state

interactions

edge cases

balance implications

security implications

UI requirements

tests


It must then be added to this document before becoming authoritative.


---

83. RULES THAT ARE NOT DEFINED

If a specific numerical value, card effect, property value, event effect, policy effect, or scoring modifier is not defined in this document or an explicitly referenced canonical configuration:

DO NOT INVENT IT.

Flag it as:

UNDEFINED GAME RULE

and request a product decision.

This prevents different agents from silently creating incompatible versions of the game.


---

84. ABSOLUTE GAMEPLAY REQUIREMENTS

The following are non-negotiable:

1. Maximum 6 players per game.


2. Minimum 4 players per standard game.


3. 8 standard rounds.


4. 16 properties.


5. 4 districts.


6. City Credits are fictional.


7. No real-money mechanics.


8. No permanent player elimination.


9. Server-authoritative game state.


10. One owner per property.


11. No negative City Credit balance unless explicitly approved.


12. No duplicate transactions.


13. No duplicate card usage.


14. No duplicate voting.


15. No cross-room state access.


16. Private objectives remain private.


17. Client cannot determine authoritative outcomes.


18. Final scoring is server-calculated.


19. Two simultaneous rooms must operate independently.


20. Gameplay changes must be documented and tested.




---

85. FINAL GAMEPLAY STANDARD

ECONOVA: CITY should create the feeling that every decision matters.

Players should constantly consider:

"What should I buy?"

"Should I develop?"

"Is this district about to become valuable?"

"Should I trade?"

"Should I hold cash?"

"Should I influence the Council?"

"Is another player becoming too powerful?"

"Does my Secret Objective change my strategy?"

The game should create meaningful decisions without becoming difficult to understand.

The rules should remain simple enough for a first-time player to start playing quickly.

The strategy should emerge from the interaction between:

properties

development

demand

events

policies

Influence

trading

cards

Secret Objectives

other players


The final product must be strategically deep, socially engaging, visually exciting, fast, and reliable.

END OF GAME_RULES.md
