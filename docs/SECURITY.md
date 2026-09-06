# ECONOVA: CITY
# SECURITY.md

## Security, Game Integrity & Anti-Cheat Specification

This document defines the security requirements for ECONOVA: CITY.

The objective is not to make the system theoretically impossible to attack.

The objective is to ensure that a player using a normal browser, developer tools, modified requests, direct WebSocket messages, refreshes, reconnects, or deliberate malicious inputs cannot gain an unfair advantage, corrupt game state, access another player's private information, or affect another game room.

Security must never depend on the frontend behaving correctly.

The server is the final authority.

## Approved private operator inspection exception — DECISION-047

Routine admin, projector, and other-player projections must never contain unrevealed player secrets. The operator may inspect strategy cards, secret objectives, sealed bids, and unrevealed Council allocations only through the separate private-inspection endpoint.

`POST /api/admin/rooms/:roomId/private-inspection` requires a valid room-bound admin bearer session, an exact authorized room match, and re-authentication with the operator credential on every request. A global admin login alone is not an inspection session. Authorization is checked before reading state and again after awaiting the audit write. Expired/revoked sessions, invalid credentials, cross-room requests, or unavailable auditing fail closed.

The audit is persisted before returning the private projection and contains identity, room/game, request ID, state version, and access reason, not the inspected content. Responses use `Cache-Control: no-store`; no inspection payload enters WebSocket broadcasts or client projection caches. Operators must not put secrets in audit reasons. Inspection permission does not grant gameplay mutation privileges.

Logout revokes the parent and its room sessions locally even if persistence fails. Such failure returns 503 rather than claiming durable logout; restart-time revocation remains unconfirmed until database recovery.

---

# 1. SECURITY PRINCIPLES

The following principles are mandatory.

## 1.1 Server Authority

The server is the single source of truth for all game state.

The client can request actions.

The client cannot decide whether those actions are valid.

---

## 1.2 Zero Trust Client

Treat every value received from a player device as untrusted.

Assume a malicious player can:

- modify JavaScript
- modify localStorage
- modify sessionStorage
- inspect network requests
- replay requests
- manually construct WebSocket messages
- bypass UI restrictions
- modify request payloads
- call endpoints directly
- send requests faster than the normal UI allows
- disconnect and reconnect repeatedly
- manipulate browser state
- attempt to impersonate another player

The server must remain secure even if the entire frontend is modified.

---

## 1.3 Authoritative State

The following values MUST be controlled by the server:

- player identity
- room membership
- game membership
- player credits
- property ownership
- property levels
- Influence
- cards
- secret objectives
- current round
- current phase
- current turn
- available actions
- action limits
- events
- policies
- votes
- trade state
- scoring
- final rankings
- random outcomes
- game status

A client must never be allowed to submit a new authoritative value for any of these.

---

## 1.4 Validate Every Action

Every action received by the server must be validated independently.

Never assume an action is valid because:

- the button was visible
- the button was disabled
- the frontend checked it
- the player reached the correct screen
- the player previously received permission
- the request came from the official frontend

The server must perform the final validation.

---

# 2. SECURITY BOUNDARY

The system should conceptually operate as:

```text
PLAYER DEVICE
     |
     | Untrusted input
     v
NETWORK
     |
     v
WEBSOCKET / API
     |
     v
AUTHENTICATION
     |
     v
AUTHORIZATION
     |
     v
INPUT VALIDATION
     |
     v
GAME RULE VALIDATION
     |
     v
ATOMIC STATE TRANSITION
     |
     v
AUTHORITATIVE GAME STATE
     |
     +--------> PUBLIC STATE
     |
     +--------> PLAYER PRIVATE STATE
     |
     +--------> ADMIN STATE

```

No client should be able to bypass this chain.


---

3. PLAYER IDENTITY

Player identity must be established by the server.

Do not trust a client-provided player ID merely because it matches a known ID.

A player joining a room must receive a secure server-recognized session.

The session must associate:

session
    -> player
    -> room
    -> permissions

The server must verify this association for every protected action.


---

4. ROOM JOIN SECURITY

A player joining a game should provide only the information required to join.

For example:

