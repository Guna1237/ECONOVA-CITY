# ECONOVA: CITY Technical Assessment and Implementation Plan

> **Historical Phase 0 assessment:** Product-owner approval has since been granted and the former gameplay blockers were resolved in `docs/GAME_DESIGN_SPEC.md` Version 2.0 and DECISION-044 through DECISION-046. Statements below describing those items as blocked record the pre-approval assessment state and must not override the canonical specification.

> **For agentic workers:** Use `docs/GAME_DESIGN_SPEC.md` as the gameplay source of truth. During implementation, follow the approved phase brief task by task, with review gates between tasks.

**Goal:** Establish a secure, recoverable, low-latency technical foundation for two simultaneous ECONOVA: CITY games without changing or inventing gameplay.

**Architecture:** Use a TypeScript modular monolith: three role-specific React/Vite clients connect to one authoritative Fastify/WebSocket server containing isolated per-room runtimes and a UI-independent deterministic game engine. Keep active state in memory for fast serialized transitions, durably record accepted transitions and recoverable snapshots in local PostgreSQL before acknowledging them, and generate recipient-specific state projections on the server.

**Tech Stack:** TypeScript, React, Vite, Tailwind CSS, restrained Framer Motion, Fastify, WebSockets, Zod, PostgreSQL, Vitest, Playwright.

**Spec:** `docs/GAME_DESIGN_SPEC.md`, `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/VISUAL_SYSTEM.md`, `docs/SECURITY.md`, `docs/PERFORMANCE.md`, `docs/TESTING.md`, and `docs/DECISIONS.md`. `docs/GAME_RULES.md` is retained as a superseded historical reference.

**Assessment date:** 2026-09-04  
**Scope:** Analysis and planning only. Production implementation has intentionally not started.

---

# 1. PROJECT UNDERSTANDING

## Product

ECONOVA: CITY is a browser-based, competitive economic strategy game for a live university event. Four to six players per room build business empires across a fictional city over eight rounds. The intended session lasts approximately 20–30 minutes and combines property acquisition/development, district demand, trades, Strategy Cards, Breaking News, City Council policies, Influence, Secret Objectives, and final scoring. It must be easy to enter, strategically meaningful, social, visually impressive, fair, and reliable.

The software is not meant to replace face-to-face negotiation. It automates state, validation, calculations, timing where defined, synchronization, information visibility, and presentation; players supply negotiation, strategy, risk-taking, and social interaction.

## Users and interfaces

1. **Players** use phone browsers. Their interface shows their identity, resources, holdings, legal actions, cards, Secret Objective, pending decisions/trades, connection state, and the public city context. It must be touch-first, portrait-first, fast, and clear.
2. **Spectators** primarily watch a room-specific projector. It shows the public city, round, phase, turn, properties, public ownership/development, demand, public events/policies/scores, major transitions, and results. It must never show unrevealed private information.
3. **Administrators/game masters** use a privileged operational interface to create/configure rooms, pair projectors, manage players, start/pause/resume/end/reset games, monitor connections and errors, assist reconnects, and invoke narrowly defined emergency operations.

## Two-room model

The live event runs two independent games concurrently, each with 4–6 players and one projector. A single application deployment may host both, but Room A and Room B must have independent game state, players, sessions, connections, projections, lifecycle, events, audit history, and recovery. Static read-only game configuration and process infrastructure may be shared. No room-scoped data or operation may cross the boundary.

## Information visibility

- **Public:** player names, public ownership, public development levels, district demand, round, turn, current public event/policy, allowed public score information, announcements, and final results.
- **Player-private:** Secret Objective, private cards, unrevealed decisions/votes, player-private trade information, and any other data the rules designate private.
- **Admin:** operational/diagnostic state and the private information explicitly needed to manage a game. Admin access is privileged, scoped, logged, and minimized.

The full authoritative state is never a general-purpose client payload. The server creates a public projection, a player-specific projection for each player, and a permission-filtered admin projection.

## Server responsibility

The server controls player identity, room membership, game membership, permissions, credits, Influence, property ownership and levels, cards, objectives, votes, trades, rounds, turns, phases, random outcomes, events, policies, scoring, final ranking, and the legality and order of state transitions. Clients submit intent, not results.

## Frontend responsibility

The frontends render authoritative projections, collect intent, show submitting/accepted/rejected states, manage local navigation/input/animation state, display connection/recovery status, and trigger presentation from authoritative events. They may preview information but cannot decide authoritative outcomes.

## Core technical challenges

- Preserving one coherent authoritative state under duplicate, stale, simultaneous, delayed, retried, and malicious requests.
- Enforcing absolute room isolation and recipient-specific privacy at every API, WebSocket, persistence, projection, log, and cache boundary.
- Reconnecting players/projectors without duplicating identities, actions, resources, cards, votes, or trades.
- Persisting enough state for process recovery without turning the database into gameplay logic or a realtime bus.
- Driving attractive projector animations from events while keeping state independent of animation timing.
- Operating on imperfect Wi-Fi and ordinary phones/projector hardware with a simple event-day startup and recovery procedure.
- Keeping three AI agents from changing contracts, rules, migrations, design tokens, or shared configuration concurrently.

## Event-day reliability requirements

The game must tolerate refreshes, browser crashes, temporary disconnects, reconnect bursts, repeated taps, projector restarts, malformed inputs, an operator mistake, and a game-server process restart. A failure in one room must not corrupt the other. The release must be tested on the actual network, projectors, phones, and operator machine; a known-good offline build, recoverable database state, startup instructions, and backup equipment/build must exist.

## Explicitly unspecified product/game details

The documents deliberately forbid inventing undefined values. The following are currently **UNSPECIFIED** or lack their referenced canonical configuration:

- starting City Credits and Influence;
- player/seat assignment, first-player selection, and initial turn order;
- exact actions allowed per turn, action limits, pass/end-turn requirements, and timers;
- income/payment cadence and every authoritative economic formula;
- the 16-property canonical catalog and all purchase, base, development, maximum-level, and strategic values;
- Strategy Card catalog, acquisition/dealing rules, timing, effects, targets, and usage limits;
- Breaking News catalog, selection schedule, effects, and duration;
- Secret Objective catalog, assignment method, bonuses, and reveal details;
- policy catalog, proposal selection, vote weighting/use of Influence, tie resolution, and effect duration;
- exact tradeable assets, trade expiry/cancellation rules, and whether asset selling exists;
- final-scoring numerical formula, district bonuses, card modifiers, objective rewards, and double-counting rules;
- exact behavior when the active player disconnects or times out;
- exact in-game score visibility before final reveal;
- exact player/projector/admin credential and pairing UX;
- event network, host OS, router, certificate, backup-machine, and projector details;
- exact visual tokens, typeface, district/player palette, map geometry, and production asset set.

# 2. CURRENT REPOSITORY STATE

## Inventory before this assessment artifact

The repository contained only 13 files:

| Area | Files | State |
|---|---|---|
| Root | `AGENTS.md`, `README.md` | Present; requirements/instructions only |
| Product/technical docs | `docs/ARCHITECTURE.md`, `DECISIONS.md`, `GAME_RULES.md`, `PERFORMANCE.md`, `PRODUCT.md`, `SECURITY.md`, `TESTING.md`, `VISUAL_SYSTEM.md` | Present and extensive |
| Agent coordination | `agent/TASKS.md`, `STATUS.md`, `REVIEW.md`, `HANDOFF.md` | Present but zero bytes |

There are no application directories, source files, package manifests, dependency lockfiles, build scripts, tests, assets, migrations, Docker files, CI configuration, `.env.example`, or runtime environment configuration. No frontend, backend, game engine, database, WebSocket layer, or test harness has been initialized.

## Git state

The workspace is **not a Git repository** (`git status` reports “not a git repository”). Therefore there is no branch, commit history, tracked/untracked distinction, or Git diff from which to infer existing changes. Git initialization and an initial documentation baseline commit are required before multi-agent implementation.

## Documentation integrity findings

The source documents are substantial and broadly aligned, but the Markdown is structurally damaged by unclosed code fences:

| File | Unclosed fence starts at line |
|---|---:|
| `AGENTS.md` | 1150 |
| `README.md` | 36 |
| `docs/GAME_RULES.md` | 269 |
| `docs/PERFORMANCE.md` | 215 |
| `docs/PRODUCT.md` | 257 |
| `docs/SECURITY.md` | 108 |
| `docs/TESTING.md` | 176 |
| `docs/VISUAL_SYSTEM.md` | 763 |

Consequently, most later numbered sections render as code rather than headings. `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` have balanced fences. This does not erase the raw requirements, but it makes navigation, automated indexing, review, and agent comprehension unreliable and should be repaired as a non-semantic Phase 0 change after approval.

## Readiness summary

- The product direction, architecture principles, security principles, performance targets, test expectations, and agent rules are documented.
- The implementation is completely absent.
- The game specification defines the systems and invariants but not the canonical content/economy needed to implement them.
- The visual specification defines direction and behavior but not final executable design tokens/assets.
- The agent communication files contain no ownership, status, review, or handoff information.

# 3. REQUIREMENTS ANALYSIS

“Supported” below means supported by the repository as it exists now, not merely mentioned in a document.

