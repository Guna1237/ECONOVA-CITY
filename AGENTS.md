# AGENTS.md

# ECONOVA: CITY
## AI AGENT DEVELOPMENT RULES

You are working on ECONOVA: CITY, a polished multiplayer strategy game designed for a live university event.

This repository may be worked on by multiple AI coding agents, including Codex, Claude Code, and Antigravity.

The agents share the same repository.

Your job is to make the project better without breaking work completed by another agent.

This file defines the mandatory rules for every AI agent working in this repository.

---

# 1. CORE PRINCIPLE

ECONOVA: CITY must prioritize:

1. Correctness
2. Game integrity
3. Security
4. Reliability
5. Performance
6. Visual quality
7. Maintainability
8. Development speed

Never sacrifice correctness or security merely to add a feature faster.

Never sacrifice reliability for unnecessary visual effects.

Never add complexity unless it provides a clear benefit.

The final product should feel like a professional multiplayer game, not a student software project.

---

# 2. READ BEFORE DOING ANYTHING

Before modifying the repository, you MUST inspect the existing project.

At minimum, read:

- `AGENTS.md`
- `README.md`
- `docs/PRODUCT.md`
- `docs/GAME_DESIGN_SPEC.md`
- `docs/GAME_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/VISUAL_SYSTEM.md`
- `docs/SECURITY.md`
- `docs/PERFORMANCE.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `agent/TASKS.md`
- `agent/STATUS.md`
- `agent/REVIEW.md`
- `agent/HANDOFF.md`

Do not assume these files are empty, current, or irrelevant.

If some files do not yet exist, determine whether they are supposed to be created as part of the current task.

Inspect the actual source code before making architectural decisions.

Do not create a duplicate system without first checking whether an existing implementation already solves the problem.

---

# 3. SOURCE OF TRUTH

The following documents have different responsibilities.

## `docs/PRODUCT.md`

Source of truth for:

- product vision
- user experience
- event requirements
- player experience
- projector experience
- admin experience
- overall product goals

## `docs/GAME_DESIGN_SPEC.md`

Source of truth for:

- gameplay
- game phases
- actions
- economy
- properties
- events
- cards
- trading
- policies
- scoring
- winning
- game-ending conditions
- gameplay edge cases

Never invent or silently change gameplay rules.

If implementation conflicts with the documented rules, stop and report the conflict.

## `docs/GAME_RULES.md`

Superseded gameplay reference retained for historical context. Where it conflicts with `docs/GAME_DESIGN_SPEC.md`, the approved canonical specification wins and this file must not be used for implementation.

## `docs/GAME_CONTENT.md`

Superseded Phase 0 structure retained for historical context. Approved values and catalogs now live in `docs/GAME_DESIGN_SPEC.md`.

## `docs/ARCHITECTURE.md`

Source of truth for:

- system architecture
- frontend/backend responsibilities
- networking
- WebSockets
- state management
- database usage
- deployment
- room architecture
- service boundaries

Do not make major architectural changes without documenting the decision.

## `docs/VISUAL_SYSTEM.md`

Source of truth for:

- visual identity
- UI design
- typography
- spacing
- colors
- components
- animation
- projector design
- mobile design
- interaction patterns

Do not create a completely different visual language for an individual screen.

## `docs/SECURITY.md`

Source of truth for:

- authentication
- authorization
- game-state protection
- client/server trust
- room isolation
- private information
- action validation
- WebSocket security
- admin security
- anti-cheat requirements

## `docs/PERFORMANCE.md`

Source of truth for:

- performance targets
- latency targets
- rendering requirements
- animation requirements
- asset limits
- network requirements
- memory usage
- load testing

## `docs/TESTING.md`

Source of truth for:

- required tests
- test coverage expectations
- integration testing
- multiplayer testing
- security testing
- browser testing
- release testing

## `docs/DECISIONS.md`

Contains important permanent technical/product decisions.

Do not repeatedly reconsider an already-approved decision unless new evidence justifies doing so.

---

# 4. WHEN DOCUMENTS CONFLICT

Never silently choose one interpretation.

If two authoritative documents conflict:

1. Identify the conflict.
2. Stop the affected implementation.
3. Explain the conflict clearly.
4. Ask for a decision if necessary.
5. Do not invent a compromise.
6. Do not silently rewrite both documents.

Preserving consistency is more important than continuing development.

---

# 5. MULTI-AGENT WORKING RULES

Multiple AI agents may work on this repository.

Agents may include:

- Codex
- Claude Code
- Antigravity
- other authorized development agents

The repository is the shared communication layer.

Agents communicate through:

- source code
- documentation
- tests
- Git history
- `agent/TASKS.md`
- `agent/STATUS.md`
- `agent/REVIEW.md`
- `agent/HANDOFF.md`

Do NOT assume another agent knows what you changed unless it is documented.

---

# 6. DO NOT DESTROY ANOTHER AGENT'S WORK

Before modifying a file:

1. Inspect its current contents.
2. Determine whether another feature depends on it.
3. Inspect recent Git changes when appropriate.
4. Preserve working functionality.
5. Make the smallest reasonable change.

Never:

- overwrite an entire file unnecessarily
- revert another agent's work without justification
- delete working functionality because you prefer another approach
- perform broad refactors during an unrelated task

If a previous implementation is genuinely wrong, explain why before replacing it.

---

# 7. TASK DISCIPLINE

Every meaningful development task should have a clear scope.

Before starting:

- identify the task
- identify its owner
- identify relevant documentation
- identify affected systems
- identify likely risks

Work only within the assigned scope unless a dependency requires additional work.

Do not turn a small task into an unrelated redesign.

For example:

If asked to fix property purchasing, do not redesign the entire frontend.

If asked to improve a projector animation, do not change the game engine.

If asked to fix authentication, do not rewrite unrelated UI components.

---

# 8. GAME SERVER MUST BE AUTHORITATIVE

The server is the ultimate authority over game state.

The client is NOT trusted.

The client must never be able to directly determine or permanently modify:

- credits
- money
- property ownership
- property levels
- Influence
- cards
- secret objectives
- scoring
- round number
- turn ownership
- game phase
- event results
- policy results
- random outcomes
- player permissions
- room membership
- victory conditions

The client may REQUEST an action.

The server decides whether the action is legal.

Example:

Client:

`BUY_PROPERTY(propertyId)`

Server:

1. Verify player identity.
2. Verify room.
3. Verify game state.
4. Verify current phase.
5. Verify current player.
6. Verify property availability.
7. Verify financial requirements.
8. Verify all gameplay requirements.
9. Apply the transaction atomically.
10. Update authoritative state.
11. Generate the appropriate event.
12. Broadcast the resulting state.

Never trust a client-provided result.

---

# 9. NEVER DUPLICATE GAME LOGIC ON THE CLIENT

The frontend may display game rules.

It must not become the ultimate authority for those rules.

Do not create situations where:

- client calculates one result
- server calculates another result
- projector calculates a third result

Core gameplay calculations should live in the authoritative game engine/server.

The frontend may calculate presentation-only information when safe.

If the same important gameplay calculation exists in multiple places, investigate whether it should be centralized.

---

# 10. ATOMIC GAME ACTIONS

Gameplay actions must be safe against:

- double clicks
- repeated requests
- network retries
- delayed requests
- simultaneous requests
- reconnects
- stale clients
- malicious requests

An action must not accidentally execute twice.

Examples:

A player cannot successfully buy the same property twice.

Two players cannot both successfully purchase the same property.

A player cannot spend the same credits twice through concurrent requests.

A card cannot be consumed twice because of repeated requests.

A trade cannot be finalized twice.

A vote cannot count twice.

Use appropriate server-side transaction/state-locking/idempotency mechanisms.

---

# 11. ACTION VALIDATION

Every gameplay action received by the server must be validated.

Validation should include, where relevant:

- authenticated player
- valid room
- valid game
- correct game phase
- correct turn
- valid action type
- valid target
- valid ownership
- sufficient resources
- action limits
- cooldown/state restrictions
- duplicate action prevention
- valid request structure

Never assume that because the normal UI does not show an illegal action, the server does not need to protect against it.

The server must reject illegal actions even when manually sent.

---

# 12. PRIVATE INFORMATION

Player-private information must remain private.

Examples may include:

- secret objectives
- private cards
- private resources where applicable
- hidden decisions
- private trade information
- other information explicitly defined as private

Do not send private data to every connected client and merely hide it visually.

If Player A should not know something, Player A's network payload should not contain it.

Use server-side state projections.

Conceptually:

`FULL SERVER STATE`

must be transformed into:

- public state
- Player A private state
- Player B private state
- admin state

as appropriate.

---

# 13. ROOM ISOLATION

ECONOVA supports multiple independent game rooms.

At the event, at least two rooms may operate simultaneously.

Room A must never be able to:

- read Room B's state
- modify Room B's state
- receive Room B's private events
- access Room B's players
- access Room B's game actions
- affect Room B's scoreboard

The same applies in reverse.

Every room-scoped operation must verify room membership server-side.

Never rely only on client-provided room IDs.

---

# 14. ADMIN SECURITY

Admin/game-master functions are privileged.

Examples may include:

- start game
- pause game
- resume game
- reset game
- skip turn
- advance round
- issue emergency actions
- reconnect players
- inspect state
- end game

Normal players must not be able to invoke administrative functions simply by modifying frontend requests.

Admin authorization must be enforced server-side.

Do not expose secrets or privileged credentials in frontend code.

---

# 15. WEBSOCKET RULES

Realtime communication must be treated as untrusted network input.

Validate:

- connection identity
- room membership
- message structure
- action type
- payload
- sequence/state validity
- authorization

Handle:

- disconnects
- reconnects
- stale connections
- duplicate messages
- malformed messages
- unexpected messages
- server restarts
- connection timeouts

Do not assume WebSocket messages arrive exactly once or in the ideal order.

---

# 16. RECONNECTION

The game must survive ordinary player disconnections.

Refreshing a browser should not create:

- duplicate players
- duplicate actions
- duplicate resources
- duplicate cards
- duplicate transactions

A reconnecting player should receive the correct state for their identity and room.

Reconnection must not expose private information belonging to another player.

---

# 17. ERROR HANDLING

Errors must be handled deliberately.

Never allow an invalid player action to crash the game server.

Never expose internal stack traces, secrets, database details, or implementation details to normal players.

Player-facing errors should be:

- clear
- short
- actionable
- non-technical

Server logs should contain enough technical information for debugging.

---

# 18. SECURITY TESTING

Do not only test the normal UI flow.

Actively test malicious and abnormal behavior.

At minimum consider:

- forged player IDs
- forged room IDs
- forged credits
- forged property ownership
- forged cards
- forged scoring
- duplicate actions
- replayed actions
- stale actions
- simultaneous actions
- malformed payloads
- oversized payloads
- unauthorized admin actions
- cross-room requests
- private-state requests
- reconnect abuse
- direct API requests
- direct WebSocket requests
- local storage manipulation
- browser developer tools manipulation

If a vulnerability is discovered, record it in `agent/REVIEW.md`.

---

# 19. GAME INTEGRITY

The game must always have one coherent state.

Never allow:

- projector showing one owner while server says another
- player screen showing incorrect credits
- two players owning the same exclusive property
- UI displaying a completed action that the server rejected
- scoring using stale state
- round transitions happening differently on different clients

The server state is authoritative.

All displays must derive from server state.

---

# 20. RANDOMNESS

Any gameplay randomness that affects outcomes must be controlled by the authoritative server.

Never allow the client to decide:

- dice results
- card draws
- random events
- random outcomes
- randomized scoring

If randomness is required, generate it server-side.

Where useful, make random outcomes testable through deterministic test mechanisms.

Do not weaken production randomness merely to make development easier.

---

# 21. PERFORMANCE

The target is a smooth live event experience.

Do not optimize prematurely, but do not introduce obviously expensive systems without justification.

Prioritize:

- fast initial loading
- low realtime latency
- smooth projector rendering
- smooth mobile interaction
- efficient WebSocket updates
- efficient state updates
- reasonable memory usage
- efficient assets
- predictable server performance

Avoid unnecessary:

- large libraries
- excessive dependencies
- massive assets
- continuous expensive animations
- unnecessary 3D rendering
- excessive DOM updates
- repeated network requests
- polling where realtime communication is appropriate

Visual quality must not come at the cost of event-day reliability.

---

# 22. VISUAL QUALITY

ECONOVA should look polished and intentional.

The visual experience should feel like a professional strategy game.

Avoid:

- generic dashboard aesthetics
- default browser styling
- excessive tables
- random component styles
- inconsistent typography
- unnecessary gradients
- excessive glow
- excessive shadows
- visual clutter
- animation for animation's sake

Follow `docs/VISUAL_SYSTEM.md`.

The projector and player interfaces should feel like parts of the same game.

---

# 23. PROJECTOR EXPERIENCE

The projector is a public interface.

It must prioritize:

- readability from a distance
- strong hierarchy
- large important information
- clear current-turn indication
- clear round information
- clear events
- clear ownership
- clear demand/market information
- attractive animations
- minimal unnecessary interaction

Do not put private information on the projector.

Do not require the projector operator to perform normal player actions.

---

# 24. PLAYER EXPERIENCE

Player interfaces should be optimized for phones and touch.

Prioritize:

- large touch targets
- clear actions
- fast feedback
- obvious current state
- readable cards
- minimal unnecessary navigation
- clear confirmation of important actions
- clear error messages

Do not make players hunt through menus for basic actions.

---

# 25. ANIMATIONS

Animations should communicate state changes.

Good uses:

- property purchase
- development
- demand changes
- event announcements
- policy decisions
- trade confirmation
- round transitions
- end-game sequence

Avoid animations that:

- delay important actions
- block the UI
- consume excessive CPU/GPU
- make information difficult to read
- repeatedly distract players

Gameplay responsiveness always takes priority.

---

# 26. DO NOT OVERENGINEER

This is a controlled multiplayer event application.

The player count is small.

Do not introduce:

- unnecessary microservices
- unnecessary message queues
- unnecessary Kubernetes infrastructure
- unnecessary cloud complexity
- unnecessary distributed systems
- unnecessary real-time databases
- unnecessary dependencies

Prefer a simple, robust architecture that can be understood and maintained during the event.

Complexity must earn its place.

---

# 27. DATABASE

Use the database for persistence where required.

Do not automatically put every transient UI update into the database.

Active game state may be held in memory where appropriate for performance, with suitable persistence/recovery mechanisms.

Database design must follow `docs/ARCHITECTURE.md`.

Never store secrets insecurely.

Never commit credentials.

---

# 28. ENVIRONMENT VARIABLES AND SECRETS

Never commit:

- passwords
- API keys
- database passwords
- private tokens
- authentication secrets
- production credentials

Use environment variables.

Maintain `.env.example` with safe placeholder values.

Never put secrets into:

- frontend source
- public assets
- Git history
- documentation
- screenshots
- logs

---

# 29. DEPENDENCIES

Before adding a dependency:

1. Check whether the project already has a suitable solution.
2. Check whether the dependency is actually necessary.
3. Consider bundle size.
4. Consider maintenance.
5. Consider security.
6. Consider event-day reliability.

Do not add a library just because it makes a small task slightly easier.

---

# 30. TYPESCRIPT

Prefer strong typing.

Avoid unnecessary:

`any`

Do not silence TypeScript errors simply to make the build pass.

If a type must be weakened, understand why and document the reason when significant.

Shared types should be centralized where appropriate.

---

# 31. CODE QUALITY

Prefer:

- small understandable functions
- explicit state transitions
- clear naming
- typed interfaces
- deterministic game logic
- isolated modules
- testable code
- predictable side effects

Avoid:

- giant functions
- hidden global state
- duplicated business logic
- unexplained magic numbers
- unnecessary abstractions
- clever code that is difficult to debug

Readable code is especially important because multiple agents will work on it.

---

# 32. GAME ENGINE DESIGN

Core game logic should be as deterministic and testable as possible.

A game action should conceptually follow:

`INPUT → VALIDATION → STATE TRANSITION → EVENTS → RESULT`

Avoid putting gameplay logic directly inside:

- React components
- UI event handlers
- projector components
- WebSocket transport code

The game engine should be independently testable without a browser.

---

# 33. TESTING REQUIREMENT

Every meaningful gameplay feature should have tests.

At minimum, test:

- valid behavior
- invalid behavior
- boundary conditions
- repeated actions
- simultaneous actions where relevant
- reconnect behavior where relevant
- security-sensitive behavior

Every discovered bug that could recur should receive a regression test.

A fix without a test is incomplete when a test is reasonably possible.

---

# 34. TEST TYPES

Use the appropriate level of testing.

## Unit tests

For:

- game rules
- calculations
- validation
- state transitions
- utilities

## Integration tests

For:

- server + game engine
- database interactions
- WebSockets
- room management

## Multiplayer tests

For:

- multiple players
- simultaneous actions
- room isolation
- reconnection
- turn flow

## Security tests

For:

- unauthorized actions
- forged requests
- malformed payloads
- private data access
- replay attacks
- cross-room attacks

## E2E tests

For:

- joining
- playing
- reconnecting
- projector updates
- complete game flow

---

# 35. DO NOT CLAIM TESTS PASSED WITHOUT RUNNING THEM

Never say:

"Tests pass"

unless you actually ran the relevant tests.

Never say:

"Fixed"

unless you verified the fix.

Never say:

"Production ready"

unless the required release checks were completed.

If you cannot run a test, state:

`NOT VERIFIED`

instead of pretending it passed.

---

# 36. BROWSER TESTING

When working on frontend behavior, test the actual browser experience where possible.

Do not assume that:

"the code looks correct"

means:

"the user experience works."

Check:

- desktop
- projector resolution
- mobile
- touch interactions
- loading
- errors
- reconnect
- transitions
- disabled states
- long text
- unusual states

---

# 37. TWO-ROOM TESTING

ECONOVA must support two independent games.

Test:

- Room A starts independently.
- Room B starts independently.
- Room A players cannot see Room B.
- Room B players cannot see Room A.
- Room A actions do not modify Room B.
- Room B actions do not modify Room A.
- Both rooms can operate simultaneously.
- One room can recover from a problem without corrupting the other.

This is a release-critical requirement.

---

# 38. FAILURE RESILIENCE

Design for event-day failures.

Consider:

- player refresh
- player disconnect
- Wi-Fi interruption
- projector disconnect
- browser crash
- server restart
- malformed request
- unexpected action
- accidental double click
- admin mistake

The system should fail safely.

Never allow a temporary UI/network failure to silently corrupt authoritative game state.

---

# 39. DOCUMENTATION DISCIPLINE

If you make an important change, update the relevant documentation.

Examples:

Gameplay change:

`GAME_DESIGN_SPEC.md`

Architecture change:

`ARCHITECTURE.md`

Security change:

`SECURITY.md`

Visual system change:

`VISUAL_SYSTEM.md`

Performance decision:

`PERFORMANCE.md`

Major project decision:

`DECISIONS.md`

Do not let documentation drift away from the actual implementation.

---

# 40. AGENT STATUS

After meaningful work, update:

`agent/STATUS.md`

Include:

- task
- status
- what changed
- files changed
- tests run
- test results
- known issues
- blockers
- recommended next step

Be factual.

Do not write vague statements such as:

"Everything is good."

---

# 41. REVIEW PROCESS

If you identify a problem outside your assigned scope:

Do not silently ignore it.

Record it in:

`agent/REVIEW.md`

Use:

```text
ID:
SEVERITY:
AREA:
FILE:
PROBLEM:
REPRODUCTION:
IMPACT:
RECOMMENDED FIX:
TEST REQUIRED:
STATUS:
```

Severity:

CRITICAL HIGH MEDIUM LOW


---

42. CRITICAL AND HIGH ISSUES

Do not knowingly declare the system production-ready with unresolved:

CRITICAL security vulnerabilities

HIGH security vulnerabilities

authoritative state corruption

cross-room leakage

private information exposure

duplicate transaction vulnerabilities

game-breaking scoring errors

unrecoverable multiplayer failures


Escalate them.


---

43. HANDOFFS

When another agent needs to continue your work, update:

agent/HANDOFF.md

Include:

what was completed

what remains

relevant files

important implementation details

known problems

tests performed

next recommended action


Do not assume the next agent will infer your intent from the code.


---

44. GIT DISCIPLINE

Use Git properly.

Before major work:

inspect current status

understand existing changes

avoid overwriting uncommitted work


Keep changes logically grouped.

Do not create enormous commits containing unrelated changes.

Commit messages should clearly describe the change.

Do not reset, revert, or delete another agent's changes without understanding their purpose.


---

45. NO UNAUTHORIZED PRODUCT CHANGES

Do not independently decide that ECONOVA needs:

new gameplay mechanics

new currencies

new player roles

new game modes

new monetization

new social systems

new scoring systems

new major UI flows


unless explicitly requested or documented.

Agents implement the product.

The product owner decides the product.


---

46. WHEN REQUIREMENTS ARE UNCLEAR

Do not guess when ambiguity could materially affect:

gameplay

security

architecture

data integrity

user experience

scoring

multiplayer behavior


Identify the ambiguity.

Ask for clarification if necessary.

If the ambiguity is minor and does not affect correctness, choose the simplest reasonable interpretation and document it.


---

47. CHANGE MANAGEMENT

Before making a significant change, answer internally:

1. What problem am I solving?


2. What existing system handles this?


3. What files will change?


4. What could this break?


5. How will I test it?


6. Does documentation need updating?


7. Does another agent need to know?



If you cannot answer these, inspect the project further before coding.


---

48. PERFORMANCE VS VISUALS

ECONOVA should look impressive.

However:

Visual complexity is not automatically quality.

Prefer:

GPU-friendly animations

optimized assets

efficient rendering

CSS transforms where appropriate

controlled particle/effect usage

lazy loading where appropriate

minimal unnecessary re-rendering


Do not add heavy 3D rendering simply because it looks technically impressive.

A smooth, polished 2D/2.5D experience is preferable to a laggy 3D experience.


---

49. EVENT-DAY PRIORITY

The event-day hierarchy is:

1. Game continues


2. Game state remains correct


3. Players can perform actions


4. Projector displays correct information


5. Reconnection works


6. Visual polish


7. Extra effects/features



If an effect causes instability, remove the effect.

If a feature threatens reliability, simplify the feature.


---

50. FINAL RELEASE STANDARD

ECONOVA is not finished merely because:

the application starts

the UI looks good

the main game flow works once


Before release, verify:

build works

server works

client works

projector works

player joining works

room creation works

two rooms work

room isolation works

gameplay rules work

invalid actions are rejected

private data stays private

reconnect works

duplicate actions are prevented

security audit is complete

required tests pass

browser flows pass

performance is acceptable

event-day startup procedure works

recovery procedure works



---

51. DEFINITION OF DONE

A task is DONE only when:

implementation is complete

relevant tests exist

relevant tests pass

no known regression was introduced

documentation is updated when required

status is recorded

known limitations are documented

another agent can understand the resulting state


"Code written" is not the same as "task complete."


---

52. FINAL BEHAVIORAL RULE

Think before coding.

Inspect before changing.

Validate on the server.

Test abnormal behavior.

Protect other agents' work.

Document important decisions.

Keep the architecture simple.

Do not invent requirements.

Do not claim success without verification.

When uncertain about a critical decision, stop and ask.

The goal is not to produce the most code.

The goal is to produce a reliable, secure, fast, visually exceptional ECONOVA: CITY that can run two simultaneous games during a live event without breaking.

END OF AGENTS.md