room code
player code / join credential
display name if required

Do not require unnecessary personal information.

The server must validate:

room exists

room is joinable

player credential is valid

player is allowed to join

player is not already assigned elsewhere

room capacity has not been exceeded

game state permits joining



---

5. ROOM ISOLATION

Room isolation is a critical security requirement.

Every game room must have an independent authoritative state.

Conceptually:

ROOM A
├── players
├── game state
├── connections
├── event history
└── private states

ROOM B
├── players
├── game state
├── connections
├── event history
└── private states

Never use a global mutable game state that can accidentally mix rooms.

Every room-scoped action must verify:

authenticated player
        +
player's assigned room
        +
requested room

These must match.


---

6. CROSS-ROOM ATTACK PREVENTION

A player in Room A must not be able to:

read Room B state

subscribe to Room B events

send Room B actions

inspect Room B players

inspect Room B private data

modify Room B state

affect Room B scoring

access Room B admin functions


Do not rely on the frontend to prevent this.

The server must enforce it.


---

7. PRIVATE INFORMATION

The server must distinguish between public and private state.

Examples of potentially private information:

secret objectives

private cards

private decisions

private offers

player-specific information

information explicitly defined as hidden by the game rules


Never send the complete server state to every client.

Bad:

Server
  |
  +--> Full Game State --> Player A
  +--> Full Game State --> Player B

Correct:

FULL STATE
                        |
          ┌─────────────┼─────────────┐
          |             |             |
       PUBLIC        PLAYER A      PLAYER B
        STATE       PRIVATE STATE  PRIVATE STATE

A player should not be able to discover hidden information by inspecting network responses.


---

8. CLIENT-SIDE SECURITY IS NOT SECURITY

The following are UI features, not security controls:

hiding buttons

disabling buttons

hiding elements with CSS

checking permissions only in React

storing permissions in localStorage

hiding private information after downloading it

preventing actions only through frontend code


These may improve user experience.

They must never replace server-side authorization.


---

9. ACTION MODEL

All gameplay actions should follow a controlled model.

Example:

ACTION REQUEST
      |
      v
Authenticate
      |
      v
Authorize
      |
      v
Validate payload
      |
      v
Validate room
      |
      v
Validate phase
      |
      v
Validate turn
      |
      v
Validate game rules
      |
      v
Check resources
      |
      v
Apply atomic state transition
      |
      v
Generate result/event
      |
      v
Send appropriate state updates

If any validation fails, the state must remain unchanged.


---

10. ACTION SCHEMAS

Every network action must have a strict schema.

Do not accept arbitrary objects.

Example conceptual structure:

{
    actionId,
    type,
    payload
}

The server must validate:

required fields

field types

string lengths

numeric ranges

allowed enum values

object structure

array sizes

nested structures


Reject unknown or malformed structures where appropriate.

Do not allow arbitrary objects to reach game logic.


---

11. ACTION IDs

Every important client action should have a unique action ID.

Example:

actionId: "uuid-or-equivalent"

The server should use action IDs to help prevent accidental duplicate processing.

This is especially important for:

purchases

trades

card usage

votes

development

payments

other state-changing actions



---

12. REPLAY PROTECTION

A valid action captured from the network must not remain valid forever.

The server should reject:

duplicate action IDs

stale actions

actions from previous phases

actions from previous turns

actions from an outdated game state where applicable


Example:

Player submits BUY_PROPERTY
        |
        v
Server processes it
        |
        v
actionId marked processed
        |
        v
Same action submitted again
        |
        v
REJECT


---

13. DOUBLE-CLICK PROTECTION

A player may accidentally tap a button twice.

The game must not execute the same action twice.

Frontend:

disable or debounce the button where appropriate


Server:

enforce idempotency / duplicate protection


Frontend protection improves UX.

Server protection protects the game.


---

14. RACE CONDITIONS

Race conditions must be explicitly considered.

Example:

Two players attempt to purchase the same property at nearly the same time.

The server must ensure:

REQUEST A
REQUEST B

       ↓

AUTHORITATIVE STATE TRANSITION

       ↓

Exactly one valid purchase

Never allow:

A sees available
B sees available
A buys
B buys
Both succeed

