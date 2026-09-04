# ECONOVA: CITY
## PRODUCT SPECIFICATION

**Document:** `docs/PRODUCT.md`  
**Product:** ECONOVA: CITY  
**Status:** Master Product Definition  
**Purpose:** Defines what ECONOVA: CITY is, who it is for, what the experience should feel like, and what the product must deliver.

---

# 1. PRODUCT OVERVIEW

ECONOVA: CITY is a multiplayer strategy game designed for a live university event.

Players compete to build the strongest business empire inside a fictional city.

The game combines:

- strategy
- economics
- competition
- negotiation
- decision-making
- resource management
- changing market conditions
- social interaction
- risk and reward

The game should be easy to understand when someone watches it for the first time, while still providing enough strategic depth for players to make meaningful decisions.

The software is not intended to replace the social aspect of the game.

The software exists to make the game:

- visually impressive
- easy to operate
- fast
- fair
- interactive
- reliable
- understandable
- exciting to watch

Players should interact with one another naturally while the software manages the rules, state, information and presentation.

---

# 2. PRODUCT GOAL

The primary goal is to create a game that makes people stop, watch and want to play.

ECONOVA: CITY should feel substantially more polished than a typical university project.

The desired reaction from a spectator is:

> "What is this game?"

followed by:

> "I want to play that."

The desired reaction from a player is:

> "I understand what I can do."

followed by:

> "I have to think about what I should do."

The product should balance:

**Accessibility + Strategy + Social Interaction + Visual Impact + Reliability**

---

# 3. EVENT CONTEXT

ECONOVA: CITY is being developed for a university club event.

The product must therefore be designed for a real physical environment rather than only for normal online use.

The intended event configuration is:

- two games running simultaneously
- two separate projector displays
- multiple players in each game
- players using their own phones or available devices
- organizers operating an admin/game-master interface
- spectators primarily viewing the projector
- players interacting face-to-face

The two games must be completely independent.

A failure or issue in one room must not corrupt the other room.

---

# 4. CORE PRODUCT EXPERIENCE

The experience consists of three connected interfaces.

## 4.1 PUBLIC PROJECTOR

The projector is the public face of the game.

It shows information that every player in the room is allowed to know.

It should communicate:

- current round
- current phase
- whose turn it is
- city map
- districts
- properties
- public ownership
- development levels where public
- demand/market conditions
- current events
- public policies
- relevant public scores
- important game announcements
- major transitions
- final results

The projector should feel dynamic.

It should not look like a spreadsheet or administrative dashboard.

---

# 5. PLAYER INTERFACE

Each player accesses ECONOVA through a browser on their device.

Players should not need to install a dedicated mobile application unless explicitly decided later.

The player interface contains private and personal information.

It may include:

- player's credits
- owned properties
- property levels
- available actions
- cards
- Influence
- secret objectives
- private decisions
- pending trades
- game notifications
- action history where useful

The player interface must clearly distinguish:

**What I own**

from:

**What I can do**

from:

**What is happening in the city**

from:

**What other players know**

The interface should be optimized for mobile use.

---

# 6. ADMIN INTERFACE

Organizers require a separate admin/game-master interface.

The admin interface is not part of normal player gameplay.

It should provide controlled operational functions such as:

- create room
- join/manage room
- assign players
- start game
- pause game
- resume game
- restart/reset game
- manage exceptional situations
- inspect game state
- manage player reconnection
- end game
- access emergency controls
- monitor room health
- display basic connection status

Administrative controls must be protected.

Normal players must never be able to access admin functionality.

---

# 7. TWO-ROOM EXPERIENCE

The system must support two independent games.

Conceptually:

ROOM A

- Projector A
- Players A1–A6
- Game state A

ROOM B

- Projector B
- Players B1–B6
- Game state B

Each room operates independently.

Room A must never expose:

- Room B's players
- Room B's private information
- Room B's game state
- Room B's actions
- Room B's scores

The same applies in reverse.

The architecture must support both rooms operating simultaneously without requiring the games to communicate with one another.

---

# 8. PLAYER COUNT

The intended game size is approximately:

**4–6 players per room**

The system should be designed so that this range works reliably.

