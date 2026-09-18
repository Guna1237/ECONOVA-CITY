# ECONOVA: CITY
# REVIEW QUEUE

This file records bugs, security issues, architectural concerns, performance problems, gameplay inconsistencies, and QA findings.

## Phone-only activity review, 2026-09-19

### REVIEW-035: Timer-version deployment boundary

ID: REVIEW-035
SEVERITY: HIGH
AREA: Deployment / saved-game recovery
FILE: packages/game-engine/src/invariants.ts
PROBLEM: Owner-approved 45-second turn bound rejects a legacy paused 60-second turn with more than 45 seconds saved.
REPRODUCTION: Recover a pre-change snapshot with remainingTurnMilliseconds = 50_000 under the new configuration.
IMPACT: That older game requires review rather than silently resuming with altered timing.
RECOMMENDED FIX: Deploy between games. If a pre-change game must continue, approve and test a versioned timer migration before deployment; do not discard or silently mutate saved games.
TEST REQUIRED: Legacy paused turn, auction, emergency sale and reconnect snapshots under the approved migration policy.
STATUS: OPEN deployment constraint. No production deployment attempted.

- Fixed: rotating turn order changed seat colours. Persist explicit join-order seat indexes, including JSONB key-order regression coverage.
- Fixed: engine events never reached phone notifications. New bounded receipt builder restricts rent/trades/resources to authorized participants and preserves persistence-before-publication.
- Fixed: NewsMoment effect cleanup canceled its dismissal timer on unrelated demand snapshots; the large banner could remain indefinitely. Replaced with persistent inline news/policy/history panel, no auto-overlay.
- Fixed during browser QA: inherited SVG overflow exposed the entire pawn sheet. Explicit clip paths preserve exact PNG pixels.
- Release caution: old paused normal-turn snapshots with >45 seconds remaining cannot satisfy the new timer invariant. Deploy between games, or agree and test a migration before resuming such a game. No silent mutation or weakened invariant was added.
- Remaining: authenticated event-phone/browser notification/reconnect rehearsal, opt-in PostgreSQL recovery, existing chunk-size warning follow-up. See `docs/qa/PHONE_ACTIVITY_2026-09-19.md`.

## REVIEW-034: Special spaces had no explanations and Innovation Hub implied the wrong reward

SEVERITY: MEDIUM

AREA: Player onboarding and rule presentation

FILE: packages/ui/src/board/BoardSpace.tsx; apps/player/src/App.tsx

PROBLEM: Special spaces rendered as non-interactive regions even on the Player board. Innovation Hub was labelled Strategy card, although GAME_DESIGN_SPEC section 21 assigns a random Special Event to all three non-City-Center special spaces.

REPRODUCTION: Previously, tap Innovation Hub or Observatory on the Player preview: no explanation appeared. Inspect the Innovation Hub label on a wide board.

IMPACT: First-time players could not discover what spaces do and could expect a guaranteed card from Innovation Hub.

RECOMMENDED FIX: Implemented read-only, keyboard-accessible explanations and the correct Random event label. City Council has its own help button and is not misrepresented as a space. Projector remains non-interactive.

TEST REQUIRED: Covered by `board-presentation.test.ts` and `board-help.test.ts`, plus Chromium checks of all four spaces and Council, phone/desktop focus behavior, and Projector markup.

STATUS: RESOLVED 2026-09-19. No rule or engine changes.

## REVIEW-033: Frontend bundle-size warnings need measured follow-up

SEVERITY: MEDIUM

AREA: Frontend loading performance

FILE: apps/player, apps/projector, apps/admin production bundles

PROBLEM: The final 2026-09-18 production build passes but Vite reports JavaScript chunks above its warning threshold. Measured raw/gzip bytes are Player 655,742/191,661, Projector 568,403/173,192, and Admin 539,598/157,015. Event-device startup cost has not been measured in this visual pass.

