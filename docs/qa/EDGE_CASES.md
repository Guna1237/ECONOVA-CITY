# ECONOVA: CITY — Edge Cases

**Source of truth:** `docs/GAME_DESIGN_SPEC.md` (v2.0). These are the sharp-edged, easy-to-miss scenarios Codex must specifically exercise — beyond the happy-path matrix in `GAMEPLAY_TEST_MATRIX.md`.

---

## Insufficient Credits

- Buying a property with Credits < price is rejected with no state change (Section 28.1) — not silently clamped to "buy for what you have."
- Developing with Credits < dev cost (after any Tech discount / card / event reduction is applied) is rejected — verify the check happens *after* all applicable discounts, not before.
- Bidding in an auction with fewer Credits than the bid amount entered — must be rejected or capped; confirm what the client/server actually enforces as the max bid.
- A landing fee that exceeds the payer's Credits is the ONLY case that triggers emergency sale (Section 28.2) — insufficient funds for buy/develop/bid must NOT trigger emergency sale (Section 28.2.9 — voluntary use is disallowed).

## Exact Balance

- Player has exactly enough Credits to buy/develop/bid — must succeed, not be rejected due to an off-by-one (`>=` vs `>` comparison bug).
- Player pays a landing fee that brings their balance to exactly 0 — must succeed without triggering emergency sale (emergency sale only fires when balance is insufficient, not when it lands on exactly 0).
- Emergency sale raises exactly enough to cover the fee (not more) — remaining balance should be 0, not negative, not held back.
- Property purchase price after Flash Sale (SC04) or Urban Expansion (BN10) at the discount floor (40 / 50 respectively) — confirm floor is respected exactly, not `price - 40` going below the stated minimum.

## Demand −2 and +2

- District already at +2, another +Demand source applies (Breaking News, Council, card, event, Influence action) — must remain clamped at +2, not silently error or wrap.
- District already at −2, another −Demand source applies — must remain clamped at −2.
- Income/fee formulas at Demand −2 for a Cheap property — confirm the minimum-0 income and minimum-5 fee floors both apply correctly when the raw formula goes negative.
- Market Boom (SC02) / Market Crash (SC03) played on a district already at the target extreme — should be a no-op, not throw.
- Free Market policy (Pair 4B) doubling Demand *modifiers* — confirm this doubles the modifier term in the formula, not the Demand value itself (Demand value stays within [-2,+2]; only its formula contribution doubles).
- Market Regulation policy (Pair 4A) sets all Demand to 0 and disables Influence-based Demand changes for the rest of the game — verify Influence "change Demand" action becomes rejected/unavailable after this policy wins, for every remaining round.

## Development Level 3

- Property already at Level 3 — Develop action must be rejected, not silently ignored or wrap to Level 0.
- Quick Build (SC05) played on a Level 3 property — must be rejected (no level to advance to).
- Tech discount applied to a Level 2→3 upgrade at the minimum-10 floor — confirm floor applies per-development-action, not per-turn.
- Property Value / Landing Fee / Income calculations at Level 3 for each tier (Cheap/Mid/Premium) — cross-check against Section 6.2, 14.1, 15.1 worked examples exactly.

## Buying Then Attempting Development

- Property purchased this turn — Develop action on it must be rejected this turn regardless of remaining Actions or Credits (Section 6.4, Section 13.1).
- Property purchased via auction — same-turn development restriction still applies (Section 12.2.7).
- Property received via trade this turn — same-turn restriction applies; eligible only on the new owner's *next* turn (Section 19.3), not later in the same turn even if the trade happened on the current player's own turn.
- Confirm the `purchasedThisTurn` flag (Section 33.2) is cleared correctly at the start of the owner's next turn, not at end of the round or globally.

## Auction Triggerer Bidding

