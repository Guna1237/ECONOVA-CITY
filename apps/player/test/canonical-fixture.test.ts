import { describe, expect, it } from "vitest";

import {
  playerProjectionSchema,
  publicProjectionSchema
} from "@econova/contracts";
import {
  BREAKING_NEWS,
  GAME_CONFIG,
  OBJECTIVE_BY_ID,
  POLICY_BY_ID,
  PROPERTY_BY_ID,
  STRATEGY_CARD_BY_ID
} from "@econova/game-content";

import {
  demonstrationPlayerState,
  demonstrationPublicState
} from "../src/fixtures/demonstrationState.js";

/**
 * The demonstration board is the one place the frontend supplies game data of
 * its own. It has to be canonical in every particular, because a fixture that
 * drifts is how invented districts and fake credit totals get on screen.
 */
describe("demonstration fixture is canonical", () => {
  it("satisfies the contract projections", () => {
    expect(publicProjectionSchema.safeParse(demonstrationPublicState).success).toBe(true);
    expect(playerProjectionSchema.safeParse(demonstrationPlayerState).success).toBe(true);
  });

  it("references only canonical properties", () => {
    expect(demonstrationPublicState.properties).toHaveLength(16);
    for (const record of demonstrationPublicState.properties) {
      expect(PROPERTY_BY_ID.has(record.propertyId)).toBe(true);
      expect(record.developmentLevel).toBeLessThanOrEqual(
        GAME_CONFIG.maximumDevelopmentLevel
      );
    }
  });

  it("keeps demand inside the canonical range", () => {
    for (const value of Object.values(demonstrationPublicState.demand)) {
      expect(value).toBeGreaterThanOrEqual(GAME_CONFIG.demandMinimum);
      expect(value).toBeLessThanOrEqual(GAME_CONFIG.demandMaximum);
    }
  });

  it("stays inside the configured round count and player count", () => {
    expect(demonstrationPublicState.round).toBeGreaterThan(0);
    expect(demonstrationPublicState.round).toBeLessThanOrEqual(GAME_CONFIG.rounds);
    expect(demonstrationPublicState.players.length).toBeGreaterThanOrEqual(
      GAME_CONFIG.minPlayers
    );
    expect(demonstrationPublicState.players.length).toBeLessThanOrEqual(
      GAME_CONFIG.maxPlayers
    );
  });

  it("references only canonical events and policies", () => {
    const newsId = demonstrationPublicState.activeBreakingNewsId;
    if (newsId !== null) {
      expect(BREAKING_NEWS.some((entry) => entry.id === newsId)).toBe(true);
    }
    for (const policyId of demonstrationPublicState.activePolicyIds) {
      expect(POLICY_BY_ID.has(policyId)).toBe(true);
    }
  });

  it("gives the player a canonical objective and a legal hand", () => {
    const { self } = demonstrationPlayerState;
    expect(self.objectiveId).not.toBeNull();
    expect(OBJECTIVE_BY_ID.has(self.objectiveId as string)).toBe(true);
    expect(self.cards.length).toBeLessThanOrEqual(GAME_CONFIG.strategyCardHandLimit);
    for (const cardId of self.cards) expect(STRATEGY_CARD_BY_ID.has(cardId)).toBe(true);
  });

  it("keeps every player on a real board space", () => {
    for (const player of demonstrationPublicState.players) {
      expect(player.position).toBeGreaterThanOrEqual(0);
      expect(player.position).toBeLessThan(GAME_CONFIG.boardSpaces);
    }
  });

  it("agrees with itself about who owns what", () => {
    for (const player of demonstrationPublicState.players) {
      for (const propertyId of player.propertyIds) {
        const record = demonstrationPublicState.properties.find(
          (entry) => entry.propertyId === propertyId
        );
        expect(record?.ownerId).toBe(player.playerId);
      }
    }
  });

  it("carries no invented identifiers", () => {
    const serialised = JSON.stringify(demonstrationPlayerState);
    for (const invented of [
      "prop_0",
      "OBJ_",
      "POL_ECO",
      "District 2",
      "Financial",
      "Logistics"
    ]) {
      expect(serialised).not.toContain(invented);
    }
  });
});
