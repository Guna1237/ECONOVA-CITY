# Phone controls and sound refinement

## DESIGN AUDIT RESULTS

### Overall Assessment

The owner assigned this session the mobile UI after pausing overlapping frontend work. This slice keeps the existing light tabletop, crest, artwork, server-authoritative commands and pinned action bar. It addresses instruction placement, optional help, short landscape screens and undifferentiated sound. No engine, backend, contract, dependency or gameplay changes.

### PHASE 1: Critical

- Portrait players could see pinned buttons without the explanation below the board. The briefing now appears before the board. View board and Your actions provide reciprocal, focusable navigation.
- At 844 x 390, notices squeezed the landscape board to approximately 60px and pushed controls below the clipped viewport. The page now scrolls, with a 318px board at that size and a separately scrollable sticky controls column.
- Keep existing disabled-action explanations, server capability checks and measured bottom padding. These were preserved, not replaced.

### PHASE 2: Refinement

- Coaching is collapsed under Need a tip? Dismissal remains available. Both controls have 44px minimum touch targets.
- Sound settings provide explicit enable/disable, Quiet/Standard volume and a turn preview. Default is off; Quiet is the initial volume.
- Authorized receipt titles select short cues for incoming Credits, payments, trades, declined/expired trades and news/policies. Unknown receipts retain a generic cue. Resource summaries do not mask specific receipts in the same batch.
- Reconnect, enabling sound and new-game snapshots establish silent baselines. Hidden/disconnected clients do not announce history. The timer reminder is not dropped behind a recent receipt cue.

### PHASE 3: Polish

- Softer sine envelopes and lower pitches replace the single high notification beep. Each cue ends within 440ms. No music, ticking, new sound assets or audio dependencies.
- Existing fonts, colors and art stay intact. Sound is supplementary; all meaning remains visible in text.

## DESIGN_SYSTEM UPDATES REQUIRED

Updated `docs/VISUAL_SYSTEM.md` for briefing order, collapsed tips and sound settings. Updated `docs/PLAYER_QUICK_START.md` and `docs/PLAYER_MESSAGES.md` to match the interface. Design skills informed information hierarchy, touch targets, progressive disclosure and non-blocking feedback. The earlier design-hook side-tab finding applies to functional district bands, not decorative card accents; this slice does not change them.

## IMPLEMENTATION NOTES FOR BUILD AGENT

Changed application files:

- `apps/player/src/App.tsx`: reciprocal board/action navigation.
- `apps/player/src/app.css`: portrait hierarchy, landscape recovery, sound settings and touch targets.
- `apps/player/src/components/ActionDock.tsx`: collapsed coaching and board link.
- `apps/player/src/components/SoundControl.tsx`: native settings sheet; explicit gesture-based audio enable.
- `apps/player/src/state/sound.ts`: receipt-specific melodies, volume, warning priority; existing cleanup/baselines retained.
- `apps/player/test/mobile-controls.test.ts`: initial markup, collapsed guidance and audio-off regression coverage.
- `apps/player/test/sound.test.ts`: receipt selection, duplicate suppression, warning priority and volume coverage.
- `apps/projector/test/projector-privacy.test.ts`: the existing strict public-key assertion now includes the already-approved `seatIndex`, with range checks. No new projection fields or relaxed privacy checks.

### Verification

- `npm run typecheck`: PASS.
- `npm test`: final run 466 PASS, one intentional dedicated-PostgreSQL opt-in SKIP; 57 passing test files.
- `npm run build`: PASS for packages, server, Player, Projector and Admin. Player JS 434.01kB, gzip 133.34kB.
- `git diff --check`: PASS.
- Local gstack browser preview: 320 x 568, 390 x 844, 844 x 390 and 1440 x 900 checked. No horizontal overflow. At 320px, the board link focuses `city-board`; the 304px board clears the fixed controls. Original loaded images have nonzero dimensions.
- Sound settings opened, audio successfully enabled, Standard selected, and sound disabled. Optional tip expanded. Desktop retains four standing panels.
- The first full run found the stale seat-index assertion and a 5-second twelve-player join-test timeout. The assertion is corrected against the existing public contract. The server test passed unchanged in isolation and the final full run; no timeout or rate-limit was weakened.

### Remaining validation

Real phone speaker quality, iOS/Android background/resume audio behavior, screen-reader traversal and live authenticated multiplayer/sound/reconnect rehearsal remain NOT VERIFIED. Browser checks used the explicit preview, not a real event room. The PostgreSQL opt-in test was not enabled. Track the intermittent join-test timeout if it recurs under load. Existing REVIEW-035 deployment caution still applies.

No commit or deployment performed by this refinement pass. Preserve the concurrent work already committed at `98c1f4f`.
