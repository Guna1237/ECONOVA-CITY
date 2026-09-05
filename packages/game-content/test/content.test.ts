import { describe, expect, it } from "vitest";

import {
  BOARD_SPACES,
  BREAKING_NEWS,
  GAME_CONFIG,
  POLICIES,
  POLICY_PAIRS,
  PROPERTIES,
  SECRET_OBJECTIVES,
  SPECIAL_EVENTS,
  STRATEGY_CARDS,
  validateGameContent
} from "../src/index.js";

describe("canonical game content", () => {
  it("defines the locked 20-space board with 16 properties", () => {
    expect(BOARD_SPACES).toHaveLength(20);
    expect(PROPERTIES).toHaveLength(16);
    expect(BOARD_SPACES.map((space) => space.position)).toEqual(
      Array.from({ length: 20 }, (_, position) => position)
    );
    expect(BOARD_SPACES.filter((space) => space.type === "special")).toHaveLength(4);
  });

  it("defines each property exactly once with its locked economics", () => {
    expect(new Set(PROPERTIES.map(({ id }) => id)).size).toBe(16);
    expect(PROPERTIES.find(({ id }) => id === "P01")).toMatchObject({
      name: "Street Bites",
      district: "food",
      tier: "cheap",
      boardPosition: 1,
      basePrice: 80,
      developmentCosts: [40, 60, 80]
    });
    expect(PROPERTIES.find(({ id }) => id === "P16")).toMatchObject({
      name: "AutoPilot HQ",
      district: "mobility",
      tier: "premium",
      boardPosition: 18,
      basePrice: 300,
      developmentCosts: [100, 150, 200]
    });
  });

  it("defines all approved card, event, policy, and objective catalogs", () => {
    expect(STRATEGY_CARDS).toHaveLength(12);
    expect(SPECIAL_EVENTS).toHaveLength(8);
    expect(BREAKING_NEWS).toHaveLength(10);
    expect(POLICY_PAIRS).toHaveLength(4);
    expect(POLICIES).toHaveLength(8);
    expect(SECRET_OBJECTIVES).toHaveLength(10);
  });

  it("keeps the Insurance reaction and Shortcut movement semantics structured", () => {
    expect(STRATEGY_CARDS.find(({ id }) => id === "SC11")).toMatchObject({
      timing: "after_roll_before_move",
      actionCost: 0,
      effect: { type: "backward_unmodified_roll" }
    });
    expect(STRATEGY_CARDS.find(({ id }) => id === "SC12")).toMatchObject({
      timing: "landing_fee_reaction",
      actionCost: 1,
      effect: { type: "prevent_landing_fee" }
    });
  });

  it("centralizes approved setup and timer values", () => {
    expect(GAME_CONFIG).toMatchObject({
      minPlayers: 4,
      maxPlayers: 6,
      rounds: 8,
      startingCredits: 1_000,
      startingInfluence: 5,
      startingCards: 2,
      turnActions: 2,
      turnTimerSeconds: 60,
      turnWarningSeconds: 45,
      auctionTimerSeconds: 30,
      emergencySaleTimerSeconds: 30,
      councilTimerSeconds: 45,
      reconnectGraceSeconds: 60
    });
  });

  it("passes repository-level content validation", () => {
    expect(validateGameContent()).toEqual([]);
  });
});
