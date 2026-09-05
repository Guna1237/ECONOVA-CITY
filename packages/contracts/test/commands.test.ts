import { describe, expect, it } from "vitest";

import {
  adminCommandSchema,
  clientCommandSchema,
  clientMessageSchema,
  serverMessageSchema
} from "../src/index.js";

const envelope = {
  requestId: "req_01J9Y7K4QXH1PH55GG8NWQK5X4",
  actionId: "act_01J9Y7K4QXH1PH55GG8NWQK5X5",
  expectedStateVersion: 12
};

describe("client gameplay command contract", () => {
  it("accepts a versioned roll request", () => {
    expect(
      clientCommandSchema.parse({
        ...envelope,
        type: "roll"
      })
    ).toEqual({ ...envelope, type: "roll" });
  });

  it("accepts an Insurance reaction without accepting a client-calculated fee", () => {
    const result = clientCommandSchema.safeParse({
      ...envelope,
      type: "play_card",
      cardId: "SC12",
      reactionTo: "landing_fee",
      landingFee: 0
    });

    expect(result.success).toBe(false);
  });

  it("rejects client-supplied identity and authoritative values", () => {
    const result = clientCommandSchema.safeParse({
      ...envelope,
      type: "buy_property",
      propertyId: "P01",
      playerId: "player-forged",
      creditsAfterPurchase: 99_999
    });

    expect(result.success).toBe(false);
  });

  it("requires a non-negative expected state version", () => {
    const result = clientCommandSchema.safeParse({
      ...envelope,
      expectedStateVersion: -1,
      type: "end_turn"
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown action types", () => {
    const result = clientCommandSchema.safeParse({
      ...envelope,
      type: "set_credits",
      amount: 1_000_000
    });

    expect(result.success).toBe(false);
  });

  it("supports objective setup, optional auctions, and split Council allocations", () => {
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "choose_objective",
        objectiveId: "OBJ03"
      }).success
    ).toBe(true);
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "start_auction",
        propertyId: "P04"
      }).success
    ).toBe(true);
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "council_vote",
        councilId: "council-round-3",
        optionAInfluence: 2,
        optionBInfluence: 1
      }).success
    ).toBe(true);
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "pay_landing_fee"
      }).success
    ).toBe(true);
  });

  it("targets Demand changes by district, not by a client-derived property", () => {
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "change_demand",
        districtId: "tech",
        delta: 1
      }).success
    ).toBe(true);
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "change_demand",
        propertyId: "P02",
        delta: 1
      }).success
    ).toBe(false);
  });

  it("rejects non-canonical districts for Special Event choices", () => {
    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "select_event_district",
        eventId: "SE03",
        districtId: "central"
      }).success
    ).toBe(false);
  });
});

describe("admin command contract", () => {
  it("keeps privileged commands in a separate schema", () => {
    expect(
      adminCommandSchema.parse({
        ...envelope,
        type: "admin_pause_game",
        reason: "Projector recovery"
      })
    ).toMatchObject({ type: "admin_pause_game" });

    expect(
      clientCommandSchema.safeParse({
        ...envelope,
        type: "admin_pause_game",
        reason: "forged"
      }).success
    ).toBe(false);
  });
});

describe("connection and server message contracts", () => {
  it("parses authenticated resume messages without trusting a player id", () => {
    expect(
      clientMessageSchema.parse({
        type: "resume",
        sessionToken: "s".repeat(32),
        lastSeenStateVersion: 11
      })
    ).toEqual({
      type: "resume",
      sessionToken: "s".repeat(32),
      lastSeenStateVersion: 11
    });
  });

  it("rejects malformed state snapshots", () => {
    expect(
      serverMessageSchema.safeParse({
        type: "state_snapshot",
        roomId: "room-a",
        stateVersion: -1,
        projection: "not-an-object"
      }).success
    ).toBe(false);
  });
});