## A. PRODUCT REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Live university-event strategy game, 20–30 minutes | `PRODUCT` §§1, 3, 10, 46; `GAME_RULES` §4 | Critical | Fast onboarding, bounded session lifecycle, deterministic completion | Specified only / Yes |
| 4–6 players per room | `PRODUCT` §8; `GAME_RULES` §3 | Critical | Capacity validation and layouts for 4–6 | Specified only / Yes |
| Two concurrent independent rooms | `PRODUCT` §§3, 7; Decision 004 | Critical | Per-room aggregate, session binding, projections, tests | Specified only / Yes |
| Separate player, projector, and admin experiences | `PRODUCT` §§4–6; Decision 009 | Critical | Separate bundles/routes and data contracts | Specified only / Yes |
| Browser-based player experience; no mandatory native install/account | `PRODUCT` §§5, 28; `README` §§4, 17 | High | Responsive web client and lightweight session issuance | Specified only / Yes |
| Face-to-face negotiation remains central | `PRODUCT` §12; `GAME_RULES` §§34, 39 | High | Transaction UI, no chat platform | Specified only / Yes |
| No real-money economy and no permanent elimination | `PRODUCT` §§29–30; `GAME_RULES` §§6, 45, 66 | Critical | Enforced engine invariants and copy | Specified only / Yes |
| Clear spectator experience and visible city change | `PRODUCT` §§17, 18, 31 | High | Public projector projection and event-driven presentation | Specified only / Yes |

## B. GAMEPLAY REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Eight rounds, 16 properties, four districts | `GAME_RULES` §§7–10, 41, 84 | Critical | Versioned canonical content and phase machine | Partly specified; values absent / Yes, blocked on content |
| One owner per property; atomic purchase | `GAME_RULES` §§11–13 | Critical | Serialized transition and unique ownership invariant | Specified only / Yes |
| Owner-only bounded development | `GAME_RULES` §§14–15 | Critical | Server validation against content/config and balance | Rule shape specified; values absent / Yes |
| District demand ranges from −2 to +2 | `GAME_RULES` §§16–19 | Critical | Centralized demand/value calculation and bound tests | Scale specified; formula absent / Yes, blocked |
| Server-selected events with deterministic applied effects | `GAME_RULES` §§20–22 | Critical | Injected RNG, recorded outcome/effect, no client randomness | Lifecycle specified; catalog/timing absent / Yes, blocked |
| Player-owned private Strategy Cards | `GAME_RULES` §§23–25 | Critical | Instance IDs, private projection, atomic consumption | Lifecycle specified; catalog/deal rules absent / Yes, blocked |
| One private Secret Objective per player | `GAME_RULES` §§26–28 | Critical | Private assignment and server scoring | Concept specified; catalog/bonuses absent / Yes, blocked |
| City Council after designated rounds; private voting | `GAME_RULES` §§29–33 | Critical | Voting substate, one vote/player, locked reveal | Rounds specified; sequencing/vote math/policies absent / Yes, blocked |
| Explicit, revalidated, atomic trades | `GAME_RULES` §§34–38 | Critical | Server lifecycle, snapshot terms, expiry/version, all-or-nothing transition | Lifecycle specified; tradable set/expiry absent / Yes, blocked |
| Server-owned phase/turn/round progression | `GAME_RULES` §§40–44 | Critical | Finite-state machine and command allowlist | Concept specified; exact action cadence absent / Yes, blocked |
| Non-negative credits | `GAME_RULES` §§46–47 | Critical | Integer arithmetic and post-transition invariant | Specified only / Yes |
| Final score and deterministic tie-breaker after Round 8 | `GAME_RULES` §§59–62 | Critical | Server scoring breakdown and final lock | Tie-break order specified; formulas absent / Yes, blocked |

## C. TECHNICAL REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Single server authority and UI-independent engine | `ARCHITECTURE` §§4, 10–12, 53; Decisions 002, 012 | Critical | Pure engine behind application/transport layer | No / Yes |
| TypeScript/React/Vite clients; Node/Fastify server | `ARCHITECTURE` §5; Decision 041 | High | Workspace with strict TS and separate builds | No / Yes |
| WebSockets for realtime gameplay | `ARCHITECTURE` §§22–24; Decision 003 | Critical | Authenticated connection registry and protocol | No / Yes |
| Zod runtime contracts shared with TypeScript | `ARCHITECTURE` §§52, 67–70; Decision 041 | Critical | Discriminated schemas at every external boundary | No / Yes |
| PostgreSQL for persistence | `ARCHITECTURE` §§30–32; Decision 041 | High | Migrations, transactional snapshots/events, recovery | No / Yes |
| Versioned state and idempotent commands | `ARCHITECTURE` §§20–21 | Critical | `actionId`, `expectedStateVersion`, stored receipts | No / Yes |
| Clear frontend server/UI/animation state separation | `ARCHITECTURE` §§35–39 | High | Typed store; events drive presentation only | No / Yes |
| Simple LAN-first modular architecture | `ARCHITECTURE` §§28–29, 55–59; Decisions 001, 005, 025 | Critical | One deployable server, no distributed infrastructure | No / Yes |

## D. SECURITY REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Treat every client/API/WS message as hostile | `SECURITY` §§1–2, 8–10, 28–31 | Critical | Schema validation, limits, auth, authorization before engine | No / Yes |
| Server-recognized player/room/permission session | `SECURITY` §§3–6, 36 | Critical | Opaque unforgeable session bound server-side | Concept only / Yes; mechanism decision required |
| Absolute room isolation | `SECURITY` §§5–6, 62, 70–72 | Critical | Room-scoped guards, storage keys, registries, broadcasts | No / Yes |
| Private information excluded from unauthorized payloads | `SECURITY` §§7, 19, 51–53 | Critical | Whitelist projection functions and raw-frame tests | No / Yes |
| Atomicity, duplicate and replay protection | `SECURITY` §§11–14, 20–21, 57–59 | Critical | Per-room serialization, unique accepted-action record, state version | No / Yes |
| Separate server-side admin authorization | `SECURITY` §§26–27, 40, 56 | Critical | Separate role/session, scoped capabilities, re-confirmation | No / Yes |
| Input, rate, size, XSS, URL, and dependency controls | `SECURITY` §§29–31, 44–50 | High | Bounded parsing, token buckets, safe rendering, CSP | No / Yes |
| Secrets and database access remain server-side | `SECURITY` §§38–43 | Critical | Environment secrets, least privilege, parameterized queries | No / Yes |

## E. PERFORMANCE REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Normal action response <100 ms, preferred <50 ms on LAN | `PERFORMANCE` §3.1 | High | In-process engine and local DB; measure percentiles | No / Yes |
| WS RTT preferred <50 ms, acceptable <100 ms | `PERFORMANCE` §3.2 | High | Persistent same-LAN connections, compact payloads | No / Yes |
| Player load preferred <2 s/acceptable <4 s; projector <3 s | `PERFORMANCE` §§3.3–3.4 | High | Separate bundles, critical-first loading, optimized assets | No / Yes |
| 60 FPS target; 30 FPS minimum during normal gameplay | `PERFORMANCE` §3.5 | High | DOM/SVG, transform/opacity animation, actual-device profiling | No / Yes |
| Projector optimized for 1920×1080 without dedicated GPU | `PERFORMANCE` §3.6 | High | Fixed composition with responsive fallback | No / Yes |
| Two rooms + 8–12 phones + 2 projectors + admin | `PERFORMANCE` §§2, 38 | Critical | Test realistic and above-expected concurrency | No / Yes |
| Bounded memory, timers, handlers, events, and logs | `PERFORMANCE` §§18, 28, 33–35 | High | Lifecycle cleanup and soak tests | No / Yes |
| Core gameplay independent of internet/cloud services | `PERFORMANCE` §§4, 45 | Critical | Local assets, auth, database, and server | No / Yes |

## F. VISUAL/UX REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Original premium strategy-game identity, not dashboard/Monopoly/casino | `VISUAL_SYSTEM` §§2, 4, 67–68 | High | Shared tokens/components and controlled art direction | Direction only / Yes |
| City map is the public centerpiece | `VISUAL_SYSTEM` §§16–23 | High | Readable 2D/2.5D SVG map with property/demand/owner layers | Direction only / Yes |
| Projector is public, 16:9, distance-readable | `VISUAL_SYSTEM` §§38–40 | Critical | Purpose-built projector layout and physical QA | Direction only / Yes |
| Player is mobile/portrait/touch-first | `VISUAL_SYSTEM` §§24–31, 41–43 | Critical | Mobile hierarchy, large controls, short flows | Direction only / Yes |
| UI distinguishes submitting, accepted, and rejected | `VISUAL_SYSTEM` §§44–47, 63–65 | Critical | Action receipt state and typed errors | Direction only / Yes |
| Animation is event-driven, reusable, reduced-motion aware | `VISUAL_SYSTEM` §§49–51, 63–66 | High | Motion tokens and authoritative event queue | Direction only / Yes |
| Common components and centralized design tokens | `VISUAL_SYSTEM` §§69–72 | High | Shared UI package and ownership gate | Concept only; exact tokens absent / Yes |
| Visual/browser/physical projector QA | `VISUAL_SYSTEM` §§73–78 | High | Screenshot baselines, viewport/device/performance checks | No / Yes |

## G. EVENT-DAY OPERATIONAL REQUIREMENTS

| Requirement | Source | Importance | Technical implication | Current support / implementation required |
|---|---|---|---|---|
| Non-developer operator can start and understand the system | `ARCHITECTURE` §57; `PRODUCT` §38 | Critical | One startup command/script and admin health view | No / Yes |
| Player/projector refresh and reconnect preserve state | `PRODUCT` §§22, 37; `SECURITY` §§53–55 | Critical | Persisted sessions/snapshot and idempotency | No / Yes |
| Process recovery does not require manual state reconstruction | `ARCHITECTURE` §58; `PERFORMANCE` §47 | Critical | Durable accepted transitions and restart loader | No / Yes |
| Known-good build, DB state, offline copy, fallback procedure | `ARCHITECTURE` §58 | Critical | Release artifact, backups, checksums, restore drill | No / Yes |
| Actual network/hardware dress rehearsal | `TESTING` §§52–56; Decision 031 | Critical | Full two-room rehearsal and signed release record | No / Yes |
| Feature freeze before event | `ARCHITECTURE` §89; Decisions 017, 030 | Critical | Release branch and only critical/reliability fixes | No / Yes |

