# ECONOVA: CITY
# REVIEW QUEUE

This file records bugs, security issues, architectural concerns, performance problems, gameplay inconsistencies, and QA findings.

---

## OPEN FINDINGS

### REVIEW-002

Severity: CRITICAL

Area: Gameplay lifecycle

Found By: Codex

Date: 2026-09-04

Status: BLOCKED PENDING PRODUCT OWNER — DECISION-044 PROPOSED

Problem:

`docs/PRODUCT.md` section 9 places player/game actions before market/event changes, while `docs/GAME_RULES.md` section 40 places the event/market update before player actions and section 73 places Breaking News/market changes around the next-round boundary.

Reproduction:

Compare the ordered flow in `PRODUCT.md` section 9 with `GAME_RULES.md` sections 40 and 73.

Impact:

Different implementations would use different market conditions for actions and economic resolution, causing rule divergence and state-integrity failures.

Recommended Fix:

Product owner approves one canonical transition order using DECISION-044, then all affected source documents and tests are updated together.

Required Test:

Deterministic full-round transition tests proving the approved event, market, action, resolution, and next-round ordering.

Resolution:

Unresolved. No affected gameplay implementation is authorized.

---

### REVIEW-003

Severity: CRITICAL

Area: City Council lifecycle

Found By: Codex

Date: 2026-09-04

Status: BLOCKED PENDING PRODUCT OWNER — DECISION-045 PROPOSED

Problem:

`docs/GAME_RULES.md` section 29 says City Council occurs after Round 3 and Round 6, while section 40 places City Council before round resolution. The policy-effective boundary is not defined.

Reproduction:

Compare `GAME_RULES.md` section 29 with the ordered phase flow in section 40.

Impact:

A policy may or may not affect the current round's resolution depending on interpretation, changing economy, scoring, duration, and client timing.

Recommended Fix:

Product owner defines the Council subphase, policy-effective start, and expiry boundary using DECISION-045.

Required Test:

Boundary tests around Rounds 3 and 6, including vote closure, policy activation, round resolution, expiry, and reconnect during Council.

Resolution:

Unresolved. Council and policy timing implementation is not authorized.

---

### REVIEW-004

Severity: HIGH

Area: Selling and financial recovery

Found By: Codex

Date: 2026-09-04

Status: BLOCKED PENDING PRODUCT OWNER — DECISION-046 PROPOSED

Problem:

`docs/PRODUCT.md` section 11 presents “hold or sell” as a strategy example. `docs/GAME_RULES.md` section 46 conditionally mentions selling, while section 48 states that no selling mechanic or value is defined and selling is not automatically permitted.

Reproduction:

Compare `PRODUCT.md` section 11 with `GAME_RULES.md` sections 46 and 48.

Impact:

Selling cannot be implemented or advertised consistently. Inventing it would change balance, financial recovery, property state, scoring, UI, and tests.

Recommended Fix:

Product owner approves or rejects direct selling using DECISION-046. If approved, supply complete eligibility, value, timing, transfer, and interaction rules.

Required Test:

Tests for the approved absence or presence of selling, including ownership transfer, valuation, concurrent actions, duplicate requests, and scoring.

Resolution:

Unresolved. No selling action or formula exists.

---

### REVIEW-005

Severity: CRITICAL

Area: Canonical gameplay content

Found By: Codex

Date: 2026-09-04

Status: BLOCKED PENDING PRODUCT DECISIONS

Problem:

Gameplay-affecting property values, formulas, card effects, event effects, policy effects, objective values, trade details, and scoring values are not fully specified.

Reproduction:

Review `docs/GAME_RULES.md` section 83 and the `UNSPECIFIED` fields in `docs/GAME_CONTENT.md`.

Impact:

The authoritative game engine cannot be implemented faithfully, balanced, or tested end to end without inventing rules.

Recommended Fix:

Product owner supplies and approves a versioned canonical content set using the structure in `docs/GAME_CONTENT.md`.

Required Test:

Content-schema validation, referential-integrity checks, deterministic rule tests, scoring tests, and content completeness checks that reject unspecified gameplay values.

Resolution:

Unresolved. Gameplay content remains blocked.

---

## RESOLVED FINDINGS

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
