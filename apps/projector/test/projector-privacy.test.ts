import { describe, expect, it } from "vitest";

import { publicProjectionSchema } from "@econova/contracts";
import { GAME_CONFIG, PROPERTY_BY_ID } from "@econova/game-content";

import { demonstrationPublicState } from "../src/demonstrationState.js";

/**
 * The projector faces a room. Anything private that reaches this client is
 * visible to every player at once, so the shape of its data is a safety
 * property, not a preference.
 */
describe("projector shows public state only", () => {
  const serialised = JSON.stringify(demonstrationPublicState);

  it("satisfies the public projection contract", () => {
    expect(publicProjectionSchema.safeParse(demonstrationPublicState).success).toBe(true);
  });

  it("carries no private player fields", () => {
    for (const field of [
      "credits",
      "influence",
      "cards",
      "objectiveId",
      "objectiveOffer",
      "councilAllocation",
      "ownBid",
      "capabilities",
      "sessionToken",
      "token"
    ]) {
      expect(serialised).not.toContain(`"${field}"`);
    }
  });

  it("exposes only name, position, holdings and presence per player", () => {
    for (const player of demonstrationPublicState.players) {
      expect(Object.keys(player).sort()).toEqual([
        "connected",
        "name",
        "playerId",
        "position",
        "propertyIds"
      ]);
    }
  });

  it("uses canonical properties and stays inside the demand range", () => {
    for (const record of demonstrationPublicState.properties) {
      expect(PROPERTY_BY_ID.has(record.propertyId)).toBe(true);
    }
    for (const value of Object.values(demonstrationPublicState.demand)) {
      expect(Math.abs(value)).toBeLessThanOrEqual(GAME_CONFIG.demandMaximum);
    }
  });

  it("never reveals an individual bid while an auction is open", () => {
    const auction = demonstrationPublicState.auction;
    if (auction === null) return;
    expect(Object.keys(auction)).not.toContain("bids");
    expect(Object.keys(auction)).toContain("submittedCount");
  });
});