# 4. DOCUMENTATION CONFLICTS

## Conflict 1 — market/event ordering

**CONFLICT:** The product progression places market/event changes after player actions and before the next round, while the authoritative game phase sequence places the event/market update before player actions.  
**DOCUMENT A:** `docs/PRODUCT.md` §9 (`ROUND → PLAYER/GAME ACTIONS → MARKET/EVENT CHANGES → NEXT ROUND`).  
**DOCUMENT B:** `docs/GAME_RULES.md` §40 (`ROUND → EVENT/MARKET UPDATE → PLAYER ACTIONS → ... → ROUND RESOLUTION → NEXT ROUND`) and §73 (market/Breaking News placement around “NEXT ROUND”).  
**WHY IT MATTERS:** Players could make purchases/development under different demand/event conditions depending on interpretation; income, legality, projections, animations, and tests would diverge.  
**RECOMMENDED RESOLUTION:** Product owner confirms one canonical transition order. Recommended model: a round starts, its event/market change is resolved and broadcast, players act under that state, any applicable Council resolves at the explicitly chosen boundary, then the round closes. Update all three diagrams together before engine work.

## Conflict 2 — City Council boundary

**CONFLICT:** Council is said to occur “after Round 3” and “after Round 6,” but the phase diagram places Council before round resolution.  
**DOCUMENT A:** `docs/GAME_RULES.md` §29.  
**DOCUMENT B:** `docs/GAME_RULES.md` §40.  
**WHY IT MATTERS:** The policy could affect Round 3/6 resolution or only the following round, changing economic outcomes, legal actions, UI timing, and scoring.  
**RECOMMENDED RESOLUTION:** Define Council as a named subphase with exact entry/exit semantics. Recommended: finish normal actions for Round 3/6, enter Council, resolve policy, then execute the documented round-resolution step; explicitly state whether that policy affects the just-completed resolution or begins with the next round.

## Conflict 3 — selling is presented as a strategy but has no legal rule

**CONFLICT:** Product strategy examples ask players whether to “hold or sell,” while the game rules state that selling is not permitted automatically because no sale mechanic/value is defined.  
**DOCUMENT A:** `docs/PRODUCT.md` §11 (and `GAME_RULES` §46 conditionally lists selling as an alternative).  
**DOCUMENT B:** `docs/GAME_RULES.md` §48.  
**WHY IT MATTERS:** Selling changes financial recovery, property availability, balance, scoring, UI actions, validation, and test cases.  
**RECOMMENDED RESOLUTION:** For the initial release, remove selling from expected strategy unless the product owner supplies a complete sale rule. Recommended simplest release: no bank sale action; property transfer occurs only through explicitly permitted trades.

## Cross-document review result

No confirmed contradiction was found for player count (4–6), room count (two), game length (20–30 minutes), total rounds (eight), server authority, private/public separation, LAN-first deployment, core technology direction, or 1920×1080 projector target. The following are gaps rather than contradictions: authentication mechanism, persistence recovery objective, exact game configurations/formulas, exact visual tokens, and actual event hardware/network.

# 5. RECOMMENDED PRODUCTION ARCHITECTURE

## Recommendation

Adopt a **single-deployment modular monolith** with clear package boundaries:

```text
Player SPA ─────┐
Projector SPA ──┼── HTTP + authenticated WebSocket ── Fastify application
Admin SPA ──────┘                                      │
                                                       ├─ Sessions / authorization
                                                       ├─ Room manager
                                                       ├─ Per-room command queues
                                                       ├─ Deterministic game engine
                                                       ├─ Projection layer
                                                       ├─ Persistence adapter
                                                       └─ Structured logging/health
                                                                  │
                                                         Local PostgreSQL
```

One Node.js process is sufficient for the expected load. Logical isolation is enforced inside that process; deployment, logging, recovery, and debugging remain simple. PostgreSQL runs locally on the controlled event machine/network. The server can serve the three built static clients so event-day operation needs one origin and one application endpoint.

## Technology evaluation

| Area | Current option | Recommendation | Why / benefit | Tradeoff / development impact |
|---|---|---|---|---|
| Language | TypeScript | Keep; strict mode across all packages | Shared contracts and fewer integration mistakes | Requires disciplined parsing at runtime |
| Frontend | React + Vite | Keep; three separate apps sharing packages | Mature, fast builds, separate bundles/ownership | Three entry points/configurations |
| Styling | Tailwind CSS | Keep with semantic tokens, not ad-hoc utility values | Fast consistent UI work | Requires token governance |
| Motion | Framer Motion where appropriate | Keep only for bounded UI transitions | Reusable orchestration without custom loops | Bundle cost; lazy-load projector-only cinematic code where useful |
| Backend | Fastify | Keep | Typed plugins, validation hooks, good performance, built-in Pino integration | Plugin boundaries must stay simple |
| Realtime | WebSockets | Keep | Required low-latency server push | Reconnect, heartbeat, backpressure, and schema work are mandatory |
| Validation | Zod | Keep and colocate schemas/types in `packages/contracts` | Runtime validation and inferred TS types | Avoid duplicate hand-written interface/schema definitions |
| Database | PostgreSQL | Keep | Reliable transactions, constraints, audit/recovery | Local service must be packaged and rehearsed |
| Active state | Unspecified hybrid | Per-room in-memory snapshot + durable transition transaction | Fast deterministic engine with process recovery | A local DB commit is on the accepted-action path |
| Rendering | DOM/CSS/SVG, optional 3D | DOM/CSS + SVG primary; no initial Three.js/R3F | Best reliability/readability for 16 properties | Less free-camera spectacle, substantially lower risk |
| Repository | Conceptual multi-app | npm workspaces modular monorepo | Built-in package manager, single lockfile, agent boundaries | Root configuration is a coordination hotspot |

No core preferred technology should be changed. Exact dependency versions are **UNSPECIFIED** and should be selected/pinned during repository foundation with an offline install/rebuild check.

## Explicitly rejected infrastructure for the initial release

- No microservices: they add deployment/network failure modes without useful scale benefit.
- No Redis: two in-process room runtimes do not need distributed locks, pub/sub, or cache coordination.
- No message queue: the per-room serialized command queue is in-process and bounded.
- No Kubernetes: one controlled event deployment does not justify orchestration complexity.
- No cloud dependency for core play: internet loss must not stop a game.
- No multiple backend services: separation is through modules/interfaces, not processes.
- No event-sourcing framework: record domain events and snapshots, but keep recovery straightforward.

## Backend modules

- **Transport:** REST bootstrap/admin endpoints and WebSocket protocol only.
- **Identity/session:** creates and verifies opaque sessions; binds role, subject, room, and permissions.
- **Room manager:** owns a map of room runtimes and lifecycle; never gameplay rules.
- **Command application service:** validates context, serializes per room, calls engine, persists, swaps state, and broadcasts.
- **Game engine:** pure rule validation and state transition.
- **Projection:** public/player/admin serializers and projected events.
- **Persistence:** migrations, transactions, session records, snapshots/events/results/audit.
- **Operations:** health, readiness, structured logs, startup/recovery, metrics adequate for the event.

# 6. GAME ENGINE ARCHITECTURE

## Aggregate and state ownership

The engine operates on one `GameState` aggregate at a time. It never receives a WebSocket connection, cookie, database client, React component, timer handle, or arbitrary JSON. Static rules/content are supplied as a versioned immutable `GameContent` configuration.

| State area | Technical representation and ownership |
|---|---|
| Game state | Serializable aggregate containing `gameId`, `roomId`, `rulesetVersion`, lifecycle status, `stateVersion`, and all authoritative substate |
| Player state | Stable player ID/seat, display name, credits, Influence, property/card/objective references, score state, and gameplay status; visibility decided outside the engine |
| Room state | Server-owned wrapper containing room metadata, game aggregate, command queue, connections, sessions, lifecycle, and health; only the game aggregate enters the engine |
| Turn state | Current player, turn sequence, action window/permissions, and completion marker; timers/deadlines only after rules define them |
| Round state | Current round (1–8), phase/subphase, completed requirements, and transition markers |
| Property state | Canonical property ID reference, owner ID or null, development level, and only mutable modifiers required by rules |
| Resource state | Server-owned integer credits and Influence; never floating-point money and never below allowed bounds |
| Card state | Unique card instance ID, definition ID, owner, zone/status, use count/consumed marker, and private/public visibility state |
| Event state | Active definition ID, resolved server-chosen outcome, duration/scope, and history reference; random choice recorded, never rerolled on recovery |
| Policy state | Council session ID, eligible options/voters, private submitted votes, resolved option, active effect, and history |
| Scoring state | Server-derived component breakdown and finalization flag; private/public exposure follows the rules and final reveal transition |

## Pure transition contract

Conceptually:

```text
decide(currentState, authenticatedCommand, gameContent, randomness)
  → RuleViolation
  OR
  → { nextState, domainEvents }
```

The engine must be deterministic for the same state, command, content, and supplied random result. Production randomness uses the server's cryptographically secure RNG; tests inject a seeded provider. The chosen random definition/outcome is stored in the event/state before acknowledgement so restart cannot change it.

Every successful transition increments `stateVersion` exactly once, produces at least one typed domain event, and passes invariant checks. A failed command returns a stable rule-error code and no state/events.

## Action lifecycle

