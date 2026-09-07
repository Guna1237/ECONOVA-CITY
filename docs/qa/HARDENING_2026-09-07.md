# Engineering hardening checkpoint — 2026-09-07

Scope: live API integration, authentication boundaries, authoritative state integrity, two-room multiplayer, canonical content and performance. Gameplay values and rules are unchanged. Claude owns the concurrent frontend overhaul.

## Repairs

- A shared IP exhausted the default 10-attempt player join budget after ten successful joins, preventing a full two-room event from starting. Valid rooms now have independent per-IP join buckets; unknown codes share a single bucket. Existing attempt limits and room capacity checks remain enforced. The twelve-join regression failed with 429 before the fix and now passes; excess attempts remain throttled.
- Players already offline when Auction/Council opened were not automatically passed/abstained. Opening each phase now applies the existing disconnect effects, as required by canonical Section 29.5. New regressions failed before the fix and pass afterward.
- Rejected socket commands broadcast unchanged state to every client in the room. Only the submitting authenticated session now receives the resynchronization snapshot; successful commits retain normal room broadcasts. A real-socket regression verifies observers receive no extra snapshot after a stale command.
- Round 4 required discards had no `discard_card` capability. The server now gives that existing capability only to the pending player. Two Player display guards consume the capability without requiring a normal turn; the existing dialog JSX/styles are unchanged. Projection and decision-routing regressions cover the between-round draw and paused denial.
- Invariants now reject non-finite/fractional resources and positions, unsafe versions, invalid player counts/rounds/phases, unsupported schemas, mismatched player/property identities, missing districts, invalid turn stages/actions/dice/timers, missing sub-phase state and inconsistent objective conservation. Validation remains read-only. A runtime regression injects an invalid engine result and proves no transition is persisted or swapped, while another room continues.

## Canonical audit and tests

Canonical Sections 4–29 and 33 were compared with game-content, calculations, transitions, scoring and projections. No gameplay value was altered. Added table-driven transition coverage exercises all 10 Breaking News entries, 8 Special Events, 8 Council options and the exact resource/action outcomes of SC02/03/06/07/09. Existing regressions cover movement modifiers and Shortcut, City Center, purchases, auction tie order/no commission, development restrictions/control, modifier precedence/clamps, Insurance, liquidation, trades, pause/reconnect and Round 8 scoring/ties.

The new real HTTP/WebSocket test runs two six-player rooms through all eight rounds concurrently with two projectors and two room-admin observers. It executes 542 accepted player commands including sealed auctions, Council votes and card draws. It checks recipient isolation, private-free observer streams, persistence/state equality at completion, no remaining room deadlines, bounded snapshot counts, and rejection of actions after final scoring without mutating results. The existing socket test covers twelve replacement reconnects, duplicate requests, stale versions, forged room/resource fields and read-only projectors. This is scripted transport integration, not browser UX or a long-duration memory soak.

Observed focused loopback measurement: command acknowledgement p95 **14.50 ms**, WebSocket ping RTT p95 **40.21 ms**. The test uses in-memory persistence and two real room queues, not production PostgreSQL, cloud networking or event Wi-Fi. The broad automated ceiling is 1000 ms to tolerate shared CI; the tighter event targets are reported measurements rather than weakened requirements.

## Live deployment checks

- Downloaded each deployed client's HTML/JS: Admin, Player and Projector include `https://econova-city.onrender.com`; none embed their own static-site origin as the endpoint.
- Backend login OPTIONS returned 204 and exact matching `Access-Control-Allow-Origin` for all three frontend origins, allowing POST and content-type/authorization headers.
- A single deliberately invalid Admin login returned 401 / `AUTHENTICATION_FAILED`, `Cache-Control: no-store`, and no Set-Cookie. Server sessions use opaque bearer tokens; the client omits cookies. No production secret was used or exposed.
- Live WebSocket diagnostics were inconclusive: upgrades succeeded on several probes, but malformed/invalid authentication did not deliver a close frame within 12–15 seconds; the local equivalent closes/rejects correctly. A native Node probe confirmed upgrade in 922 ms and timed out at 12 seconds. Inspect deployed logs/proxy behavior and complete an authenticated browser/socket check before event release. No production rooms or game state were changed by these probes.

## Verification environment and limits

Root `npm ci` hit Windows EPERM on a native rolldown binding held by concurrent frontend tooling. No other agent's process was terminated. Root dependencies were restored using `npm install --ignore-scripts --package-lock=false` (no manifest/lockfile changes; zero vulnerabilities). Clean `npm ci` succeeded in an isolated copy of all tracked/nonignored working-tree source, excluding local secrets, node_modules and build output. Full checks run against that copy as well as the shared working tree are reported in the checkpoint response.

Final verification: `npm run typecheck`, `npm test`, and `npm run build` PASS in both the shared working tree and the clean-dependency source copy. Each full suite reported **323 passed, 1 skipped** (36 passing files and the opt-in PostgreSQL file skipped). This includes Claude's concurrent Projector tests; those files are excluded from the engineering commit. All three built bundles contain the production backend origin and no server secret configuration identifiers/database URL scheme. `git diff --check` PASS.

Local PostgreSQL port 5432 was unavailable and Docker CLI was not available at the usual installation path. The real process-recovery test remains explicitly opt-in; its dedicated `_test` database checks and skip conditions were not changed. Historical PostgreSQL evidence is in `PHASE2_ENGINEERING_PASS.md`, not a current rerun. Persistence-before-memory, failure quarantine, recovery validation, receipt binding and audited private inspection have passing local regression coverage.

## Remaining release gates

1. Product decision: Round 4's between-round mandatory discard has no canonical timeout/reconnect fallback. An offline player can block the phase indefinitely. Recommendation submitted to owner: 60-second grace, then discard the lowest card ID and continue; do not implement without approval.
2. Diagnose the live WebSocket authentication-close observation and verify a successful production Admin login, authenticated operation and reconnect with the operator's credential.
3. Rerun the opt-in PostgreSQL process-recovery/migration test when a dedicated local test database is available.
4. Browser UX/reconnect/private-inspection completion, sustained memory/timer soak, event Wi-Fi/mobile/projector performance, backup restore and event rehearsal remain release gates. Short loopback tests do not establish event readiness.

## Coordination

The only Player source edits are the two existing discard display guards. Claude should retain capability-driven discard routing for Round 4. Projector App/CSS/narration changes and associated tests made concurrently were neither edited nor staged by this engineering pass. No shared contracts, dependency manifests, production configuration, credentials, canonical rules or visual design changed.
