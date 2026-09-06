# ECONOVA: CITY
# AGENT HANDOFF

This file communicates important work between AI agents.

## Latest handoff — Codex integration checkpoint, 2026-09-06

Server/runtime/client-core are implemented; Phase 2 overall remains incomplete. Preserve the current light-premium-tabletop clients and all existing uncommitted work. Historical design descriptions below are not authorization to restore an older visual direction.

Key boundaries: ordinary admin snapshots are public plus connectivity; private inspection uses a room-admin child session, fresh credential, and durable audit before response. Commands use serialized room queues, actor/payload-bound request/action receipts, and persistence before memory swap. Reconnect sends a current authorized snapshot, never replays commands. Server timers call existing engine handlers rather than duplicating rules.

REVIEW-018/019 are now repaired and regression-tested under the owner's approved pause behavior (DECISION-048). `pauseStartedAt` and `deferredDisconnectPlayerIds` are internal persisted state, never recipient DTO fields. Legacy paused snapshots without a trustworthy pause timestamp fail resume with PAUSE_RECOVERY_REQUIRED; do not invent elapsed time. Connected timeout -> emergency sale preserves 30 seconds even when normal time remaining is zero.

These narrow engine/spec regressions are committed as `93ef2609efb00c095bfa764d2a1b24ea8a620264`. All other current shared work remains uncommitted and must be preserved. This is a backend checkpoint, not a Phase 2 completion claim.

Claude handoff: existing adapters now consume client-core (`player/state/transport.ts`, `PlayerSession.tsx`, `projector/link.ts`, `projector/App.tsx`, `admin/operations.ts`, `admin/App.tsx`). These integration changes are preserved, not a parallel UI design. Claude now owns these frontend files and all styling. Player commands settle only via matching acknowledgement plus authoritative snapshot; an uncertain result requires user review, never automatic replay. Lobby/loading does not silently use a demonstration fixture. Projector credentials are entered once, not retained in a URL. Admin uses room-scoped live state versions; privileged inspection clears credentials immediately and volatile results on blur/disconnect/room-change/30-second expiry. Routine admin payloads contain no private holdings. Skip/end controls remain unavailable because the server has no approved implemented handler for them.

Browser evidence: `tests/e2e/browser-flow.mjs` drove eight phone-sized player tabs across two rooms through joining and objective selection, plus two projector authentications. It stopped on a Pause selector timeout; manual Pause succeeded. Automated refresh/offline/uncertain-action/private-inspection flows after that point are NOT VERIFIED. Claude should fix the automation locator and complete those flows (including mobile/touch and projector sizes), not rewrite transport. Existing React `transform-origin` warning is a frontend cleanup item. The harness `tests/e2e/server.mjs` is explicitly test-only with in-memory persistence, not event deployment or PostgreSQL evidence.

PostgreSQL verification completed (2026-09-06): the opt-in `tests/integration/postgres-process.test.ts` EXECUTED and PASSED, then passed again within the full 243-test suite (zero skips), using explicit TEST_DATABASE_URL and the existing dedicated `econova_test` database on PostgreSQL 18.6. It starts the real production entry point and verifies migrations, 12-player/two-room persistence, hashed sessions, paused state, replay, privacy, audited inspection, wrong-room denial, isolated persistence-failure quarantine and repeated ungraceful process crashes. Independent migration verification applied 001–004 once and none on repeat. Only temporary randomized test schemas were created/removed. No backend/test code, credentials, .env or Docker configuration changed. For reruns, build packages/server and explicitly supply TEST_DATABASE_URL; all opt-in and `_test` safety checks remain intact.

Claude build blocker (REVIEW-023): full build reaches Player Vite then fails resolving `../assets/econova-crest.png` from `packages/ui/dist/marks/Crest.js`. The PNG exists in `packages/ui/src/assets`, but the UI package's build is only `tsc -b`, leaving the emitted import without its asset. Fix asset packaging within frontend ownership and rerun full build. Astra has not touched the frontend or copied assets manually to disguise this failure.

Continue the remaining catalog-by-catalog canonical engine audit and performance/failure soak. Canonical Sections 19/29 do not define a separate disconnected-counterparty trade expiry; existing end-of-turn rejection is retained. Do not invent an independent trade deadline. Full evidence and operational notes: `docs/qa/PHASE2_ENGINEERING_PASS.md`.

---

## CURRENT HANDOFF — PREMIUM FRONTEND ENGINEERING WORKSTREAM COMPLETE

FROM: Antigravity

TO: Product owner / next authorized agent

TASK: Premium Frontend Engineering Workstream (`@econova/ui`, `@econova/player`, `@econova/projector`, `@econova/admin`)

STATUS: COMPLETE — FRONTEND APPLICATIONS IMPLEMENTED & TYPE-CHECKED

COMPLETED:

- Created `@econova/ui` design system package with tokens.css (dark theme palette, glassmorphism, glowing borders, typography) and high-polish component primitives: `Button`, `Card`, `Badge`, `StatCard`, `Modal`, `Toast`, `Tabs`, `ProgressBar`.
- Integrated self-hosted Inter font and Tailwind CSS v4 setup.
- Configured `vite.config.ts` for Player, Projector, and Admin applications with `@tailwindcss/vite` plugin and React.
- Built complete `@econova/player` app:
  - `HeaderBar` with live round tracker, turn status indicator, room badge, and fixture toggle.
  - `PlayerStatsHeader` with Credits, Influence, Properties, and Turn Roll metric cards.
  - `MapView` rendering 20-zone city grid, ownership colors, development stars, standing player pawns, and property buy/upgrade drawer.
  - `PropertiesView` with portfolio list, yield calculations, and upgrade controls.
  - `CardsView` rendering hand strategy cards with play triggers.
  - `ObjectivesView` with secret objective progress bars and reward points.
  - `MarketView` displaying demand modifiers across 4 sectors, Breaking News bulletins, and city feed.
  - `TradeView` with interactive credit and property swap proposals.
  - `TurnActionPanel` with floating sticky turn timer bar and quick actions.
- Built complete `@econova/projector` app:
  - Large-screen 1080p/4K high visibility layout.
  - `ProjectorHeader` with room code, round badge, and phase status.
  - `ProjectorCityMap` displaying 20-zone map grid with animated player tokens.
  - `ProjectorLeaderboard` rendering live rankings, points breakdown, and turn highlight.
  - `ProjectorNewsTicker` with bottom cinematic marquee bulletin.
- Built complete `@econova/admin` app:
  - `AdminHeader` with room switcher (ROOM_ALPHA, ROOM_BETA) and GM status.
  - `RoomControlsPanel` with Pause/Resume, Advance Round, Skip Turn, and Reset Room.
  - `PlayerStateInspector` auditing 4 players' secret objectives, connection status, credits, influence, and cards.
- Configured monorepo TypeScript path mappings (`@econova/*`) and project references across all apps.

REMAINING:

- Full real WebSocket client connection integration with Phase 2 server endpoints (currently operates with fixture mode + state fallbacks).
- Live event release deployment packaging.

TESTS PERFORMED:

- `npx tsc --noEmit` across `@econova/ui`, `@econova/player`, `@econova/projector`, and `@econova/admin`: PASS (Clean 0 errors).

---

## PREVIOUS HANDOFF — PHASE 1 COMPLETE

FROM: Codex

TO: Product owner / next authorized implementation agent

TASK: Phase 1 foundation, authoritative engine, and checkpoint completion

STATUS: COMPLETE — AWAITING PHASE 2 APPROVAL

COMPLETED:

- npm/TypeScript monorepo foundation with shared contracts, centralized game content, deterministic game engine, Fastify server, WebSocket transport, room/session isolation, projections, persistence/recovery interfaces, PostgreSQL migration, and critical tests
- pending trades auto-reject safely when the proposing turn ends or times out
- auction and emergency-sale sub-phases pause/resume the normal turn timer across manual, timeout, and disconnect completion
- reconnect timeout deterministically resolves pending event district and card-discard choices
- Special Event district commands accept only canonical district IDs
- modifier precedence overlap is regression-tested and matches the locked specification
- Council begins without stale player-turn state and uses its separate timer boundary
- player/projector/admin Vite applications have minimal build entrypoints only

REMAINING:

- Phase 2 feature UI and browser flows
- visual implementation and visual QA
- deployment/event-release work beyond the Phase 1 foundation

RELEVANT FILES:

- `packages/contracts/src/schemas.ts`
- `packages/game-content/src/`
- `packages/game-engine/src/`
- `apps/server/src/`
- `database/migrations/001_initial.sql`
- `apps/player/index.html`, `apps/projector/index.html`, `apps/admin/index.html`
- `packages/game-engine/test/`, `apps/server/test/`, `packages/contracts/test/`

TESTS PERFORMED:

- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm test`: PASS (84/84)
- `git diff --check`: PASS

KNOWN ISSUES:

- No known blocker remains in Phase 1 scope.
- The three client roots are intentionally minimal and are not product UI.
- Phase 2 has not been authorized or started.

IMPORTANT IMPLEMENTATION DETAILS:

- `docs/GAME_DESIGN_SPEC.md` remains the gameplay source of truth.
- Active game state is server-authoritative; client commands carry request/action IDs and expected state versions.
- Each room has an isolated serialized runtime and independently quarantines on persistence or invariant failure.
- Never send full authoritative state to player/projector clients; use the existing projection functions.

RECOMMENDED NEXT ACTION:

Product owner reviews the Phase 1 commit and explicitly authorizes Phase 2. Do not begin Phase 2 automatically.

---

## PREVIOUS HANDOFF — GAMEPLAY LOCK

FROM: Codex

TO: Codex (for approved Phase 1 implementation)

TASK: Product-owner gameplay clarification and documentation lock

STATUS: COMPLETE — READY FOR IMPLEMENTATION

COMPLETED:

- Full canonical game design specification written to `docs/GAME_DESIGN_SPEC.md`
- DECISION-044 resolved: Breaking News/events before player turns
- DECISION-045 resolved: City Council at start of Rounds 3 and 6
- DECISION-046 resolved: Emergency bank sale for mandatory payments only
- 20-space city map with 16 named properties across 4 districts
- Complete property economics (prices, values, development costs, income, fees)
- 12 Strategy Cards with exact effects
- 10 Breaking News events
- 8 Special Events
- 8 City Council policies (4 pairs)
- 10 Secret Objectives
- District control bonuses and Full Control scoring
- Turn timing, disconnect/reconnect, auction, trade rules
- Tie-breaking procedure
- Economy balance analysis
- Consistency audit (20 cross-cutting questions resolved)
- City Center passing now uses total forward movement after applicable forward modifiers; Entertainment applies only to normal forward movement, and Shortcut backward movement uses the unmodified die result and never awards the bonus
- SC12 Insurance Policy is an immediate pre-payment reaction that consumes 1 Action and makes the landing fee 0
- Secret Objectives use sequential two-card offers from one shuffled 10-objective pool for 4–6 players
- Emergency-sale timeout/disconnect auto-liquidation is deterministic by ascending current liquidation value, then lowest property ID
- Universal modifier precedence is defined for purchase price, development cost, property income, and landing fees
- The 60-second normal turn timer pauses for 30-second Auction and Emergency Sale sub-phases; Council has a separate 45-second timer
- DECISION-044, DECISION-045, and DECISION-046 are APPROVED and no longer block implementation
- Source-of-truth and affected legacy documentation are synchronized to `docs/GAME_DESIGN_SPEC.md`

REMAINING:

- Implement the game engine based on `docs/GAME_DESIGN_SPEC.md`
- Implement server, room system, WebSocket layer
- Implement frontend player and projector interfaces
- Security and integrity review

FILES CHANGED:

- `docs/GAME_DESIGN_SPEC.md` (NEW)
- `docs/DECISIONS.md` (MODIFIED — decisions 044, 045, 046 marked APPROVED)
- `agent/STATUS.md` (MODIFIED)
- `agent/HANDOFF.md` (MODIFIED — this file)
- `AGENTS.md` (MODIFIED — gameplay source-of-truth routing)
- `README.md` (MODIFIED — canonical specification discoverability)
- `docs/PRODUCT.md` (MODIFIED — canonical phase order and selling language)
- `docs/GAME_RULES.md` (MODIFIED — supersession notice and affected legacy clauses)
- `docs/GAME_CONTENT.md` (MODIFIED — superseded Phase 0 template and approved decision status)
- `agent/TASKS.md` (MODIFIED — gameplay lock complete; Phase 1 ready/not started)
- `agent/REVIEW.md` (MODIFIED — former gameplay blockers resolved)

TESTS RUN:

- Internal consistency audit of the 34-section specification: PASS
- Economy balance analysis with expected value calculations: PASS
- District/property/space count verification: PASS (16 properties + 4 special = 20)
- Final Markdown structure validation: PASS (20 files, 22 fenced blocks)
- Final targeted gameplay consistency audit: PASS (25/25 checks)
- Git whitespace/error check: PASS (`git diff --check`)
- No application tests exist (implementation not started)

KNOWN ISSUES:

- None for game design. All gameplay questions are resolved.
- No remaining blocker in the approved gameplay clarification set.

IMPORTANT NOTES:

- `docs/GAME_DESIGN_SPEC.md` is now the SINGLE SOURCE OF TRUTH for gameplay.
- Where `GAME_RULES.md` or `PRODUCT.md` conflicts with `GAME_DESIGN_SPEC.md`, the spec wins.
- The spec contains exact formulas, exact card/event/objective/policy content, exact timing rules, and worked examples. An implementer should not need to guess.
- No production code, framework, or dependency has been created. Only documentation.

RECOMMENDED NEXT ACTION:

After this documentation-only handoff, Codex may begin the separately approved Phase 1 brief using `docs/GAME_DESIGN_SPEC.md` as the authoritative rules reference. Do not begin Phase 2 automatically.

---

## HANDOFF FORMAT

FROM:

TO:

TASK:

STATUS:

COMPLETED:

REMAINING:

FILES CHANGED:

TESTS RUN:

KNOWN ISSUES:

IMPORTANT NOTES:

RECOMMENDED NEXT ACTION:
