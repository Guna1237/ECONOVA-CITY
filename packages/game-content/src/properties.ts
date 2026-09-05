import type { BoardSpace, DistrictId, PropertyDefinition, PropertyTier } from "./types.js";

const tierEconomics = {
  cheap: {
    basePrice: 80,
    developmentCosts: [40, 60, 80],
    developmentValueBonus: 30,
    baseIncome: 10,
    developmentIncomeBonus: 5,
    demandIncomeMultiplier: 3,
    baseFee: 15,
    developmentFeeBonus: 10,
    demandFeeMultiplier: 5
  },
  mid: {
    basePrice: 150,
    developmentCosts: [60, 90, 120],
    developmentValueBonus: 50,
    baseIncome: 15,
    developmentIncomeBonus: 8,
    demandIncomeMultiplier: 5,
    baseFee: 25,
    developmentFeeBonus: 15,
    demandFeeMultiplier: 8
  },
  premium: {
    basePrice: 300,
    developmentCosts: [100, 150, 200],
    developmentValueBonus: 100,
    baseIncome: 25,
    developmentIncomeBonus: 15,
    demandIncomeMultiplier: 8,
    baseFee: 50,
    developmentFeeBonus: 30,
    demandFeeMultiplier: 15
  }
} as const;

const defineProperty = (
  id: string,
  name: string,
  district: DistrictId,
  tier: PropertyTier,
  boardPosition: number
): PropertyDefinition => {
  const economics = tierEconomics[tier];
  return Object.freeze({
    id,
    name,
    district,
    tier,
    boardPosition,
    basePrice: economics.basePrice,
    baseValue: economics.basePrice,
    developmentCosts: economics.developmentCosts,
    developmentValueBonus: economics.developmentValueBonus,
    baseIncome: economics.baseIncome,
    developmentIncomeBonus: economics.developmentIncomeBonus,
    demandIncomeMultiplier: economics.demandIncomeMultiplier,
    baseFee: economics.baseFee,
    developmentFeeBonus: economics.developmentFeeBonus,
    demandFeeMultiplier: economics.demandFeeMultiplier
  });
};

export const PROPERTIES = Object.freeze([
  defineProperty("P01", "Street Bites", "food", "cheap", 1),
  defineProperty("P02", "CloudNine Labs", "tech", "cheap", 2),
  defineProperty("P03", "Neon Arena", "entertainment", "cheap", 3),
  defineProperty("P04", "Metro Link", "mobility", "cheap", 4),
  defineProperty("P05", "Harvest Table", "food", "mid", 6),
  defineProperty("P06", "DataForge", "tech", "mid", 7),
  defineProperty("P07", "Velocity Motors", "mobility", "mid", 8),
  defineProperty("P08", "Pixel Palace", "entertainment", "mid", 9),
  defineProperty("P09", "Quantum Dynamics", "tech", "mid", 11),
  defineProperty("P10", "FreshFusion", "food", "mid", 12),
  defineProperty("P11", "SkyRail Transit", "mobility", "mid", 13),
  defineProperty("P12", "The Grand Stage", "entertainment", "mid", 14),
  defineProperty("P13", "Cyber Coliseum", "entertainment", "premium", 15),
  defineProperty("P14", "NexGen AI", "tech", "premium", 16),
  defineProperty("P15", "Epicurean Tower", "food", "premium", 17),
  defineProperty("P16", "AutoPilot HQ", "mobility", "premium", 18)
]);

export const PROPERTY_BY_ID = new Map(PROPERTIES.map((property) => [property.id, property]));

const propertyByPosition = new Map(
  PROPERTIES.map((property) => [property.boardPosition, property] as const)
);

const specialSpaces = new Map<number, BoardSpace>([
  [
    0,
    {
      position: 0,
      type: "special",
      specialId: "city_center",
      name: "City Center"
    }
  ],
  [
    5,
    {
      position: 5,
      type: "special",
      specialId: "innovation_hub",
      name: "Innovation Hub"
    }
  ],
  [
    10,
    {
      position: 10,
      type: "special",
      specialId: "market_square",
      name: "Market Square"
    }
  ],
  [
    19,
    {
      position: 19,
      type: "special",
      specialId: "observatory",
      name: "Observatory"
    }
  ]
]);

export const BOARD_SPACES: readonly BoardSpace[] = Object.freeze(
  Array.from({ length: 20 }, (_, position): BoardSpace => {
    const special = specialSpaces.get(position);
    if (special !== undefined) return Object.freeze(special);

    const property = propertyByPosition.get(position);
    if (property === undefined) {
      throw new Error(`Missing canonical board content at position ${position}`);
    }
    return Object.freeze({
      position,
      type: "property",
      propertyId: property.id,
      name: property.name
    });
  })
);
