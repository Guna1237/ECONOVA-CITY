# TESTING.md

# ECONOVA: CITY
## TESTING AND QUALITY ASSURANCE SPECIFICATION

This document defines how ECONOVA: CITY must be tested before being considered reliable enough for live event use.

The objective is not simply to prove that the normal game flow works.

The objective is to prove that:

- the game rules work correctly
- the server maintains one authoritative state
- illegal actions cannot alter the game
- multiple players can play simultaneously
- two independent rooms remain isolated
- private information remains private
- reconnects do not corrupt state
- repeated or simultaneous actions cannot duplicate transactions
- the frontend accurately reflects server state
- the projector accurately reflects public state
- the application remains responsive
- failures are handled safely
- the complete game can be played from start to finish
- the system can survive realistic event-day conditions

A feature is not considered complete merely because it works during one normal manual test.

---

# 1. TESTING PRINCIPLES

All testing must follow these principles.

## 1.1 Test the actual behavior

Do not assume that code is correct because it looks correct.

Test the running system wherever practical.

---

## 1.2 Test normal and abnormal behavior

Every important feature should be tested for:

- valid input
- invalid input
- boundary conditions
- repeated input
- delayed input
- simultaneous input
- disconnected input
- unauthorized input
- malformed input

---

## 1.3 The server is the authority

Tests must verify that clients cannot manipulate authoritative state.

Never rely exclusively on frontend restrictions.

A button being disabled is not a security control.

---

## 1.4 Every important bug gets a regression test

When a bug is discovered and fixed:

1. Reproduce it.
2. Create a test that demonstrates the failure.
3. Implement the fix.
4. Run the new test.
5. Run the relevant existing tests.
6. Keep the regression test permanently.

A bug must not simply be fixed manually and forgotten.

---

# 2. TESTING LEVELS

ECONOVA should use multiple layers of testing.

## 2.1 Static checks

Use these to catch problems before runtime.

Examples:

- TypeScript type checking
- linting
- formatting checks
- build validation
- dependency checks

These do not replace runtime tests.

---

## 2.2 Unit tests

Test isolated logic.

Primary targets:

- game calculations
- state transitions
- validation
- scoring
- property calculations
- demand calculations
- card effects
- policy effects
- turn transitions
- round transitions
- win conditions
- utility functions

Unit tests should be fast and deterministic.

---

## 2.3 Integration tests

Test multiple systems working together.

Examples:

- game engine + server
- server + WebSocket layer
- server + database
- room creation + player joining
- action + state update
- state update + broadcast
- reconnect + state restoration

---

## 2.4 Multiplayer tests

Test multiple connected players.

Examples:

- two players
- four players
- six players
- simultaneous actions
- competing purchases
- trades
- voting
- turn changes
- reconnects
- disconnected players

---

## 2.5 Security tests

Test the system as if a player is deliberately trying to cheat.

Security tests must attempt to bypass normal UI restrictions.

---

## 2.6 End-to-end tests

Test complete user journeys through the real browser.

Examples:

```text
Create room
→ Join room
→ Lobby
→ Start game
→ Play turn
→ Perform action
→ Receive result
→ Continue game
→ Complete game
→ Final scoring


```

---

2.7 Manual event testing

Automated tests cannot completely replace human testing.

Before the event, the actual hardware and network environment must be tested.


---

3. TESTING TOOLS

Use the project's selected tools and versions.

Recommended categories:

TypeScript compiler for type checking

ESLint for linting

Vitest for unit/integration tests

Playwright for browser/E2E testing

WebSocket integration tests for realtime behavior

appropriate database test tooling

appropriate load/performance tooling


Do not introduce a new testing framework unless there is a clear reason.

Check the existing project before adding dependencies.


---

4. TEST NAMING

Tests must clearly describe behavior.

Prefer:

rejects_purchase_when_player_has_insufficient_credits

over:

test1

For gameplay tests, describe:

condition

action

expected result


Example:

allows_owner_to_develop_level_one_property
rejects_development_when_property_is_not_owned
rejects_purchase_when_property_is_already_owned


---

5. DETERMINISTIC TESTING

Gameplay tests should be deterministic wherever possible.

Random events should be controllable during testing.

Tests should be able to specify known:

