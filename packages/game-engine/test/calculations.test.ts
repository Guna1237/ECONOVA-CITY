import { describe, expect, it } from "vitest";

import {
  calculateDevelopmentCost,
  calculateFinalScore,
  calculateLandingFee,
  calculatePropertyIncome,
  calculatePropertyValue,
  calculatePurchasePrice,
  evaluateSecretObjective,
  getDistrictControl,
  rankFinalScores,
  resolveMovement,
  sortPropertiesForAutomaticLiquidation
} from "../src/index.js";

describe("movement", () => {
  it("uses modified forward distance to detect City Center passing", () => {
    expect(
      resolveMovement({
        position: 18,
        dieRoll: 2,
        direction: "forward",
        entertainmentPropertiesOwned: 4
      })
    ).toEqual({
      origin: 18,
      destination: 2,
      baseDistance: 2,
      totalDistance: 4,
      direction: "forward",
      passedCityCenter: true
    });
  });

  it("uses the unmodified die roll for Shortcut and never awards City Center passing", () => {
    expect(
      resolveMovement({
        position: 2,
        dieRoll: 4,
        direction: "backward",
        entertainmentPropertiesOwned: 4
      })
    ).toMatchObject({
      destination: 18,
      totalDistance: 4,
      passedCityCenter: false
    });
  });
});

describe("universal modifier precedence", () => {
  it("applies temporary purchase modifiers before the strongest applicable clamp", () => {
    expect(
      calculatePurchasePrice({
        basePrice: 80,
        temporaryModifiers: [
          { amount: -40, minimum: 40 },
          { amount: -20, minimum: 50 }
        ]
      })
    ).toBe(50);
  });

  it("applies district control before other development modifiers and clamps at 10", () => {
    expect(
      calculateDevelopmentCost({
        baseCost: 40,
        districtControlDiscount: 30,
        otherModifiers: [-20]
      })
    ).toBe(10);
  });

  it("keeps Quick Build free rather than applying the development clamp", () => {
    expect(
      calculateDevelopmentCost({
        baseCost: 100,
        districtControlDiscount: 0,
        otherModifiers: [],
        skipPayment: true
      })
    ).toBe(0);
  });

  it("calculates income in the locked category order", () => {
    expect(
      calculatePropertyIncome({
        propertyId: "P01",
        developmentLevel: 3,
        demand: 2,
        temporaryAdditiveModifiers: [10],
        temporaryMultipliers: [],
        policyAdditiveModifiers: [-5],
        demandMultiplier: 1
      })
    ).toBe(36);
  });

  it("applies temporary income multipliers before policy additives", () => {
    expect(
      calculatePropertyIncome({
        propertyId: "P01",
        developmentLevel: 0,
        demand: 0,
        temporaryAdditiveModifiers: [10],
        temporaryMultipliers: [2],
        policyAdditiveModifiers: [-5],
        demandMultiplier: 1
      })
    ).toBe(35);
  });

  it("applies temporary landing-fee multipliers before policy additives", () => {
    expect(
      calculateLandingFee({
        propertyId: "P01",
        developmentLevel: 0,
        demand: 0,
        temporaryAdditiveModifiers: [-5],
        temporaryMultipliers: [2],
        policyAdditiveModifiers: [10],
        demandMultiplier: 1,
        insured: false
      })
    ).toBe(30);
  });

  it("Free Market doubles only the Demand contribution", () => {
    expect(
      calculatePropertyIncome({
        propertyId: "P16",
        developmentLevel: 0,
        demand: 2,
        temporaryAdditiveModifiers: [],
        temporaryMultipliers: [],
        policyAdditiveModifiers: [],
        demandMultiplier: 2
      })
    ).toBe(57);
  });

  it("applies Insurance after the landing-fee minimum clamp", () => {
    expect(
      calculateLandingFee({
        propertyId: "P13",
        developmentLevel: 0,
        demand: -2,
        temporaryAdditiveModifiers: [-100],
        temporaryMultipliers: [],
        policyAdditiveModifiers: [],
        demandMultiplier: 1,
        insured: true
      })
    ).toBe(0);
  });
});

describe("control, liquidation, and scoring", () => {
  it("recognizes 3/4 control and 4/4 full control", () => {
    expect(getDistrictControl(["P01", "P05", "P10"])).toEqual({ food: 3 });
    expect(getDistrictControl(["P01", "P05", "P10", "P15"])).toEqual({ food: 4 });
  });

  it("sorts automatic liquidation by current value then property id", () => {
    expect(
      sortPropertiesForAutomaticLiquidation([
        { propertyId: "P06", developmentLevel: 0 },
        { propertyId: "P05", developmentLevel: 0 },
        { propertyId: "P01", developmentLevel: 1 }
      ]).map(({ propertyId }) => propertyId)
    ).toEqual(["P01", "P05", "P06"]);
  });

  it("scores full control with both approved full-control bonuses", () => {
    const properties = ["P01", "P05", "P10", "P15"].map((propertyId) => ({
      propertyId,
      developmentLevel: 0 as const
    }));

    expect(calculatePropertyValue("P15", 0)).toBe(300);
    expect(
      calculateFinalScore({
        credits: 1_000,
        influence: 5,
        properties,
        objectiveCompleted: true
      })
    ).toEqual({
      credits: 1_000,
      propertyValue: 680,
      districtControl: 100,
      influence: 50,
      objective: 200,
      fullDistrictControl: 100,
      total: 2_130
    });
  });

  it("evaluates approved objectives and preserves joint placement after all tie-breakers", () => {
    expect(
      evaluateSecretObjective("OBJ06", {
        credits: 900,
        influence: 4,
        properties: ["P01", "P02", "P03", "P04", "P05"].map((propertyId) => ({
          propertyId,
          developmentLevel: 0 as const
        }))
      })
    ).toBe(true);

    expect(
      rankFinalScores([
        { playerId: "a", total: 500, credits: 100, propertyValue: 200, propertyCount: 2 },
        { playerId: "b", total: 500, credits: 100, propertyValue: 200, propertyCount: 2 },
        { playerId: "c", total: 500, credits: 90, propertyValue: 300, propertyCount: 4 }
      ]).map(({ playerId, rank }) => ({ playerId, rank }))
    ).toEqual([
      { playerId: "a", rank: 1 },
      { playerId: "b", rank: 1 },
      { playerId: "c", rank: 3 }
    ]);
  });
});