```text
CLIENT REQUEST
→ parse envelope and Zod schema
→ authenticate session
→ authorize role/capability
→ derive and verify room/game from session
→ enforce size/rate/idempotency guards
→ enqueue on that room's command queue
→ compare expected state version and revalidate current state
→ execute pure game engine transition
→ verify post-transition invariants
→ persist accepted action + event(s) + recoverable snapshot atomically
→ swap the in-memory room snapshot
→ store authoritative action receipt
→ project state/events for each recipient
→ broadcast
→ return/correlate action result
```

If parsing, authentication, authorization, version, rule validation, invariants, or persistence fails, the in-memory authoritative state is not advanced and no success is broadcast.

## Concurrency and integrity controls

- Each room has a FIFO promise queue/mutex. Commands in Room A serialize with Room A but can run concurrently with Room B.
- No asynchronous I/O occurs inside the pure engine transition.
- Accepted actions have a database uniqueness key such as `(game_id, actor_id, action_id)`.
- Repeating an accepted `actionId` returns the recorded receipt/current projection and never reapplies effects.
- `expectedStateVersion` rejects state-sensitive stale actions with `STALE_STATE`; the server includes the current version/resync instruction.
- Trades revalidate ownership/resources/phase at acceptance, not merely proposal.
- Votes have a uniqueness invariant `(game_id, council_session_id, player_id)`.
- Property ownership permits zero or one owner; development never exceeds config maximum; resources remain valid; phase/turn transitions follow an explicit graph.
- End-game and round-transition commands are idempotent and cannot advance twice.
- A post-transition invariant failure is a room-level critical error: do not publish the candidate state; safely pause the room and alert the admin.

## Canonical game content

All property definitions, cards, events, policies, objectives, formulas, and starting configuration belong in versioned, Zod-validated files under `packages/game-content`. The engine stores definition IDs plus mutable state. The content version is fixed when a game starts and recorded with the game, preventing a later deployment from silently changing an active or historical game.

This package cannot be completed until the product owner supplies the missing rules listed in Sections 20 and 23.

# 7. MULTIPLAYER / WEBSOCKET ARCHITECTURE

## Room and client bootstrap

1. An authenticated admin creates a room through HTTP. The server creates an internal UUID, human-friendly room code, room status, player slots/join policy, projector pairing credential, and empty room runtime.
2. A player enters the room code and approved join credential/process. The server validates capacity/status and issues an opaque server-recognized session bound to exactly one player and room.
3. A projector uses a one-time admin-generated pairing code/QR and receives a room-scoped projector session that can only read public data.
4. An admin session has explicit capabilities and room scope; cross-room management is allowed only because the server assigned that privilege.
5. Each browser opens a same-origin WebSocket. Upgrade middleware validates origin and session before binding immutable connection context `{connectionId, role, subjectId, roomId, permissions}`.

The connection is never allowed to subscribe to an arbitrary room supplied later in a message.

## Protocol

Client command envelope:

```text
protocolVersion
type
requestId
actionId (for state changes)
expectedStateVersion (where state-sensitive)
payload
```

Server envelope:

```text
protocolVersion
type
requestId (for correlated result)
roomId
stateVersion
serverTime
payload
```

Use discriminated Zod unions. Reject unknown message types, malformed JSON, oversized payloads, invalid enums/IDs/ranges, and unknown fields where appropriate before application code. Machine-readable error codes are stable; player messages are short and non-technical.

## Synchronization and broadcasting

- On connect/reconnect, send a complete authorized snapshot at one `stateVersion`.
- For this small game, prefer a complete compact recipient projection after each accepted transition plus a small list of domain-event cues. This avoids client-side patch-merge corruption and remains inexpensive for 16 properties and at most 12 players.
- Measure payloads. Introduce typed deltas only if the measured state size/update rate violates budgets; deltas must carry `baseVersion` and retain snapshot resync.
- Domain events drive notifications/animations; projections state what is true. Clients never reconstruct authoritative state solely from events.
- A version gap, invalid base version, tab resume, or explicit resync request causes a fresh projection snapshot.
- Public projection may be computed once per room/version. Player projections are computed/scoped per player/version. Never share private cached payloads across players.

## Connection lifecycle

- Server ping/pong heartbeat and last-seen tracking remove stale sockets after tested configurable thresholds.
- Newest player connection becomes the active command socket; the previous socket is closed or made read-only to prevent stale-tab actions.
- Disconnect changes connection status only; gameplay behavior for a disconnected active player remains **UNSPECIFIED** until the rules define it.
- Reconnect authenticates the existing session, rebinds the existing player, sends the current authorized snapshot, and does not replay commands.
- Apply per-IP and per-session token-bucket rate limits, message-size limits, and buffered-output/backpressure limits. Exact values are technical configuration selected through stress tests, not gameplay rules.
- A slow projector/player is disconnected and resynchronized rather than allowed to grow unbounded buffers.

# 8. ROOM ISOLATION

Room isolation is enforced redundantly at every layer:

1. **Identity:** a session record has one immutable `roomId`; the room code is discovery, not authority.
2. **Connection:** the WebSocket is registered directly in that room runtime after authenticated upgrade; there is no client-controlled “join topic” operation.
3. **Commands:** application context derives actor/room from the session. If a payload contains a room/game/object ID, it must match context and the referenced entity must belong to the same room.
4. **Runtime:** `RoomManager` stores independent `RoomRuntime` objects. No global mutable `GameState` exists.
5. **Serialization:** each room has an independent command queue and state version.
6. **Broadcast:** recipients come from the current room's connection sets; global broadcast helpers are forbidden for game data.
7. **Projection:** every projector/player/admin projection receives an explicit room aggregate and recipient identity/capabilities.
8. **Persistence:** all game-owned records carry `room_id` and `game_id`; foreign/composite constraints prevent cross-game references. Queries always scope by the authenticated context, not URL alone.
9. **Cache/logging:** public cache keys include room/version; private cache keys include room/player/version. Logs include room/game correlation without private payloads.
10. **Failure boundary:** a caught exception or invariant failure pauses/quarantines one room runtime; it does not tear down the process or mutate the other room.
11. **Tests:** every room-scoped endpoint/message/action is exercised with valid Room A credentials against Room B identifiers, and raw frames are inspected for leakage.

Unknown-room and forbidden-room errors should avoid revealing sensitive room details. Admins who manage both rooms receive that scope from a server-side capability record, not an `isAdmin` client flag.

# 9. PRIVATE INFORMATION MODEL

## Projection boundary

```text
FULL AUTHORITATIVE GAME STATE
             │
             ├── projectPublic(state)
             │      └── projector + public portion of player/admin clients
             ├── projectPlayer(state, authenticatedPlayerId)
             │      └── public state + only that player's private state
             └── projectAdmin(state, adminCapabilities)
                    └── operational/full details allowed by role and action
```

Projection functions are explicit whitelist serializers with distinct output schemas. They do not clone the full state and delete a few known fields; that pattern leaks when a new private field is added. Full engine state types are server-only and must not be imported into frontend bundles.

## Visibility rules

- Secret Objectives and private cards go only to the owning player and authorized admin view.
- Votes remain private until the state machine performs the official reveal/resolution.
- Trade details go only to involved players and authorized admins unless/when the rules designate a public result.
- Projector messages use only the public schema, including error and event messages.
- Admin overview should default to operational data. Access to player-private details should be deliberate and auditable.
- Final reveal changes visibility through an authoritative phase transition; the client does not decide that hidden data is now public.

## Projected events

Internal events may contain details that cannot be broadcast. Every event passes through an audience resolver that emits zero or more public, player-specific, and admin event representations. A generic `broadcast(domainEvent)` API should not exist. Tests serialize every projection and search raw payloads for forbidden fields/other-player fixtures.

# 10. SECURITY ARCHITECTURE

## Identity and session design

- Use opaque high-entropy random session tokens. Store only token hashes server-side, with subject, role, room, permissions, issued/expiry/revocation data.
- Deliver browser sessions in same-origin `HttpOnly`, `SameSite=Strict` cookies; mark `Secure` when HTTPS/WSS is available. Do not store an authoritative session token or role in localStorage.
- Validate WebSocket `Origin`, cookie/session, role, room, expiry, and revocation during upgrade and again for privileged operations.
- A room code is not proof of identity. Use a one-time seat credential/admin approval process for players and a one-time pairing credential for projectors.
- Admin authentication is separate and stronger; secrets come from environment/runtime provisioning, never the bundle, docs, Git, screenshots, or logs. Sensitive/destructive commands require explicit target, confirmation, and audit.
- Persist sessions needed for process-restart reconnect; invalidate all room/player sessions on reset according to the approved reset flow.

## Threat-to-control mapping

| Attack | Architectural control |
|---|---|
| Modify credits/Influence/score in browser | Client never submits authoritative values; engine derives integer changes from current state/config and checks invariants |
| Modify ownership/development | Client submits property intent/ID only; engine verifies owner/availability/resources/phase/turn/max level within serialized room transition |
| Forge/create/reuse cards | Server-owned card instance IDs and zones; ownership/timing/effect validated; consumption and effect are one atomic transition |
| Change turn/round/phase | Only engine state-machine commands from eligible actor/admin capability; expected version and transition graph enforced |
| Choose random outcome | Server RNG chooses; chosen result recorded before acknowledgement; clients receive projection only |
| Replay/duplicate action | High-entropy `actionId`, durable uniqueness for accepted state changes, cached receipt, per-room queue, frontend loading state as UX only |
| Simultaneous conflict | FIFO queue per room, validation against latest state, transaction before state swap; exactly one eligible command succeeds |
| Impersonate player | Unpredictable server session bound to player/room; client ID/display name ignored for authority |
| Access another player's private data | Whitelist projection using authenticated player ID; no endpoint accepts “player to view” without capability |
| Access another room | Immutable session/connection room scope, room-scoped repository queries and registries, cross-room test suite |
| Invoke admin functions | Separate admin session and capability middleware on every route/message; hidden buttons provide no authority |
| Manipulate WS message/malformed input | Max-payload enforcement before JSON parse, strict Zod union, field/range/array/string bounds, controlled errors |
| Exploit reconnect/refresh | Existing session rebinds existing player; accepted action IDs persist; newest command socket policy; full snapshot resync |
| Manipulate localStorage/frontend state | Local state is presentation only and replaced by server snapshot; no trusted role/resources/room values live there |
| Call backend directly | HTTP and WS share the same authentication, authorization, validation, room, idempotency, and engine application services |