random seeds

card draws

event outcomes

starting state

player state

property state

demand state


Do not create tests that randomly pass or fail.

A test that sometimes fails because of uncontrolled randomness is unacceptable.


---

6. TEST DATA

Use dedicated test fixtures.

Do not depend on:

production data

real player accounts

real event rooms

manually modified databases


Test fixtures should allow controlled creation of:

rooms

players

properties

game states

cards

objectives

demand

credits

Influence

rounds

turns

policies

events


Test data should be easy to understand and reset.


---

7. GAME ENGINE TESTING

The game engine is one of the highest-priority test areas.

Test every documented game rule in GAME_RULES.md.


---

7.1 Initial game state

Verify:

correct number of players can join

invalid player counts are rejected

correct starting resources are assigned

correct properties are available

correct cards are available

correct objectives are assigned

correct starting round exists

correct starting phase exists

no unintended ownership exists

no unintended resources exist



---

7.2 Turn system

Test:

correct starting player

correct turn order

turn advances correctly

player cannot act outside their turn

turn cannot be skipped illegally

repeated end-turn requests do not advance multiple times

disconnected players do not corrupt turn state

reconnecting players receive the correct turn state



---

7.3 Round system

Test:

round starts correctly

round ends correctly

round cannot advance twice

events occur in the correct phase

policies occur in the correct phase

scoring occurs at the correct time

final round ends correctly

game cannot continue after the official end state



---

8. PROPERTY TESTING

For every property-related action test:

Purchase

Verify:

available property can be purchased

unavailable property cannot be purchased

insufficient credits reject purchase

wrong player cannot purchase during another player's turn

invalid property ID is rejected

duplicate requests cannot duplicate ownership

simultaneous buyers cannot both obtain an exclusive property

credits change correctly

ownership changes correctly

public state updates correctly

private player state updates correctly



---

Development

Verify:

only eligible properties can be developed

only the owner can develop

sufficient resources are required

development limits are respected

invalid levels are rejected

development cannot happen in an invalid phase

development cannot be duplicated through repeated requests

resulting income/state is correct



---

9. ECONOMY TESTING

Every economic calculation must be tested at:

minimum value

normal value

maximum expected value

boundary values

invalid values


Test:

starting credits

income

costs

property prices

demand modifiers

development costs

trade transfers

policy effects

event effects

final valuation

scoring


Verify that no calculation accidentally produces:

negative resources where prohibited

NaN

Infinity

unexpected decimals

integer overflow

impossible values



---

10. DEMAND TESTING

Test every documented demand transition.

Verify:

correct district changes

correct direction

correct limits

correct property impact

correct event interaction

correct display

correct persistence through state updates


Test boundary conditions.

For example, if demand has a defined minimum and maximum:

below minimum → clamp/reject according to GAME_RULES.md
maximum + increase → clamp/reject according to GAME_RULES.md

Never allow demand to move outside its documented range.


---

11. CARD TESTING

For every card:

Test:

correct availability

correct ownership

correct activation conditions

correct cost if applicable

correct effect

correct target validation

card cannot be used illegally

card cannot be used twice

card is correctly consumed/retained

card state survives reconnect

card state is private when appropriate

card effect cannot be forged by the client


Each card should have dedicated tests for its unique behavior.


---

12. TRADE TESTING

Trades require particularly careful testing.

Test:

valid trade

invalid trade

insufficient credits

nonexistent property

property not owned by proposer

property not owned by recipient

duplicate trade acceptance

acceptance after expiration/cancellation

cancellation

rejection

simultaneous trade actions

reconnect during trade

disconnect during trade

trade state synchronization

resulting ownership

resulting resources


A trade must be atomic.

Either the complete valid trade occurs or nothing changes.

Never allow:

Player A loses property
but
Player B does not receive it

or:

Player B receives property
but
Player A keeps it


---

13. POLICY / VOTING TESTING

Test:

correct voting phase

eligible voters

one vote per player where applicable

duplicate vote prevention

invalid vote rejection

disconnected player behavior

vote counting

tie handling

policy application

policy state synchronization

public result display


Verify that clients cannot submit votes for another player.


---

14. EVENT TESTING

For every event:

Test:

correct trigger

correct timing

correct effect

