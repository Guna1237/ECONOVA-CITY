# ECONOVA: CITY
# PHASE 0 GAME-CONTENT STRUCTURE (SUPERSEDED)

This document preserves the Phase 0 structure that was used to identify missing data-driven ECONOVA: CITY game content.

It is no longer an implementation source. The approved values, catalogs, formulas, and gameplay rules are in `docs/GAME_DESIGN_SPEC.md`; that specification wins if this historical template conflicts with it.

---

# 1. CURRENT STATUS

Specification structure: SUPERSEDED BY `docs/GAME_DESIGN_SPEC.md`

Gameplay content: APPROVED

Approved content set: `docs/GAME_DESIGN_SPEC.md` Version 2.0

Implementation status: NOT STARTED

The marker below must be used for every value that has not been explicitly approved:

`UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED`

An unspecified value is not a default, zero, empty collection, random choice, or permission for an agent to choose a value.

---

# 2. AUTHORITY AND CHANGE CONTROL

This file was the intended canonical location for approved game-content values before the complete specification was supplied and reviewed.

Current authority:

- approved gameplay rules and content are authoritative in `docs/GAME_DESIGN_SPEC.md`
- approved permanent decisions remain authoritative in `docs/DECISIONS.md`
- DECISION-044, DECISION-045, and DECISION-046 are APPROVED
- no client, server, test fixture, seed file, or visual mockup may invent a missing value
- this historical template's `UNSPECIFIED` markers do not override approved values in `docs/GAME_DESIGN_SPEC.md`

Any approved content change must update this file, affected rules, implementation, tests, and the decision log when the change is material.

---

# 3. APPROVED FIXED CONSTRAINTS

These constraints already exist in `docs/GAME_RULES.md`. They are referenced here to define the envelope for later content population, not to create new rules.

| Constraint | Approved value | Source |
|---|---:|---|
| Standard players per room | 4–6 | `GAME_RULES.md` sections 3 and 84 |
| Standard rounds | 8 | `GAME_RULES.md` sections 4 and 84 |
| Properties | 16 | `GAME_RULES.md` sections 8 and 84 |
| Districts | 4 | `GAME_RULES.md` sections 8, 9, and 84 |
| Named districts | Food, Tech, Entertainment, Mobility | `GAME_RULES.md` section 8 |
| Primary currency | City Credits | `GAME_RULES.md` sections 6 and 84 |
| Strategic voting resource | Influence | `GAME_RULES.md` sections 6 and 30 |
| Simultaneous event rooms | 2 independent rooms | `GAME_RULES.md` sections 72 and 84; `PRODUCT.md` section 8 |

No other numerical value or content record is approved merely because a field appears below.

---

# 4. CONTENT-SET METADATA

Every approved content set must declare:

| Field | Purpose | Current value |
|---|---|---|
| Content set ID | Stable identifier for the complete content set | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Content version | Version used by games, snapshots, logs, and replays | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Rules revision | Rules revision with which the content is compatible | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Status | Draft, approved, superseded, or equivalent controlled state | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Approved by | Authorized product owner | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Approval date | Date the content set became approved | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Integrity identifier | Deterministic identifier used to detect mismatched content | UNSPECIFIED — TECHNICAL IMPLEMENTATION NOT STARTED |

---

# 5. GAME SETUP CONTENT

The canonical setup record must contain the following fields. Values not fixed in section 3 remain unspecified.

| Field | Required definition | Current value |
|---|---|---|
| Starting City Credits | Amount granted to each player at game start | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Starting Influence | Amount granted to each player at game start | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Initial card allocation | Count and method for initial Strategy Cards | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Initial objective allocation | Count and method for Secret Objectives | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Player-order rule | How initial order is determined | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Initial demand state | Starting demand for every district | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Starting property state | Initial ownership and development state | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Setup randomization rules | Server-owned random choices, if any | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |

---

# 6. ROUND, TURN, AND PHASE CONTENT

The lifecycle specification must define:

| Field | Required definition | Current value |
|---|---|---|
| Canonical phase order | Complete ordered list of phases and subphases | DEFINED — `docs/GAME_DESIGN_SPEC.md` Section 8 |
| Round entry conditions | State required to start each round | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Turn order | How players receive turns or action opportunities | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Allowed actions per phase | Exact action allowlist for every phase | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Action limits | Counts, cooldowns, or restrictions where applicable | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Turn completion rule | Manual, automatic, timed, or other approved boundary | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Round-resolution formula | Income, costs, demand, and other ordered resolution steps | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Market/event boundary | Exact point at which market and event changes take effect | DEFINED — `docs/GAME_DESIGN_SPEC.md` Section 8.2 |
| Council boundary | Exact Council entry, policy-effective, and exit points | DEFINED — `docs/GAME_DESIGN_SPEC.md` Sections 8.3 and 23 |
| Final-round boundary | Exact transition from Round 8 into final scoring | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |

