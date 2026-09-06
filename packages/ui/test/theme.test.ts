import { describe, expect, it } from "vitest";

import { BOARD_SPACES, PROPERTIES } from "@econova/game-content";

import {
  DISTRICTS,
  DISTRICT_ORDER,
  PHASE_LABEL,
  SEAT_COUNT,
  STAGE_LABEL,
  formatClock,
  formatCredits,
  formatSigned,
  seatOf
} from "../src/theme.js";

describe("district identity", () => {
  it("covers the four canonical districts and no others", () => {
    expect([...DISTRICT_ORDER].sort()).toEqual([
      "entertainment",
      "food",
      "mobility",
      "tech"
    ]);
    expect(Object.keys(DISTRICTS).sort()).toEqual([...DISTRICT_ORDER].sort());
  });

  it("gives every district a non-colour identifier", () => {
    const marks = DISTRICT_ORDER.map((id) => DISTRICTS[id].mark);
    // Colour is never the only cue, so the marks must be distinct too.
    expect(new Set(marks).size).toBe(DISTRICT_ORDER.length);
  });

  it("points every district colour at a token rather than a literal", () => {
    for (const id of DISTRICT_ORDER) {
      for (const value of Object.values(DISTRICTS[id].vars)) {
        expect(value).toMatch(/^var\(--district-/);
      }
    }
  });

  it("has a theme for every district used by canonical content", () => {
    for (const property of PROPERTIES) {
      expect(DISTRICTS[property.district]).toBeDefined();
    }
  });
});

describe("seats", () => {
  const order = ["p1", "p2", "p3", "p4", "p5", "p6"];

  it("assigns a distinct colour and silhouette per seat", () => {
    const seats = order.map((id) => seatOf(id, order));
    expect(new Set(seats.map((seat) => seat.color)).size).toBe(SEAT_COUNT);
    expect(new Set(seats.map((seat) => seat.shape)).size).toBe(SEAT_COUNT);
  });

  it("keeps a player's seat stable regardless of who is asked about", () => {
    expect(seatOf("p3", order).index).toBe(2);
    expect(seatOf("p3", order)).toEqual(seatOf("p3", order));
  });

  it("falls back to the first seat for a player not in the turn order", () => {
    // A spectator-facing surface must still render rather than throw.
    expect(seatOf("unknown", order).index).toBe(0);
  });

  it("uses ownership colours that are separate from district colours", () => {
    const seatColours = order.map((id) => seatOf(id, order).color);
    for (const colour of seatColours) expect(colour).toMatch(/^var\(--seat-/);
  });
});

describe("game vocabulary", () => {
  it("labels every phase the contract can report", () => {
    const phases = [
      "objective_selection",
      "ready",
      "breaking_news",
      "strategy_draw",
      "council",
      "player_turn",
      "round_resolution",
      "paused",
      "completed"
    ];
    for (const phase of phases) expect(PHASE_LABEL[phase]).toBeTruthy();
  });

  it("labels every turn stage the contract can report", () => {
    const stages = [
      "awaiting_roll",
      "awaiting_shortcut_choice",
      "awaiting_property_decision",
      "auction",
      "landing_fee_reaction",
      "emergency_sale",
      "awaiting_event_choice",
      "awaiting_card_discard",
      "action_phase"
    ];
    for (const stage of stages) expect(STAGE_LABEL[stage]).toBeTruthy();
  });

  it("names every canonical board space", () => {
    for (const space of BOARD_SPACES) expect(space.name.length).toBeGreaterThan(0);
  });
});

describe("number formatting", () => {
  it("groups credits so large values stay readable at a glance", () => {
    expect(formatCredits(1_000)).toBe("1,000");
    expect(formatCredits(80)).toBe("80");
  });

  it("signs demand so direction reads without colour", () => {
    expect(formatSigned(2)).toBe("+2");
    expect(formatSigned(-1)).toBe("-1");
    expect(formatSigned(0)).toBe("0");
  });

  it("counts a deadline down and stops at zero", () => {
    expect(formatClock(45_000)).toBe("45");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(-5_000)).toBe("0");
  });
});
