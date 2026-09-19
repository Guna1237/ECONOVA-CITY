# Indian company names and event copy

Status: implementation complete; final verification in progress.

## Changes

All 16 property cards now use familiar Indian company/brand names. One shared catalog drives the board, property details, narration and new receipts. The canonical specification and examples match. Strategy Cards retain their descriptive names, such as Insurance Policy.

| District | Names |
| --- | --- |
| Food | Amul, Britannia, Parle, ITC Foods |
| Tech | Zoho, Infosys, Wipro, TCS |
| Entertainment | Saregama, PVR INOX, T-Series, Zee |
| Mobility | TVS Motor, Bajaj Auto, Mahindra, Tata Motors |

Property IDs, board positions, tiers and every economic value are unchanged. Existing saved receipts keep their original text; new receipts use the updated names. No saved-game rewrite or migration is needed for this name-only change. Game values are fictional, and the welcome screen states that there is no affiliation or endorsement. No company logos, external assets or dependencies were added.

Phone refinements: Holdings becomes Properties; Your actions becomes Choose an action; remaining Actions are stated directly. Property details use Starting values and Base upgrade costs instead of Printed values and Development ladder. The short organizer message now matches the theme. Long names have optional line breaks and wrapping on small tiles, while accessible names remain intact. Original ECONOVA art, colors, controls and logo are preserved.

Frontend-design guided continuity and legibility, gstack browse supplied phone/browser checks, and verification-before-completion guided release claims. This is a focused content/readability pass, not a backend or renderer redesign. No performance gain is claimed from changing text; no new runtime library, network request or animation was introduced.

## Files

- packages/game-content/src/properties.ts and test/content.test.ts
- apps/player/src/components/ActionDock.tsx and JoinRoom.tsx
- apps/player/src/state/briefing.ts, fixtures/demonstrationState.ts and app.css
- apps/player/test/briefing.test.ts and apps/projector/test/narration.test.ts
- packages/ui/src/board/BoardSpace.tsx, controls/Property.tsx and styles/board.css
- packages/ui/test/board-presentation.test.ts
- docs/GAME_DESIGN_SPEC.md, DECISIONS.md and PLAYER_MESSAGES.md
- This report and agent STATUS/HANDOFF/TASKS

## Verification

Before the final wrapping adjustment, full typecheck/build/diff-check passed and 467 tests passed with one dedicated PostgreSQL opt-in skip. Production-preview browser check at 320 x 568 showed all 16 names, Properties tab, and Amul details with unchanged values, with no page overflow. It caught tile-text clipping, which prompted the wrapping fix and regression tests. Final results will be recorded below.

## Before opening the room

1. Use the same release for the server and all clients. Refresh the phones before joining. Do not replace a running event build mid-game.
2. On the actual event Wi-Fi, join both rooms and confirm players cannot see the other room.
3. Rehearse a purchase, rent receipt, trade result and vote. Confirm each phone shows the result without a projector.
4. Refresh one joined phone and confirm its seat and resources recover. Do not create a new player to reconnect.
5. Check sound on an actual phone speaker, then let each player choose whether to enable it.
6. Have the operator pause/resume once and confirm the timers stop and restart correctly.

These live checks are not replaced by a successful build. Physical-device listening, live deployment, event-network rehearsal and dedicated PostgreSQL process recovery are NOT VERIFIED by this pass. Existing REVIEW-035 timer-version deployment caution remains in force. No commit or deployment performed. Concurrent Button test relocation is not part of this pass and was preserved.
