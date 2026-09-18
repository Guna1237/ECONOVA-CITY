# Board help and first-time player UX

## Delivered

The owner asked for a cleaner board that first-year students can understand with little verbal instruction. This pass keeps the existing crest, PNG-derived artwork, fonts, and tabletop theme. It makes the board explain itself instead of adding more permanent text to small tiles.

- All four Player special spaces open an explanation when tapped or activated by keyboard. Each explanation says what happens, what to do next, and an important exception.
- City Council has a labelled, 44px-high help button beside the board. Council is correctly explained as a vote at the start of Rounds 3 and 6, not a landing space.
- Corrected Innovation Hub's misleading Strategy card label to Random event, matching canonical sections 11 and 21. No gameplay was changed.
- How to play opens with fewer than 130 words: the goal, three turn steps, and two useful reminders. Further answers are collapsed until requested. Existing access from join, lobby, live play, and required decision sheets is preserved.
- Special tiles use calmer flat surfaces, visible information markers, keyboard focus, and brief hover feedback. Help expansion uses only opacity and transform, and is disabled under reduced-motion preference. The existing native Sheet handles focus containment, dismissal, and return focus.
- Removed the unnecessary long header caption from How to play. Added a clear Got it exit and Back to board on space help.
- Rewrote `docs/PLAYER_MESSAGES.md` into a pre-event message, a roughly 30-second read-aloud introduction, and short during-play reminders.

## Scope and safety

`BoardHelp` imports content and presentation only. It cannot send commands, start an event, cast a vote, or pause the game. The reminder explicitly says that reading help does not pause play. The Projector remains non-interactive and public-only.

No backend, engine, contracts, canonical rules, credentials, dependencies, or external asset URLs changed. Reused the checked-in, owner-supplied art. The broader request to fix backend issues did not reveal a backend defect in these interactions, so there was no speculative backend rewrite.

Files: `apps/player/src/App.tsx`, `apps/player/src/app.css`, `apps/player/src/components/BoardHelp.tsx`, `apps/player/src/components/HowToPlay.tsx`, `apps/player/test/board-help.test.ts`, `packages/ui/src/board/BoardSpace.tsx`, `packages/ui/src/styles/board.css`, `packages/ui/test/board-presentation.test.ts`, `docs/PLAYER_MESSAGES.md`, and the visual/status/handoff/review notes.

## Verification

| Check | Result |
| --- | --- |
| Focused help and board presentation tests | 22 passed |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, including all three clients |
| `npm test` | 419 passed, one opt-in PostgreSQL test skipped; 50 files passed |
| `git diff --check` | PASS |

Real Chromium checks through gstack browse:

- 320px Player: 304px board, no horizontal overflow, zero broken images, all four special spaces are buttons. Innovation Hub opens correctly; Escape restores focus to Space 5.
- 390px Player: Observatory help and City Council help visually inspected. Observatory Escape returns focus to Space 19. How to play displays the short overview with details collapsed.
- City Center displays its 150-Credit explanation; Market Square opens its own named explanation.
- 1440px Player: board inspected, no horizontal overflow; Council dialog retains focus through Tab and Shift+Tab.
- 1920px Projector: 20 spaces, no board buttons, zero broken images, no horizontal overflow.

Local screenshots: `C:/Users/notgu/AppData/Local/Temp/econova-board-20260918/learnable-board.png`, `observatory-help.png`, `council-help.png`, `quick-start-guide.png`, `help-320.png`, `learnable-desktop.png`, and `learnable-projector.png`. Some show the How to play header caption before its final removal. These are temporary verification artifacts, not shipped game assets.

## Skill review

The requested frontend-design, typography, Impeccable, Bencium, design-audit, animation, and web-guideline skills informed progressive disclosure, native accessible controls, restrained surfaces, and readable copy. The existing theme is deliberately preserved rather than importing a skill's preferred CSS framework or component library. No em dashes were added to the new help copy.

The design hook flags the existing board's inset bottom edge as a side stripe. This is the physical board rim, not a decorative card accent, and is intentionally unchanged. No hook rules were disabled. Skills named taste or 7 context are not installed; the available requested skills were used. The missing typography CSS-template reference remains unavailable.

## Remaining validation

- Browser checks used local preview/demo states, not a new authenticated multiplayer session. Real two-room play, live mandatory-decision help, and reconnect rehearsal remain release checks.
- Reduced-motion styles are present; real device/reduced-motion and frame-time testing were not performed here.
- Vite's existing large-chunk warnings remain tracked in REVIEW-033. No warning limit was raised.
- The destructive PostgreSQL process test remained skipped without its dedicated opt-in database setup.
- Concurrent commits `4cd2830` and `2a2bc70` were observed during the shared-worktree pass. This agent created no commit and performed no deployment. Existing work was preserved.
