# ECONOVA: CITY
# ARCHITECTURAL AND PRODUCT DECISION LOG

This document records important decisions made during the development of ECONOVA: CITY.

Its purpose is to prevent AI agents from repeatedly reconsidering the same decisions, introducing conflicting architectures, or changing important product behavior without understanding why the current approach was selected.

This document is a decision record, not a task list.

Agents MUST read this file before making significant architectural, technical, gameplay, security, performance, or product changes.

---

# HOW TO USE THIS DOCUMENT

Every significant decision should be recorded here.

A decision should be added when it affects:

- overall architecture
- backend technology
- frontend technology
- realtime communication
- game-state management
- database strategy
- security
- room isolation
- deployment
- performance
- visual architecture
- major gameplay structure
- testing strategy
- event-day reliability
- AI-agent workflow

Do NOT create a decision entry for trivial changes such as:

- changing a button label
- fixing a typo
- changing a margin
- renaming a local variable
- fixing an obvious CSS issue

---

# DECISION STATUS

Use one of:

- PROPOSED
- APPROVED
- SUPERSEDED
- REJECTED
- TEMPORARY

Only APPROVED decisions should be treated as current project direction.

A SUPERSEDED decision remains in this document for historical context but must not be followed if a newer decision replaces it.

---

# DECISION FORMAT

Each decision should use this structure:

## DECISION-XXX

### Status
APPROVED

### Date
YYYY-MM-DD

### Decision
Short description of what was decided.

### Context
Why the decision was necessary.

### Options Considered
The realistic alternatives that were considered.

### Chosen Approach
What ECONOVA will use.

### Reason
Why this approach was selected.

### Consequences
What this decision improves and what trade-offs it creates.

### Constraints
Important rules that future agents must preserve.

### Related Documents
Relevant project documents.

### Approved By
Product owner / authorized decision maker.

---

# CURRENT APPROVED DECISIONS

---

# DECISION-001
## Project Architecture Philosophy

### Status
APPROVED

### Date
2026-09-04

### Decision
ECONOVA: CITY will use a relatively simple, centralized architecture designed specifically for a small live multiplayer event rather than an unnecessarily complex distributed architecture.

### Context
The game is expected to support a small number of simultaneous players and two independent game rooms.

The system needs to be extremely reliable during a live event.

The project does not require internet-scale infrastructure.

### Chosen Approach
Prefer:

- one primary game server
- authoritative game engine
- realtime WebSocket communication
- persistent database where required
- separate client, projector, and admin interfaces
- isolated game rooms within the server

### Reason
A simpler architecture is:

- easier to understand
- easier for multiple AI agents to maintain
- easier to debug
- easier to deploy
- easier to recover during an event
- less likely to introduce distributed-system failures

### Consequences
The project will not optimize for thousands of simultaneous players.

It will optimize for:

- correctness
- low latency
- reliability
- maintainability
- event-day stability

### Constraints
Do not introduce microservices, message queues, Kubernetes, or other distributed infrastructure unless a specific requirement demonstrates that it is necessary.

---

# DECISION-002
## Server-Authoritative Game State

### Status
APPROVED

### Date
2026-09-04

### Decision
The server is the single authoritative source of truth for all game state.

### Context
ECONOVA is a multiplayer strategy game where players interact simultaneously with a shared game world.

Client-side manipulation must not be capable of changing the actual game.

### Chosen Approach
The server owns:

- credits
- properties
- property ownership
- development levels
- Influence
- cards
- secret objectives
- current round
- current turn
- game phase
- events
- policies
- scoring
- random outcomes
- game-ending state
- player permissions

Clients submit requests for actions.

The server validates and applies those actions.

### Reason
This prevents client-side cheating and keeps every screen synchronized to one authoritative state.

### Consequences
Frontend code must not be treated as a source of truth.

Some state must be duplicated in the UI for presentation, but authoritative calculations must remain server-side.

### Constraints
Never accept a client-provided final result for an important game operation.

Example:

BAD:

`client says player now has 5000 credits`

GOOD:

`client requests an action and server calculates the resulting balance`

