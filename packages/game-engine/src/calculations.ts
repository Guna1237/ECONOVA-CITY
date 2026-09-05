import {
  GAME_CONFIG,
  PROPERTIES,
  PROPERTY_BY_ID,
  type DistrictId
} from "@econova/game-content";

import { GameRuleError } from "./errors.js";

export type DevelopmentLevel = 0 | 1 | 2 | 3;

const getProperty = (propertyId: string) => {
  const property = PROPERTY_BY_ID.get(propertyId);
  if (property === undefined) {
    throw new GameRuleError("UNKNOWN_PROPERTY", `Unknown property: ${propertyId}`);
  }
  return property;
};

const clampDemand = (demand: number): number =>
  Math.max(GAME_CONFIG.demandMinimum, Math.min(GAME_CONFIG.demandMaximum, demand));

export interface MovementInput {
  readonly position: number;
  readonly dieRoll: number;
  readonly direction: "forward" | "backward";
  readonly entertainmentPropertiesOwned: number;
}

export interface MovementResult {
  readonly origin: number;
  readonly destination: number;
  readonly baseDistance: number;
  readonly totalDistance: number;
  readonly direction: "forward" | "backward";
  readonly passedCityCenter: boolean;
}

export const resolveMovement = (input: MovementInput): MovementResult => {
  if (!Number.isInteger(input.position) || input.position < 0 || input.position >= 20) {
    throw new GameRuleError("INVALID_POSITION", "Board position must be from 0 through 19.");
  }
  if (!Number.isInteger(input.dieRoll) || input.dieRoll < 1 || input.dieRoll > 6) {
    throw new GameRuleError("INVALID_ROLL", "Die roll must be from 1 through 6.");
  }

  const entertainmentBonus =
    input.direction === "forward"
      ? input.entertainmentPropertiesOwned >= 4
        ? 2
        : input.entertainmentPropertiesOwned >= 3
          ? 1
          : 0
      : 0;
  const totalDistance = input.dieRoll + entertainmentBonus;
  const signedDistance = input.direction === "forward" ? totalDistance : -totalDistance;
  const destination =
    (input.position + signedDistance + GAME_CONFIG.boardSpaces) % GAME_CONFIG.boardSpaces;

  return {
    origin: input.position,
    destination,
    baseDistance: input.dieRoll,
    totalDistance,
    direction: input.direction,
    passedCityCenter:
      input.direction === "forward" && input.position + totalDistance >= GAME_CONFIG.boardSpaces
  };
};

export interface TemporaryPriceModifier {
  readonly amount: number;
  readonly minimum: number;
}

export const calculatePurchasePrice = (input: {
  readonly basePrice: number;
  readonly temporaryModifiers: readonly TemporaryPriceModifier[];
}): number => {
  const modified = input.temporaryModifiers.reduce(
    (price, modifier) => price + modifier.amount,
    input.basePrice
  );
  const minimum = Math.max(0, ...input.temporaryModifiers.map(({ minimum }) => minimum));
  return Math.max(minimum, modified);
};

export const calculateDevelopmentCost = (input: {
  readonly baseCost: number;
  readonly districtControlDiscount: number;
  readonly otherModifiers: readonly number[];
  readonly skipPayment?: boolean;
}): number => {
  if (input.skipPayment === true) return 0;
  const afterDistrictControl = input.baseCost - input.districtControlDiscount;
  const modified = input.otherModifiers.reduce((cost, modifier) => cost + modifier, afterDistrictControl);
  return Math.max(GAME_CONFIG.minimumDevelopmentCost, modified);
};

const applyTemporaryModifiers = (
  value: number,
  additive: readonly number[],
  multipliers: readonly number[]
): number => {
  const added = additive.reduce((total, modifier) => total + modifier, value);
  return multipliers.reduce((total, multiplier) => total * multiplier, added);
};

export const calculatePropertyIncome = (input: {
  readonly propertyId: string;
  readonly developmentLevel: DevelopmentLevel;
  readonly demand: number;
  readonly temporaryAdditiveModifiers: readonly number[];
  readonly temporaryMultipliers: readonly number[];
  readonly policyAdditiveModifiers: readonly number[];
  readonly demandMultiplier: number;
}): number => {
  const property = getProperty(input.propertyId);
  const demandContribution =
    clampDemand(input.demand) * property.demandIncomeMultiplier * input.demandMultiplier;
  const withDemand =
    property.baseIncome + property.developmentIncomeBonus * input.developmentLevel + demandContribution;
  const withTemporary = applyTemporaryModifiers(
    withDemand,
    input.temporaryAdditiveModifiers,
    input.temporaryMultipliers
  );
  const withPolicies = input.policyAdditiveModifiers.reduce(
    (income, modifier) => income + modifier,
    withTemporary
  );
  return Math.max(0, withPolicies);
};