The architecture should not unnecessarily assume a much larger player count.

However, the implementation should avoid artificial limitations where increasing the player count later would require rebuilding the entire product.

---

# 9. SESSION STRUCTURE

A normal game should follow a clearly understandable progression.

Conceptually:

```text
LOBBY
  ↓
PLAYER JOIN
  ↓
GAME START
  ↓
ROUND
  ↓
PLAYER / GAME ACTIONS
  ↓
MARKET / EVENT CHANGES
  ↓
NEXT ROUND
  ↓
FINAL ROUND
  ↓
FINAL SCORING
  ↓
RESULTS
```

The exact gameplay rules belong in:

docs/GAME_RULES.md

This document defines the product experience rather than duplicating the complete rules.


---

10. GAME LENGTH

The intended experience should be relatively short.

Target:

approximately 20–30 minutes per game

The game should not require players to commit to an hour-long session.

The game should feel fast enough that:

players remain engaged

spectators understand that something is happening

multiple groups can experience it during the event

organizers can run repeated sessions if necessary


The exact round structure and timing rules belong in GAME_RULES.md.


---

11. GAME PHILOSOPHY

ECONOVA: CITY should reward intelligent decisions rather than simply rewarding luck.

Players should have meaningful choices.

Examples of strategic thinking may include:

which properties to acquire

when to develop

whether to hold or sell

whether to trade

when to take a risk

how to react to changing demand

how to respond to events

how to use limited strategic resources

how to anticipate other players


The game should create situations where there is rarely one obviously correct action.


---

12. SOCIAL DESIGN

The game is intentionally social.

Players should be encouraged to:

negotiate face-to-face

observe other players

make deals

bluff strategically

react to market changes

discuss decisions

compete

cooperate temporarily when useful


The software should not attempt to replace face-to-face interaction with a messaging platform.

Negotiation should primarily happen physically between players.

The software should record and enforce the final agreed game action where necessary.


---

13. DIGITAL DESIGN PHILOSOPHY

The software should automate things that computers are good at.

The software should handle:

calculations

state management

validation

timers where applicable

ownership

transactions

scoring

events

notifications

synchronization

public/private information

game progression


Players should handle:

strategy

negotiation

social interaction

decision-making

competition


This division is fundamental to the product.


---

14. ACCESSIBILITY

A first-time player should be able to understand the basic interface quickly.

The game should not require players to read a long manual before making their first meaningful action.

The UI should make clear:

where the player is

what they own

what is currently happening

what they can do

what is waiting for them

what will happen after an action


Important information should be visually prioritized.


---

15. ONBOARDING

The first interaction should explain the game naturally.

The product should avoid an overwhelming tutorial.

Useful onboarding may include:

short lobby instructions

simple explanation of the objective

contextual action descriptions

visual indicators

brief first-turn guidance

clear explanation of important resources


Tutorial information should disappear or become unobtrusive once players understand the game.


---

16. VISUAL IDENTITY

ECONOVA: CITY should have a distinctive visual identity.

The visual direction should communicate:

modern + premium + strategic + energetic + urban

It should not look like:

a school worksheet

an accounting application

a generic SaaS dashboard

a basic Bootstrap website

a direct Monopoly clone

an overly childish mobile game


The product should feel like an original digital strategy board game.


---

17. CITY AS THE CENTRAL VISUAL ELEMENT

The city should be a major part of the visual identity.

The player should feel like they are competing inside a living city.

The city can visually communicate:

districts

businesses

development

market conditions

ownership

economic changes

events

growth


Development should have visible consequences where practical.

For example:

A property becoming more developed should visually communicate that change rather than only changing a number.


---

18. PROJECTOR VISUAL EXPERIENCE

The projector must be designed specifically for viewing at a distance.

Important information must remain readable from several meters away.

The projector should use:

strong hierarchy

large typography for critical information

clear player indicators

high-contrast information

obvious state transitions

restrained but impressive animation


The projector should never become overloaded with tiny information.

Private player information must never appear on the public display.


---

19. PLAYER VISUAL EXPERIENCE

The player interface should feel like the personal control panel for an empire.

Players should immediately understand:

current resources

current holdings

available actions

personal objectives

important notifications