correct affected players/properties

correct public announcement

correct private information handling

correct state update

repeated event prevention

invalid event injection prevention


Clients must never be able to choose an event outcome unless explicitly permitted by the game rules.


---

15. SCORING TESTING

Scoring is release-critical.

Test:

every scoring component independently

combined scoring

minimum score

normal score

maximum expected score

ties

secret objectives

property values

bonuses

penalties

final round

end-game calculation


The final leaderboard must be generated from authoritative server state.

Never trust scores submitted by a client.


---

16. WIN CONDITION TESTING

Verify:

correct game-ending condition

game ends exactly once

no actions are accepted after game end

final scoring occurs correctly

winner is correct

ties are handled according to GAME_RULES.md

projector receives final state

player interfaces receive final state

refresh after game end does not restart the game



---

17. SERVER AUTHORITY TESTING

This is mandatory.

Attempt to send manipulated requests directly to the server.

For example, attempt to submit:

credits: 999999

or:

propertyOwner: player1

or:

score: 999999

or:

currentTurn: attacker

or:

round: 99

The server must ignore/reject unauthorized client-controlled state.

The test must verify that the authoritative state remains unchanged.


---

18. CLIENT MANIPULATION TESTING

Test using browser developer tools or direct requests where appropriate.

Attempt to manipulate:

localStorage

session state

request payloads

WebSocket messages

player IDs

room IDs

resource values

property IDs

action sequences


The system must remain secure.

Never rely on hidden UI elements as security controls.


---

19. ACTION REPLAY TESTING

For every important state-changing action:

1. Submit valid action.


2. Record the request.


3. Submit it again.


4. Submit it multiple times rapidly.



Verify that the action cannot produce duplicate effects.

Examples:

duplicate purchase

duplicate development

duplicate card usage

duplicate trade

duplicate vote

duplicate end turn



---

20. RACE CONDITION TESTING

Simulate simultaneous actions.

Important scenarios include:

Player A buys Property X
+
Player B buys Property X

Expected:

Only one valid transaction succeeds.


---

Player A submits END_TURN twice

Expected:

Only one turn transition occurs.


---

Player A accepts trade twice

Expected:

Trade executes once.


---

Two clients submit conflicting actions at nearly the same time

Expected:

The server resolves them deterministically according to the authoritative state and game rules.


---

21. WEBSOCKET TESTING

Test:

successful connection

invalid connection

valid authentication

invalid authentication

room joining

room isolation

message validation

malformed messages

unknown actions

duplicate messages

stale messages

oversized messages

disconnect

reconnect

multiple players

simultaneous messages

server restart behavior where applicable


A malformed WebSocket message must not crash the server.


---

22. ROOM ISOLATION TESTING

Create:

ROOM A
ROOM B

Connect players to both.

Verify:

Room A receives only Room A public state.

Room B receives only Room B public state.

Player A receives only Player A private state.

Player B receives only Player B private state.

Room A actions cannot modify Room B.

Room B actions cannot modify Room A.

Room A events are not broadcast to Room B.

Room A admin actions cannot affect Room B.

Room B admin actions cannot affect Room A.


This is a release blocker if broken.


---

23. PRIVATE DATA TESTING

Inspect actual network payloads.

Do not only inspect what the UI displays.

Verify that a player does not receive unauthorized:

secret objectives

private cards

private decisions

hidden information

admin information

other player's private state


If information is private, it should not be present in the unauthorized client's payload.


---

24. RECONNECTION TESTING

Test:

Player joins
→ Game starts
→ Player refreshes
→ Player reconnects

Verify:

correct identity

correct room

correct private information

correct resources

correct properties

correct turn

correct round

correct pending actions

no duplicate player

no duplicate transaction


Also test:

disconnect during purchase
disconnect during trade
disconnect during voting
disconnect during round transition
disconnect during event

The authoritative state must remain consistent.


---

25. REFRESH TESTING

Refreshing a browser must not:

create a new player

duplicate resources

duplicate properties

duplicate cards

duplicate votes

duplicate actions

reset the player's state

expose another player's state


Test refresh on both:

player client

projector client



---

26. PROJECTOR TESTING

Test the projector at the actual target resolution.

Verify:

important information is readable

current player is obvious

