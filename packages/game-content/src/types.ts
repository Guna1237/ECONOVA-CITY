export type DistrictId = "food" | "tech" | "entertainment" | "mobility";
export type PropertyTier = "cheap" | "mid" | "premium";

export interface PropertyDefinition {
  readonly id: string;
  readonly name: string;
  readonly district: DistrictId;
  readonly tier: PropertyTier;
  readonly boardPosition: number;
  readonly basePrice: number;
  readonly baseValue: number;
  readonly developmentCosts: readonly [number, number, number];
  readonly developmentValueBonus: number;
  readonly baseIncome: number;
  readonly developmentIncomeBonus: number;
  readonly demandIncomeMultiplier: number;
  readonly baseFee: number;
  readonly developmentFeeBonus: number;
  readonly demandFeeMultiplier: number;
}

export type BoardSpace =
  | {
      readonly position: number;
      readonly type: "special";
      readonly specialId:
        | "city_center"
        | "innovation_hub"
        | "market_square"
        | "observatory";
      readonly name: string;
    }
  | {
      readonly position: number;
      readonly type: "property";
      readonly propertyId: string;
      readonly name: string;
    };

export type StrategyCardTiming =
  | "before_roll"
  | "before_buy"
  | "action_phase"
  | "after_roll_before_move"
  | "landing_fee_reaction";

export interface StrategyCardDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly timing: StrategyCardTiming;
  readonly actionCost: 0 | 1;
  readonly effect: Readonly<Record<string, unknown> & { type: string }>;
}

export interface EventDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: Readonly<Record<string, unknown> & { type: string }>;
  readonly duration?: "instant" | "round";
}

export interface PolicyDefinition {
  readonly id: string;
  readonly pair: 1 | 2 | 3 | 4;
  readonly round: 3 | 6;
  readonly option: "A" | "B";
  readonly name: string;
  readonly description: string;
  readonly effect: Readonly<Record<string, unknown> & { type: string }>;
}

export interface ObjectiveDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly score: 200;
  readonly condition: Readonly<Record<string, unknown> & { type: string }>;
}
