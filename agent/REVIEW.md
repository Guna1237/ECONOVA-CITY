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
