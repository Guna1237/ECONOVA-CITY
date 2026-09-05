# ECONOVA: CITY
# REVIEW QUEUE

This file records bugs, security issues, architectural concerns, performance problems, gameplay inconsistencies, and QA findings.

---

## RESOLVED GAME-DESIGN FINDINGS

### REVIEW-002

Severity: CRITICAL

Area: Gameplay lifecycle

Found By: Codex

Date: 2026-09-04

Status: RESOLVED — DECISION-044 APPROVED

Problem:

Before resolution, `docs/PRODUCT.md` section 9 placed player/game actions before market/event changes, while `docs/GAME_RULES.md` section 40 placed the event/market update before player actions and section 73 placed Breaking News/market changes around the next-round boundary.

Reproduction:

Compare the ordered flow in `PRODUCT.md` section 9 with `GAME_RULES.md` sections 40 and 73.

Impact:

Different implementations would use different market conditions for actions and economic resolution, causing rule divergence and state-integrity failures.

Recommended Fix:

Implement the canonical transition order in `docs/GAME_DESIGN_SPEC.md` Section 8 and keep affected source documents and tests aligned.

Required Test:

Deterministic full-round transition tests proving the approved event, market, action, resolution, and next-round ordering.

Resolution:

Resolved by product-owner approval: Breaking News and market/event changes occur at round start before player turns. Documentation is synchronized; deterministic engine tests remain required in Phase 1.

---

### REVIEW-003

Severity: CRITICAL

Area: City Council lifecycle

Found By: Codex

Date: 2026-09-04

Status: RESOLVED — DECISION-045 APPROVED

Problem:

Before resolution, `docs/GAME_RULES.md` section 29 said City Council occurred after Round 3 and Round 6, while section 40 placed City Council before round resolution. The policy-effective boundary was not defined.

Reproduction:

Compare `GAME_RULES.md` section 29 with the ordered phase flow in section 40.

Impact:

A policy may or may not affect the current round's resolution depending on interpretation, changing economy, scoring, duration, and client timing.

Recommended Fix:

Implement the approved Council subphase and policy boundary in `docs/GAME_DESIGN_SPEC.md` Sections 8.3 and 23.

Required Test:

Boundary tests around Rounds 3 and 6, including vote closure, policy activation, round resolution, expiry, and reconnect during Council.

Resolution:

Resolved by product-owner approval: Council occurs at the start of Rounds 3 and 6 after Breaking News and before player turns; the winning policy takes effect immediately. Boundary tests remain required in Phase 1.

---

### REVIEW-004

Severity: HIGH

Area: Selling and financial recovery

Found By: Codex

Date: 2026-09-04

Status: RESOLVED — DECISION-046 APPROVED

Problem:

Before resolution, `docs/PRODUCT.md` section 11 presented “hold or sell” as a strategy example. `docs/GAME_RULES.md` section 46 conditionally mentioned selling, while section 48 stated that no selling mechanic or value was defined and selling was not automatically permitted.

Reproduction:

Compare `PRODUCT.md` section 11 with `GAME_RULES.md` sections 46 and 48.

Impact:

Selling cannot be implemented or advertised consistently. Inventing it would change balance, financial recovery, property state, scoring, UI, and tests.

Recommended Fix:

Implement no voluntary direct bank selling and the mandatory-payment emergency sale defined in `docs/GAME_DESIGN_SPEC.md` Section 28.2.

Required Test:

Tests for the approved absence or presence of selling, including ownership transfer, valuation, concurrent actions, duplicate requests, and scoring.

Resolution:

Resolved by product-owner approval: emergency bank sale is available only for mandatory landing-fee recovery at 50% of current Property Value, with deterministic timeout/disconnect liquidation. Engine tests remain required in Phase 1.

---

### REVIEW-005

Severity: CRITICAL

Area: Canonical gameplay content

Found By: Codex

Date: 2026-09-04

Status: RESOLVED — CANONICAL CONTENT APPROVED

Problem:

Gameplay-affecting property values, formulas, card effects, event effects, policy effects, objective values, trade details, and scoring values are not fully specified.

Reproduction:

Review `docs/GAME_RULES.md` section 83 and the `UNSPECIFIED` fields in `docs/GAME_CONTENT.md`.

Impact:

The authoritative game engine cannot be implemented faithfully, balanced, or tested end to end without inventing rules.

Recommended Fix:

Implement the approved versioned content set in `docs/GAME_DESIGN_SPEC.md` Version 2.0.

Required Test:

