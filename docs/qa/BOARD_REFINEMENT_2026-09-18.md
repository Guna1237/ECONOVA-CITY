# Board refinement and player guidance

Implemented 2026-09-18 by Codex. Scope: continue the approved light tabletop direction using the owner's artwork, improve board readability and interaction, and provide clear player guidance. No engine, server, contract, canonical rule, dependency, or credential changes by this pass.

## What changed

- Preserved the original ECONOVA crest, existing typography, distinct player pieces, cream board, navy text, and restrained district colours.
- Extracted four unchanged icon crops from the supplied PNG for City Center, Innovation Hub, Market Square, and Observatory. The lossless WebP files total 16,632 bytes. The extraction script checks source dimensions/hash and pixel equality. Production builds copy checked-in assets; Python and the original Downloads path are not runtime requirements.
- Reworked the board centre around the current player's name, turn stage, location, authoritative die roll, and district Demand. Wide boards also show named turn order and the supplied property illustration. Compact boards omit secondary decoration.
- Distinguished district bands, ownership frames, and the current-space outline. Property names can wrap at camel-case boundaries without changing canonical names. Development buildings no longer overlap the printed property motif.
- Fixed short portrait phones shrinking the board to a thumbnail. At 320 by 640, the board is 304 pixels wide and the page scrolls vertically without horizontal overflow.
- Removed inert property buttons on the non-interactive Projector. Interactive Player properties retain keyboard focus and show their actual name in the details dialog.
- Paused games no longer visually mark a retained turn as active. Board movement animation accepts the documented Entertainment bonus of up to eight forward spaces; this changes presentation only, not movement outcomes.
- Added a plain-language Reading the board section to the existing How to play guide, renamed ambiguous panel headings, and corrected privacy wording so it does not contradict separately protected operator inspection.
- Added shareable before-game and during-game messages in `docs/PLAYER_MESSAGES.md`. Corrected total-player-count and timeout wording in `docs/PLAYER_QUICK_START.md`.

## Files in this pass

Some earlier edits were committed by concurrent work while this pass was running. This is the full implementation footprint, not just the final uncommitted diff.

- `packages/ui/scripts/extract-board-art.py`
- `packages/ui/src/assets/nova-board-{civic,idea,market,event}.webp`
- `packages/ui/src/assets/NOVA_ART.md`
- `packages/ui/src/marks/NovaArt.tsx`
- `packages/ui/src/board/{BoardSpace,CityCentre,GameBoard}.tsx`
- `packages/ui/src/board/usePieceTravel.ts`
- `packages/ui/src/styles/{board,board-hub}.css`
- `packages/ui/src/tokens.css`
- `packages/ui/test/{board-geometry,board-presentation,nova-art-packaging}.test.ts`
- `apps/player/src/{App.tsx,app.css}`
- `apps/player/src/components/{HowToPlay,Panels}.tsx`
- `docs/{PLAYER_MESSAGES,PLAYER_QUICK_START}.md`
- This report and `agent/{TASKS,STATUS,HANDOFF,REVIEW}.md`

## Verification

Final source verification after the code edits:

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS for packages, server, Player, Projector, and Admin |
| `npm test` | 49 files passed; 402 tests passed; one opt-in PostgreSQL test skipped |
| `git diff --check` | PASS |
| Asset packaging regression | Four source/build asset pairs match; compiled imports resolve |

Real Chromium checks through gstack browse:

- Player at 320 by 640: document width 320, board width 304, zero broken images.
- Player at 390 by 844 and 768 by 1024: visual inspection, no horizontal overflow, intact board and actions.
- Desktop Player inspected at 1440 by 1000; Projector inspected at 1920 by 1080.
- Projector has 20 board spaces, zero inert board buttons, and zero broken images.
- Clicking Street Bites opens a dialog titled Street Bites. Focus stays in the dialog; Escape returns focus to the selected property.
- How to play opens Reading the board, with the expected explanations and modal focus containment.
- Paused-state, authoritative-roll, special-art, interactive/non-interactive markup, and seven/eight-space movement regressions pass.

Screenshots are local verification artifacts in `C:/Users/notgu/AppData/Local/Temp/econova-board-20260918/`: `final-mobile.png`, `final-tablet.png`, `projector-refined.png`, and `short-phone-fixed.png`. They are not shipped assets and may be removed by normal temporary-file cleanup.

## Design skill application

The requested design, typography, audit, and animation skills guided hierarchy, restrained decoration, original artwork reuse, readable copy, keyboard behavior, and short state-linked motion. No new fonts, animation libraries, 3D runtime, or speculative visual framework were introduced. The audit's left-accent-strip finding on the action brief was fixed with a complete border. The board's three-pixel inset bottom edge is retained deliberately as a physical board edge, not a card accent stripe.

The typography skill's referenced CSS-template file was unavailable. No installed skills named taste or 7 context were found. Existing project tokens and the available requested skills were used instead. Reduced-motion CSS was inspected, but actual reduced-motion browser/device behavior was not exercised in this pass.

## Remaining checks and limits

- Vite still reports large JavaScript chunks. Raw/gzip bytes: Player 655,742/191,661; Projector 568,403/173,192; Admin 539,598/157,015. No warning threshold was relaxed. Track measured route/module splitting separately.
- Real authenticated two-room browser play, mandatory-decision nested help, reconnect, and Admin visual QA were not rerun here. Browser checks used explicitly labelled local preview/demo states.
- Live PostgreSQL recovery was not executed because the dedicated test environment was not supplied to this run.
- Real phone touch behavior, projector hardware readability, reduced motion, and frame-time performance still need event-device verification. Narrow-board labels remain compact; the named property dialog provides the full detail.
- Concurrent backend/pricing changes and `.claude-flow/policy/state.json` were preserved. Existing commits `79819ee`, `11c0bf8`, and `6bc2dc7` were observed, not created by this pass. No commit or deployment was performed by this pass.

This is a verified UI refinement checkpoint, not a claim that the full event release is production-ready.
