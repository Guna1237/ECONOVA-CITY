# README.md

# ECONOVA: CITY

> A fast, strategic multiplayer city-building game where players compete to build the strongest economic empire.

---

## 1. WHAT IS ECONOVA: CITY?

ECONOVA: CITY is a multiplayer strategy game designed for a live university event.

Players compete inside a shared fictional city.

They make economic and strategic decisions, acquire and develop properties, respond to changing city conditions, interact with other players, and attempt to finish with the strongest overall position.

The game is designed to be:

- Easy to understand
- Difficult to master
- Social and competitive
- Visually impressive
- Fast enough for a live event
- Reliable enough to run multiple games simultaneously

ECONOVA is a game first.

The economic concepts should make the game more interesting, but players should not need a finance or economics background to enjoy it.

---

# 2. CORE EXPERIENCE

The intended experience is:

```text
SEE THE CITY
      ↓
UNDERSTAND WHAT IS CHANGING
      ↓
MAKE A DECISION
      ↓
INTERACT WITH OTHER PLAYERS
      ↓
SEE THE CONSEQUENCE
      ↓
ADAPT
      ↓
BUILD YOUR EMPIRE
```

Players should feel that the city is changing around them and that their decisions matter.

The game should create moments of:

Competition

Negotiation

Risk

Surprise

Strategy

Growth

Comeback

Celebration



---

3. EVENT FORMAT

ECONOVA is designed to support two independent games running simultaneously.

Example:

ECONOVA: CITY
                          │
              ┌───────────┴───────────┐
              │                       │
           ROOM A                  ROOM B
              │                       │
         PROJECTOR A             PROJECTOR B
              │                       │
        4–6 PLAYERS             4–6 PLAYERS

Each room represents a completely independent game.

A problem in one room must not corrupt the other room.


---

4. PLAYER EXPERIENCE

Players primarily use their own smartphones to interact with the game.

The player interface provides access to information that should remain private.

Players should be able to:

Join a room

See their identity

View their resources

View their properties

View their private information

Perform legal actions

Participate in trades

Make decisions

Receive feedback

Reconnect if disconnected


Players should not need to install a native application.

The preferred experience is browser-based.


---

5. PROJECTOR EXPERIENCE

Each room has a public projector screen.

The projector displays the shared state of the game.

It may show:

City map

Districts

Properties

Ownership

Development

Demand

Current round

Current player

Public events

Policies

Public standings

Major game transitions


It must NEVER reveal information that is intended to remain private to an individual player.

The projector should feel like the main stage of the game.


---

6. ADMIN EXPERIENCE

An authorized game operator should have a separate admin interface.

The admin interface may provide:

Room management

Game start

Game pause

Game resume

Player status

Connection status

Game state visibility

Turn management

Emergency controls

Game reset

Game completion


Admin controls must be protected from normal players.

The admin interface prioritizes reliability and clarity over visual spectacle.


---

7. TWO-ROOM REQUIREMENT

Two rooms must be independently managed.

Conceptually:

ROOM A
├── Game State A
├── Players A
├── Projector A
└── Admin State A

ROOM B
├── Game State B
├── Players B
├── Projector B
└── Admin State B

No state should unintentionally cross between rooms.

Room A must not be able to:

Read Room B state

Modify Room B state

Receive Room B private information

Affect Room B players

Affect Room B scoring


The same applies to Room B.


---

8. SERVER AUTHORITY

The server is authoritative.

Clients send requests for actions.

The server validates and applies those actions.

The client must never be trusted to determine important game state.

Important server-owned state includes, where applicable:

Credits

Property ownership

Development

Influence

Cards

Objectives

Scores

Turns

Rounds

Game phase

Events

Policies

Random outcomes

Permissions


The frontend displays state.

The server determines state.


---

9. GENERAL TECHNICAL DIRECTION

The application should prioritize:

Low latency

Smooth rendering

Strong security

Reliable multiplayer

Simple architecture

Easy maintenance

Easy event-day deployment


The expected player count is small enough that the architecture should remain simple.

Do not introduce unnecessary infrastructure.

The preferred direction is a lightweight authoritative server with realtime communication.


---

10. PREFERRED TECHNOLOGY

The current preferred technology direction is:

Frontend

React

TypeScript

Vite

Tailwind CSS

Framer Motion where appropriate


Realtime

WebSockets


Backend

Node.js

TypeScript

Fastify


Validation

Zod


Database

PostgreSQL where persistence is required


Testing

Vitest

Playwright

Integration tests

Multiplayer tests

Security tests


Technology may be changed if a clearly superior approach is identified and documented.

Do not change architecture simply for personal preference.


---

11. VISUAL DIRECTION

ECONOVA should look like a professional strategy game.

It should NOT look like:

A university project

A generic SaaS dashboard

Excel

A banking application

A plain admin panel

A Monopoly clone

A casino

An unnecessarily complicated futuristic interface


The visual direction should be:

Premium

Modern

Strategic

Urban

Competitive

Cinematic when appropriate

Highly readable


See:

docs/VISUAL_SYSTEM.md

for the complete visual source of truth.


---

12. CITY

The city is the central visual object of ECONOVA.

It represents the shared world in which the players compete.

The city should communicate:

Districts

Properties

Ownership

Development

Economic activity

Change over time


The city can use a stylized:

2D

2.5D

Isometric


visual style.

Full 3D is not required.

Performance and readability are more important than technical complexity.


---

13. GAME DESIGN PHILOSOPHY

The game should be:

EASY TO START

A new player should understand the basic objective quickly.

HARD TO MASTER

Good players should make better decisions than inexperienced players.

SOCIALLY INTERACTIVE

Players should talk, negotiate and react to one another.

DYNAMIC

The city should change during the game.

FAIR

Players should lose because of decisions and circumstances within the game's designed rules, not software bugs or exploits.

FAST

The game should maintain momentum.


---

14. GAME RULES

The detailed gameplay rules belong in:

docs/GAME_RULES.md

This README intentionally does not duplicate every gameplay rule.

Agents must consult GAME_RULES.md before implementing or changing gameplay.

If the implementation and GAME_RULES.md conflict, do not silently choose one.


---

15. PLAYER COUNT

The intended room size is:

4–6 players

The system should be designed so that player count is configurable within the supported range.

The architecture should not assume that exactly four or exactly six players always exist.


---

16. GAME ROOM

Each room has:

Unique room identity

Game state

Player list

Public state

Private player state

Projector connection

Player connections

Admin connection

Turn state

Round state


A room should be self-contained.


---

17. PLAYER IDENTITY

Players should not need full account creation for the event unless later required.

The preferred event experience is lightweight joining.

A player should be able to join using the room's joining mechanism and receive a stable player identity for the duration of the game.

The exact authentication/session mechanism is defined in:

docs/ARCHITECTURE.md

and

docs/SECURITY.md.


---

18. REALTIME MODEL

The game should use realtime communication.

The expected flow is:

PLAYER ACTION
      ↓
WEBSOCKET
      ↓
SERVER
      ↓
VALIDATION
      ↓
GAME ENGINE
      ↓
STATE CHANGE
      ↓
EVENT
      ↓
CONNECTED CLIENTS

Clients should not independently invent authoritative state.


---

19. GAME ENGINE

The game engine should be separate from presentation.

It should be possible to test core game logic without running the browser.

Conceptually:

ACTION
  ↓
VALIDATOR
  ↓
GAME ENGINE
  ↓
STATE TRANSITION
  ↓
EVENTS
  ↓
NEW STATE

This makes the game easier to test, secure and maintain.


---

20. PERFORMANCE GOAL

The game should feel instantaneous under normal event conditions.

Priorities:

1. Fast input response


2. Low realtime latency


3. Smooth projector animation


4. Smooth mobile interaction


5. Fast state synchronization


6. Stable memory usage


7. Reliable operation



Do not use expensive visual effects without testing their impact.

See:

docs/PERFORMANCE.md

for detailed performance requirements.


---

21. SECURITY GOAL

Players should not be able to gain an advantage by manipulating the browser.

The server must validate all important actions.

Security must cover:

Player authorization

Room isolation

Private information

Action validation

Replay prevention

Duplicate requests

WebSocket messages

Admin access

Client manipulation

Reconnection

State integrity


See:

docs/SECURITY.md

for detailed requirements.


---

22. NO CLIENT TRUST

The following principle is fundamental:

CLIENT = REQUEST

SERVER = AUTHORITY

A player may request:

BUY_PROPERTY

The server determines whether the purchase is legal.

A player cannot simply tell the server:

I now own this property.

The same principle applies to every important game action.


---

23. PRIVATE STATE

The server may contain more information than any individual client should receive.

The server should generate appropriate state projections.

Conceptually:

FULL GAME STATE
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   PUBLIC STATE      PLAYER STATE      ADMIN STATE
                         │
                  PRIVATE INFORMATION

Do not send private information to clients that do not need it.


---

24. RELIABILITY

ECONOVA is intended for a live event.

Reliability is more important than adding one more feature.

The system should handle:

Refresh

Disconnect

Reconnect

Duplicate clicks

Network interruptions

Invalid actions

Unexpected requests

Projector reconnection

Player browser crashes

Administrative mistakes


The authoritative state must remain correct.


---

25. EVENT-DAY DESIGN

The software should be able to operate with minimal technical intervention.

A preferred event-day flow is:

START SERVER
     ↓
CREATE ROOM A
CREATE ROOM B
     ↓
CONNECT PROJECTORS
     ↓
PLAYERS JOIN
     ↓
VERIFY PLAYERS
     ↓
START BOTH GAMES
     ↓
PLAY
     ↓
END
     ↓
DISPLAY RESULTS

The operator should not need to understand the internal codebase to run a normal game.


---

26. FAILURE PRIORITY

If something goes wrong during the event, prioritize:

1. Preserve game state


2. Keep the game playable


3. Restore affected connection


4. Restore projector


5. Restore player connection


6. Continue game


7. Investigate root cause



Do not reset an entire game unless necessary.


---

27. AI DEVELOPMENT

This repository may be developed using multiple AI coding agents.

Possible agents include:

Codex

Claude Code

Antigravity


They share the same repository.

The repository is the shared source of project knowledge.

Agents must read:

AGENTS.md

before making changes.


---

28. AI RESPONSIBILITIES

The general division of work is:

CODEX

Primary engineering agent.

Focus:

Architecture

Backend

Game engine

Server

State management

Validation

Integration

Testing

Stabilization


CLAUDE CODE

Senior reviewer and adversarial analyst.

Focus:

Security

Game integrity

Edge cases

Architecture review

Difficult debugging

Exploit discovery

Code review


ANTIGRAVITY

Frontend, visual and browser QA agent.

Focus:

UI

Projector

Player interface

Visual polish

Animation

Browser testing

UX

Visual QA


These responsibilities may change if the project owner explicitly assigns otherwise.


---

29. AI COLLABORATION

Agents must not independently create competing implementations of the same system.

The shared repository is the communication layer.

Agents communicate through:

Code

Documentation

Tests

Git

agent/TASKS.md

agent/STATUS.md

agent/REVIEW.md

agent/HANDOFF.md


Do not assume another agent knows what you changed.

Document important changes.


---

30. PRODUCT OWNER

The product owner has final authority over:

Game direction

Product scope

Gameplay decisions

Visual direction

Feature priorities

Major architecture decisions

Release decisions


Agents implement and advise.

Agents do not independently redefine the product.


---

31. SCOPE CONTROL

Do not add features simply because they seem interesting.

Potential additions must be evaluated against:

Event time

Complexity

Reliability

Player understanding

Visual quality

Development effort


A smaller polished feature is preferable to a large unfinished system.


---

32. NO FEATURE CREEP

Avoid unnecessary additions such as:

unrelated game modes

unnecessary accounts

unnecessary social systems

unnecessary messaging

unnecessary currencies

unnecessary statistics

unnecessary achievements

unnecessary AI players

unnecessary 3D systems


Every feature must serve the core game.


---

33. TESTING

Testing is part of development, not an optional final step.

Important systems should have appropriate:

Unit tests

Integration tests

Multiplayer tests

Security tests

End-to-end tests


A bug that can reasonably receive a regression test should receive one.


---

34. RELEASE REQUIREMENTS

Before event release, verify:

Production build

Server startup

Client startup

Projector startup

Player joining

Room creation

Two simultaneous rooms

Room isolation

Game state integrity

Action validation

Reconnection

Duplicate-action protection

Security audit

Browser tests

Performance

End-game flow

Recovery procedures


Do not call the game release-ready without evidence.


---

35. DOCUMENTATION

The repository documentation is divided by responsibility.

docs/
├── PRODUCT.md
├── GAME_RULES.md
├── ARCHITECTURE.md
├── VISUAL_SYSTEM.md
├── SECURITY.md
├── PERFORMANCE.md
├── TESTING.md
├── GAME_CONTENT.md
└── DECISIONS.md

Agents should update the relevant document when a significant decision changes.


---

36. IMPORTANT FILES

AGENTS.md

