# ECONOVA: CITY
# ACTIVE TASKS

This file tracks authorized work and its ownership.

No agent should invent major tasks without authorization.

## Engineering hardening checkpoint — 2026-09-07

Owner: Codex. Source fixes and regression coverage completed for shared-IP two-room joining, offline phase-opening effects, invariant validation, rejection traffic and Round 4 discard integration. Full two-room six-player games finish all eight rounds in real-socket regression coverage. See `docs/qa/HARDENING_2026-09-07.md`.

Remaining: REVIEW-025 needs the owner's offline Round 4 timer decision; REVIEW-026 needs live authenticated transport verification/logs. PostgreSQL recovery rerun needs an available dedicated test database. Claude retains frontend/browser ownership; the existing discard dialog received only two capability-routing guard changes. Event rehearsal, sustained soak and browser release gates remain open.

## Current Phase 2 integration checkpoint — 2026-09-06

Owner: Codex. Runtime/server/client-core changes are implemented in the shared working tree; verification is recorded in `docs/qa/PHASE2_ENGINEERING_PASS.md`. Preserve all concurrent light-premium-tabletop frontend work.

Completed this continuation: REVIEW-018 connected timeout emergency-sale fix; REVIEW-019 owner-approved pause/frozen reconnect/deferred disconnect effects; client-core adapter integration; timing-specific card capability repair; recovered game identity/version binding checks; 12-player/two-room real socket privacy/replacement-reconnect regression; opt-in real PostgreSQL process-recovery infrastructure.

Live PostgreSQL verification: COMPLETE for the existing process-recovery suite on PostgreSQL 18.6 / dedicated econova_test. Targeted test executed and passed; full suite executed 243 tests with no skips. Fresh-schema migrations 001–004 and idempotent repeat passed. No code/config/credential changes required.

Remaining / owner: Claude — REVIEW-023 shared UI crest asset packaging build failure, browser reconnect/refresh/uncertain-result/private-inspection completion and frontend QA, preserving light-premium-tabletop visuals. Astra — complete canonical catalog trace audit, performance/failure soak, event startup/backup/restore rehearsal. Phase 2 is not release-complete. Contracts, client-core, root workspace configuration, and agent records require one active editor; Astra does not edit Claude's CSS/UI in parallel.

---

## COMPLETED TASK

### TASK-P0-001 — Documentation baseline

Owner: Codex

Status: COMPLETE

Scope:

- repair broken Markdown code fences without changing requirements
- record the market/event ordering conflict
- record the City Council timing/boundary conflict
- record the selling-mechanic conflict
- establish a structure-only canonical game-content specification
- populate agent coordination records
- validate documentation consistency and Markdown structure
- initialize Git and create one documentation baseline commit

Dependencies:

- Product-owner approval for Phase 0: SATISFIED
- Approved technical architecture assessment: SATISFIED

Out of scope:

- application/framework initialization
- production dependency installation
- frontend, backend, game engine, WebSocket, or database implementation
- gameplay-value invention or approval
- visual redesign
- architecture changes

Completion criteria:

- all Markdown fences are balanced
- the three conflicts are recorded for product-owner resolution (they were later approved on 2026-09-04)
- every unapproved content value remains visibly unspecified
- agent coordination files reflect the Phase 0 state
- consistency checks complete without unrecorded conflicts
- documentation baseline commit exists
- Git worktree is clean after the commit

Verification:

- Markdown/document structure validation: PASS
- Cross-document key-constraint consistency audit: PASS
- Known unresolved conflicts recorded: 3
- Production implementation/artifact scan: PASS
- Git baseline: the commit containing this record

---

### TASK-GD-001 — Lock approved gameplay clarifications

Owner: Codex

Status: COMPLETE

Scope:

- apply the approved City Center and Entertainment movement rule
- define SC12 Insurance Policy as a landing-fee reaction exception
- define sequential Secret Objective setup for 4–6 players
- define deterministic emergency-sale timeout and disconnect behavior
- define universal modifier precedence
- define normal-turn and sub-phase timer interaction
- finalize DECISION-045 and DECISION-046
- synchronize affected documentation and run a repository-wide consistency audit

Completion criteria:

- the exact approved rules are present in `docs/GAME_DESIGN_SPEC.md`
- repeated implementation-critical references agree
- DECISION-044, DECISION-045, and DECISION-046 are APPROVED
- superseded source documents cannot override the canonical specification
- documentation validation and consistency checks pass
- no production implementation has started

---

## RESOLVED PRODUCT DECISIONS

### TASK-PO-001 — Approve market/event ordering

Owner: Product owner

Status: RESOLVED — APPROVED

Decision record: `docs/DECISIONS.md` DECISION-044

### TASK-PO-002 — Approve City Council timing and effect boundary

Owner: Product owner

Status: RESOLVED — APPROVED

Decision record: `docs/DECISIONS.md` DECISION-045

### TASK-PO-003 — Approve the initial-release selling boundary

Owner: Product owner

Status: RESOLVED — APPROVED

Decision record: `docs/DECISIONS.md` DECISION-046

### TASK-PO-004 — Supply and approve the canonical gameplay content

Owner: Product owner

Status: RESOLVED — APPROVED

Specification: `docs/GAME_DESIGN_SPEC.md`

---

## COMPLETED PHASE 1 TASK

### TASK-P1-001 — Foundation and authoritative game engine

Owner: Codex

Status: COMPLETE

Authorization: Product owner approved Phase 1 after completion of the gameplay documentation lock and consistency audit.

Scope: Follow the attached Phase 1 brief using `docs/GAME_DESIGN_SPEC.md` as the gameplay source of truth. Phase 1 includes the project foundation, shared contracts/content, authoritative game engine and room runtime, protocol/persistence foundations, isolation, recovery, health endpoints, and critical automated tests.

Dependencies:

- Approved architecture: SATISFIED
- Approved canonical gameplay specification: SATISFIED
- Documentation consistency audit: SATISFIED

Outputs:

- npm workspace foundation for three React/Vite clients, Fastify server, and shared packages
- strict shared Zod contracts and centralized locked game content
- deterministic authoritative game engine with invariant checks and state projections
- isolated serialized room runtimes, authenticated sessions, WebSocket foundation, persistence/recovery foundation, health endpoints, and initial PostgreSQL migration
- regression coverage for checkpoint defects, including trade timeout, sub-phase timers, reconnect fallbacks, modifier precedence, and district validation

Verification:

- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm test`: PASS (84/84)

Do not start Phase 2 automatically.

---

## NOT AUTHORIZED

Phase 2 and work beyond the approved Phase 1 brief remain NOT AUTHORIZED.

---

## TASK RULES

- Every major task should have a unique ID.
- Every task should have an owner.
- Do not work on a task already assigned to another agent unless explicitly requested.
- Dependencies must be identified before starting.
- Completed tasks must include verification/testing information.
- A `PROPOSED` decision is not implementation authorization.
