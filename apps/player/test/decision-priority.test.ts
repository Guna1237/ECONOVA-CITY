import { describe, expect, it } from "vitest";

import type { PlayerProjectionDto } from "@econova/contracts";

import { selectDecision } from "../src/components/decisions/index.js";
import { demonstrationPlayerState } from "../src/fixtures/demonstrationState.js";

const base = demonstrationPlayerState;

const withSelf = (self: Partial<PlayerProjectionDto["self"]>): PlayerProjectionDto => ({
  ...base,
  self: { ...base.self, ...self } as PlayerProjectionDto["self"]
});

const withPublic = (
  view: Partial<PlayerProjectionDto["public"]>
): PlayerProjectionDto => ({
  ...base,
  public: { ...base.public, ...view } as PlayerProjectionDto["public"]
});

const allow = (
  projection: PlayerProjectionDto,
  ...types: string[]
): PlayerProjectionDto => ({
  ...projection,
  self: {
    ...projection.self,
    capabilities: {
      ...projection.self.capabilities,
      commandTypes: types as never
    }
  }
});

/**
 * Only one decision may be on screen at a time, and it must be the one the
 * rules resolve first — otherwise a player can be asked to bid while they
 * still owe a landing fee.
 */
describe("decision priority", () => {
  it("asks nothing during an ordinary action phase", () => {
    expect(selectDecision(base)).toBeNull();
  });

  it("asks for the secret objective before anything else", () => {
    const projection = allow(
      withSelf({
        objectiveOffer: ["OBJ01", "OBJ02"] as never,
        pendingEventChoice: { eventId: "SE03" }
      }),
      "choose_objective"
    );
    expect(selectDecision(projection)).toBe("objective");
  });

  it("puts an emergency sale ahead of an auction", () => {
    const projection = {
      ...withPublic({
        emergencySale: { playerId: base.self.playerId, deadlineAt: 1 } as never,
        auction: {
          auctionId: "a1",
          propertyId: "P02",
          triggeringPlayerId: base.self.playerId,
          eligiblePlayerIds: [base.self.playerId],
          submittedCount: 0,
          deadlineAt: 1
        } as never
      }),
      self: {
        ...base.self,
        auction: { auctionId: "a1", ownBid: null, hasSubmitted: false }
      }
    } as PlayerProjectionDto;

    expect(selectDecision(projection)).toBe("emergency");
  });

  it("collects the landing fee before offering an auction", () => {
    const projection = {
      ...withPublic({
        auction: {
          auctionId: "a1",
          propertyId: "P02",
          triggeringPlayerId: base.self.playerId,
          eligiblePlayerIds: [base.self.playerId],
          submittedCount: 0,
          deadlineAt: 1
        } as never
      }),
      self: {
        ...base.self,
        pendingLandingFee: {
          payerId: base.self.playerId,
          ownerId: "demo_player_2",
          propertyId: "P06",
          amount: 40
        },
        auction: { auctionId: "a1", ownBid: null, hasSubmitted: false }
      }
    } as PlayerProjectionDto;

    expect(selectDecision(projection)).toBe("landing_fee");
  });

  it("ignores another player's landing fee and emergency sale", () => {
    const projection = {
      ...withPublic({
        emergencySale: { playerId: "demo_player_2", deadlineAt: 1 } as never
      }),
      self: {
        ...base.self,
        pendingLandingFee: {
          payerId: "demo_player_2",
          ownerId: base.self.playerId,
          propertyId: "P06",
          amount: 40
        }
      }
    } as PlayerProjectionDto;

    expect(selectDecision(projection)).toBeNull();
  });

  it("stops asking for a council vote once one has been submitted", () => {
    const council = {
      councilId: "c1",
      optionAId: "POL01A",
      optionBId: "POL01B",
      submittedCount: 1,
      deadlineAt: 1
    } as never;

    expect(selectDecision(withPublic({ council }))).toBe("council");
    expect(
      selectDecision({
        ...withPublic({ council }),
        self: {
          ...base.self,
          councilAllocation: { optionAInfluence: 3, optionBInfluence: 4 }
        }
      } as PlayerProjectionDto)
    ).toBeNull();
  });

  it("only shows a trade to the player being asked", () => {
    const trade = {
      id: "t1",
      proposerPlayerId: "demo_player_2",
      counterpartyPlayerId: base.self.playerId,
      offeredCredits: 100,
      offeredPropertyIds: [],
      requestedCredits: 0,
      requestedPropertyIds: ["P01"],
      createdOnTurn: 9
    } as never;

    expect(selectDecision(withSelf({ trade }))).toBe("trade");
    expect(
      selectDecision(
        withSelf({
          trade: { ...(trade as object), counterpartyPlayerId: "demo_player_3" } as never
        })
      )
    ).toBeNull();
  });

  it("asks for a district once the server names the pending event", () => {
    expect(
      selectDecision(withSelf({ pendingEventChoice: { eventId: "SE04" } }))
    ).toBe("district");
  });

  it("asks for a discard only when the stage and capability agree", () => {
    const stage = withPublic({
      turn: { ...base.public.turn!, stage: "awaiting_card_discard" }
    });
    expect(selectDecision(allow(stage, "discard_card"))).toBe("discard");
    // Capability withheld: the UI must not offer the action.
    expect(selectDecision(allow(stage, "end_turn"))).toBeNull();
  });
});