State-changing operations must be atomic where necessary.


---

15. ECONOMIC INTEGRITY

The server must calculate all financial changes.

Never accept:

newBalance

from the client.

Instead accept an action:

BUY_PROPERTY(propertyId)

and calculate:

old balance
- valid cost
= new balance

on the server.

The same principle applies to:

income

expenses

trades

property purchases

development

penalties

rewards

scoring



---

16. PROPERTY OWNERSHIP

Property ownership must be server-controlled.

The client must never be able to submit:

ownerId = playerId

as the authoritative result.

Instead:

BUY_PROPERTY(propertyId)

is submitted.

The server verifies:

property exists

property is available

player is eligible

player can afford it

current game phase permits it

action is legal


Only then does the server update ownership.


---

17. PROPERTY DEVELOPMENT

Development must be validated server-side.

The server must verify:

player owns the property

property can be developed

development limit has not been reached

player has sufficient resources

current game phase permits development

action has not already been consumed

any other game-rule requirements are satisfied


Never trust a client-provided level.


---

18. CARDS

Card ownership and card usage must be server-authoritative.

The server must determine:

which cards exist

which player owns them

whether a card is usable

whether it has already been used

what effect it produces

whether the current phase permits it


A client cannot simply submit:

playCard("powerful-card")

and expect it to work.

The server must verify ownership and eligibility.


---

19. SECRET OBJECTIVES

Secret objectives must never be included in public state.

Do not expose all secret objectives to all players.

Do not send hidden objectives to the projector.

Do not place secret objectives in publicly accessible HTML or JavaScript data.

Only the relevant player should receive their private objective.


---

20. TRADING

Trades require special protection because they involve multiple players.

A trade should have an explicit server-side lifecycle.

Conceptually:

PROPOSED
   ↓
PENDING
   ↓
ACCEPTED / REJECTED / EXPIRED
   ↓
FINALIZED

The server must validate the state at finalization time.

Do not assume the resources offered at proposal time are still available.

Example:

Player A proposes:

Property X
+
100 credits

Then spends the 100 credits elsewhere.

The original trade must not magically succeed.

The server must revalidate the transaction before finalization.


---

21. VOTING

Votes must be server-controlled.

The server must determine:

who is eligible to vote

whether the voting phase is active

whether the player already voted

whether the submitted choice is valid

whether the player belongs to the room


A player must not be able to vote twice by sending two requests.


---

22. TURN SECURITY

The server owns:

current player

current phase

current round

turn transitions


A player cannot simply submit:

playerTurn = true

The server determines whether the player currently has permission to act.

Every turn-sensitive action must verify the current turn.


---

23. PHASE SECURITY

Actions must be tied to game phases.

For example:

LOBBY
STARTING
PLAYER_TURN
EVENT
TRADING
VOTING
SCORING
FINISHED

The exact phases must follow GAME_DESIGN_SPEC.md.

An action valid during one phase must be rejected during another phase.

Do not rely on frontend navigation to enforce this.


---

24. RANDOMNESS

All gameplay randomness must be generated by the authoritative server.

The client must never determine:

random events

random card draws

random outcomes

random movement

random scoring

any other game-affecting random result


If randomness needs to be tested, provide a controlled testing mechanism that is unavailable or protected in production.


---

25. SCORE SECURITY

Final scores must be calculated by the server.

Do not accept:

finalScore

from a client.

The server should calculate scores from authoritative state.

The final leaderboard must be generated from server-side calculations.


---

26. ADMIN AUTHORIZATION

Administrative functions must have a separate authorization layer.

Examples:

start

pause

resume

reset

skip

advance

inspect

end

emergency controls


A normal player must never be able to access these merely by discovering an endpoint or modifying a request.

Admin authorization must be checked server-side for every admin action.


---

27. ADMIN SESSION SECURITY

Admin sessions should be stronger than ordinary player sessions where practical.

Do not expose admin credentials in:

frontend source code

Git

public configuration

browser bundles

screenshots

documentation


Admin endpoints must not rely on an untrusted client flag such as:

isAdmin: true

The server must establish administrative authority.


---

28. WEBSOCKET SECURITY

Treat every WebSocket message as hostile input.

Validate every message.

Do not assume that because the connection was established, every future message is valid.

Check:

authenticated session

player identity

room

permissions

message type

payload

current game state

action eligibility



---

29. WEBSOCKET RATE LIMITING

Protect the server from abusive message rates.

Consider reasonable limits for:

connection attempts

messages per second

action requests

invalid requests

room joins

reconnect attempts


Do not make legitimate gameplay feel slow.

Rate limiting should prevent abuse without interfering with normal player interaction.


---

30. MALFORMED INPUT

The server must safely handle:

missing fields

unexpected fields

wrong data types

negative numbers

extremely large numbers

extremely long strings

invalid IDs

invalid enums

empty objects

oversized arrays

malformed JSON

unexpected WebSocket messages


Malformed input must not crash the server.


---

31. INPUT SIZE LIMITS

Define reasonable limits for:

request size

WebSocket message size

player names

room codes

action payloads

arrays

strings


Do not allow a player to submit enormous payloads that can unnecessarily consume memory or CPU.


---

32. SERVER ERROR HANDLING

A malformed or unauthorized request should result in a controlled error.

Do not expose:

stack traces

database errors

internal file paths

secrets

environment variables

internal architecture

authentication details


to normal players.

Log useful technical details server-side.


---

33. LOGGING

Security-relevant events should be logged.

Examples:

failed authentication

invalid room access

unauthorized action

malformed request

repeated invalid actions

admin authorization failure

suspicious reconnect behavior

server errors

critical state failures


Do not log sensitive information unnecessarily.

Never log:

passwords

authentication secrets

private credentials

sensitive tokens



---

34. AUDIT TRAIL

Important game actions should have enough server-side history to reconstruct what happened when necessary.

Depending on architecture, record appropriate information such as:

timestamp
roomId
playerId
actionId
actionType
result
rejection reason
state/version reference

Do not store unnecessary sensitive information.

The audit trail exists primarily for:

debugging

dispute resolution

security investigation

identifying game-state problems



---

35. CLIENT STATE

Local storage may be used for convenience.

It must never be treated as authoritative.

Assume a player can modify:

localStorage
sessionStorage
cookies
IndexedDB
client JavaScript
React state
browser memory

The server must remain correct regardless.


---

36. SESSION SECURITY

Player sessions should be:

unpredictable

server-recognized

appropriately scoped

invalidatable


A player should not be able to construct another player's valid session merely by changing an ID in the browser.

Sessions must be associated with the correct room and player.


---

37. TRANSPORT SECURITY

When deployed over a network where HTTPS/WSS is available, use secure transport.

For local event deployment, network architecture should still minimize exposure.

Do not expose the game server unnecessarily to the public internet.

If the event can operate entirely on a trusted local network, prefer that where appropriate.


---

38. DEPLOYMENT SECURITY

The production event environment should run only the services required by ECONOVA.

Disable unnecessary services.

Do not expose unnecessary ports.

Do not use development credentials in production.

Do not run production gameplay with debug-only security bypasses enabled.


---

39. DEVELOPMENT VS PRODUCTION

Development conveniences must not accidentally remain enabled in production.

Examples of dangerous development features:

automatic admin access

fake player permissions

debug endpoints

deterministic random mode

arbitrary state mutation

test credentials

state injection

unrestricted reset

development-only bypasses


Clearly separate development/test functionality from production functionality.


---

40. DEBUG TOOLS

Debug tools are allowed during development.

However:

They must be clearly isolated.

They must not be accessible to normal players in production.

If an admin debug tool can directly mutate state, protect it as a highly privileged operation.


---

41. DATABASE SECURITY

Database credentials must never be committed.

Use environment variables.

Use least-privilege credentials where practical.

Do not allow frontend clients to directly access the database.

The application server should control database access.


---

42. DATABASE INTEGRITY

Important persistent operations should use appropriate transactional guarantees.

Never leave the database in a partially updated state because one step of a multi-step operation failed.

For example, if a trade modifies multiple authoritative values, the entire operation should succeed or fail together where appropriate.


---

43. DATABASE QUERIES

Never construct unsafe database queries from raw player input.