The player interface should use:

large touch targets

clear action buttons

strong visual feedback

clear states

smooth transitions

responsive layouts


The player should not need to zoom in or repeatedly scroll to perform ordinary actions.


---

20. ANIMATION PHILOSOPHY

Animation is used to communicate important events and create excitement.

Examples:

buying a property

property development

demand changing

breaking news

major event announcement

policy reveal

trade confirmation

round transition

final scoring

winner announcement


Animations should be:

fast

smooth

purposeful

consistent

interruptible when necessary


Animation must never prevent the player from understanding or performing gameplay.


---

21. PERFORMANCE GOAL

The product must feel instant.

For the intended event scale, ordinary actions should feel effectively immediate.

The system should minimize:

unnecessary network traffic

unnecessary rendering

unnecessary database operations

excessive JavaScript execution

excessive animation work

large assets

unnecessary dependencies


The product should remain smooth on reasonably modern student phones and the event display hardware.

Exact performance targets and technical requirements belong in:

docs/PERFORMANCE.md


---

22. RELIABILITY GOAL

Reliability is more important than feature count.

The game must be able to survive normal event-day problems such as:

accidental refresh

temporary disconnection

player reconnect

repeated button presses

projector refresh

browser restart

temporary network interruption


A temporary client failure must not corrupt the authoritative game state.


---

23. SECURITY PRODUCT REQUIREMENT

Players must not be able to cheat by manipulating their browser.

The product must assume that a technically knowledgeable player may attempt to:

modify requests

modify local state

send illegal actions

replay requests

impersonate players

access another room

access private information

manipulate values

call backend endpoints directly


The server must validate all important gameplay actions.

Detailed security requirements belong in:

docs/SECURITY.md


---

24. FAIRNESS

All players must operate under the same rules.

The system must not allow one player to gain an advantage through:

client manipulation

timing exploits

duplicate requests

private information leakage

room leakage

unauthorized actions

inconsistent state


The game should be competitive because of player decisions, not software vulnerabilities.


---

25. STATE CONSISTENCY

There must be one authoritative version of the game state.

The following should always agree with the authoritative state:

player interface

projector

admin interface

scoring

event system

game progression


If the server rejects an action, the UI must not permanently display it as successful.

If the server accepts an action, connected displays should update appropriately.


---

26. REALTIME EXPERIENCE

The game is realtime.

When an important event occurs, relevant connected interfaces should update without requiring players to manually refresh the page.

Examples:

property ownership changes

market changes

event announcements

round changes

turn changes

trade completion

policy outcomes

game completion


Realtime updates should be efficient and predictable.


---

27. NETWORK MODEL

The product should prioritize local/event reliability.

The architecture should be capable of running in the university event environment without depending unnecessarily on a high-quality public internet connection.

The exact deployment model belongs in:

docs/ARCHITECTURE.md

The product should remain operationally simple enough for organizers to start before the event and understand during the event.


---

28. PLAYER IDENTITY

The initial experience should avoid unnecessary account creation.

Players should not need:

email registration

passwords

complicated profiles


unless a later product decision explicitly requires them.

The preferred experience is:

ROOM CODE
+
PLAYER CODE / JOIN PROCESS
↓
PLAYER ENTERS GAME

The exact authentication/session mechanism is a technical decision documented in ARCHITECTURE.md and SECURITY.md.


---

29. NO REAL MONEY

ECONOVA: CITY uses fictional in-game resources.

Any currency displayed in the game represents game resources only.

The product must not involve:

real-money betting

gambling

real-money transactions

player purchases

financial payments


The game's economy is entirely fictional and part of the gameplay.


---

30. NO PLAYER ELIMINATION UNLESS EXPLICITLY DEFINED

The product should favor continuous participation.

Players should generally remain involved throughout the game.

A player falling behind should still have meaningful decisions available.

The exact rules for bankruptcy, loss, recovery or other exceptional conditions belong in GAME_RULES.md.


---

31. SPECTATOR EXPERIENCE

A major purpose of the projector is attracting spectators.

A spectator should be able to understand the broad situation without having access to a player's private screen.

The public display should make visible:

who is leading

what is changing

which districts matter

major events