Rules for AI agents.

PRODUCT.md

Product vision and experience.

GAME_RULES.md

Gameplay source of truth.

GAME_CONTENT.md

Canonical structure for approved game-content values. It is currently structure-only; unspecified values require product-owner approval.

ARCHITECTURE.md

Technical architecture.

VISUAL_SYSTEM.md

Visual source of truth.

SECURITY.md

Security and game-integrity requirements.

PERFORMANCE.md

Performance requirements.

TESTING.md

Testing strategy and release requirements.

DECISIONS.md

Permanent important decisions.


---

37. LIVE AGENT FILES

The agent/ directory contains temporary/current development coordination.

agent/
├── TASKS.md
├── STATUS.md
├── REVIEW.md
└── HANDOFF.md

These files should reflect the current state of development.

They are not substitutes for permanent documentation.


---

38. TASKS

agent/TASKS.md contains current work.

Tasks should identify:

ID

Description

Owner

Priority

Status

Dependencies


Agents should not randomly select major work if task ownership has already been assigned.


---

39. STATUS

agent/STATUS.md records:

Current task

Work completed

Files changed

Tests performed

Known problems

Blockers

Next step


Keep it factual and concise.


---

40. REVIEW

agent/REVIEW.md records:

Security issues

Bugs

Architectural concerns

Performance problems

Visual problems

Gameplay inconsistencies

QA failures


Each issue should include enough information for another agent to reproduce and fix it.


---

41. HANDOFF

agent/HANDOFF.md records information one agent needs to communicate to another.

Include:

Completed work

Remaining work

Important files

Known issues

Tests

Recommended next action



---

42. DESIGN PRIORITIES

When deciding between alternatives, generally prefer:

Reliable + Simple + Beautiful

over:

Complex + Technically impressive + Fragile

The best implementation is the one that gives players the strongest experience while remaining dependable.


---

43. PRODUCT SUCCESS

ECONOVA is successful if:

A new player can understand the basic interaction quickly.

Players have meaningful strategic decisions.

Players interact with each other.

The city visibly changes.

The projector creates attention.

The player interface feels intuitive.

The game remains smooth.

The game remains fair.

The system survives normal event-day problems.

The final presentation feels professional.


---

44. FINAL STANDARD

Do not optimize for:

"How much code did we write?"

Optimize for:

"How good is the actual game?"

The final ECONOVA experience should feel:

polished

fast

strategic

competitive

visually memorable

intuitive

reliable


It should be something students want to stop and watch, and something players immediately want to try.


---

45. NON-NEGOTIABLES

1. The server is authoritative.


2. Clients cannot directly determine important game state.


3. Private information must remain private.


4. Rooms must remain isolated.


5. Invalid actions must be rejected server-side.


6. Duplicate actions must not corrupt state.


7. Gameplay rules must not be silently changed.


8. Visual polish must not create unacceptable lag.


9. Every significant bug should receive a regression test.


10. Agents must preserve other agents' working changes.


11. Important decisions must be documented.


12. No agent should claim tests passed without actually running them.


13. No agent should claim production readiness without verification.


14. Do not introduce unnecessary complexity.


15. Do not add features outside the approved product scope.


16. Reliability takes priority over unnecessary spectacle.


17. ECONOVA must remain its own visual and gameplay identity.


18. The final product must be ready for two simultaneous live games.




---

46. CURRENT STATUS

This repository is the development home for ECONOVA: CITY.

The project is being developed iteratively.

Agents should inspect the current repository state and documentation before taking action.

Do not assume that a section of this README means a feature has already been implemented.

This document describes the intended product direction unless implementation status explicitly confirms otherwise.


---

47. IMPORTANT DISTINCTION

The following are different:

PRODUCT REQUIREMENT
GAME RULE
TECHNICAL ARCHITECTURE
IMPLEMENTATION
CURRENT STATUS

Do not confuse them.

A requirement does not mean the feature is implemented.

A design does not mean it has been tested.

A code implementation does not mean it is production-ready.

A passing unit test does not mean the complete player experience works.

Always verify the actual state of the project.


---

48. END GOAL

Build ECONOVA: CITY into a polished, secure, high-performance multiplayer strategy game that can confidently run two simultaneous games at a live university event.

The final standard is simple:

It should look impressive.

It should feel fast.

It should be easy to play.

It should reward strategy.

It should be difficult to exploit.

And most importantly:

It should not break when real people start playing it.

END OF README.md