round is obvious

public state is correct

property ownership is correct

demand is correct

events display correctly

policy results display correctly

final leaderboard is correct

animations do not obscure important information

no private information appears


Test from an actual viewing distance.

Do not rely only on looking at the projector screen from one meter away.


---

27. PLAYER MOBILE TESTING

Test on realistic student devices.

Verify:

portrait layout

common Android browsers

touch targets

buttons

cards

scrolling

orientation changes where supported

loading

reconnect

error messages

disabled actions

rapid taps


A player should never be required to use desktop developer tools or precision mouse interaction.


---

28. RESPONSIVE TESTING

At minimum test:

small mobile

large mobile

tablet

desktop

1920×1080 projector


Important information must remain accessible.

No critical button should disappear because of viewport size.


---

29. VISUAL REGRESSION TESTING

After major UI changes, compare important screens.

Test:

lobby

player dashboard

projector board

property interaction

event screen

policy/voting screen

trade screen

final results


Look for:

broken spacing

overlapping elements

unreadable text

inconsistent components

missing animations

broken responsive behavior

accidental style changes



---

30. ANIMATION TESTING

Animations must not block gameplay.

Verify:

animation begins correctly

animation completes

UI remains usable

repeated actions do not queue infinite animations

rapid state changes do not break animation state

reconnect does not leave animations permanently stuck

projector remains readable

low-performance devices remain usable


If an animation fails, the underlying game state must still be correct.


---

31. PERFORMANCE TESTING

Performance testing must measure actual behavior.

Monitor:

initial load time

JavaScript bundle size

memory usage

CPU usage

GPU/rendering performance where applicable

WebSocket latency

server response time

state update frequency

number of unnecessary renders

database latency

reconnection time


The exact thresholds should follow docs/PERFORMANCE.md.

Do not invent new thresholds if they are already documented there.


---

32. REALTIME PERFORMANCE

Test with:

4 players

6 players

12 players

two simultaneous rooms


Measure:

action-to-server latency

server processing time

server-to-client update latency

projector update latency

synchronization consistency


The system must remain responsive during simultaneous activity.


---

33. LOAD TESTING

Although the intended player count is small, test beyond the expected event load.

The purpose is not to support thousands of players.

The purpose is to discover unexpected bottlenecks.

At minimum simulate:

expected player count

two simultaneous rooms

rapid actions

many WebSocket messages

repeated invalid actions

simultaneous connections

reconnect bursts


Document results.


---

34. SERVER FAILURE TESTING

Where practical, test:

server restart

database unavailable

database reconnect

WebSocket disconnect

temporary network failure

invalid environment configuration

missing required configuration


The system should fail clearly rather than silently corrupting state.


---

35. DATABASE TESTING

Verify:

valid connection

invalid credentials fail safely

required migrations work

expected schema exists

transactions behave correctly

rollback works where applicable

corrupted/incomplete operations do not leave partial state

test database can be reset cleanly


Never run destructive tests against production data.


---

36. INPUT VALIDATION

Every externally supplied value must be validated.

Examples:

player IDs

room IDs

property IDs

action types

numeric values

card IDs

trade values

vote values


Test:

missing values

null values

wrong types

empty strings

excessively long strings

negative numbers

extremely large numbers

unexpected objects

unexpected arrays

malformed JSON

unknown enum values


Validation must occur server-side.


---

37. ERROR STATE TESTING

Every important user action should have an understandable failure state.

Examples:

Action rejected
Connection lost
Room unavailable
Game already started
Not your turn
Property unavailable
Insufficient credits
Invalid trade
Session expired
Game ended

The UI should recover gracefully.

An error message must not leave the player stuck.


---

38. RAPID-INTERACTION TESTING

Test:

rapid double taps

rapid repeated clicks

clicking while animation is running

clicking disabled actions

opening and closing panels quickly

sending multiple actions before server response


The system must not produce duplicate state transitions.


---

39. STATE CONSISTENCY TESTING

At important points compare:

Server authoritative state
vs
Player client state
vs
Projector state

They must agree on all information that is public to that client.

Examples:

credits

ownership

property levels

demand

round

turn

events

policy state

leaderboard


Private state should differ appropriately.


---

40. END-TO-END COMPLETE GAME TEST