Content-schema validation, referential-integrity checks, deterministic rule tests, scoring tests, and content completeness checks that reject unspecified gameplay values.

Resolution:

Resolved by product-owner approval of `docs/GAME_DESIGN_SPEC.md` Version 2.0. Content-schema, integrity, rule, and scoring tests remain required in Phase 1.

---

## OTHER RESOLVED FINDINGS

### REVIEW-001

Severity: MEDIUM

Area: Documentation structure

Found By: Codex

Date: 2026-09-04

Status: RESOLVED IN PHASE 0

Problem:

Eight Markdown files contained an unclosed fenced block, causing later requirements to render as code instead of normal documentation.

Reproduction:

Count opening and closing fence delimiters in `AGENTS.md`, `README.md`, `docs/PRODUCT.md`, `docs/GAME_RULES.md`, `docs/SECURITY.md`, `docs/PERFORMANCE.md`, `docs/TESTING.md`, and `docs/VISUAL_SYSTEM.md` before the Phase 0 repair.

Impact:

Headings and requirements after the unclosed blocks were visually obscured and difficult for humans and agents to navigate.

Recommended Fix:

Close each existing fence at the end of its intended template or diagram without altering its contents.

Required Test:

Repository-wide Markdown fence-balance check and structural validation.

Resolution:

Closing delimiters were added at the eight intended boundaries. Requirement wording and diagrams were not changed.

---

## RESOLVED PHASE 1 CHECKPOINT FINDINGS

### REVIEW-006

Severity: HIGH

Area: Trade lifecycle

Status: RESOLVED

Problem: A pending trade caused normal turn completion and timeout to throw `TRADE_PENDING`, which could quarantine the room.

Resolution: Turn completion now clears the trade, emits the existing `trade_rejected` event, and advances normally.

Required Test: Pending-trade timeout clears state and advances the turn without throwing. PASS.

### REVIEW-007

Severity: HIGH

Area: Turn timers

Status: RESOLVED

Problem: Auction and emergency-sale sub-phases ran without pausing the normal 60-second turn deadline.

Resolution: Both sub-phases now store remaining normal-turn time, clear the normal deadline, and restore/clear stored time on manual completion, timeout, and disconnect completion.

Required Test: Auction and emergency-sale manual, timeout, and disconnect paths preserve remaining time. PASS.

### REVIEW-008

Severity: MEDIUM

Area: Build foundation

Status: RESOLVED

Problem: Vite clients had no `index.html` entry documents, so the root production build failed.

Resolution: Added minimal entry documents and React roots for player, projector, and admin clients without implementing Phase 2 UI.

Required Test: Root `npm run build`. PASS.

### REVIEW-009

Severity: MEDIUM

Area: Calculation precedence

Status: RESOLVED — IMPLEMENTATION CONFIRMED CORRECT

Problem: Overlap between temporary multipliers and policy additives lacked an explicit regression test.

Resolution: Added income and landing-fee overlap tests confirming temporary modifiers apply before policy additives and clamps remain in the approved position.

Required Test: Modifier-overlap calculation tests. PASS.

### REVIEW-010

Severity: HIGH

Area: Reconnect timeout

Status: RESOLVED

Problem: Reconnect timeout during `awaiting_event_choice` or `awaiting_card_discard` threw `MANUAL_CHOICE_REQUIRED` and could halt progression.

Resolution: The server now chooses the first canonical district whose demand can change, or the first canonical district if all are clamped, and discards the lowest Strategy Card ID; both use the same resolution helpers as manual choices.

Required Test: Both reconnect-timeout pending-choice paths resolve deterministically and advance. PASS.

### REVIEW-011

Severity: MEDIUM

Area: Command validation

Status: RESOLVED

Problem: `select_event_district` accepted any generic identifier at the network boundary.

Resolution: The command now uses `districtIdSchema`. Council IDs remain bounded generic protocol identifiers and are matched against authoritative Council state.

Required Test: Reject a syntactically valid but non-canonical district. PASS.

### REVIEW-012

Severity: HIGH

Area: Council timer isolation

Status: RESOLVED

Problem: Entering a separately timed Council phase retained the completed player's stale turn and normal deadline.

Resolution: Round entry clears completed turn state before Council/strategy-draw processing; a new turn is created only when player-turn phase begins.

Required Test: Round 3 Council begins with `turn === null` and its own deadline. PASS.

---

## REVIEW ITEM FORMAT

### REVIEW-XXX

Severity:

Area:

Found By:

Date:

Status:

Problem:

Reproduction:

Impact:

Recommended Fix:

Required Test:

Resolution:
