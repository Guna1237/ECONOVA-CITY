# Player details and activity refinement

## Implemented

- Buy/Develop controls now appear immediately after the property ownership header, before the reference figures. Existing server quotes, capabilities and command handling are unchanged.
- Property figures use a quieter two-column layout with thin separators instead of six competing boxes. Income and rent bonuses each have their own line.
- Latest rent/trade receipts are 14px rather than 12px. Policy/news preview is 13px. History says Round 3 rather than R3, and the empty state explains what will appear.
- Original ECONOVA theme, artwork, company names and phone controls are preserved. No backend, engine, contracts, gameplay values, dependencies or audio changes.

Frontend-design guided the action-first hierarchy and reduced clutter. UI-typography guided spacing, type size and readable bonus lines. Its optional CSS reference file is missing locally; the main skill and existing project styles were used. Gstack browser checks used the built Player preview.

## Files

- `apps/player/src/components/Panels.tsx`
- `apps/player/src/components/NewsMoment.tsx`
- `apps/player/src/components/city-updates.css`
- `packages/ui/src/controls/Property.tsx`
- `apps/player/test/property-actions.test.ts`
- Visual-system note, agent status/handoff/tasks and this report

## Verification

The two new regression tests verify that the server-quoted development price and allowed control precede Starting values, and that controls are absent when capabilities deny them. They do not enable demo gameplay or weaken authorization.

Browser preview: City updates expands/collapses, readable receipt history, Amul details open, no page/dialog horizontal overflow at 320px or 390px, and no console errors. Current browser evidence covers read-only preview; authorized action placement and denied actions are covered by component tests. A real authenticated mobile purchase/development walkthrough is still required before release.

Final checks: `npm run typecheck` PASS; `npm test` 472 PASS and one intentional dedicated-PostgreSQL SKIP (58 passing test files); `npm run build` PASS for all packages/server/clients; `git diff --check` PASS. Player bundle: 434.51kB / 133.47kB gzip. No performance gain is claimed without measurement; no new dependencies or network work were introduced.

No commit or deployment by this pass. This is a UI refinement, not a production-readiness certification. Physical-device audio, authenticated mobile actions/reconnect, event Wi-Fi and opt-in database recovery remain separate release checks.