major strategic shifts

progression toward the end

final winner


The game should have moments that naturally attract attention.

Examples:

major market change

large acquisition

major event

policy reveal

late-game comeback

final scoring

winner reveal



---

32. EMOTIONAL EXPERIENCE

The game should create:

Tension

Players should sometimes be uncertain about whether a decision will pay off.

Competition

Players should know that other players can overtake them.

Surprise

Market events and strategic decisions should create unexpected situations.

Satisfaction

Good decisions should visibly produce results.

Social energy

Players should talk, negotiate and react to one another.

Momentum

The game should not feel like waiting for a spreadsheet to calculate something.


---

33. GAME PACING

The experience should continuously move forward.

Avoid long periods where:

nobody knows what to do

players wait for the interface

animations block interaction

the server is processing unnecessarily

the projector has no meaningful information

one player can monopolize the entire game


The exact timing and turn structure belong in GAME_RULES.md.


---

34. USER FLOW

Player

OPEN GAME
    ↓
ENTER ROOM
    ↓
ENTER PLAYER IDENTITY
    ↓
LOBBY
    ↓
GAME START
    ↓
VIEW CURRENT STATE
    ↓
MAKE DECISION
    ↓
CONFIRM ACTION
    ↓
SERVER VALIDATES
    ↓
GAME STATE UPDATES
    ↓
CONTINUE
    ↓
FINAL RESULTS

Spectator

SEE PROJECTOR
    ↓
UNDERSTAND CITY
    ↓
SEE PLAYERS
    ↓
SEE MARKET / EVENTS
    ↓
WATCH STRATEGIC CHANGES
    ↓
SEE FINAL RESULT

Admin

CREATE ROOM
    ↓
CONNECT PROJECTOR
    ↓
PLAYERS JOIN
    ↓
VERIFY LOBBY
    ↓
START
    ↓
MONITOR
    ↓
HANDLE EXCEPTION IF REQUIRED
    ↓
END GAME
    ↓
RESET / NEXT SESSION


---

35. PRODUCT STATES

The software should clearly support major product states.

At minimum:

OFFLINE / STARTUP
LOBBY
READY
GAME ACTIVE
ACTION IN PROGRESS
WAITING
PAUSED
RECONNECTING
ERROR / RECOVERY
FINAL SCORING
GAME COMPLETE
RESET

The exact implementation belongs in the technical architecture.


---

36. ERROR EXPERIENCE

Errors should not make the product feel broken.

If something goes wrong, users should receive a clear message.

Examples:

Instead of:

WebSocketError: STATE_TRANSITION_EXCEPTION

use:

Something went wrong. Please try again.

The admin interface may expose more detailed diagnostic information.

The product should distinguish between:

player mistake

invalid game action

temporary connection issue

server issue

administrator issue



---

37. RECOVERY EXPERIENCE

If a player disconnects:

game state remains safe

other players can continue where appropriate

player can reconnect

player receives the correct state

private information remains private


If the projector disconnects:

the game should continue

the projector can reconnect and receive current state


If one room experiences an issue:

the other room must remain unaffected



---

38. ADMIN EVENT-DAY PRIORITIES

The admin experience should prioritize operational clarity.

The organizer should quickly know:

which rooms are active

how many players are connected

whether a room is running

whose turn it is

whether a player is disconnected

whether a serious error exists


Admin controls should be intentionally limited.

Do not create dangerous buttons without clear confirmation.


---

39. PRODUCT BOUNDARIES

ECONOVA: CITY is NOT intended to be:

a general-purpose economics simulator

a stock trading platform

a financial education platform

a social networking application

a persistent MMO

a real-money game

a casino

a generic board-game engine

a giant multiplayer platform


It is a focused competitive strategy game designed for a live event.


---

40. PRODUCT PRINCIPLES

Principle 1: Easy to enter

A new player should understand the basic objective quickly.

Principle 2: Difficult to master

Meaningful strategic decisions should remain.

Principle 3: Social by design

Players should interact with each other.

Principle 4: Software handles complexity

Players should not manually calculate everything.

Principle 5: The city should feel alive

The public display should communicate change and momentum.

Principle 6: Every action should matter