### Related Documents
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/GAME_RULES.md`

---

# DECISION-003
## Realtime Communication

### Status
APPROVED

### Date
2026-09-04

### Decision
WebSockets will be used for realtime multiplayer communication.

### Context
Projector displays and player devices need to react quickly to game-state changes.

Polling would be unnecessary and less elegant for this use case.

### Chosen Approach
Use persistent WebSocket connections between clients and the authoritative server.

Clients send validated action requests.

The server broadcasts appropriate state updates/events.

### Reason
WebSockets provide:

- low latency
- realtime updates
- efficient communication
- natural support for multiplayer state changes

### Consequences
The server must handle:

- connection loss
- reconnection
- duplicate messages
- stale requests
- malformed messages
- room membership
- authorization

### Constraints
WebSocket messages are untrusted input.

Never assume that a message is valid simply because it came through an established WebSocket connection.

---

# DECISION-004
## Two Independent Game Rooms

### Status
APPROVED

### Date
2026-09-04

### Decision
ECONOVA will support two completely independent game rooms operating simultaneously.

### Context
The event setup may use two projectors, with each projector showing a different game.

### Chosen Approach
Each room has its own:

- game state
- players
- turn
- round
- properties
- events
- policies
- scoring
- connections
- game lifecycle

### Reason
The two games must operate independently.

A problem in one room should not corrupt the other.

### Consequences
Every room-scoped operation must include and validate room context.

### Constraints
Room A must never:

- receive Room B's private state
- modify Room B's game
- see Room B's players
- receive Room B's game events

The same applies in reverse.

Cross-room access is a release-blocking security issue.

---

# DECISION-005
## LAN-First Event Deployment

### Status
APPROVED

### Date
2026-09-04

### Decision
The live event should be capable of operating primarily over a local network.

### Context
The event should not depend unnecessarily on campus internet quality.

Internet connectivity may be unreliable during a busy event.

### Chosen Approach
Where practical:

- host the game server locally
- connect projectors locally
- connect player devices over local Wi-Fi
- keep external internet requirements minimal

### Reason
Local networking can provide:

- lower latency
- predictable performance
- reduced dependency on external services
- better event-day resilience

### Consequences
The deployment process must be tested on the actual local network before the event.

### Constraints
Do not introduce an external service that is required for core gameplay unless there is a clear reason.

---

# DECISION-006
## Frontend Technology

### Status
APPROVED

### Date
2026-09-04

### Decision
The primary application interface should use a modern TypeScript-based frontend architecture.

### Chosen Approach
Preferred technologies:

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion where appropriate

Additional rendering technologies may be introduced only when they provide a meaningful visual or performance benefit.

### Reason
The project needs:

- high-quality UI
- responsive player interfaces
- projector interfaces
- reusable components
- maintainable frontend code
- smooth animations

### Constraints
Do not introduce heavy rendering technology simply for visual novelty.

The final technology selection must remain consistent with `docs/ARCHITECTURE.md`.

---

# DECISION-007
## Plexi Is Optional

### Status
APPROVED

### Date
2026-09-04

### Decision
Plexi is not a mandatory foundation for ECONOVA.

### Context
The primary requirement is the best possible combination of:

- professional visuals
- smooth performance
- reliable multiplayer architecture
- development efficiency

The technology should serve those goals.

### Chosen Approach
Use Plexi only if it provides a clear advantage for a specific part of the product.

Do not force the entire architecture around Plexi.

### Reason
The product should not be constrained by a specific tool if another approach produces a better result.

### Constraints
Plexi adoption must be evaluated based on actual project requirements, not novelty.

---

# DECISION-008
## Visual Direction

### Status
APPROVED

### Date
2026-09-04

### Decision
ECONOVA should visually resemble a polished modern strategy game rather than a generic business dashboard.

### Context
The game is intended to attract students and create a strong visual impression during Club Spotlight.

### Chosen Approach
The visual system should emphasize:

- strong composition
- clear hierarchy
- modern typography
- premium cards
- animated city elements
- polished transitions
- meaningful visual feedback
- clear game-state communication
- visually distinct districts
- attractive projector presentation

### Reason
Visual quality is an important part of the product experience.

### Consequences
Frontend development should treat visual design as a core product requirement, not as final decoration.

### Constraints
Visual effects must not compromise:

- readability
- responsiveness
- FPS
- gameplay speed
- event reliability

---

# DECISION-009
## Projector and Player Interfaces Are Separate Experiences

### Status
APPROVED

### Date
2026-09-04

### Decision
The public projector interface and private player interface will be designed separately.

### Context
The projector is a shared public screen.

Players need private information on their own devices.

### Chosen Approach

Projector:

- public game state
- city map
- ownership
- demand
- round
- current event
- public leaderboard
- public game information

Player device:

- personal credits
- private properties
- private cards
- secret objectives
- available actions
- private decisions
- trade controls

### Reason
The two interfaces have fundamentally different purposes.

### Constraints
Private information must never be sent to the projector or another player's client.

---

# DECISION-010
## No Real-Money Economy

### Status
APPROVED

### Date
2026-09-04

### Decision
ECONOVA uses fictional in-game currency only.

### Context
The game is an educational/entertainment strategy experience for a university event.

### Chosen Approach
All monetary values are fictional game resources.

### Constraints
Do not implement:

- real-money transactions
- betting
- real-money wagering
- gambling mechanics
- cash-out functionality

The game's fictional economy must remain clearly separate from real-world money.

---

# DECISION-011
## No Player Elimination

### Status
APPROVED

### Date
2026-09-04

### Decision
Players should not be permanently eliminated from the game because of ordinary gameplay outcomes.

### Context
This is a live event experience.

Eliminating a player early can leave them disengaged while others continue.

### Chosen Approach
Players remain active until the game ends.

If a player experiences financial difficulty, the rules should provide an appropriate recovery mechanism rather than simply removing the player.

### Reason
Everyone should remain involved throughout the event.

---

# DECISION-012
## Game Engine Must Be UI-Independent

### Status
APPROVED

### Date
2026-09-04

### Decision
Core gameplay logic must be separated from React components, projector components, and transport code.

### Chosen Approach
The game engine should expose clear operations such as:

- validate action
- apply action
- calculate result
- transition state
- generate events

### Reason
This makes the game:

- testable
- deterministic where appropriate
- maintainable
- easier for multiple AI agents to modify safely

### Constraints
Do not put important gameplay rules directly inside UI click handlers.

---

# DECISION-013
## Idempotent Gameplay Actions

### Status
APPROVED

### Date
2026-09-04

### Decision
Important player actions must be protected against duplicate execution.

### Context
Players may:

- double-click
- reconnect
- retry requests
- experience network delays
- submit the same request more than once

### Chosen Approach
The server should use suitable action identifiers, state validation, and/or idempotency mechanisms.

### Examples

A property purchase cannot execute twice.

A card cannot be consumed twice.

A trade cannot finalize twice.

A vote cannot count twice.

### Reason
Duplicate execution could corrupt the game economy.

---

# DECISION-014
## Private State Projection

### Status
APPROVED

### Date
2026-09-04

### Decision
The server will derive different state views for different clients.

### Chosen Approach

Full internal state:

`SERVER`

is transformed into appropriate views:

`PUBLIC STATE`

`PLAYER PRIVATE STATE`

`ADMIN STATE`

### Reason
This is safer than sending the entire state to every client and hiding information visually.

### Constraints
Never transmit secret information to an unauthorized client.

---

# DECISION-015
## Testing Is Part of Implementation

### Status
APPROVED

### Date
2026-09-04

### Decision
A feature is not considered complete merely because its code has been written.

### Chosen Approach
Meaningful features require appropriate tests.

Testing should cover:

- normal behavior
- invalid behavior
- boundary conditions
- repeated actions
- multiplayer interactions
- security-sensitive behavior
- reconnect behavior where relevant

### Reason
The game will be used in a live event where failures are costly.

### Constraints
Known gameplay/security bugs should receive regression tests whenever practical.

---

# DECISION-016
## Browser-Based End-to-End Verification

### Status
APPROVED

### Date
2026-09-04

### Decision
The actual browser experience must be tested rather than relying only on source-code inspection.

### Chosen Approach
Use browser automation where practical.

Test:

- player joining
- gameplay
- projector updates
- reconnect
- errors
- mobile layouts
- simultaneous rooms

### Reason
A technically correct backend does not guarantee a working user experience.

---

# DECISION-017
## Event-Day Reliability Over Feature Count

### Status
APPROVED

### Date
2026-09-04

### Decision
Reliability is more important than adding additional mechanics or features.

### Context
The project has a fixed event date.

Every additional system creates another possible failure point.

### Chosen Approach
Prefer:

`small + polished + reliable`

over:

`large + complicated + unstable`

### Constraints
New features should only be added if there is enough development and testing time.

Feature freeze must occur before the event.

---

# DECISION-018
## Visual Effects Must Be Performance-Conscious

### Status
APPROVED

### Date
2026-09-04

### Decision
Visual quality should be achieved without unnecessary rendering complexity.

### Chosen Approach
Prefer:

- GPU-friendly animation
- efficient assets
- CSS transforms where appropriate
- controlled effects
- optimized rendering
- limited continuous animation

### Reason
The projector should remain smooth even on ordinary event hardware.

### Constraints
Do not add heavy 3D, particle, blur, or post-processing effects without measuring their impact.

---

# DECISION-019
## AI Agents Share One Repository

### Status
APPROVED

### Date
2026-09-04

### Decision
Codex, Claude Code, Antigravity, and other authorized agents will work from the same project repository.

### Context
The agents need a common source of truth.

### Chosen Approach
Communication happens through:

- repository state
- documentation
- tests
- Git history
- `agent/TASKS.md`
- `agent/STATUS.md`
- `agent/REVIEW.md`
- `agent/HANDOFF.md`

### Reason
A shared repository is simpler and more reliable than attempting to create an independent communication system between AI agents.

### Constraints
Agents must document important work so another agent can understand it.

---

# DECISION-020
## AI Agent Responsibilities Are Separated

### Status
APPROVED

### Date
2026-09-04

### Decision
AI agents should have clearly separated responsibilities rather than independently rewriting the same project.

### Current Responsibilities

Codex:

- lead engineering
- architecture implementation
- backend
- game engine
- integration
- technical stabilization

Claude Code:

- code review
- security review
- game-integrity review
- loophole detection
- difficult debugging

Antigravity:

- frontend
- visual design implementation
- UX
- browser verification
- visual QA
- frontend polish

### Reason
Specialization reduces conflicting implementations and wasted AI usage.

### Constraints
No agent should casually overwrite another agent's work.

---

# DECISION-021
## AI Does Not Own Product Decisions

### Status
APPROVED

### Date
2026-09-04

### Decision
The product owner remains the final authority for major product and gameplay decisions.

### Chosen Approach
AI agents may:

- propose
- analyze
- criticize
- implement
- test

AI agents may not independently redefine:

- core game rules
- product goals
- major mechanics
- scoring philosophy
- player experience
- event requirements

unless explicitly authorized.

### Reason
AI agents should implement the intended product rather than gradually changing the product through independent decisions.

---

# DECISION-022
## No Parallel Conflicting Implementations

### Status
APPROVED

### Date
2026-09-04

### Decision
Multiple agents should not independently implement competing versions of the same system at the same time.

### Example

BAD:

Codex builds one multiplayer engine.

Claude independently builds another multiplayer engine.

Antigravity modifies both.

GOOD:

Codex owns the implementation.

Claude reviews it.

Codex fixes it.

Antigravity integrates with it.

### Reason
This reduces:

- conflicts
- duplicated work
- wasted model usage
- inconsistent behavior

---

# DECISION-023
## Documentation Must Reflect Reality

### Status
APPROVED

### Date
2026-09-04

### Decision
Project documentation must describe the actual system rather than an intended but unimplemented system.

### Chosen Approach
When a major implementation changes:

- architecture documentation
- security documentation
- performance documentation
- gameplay documentation

must be updated when applicable.

### Reason
AI agents rely heavily on project documentation.

Outdated documentation can cause incorrect implementations.

---

# DECISION-024
## No Silent Architectural Changes

### Status
APPROVED

### Date
2026-09-04

### Decision
Agents must not silently replace major technologies or architectural patterns.

### Examples

Do not silently replace:

- WebSockets with polling
- the authoritative server with client state
- database strategy
- authentication architecture
- room architecture
- rendering architecture

### Reason
Major changes affect the entire project.

### Constraints
Significant changes must be documented and approved.

---

# DECISION-025
## Simplicity Is a Technical Requirement

### Status
APPROVED

### Date
2026-09-04

### Decision
The simplest architecture capable of meeting requirements is preferred.

### Reason
The project is being developed by a small team using multiple AI agents and must be operationally reliable.

### Constraints
Every major new dependency or infrastructure component should have a clear justification.

The question should always be:

"Do we actually need this?"

before:

"Would this be technically impressive?"

---

# DECISION-026
## Development Should Be Incremental

### Status
APPROVED

### Date
2026-09-04

### Decision
The system should be built in verified stages.

### Preferred Sequence

1. Project foundation
2. Game engine
3. Server
4. Room system
5. Player connection
6. Projector connection
7. Core gameplay
8. Frontend
9. Visual polish
10. Security testing
11. Multiplayer testing
12. Performance testing
13. Full event rehearsal
14. Release stabilization

### Reason
Incremental development makes failures easier to isolate.

### Constraints
Do not build the entire system blindly and test only at the end.

---

# DECISION-027
## Core Gameplay Must Remain Playable Without Visual Effects

### Status
APPROVED

### Date
2026-09-04

### Decision
Visual effects are presentation layers and must not be required for core game correctness.

### Reason
If an animation fails, the game should continue.

### Example

If a property purchase animation fails:

The property should still be purchased correctly on the authoritative server.

### Constraints
No animation may be the source of truth for a gameplay action.

---

# DECISION-028
## UI Must Reflect Server State

### Status
APPROVED

### Date
2026-09-04

### Decision
Projector and player interfaces must derive their authoritative displayed state from server-confirmed state.

### Reason
This prevents visual state from becoming inconsistent with actual game state.

### Constraints
Do not optimistically display irreversible gameplay changes as final unless the architecture explicitly supports safe optimistic updates.

For important actions:

`REQUEST → SERVER VALIDATION → CONFIRMED RESULT → UI UPDATE`

---

# DECISION-029
## Local Event Recovery Is Required

### Status
APPROVED

### Date
2026-09-04

### Decision
The event deployment must have a practical recovery procedure.

### Required Considerations

The final system should account for:

- server restart
- player refresh
- player disconnect
- projector reconnect
- network interruption
- browser crash
- admin recovery
- room reset
- backup deployment

### Reason
Event-day failures are different from development failures.

The team needs a known recovery procedure rather than improvising under pressure.

---

# DECISION-030
## Feature Freeze Before Event

### Status
APPROVED

### Date
2026-09-04

### Decision
A final feature freeze must happen before the event.

### Reason
Late feature additions create unnecessary risk.

### Chosen Approach
After feature freeze:

Only allow:

- critical bug fixes
- security fixes
- stability fixes
- necessary deployment fixes
- carefully approved visual fixes

Do not add new gameplay systems after the freeze unless the product owner explicitly accepts the risk.

---

# DECISION-031
## Event Hardware Is Part of the Product

### Status
APPROVED

### Date
2026-09-04

### Decision
The software cannot be considered complete without testing on the intended event setup.

### Required Environment

Where possible test with:

- actual projector resolution
- actual laptop/server
- actual local network
- multiple player devices
- actual browser environment
- realistic viewing distance

### Reason
A system that works perfectly on a developer machine can still fail during the event.

---

# DECISION-032
## No Dependency on Developer-Only Environment

### Status
APPROVED

### Date
2026-09-04

### Decision
The final event build must not depend on an individual developer's local setup, credentials, or undocumented configuration.

### Reason
The project must be transferable and recoverable.

### Constraints
The event setup should be documented clearly enough that another authorized person can start the system.

---

# DECISION-033
## Security Is Tested Adversarially

### Status
APPROVED

### Date
2026-09-04

### Decision
Security testing should assume that players may intentionally attempt to manipulate the game.

### Chosen Approach
Testing must consider:

- modified client requests
- forged IDs
- repeated requests
- stale requests
- direct API access
- WebSocket manipulation
- cross-room access
- private-state access
- client storage manipulation
- unauthorized admin actions
- malformed requests

### Reason
Normal user testing cannot expose all multiplayer vulnerabilities.

---

# DECISION-034
## Release Requires Evidence

### Status
APPROVED

### Date
2026-09-04

### Decision
Release readiness must be based on actual verification rather than agent confidence.

### Chosen Approach
Agents must report:

- tests actually run
- build actually completed
- known issues
- unresolved findings
- environment tested
- multiplayer results

### Constraint
An agent must never claim:

"PASS"

or:

"READY"

without evidence.

---

# DECISION-035
## Product Scope Must Stay Controlled

### Status
APPROVED

### Date
2026-09-04

### Decision
ECONOVA should prioritize depth and polish within a controlled scope instead of continuously adding mechanics.

### Reason
The strongest event experience is:

- easy to understand
- strategically interesting
- visually impressive
- fast to play
- reliable

Additional mechanics are not automatically improvements.

### Constraints
Any new major mechanic should be evaluated against:

- fun
- clarity
- development cost
- testing cost
- visual complexity
- performance
- event-day risk

---

# DECISION-036
## Changes Must Preserve Existing Functionality

### Status
APPROVED

### Date
2026-09-04

### Decision
New functionality must not silently break previously verified functionality.

### Chosen Approach
Use regression tests and targeted integration testing after meaningful changes.

### Reason
Multiple AI agents may modify the same project over time.

### Constraints
When a regression is discovered:

1. identify the responsible change
2. reproduce the issue
3. fix it
4. add a regression test where appropriate
5. verify related functionality

---

# DECISION-037
## The Repository Is the Shared AI Memory

### Status
APPROVED

### Date
2026-09-04

### Decision
The repository documentation and source code are the persistent shared context between agents.

### Chosen Approach
Agents should communicate important information through:

- code
- documentation
- tests
- Git
- status
- review findings
- handoffs

### Reason
Individual AI conversations are temporary.

The repository must remain understandable even when a different agent takes over.

---

# DECISION-038
## Agents Must Not Guess About Important Requirements

### Status
APPROVED

### Date
2026-09-04

### Decision
If a missing requirement can materially affect the product, agents must surface the ambiguity instead of silently inventing a rule.

### Important Areas

This particularly applies to:

- game rules
- scoring
- security
- private information
- room behavior
- player permissions
- architecture
- persistence
- admin controls

### Reason
A reasonable guess can still become a serious product bug.

---

# DECISION-039
## Visual Polish Comes After Functional Stability

### Status
APPROVED

### Date
2026-09-04

### Decision
The project should establish reliable gameplay and server behavior before investing heavily in visual polish.

### Preferred Priority

1. Core game correctness
2. Server authority
3. Multiplayer reliability
4. Security
5. Player/projector functionality
6. Performance
7. Visual polish
8. Advanced effects

### Reason
A beautiful broken game is still a failed event product.

---

# DECISION-040
## Final Authority Hierarchy

### Status
APPROVED

### Date
2026-09-04

### Decision
When deciding what should be followed, use this hierarchy:

1. Explicit product-owner decision
2. `docs/GAME_DESIGN_SPEC.md` for gameplay
3. `docs/ARCHITECTURE.md` for architecture
4. `docs/SECURITY.md` for security
5. `docs/PERFORMANCE.md` for performance
6. `docs/VISUAL_SYSTEM.md` for visual design
7. Other project documentation
8. Existing implementation
9. Agent assumptions

### Reason
This prevents an agent from treating its own interpretation as more authoritative than an explicit project decision.

### Constraint
Agent assumptions must never override explicit approved requirements.

---

# DECISION-041
## Current Technical Direction

### Status
APPROVED

### Date
2026-09-04

### Decision
The current technical direction is:

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion where appropriate

Backend:
- Node.js
- TypeScript
- Fastify
- WebSockets

Validation:
- Zod or an equivalent strongly typed runtime validation system

Persistence:
- PostgreSQL where required

Testing:
- Vitest or equivalent unit/integration testing
- Playwright or equivalent browser/E2E testing

### Context
These technologies provide a strong balance of:

- development speed
- maintainability
- realtime capability
- visual flexibility
- testing support
- performance

### Constraints
This is the current direction, not permission to blindly add every technology listed.

The actual implementation must remain documented in `docs/ARCHITECTURE.md`.

---

# DECISION-042
## No Technology Should Be Chosen for Hype

### Status
APPROVED

### Date
2026-09-04

### Decision
Technology choices must be justified by ECONOVA's requirements.

### Reason
The project does not benefit from adopting a technology merely because it is:

- newer
- more complex
- more popular
- technically impressive
- recommended by an AI

### Required Question

Before introducing a major technology:

"Does this materially improve ECONOVA?"

If not, do not introduce it.

---

# DECISION-043
## Final Product Goal

### Status
APPROVED

### Date
2026-09-04

### Decision
The goal is to produce a polished, fast, secure, reliable multiplayer strategy game capable of running two simultaneous games during a live university event.

### Success Criteria

ECONOVA should be:

- visually impressive
- easy to understand
- strategically interesting
- responsive
- secure against ordinary client manipulation
- resilient to normal network/player failures
- reliable across two simultaneous rooms
- maintainable by multiple AI agents
- practical to operate during the event

### Final Principle

Do not optimize for the amount of code produced.

Optimize for the quality of the actual experience.

---

# FUTURE DECISIONS

New decisions should be added below this section using the standard format.

Do not overwrite historical decisions.

If an existing decision changes, mark the old decision as:

`SUPERSEDED`

and create a new decision explaining the replacement.

---

# PRODUCT DECISIONS

The following entries record the three formerly conflicting gameplay decisions. All three are now approved and final; `docs/GAME_DESIGN_SPEC.md` contains their canonical implementation rules.

---

# DECISION-044
## Canonical Market and Event Ordering

### Status
APPROVED

### Date
2026-09-04

### Decision
RESOLVED. Breaking News and market/event changes resolve at the START of each round, BEFORE player turns. See `docs/GAME_DESIGN_SPEC.md` Section 8.

### Context
At the time this decision was opened, `docs/PRODUCT.md` section 9 placed player/game actions before market/event changes. `docs/GAME_RULES.md` section 40 placed the event/market update before player actions, while section 73 placed Breaking News/market changes between one round and continued play.

### Why It Matters
The interpretation determines which market and event state governs purchases, development, income, action legality, client projections, animations, and tests.

### Options Considered

1. Player actions occur before that round's market/event changes, matching `docs/PRODUCT.md` section 9.
2. Market/event changes resolve before player actions, matching `docs/GAME_RULES.md` section 40.

### Chosen Approach
Option 2 — Market/event changes resolve before player actions. Full specification in `docs/GAME_DESIGN_SPEC.md` Section 8.1.

### Recommended Resolution
A round begins, its Breaking News and market/event change is resolved and broadcast, any applicable City Council resolves, players act under that state, and the round then closes.

### Consequences
The authoritative phase machine, event timing, market timing, and affected gameplay tests must implement the approved order in `docs/GAME_DESIGN_SPEC.md` Section 8.

### Constraints

- Do not silently choose an ordering from one diagram.
- Do not implement both interpretations.
- The approved order must be reflected consistently in source documents, engine contracts, and tests.

### Related Documents

- `docs/PRODUCT.md` section 9
- `docs/GAME_RULES.md` sections 40 and 73
- `docs/GAME_CONTENT.md`

### Approved By
Product owner — 2026-09-04

---

# DECISION-045
## Canonical City Council Timing and Effect Boundary

### Status
APPROVED

### Date
2026-09-04

### Decision
RESOLVED. City Council occurs at the START of Rounds 3 and 6, after Breaking News, before player turns. Winning policy takes effect immediately. See `docs/GAME_DESIGN_SPEC.md` Section 23.

### Context
At the time this decision was opened, `docs/GAME_RULES.md` section 29 said City Council occurred after Round 3 and after Round 6. Section 40 placed City Council before round resolution. The documents did not state whether the resulting policy affected the just-completed round's resolution or began with the following round.

### Why It Matters
The boundary changes economic outcomes, legal actions, income/value calculation, policy duration, projector timing, scoring, and deterministic replay.

### Options Considered

1. Resolve Council after normal actions but before the named round-resolution step.
2. Complete the round, then resolve Council as a between-round phase.

For either option, the policy's effective start and expiry boundary must also be stated explicitly.

### Chosen Approach
Approved resolution — Council resolves as a named subphase after Breaking News but before player actions. Policy affects that same round. Full specification in `docs/GAME_DESIGN_SPEC.md` Sections 8.3 and 23.

### Recommended Resolution
Model Council as a named subphase at the start of Rounds 3 and 6, after Breaking News and before player turns. The winning policy takes effect immediately and applies during that same round.

### Consequences
The Council state machine, policy-duration calculations, affected scoring logic, projector transition, and related tests must implement the approved boundary in `docs/GAME_DESIGN_SPEC.md` Sections 8.3 and 23.

### Constraints

- Do not infer policy timing from visual sequence alone.
- Voting must remain private until the approved reveal point.
- The approved boundary must remain consistent across all affected lifecycle descriptions.

### Related Documents

- `docs/GAME_RULES.md` sections 29–33 and 40
- `docs/GAME_CONTENT.md`

### Approved By
Product owner — 2026-09-04

---

# DECISION-046
## Selling Mechanic for the Initial Release

### Status
APPROVED

### Date
2026-09-04

### Decision
RESOLVED. Emergency bank sale at 50% of current Property Value is available ONLY for mandatory payments (landing fees). No voluntary bank selling. See `docs/GAME_DESIGN_SPEC.md` Section 28.

### Context
At the time this decision was opened, `docs/PRODUCT.md` section 11 presented “hold or sell” as a strategy example. `docs/GAME_RULES.md` section 46 conditionally mentioned selling as a recovery option, while section 48 stated that selling was not automatically permitted because no sale mechanic or sale value was defined.

### Why It Matters
Selling changes financial recovery, property availability, balance, scoring, UI actions, authorization, atomic state transitions, and test cases.

### Options Considered

1. No direct bank sale in the initial release; property transfer occurs only through whatever trade rules are separately approved.
2. Add a direct selling mechanic after the product owner supplies complete eligibility, valuation, timing, ownership-transfer, and interaction rules.

### Chosen Approach
Option 2 with restrictions — emergency bank sale is permitted only for mandatory landing-fee payments. No voluntary direct bank sale. Full rules in `docs/GAME_DESIGN_SPEC.md` Section 28.2.

### Recommended Resolution
Use no voluntary direct bank sale action for the initial release. Permit emergency bank sale only for mandatory landing-fee payments under the complete rules in `docs/GAME_DESIGN_SPEC.md` Section 28.2.

### Consequences
No voluntary selling UI or action is permitted. Mandatory-payment recovery behavior and related engine tests must implement the approved emergency-sale rule.

### Constraints

- Use the approved 50% current Property Value liquidation formula; do not infer any additional sale price or formula.
- Do not treat the emergency rule as permission to implement voluntary selling.
- Tradeable asset types are limited to Credits and Properties as approved in `docs/GAME_DESIGN_SPEC.md` Section 19.

### Related Documents

- `docs/PRODUCT.md` section 11
- `docs/GAME_RULES.md` sections 46 and 48
- `docs/GAME_CONTENT.md`

### Approved By
Product owner — 2026-09-04

---

# DECISION-047 — Privileged private operator inspection

Status: APPROVED / FINAL

Approved by: Product owner, Phase 2 continuation (2026-09-06).

Routine admin WebSocket projections contain only public gameplay and operational player connectivity. They must not contain unrevealed strategy cards, secret objectives, sealed bids, or Council allocations.

The event operator may inspect those private fields only through a separate, room-scoped privileged capability. Every inspection requires fresh re-authentication, current authorization, and successful durable audit recording BEFORE the private response is returned. Cross-room access is denied. Inspection responses are never cached, broadcast, or copied into routine projections.

Implementation: `POST /api/admin/rooms/:roomId/private-inspection`, a room-bound admin session, the operator credential re-entered for each request, and a request ID/reason. Audit records identify the operator session, room/game, state version, request and reason, without storing inspected secrets. Failed audit persistence returns no private data.

This authorizes private inspection only; it does not authorize game-state editing or change gameplay.

---

# DECISION-048 — Operator pause freezes all game time

Status: APPROVED / FINAL. Product-owner clarification, 2026-09-06.

Operator pause freezes all remaining timers, including reconnect grace, and defers disconnect-triggered gameplay effects until resume. See `GAME_DESIGN_SPEC.md` section 29.3a. Persist the pause timestamp and deferred disconnect identities for recovery; do not infer elapsed pause time for legacy snapshots lacking that timestamp.

---

# DECISION CHANGE RULE

When superseding a decision:

1. Keep the old decision.
2. Change its status to `SUPERSEDED`.
3. Add the new decision.
4. Explain why the previous decision no longer applies.
5. Identify affected documents.
6. Update the affected documentation.
7. Verify the implementation matches the new decision.

Never silently rewrite project history.

---

# END OF DECISION LOG