REPRODUCTION: Run `npm run build` and inspect the emitted app JavaScript assets and warnings.

IMPACT: Possible slower first load on student phones and shared event Wi-Fi. No startup failure was observed in the local browser checks.

RECOMMENDED FIX: Profile the entry dependency graphs and first-load cost, then split genuinely deferred functionality where it improves measured loading. Preserve shared contracts and package asset resolution. Do not merely increase warning limits or add speculative chunk configuration.

TEST REQUIRED: Production build, cold-cache mobile loading, action/guide availability after lazy-load failures, and existing multiplayer/browser regressions.

STATUS: OPEN. This follow-up does not invalidate the passing build or 402-test suite. See `docs/qa/BOARD_REFINEMENT_2026-09-18.md`.

## REVIEW-032: A database blip froze a live game

SEVERITY: HIGH

AREA: Persistence resilience

FILE: apps/server/src/persistence/postgres.ts; apps/server/src/persistence/transient.ts

PROBLEM: Every accepted and rejected command is persisted before a player sees it, and a failed write quarantines the room so memory never runs ahead of the database. That is right for a real conflict, but writes were single-attempt, so a dropped connection, reset socket or database failover quarantined a live game over a one-second network blip. Two defects made it worse: the catch ran ROLLBACK on the connection that had just died, and that second failure replaced the error that explained the first; and the failed connection went back to the pool, where a client-side query timeout can leave it open inside an aborted transaction for the next command to inherit.

IMPACT: On a hosted database, an ordinary transient failure ended a session mid-game, recoverable only by ending it early.