Use the database library's parameterized query mechanisms or safe ORM/query-builder mechanisms.

Do not concatenate untrusted input into SQL.


---

44. CROSS-SITE SCRIPTING

Player-provided text such as display names must be treated as untrusted.

Prevent malicious content from becoming executable HTML or JavaScript.

Escape or safely render user-controlled content.

Do not use dangerous HTML injection mechanisms unless absolutely necessary and safely sanitized.


---

45. URL AND NAVIGATION SECURITY

Do not allow player-controlled input to create unsafe redirects or navigation.

Validate any externally supplied URLs if the application supports them.

Prefer internal routes and controlled navigation.


---

46. DEPENDENCY SECURITY

Before adding a dependency:

1. Confirm it is necessary.


2. Prefer established packages.


3. Avoid abandoned packages where practical.


4. Keep dependencies updated appropriately.


5. Review security implications.


6. Avoid unnecessary packages.



Do not install large libraries for trivial functionality.


---

47. SUPPLY-CHAIN SAFETY

Do not execute unknown scripts or install packages from untrusted sources.

Do not copy arbitrary code into the repository without understanding it.

Do not add:

suspicious binaries

unknown executables

undocumented scripts

hidden network services

unexplained external integrations



---

48. THIRD-PARTY SERVICES

The game should not depend on unnecessary third-party services during live gameplay.

Every external dependency introduces another possible:

failure

latency source

privacy concern

outage

configuration problem


For event-day gameplay, prefer local and deterministic infrastructure where practical.


---

49. AVAILABILITY

Security includes keeping the game available.

Protect against:

malformed requests

excessive messages

accidental infinite loops

runaway animations

memory leaks

uncontrolled logging

repeated reconnect storms

oversized payloads


A security mechanism that crashes the server is not acceptable.


---

50. DENIAL-OF-SERVICE CONSIDERATIONS

The player count is small, but the server should still protect itself.

Implement reasonable controls for:

connection frequency

request frequency

message size

computationally expensive operations

repeated invalid actions


Do not build unnecessary enterprise-scale infrastructure.

Use the simplest reliable protection appropriate for the event.


---

51. PRIVATE PROJECTOR STATE

The projector must receive only public game information.

Never send:

secret objectives

hidden cards

private trade details

private decisions

hidden information


to the projector unless the game rules explicitly make that information public at that exact moment.


---

52. PLAYER STATE PROJECTION

Every player connection should receive only what that player needs.

Conceptually:

SERVER STATE

       |
       +--> Public projection
       |
       +--> Player-specific projection
       |
       +--> Admin projection

Do not solve privacy by sending everything and hiding it with UI.


---

53. RECONNECTION SECURITY

When a player reconnects:

1. Authenticate the session.


2. Determine the associated player.


3. Determine the associated room.


4. Verify the player is still allowed to reconnect.


5. Send the correct current state.


6. Do not duplicate the player.


7. Do not replay state-changing actions.


8. Do not reveal other players' private information.




---

54. DISCONNECTION

A disconnected player must not automatically lose or gain resources unless the game rules explicitly define such behavior.

The authoritative game state must remain stable.

Do not allow disconnection to become an exploit.


---

55. REFRESH SECURITY

Refreshing the browser must not:

create a new player

duplicate a player

duplicate a transaction

duplicate a card

duplicate a vote

duplicate a trade

reset authoritative state


The server controls identity and state.


---

56. GAME RESET SECURITY

Resetting a game is an administrative operation.

Normal players must never be able to reset a room.

Reset operations should be clearly distinguished from normal gameplay actions.

If a reset is destructive, require appropriate authorization.


---

57. GAME FINISH SECURITY

Once the game reaches its final state:

gameplay actions should be rejected

scoring should be finalized

leaderboard should derive from authoritative state

duplicate end-game operations should be prevented


A player must not be able to modify the result after the game has finished.


---

58. STATE MACHINE INTEGRITY

The game should behave as a controlled state machine.

Invalid transitions must be rejected.

Example:

LOBBY
  ↓
STARTED
  ↓
ROUND
  ↓
NEXT ROUND
  ↓
FINAL SCORING
  ↓