## Additional controls

- Same-origin deployment, restrictive CSP, safe React text rendering, no unsanitized `dangerouslySetInnerHTML`, bounded/normalized display names.
- Parameterized SQL, migration-only schema changes, least-privilege database user, credentials in environment variables.
- Per-session/IP connection/action/invalid-message limits and escalating temporary disconnect for abuse.
- Structured audit fields: timestamp, room/game, actor/session reference, action ID/type, accepted/rejected result, error code, prior/new version. Do not log tokens, card/objective content, votes, or other unnecessary private payloads.
- Production configuration disables debug mutation endpoints, test credentials/data, verbose private diagnostics, and source maps if they expose internals.
- Dependency lockfile, minimal dependency set, clean offline build, and audit before release.
- On database persistence failure, do not acknowledge or publish the candidate state; put the affected room in safe paused/error state and alert the admin.

# 11. PERFORMANCE ARCHITECTURE

## Documented targets

| Measure | Target |
|---|---|
| Normal player action response on LAN | <100 ms; preferred <50 ms |
| WebSocket round trip | preferred <50 ms; acceptable <100 ms; warning >200 ms |
| Player initial load | preferred <2 s; acceptable <4 s |
| Projector initial load | preferred <3 s |
| Animation | target 60 FPS; minimum acceptable 30 FPS during normal play |
| Projector | smooth at 1920×1080 without requiring dedicated GPU |
| Concurrency | 2 rooms, 8–12 phones, 2 projectors, 1 admin; test above expected load |

## Strategy

- Keep command evaluation in-process and synchronous/pure; serialize only within the affected room.
- Use a local pooled PostgreSQL connection and one small transaction per accepted transition. Database latency must be measured as part of action latency.
- Send one compact authorized projection per new version, not full server state or history; send static content once and reference IDs thereafter.
- Avoid WebSocket compression initially for small messages; enable only if payload measurement shows a benefit without latency/CPU cost.
- Use immutable hashed assets with long HTTP cache headers, precompressed where the hosting path supports it.
- Split player/projector/admin bundles so phones do not download projector/admin code. Lazy-load noncritical overlays/assets, never basic game state/actions.
- Use React state selectors and component isolation so a demand/property update does not rerender the whole application.
- Use CSS transforms/opacity and SVG attribute updates for animation. No continuous background loops when state is idle.
- Bound in-memory action receipts, event cues, logs, connection buffers, and historical UI data. Persist history and remove obsolete room runtime after completion/reset.
- Centralize server gameplay deadlines as absolute timestamps; clients display countdowns but do not determine expiry.

## Likely bottlenecks and mitigations

| Bottleneck | Mitigation |
|---|---|
| Wi-Fi jitter/reconnect burst | Backoff with jitter, full snapshot resync, idempotent commands, controlled connection rate |
| Projector animation/GPU load | SVG/DOM layers, event-triggered motion, reduced-effects mode, soak on actual projector machine |
| React rerender fan-out | Normalized projection store, selectors, memoized map layers, transient animation state outside server state |
| Repeated serialization/projection | Cache public projection by room/version; player projection by room/player/version; measure before optimizing |
| Database commit latency/failure | Local DB, short indexed transaction, no arbitrary queries inside engine, readiness/latency health, safe-pause on failure |
| Leaking timers/listeners/sockets | Central lifecycle ownership and 30+ minute repeated-session soak tests |
| Slow client backpressure | Buffered-byte ceiling; disconnect and snapshot-resync slow clients |

## LAN/local deployment evaluation

LAN-first deployment is preferable and already approved. It removes public-internet latency and third-party outages. It is safe only if the physical network is rehearsed: controlled router/access point, DHCP reservation/static server address, sufficient client isolation policy, no captive portal, tested phone-to-server reachability, power plan, and a documented HTTP/HTTPS decision. Cloud deployment may exist for development or contingency but must not be required for core play.

# 12. FRONTEND ARCHITECTURE

## Three applications

### Player client

Routes/states: join, reconnect, lobby, active game shell, property/action detail, trade proposal/confirmation, card use, Council vote, final results, and recoverable error/offline state. Normal actions stay close to the current-turn/dashboard context; no desktop-only assumptions.

### Projector client

Routes/states: pairing, lobby, public game board, public event/policy overlays, round/turn transitions, final scoring, results, and connection recovery. It has no gameplay command controls.

### Admin client

Routes/states: login, room list/create, room detail/lobby, connection/health view, start/pause/resume/end, reconnect assistance, audit/error view, and narrowly defined emergency operations. Destructive actions use explicit room/game targets and confirmations.

## Shared frontend layers

- `packages/contracts`: schemas/types/protocol/error codes; no gameplay implementation.
- `packages/ui`: design tokens and accessible reusable primitives; role apps compose them differently.
- A small shared realtime client handles connect/auth status, request correlation, versions, heartbeat status, backoff, snapshot replacement, and resync.
- Each app owns a typed external store separated into authoritative projection state, local UI/form state, and transient animation/event queue.
- Prefer React Context plus `useSyncExternalStore`/selector hooks over introducing Redux or another global-state dependency at foundation. Add a library only if measured complexity justifies it.
- REST bootstrap calls use typed fetch helpers. WebSockets handle gameplay commands/results/state/events.

## UX rules

- A command moves `idle → submitting → accepted/rejected`. Only accepted server state becomes final UI.
- Connection states are explicit: connecting, connected, degraded, reconnecting, offline. Never show an unexplained indefinite spinner.
- Errors map stable server codes to short actionable copy; normal players never see stack traces or database details.
- Player layouts are portrait/touch-first; projector is purpose-built 16:9; admin is responsive but operational rather than cinematic.
- Accessible labels, focus states, contrast, redundant non-color cues, large touch targets, and reduced-motion presentation are shared concerns.

# 13. VISUAL/RENDERING ARCHITECTURE

## Rendering choice

| Technology | Role | Decision |
|---|---|---|
| DOM/CSS | Text, panels, cards, controls, overlays, layout | Primary |
| SVG | City map, district/property shapes, owner markers, demand arrows/compact charts | Primary |
| Canvas | Optional bounded decorative particles or a proven SVG hotspot | Defer until profiling proves need |
| WebGL / Three.js / React Three Fiber | Full 3D city | Do not use for the initial architecture |

A stylized 2D/2.5D SVG city is the best fit for 16 properties: crisp at projector resolution, easy to label and test, accessible, animatable with transforms/opacity, and reliable on ordinary laptops/phones. The map uses stable geometry and separate semantic layers for district, property, owner, development, demand, selection, and event effects.

## Technical support for the visual system

- Centralize palette, typography, spacing, radii, surfaces, shadows, breakpoints, z-index, and motion timings as semantic CSS variables/Tailwind theme tokens.
- Player and district identity must use color plus marker shape/initial/pattern.
- Use one component vocabulary across apps, scaled/composed for different purposes.
- Map/property changes are driven by authoritative versioned state; animation cues come from projected domain events.
- Maintain one bounded animation queue per app. On resync/version gap, cancel stale animations and render the current state immediately.
- Use `prefers-reduced-motion` and a manual projector “reduced effects” control; information remains complete without motion/sound.
- Load the application shell, state, critical UI/font subset, then secondary illustrations/effects. No external asset/CDN dependency during play.
- Store optimized source assets centrally with licensing/provenance notes; emit hashed production assets.
- Define screenshot fixtures for lobby, active map, purchase/development, trade, event, Council, leaderboard, results, errors, reconnect, and admin.

The visual direction is strong, but exact colors, font, map geometry, district/player palettes, motion tokens, and production assets remain **UNSPECIFIED**. Antigravity should propose them after the product owner approves the architecture and game-content boundaries; Codex should ensure they stay within performance/security contracts.

# 14. DATABASE ARCHITECTURE

## Transient versus persistent

| Transient/hot runtime state | Persistent data |
|---|---|
| Per-room in-memory `GameState` snapshot | Room and game metadata/status/content version |
| Room command queue/mutex | Players/seats and server-side session token hashes |
| Active connection registry/heartbeat/backpressure | Latest recoverable game snapshot/version |
| Projection cache by version | Accepted action/domain-event audit with action uniqueness |
| Short-lived animation/event cues | Final results and score breakdowns |
| Bounded recent action-receipt cache | Admin/security audit records and required recovery data |

Static game content remains versioned source configuration initially, not admin-editable database content.

## High-level schema

- `rooms`: internal ID, public code/hash as appropriate, status, join policy, active game, timestamps.
- `games`: game/room IDs, status, content version, current state version, latest JSONB snapshot, start/end timestamps.
- `players`: stable ID, game/room, seat, display name, gameplay/connection status metadata.
- `sessions`: token hash, subject type/ID, role, room scope, permissions, expiry/revocation.
- `game_events`: game/room, sequence/version, action ID, actor reference, event type, safe authoritative payload, timestamp.
- `action_receipts`: accepted state-changing action uniqueness and compact authoritative outcome/reference.
- `game_results`: rank, final score, component breakdown, finalized version.
- `admin_audit`: actor, target room/game, operation, result, reason, timestamp.
- `schema_migrations`: controlled migration version.