RECOMMENDED FIX: Implemented. Only connection-level failures (SQLSTATE class 08, 57P0x shutdowns, Node socket errors, pg's message-only terminations) are retried, three attempts with short backoff; anything the database refused on its merits still surfaces at once. Retries are idempotent: when a commit landed but its acknowledgement was lost, the transition write recognises its own version already stored, and the rejected-receipt write treats a unique violation on a retry as its own row. Rollback failures no longer mask the original error, and failed connections are destroyed rather than pooled.

TEST REQUIRED: `apps/server/test/postgres-transient.test.ts` covers classification, the attempt budget, loss before write, loss after commit, a genuine conflict (not retried), connection destruction and rollback masking. Still worth one live check against the deployed database.

STATUS: RESOLVED 2026-09-18.

## REVIEW-031: A rescued room never showed its results

SEVERITY: HIGH

AREA: Operator recovery (DECISION-050)

FILE: apps/server/src/rooms/room-runtime.ts

PROBLEM: Ending a quarantined room scored and persisted the game, but the quarantine flag was cleared after commit returned. Commit notifies observers synchronously, and the realtime layer reads that flag to decide what to send, so every screen was told the room was still under review. Nothing re-broadcast afterwards, so the table never saw the result the rescue existed to produce.

IMPACT: The rescue path worked in the runtime and failed in front of the players.

RECOMMENDED FIX: Implemented. The flag is lifted once the scoring transition has succeeded and before commit notifies anyone; a persistence failure re-quarantines through the existing catch, and a refused rescue leaves the room quarantined.

TEST REQUIRED: `end-game-rescue.test.ts` now asserts what observers see at notification time. Verified to fail against the previous code.

STATUS: RESOLVED 2026-09-18. Introduced in dddcf7e; the original test checked only final runtime state.

## REVIEW-030: Backend verification failures during the Nova UI pass

SEVERITY: HIGH

AREA: Release verification and concurrent backend integration

FILE: apps/server/test/app.test.ts:43; apps/server/test/admin-runtime.test.ts:138

PROBLEM: Twelve-player same-IP joining exceeds the 5-second test timeout. Admin end-game rejection returns ROOM_QUARANTINED where the existing test expects ADMIN_ACTION_UNAVAILABLE. The shared tree contains concurrent end-game/runtime changes; this report does not establish their correctness or change their intended behavior.

REPRODUCTION: Both fail in npm test and in an isolated one-worker run of these two server suites. Full result: 367 passed, 2 failed, 1 skipped. Isolated result: 14 passed, 2 failed.

IMPACT: Full verification is not green, so release readiness cannot be claimed despite UI build/tests passing.

RECOMMENDED FIX: Backend owner to reconcile the admin operation with its approved contract and investigate join timing. Preserve authorization and persistence guarantees; do not merely relax timeouts or change expected codes to hide a defect.

TEST REQUIRED: Existing server suites, full suite, end-game quarantine/auth regressions and two-room joining under expected load.

STATUS: RESOLVED 2026-09-18 by the backend owner of that slice.

- The admin end-game mismatch was mine and intended. `admin_end_game` is now an approved operator capability under DECISION-050, because reaching Round 8 was otherwise the only route to a score: an event that overran had no winner, and a quarantined room lost its session entirely. The guard test now asserts the authorization boundary (a player session forging it is refused) rather than unavailability. The ROOM_QUARANTINED code you saw was the intended rescue path being blocked by a second quarantine guard I had missed; it is fixed and covered.
- The twelve-player join timeout is a parallel-run timing flake, not a defect. `app.test.ts` passes in isolation and under `--maxWorkers=1`. Not papered over: no timeout was raised and no expected code was changed. It shares a cause with the private-inspection flake already recorded in `docs/qa/UX_AUDIT_2026-09-17.md`.
- Separately, while fixing this I introduced and then fixed a real determinism bug: `createInitialGame` briefly read `Date.now()` for the new objective deadline, so two identical setups could differ by a millisecond. `setup.test.ts` caught it. The clock now comes only from the caller.

## REVIEW-027: Council choices and privacy wording

SEVERITY: HIGH

AREA: Player Council form and private-information explanations

FILE: apps/player/src/components/decisions/Council.tsx; apps/player/src/components/Panels.tsx

PROBLEM: Option B always receives Influence not assigned to A, preventing abstaining or retaining Influence when the balance is positive. Text implies allocations are revealed after voting, contrary to canonical 23.2. Objective copy promises nobody else can see it despite approved protected operator inspection.

REPRODUCTION: Inspect Council dispatch: optionBInfluence = self.influence - toA. Zero total cannot be submitted with a positive balance. The existing engine accepts allocations totaling less than the balance. Objective browser dialog displays the absolute privacy promise.

IMPACT: Forced resource spending and misleading privacy expectations. This is a UI defect, not evidence of a server projection leak.

RECOMMENDED FIX: Independent bounded allocations, spent/kept summary, explicit Abstain; describe public totals and privacy from other players accurately.

TEST REQUIRED: Zero/partial/split/all allocation, duplicate/over-budget rejection, private projection and copy checks.

STATUS: RESOLVED 2026-09-18 in 84526dc. Independent bounded allocations for each option, a kept/spent readout with the points kept Influence is worth, an explicit Abstain, and privacy copy that says allocations are never shown to other players. No engine change: the server already accepted any total up to the balance.

## REVIEW-028: Player action reachability and misleading costs

SEVERITY: HIGH

AREA: Authoritative gameplay integration in Player controls

FILE: apps/player/src/components/ActionDock.tsx; apps/player/src/components/Panels.tsx; apps/player/src/state/briefing.ts

PROBLEM: Main Develop action depends on standing on an owned property although canonical 13.1 does not. Holdings inspection is a partial workaround. The existing change_demand command has no Player dispatch control. Base purchase/development costs are shown as payable amounts and base purchase price drives affordability despite modifiers.

REPRODUCTION: Trace ActionDock action_phase guards, search Player for change_demand (fixture only), and inspect basePrice/developmentCosts displays versus canonical modifier ordering.

IMPACT: Legal actions hidden, nonexistent restrictions taught, and potentially misleading purchase/development decisions. Server remains authoritative.

RECOMMENDED FIX: Property selection for Develop, capability-gated Influence control, authoritative quotes/target eligibility with the smallest reviewed projection addition if needed. Never clone engine calculations in the client.

TEST REQUIRED: Develop off-position and bought-this-turn rejection, Influence restrictions, modified-cost display/affordability, stale quote rejection and no optimistic mutations.

STATUS: RESOLVED 2026-09-18.

- Develop and Influence reachability fixed in 84526dc: Develop opens eligible holdings with no location requirement, and `change_demand` has a capability-gated control.
- Misleading costs fixed by adding server quotes. `quotePrices` in the engine prices through the same `purchasePriceFor` and `developmentCostFor` that charge the player, so a quote is exactly what is taken; `price-quotes.test.ts` proves quote equals charge for both. It is projected privately on `self.quotes` (optional in the contract, so fixtures still validate) and only during the player's own turn, since several modifiers are effects of the current turn. The client shows a quote plainly and any base figure labelled "base"; it never recomputes a modifier.
- Two latent bugs found alongside: the Buy button's affordability reason was unreachable because `buy_property` is granted regardless of credits, so unaffordable purchases only surfaced as a rejection; it now blocks on a quoted price, and deliberately never on a base one, which a discount could undercut. And the property panel offered Buy and Develop for whatever property was tapped, since capabilities describe the turn and not the property, so it offered purchases the server always refuses. The quotes now decide which property is buyable and which are developable.

## REVIEW-029: Shared dialog focus and required-decision affordances

SEVERITY: HIGH

AREA: Accessibility and timed decision usability

FILE: packages/ui/src/controls/Sheet.tsx; mandatory Player decision callers

PROBLEM: aria-modal is declared without trapping/restoring focus. Inline onClose changes can retrigger focus setup. Mandatory decisions supply a no-op close handler but display an active Close button.

REPRODUCTION: At 390x640, open Goal on the local Player demo and press Tab twice. document.activeElement.closest('[role=dialog]') is null while the dialog stays open. Inspect Council onClose={() => undefined}.

IMPACT: Keyboard focus reaches obscured controls; mandatory dialogs appear broken to users attempting to close them.

RECOMMENDED FIX: Stable focus lifecycle, trap/restore, background inertness/scroll handling, and honest dismissibility. Include a way to read help during required decisions without losing input or pausing timers.

TEST REQUIRED: Tab/Shift+Tab containment, Escape and close policy, restoration, rerender stability, stacked-help avoidance, short mobile and reduced-motion behavior.

STATUS: IMPLEMENTED 2026-09-18 using native modal Sheet, explicit dismissibility and help actions. Static regression and local browser Tab/Shift+Tab/Escape/focus-return checks pass. Live mandatory-decision/nested-help, screen-reader and device coverage remain release checks; see docs/qa/NOVA_THEME_2026-09-18.md.

## REVIEW-024 — RESOLVED, engineering integration hardening (2026-09-07)

SEVERITY: HIGH

AREA: Two-room joining, phase opening, state integrity, Round 4 integration

FILE: Server app/socket route; engine invariants/transitions/projections; Player discard guards

PROBLEM: Shared-IP join budget rejected player 11; already-disconnected players were not passed/abstained on phase opening; corrupt numeric/state values passed invariants; Round 4 discard capability/dialog was missing; rejected commands rebroadcast unchanged state to all room observers.

REPRODUCTION: Added regressions failed on the original implementations; corrected source passes targeted coverage. See `docs/qa/HARDENING_2026-09-07.md`.

IMPACT: Event setup failure, unnecessary voting waits, recovery/state integrity gaps, blocked mandatory choice and avoidable realtime traffic.

RECOMMENDED FIX: Implemented within existing architecture; canonical values unchanged.

TEST REQUIRED: New invariant, twelve-join, phase-opening, capability/UI routing and observer-traffic regressions; full two-room/eight-round socket journey.

STATUS: RESOLVED in this engineering pass.

## REVIEW-025 — Round 4 offline discard has no canonical timeout

SEVERITY: HIGH

AREA: Gameplay liveness/specification

FILE: docs/GAME_DESIGN_SPEC.md Sections 20.3/29; packages/game-engine/src/transitions.ts; apps/server/src/rooms/room-runtime.ts

PROBLEM: At Round 4 start, a full hand requires a discard in `strategy_draw`, outside a normal turn. The specification supplies no timeout for this choice; the runtime has no deadline in that phase.

REPRODUCTION: Give the pending Round 4 drawer a full hand, disconnect them, and observe `nextDeadlineAt()` remains null. Connected-choice integration is repaired separately under REVIEW-024.

IMPACT: Offline player can block round progression indefinitely.

RECOMMENDED FIX: Owner question submitted: apply a 60-second reconnect window, then discard the lowest card ID automatically. This is a proposal, not an approved rule.

TEST REQUIRED: Disconnected phase entry, disconnect/reconnect during the phase, expiry, operator pause, successive pending discards and successful round continuation.

STATUS: RESOLVED 2026-09-18 under DECISION-049. The approved rule is a 45-second deadline (not 60) with automatic discard of the lowest card ID, matching the existing expired-turn behaviour for the same decision.

FOLLOW-UP FOUND WHILE FIXING: `objective_selection` had the identical defect and was never filed. It is sequential, one player at a time, and had no deadline, so a single player who never picked prevented the game from starting at all. Fixed under the same decision. Both paths, the operator force command, and pause interaction are covered by `packages/game-engine/test/pending-decision-timeouts.test.ts`.

## REVIEW-026 — Live WebSocket close/authentication requires deployment investigation

SEVERITY: HIGH

AREA: Live deployment integration

FILE: Deployed `/ws` endpoint; apps/server/src/realtime/socket-route.ts

PROBLEM: Remote diagnostics upgraded sockets but did not receive expected authentication close frames within 12–15 seconds. Local real-socket rejection/reconnect tests pass. This observation does not establish a source-code vulnerability.

REPRODUCTION: Native Node ws client opens the production endpoint with the Admin frontend Origin and sends `{}`; upgrade observed after 922 ms, no close before a 12-second diagnostic timeout. Other role-origin probes were also inconclusive.

IMPACT: Production reconnect/authentication behavior remains unverified despite correct HTTP/CORS configuration.

RECOMMENDED FIX: Inspect deployed server/proxy logs and run an authenticated production browser/socket session before selecting a fix. No speculative transport or security changes made.

TEST REQUIRED: Successful Admin login/operation; player/projector resume; expired/invalid credentials; reconnect through the deployed proxy.

STATUS: OPEN — live verification required.

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

### REVIEW-013

Severity: High

Area: Contracts / Server realtime

Found By: Frontend (client implementation)

Date: 2026-09-05

Status: RESOLVED by server owner, 2026-09-06 — `playerProjectionSchema.self`
now carries `pendingEventChoice: { eventId: "SE03" | "SE04" } | null`. The
player client reads it directly and the held-action fallback has been removed
(`apps/player/src/components/decisions/DistrictChoice.tsx`).

Problem (original): `select_event_district` requires an `eventId`, but the player projection
carries no pending-event field. `playerProjectionSchema.self` exposes
`pendingLandingFee`, `auction`, `councilAllocation`, `trade` and `objectiveOffer`
— there is no equivalent for the SE03/SE04 district choice. Only
`adminProjectionSchema.pendingEventChoice` carries it, and the admin projection
never reaches a player client.

Reproduction: Advance a player to `turn.stage === "awaiting_event_choice"` with
`select_event_district` in `capabilities.commandTypes`. The client is told it may
act but is given no way to construct a valid command.

Impact: A player who draws Demand Surge (SE03) or Economic Downturn (SE04) cannot
submit the choice. The turn stalls until the timer expires.

Recommended Fix (server owner): add a `pendingEventChoice: { eventId } | null`
field to `playerProjectionSchema.self`, mirroring the admin projection. The client
already reads an `event_choice` / `pending_event_choice` announcement if one is
published, so a room announcement carrying `{ eventId }` would also close the gap
without a schema change.

Required Test: a player projection produced while `pendingEventChoice` is set must
expose the event id to the player it belongs to, and to no other player.

Resolution: Client shows the district choice with the action held and states why
it cannot submit, rather than guessing an id. See
`apps/player/src/components/DecisionSurface.tsx`.

---

### REVIEW-014

Severity: Medium

Area: Server realtime / Admin

Found By: Frontend (admin console implementation)

Date: 2026-09-05

Status: Open — capability absent, not broken

Problem: There is no realtime transport for the admin projection. `GET /ws`
closes any session whose role is `admin` with 4403, and no admin realtime session
route exists, although `adminRealtimeSessionResponseSchema` is defined in
`packages/contracts/src/http.ts`.

Reproduction: Sign in via `POST /api/admin/login`, then open `/ws` and resume with
the admin token. The socket closes with 4403.

Impact: The operator console cannot show live room state — player connection
status, credits, influence, hands, objectives, auction bids or council
allocations. During an event the operator is blind to everything except the
receipts of their own commands.

Recommended Fix (server owner): implement the admin realtime session route the
contract already describes, and allow admin sessions on `/ws` scoped to their own
room.

Required Test: an admin realtime session receives `state_snapshot` with
`audience: "admin"` for its own room only, and is refused for any other room.

Resolution: The admin console states this capability is unavailable and does not
simulate it. See `apps/admin/src/App.tsx` ("Live inspection").

---

### REVIEW-015

Severity: High

Area: Server / Build

Found By: Frontend (workspace typecheck)

Date: 2026-09-06

Status: Open — server owner's in-flight work, not touched

Problem: `apps/server/src/app.ts` uses a `ManagedRoom` promise without awaiting
it, so `npm run typecheck` fails for the workspace.

Reproduction: `npx tsc -b --pretty false`

```
apps/server/src/app.ts(173,61): error TS2339: Property 'roomId' does not exist on type 'Promise<ManagedRoom>'.
apps/server/src/app.ts(173,80): error TS2339: Property 'code' does not exist on type 'Promise<ManagedRoom>'.
apps/server/src/app.ts(192,22): error TS2339: Property 'roomId' does not exist on type 'Promise<ManagedRoom>'.
apps/server/src/app.ts(198,22): error TS2339: Property 'roomId' does not exist on type 'Promise<ManagedRoom>'.
```

Impact: the workspace typecheck gate cannot pass. The frontend projects
(`packages/ui`, `apps/player`, `apps/projector`, `apps/admin`) typecheck clean
in isolation.

Recommended Fix (server owner): await `roomManager.createRoom(...)` before
reading `roomId`/`code`.

Resolution: Not changed — backend ownership.

---

### REVIEW-016

Severity: High

Area: Server / Contracts tests

Found By: Frontend (full test run)

Date: 2026-09-06

Status: Open — server owner's in-flight work, not touched

Problem: eight tests fail, all in server-owned files. Notably
`packages/contracts/test/projections.test.ts` builds a player projection without
the `self.pendingEventChoice` field that the same commit made required, so the
schema rejects its own fixture.

Reproduction: `npm test`

```
apps/server/test/admin-runtime.test.ts    1 failing
apps/server/test/app.test.ts              2 failing
apps/server/test/room-runtime.test.ts     4 failing
packages/contracts/test/projections.test.ts  1 failing
```

Impact: `npm test` is red for the workspace. Frontend suites are green
(48 tests across 6 files).

Recommended Fix (server owner): update the contract test fixture for the new
required field, and finish the receipt-binding and room-runtime work these
tests describe.

Resolution: Not changed — the brief forbids editing backend tests to make them
pass, and these describe backend behaviour the frontend does not own.

---

### REVIEW-017

Severity: Medium

Area: Contracts vs Server

Found By: Frontend (client implementation)

Date: 2026-09-06

Status: Open — contract ahead of implementation

Problem: `packages/contracts` now defines `lobbyProjectionSchema`,
`lobby_snapshot`, `room_unavailable`, `roomSummarySchema`,
`roomListResponseSchema` and `logoutResponseSchema`, but `apps/server/src/app.ts`
emits none of the messages and exposes no route for the room list or logout.

Impact: none at runtime today. Noted so the two sides stay aligned.

Recommended Fix (server owner): emit `lobby_snapshot` while a room is filling
and `room_unavailable` on quarantine; add the room-list and logout routes if
they are intended.

Resolution: The player client already handles both inbound messages
(`apps/player/src/state/transport.ts`) and renders a lobby when one arrives. No
UI was built for the room-list or logout routes, because exposing a control for
an unimplemented endpoint is not permitted.

---

---

## REVIEW ITEM FORMAT

### REVIEW-018

SEVERITY: HIGH
AREA: Existing engine timeout compatibility
FILE: `packages/game-engine/src/transitions.ts` (`autoCompleteTurn`)
PROBLEM: Normal turn timeout can resolve a landing fee, enter emergency sale, then immediately liquidate, bypassing the approved 30-second emergency-sale selection window for a connected player.
REPRODUCTION: Timeout a turn whose automatic landing resolution requires selling property; inspect the newly entered emergency-sale path in `autoCompleteTurn`.
IMPACT: Server scheduling faithfully calls the existing handler but cannot guarantee the approved selection window on this path.
RECOMMENDED FIX: Preserve the newly entered emergency-sale sub-phase for connected players; retain deterministic disconnected fallback.
TEST REQUIRED: Connected-player normal timeout leading to emergency sale; verify 30 seconds and remaining-turn suspension; disconnected deterministic liquidation separately.
STATUS: RESOLVED — regression reproduced and fixed. Parameterized awaiting-roll/landing-fee timeout tests verify the full 30 seconds, early-timeout rejection, manual completion with zero normal time left, and disconnect fallback.

### REVIEW-019

SEVERITY: HIGH
AREA: Pause/reconnect deadline compatibility
FILE: `packages/game-engine/src/admin.ts`, `packages/game-engine/src/transitions.ts`
PROBLEM: Pause records normal-turn time, while auction/Council/reconnect deadlines and presence handlers require further compatibility verification. Scheduling is stopped while paused, but overdue sub-phase deadlines can run immediately after resume; presence transitions can still invoke engine behavior during pause.
REPRODUCTION: Pause during auction/Council; disconnect/reconnect participants; advance time beyond the sub-phase deadline; resume.
IMPACT: Operator pause may not preserve the intended sub-phase interaction window.
RECOMMENDED FIX: Owner approved freezing all timers and deferring disconnect gameplay effects until resume. Implemented with persisted pause metadata and unique deferred player IDs. Sections 19/29 do not specify independent disconnected-counterparty trade expiry; retain existing end-of-turn rejection rather than invent a timer.
TEST REQUIRED: Pause/resume and presence combinations for normal turn, auction, Council, emergency sale, and outstanding trades.
STATUS: RESOLVED — ten engine pause regressions plus six parameterized server scheduler regressions pass; repeated pause, JSON recovery, normal/auction/Council/emergency/reconnect/trade paths are covered. Older paused snapshots lacking pauseStartedAt require explicit recovery review.

### REVIEW-020

SEVERITY: HIGH
AREA: Release verification / remaining client integration
FILE: `apps/*`, `packages/client-core`, `apps/server/src/persistence`
PROBLEM: Real WebSocket tests do not establish completed browser journey correctness. Client adapters are consolidated onto client-core, but browser reconnect/private-inspection automation is incomplete. The formerly blocked live PostgreSQL process-recovery verification has now passed on PostgreSQL 18.6.
IMPACT: Full Phase 2 and event readiness cannot be declared.
RECOMMENDED FIX: Single-owner client adapter integration preserving visuals; real database migration/crash-recovery exercises; browser journeys with two rooms and privacy inspection.
TEST REQUIRED: Live PostgreSQL transactions/restart/backup restore; twelve player browser contexts plus projectors/admins; refresh/network-loss/replacement/ack UX.
STATUS: OPEN — remaining browser/backup-restore release gate. Twelve-player socket privacy/replacement-reconnect passes. Eight-player browser joining/objectives and two projector authentications were exercised; later automation stopped on a Pause locator timeout. PostgreSQL production-process test EXECUTED and PASSED with explicit TEST_DATABASE_URL (targeted and full-suite runs); no skip guard was changed. REVIEW-017 endpoints and client-core use are implemented; ordinary admin and private event-choice projection gaps are covered. See the current engineering ledger rather than historical completion claims.

### REVIEW-021

SEVERITY: MEDIUM
AREA: Authoritative capability projection
FILE: `packages/game-engine/src/projections.ts`
PROBLEM: SC01 before-roll and SC04 before-purchase were accepted by the engine but not offered by capabilities; pending trade responses were still advertised while paused/completed.
REPRODUCTION: Provide the timing-specific card in its valid stage, or pause with a pending trade.
IMPACT: Valid card intents were unreachable through capability-gated clients; unavailable trade intents were advertised.
RECOMMENDED FIX: Project existing engine timing and phase restrictions; do not duplicate rules on the frontend.
TEST REQUIRED: Card owned/missing/already-played, paused/completed trade capabilities.
STATUS: RESOLVED — four new parameterized regressions pass; no DTO redesign.

### REVIEW-022

SEVERITY: HIGH
AREA: Recovery integrity
FILE: `apps/server/src/persistence/recovery.ts`
PROBLEM: A recovered snapshot was bound to its room but not its SQL game ID or state_version.
REPRODUCTION: Return an otherwise valid snapshot under a different game ID/version.
IMPACT: Corrupt recovery could enter memory and fail or misbind later persistence operations.
RECOMMENDED FIX: Require identity/version agreement before restoring; keep corrupt-room isolation. Accept pg's precision-preserving BIGINT string representation.
TEST REQUIRED: ID/version mismatch rejection and valid BIGINT-string recovery; live PostgreSQL restart.
STATUS: RESOLVED — reader regressions pass; real PostgreSQL 18.6 production-process recovery test executed and passed on 2026-09-06.

### REVIEW-023

SEVERITY: HIGH
AREA: Frontend shared UI asset packaging / release build
FILE: `packages/ui/package.json`, `packages/ui/src/marks/Crest.tsx`
PROBLEM: The tsc-only UI build emits a PNG import in dist/marks/Crest.js without copying the PNG to dist/assets. The source PNG exists; the dist PNG does not.
REPRODUCTION: Run `npm run build`; Player Vite fails resolving `../assets/econova-crest.png` from the emitted UI module.
IMPACT: Full production client build fails although backend build, typecheck and all 243 tests pass.
RECOMMENDED FIX: Claude should make shared UI asset packaging reproducible from source as part of the build. Do not remove the crest or manually copy an asset only into a local build output to mask the issue.
TEST REQUIRED: Full clean-output UI/client build, then full `npm run build` and browser asset loading.
STATUS: RESOLVED. `packages/ui` builds with `tsc -b --force && node scripts/copy-assets.mjs`. Verified 2026-09-18 from a genuinely clean tree (ui, player, projector and admin `dist` all deleted first): the full build succeeds and all nine images, the crest plus eight Nova artworks, are bundled into the player app.

## REVIEW ITEM TEMPLATE

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