FINISHED

A client must never be able to force:

LOBBY → FINISHED

or any other invalid transition.


---

59. STATE VERSIONING

Where useful, maintain a server-side state/version number.

Example:

stateVersion: 184

Clients can use this to detect stale state.

The server remains authoritative.

Never allow the client to overwrite authoritative state merely because its version is newer locally.


---

60. EVENT BROADCASTING

After an authoritative state transition:

1. Apply the change.


2. Produce the appropriate event/state update.


3. Send only the information each recipient is authorized to receive.



Do not broadcast sensitive internal server state.


---

61. CLIENT-SERVER DESYNCHRONIZATION

If the client and server disagree:

server wins.

The client must be able to recover by requesting or receiving authoritative state.

Never attempt to "merge" conflicting authoritative game states using client preference.


---

62. SECURITY TESTING SCENARIOS

The development team must deliberately attempt the following.

Money manipulation

Try to change:

1000 credits
→
1000000 credits

through the browser.

Expected:

REJECTED


---

Property manipulation

Try to assign an unowned property without a valid purchase.

Expected:

REJECTED


---

Double purchase

Send the same purchase twice.

Expected:

Exactly one successful transaction.


---

Simultaneous purchase

Two players attempt to purchase the same property simultaneously.

Expected:

Exactly one valid owner.


---

Card duplication

Attempt to use the same one-time card twice.

Expected:

Second use rejected.


---

Vote duplication

Submit multiple votes.

Expected:

Only one valid vote.


---

Turn bypass

Player B attempts to act during Player A's turn.

Expected:

Rejected.


---

Phase bypass

Attempt an action outside its legal phase.

Expected:

Rejected.


---

Cross-room attack

Room A player attempts to access Room B.

Expected:

Rejected.


---

Private-state attack

Player A requests Player B's secret objective.

Expected:

Rejected.


---

Admin attack

Normal player attempts an admin action.

Expected:

Rejected.


---

Replay attack

Replay a previously successful action.

Expected:

Rejected or safely ignored.


---

Stale action

Send an action created for an outdated state.

Expected:

Rejected where state validity requires it.


---

Malformed payload

Send invalid JSON/schema/data.

Expected:

Controlled rejection.

Server remains healthy.


---

Oversized payload

Send excessively large data.

Expected:

Rejected before expensive processing.


---

Reconnect exploit

Disconnect and reconnect during a transaction.

Expected:

No duplicate transaction or state corruption.


---

Refresh exploit

Refresh immediately after an action.

Expected:

Correct authoritative state.

No duplication.


---

63. SECURITY REVIEW FORMAT

Every security finding must be recorded using:

ID:
SECURITY-XXX

SEVERITY:
CRITICAL / HIGH / MEDIUM / LOW

AREA:
Authentication / Authorization / Game Integrity /
Privacy / WebSocket / Database / Frontend /
Performance / Other

FILE:

LOCATION:

DESCRIPTION:

ATTACK SCENARIO:

EXPECTED BEHAVIOR:

ACTUAL BEHAVIOR:

IMPACT:

RECOMMENDED FIX:

REGRESSION TEST:

STATUS:
OPEN / FIXED / VERIFIED / ACCEPTED


---

64. SEVERITY DEFINITIONS

CRITICAL

Can:

corrupt authoritative game state

give a player major unfair advantage

expose all private information

compromise administrative control

affect multiple rooms

compromise the server


Must be fixed before release.


---

HIGH

Can:

provide meaningful cheating advantage

bypass important game rules

access another player's private information

cause serious state inconsistency

compromise important administrative functionality


Must normally be fixed before release.


---

MEDIUM

Limited security or integrity issue that does not immediately compromise the entire game.

Should be fixed before release where practical.


---

LOW

Minor weakness or hardening opportunity.

May be accepted if it does not materially affect event security or game integrity.


---

65. SECURITY FIX REQUIREMENT

When fixing a security issue:

1. Reproduce it.


2. Understand the root cause.


3. Implement the smallest robust fix.


4. Add a regression test.


5. Run relevant tests.


6. Attempt the exploit again.


7. Confirm the exploit no longer works.


8. Document the result.