- The player who triggered the auction (because they declined/couldn't afford to buy outright) submits their own sealed bid and wins — must be allowed and must execute normally (Section 12.2.3 / Consistency Audit).
- Triggering player bids and loses to another player — triggering player pays nothing, loses nothing.
- Triggering player declines to bid at all (implicit pass) — must not be forced to bid.

## Auction Ties

- Two or more players submit identical highest bids — winner is the one with the **earliest turn-order position in the current round** (Section 12.2.5), not earliest bid submission timestamp, not random.
- Verify tie-break uses *current round's* turn order (which rotates each round per Section 33.1), not a fixed player list order.
- Three-way or more tie — same rule applies; only one winner, no partial/split ownership.

## Duplicate Requests

- Same trade confirmation submitted twice (e.g., double-click, network retry) — must execute exactly once; second attempt rejected as already-resolved (Section 19.2.5 "no duplicate execution").
- Same buy/develop/bid action submitted twice in rapid succession — server must reject the second as invalid (property already owned / already developed / bid window closed).
- Reconnect after action was already processed — must not replay or re-apply the action (Section 29.4 "no duplicate resources or actions").

## Stale State Versions

- Client acts on an outdated snapshot (e.g., property shown unowned but was just bought by someone else) — server must reject based on authoritative current state, not trust client-submitted state.
- District control discount (Tech) or movement bonus (Entertainment) calculated client-side from stale control data — server must recompute from its own most-recent control state at the moment of the action (Section 18.3 "most recent district-control state").
- Auction bid submitted after the 30-second window has closed due to client-side clock drift — server-side timer is authoritative; late bid rejected.

## Shortcut and City Center

- SC11 (Shortcut) played, and the backward move crosses Space 0 — City Center passing bonus must NOT trigger (Section 10.4 explicit rule).
- SC11 backward move lands exactly on Space 0 — no City Center passing bonus applies; the backward-movement exclusion covers crossing and landing.
- SC11 combined with Entertainment district movement control — the backward move uses the unmodified die result. Do not apply the Entertainment +1/+2, and never award the City Center passing bonus for the backward move.

## Tech Discount Timing

- Player gains Tech Control mid-round (e.g., via a trade completed earlier in the same round) then develops later in that same round — discount must apply, since it's checked "at the moment a player performs a development action... using the most recent district-control state" (Section 18.3), not the state at Round Start.
- Player loses Tech Control mid-turn (e.g., sells a Tech property as part of an emergency sale) then attempts another Develop action later the same turn — discount must NOT apply to the second action if control was lost between the two actions.
- Tech 3/4 vs 4/4 discount transition within the same round — if a player goes from 3/4 to 4/4 control between two of their own develop actions, the second action should get the 4/4 discount (control state is re-checked per action, not cached per turn).
- Stacking Tech discount with Construction Boom (BN07) and/or Infrastructure Investment / Expansion Subsidies policies follows Section 15A: base cost → district-control discount → policy/event/card modifiers → one minimum-10-Credits clamp → payment.

## Disconnected Player

- Disconnected player is the active player when their turn would start — 60s reconnection window applies before auto-completing (Section 29.3/29.5).
- Disconnected player mid-auction — auto-passes (bid 0), does not block other players' bidding window (Section 29.5).
- Disconnected player mid-Council-vote — auto-abstains (0 votes), does not block the 45s timer for others (Section 29.5).
- Disconnected player targeted by another player's Trade proposal — connection state does not bypass Section 19.2 validation. The normal turn timer continues because Trade is not a separately timed sub-phase; a later confirmation is accepted only while the trade remains legal in the current phase and state.
- Player disconnects during emergency-sale selection — deterministic automatic liquidation occurs immediately in ascending current liquidation value order, with lowest property ID as the tie-break.
- Player disconnects and reconnects mid-Breaking-News or mid-Round-Resolution (a phase with no player input) — should have no effect on that phase's automatic processing.

## Timeout During Mandatory Fee

- When mandatory-fee resolution enters Emergency Sale, the 60-second normal turn timer pauses and the separate 30-second emergency-sale timer runs. If it expires, the server liquidates eligible properties by ascending current liquidation value, ties by lowest property ID, until payment is possible.
- If every eligible property has been liquidated and the fee still cannot be paid, the player pays all remaining Credits, balance becomes 0, the fee is partially paid, and the player is not eliminated (Section 28.2.8).

## Room A vs Room B Isolation

- Two concurrent game rooms — actions, dice rolls, chat/trade proposals, and state updates in Room A must never appear in or affect Room B.
- Player state (Credits, cards, objective) for a player in Room A must not leak into Room B's state queries, even if the same player account is technically capable of being in both (if multi-room membership is possible at all — confirm whether it's blocked).
- Breaking News/Council/Special Event random draws in Room A and Room B must be independently seeded — no shared draw state.
- Reconnection logic must route a reconnecting player back to the correct room and correct in-room position, never cross-room.

## Private Card/Objective Leakage

- Strategy Card hand contents must never be visible to other players via any state payload, spectator view, or projector display — only the *played* card's effect is public (Section 20.2 "Visibility").
- Secret Objective must remain hidden from all other players (and the projector) until Final Scoring reveal (Section 24.2) — check for leakage via debug panels, network payloads sent to all clients, or projector broadcasts that include full player state.
- City Council individual vote allocations must never be exposed to any player or the projector, even after the round ends — only winning policy + totals are public (Section 23.2.8, Section 33.13).
- Verify server API/websocket payloads are player-scoped (each player only receives their own private fields), not a single broadcast containing everyone's private data filtered client-side (a common source of leakage even when the UI hides it).

---

## Clarification Audit Result

The product-owner rulings resolve the previously flagged City Center/Shortcut, Entertainment movement, and emergency-sale timer interactions. The disconnected trade-target case is governed by existing phase/state validation and the continuously running normal turn timer; it requires an integration test, not an additional gameplay rule.

No unresolved gameplay ambiguity remains in this checklist.