Avoid meaningless buttons and mechanics.

Principle 7: Reliability beats feature count

A smaller polished game is better than a larger unstable game.

Principle 8: Visual quality matters

The game should look impressive enough to attract spectators.

Principle 9: Fairness is mandatory

The software must protect the integrity of the competition.

Principle 10: Simplicity underneath, sophistication on top

The technical system should be robust without being unnecessarily complicated.


---

41. SUCCESS CRITERIA

ECONOVA: CITY is successful if:

Gameplay

players understand the basic objective quickly

players have meaningful strategic decisions

players remain engaged

games finish within the intended timeframe

players want to play again


Social

players naturally negotiate and interact

spectators can understand major developments

the game creates competitive moments


Visual

the projector attracts attention

the interface looks cohesive

animations feel intentional

the product does not look like a basic student dashboard


Technical

gameplay feels responsive

two rooms operate independently

reconnect works

invalid actions are rejected

game state remains consistent

private information remains private

no major security loopholes remain


Operational

organizers can start a game without technical expertise

organizers can recover from common problems

the game can run repeatedly

event-day operation is predictable



---

42. NON-GOALS

The following should not be prioritized unless explicitly approved:

adding more mechanics simply to increase feature count

unnecessary 3D graphics

unnecessary AI opponents

unnecessary accounts

unnecessary cloud infrastructure

unnecessary social features

excessive animations

complex analytics

monetization

unnecessary external integrations


Every new feature must answer:

> Does this make the actual ECONOVA experience meaningfully better?



If not, do not build it.


---

43. FEATURE PRIORITY

When deciding what to build, use this hierarchy.

P0 — ESSENTIAL

The game cannot operate without it.

Examples:

authoritative game engine

rooms

player joining

gameplay actions

state synchronization

projector

player interface

scoring

security

reconnection

admin controls


P1 — IMPORTANT

Strongly improves the experience.

Examples:

polished animations

advanced transitions

strong onboarding

excellent mobile UX

spectator presentation

richer event presentation


P2 — POLISH

Only build after P0 and P1 are stable.

Examples:

additional visual effects

advanced transitions

extra presentation details

optional quality-of-life improvements


P3 — NICE TO HAVE

Do not allow these to threaten the deadline.


---

44. DEVELOPMENT PRIORITY

The development process should generally follow:

PRODUCT FOUNDATION
        ↓
GAME ENGINE
        ↓
SERVER
        ↓
REALTIME COMMUNICATION
        ↓
PLAYER EXPERIENCE
        ↓
PROJECTOR EXPERIENCE
        ↓
ADMIN EXPERIENCE
        ↓
SECURITY HARDENING
        ↓
MULTIPLAYER TESTING
        ↓
VISUAL POLISH
        ↓
EVENT-DAY STABILIZATION

Do not spend large amounts of time polishing screens that depend on unstable underlying systems.


---

45. PRODUCT QUALITY BAR

The final product should satisfy this standard:

A spectator should think:

> "This looks like a real game."



A player should think:

> "This is easy to use."



A strategist should think:

> "I need to think about my next move."



An organizer should think:

> "I know exactly what is happening."



A developer should think:

> "I can understand how this system works."



And most importantly:

> The game should simply work.




---

46. FINAL PRODUCT DEFINITION

ECONOVA: CITY is a polished, realtime, multiplayer strategy game where players compete to build and manage business empires within a changing fictional city.

It combines digital presentation with real-world player interaction.

The software manages the complexity.

The players provide the strategy.

The projector creates the spectacle.

The player interface provides control.

The server protects fairness.

The city provides the world.

The objective is not to build the largest possible software system.

The objective is to create the best possible 20–30 minute competitive game experience for the event.

All detailed gameplay rules belong in:

docs/GAME_RULES.md

All technical implementation decisions belong in:

docs/ARCHITECTURE.md

All security requirements belong in:

docs/SECURITY.md

All visual implementation guidance belongs in:

docs/VISUAL_SYSTEM.md

All performance requirements belong in:

docs/PERFORMANCE.md

All testing requirements belong in:

docs/TESTING.md

This document defines the product those systems must collectively deliver.

END OF PRODUCT SPECIFICATION
