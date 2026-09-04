# ECONOVA: CITY
# ACTIVE TASKS

This file tracks authorized work and its ownership.

No agent should invent major tasks without authorization.

---

## CURRENT AUTHORIZED TASK

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
- the three conflicts are recorded as unresolved `PROPOSED` decisions
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

## BLOCKED PRODUCT DECISIONS

### TASK-PO-001 — Approve market/event ordering

Owner: Product owner

Status: BLOCKED PENDING PRODUCT DECISION

Decision record: `docs/DECISIONS.md` DECISION-044

### TASK-PO-002 — Approve City Council timing and effect boundary

Owner: Product owner

Status: BLOCKED PENDING PRODUCT DECISION

Decision record: `docs/DECISIONS.md` DECISION-045

### TASK-PO-003 — Approve or reject a direct selling mechanic

Owner: Product owner

Status: BLOCKED PENDING PRODUCT DECISION

Decision record: `docs/DECISIONS.md` DECISION-046

### TASK-PO-004 — Supply and approve the canonical gameplay content

Owner: Product owner

Status: BLOCKED PENDING PRODUCT DECISIONS

Specification: `docs/GAME_CONTENT.md`

---

## NOT AUTHORIZED

Phase 1 and all production implementation remain NOT STARTED. No agent may begin them without explicit product-owner approval.

---

## TASK RULES

- Every major task should have a unique ID.
- Every task should have an owner.
- Do not work on a task already assigned to another agent unless explicitly requested.
- Dependencies must be identified before starting.
- Completed tasks must include verification/testing information.
- A `PROPOSED` decision is not implementation authorization.
