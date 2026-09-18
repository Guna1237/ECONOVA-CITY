# Phone-only play checkpoint

Owner-approved: no projector needed; normal turns 45 seconds, warning at 30 seconds elapsed. Auctions/emergency sales 30 seconds, Council 45 seconds, reconnect grace 60 seconds unchanged.

## Implemented

- Server-persisted activity receipts: rent received/paid, property income, trade received/completed/declined/expired, resource changes, news, Special Events and passed policies. Explicit event allowlist; no raw payload broadcast. Participant-private receipts never enter public/routine-admin projections.
- Atomic persistence before publication, bounded history (40 per audience), stable receipt IDs, reconnect snapshot deduplication. No command replay or optimistic economy.
- Phone City updates: expandable news, active policy names/effects and history. Brief notification for new activity. Removed automatic phone news and round overlays; controls/board remain usable.
- Persisted join-order seat indexes. Rotating turn order and PostgreSQL object-key order no longer determine colours. Legacy snapshots use original turn order. All seat consumers use the same roster identity.
- Original owner PNG, unmodified, locally packaged and clipped to six pawn regions. Added explicit SVG clip paths after browser testing found a global overflow-visible style. Visible seat numbers supplement colour.
- Canonical timer config, on-screen warning threshold, player instructions and regression expectations updated. Existing pause and emergency-sale behavior unchanged.

## Verification

- `npm run typecheck`: PASS.
- `npm test`: PASS, 431 tests; one PostgreSQL process-recovery test intentionally skipped.
- `npm run build`: PASS for packages/server/three clients. Existing >500 kB JavaScript chunk warnings remain.
- `git diff --check`: PASS (Git reports line-ending normalization warnings only).
- Follow-up real-socket regression: all four `realtime-network.test.ts` tests PASS, including two six-player eight-round games. Player activity exactly matches its authorized server audience; public observers contain no private receipt categories.

Regression tests cover stable seats after object-key/turn-order changes; actual 45-second deadline; 15-seconds-remaining warning; participant privacy; trade decline versus expiry; bounded history; recovery serialization; real runtime trade command/replay; persistence failure preserving the prior state; and client notification deduplication.

Browser checks use gstack on the local Player client: 320px and 390px phones, 1440px desktop, current policy/news text, readable demo rent/trade history, PNG crops, no horizontal overflow and no news overlay. Preview is explicitly labelled, not presented as a live game. Fresh Vite on port 15175 was needed after the long-running development server retained failed imports from builds in progress.

## Remaining release checks

- Authenticated multi-phone notification/reconnect walkthrough on event devices is NOT VERIFIED in this pass. Real WebSocket/integration tests are included in the full test suite; browser screenshots here use the labelled preview.
- The PostgreSQL process test remains opt-in and is skipped without a dedicated TEST_DATABASE_URL. No database or credentials were changed.
- Deploy this timer change between games. A saved 60-second game with more than 45 seconds of paused normal time can fail the new remaining-time invariant. No silent in-progress-game migration was added. If such a game must continue, a tested, explicit recovery policy is required before deployment.
- Existing frontend chunk-size warnings remain. Original pawn PNG adds 531,879 bytes, shared/cached across all six pieces. No new dependency.
- No commit, push or deployment performed.

## Main files

Server: `apps/server/src/rooms/activity.ts`, `room-runtime.ts`; engine `state.ts`, `setup.ts`, `projections.ts`, seat invariant; contracts `projections.ts`; game-content `config.ts`.

UI: Player `NewsMoment.tsx`, `city-updates.css`, `PlayerSession.tsx`, `state/activity.ts`, `App.tsx`; UI `theme.ts`, `Pieces.tsx`, PNG asset, `PlayerPiece.tsx`, `Readouts.tsx`, seat call sites and styles. Projector changes are compatibility-only seat/timer reads, not new event workflow.

Documentation: product event-mode override, approved decision 051, canonical timer section, visual/security notes and player briefing. Prior board-help work and dirty agent notes are preserved.