export const calculateLandingFee = (input: {
  readonly propertyId: string;
  readonly developmentLevel: DevelopmentLevel;
  readonly demand: number;
  readonly temporaryAdditiveModifiers: readonly number[];
  readonly temporaryMultipliers: readonly number[];
  readonly policyAdditiveModifiers: readonly number[];
  readonly demandMultiplier: number;
  readonly insured: boolean;
}): number => {
  const property = getProperty(input.propertyId);
  const demandContribution =
    clampDemand(input.demand) * property.demandFeeMultiplier * input.demandMultiplier;
  const withDemand =
    property.baseFee + property.developmentFeeBonus * input.developmentLevel + demandContribution;
  const withTemporary = applyTemporaryModifiers(
    withDemand,
    input.temporaryAdditiveModifiers,
    input.temporaryMultipliers
  );
  const withPolicies = input.policyAdditiveModifiers.reduce(
    (fee, modifier) => fee + modifier,
    withTemporary
  );
  const clamped = Math.max(GAME_CONFIG.minimumLandingFee, withPolicies);
  return input.insured ? 0 : clamped;
};

export const calculatePropertyValue = (
  propertyId: string,
  developmentLevel: DevelopmentLevel
): number => {
  const property = getProperty(propertyId);
  return property.baseValue + property.developmentValueBonus * developmentLevel;
};

export const calculateLiquidationValue = (
  propertyId: string,
  developmentLevel: DevelopmentLevel
): number => Math.floor(calculatePropertyValue(propertyId, developmentLevel) * 0.5);

export interface OwnedPropertyForCalculation {
  readonly propertyId: string;
  readonly developmentLevel: DevelopmentLevel;
}

export const sortPropertiesForAutomaticLiquidation = (
  properties: readonly OwnedPropertyForCalculation[]
): Array<OwnedPropertyForCalculation & { liquidationValue: number }> =>
  properties
    .map((property) => ({
      ...property,
      liquidationValue: calculateLiquidationValue(
        property.propertyId,
        property.developmentLevel
      )
    }))
    .sort(
      (left, right) =>
        left.liquidationValue - right.liquidationValue ||
        left.propertyId.localeCompare(right.propertyId)
    );

export const getDistrictControl = (
  propertyIds: readonly string[]
): Partial<Record<DistrictId, 3 | 4>> => {
  const counts = new Map<DistrictId, number>();
  for (const propertyId of propertyIds) {
    const district = getProperty(propertyId).district;
    counts.set(district, (counts.get(district) ?? 0) + 1);
  }

  const result: Partial<Record<DistrictId, 3 | 4>> = {};
  for (const district of ["food", "tech", "entertainment", "mobility"] as const) {
    const count = counts.get(district) ?? 0;
    if (count >= 4) result[district] = 4;
    else if (count >= 3) result[district] = 3;
  }
  return result;
};

export interface FinalScoreBreakdown {
  readonly credits: number;
  readonly propertyValue: number;
  readonly districtControl: number;
  readonly influence: number;
  readonly objective: number;
  readonly fullDistrictControl: number;
  readonly total: number;
}

export const calculateFinalScore = (input: {
  readonly credits: number;
  readonly influence: number;
  readonly properties: readonly OwnedPropertyForCalculation[];
  readonly objectiveCompleted: boolean;
}): FinalScoreBreakdown => {
  const propertyValue = input.properties.reduce(
    (sum, property) => sum + calculatePropertyValue(property.propertyId, property.developmentLevel),
    0
  );
  const controls = getDistrictControl(input.properties.map(({ propertyId }) => propertyId));
  const districtControl = Object.values(controls).reduce<number>(
    (sum, control) => sum + (control === 4 ? 100 : 50),
    0
  );
  const fullDistrictControl =
    Object.values(controls).filter((control) => control === 4).length *
    GAME_CONFIG.fullDistrictFinalScoreBonus;
  const influence = input.influence * GAME_CONFIG.influenceFinalScoreMultiplier;
  const objective = input.objectiveCompleted ? GAME_CONFIG.secretObjectiveScore : 0;
  const credits = Math.max(0, input.credits);

  return {
    credits,
    propertyValue,
    districtControl,
    influence,
    objective,
    fullDistrictControl,
    total: credits + propertyValue + districtControl + influence + objective + fullDistrictControl
  };
};

export const getAllPropertyIds = (): string[] => PROPERTIES.map(({ id }) => id);
