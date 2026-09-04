# ECONOVA: CITY — Event Day Checklist

Practical, run-through-it-once checklist for live play sessions. Pair with `GAMEPLAY_TEST_MATRIX.md` (P0 items) for pre-game smoke testing.

---

## 1. Server Startup

- [ ] Server process started on the event machine (not localhost-only if players join via phones — confirm network-reachable host/port)
- [ ] Server logs confirm clean boot, no error/warning spam
- [ ] Server version matches the intended release build
- [ ] Health/status endpoint (if any) returns OK
- [ ] Server timezone/clock correct (affects timers/logs)

## 2. Database Readiness

- [ ] Database reachable from server (connection test passes)
- [ ] Schema/migrations up to date for this build
- [ ] Database is empty of stale rooms/games from prior test runs (or a clean event-day database is used)
- [ ] Backup/snapshot of pre-event DB state taken, in case of rollback need
- [ ] Confirm write latency is acceptable (no lag spikes expected under 4-6 player load — trivial for this scale, but verify once)

## 3. Room Creation

- [ ] Admin can create a room from the intended admin device
- [ ] Room code/link generated correctly and is easy to read/share (font size, no ambiguous characters)
- [ ] Room accepts joins from 4–6 distinct player devices
- [ ] Room rejects a 7th join attempt
- [ ] Confirm process for creating a **second, isolated** room if running parallel tables — verify Room A and Room B do not cross-contaminate (see EDGE_CASES.md § Room A vs Room B Isolation)

## 4. Player Joining

- [ ] Each player can join via the intended method (QR code, short URL, room code entry)
- [ ] Player name/identifier displays correctly for all joined players, on all devices and projector
- [ ] Late joiners before game start are handled (added to lobby correctly)
- [ ] Attempting to join after the game has started is handled gracefully (rejected with clear message, not a crash)
- [ ] Duplicate name handling verified (two players entering the same display name doesn't break player-scoped state)

## 5. Projector Setup

- [ ] Projector/display connected and mirroring the correct game view (not a laptop desktop or wrong window)
- [ ] Resolution/aspect ratio correct — no cut-off UI elements
- [ ] Text is legible from the back of the room (font size check at actual venue distance)
- [ ] Breaking News, City Council results, and Final Scoring reveal all display correctly on the projector specifically (not just on player devices)
- [ ] Projector does NOT display any private information (hands, secret objectives, individual Council votes) — spot-check this explicitly

## 6. Phone/Browser Setup

- [ ] Confirm target browsers for player devices (iOS Safari, Android Chrome, etc.) — test on at least one of each expected platform
- [ ] Confirm the game UI is usable at the expected device sizes (phones primarily)
- [ ] Confirm no browser-specific console errors on load
- [ ] Confirm players can rotate/lock orientation without breaking layout, if applicable
- [ ] Battery/charging plan for player devices if using venue-provided phones/tablets

## 7. Network Verification

- [ ] Venue Wi-Fi (or hotspot) tested with the expected number of simultaneous devices (players + admin + projector feed if wireless)
- [ ] Latency/packet loss check under load — dice rolls, trades, and timers should feel responsive
- [ ] Confirm firewall/captive portal on venue Wi-Fi doesn't block the game's websocket/API traffic
- [ ] Backup connectivity plan identified (mobile hotspot) in case venue Wi-Fi fails
- [ ] Confirm server is reachable from the actual venue network, not just the office/test network (IP allowlisting, VPN, etc.)

## 8. Backup Machine/Build

- [ ] A second machine is available, pre-loaded with the same server build and DB access, ready to take over
- [ ] Backup build version confirmed identical to primary
- [ ] Process documented for switching players to the backup server mid-event (new room code, re-join instructions) if primary fails
- [ ] USB/offline copy of the build available in case of network-dependent deployment issues

## 9. Reset/Recovery Procedure

- [ ] Documented steps to fully reset the database between test games (clear rooms/players/state)
- [ ] Documented steps to recover a single stuck room without affecting other concurrent rooms
- [ ] Confirm admin has a way to force-end or force-skip a stuck turn (in case of a bug, not just normal timeout)
- [ ] Confirm reconnect flow actually works live (kill a test player's connection mid-turn, verify 60s window and correct resume — see EDGE_CASES.md § Disconnected Player)
- [ ] Rollback plan if a mid-event bug requires reverting to the backup build

## 10. Operator Checks

- [ ] Operator/facilitator knows how to start the game once all players have joined
- [ ] Operator knows how to read/announce Breaking News and City Council results if not fully automated on projector
- [ ] Operator has a printed or on-screen copy of `GAME_DESIGN_SPEC.md` section summaries for rules disputes at the table
- [ ] Operator knows the escalation path if the server crashes mid-game (who to call, what to say to players)
- [ ] Operator has tested explaining the room-join flow out loud once, timed, to confirm it's fast enough for a live crowd

## 11. Pre-Game Smoke Test

Run one full mock game (4 players minimum) end-to-end before doors open:

- [ ] Setup completes correctly (resources, objectives, turn order) — SETUP-01 through SETUP-08
- [ ] At least one full round completes: Breaking News → turns → Round Resolution
- [ ] At least one property purchase and one auction occur
- [ ] At least one development action occurs and Tech discount (if applicable) is verified
- [ ] At least one landing fee payment occurs
- [ ] At least one trade completes successfully
- [ ] Round 3 or 6 City Council phase is exercised if the mock game runs that long, or manually triggered/verified in a shorter test
- [ ] Reconnect one test device mid-game to confirm recovery works live, not just in isolated testing
- [ ] Play through to Round 8 and confirm Final Scoring displays correctly, OR verify Final Scoring separately with a seeded/short test game
- [ ] Confirm timers (turn, auction, Council) are visibly correct and not silently misconfigured (e.g., 6 seconds instead of 60)

## 12. Post-Game Reset

- [ ] Confirm Final Scoring screen was visible to all players/projector before resetting
- [ ] Export/save results if event requires a record of standings
- [ ] Clear/archive the completed room's state from the database
- [ ] Reset projector/admin view to the lobby/room-creation screen for the next game
- [ ] Quick device check: reclaim and recharge/reset player devices if venue-provided
- [ ] Confirm server is still healthy (no memory/connection leak building up) before starting the next session
- [ ] Log any bugs, rules questions, or ambiguities observed during play for follow-up (cross-reference `EDGE_CASES.md` ambiguity list)

---

*This checklist assumes the current build implements `docs/GAME_DESIGN_SPEC.md` v2.0 in full. If any checklist item cannot be completed because a feature isn't implemented yet, treat that as a go/no-go blocker for event readiness, not something to skip silently.*