Use foreign keys, uniqueness, checks, and indexes for room/game/version/action/session lookup. Never expose the database to browsers.

## Accepted transition transaction

Within the room queue:

1. Purely compute candidate next state/events.
2. Begin a short DB transaction.
3. Insert the unique accepted action receipt/event records.
4. Update the game's latest snapshot and expected previous version.
5. Commit.
6. Swap in-memory state and broadcast.

If uniqueness shows the action was already committed, load/return its receipt without replay. If the expected previous version update fails, treat it as a critical consistency error. If persistence fails, keep old in-memory state and safe-pause the affected room.

This is not a general event-sourced system: the latest snapshot is the normal recovery path; the append-only event/action history supports audit, diagnostics, and validation. Periodic external DB backups protect against machine/disk failure; their acceptable recovery-point objective requires product-owner/operations agreement.

# 15. RECOMMENDED PROJECT STRUCTURE

```text
/
├─ apps/
│  ├─ player/                 # private phone React/Vite app
│  ├─ projector/              # public 16:9 React/Vite app
│  ├─ admin/                  # privileged operator React/Vite app
│  └─ server/                 # Fastify HTTP/WS composition root
├─ packages/
│  ├─ contracts/              # Zod network/projection/error schemas + inferred types
│  ├─ game-content/           # approved versioned properties/cards/events/policies/objectives
│  ├─ game-engine/            # pure state, commands, rules, transitions, invariants, scoring
│  └─ ui/                     # tokens, primitives, icons, shared presentation components
├─ database/
│  ├─ migrations/             # ordered PostgreSQL migrations
│  └─ test-seeds/             # deterministic non-production test data
├─ tests/
│  ├─ integration/            # server/engine/database/API/WS
│  ├─ multiplayer/            # multi-client and two-room behavior
│  ├─ security/               # forged/raw/malformed/replay/private-state attacks
│  ├─ e2e/                    # Playwright player/projector/admin journeys
│  ├─ performance/            # latency, burst, soak, payload and memory harnesses
│  └─ visual/                 # screenshot baselines/fixtures
├─ assets/
│  ├─ source/                 # reviewed original assets and provenance
│  └─ optimized/              # production-ready shared outputs
├─ scripts/
│  ├─ dev/                    # local setup, reset, fixture helpers
│  ├─ event/                  # startup, health, room bootstrap, shutdown
│  └─ backup/                 # database backup/restore verification
├─ docs/                      # authoritative product/technical/operational documents
├─ agent/                     # task ownership, status, reviews, handoffs
├─ .github/workflows/         # CI when Git hosting is selected
├─ package.json               # npm workspaces and root commands
├─ package-lock.json          # one reproducible dependency lock
├─ tsconfig.base.json         # strict shared TypeScript settings
├─ eslint.config.*            # shared static checks
├─ .env.example               # safe placeholders only
└─ AGENTS.md
```

Keep app composition separate from packages. `game-engine` may depend on approved content types and pure utilities, never server/React/database. `server` may depend on engine/contracts/persistence. Clients depend only on contracts/UI and app-local code. The shared UI package contains no private/server/gameplay logic.

# 16. TESTING STRATEGY

## Independent systems

| System | Primary tests |
|---|---|
| Game engine | Fast deterministic Vitest unit tests for every rule, transition, invariant, boundary, score component, seeded random outcome |
| Game content | Schema validation, unique IDs, referential integrity, bounds, exhaustive definition-specific behavior |
| Projection layer | Golden/structural tests proving exact allowed fields and absence of other-player secrets |
| Session/authorization | Unit/integration capability matrix and token expiry/revocation/room binding |
| Room manager/command service | Integration tests for queue ordering, room fault isolation, state/version/persistence sequence |
| Persistence | Real PostgreSQL test database, migrations, constraints, transactions, restart recovery, rollback/failure tests |
| WebSocket protocol | Raw client integration tests for auth, schema, correlation, heartbeat, resync, backpressure, malformed/oversized frames |
| Frontends | Component tests for action/loading/error/connection states and browser E2E for real journeys |
| Visual system | Playwright screenshots plus human physical projector/mobile QA |

## Required suites

### Unit

- Valid and invalid purchase/development, exact resource effects, demand bounds, turn/phase/round transitions.
- Every card/event/policy/objective/scoring definition once canonical content exists.
- Trade state machine and final atomic calculation.
- No-negative-resource, one-owner, unique-card, no-actions-after-finish, and deterministic tie-break invariants.
- Property-based/seeded generated command sequences to assert invariants remain true after every step.

### Integration

- HTTP create/join/bootstrap/admin authorization.
- Command → engine → PostgreSQL commit → in-memory swap → projection → correlated result/broadcast.
- Forced DB error rolls back and does not publish state.
- Process restart loads the latest committed snapshot/version and accepted action IDs.
- Migration up/down policy as approved, clean test DB reset, parameterized queries.

### Multiplayer

- 2, 4, and 6 players; two 6-player rooms concurrently; two projectors and admin.
- Same-property `Promise.all` purchase: one success, one unchanged rejection.
- Same action ID repeated rapidly and after reconnect: one effect.
- Trade proposal invalidated by later spend: acceptance rejected without partial change.
- Simultaneous votes/turn completion/round transition: one valid transition per rule.
- Room A and Room B progress independently under concurrent actions and failures.

### Security

- Forged player/room/game/object IDs, altered credits/owner/level/card/score/Influence/turn/round/phase.
- Raw direct HTTP/WS admin calls from player session.
- Player A requests Player B private state and projector frames are searched for every secret fixture.
- Replay accepted commands, stale versions, duplicate votes/cards/trades/end-game operations.
- Missing/unknown/wrong-type/out-of-range/negative/huge values, unexpected fields, malformed JSON, oversized strings/arrays/frames.
- Origin/session/token expiry/revocation, reconnect as another identity, localStorage/cookie/UI manipulation.
- Rate/backpressure abuse leaves both rooms healthy.

### E2E

- Admin creates Room A/B; projectors pair; 4–6 players join; both games start.
- Perform a complete deterministic eight-round game including event, card, trade, Council, scoring, and winner reveal once rules exist.
- Refresh player/projector/admin during active play; reconnect to correct state/role/room.
- Rejected actions show no false success; lost connection shows recoverable status.
- Complete two rooms simultaneously and verify no raw network cross-leakage.

### Performance and soak

- Measure action response percentiles and WS RTT on event LAN.
- Burst above expected connections/messages/reconnects; ensure no corruption/loss of legitimate actions.
- Run repeated 30-minute sessions and room resets while measuring process/browser memory, handlers, timers, sockets, FPS, DB latency, and payload sizes.
- Projector at 1920×1080 on event hardware; player on representative Android devices and narrow viewport.

### Visual QA

- Screenshots for every major state, long names, large numbers, errors, disabled/loading/reconnect, reduced motion, and two room themes/players.
- Physical viewing-distance test for projector hierarchy/contrast/map ownership/demand.
- Touch-target, scroll, portrait, keyboard/focus, and color-independent cue checks.

## Release gate

Typecheck, lint, formatting check, unit, integration, multiplayer, security, E2E, production build, two-room test, reconnect test, performance/soak check, manual smoke, restore drill, and full hardware/network dress rehearsal must pass. No unresolved critical/high security or state-integrity issue may remain. Record commands, versions, results, device/network details, and release artifact checksum; never claim pass without evidence.

# 17. EVENT-DAY RELIABILITY

## Recommended startup procedure

1. Use the frozen, checksummed release on the primary and backup machine; disable automatic sleep/update/restart.
2. Start the controlled router/AP and confirm DHCP reservation/static server address, projector and phone reachability, and absence of captive-portal/client-isolation blockers.
3. Run one event startup script that validates production environment, free ports, DB service/version/migrations, writable backup/log paths, and required assets before starting the server.
4. Verify `/health/live` and authenticated/admin `/health/ready` (DB, migrations, WS subsystem, disk space, recovered room state).
5. Open the admin app, create/load Room A and Room B, and record join/pairing codes without logging secrets.
6. Pair Projector A and B, verify correct room labels/public state, and test from audience distance.
7. Join one test player in each room; perform a harmless controlled preflight action in a disposable test game, then reset cleanly.
8. Confirm reconnect, pause/resume, backup job, logs, backup machine/build, power/charging, and operator contact sheet.
9. Open real lobbies and start only after player/projector counts and room assignments are correct.

## Recovery behavior

| Failure | Expected recovery |
|---|---|
| Player refresh/browser crash | Cookie session reauthenticates; same player/room is rebound; full private projection sent; no command replay |
| Player Wi-Fi interruption | UI becomes reconnecting; exponential backoff with jitter; authoritative state continues according to approved disconnect rule |
| Projector crash | Game continues; reopen/pair session; receive full public snapshot; stale animations discarded |
| Admin tab crash | Games continue; admin reauthenticates and reloads operational state |
| Server process crash | Restart script verifies DB/migrations; load latest committed active snapshots; restore rooms in paused state; clients reconnect; admin verifies then resumes |
| Database unavailable | Reject new state changes without advancing memory, safe-pause affected room, keep read-only/current state visible, alert operator |
| One room invariant failure | Quarantine/pause that room, preserve snapshot/logs, keep other room operating |
| Primary machine failure | Move controlled release/config and latest verified backup to prepared backup machine; use documented fixed network identity/rejoin procedure |

## Operations