Do not mark a security issue fixed merely because the code was changed.


---

66. NO SECURITY BY OBSCURITY

Do not assume something is secure because:

the URL is difficult to guess

the endpoint is not linked

the JavaScript is minified

the button is hidden

the room code is short

the player code is not displayed

the implementation is not documented


Assume players can inspect the entire client.

Security must come from server-side controls.


---

67. NO TRUST IN FRONTEND CALCULATIONS

Frontend calculations may be used for display.

They must not be used as authoritative results.

For example:

The frontend may display an estimated property income.

The server must calculate the actual transaction.

The frontend may preview a trade.

The server must validate the final trade.


---

68. SECURITY AND UX BALANCE

Security mechanisms must not unnecessarily make the game difficult to play.

Players should receive clear errors when an action is rejected.

Example:

Bad:

HTTP 403

Better:

That action isn't available right now.

Where appropriate, the UI may explain:

It's Player 3's turn.

Do not reveal sensitive security details.


---

69. EVENT-DAY SECURITY MODE

Before the event, confirm:

production configuration is active

debug mutation tools are disabled

test credentials are removed

admin credentials are protected

unnecessary ports/services are disabled

database credentials are not exposed

room isolation has been tested

private state has been tested

duplicate actions have been tested

reconnect has been tested

two-room operation has been tested



---

70. SECURITY RELEASE GATE

ECONOVA must NOT be declared release-ready if any unresolved issue can:

modify money illegally

modify property ownership illegally

duplicate valuable resources

bypass turns

bypass major gameplay phases

manipulate final scoring

access another player's private information

access another room

access admin controls

corrupt authoritative state

cause serious multiplayer inconsistency


These are release blockers.


---

71. FINAL SECURITY CHECKLIST

Before event deployment, verify:

[ ] Server is authoritative.

[ ] Client state is never trusted.

[ ] Every gameplay action is validated server-side.

[ ] Every protected action is authenticated.

[ ] Every protected action is authorized.

[ ] Room membership is verified server-side.

[ ] Room A and Room B are isolated.

[ ] Private player data is not broadcast publicly.

[ ] Secret objectives are private.

[ ] Cards are server-controlled.

[ ] Credits are server-controlled.

[ ] Property ownership is server-controlled.

[ ] Development levels are server-controlled.

[ ] Scoring is server-controlled.

[ ] Random outcomes are server-controlled.

[ ] Duplicate actions are prevented.

[ ] Replay attacks are handled.

[ ] Race conditions have been tested.

[ ] Turn restrictions are enforced server-side.

[ ] Phase restrictions are enforced server-side.

[ ] Trade finalization is revalidated.

[ ] Votes cannot be duplicated.

[ ] Admin actions are protected.

[ ] WebSocket messages are validated.

[ ] Malformed input cannot crash the server.

[ ] Input size limits exist.

[ ] Reasonable rate limiting exists.

[ ] Secrets are not committed.

[ ] Production debug features are disabled.

[ ] Database access is server-side only.

[ ] Database queries are safely parameterized.

[ ] Player-controlled text is safely rendered.

[ ] Reconnection does not duplicate state.

[ ] Browser refresh does not duplicate state.

[ ] Server/client desynchronization resolves in favor of server state.

[ ] Security findings have been reviewed.

[ ] Critical findings are resolved.

[ ] High findings are resolved or explicitly approved.

[ ] Regression tests exist for important security bugs.

[ ] Two simultaneous rooms have been tested.

[ ] Full adversarial security testing has been performed.

[ ] Final event-day security check has been completed.


---

72. ABSOLUTE RULE

When in doubt:

DO NOT TRUST THE CLIENT.

DO NOT GUESS THE GAME STATE.

DO NOT BYPASS VALIDATION.

DO NOT EXPOSE PRIVATE STATE.

DO NOT ALLOW CROSS-ROOM ACCESS.

DO NOT SILENTLY CHANGE SECURITY RULES.

DO NOT CLAIM SECURITY IS VERIFIED WITHOUT TESTING.

The server decides what is true.

The game rules decide what is legal.

The security layer ensures players cannot bypass either.

END OF SECURITY.md