---

# 7. DISTRICT CONTENT STRUCTURE

Each district record must use one stable identity across rules, game state, logs, server projections, clients, and tests.

| Field | Required definition | Current value |
|---|---|---|
| District ID | Stable machine identifier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Display name | Player-facing district name | Defined only by the names referenced in section 3; canonical records not populated |
| Description | Player-facing strategic description | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Initial demand | Starting demand value or tier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Demand bounds | Minimum and maximum legal demand | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Demand/value relationship | Exact effect of demand on property value or income | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Visual reference | Approved visual token or asset reference | UNSPECIFIED — VISUAL CONTENT NOT APPROVED |

No district record is complete until all gameplay-affecting fields are approved.

---

# 8. PROPERTY CONTENT STRUCTURE

Exactly 16 canonical property records are required by `docs/GAME_RULES.md`. This Phase 0 document does not create or name those records.

Each property record must contain:

| Field | Required definition | Current value |
|---|---|---|
| Property ID | Unique stable identifier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Name | Player-facing property name | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| District ID | Reference to one canonical district | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Purchase price | City Credit cost to purchase | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Base income/value | Approved base economic value and its meaning | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Development cost | Cost for each permitted development action or level | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Maximum level | Highest legal development level | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Strategic characteristics | Any rule-defined special characteristics | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Initial owner | Starting ownership state | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Initial development level | Starting development state | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Visual reference | Approved property art or visual token reference | UNSPECIFIED — VISUAL CONTENT NOT APPROVED |

Runtime fields such as current owner and current development level belong to authoritative game state. They are not mutable content values.

---

# 9. ECONOMY AND DEMAND CONTENT STRUCTURE

The content set must define every input used by the server's economic calculations.

| Field | Required definition | Current value |
|---|---|---|
| Demand representation | Legal values or tiers and their meaning | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Demand-change rules | Permitted changes and bounds | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Property income formula | Exact inputs, order, rounding, and result | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Property value formula | Exact inputs, order, rounding, and result | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Development effect | Exact economic effect of each level | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Round income timing | Phase in which income is calculated and credited | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Rounding rule | Integer or rounding behavior for all calculations | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Financial-failure behavior | Legal recovery actions and resulting state | DEFINED — `docs/GAME_DESIGN_SPEC.md` Section 28 |

---

# 10. BREAKING NEWS AND EVENT CONTENT STRUCTURE

Each event record must contain enough information for one deterministic server interpretation.

| Field | Required definition | Current value |
|---|---|---|
| Event ID | Unique stable identifier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Title | Public event title | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Description | Player-facing explanation | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Selection rule | Eligibility, deck behavior, or approved selection method | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Timing | Exact lifecycle point at which the event resolves | DEFINED — `docs/GAME_DESIGN_SPEC.md` Sections 8 and 22 |
| Effect | Complete authoritative state change | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Duration | Instant, fixed duration, or explicit expiry boundary | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Interaction rule | Stacking, precedence, and conflict behavior | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Visibility | Public and private information produced by the event | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Presentation reference | Approved visual/audio presentation reference | UNSPECIFIED — VISUAL CONTENT NOT APPROVED |

The event catalog is empty until approved records are supplied.

---

# 11. STRATEGY CARD CONTENT STRUCTURE

Each Strategy Card record must contain:

| Field | Required definition | Current value |
|---|---|---|
| Card ID | Unique stable identifier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Name | Player-facing name | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Description | Complete player-facing effect text | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Acquisition rule | How and when the card may be obtained | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Play timing | Phases and conditions in which the card may be used | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Target rule | Legal targets, if any | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Cost | Resource cost, if any | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Effect | Complete authoritative state transition | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Duration | Instant, fixed duration, or explicit expiry boundary | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Interaction rule | Stacking, precedence, cancellation, and conflict behavior | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Consumption rule | Exact point at which the card is consumed | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Visibility | Information revealed before, during, and after use | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Presentation reference | Approved visual/audio presentation reference | UNSPECIFIED — VISUAL CONTENT NOT APPROVED |

The card catalog is empty until approved records are supplied.

---

# 12. SECRET OBJECTIVE CONTENT STRUCTURE

Each Secret Objective record must contain:

| Field | Required definition | Current value |
|---|---|---|
| Objective ID | Unique stable identifier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Name | Player-facing private name | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Description | Complete private completion condition | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Assignment rule | Eligibility and server-owned allocation method | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Evaluation rule | Deterministic server calculation | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Bonus | Exact final-scoring effect | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Reveal rule | When and to whom the objective/result becomes visible | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |

The objective catalog is empty until approved records are supplied.

---

# 13. CITY COUNCIL AND POLICY CONTENT STRUCTURE

Each policy option must contain:

| Field | Required definition | Current value |
|---|---|---|
| Policy ID | Unique stable identifier | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Name | Player-facing policy name | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Description | Complete player-facing effect text | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Council availability | Council session or condition in which it may appear | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Voting rule | Influence use, vote limits, and legal submissions | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Tie rule | Deterministic outcome for tied voting | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Effect | Complete authoritative state change | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Effective boundary | Exact point at which the policy begins to apply | DEFINED — `docs/GAME_DESIGN_SPEC.md` Sections 8.3 and 23 |
| Duration/expiry | Exact point at which the policy stops applying | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Interaction rule | Stacking, replacement, and precedence behavior | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Visibility | Private vote data and public result data | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Presentation reference | Approved visual/audio presentation reference | UNSPECIFIED — VISUAL CONTENT NOT APPROVED |

The policy catalog is empty until approved records are supplied.

---

# 14. TRADE AND SELLING CONTENT STRUCTURE

The trade specification must define:

| Field | Required definition | Current value |
|---|---|---|
| Tradable asset types | Exact set of resources/assets that may be offered | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Proposal timing | Phases and conditions in which a trade may be proposed | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Acceptance timing | Conditions under which acceptance remains valid | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Expiry/cancellation | Exact invalidation and cancellation rules | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Concurrent-change behavior | Revalidation when referenced state changes | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Visibility | Public and private trade information | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |

The direct-selling specification must define eligibility, price/value, timing, ownership transfer, demand interaction, and scoring interaction if selling is approved.

Direct selling status: APPROVED — no voluntary direct bank selling; emergency bank sale exists only for mandatory landing-fee recovery under `docs/GAME_DESIGN_SPEC.md` Section 28.2.

The approved emergency-sale formula and behavior exist only in `docs/GAME_DESIGN_SPEC.md`; this superseded template must not be implemented.

---

# 15. SCORING CONTENT STRUCTURE

The scoring specification must define every term used by the server and must produce a deterministic breakdown.

| Field | Required definition | Current value |
|---|---|---|
| City Credit contribution | Exact scoring treatment of final City Credits | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Property contribution | Exact final property-value calculation | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Development contribution | Exact scoring effect of development | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Objective contribution | Exact bonus per approved objective | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Other bonuses | Complete list and exact formula for any other valid bonus | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Calculation order | Ordered scoring operations and rounding | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Tie-break inputs | Values required by the rule-defined tie-break order | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |
| Reveal breakdown | Public and private fields shown at game end | UNSPECIFIED — PRODUCT OWNER DECISION REQUIRED |

The scoring formula is not implementation-ready.

---

# 16. CONTENT VALIDATION REQUIREMENTS

Before a content set may be marked approved, validation must confirm:

- every required record has a unique stable ID
- exactly the rule-defined number of property and district records exists
- every reference resolves to a record in the same approved content set
- all numerical fields have explicit legal bounds
- all formulas define operation order and rounding
- every duration has an explicit start and expiry boundary
- every random selection defines its eligible set and is performed by the authoritative server
- every effect has one unambiguous server interpretation
- every content item declares its public/private visibility
- every card, event, policy, objective, property, and scoring rule has tests
- the active canonical content set contains no unresolved gameplay-affecting value
- the content set has a recorded product-owner approval

These validation requirements define readiness checks; they do not supply missing content.

---

# 17. RESOLVED DECISION INDEX

| Decision | Conflict | Status | Implementation effect |
|---|---|---|---|
| DECISION-044 | Market/event ordering | APPROVED | Implement `docs/GAME_DESIGN_SPEC.md` Section 8 |
| DECISION-045 | City Council timing/boundary | APPROVED | Implement `docs/GAME_DESIGN_SPEC.md` Sections 8.3 and 23 |
| DECISION-046 | Selling mechanic | APPROVED | Implement `docs/GAME_DESIGN_SPEC.md` Section 28 |

See `docs/DECISIONS.md` for the full conflict records, options, impacts, and recommendations.

---

# 18. COMPLETION GATE (HISTORICAL)

This Phase 0 structure is superseded and is not an implementation gate. Its former gate was satisfied when the product owner approved `docs/GAME_DESIGN_SPEC.md` Version 2.0, including DECISION-044, DECISION-045, and DECISION-046.

GAMEPLAY CONTENT: APPROVED IN `docs/GAME_DESIGN_SPEC.md`

---

# END OF CANONICAL GAME-CONTENT SPECIFICATION