- Health: separate liveness from readiness; admin shows room phase/version, DB status, client counts/last seen, reconnects, last accepted action, and critical errors without secret payloads.
- Logging: structured, bounded, local, room/game/action correlation, size rotation, exportable incident bundle, no tokens/private cards/objectives/votes.
- Backup: pre-game and between-session DB backup plus periodic tested backup during play; copy to a second device/storage. A backup is valid only after restore verification.
- Recovery: restart rooms paused and use absolute persisted deadlines so timers do not silently drift. Do not reconstruct state from projector/client memory.
- Emergency controls: pause, resume, reconnect/reassign according to approved rules, end, and reset. No free-form production state editor; destructive operations require typed room/game confirmation and audit.
- Release: no runtime package downloads, external fonts/CDNs/APIs, or developer-only credentials. Keep offline installer/runtime/database dependencies and a printed quick-start/recovery sheet.

# 18. MULTI-AGENT DEVELOPMENT WORKFLOW

## Responsibilities

- **Codex — technical owner/integrator:** architecture, contracts, game engine, server, persistence, migrations, room/WS/session systems, cross-system integration, release engineering.
- **Claude Code — reviewer/adversary:** architecture review at gates, threat modeling, raw protocol attacks, race/replay/private-state/room-isolation audits, difficult debugging, invariant/scoring review. Claude should not silently replace approved implementations during review.
- **Antigravity — experience owner:** design tokens/components, player/projector/admin UX, SVG city/rendering/motion, browser/device/projector QA, accessibility and visual performance. Antigravity consumes contracts and must not implement authoritative game logic.

## Shared repository protocol

1. Initialize Git and commit the untouched documentation baseline before framework scaffolding.
2. `agent/TASKS.md` is a live ownership ledger with task ID, owner, dependencies, exact file scope, acceptance criteria, tests, branch/commit, and status.
3. An agent claims a task before editing. No other agent edits the claimed files without a handoff or explicit coordination.
4. Use short-lived feature branches or separate Git worktrees from the same repository for parallel work; Codex merges only reviewed, tested commits into the integration branch.
5. Update `agent/STATUS.md` after meaningful work, `agent/REVIEW.md` for reproducible findings, and `agent/HANDOFF.md` whenever ownership changes.
6. Every contract/schema/game-content/migration/design-token change is proposed as its own reviewed commit with affected consumers/tests identified.
7. CI evidence accompanies merge. Browser screenshots and raw security-test results are referenced from status/review rather than described vaguely.
8. Update authoritative docs/decisions in the same logical change when an approved behavior changes.

## Files/systems that must not be edited simultaneously

- `packages/contracts` and WebSocket protocol consumers;
- `packages/game-engine` state/commands/invariants/scoring;
- `packages/game-content` canonical values/effects;
- database migrations/schema;
- root package manifest, lockfile, TS/build/lint configuration;
- shared design tokens/primitives;
- room/session/projection middleware;
- the same source-of-truth documentation or decision entry.

Safe parallelism occurs only across stable interfaces, for example: Codex builds a server vertical slice while Antigravity builds UI against a committed generated fixture matching the same contract, and Claude reviews a frozen commit. Integration begins only after contract versions agree.

## Review gates

- Product/game-rule approval before engine content.
- Contract review before multiple clients integrate.
- Engine invariant/scoring review before transport integration.
- Security/room/privacy review before UI polish.
- Browser/accessibility/performance review per client milestone.
- Full Claude adversarial and Antigravity physical/browser review before release candidate.

# 19. DEVELOPMENT PHASES

Security, documentation, tests, and status updates are requirements within every phase; Phase 11 is a concentrated adversarial gate, not the first time security is considered.

| Phase | Objective and dependencies | Proposed files/modules | Expected output and required tests | Completion criteria |
|---|---|---|---|---|
| 0 — Specification closure | Depends on product-owner answers. Repair Markdown without semantic change; reconcile phase/Council/selling conflicts; approve canonical values, session/join and recovery policy | Existing source docs; new canonical content specification; `agent/*` | Documentation link/fence check; cross-doc consistency checklist | No critical gameplay ambiguity needed by first vertical slice; documents render; decisions recorded |
| 1 — Repository foundation | Depends on Phase 0 architecture approval | Git baseline; root npm workspace/lockfile; strict TS/lint/format/test/build configs; `.env.example`; CI skeleton | Clean offline install, typecheck/lint/test/build placeholder commands on fresh clone | Reproducible commands work; no secrets; agent ownership initialized |
| 2 — Contracts and content schema | Depends on approved vocab/content structure | `packages/contracts`, `packages/game-content` schemas/approved definitions | Schema fixtures, unique/referential/bound validation, protocol/error compatibility tests | All approved content parses; no duplicated interfaces; version fixed |
| 3 — Authoritative engine kernel | Depends on Phase 2 and exact phase/economy rules | `packages/game-engine` state, command result, phase graph, invariants, RNG abstraction | Failing-first unit tests for state initialization, phases, purchase/development, duplicates, bounds, deterministic RNG | Pure engine has no I/O/UI dependency; documented slice rules and invariants pass |
| 4 — Persistence and recovery | Depends on engine state/version/action contract | `database/migrations`, server persistence adapters, recovery loader | Real-Postgres transaction/rollback/unique action/restart/migration tests | Accepted transition can be recovered exactly; failed persistence publishes nothing |
| 5 — Identity, rooms, and admin bootstrap | Depends on contracts/persistence and approved join/auth UX | Server HTTP/session/auth/authorization/room manager; minimal admin bootstrap | Capacity, token scope/expiry/revocation, two rooms, unauthorized admin/cross-room tests | Admin can create two isolated rooms; clients receive scoped sessions |
| 6 — WebSocket, projections, idempotency, reconnect | Depends on Phases 3–5 | WS gateway, command service, room queues, projections, realtime client | Raw WS schema/size/rate/version/replay/race/private projection/reconnect/backpressure tests | Two rooms accept concurrent commands safely; refresh restores correct state; raw frames leak nothing |
| 7 — Thin end-to-end vertical slice | Depends on stable protocol | Minimal player/projector/admin shells integrated with one approved action and state transition | Playwright create/join/start/action/projector update/reject/reconnect across two rooms | One complete authoritative slice works in real browsers with restart recovery |
| 8 — Complete documented gameplay engine | Depends on all remaining canonical game decisions/content | Engine/content modules for cards, events, trades, Council, scoring, completion | Dedicated unit/integration tests for every definition, order, boundary, atomicity, privacy and full deterministic eight-round game | Every documented rule maps to implementation and test; Claude integrity review passes |
| 9 — Player client | Depends on stable game/projection contracts | `apps/player`, shared realtime/UI primitives | Mobile Playwright/component tests for actions, cards, objective, trade, vote, errors, reconnect, long data | 4–6 real devices can complete actions without false success or private leakage |
| 10 — Projector and admin clients | Depends on public/admin projections and Phase 9 design tokens | `apps/projector`, `apps/admin`, SVG map, operational controls | 1920×1080 screenshots/FPS, physical readability, admin authorization/confirmation/recovery E2E | Public display is readable/private-safe; admin can operate/recover two rooms safely |
| 11 — Security hardening/adversarial review | Depends on feature-complete authoritative flows | Cross-cutting server/contracts/tests/config/headers | Full threat checklist: forged IDs/state, raw WS, replay, races, cross-room, private frames, XSS, session/reconnect, DoS, DB failure | No critical/high security or integrity findings; regression test for every fixed exploit |
| 12 — Visual polish and accessibility | Depends on stable gameplay/UI flows | Shared tokens/assets/components, projector/player/admin presentation, reduced-effects mode | Visual regression, contrast/focus/touch/reduced motion, actual device/projector FPS/load | Visual-system checklist passes without latency/FPS/regression failures |
| 13 — Performance and repeated-session reliability | Depends on release-shaped build | Performance/soak harnesses, startup/backup/restore scripts, bounded logging | Documented latency/load/FPS/payload/memory results; repeated 30-minute games/resets; failure injection | Targets met on event hardware; no growth/corruption; recovery drill succeeds |
| 14 — Full multiplayer QA and event release | Depends on all earlier gates and feature freeze | Release artifact, operator runbook, signed release evidence | Two simultaneous complete games, network degradation, process/projector/player recovery, backup-machine exercise, manual dress rehearsal | All release checks recorded PASS, no release blocker, checksum/offline backup/operator sign-off ready |

# 20. CRITICAL DECISIONS REQUIRED

## CRITICAL

1. **Canonical game economy/content.** Decide starting resources; all 16 properties/values; development/income/demand formula; card/event/policy/objective catalogs and effects; scoring bonuses. **Recommendation:** approve one versioned canonical data workbook/spec and generate validated source configuration from it; no agent invents values.
2. **Exact round/phase order.** Resolve the event/market and Council conflicts and define when income/effects/scoring occur. **Recommendation:** explicit finite-state sequence with event/market resolved at round start and a named Council boundary after Round 3/6 player actions; specify when policy effects begin.
3. **Turn/action economy.** Define legal action count/order, passing/end-turn, first player/rotation, legal non-turn responses, and game-critical timers. **Recommendation:** one active-player turn with a small explicit allowlist and server-owned phase completion; avoid simultaneous free-for-all unless rules require it.
4. **Trading and selling.** Define tradeable asset types, offer expiry/cancellation, whether agreements are non-binding outside the recorded trade, and whether selling exists. **Recommendation:** initial release supports server-recorded property/City Credit trades only, no bank selling, and expiring versioned offers revalidated on acceptance.
5. **Disconnect/timeout behavior.** Decide what happens when the active player disappears. **Recommendation:** short reconnect grace, then admin-controlled pause/skip action defined by rules; never automatically alter resources/ownership.
6. **Join and identity UX.** Choose open room code, per-seat credential, or admin approval. **Recommendation:** public room code plus one-time seat credential/admin approval, then an opaque reconnect session; projector uses separate pair code.
7. **Durability objective.** Decide acceptable loss after process versus whole-machine failure. **Recommendation:** zero loss for acknowledged actions after process restart via synchronous local PostgreSQL commit; periodic verified second-device backup for machine failure; restored games start paused.
8. **Event environment.** Confirm host OS/hardware, router/network control, projector resolution/browser, available phones, HTTPS/WSS feasibility, backup machine, and power. **Recommendation:** dedicated controlled LAN, fixed server address, one tested primary plus prepared backup, all assets/services local.