At least one full test game must be played from:

Room creation
→ player joining
→ lobby
→ game start
→ all rounds
→ events
→ purchases
→ development
→ trades
→ policies
→ voting
→ final round
→ final scoring
→ winner
→ game end

Do not skip phases merely because individual unit tests exist.

The complete system must work together.


---

41. TWO-ROOM COMPLETE GAME TEST

Before release, run two games simultaneously.

Example:

ROOM A
6 players

ROOM B
6 players

Run both through a substantial portion of the game.

Verify:

independent turns

independent state

independent events

independent scoring

independent player connections

independent projector state

no cross-room messages

no cross-room state changes

no meaningful performance degradation


Ideally complete both games independently.


---

42. SECURITY ATTACK CHECKLIST

Before release, attempt to:

[ ] Change credits through client manipulation
[ ] Change property ownership
[ ] Give yourself a card
[ ] Give yourself Influence
[ ] Change score
[ ] Change round
[ ] Change turn
[ ] Trigger an event
[ ] Trigger an admin action
[ ] Vote as another player
[ ] Act as another player
[ ] Join another room
[ ] Read another player's private information
[ ] Read another room's state
[ ] Replay an old action
[ ] Submit an action twice
[ ] Submit simultaneous conflicting actions
[ ] Send malformed WebSocket messages
[ ] Send invalid action types
[ ] Send invalid IDs
[ ] Send extreme numeric values
[ ] Manipulate localStorage
[ ] Refresh during an action
[ ] Disconnect during an action
[ ] Reconnect as another identity
[ ] Access privileged endpoints
[ ] Attempt to crash the server

Every failed attack should remain blocked.


---

43. REGRESSION TESTING

Before every release candidate:

1. Run unit tests.


2. Run integration tests.


3. Run multiplayer tests.


4. Run security tests.


5. Run E2E tests.


6. Run the build.


7. Perform manual smoke testing.



Do not assume a new feature only affects its own area.


---

44. SMOKE TEST

After every major build, quickly verify:

[ ] Application starts
[ ] Server starts
[ ] Client loads
[ ] Room can be created
[ ] Player can join
[ ] Game can start
[ ] Player can perform a valid action
[ ] Server accepts action
[ ] Projector updates
[ ] Player UI updates
[ ] Turn advances
[ ] Reconnect works

If a smoke test fails, stop further feature development until the problem is understood.


---

45. TEST ENVIRONMENTS

Maintain separation between:

Development

For active development.

Test

For automated and manual testing.

Event/Production

For the final event environment.

Never test destructive behavior against the live event environment.


---

46. TEST RESET

Tests must be repeatable.

Provide a reliable way to reset:

database

rooms

players

game state

test fixtures


Do not require manually editing database records between tests.


---

47. TEST LOGGING

Test failures should provide useful information.

Include:

test name

relevant state

action

expected result

actual result

error

reproduction steps


Avoid logging secrets or private player information unnecessarily.


---

48. TEST COVERAGE

Coverage percentages are useful but are not the primary definition of quality.

Do not chase coverage by writing meaningless tests.

Prioritize coverage of:

game rules

state transitions

money/resource changes

property ownership

scoring

turn logic

room isolation

private data

authentication

authorization

action validation

concurrency

reconnect behavior


A small number of high-value tests is better than thousands of meaningless tests.


---

49. DEFINITION OF TEST PASS

A test passes only when:

expected behavior occurs

no unexpected side effect occurs

authoritative state remains correct

relevant clients receive correct updates

no relevant errors occur


A test that produces the correct visible result while corrupting hidden state is a failure.


---

50. TEST FAILURE HANDLING

When a test fails:

1. Do not immediately delete or weaken the test.


2. Determine whether the implementation or test is wrong.


3. Reproduce the failure.


4. Inspect the relevant state.


5. Fix the underlying issue.


6. Run the failing test again.


7. Run related tests.


8. Run the broader regression suite.


9. Document the issue if significant.



Never change expected results simply to make a test pass unless the documented specification has intentionally changed.


---

51. RELEASE CANDIDATE TESTING

Before declaring a build a release candidate:

Run:

Type checking
Linting
Unit tests
Integration tests
Multiplayer tests
Security tests
E2E tests
Production build
Two-room test
Reconnect test
Manual smoke test
Performance check

All release-blocking tests must pass.


---

52. EVENT-DAY TESTING

Before players arrive, perform a short operational test.

Verify:

[ ] Correct production build
[ ] Correct environment variables
[ ] Server starts
[ ] Database available
[ ] Local network available
[ ] Projector A connected
[ ] Projector B connected
[ ] Room A available
[ ] Room B available
[ ] Player join flow works
[ ] Admin controls work
[ ] Test player can perform an action
[ ] Projector updates correctly
[ ] Player device updates correctly
[ ] Reconnect works
[ ] Emergency reset procedure works
[ ] Backup build is available
[ ] Backup server/device is available where planned

Do not perform experimental development during the live event.


---

53. EVENT-DAY STABILITY RULE

Once the final event build has passed release testing:

DO NOT introduce:

new features

major refactors

new dependencies

experimental animations

untested gameplay changes

architecture changes


unless a critical issue requires it.

Freeze the release.


---

54. FINAL MANUAL DRESS REHEARSAL

Before the event, perform a complete rehearsal using:

actual projectors

actual network

realistic player devices

actual browser setup

final production build

final game configuration


Have testers behave like real students rather than developers.

Do not explain what buttons should do.

Observe whether players naturally understand the interface.

Record:

confusion

delays

mistakes

unclear instructions

visual problems

connection problems

performance problems


Fix the highest-impact issues.

Repeat the rehearsal after major fixes.


---

55. ACCEPTANCE CRITERIA

ECONOVA is acceptable for live use only when all critical areas pass:

GAMEPLAY

documented rules work

scoring is correct

turns work

rounds work

actions are validated


SECURITY

unauthorized actions are rejected

client manipulation cannot alter authoritative state

private data is protected

rooms are isolated


MULTIPLAYER

expected player count works

simultaneous actions are handled

reconnect works

duplicate actions are prevented


VISUAL

projector is readable

player UI is usable

animations do not interfere with gameplay

responsive layouts work


PERFORMANCE

game remains responsive

WebSocket communication remains stable

two rooms operate simultaneously

no serious memory/CPU/GPU problems exist


RELIABILITY

invalid actions do not crash the server

reconnect works

failures are handled safely

event-day startup works



---

56. FINAL RELEASE GATE

The release manager must record:

BUILD:
PASS / FAIL

TYPE CHECK:
PASS / FAIL

LINT:
PASS / FAIL

UNIT TESTS:
PASS / FAIL

INTEGRATION TESTS:
PASS / FAIL

MULTIPLAYER TESTS:
PASS / FAIL

SECURITY TESTS:
PASS / FAIL

E2E TESTS:
PASS / FAIL

TWO-ROOM TEST:
PASS / FAIL

RECONNECT TEST:
PASS / FAIL

PERFORMANCE:
PASS / FAIL

PROJECTOR:
PASS / FAIL

MOBILE:
PASS / FAIL

FULL GAME:
PASS / FAIL

MANUAL REHEARSAL:
PASS / FAIL

CRITICAL ISSUES:
0 / NUMBER

HIGH ISSUES:
0 / NUMBER

RELEASE:
READY / NOT READY

The build is READY only if all release-critical checks pass and there are no unresolved critical or high-severity issues.


---

57. WHAT NOT TO DO

Never:

delete failing tests

weaken validation to pass tests

mock away the entire game engine

test only the happy path

trust frontend restrictions

ignore race conditions

ignore reconnect behavior

ignore two-room behavior

ignore private data exposure

ignore performance because player count is small

claim tests passed without running them

claim security without attempting attacks

declare release-ready because the UI looks good



---

58. FINAL QUALITY STANDARD

The question is not:

"Does the feature work?"

The question is:

"Can a group of students use this feature simultaneously, incorrectly, repeatedly, maliciously, and under imperfect network conditions without corrupting the game?"

If the answer is yes, the feature is strong.

If the answer is unknown, it is not fully tested.

If the answer is no, it is not ready.

ECONOVA: CITY must be treated as a real multiplayer application during testing, even though it is being built for a university event.

Reliability, security, game integrity, and event-day stability come before feature count.

END OF TESTING.md
