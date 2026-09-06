# Phase 2 engineering integration ledger

Source: product-owner heavy engineering/integration approval (2026-09-05).
Baseline: `d1914fb`; typed-boundary checkpoint: `f7eb7f7`.

## Current measured checkpoint — 2026-09-06

Phase 2 is IN PROGRESS, not event-release ready. This ledger supersedes historical frontend/server completion claims for integrated release readiness.

Engine-only checkpoint: `93ef2609efb00c095bfa764d2a1b24ea8a620264` (8 files). Verification below ran against the full current shared working tree, not a clean release checkout of that commit alone. Other integration/frontend changes remain uncommitted.

| Check actually run | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` with explicit TEST_DATABASE_URL | 243 passed, zero skipped; 34 files passed |
| `npm run build:packages`, `npm run build:server` | PASS |
| `npm run build` | FAIL: Player Vite cannot resolve shared UI dist/assets/econova-crest.png (REVIEW-023); frontend left untouched |
| `git diff --check` | PASS; only Git line-ending normalization warnings |
| Standalone strict TypeScript check of `tests/integration/postgres-process.test.ts` | PASS |
| Live HTTP/WS: six players per room, two rooms, two projectors, two room admins | PASS: room/private projection isolation, command validation, replay/stale requests, all twelve replacement reconnects |
| Browser journeys through gstack | PARTIAL: eight player joins/objective selections, two projector authentications; subsequent Pause locator timed out; manual Pause succeeded |
| `npx vitest run tests/integration/postgres-process.test.ts` | EXECUTED, 1 passed, zero skipped (9.15 seconds total); also passed in full suite |
| Live PostgreSQL migrations/restart/fault injection | PASS on PostgreSQL 18.6, existing dedicated econova_test, temporary isolated schemas |
| Independent migration runner, fresh schema then repeat | First: 001_initial, 002_phase2_recovery, 003_receipt_binding, 004_lobbies_and_session_parent; second: no migrations applied |
| Event Wi-Fi, mobile compatibility matrix, projector FPS, sustained latency/memory soak, backup restore | NOT VERIFIED |

Prior checkpoint client JS output (Vite measured, gzip): Player 115.91 kB, Projector 104.89 kB, Admin 98.47 kB. These are historical bundle measurements, not current build or rendering/latency evidence. The current full build is blocked by REVIEW-023.

## Repairs verified in this continuation

- REVIEW-018: connected normal-turn timeout entering emergency sale retains a full 30-second selection window; zero remaining normal time is restored afterward. Disconnected fallback remains deterministic.
- REVIEW-019 / DECISION-048: all normal/sub-phase/reconnect timers freeze during operator pause. Presence records can change; gameplay side effects are deferred once until resume. Ten engine regressions and six server scheduler cases cover normal turn, auction, Council, emergency sale, reconnect and outstanding trades, including repeated pause and JSON snapshot recovery.
- SC01 before-roll and SC04 before-purchase now appear in the authoritative player's command capabilities when owned and not already played. Paused/completed projections offer no trade response.
- Recovery checks SQL game ID, room ID and BIGINT state version against the authoritative JSON snapshot before restoration; invalid room isolation is retained.
- Existing Player/Projector/Admin adapters use client-core for validated snapshots, identity, authoritative versioning and command settlement. No CSS/board redesign was performed. Claude owns subsequent frontend changes.

## Canonical trace evidence / audit still remaining

| Canonical area | Existing implementation/tests inspected | Evidence limit |
| --- | --- | --- |
| Setup: 4–6 players, 1000 Credits, 5 Influence, unique sequential objectives | game-content configuration; engine setup; setup/content tests | Six-player setup/objective uniqueness tested |
| Board and catalog identity: 16 properties, 12 cards, 8 special events, 10 news, 8 policy options, 10 objectives | game-content catalogs and content tests | Catalog completeness tests are not exhaustive behavioral validation of each effect |
| Movement/City Center/Entertainment/Shortcut | calculations and transition tests | Covered movement/bonus boundaries; complete catalog trace audit still required |
| Purchase/development/income/fee modifier precedence and clamps | calculations tests | Temporary multiplier/policy additive ordering and Insurance reaction covered |
| Auction and mandatory fee liquidation | transitions tests | Triggerer eligibility, sealed tie order, commission paths, timer suspension and deterministic sale covered; full browser journey remains |
| Cards/events/policies | transition and calculation handlers/tests | Not claiming every card/event/policy combination audited; finish the rule-by-rule effect matrix before release |
| Trades | atomic validation/transfer, turn-end rejection tests; pause tests | No independent disconnected-counterparty expiry specified in Sections 19/29; no new timer invented |
| Round/Council/final scoring | Round 2→3 Council, Round 8 payout/freeze, score/objective tie tests | Full six-player game-to-results E2E still required |
| Pause/timeout/reconnect | REVIEW-018/019 engine and runtime regressions | Legacy paused snapshots without timestamp deliberately reject resume; operator recovery review required |

## Real PostgreSQL test procedure

Use a dedicated PostgreSQL database whose name ends in `_test`, with permission to create a schema. Set `TEST_DATABASE_URL` explicitly in the local environment; never commit it. Run `npm run build:packages`, `npm run build:server`, then `npx vitest run tests/integration/postgres-process.test.ts`. The test does not use DATABASE_URL as a fallback.

The suite creates a unique `econova_test_<uuid>` schema, runs the actual `apps/server/dist/main.js` production composition in a child process, and removes only that schema in cleanup. It exercises real migrations, two six-player durable lobbies, hashed-session restoration, persisted objectives/state, receipt replay after ungraceful process termination, room-admin inspection audit, wrong-room denial, and a database-trigger failure restricted to Room A with durable quarantine while Room B continues. Repeated startup verifies migrations are idempotent. These assertions EXECUTED and PASSED on PostgreSQL 18.6 on 2026-09-06, both in the targeted run and full suite. A manual backup/restore and event hardware rehearsal are separate remaining gates.

The PostgreSQL verification pass required no source/test/config changes. TEST_DATABASE_URL was set only for the test process; the ordinary database, .env, credentials, Docker configuration, frontend, canonical rules, opt-in skip condition and dedicated-database guard were not changed. Temporary test/migration schemas were removed after use; existing databases and other schemas were retained. Only this ledger and agent status/review/handoff/task records were edited. No new commit created.

## Claude browser continuation

Use `tests/e2e/browser-flow.mjs` and gstack; repair its Pause selector before continuing automated refresh/offline/reconnect/privacy assertions. The prior test-only server used port 3100, avoiding the existing service on 3000. The browser server uses in-memory persistence and is never a release-server substitute. Verify six player contexts per room for final acceptance; the earlier eight-player browser run is partial evidence only.

Shared boundary: player commands carry requestId/actionId/expectedStateVersion; command acknowledgement and authorized snapshot jointly settle committed UI. An uncertain outcome requires review and never replays automatically. Admin inspection uses a room-admin token plus fresh access key and reason; routine admin WS is intentionally private-free. Do not add frontend authoritative calculations or a second socket implementation.

## Verified gaps and implementation order

1. Runtime safety: receipts were keyed only by action ID, persistence reads could escape quarantine handling, and broadcast failures could quarantine a committed transition. Bind receipts to actor and command, isolate observers, and queue server deadlines/presence with player actions.
2. Server composition: persist/recover lobbies as well as games; issue room-scoped admin realtime sessions; authorize every socket operation; replace stale sockets and schedule canonical deadlines.
3. Browser integration: consolidate duplicated transport into browser-safe client-core. Keep the existing board/UI, remove production demo paths, and render only authenticated snapshots.
4. Verification: real-socket two-room/adversarial tests, browser journeys, restart/recovery checks, privacy payload inspection, build/type/audit/performance checks.

These are repairs within the approved modular monolith, not a new architecture or new gameplay.

## Ownership / collision boundaries

| Area | Owner | Integration boundary |
| --- | --- | --- |
| Runtime, game engine, persistence, deadlines, backend tests | Astra/Codex | Canonical rules, serialized transitions, persistence-before-swap |
| HTTP, sessions, lobby/socket lifecycle, contracts/client-core | Astra/Codex | One editor for shared contracts; notify Claude of contract changes |
| Player/Projector/Admin frontend, CSS, browser/visual QA | Claude | Preserve existing light-premium-tabletop UI and client-core integration |
| Workspace manifests/lockfile, shared contract files, agent records | Explicit single-editor coordination | No simultaneous edits or blanket staging of another agent's changes |

## Verification policy

Test outcomes are recorded only after execution. Live PostgreSQL and event-hardware claims require actual runs; mocks do not establish those results. Unrelated `.claude-flow` state and other agents' work must not be reverted or silently committed.