## HIGH

1. Exact admin emergency capabilities and whether “skip/advance/correct/reassign” are legal in each phase; recommend narrow typed commands, no arbitrary production state editor.
2. Public score/wealth visibility during play and exact final reveal visibility; recommend show only metrics explicitly approved by rules and reveal full breakdown at completion.
3. Content/rules versioning policy for active games; recommend immutable version per game and no hot rule changes.
4. Exact visual tokens, font, map geometry, player/district markers, asset provenance, and motion durations; recommend Antigravity proposal plus projector/mobile prototype and product-owner sign-off.
5. Minimum supported browsers/devices and actual projector characteristics; recommend current Chrome/Edge desktop and representative modern Android Chrome, verified on event inventory.
6. PostgreSQL/event-host packaging model for the confirmed OS; recommend one rehearsed startup script and no runtime downloads.
7. Audit/backup retention and access; recommend retain event/game audit through dispute/review window, then delete per approved policy while keeping final results as required.

## MEDIUM

1. Whether room/game names and player display names are operator-assigned or user-entered; recommend user display name with server bounds/uniqueness and admin correction.
2. Whether a player may keep multiple viewing tabs; recommend newest authenticated socket is command-capable and older sockets close.
3. Sound effects; recommend optional, muted-by-default or clearly controllable, never informative-only.
4. Whether completed games support spectator replay; recommend no replay UI for initial release; retain audit history only.
5. Exact performance/payload/bundle guardrails beyond documented experience targets; recommend measure the vertical slice and freeze evidence-based budgets.

## LOW

1. Optional decorative Canvas effects; recommend defer until core projector passes FPS/soak tests.
2. Optional Three.js/React Three Fiber scene; recommend omit for initial release.
3. Custom room themes/branding variants; recommend one controlled theme.
4. Analytics/telemetry; recommend none during core event play unless explicitly approved and fully local/nonessential.

# 21. TECHNICAL RISKS

| Risk | Probability | Impact | Mitigation | Owner/agent | Test timing |
|---|---|---|---|---|---|
| Missing economic/content/scoring rules cause incompatible implementations | High | Critical | Phase 0 canonical approval and schema; block engine content until resolved | Product owner + Codex | Before Phase 2 |
| Realtime state corruption from races/async persistence | Medium | Critical | Pure transitions, per-room queues, DB commit before state swap, invariants | Codex; Claude review | Phases 3–6 and every release |
| Duplicate/replayed actions create resources/ownership | High without controls | Critical | Durable action uniqueness, cached receipts, stale version checks | Codex; Claude adversarial | Phase 6 onward |
| Cross-room leakage through session/query/broadcast/cache | Medium | Critical | Immutable scope, room registries, scoped queries/cache, raw two-room tests | Codex + Claude | Phase 5 onward; release gate |
| Private cards/objectives/votes leak in snapshots/events/logs | Medium | Critical | Whitelist projections, audience-resolved events, raw-frame/log tests | Codex + Claude | Phase 6 onward |
| Client trust or direct API bypass | Medium | Critical | Shared server guards and engine path for UI/direct HTTP/WS | Codex + Claude | Phase 5 onward |
| Reconnect creates duplicate player/action or wrong identity | Medium | High/Critical | Opaque persisted session, existing-player rebind, newest-socket policy, snapshot resync | Codex + Claude | Phases 5–7; soak |
| DB/process/machine failure loses accepted game state | Medium | Critical | Synchronous commit, snapshot loader, paused recovery, verified external backups/backup host | Codex + event operator | Phases 4, 13, dress rehearsal |
| Local network has captive portal/client isolation/poor Wi-Fi | High until tested | High | Controlled AP, fixed address, site survey, capacity test, backup network | Event operator + Codex | Before build freeze and event morning |
| HTTPS/WSS certificates fail on student phones | Medium | High | Confirm network/domain/cert plan early; test every device class; isolated-LAN fallback policy | Codex + event operator | Phase 1/13 |
| Projector effects stutter or leak memory | Medium | High | SVG/DOM, event-driven bounded animation, reduced effects, 30+ minute soak | Antigravity | Phases 10, 12–14 |
| Mobile browser/layout incompatibility | Medium | High | Real Android/narrow viewport/touch/reconnect tests, no hover dependence | Antigravity | Phase 9 onward |
| WebSocket reconnect storm/backpressure destabilizes server | Low/Medium | High | Jittered backoff, rate/buffer limits, slow-client disconnect, burst tests | Codex + Claude | Phases 6, 11, 13 |
| Admin error resets/advances wrong room | Medium | Critical | Capability scope, explicit target, typed confirmation, audit, safe controls | Codex + Antigravity + Claude | Phases 10–11 |
| AI agents overwrite contracts/config/migrations/UI tokens | High without process | High | Git/worktrees, claimed file scope, review gates, integration owner | All; Codex accountable | From Phase 0 continuously |
| Documentation Markdown damage hides requirements | High/current | Medium/High | Non-semantic fence repair and doc lint in Phase 0/CI | Codex; Claude review | Phase 0 |
| Last-minute feature creep reduces test time | High | High | Priorities, decision log, freeze date, reject unapproved mechanics | Product owner + all agents | Every planning/release gate |
| Dependency/runtime unavailable offline | Medium | High | One lockfile, clean offline build cache/artifact, no external runtime calls | Codex | Phases 1, 13–14 |

# 22. RECOMMENDED NEXT ACTION

Do not initialize frameworks or implement gameplay yet. The product owner should answer the critical questions in Section 23 and approve or amend this architecture. Then Codex should execute **Phase 0 only**: repair the broken Markdown fences without semantic changes, record the approved conflict resolutions and missing gameplay decisions in the authoritative documents/decision log, populate agent ownership/status files, and establish a canonical game-content specification. After a second consistency review by Claude Code, initialize Git and begin Phase 1 repository foundation.

ARCHITECTURE:
READY

GAME RULES:
NOT READY

VISUAL SYSTEM:
NOT READY

SECURITY PLAN:
READY

PERFORMANCE PLAN:
READY

REPOSITORY:
NOT READY

IMPLEMENTATION:
NOT STARTED

# 23. QUESTIONS FOR PRODUCT OWNER

1. **What is the complete approved gameplay data set?** Please provide or approve starting City Credits/Influence, the 16 properties and all values, development/income/demand formulas, card/event/policy/objective definitions, and final-scoring bonuses. **Why it matters:** the engine, UI, balance tests, and final score cannot be implemented without inventing rules. **Recommendation:** one versioned canonical table/spec owned by the product owner.
2. **What is the exact round sequence, especially event/market and Council timing?** Confirm whether market/events resolve at the beginning or end of a round, whether Council is inside or after Round 3/6 resolution, and when a new policy begins affecting play. **Why it matters:** this changes legal actions, values, animations, persistence events, and tests. **Recommendation:** event/market at round start; Council after player actions at an explicit subphase; explicitly define effect start.
3. **What may a player do in a turn, and what happens on timeout/disconnect?** Confirm action count/order, pass/end-turn, first-player rotation, legal non-turn responses, timers, grace period, and admin skip/pause semantics. **Why it matters:** the authoritative phase machine and 20–30 minute pacing cannot be made deterministic without it. **Recommendation:** explicit active-player turns, short reconnect grace, then a narrow admin recovery action; no automatic resource changes.
4. **Exactly what can be traded or sold?** Confirm property/City Credit/Influence/card tradability, offer expiry/cancellation, and whether bank selling exists. **Why it matters:** trades touch multiple authoritative resources and are a major balance/security surface. **Recommendation:** initial release permits only properties and City Credits in atomic player-to-player trades; no selling unless a full sale rule is approved.
5. **How should players claim seats?** Choose between room-code-only open joining, one-time player/seat codes, or admin approval, and state whether names are self-entered. **Why it matters:** this determines lobby friction, impersonation resistance, reconnection identity, and admin workload. **Recommendation:** room code plus one-time seat credential/admin approval, followed by an opaque server session.
6. **What information is public during play?** Confirm whether exact credits, Influence, property values/development, partial scores, trade terms/results, and vote participation/counts are public before their reveal points. **Why it matters:** projection schemas must be fixed before frontend or WebSocket work; an incorrect default can leak strategy. **Recommendation:** publish only ownership/development/demand/current public event/policy/turn plus expressly approved score information; keep resources/cards/objectives/votes/private trade details private.
7. **What event hardware and network are guaranteed?** Specify host OS/specs, database/container availability, router control/client-isolation settings, server hostname/IP, HTTPS/WSS feasibility, projector specs/browser, representative phones, backup machine, and power/network backup. **Why it matters:** deployment packaging, certificates/cookies, startup scripts, performance budgets, and recovery procedures depend on the actual environment. **Recommendation:** dedicated controlled LAN and server address, local services/assets, primary plus fully prepared backup machine.
8. **What loss/recovery window is acceptable if the entire event machine fails?** Distinguish process restart from disk/machine loss and confirm how often an external backup may be written. **Why it matters:** local PostgreSQL can provide zero loss across process restart, but whole-machine zero-loss recovery would require synchronous replication or another storage path and materially increases complexity. **Recommendation:** zero acknowledged-action loss for process restart; frequent verified second-device backups and a documented, explicitly accepted recovery point for total machine failure.
