import type { PolicyDefinition } from "./types.js";

export const POLICIES = Object.freeze([
  { id: "POL01A", pair: 1, round: 3, option: "A", name: "Green Initiative", description: "Food and Mobility Demand +1; Entertainment Demand -1.", effect: { type: "demand_deltas", deltas: { food: 1, mobility: 1, entertainment: -1 } } },
  { id: "POL01B", pair: 1, round: 3, option: "B", name: "Digital Transformation", description: "Tech Demand +2; Food Demand -1.", effect: { type: "demand_deltas", deltas: { tech: 2, food: -1 } } },
  { id: "POL02A", pair: 2, round: 3, option: "A", name: "Tourism Drive", description: "Entertainment Demand +1; all landing fees +10 for the rest of the game.", effect: { type: "demand_and_landing_fee", district: "entertainment", delta: 1, feeDelta: 10 } },
  { id: "POL02B", pair: 2, round: 3, option: "B", name: "Infrastructure Investment", description: "Mobility Demand +1; development costs -10 for the rest of the game, minimum 10.", effect: { type: "demand_and_development_discount", district: "mobility", delta: 1, amount: 10, minimum: 10 } },
  { id: "POL03A", pair: 3, round: 6, option: "A", name: "Austerity Measures", description: "Property income -5, minimum 0; every player immediately gains 80 Credits.", effect: { type: "income_penalty_and_credit_grant", incomeDelta: -5, credits: 80 } },
  { id: "POL03B", pair: 3, round: 6, option: "B", name: "Expansion Subsidies", description: "Development costs -20 for the rest of the game, minimum 10.", effect: { type: "development_discount", amount: 20, minimum: 10 } },
  { id: "POL04A", pair: 4, round: 6, option: "A", name: "Market Regulation", description: "Influence Demand actions disabled; all Demand set to 0.", effect: { type: "regulate_market" } },
  { id: "POL04B", pair: 4, round: 6, option: "B", name: "Free Market", description: "Demand effects are doubled in income and fee formulas.", effect: { type: "double_demand_modifiers" } }
] satisfies readonly PolicyDefinition[]);

export const POLICY_PAIRS = Object.freeze([
  Object.freeze({ pair: 1 as const, round: 3 as const, policyIds: ["POL01A", "POL01B"] as const }),
  Object.freeze({ pair: 2 as const, round: 3 as const, policyIds: ["POL02A", "POL02B"] as const }),
  Object.freeze({ pair: 3 as const, round: 6 as const, policyIds: ["POL03A", "POL03B"] as const }),
  Object.freeze({ pair: 4 as const, round: 6 as const, policyIds: ["POL04A", "POL04B"] as const })
]);

export const POLICY_BY_ID = new Map(POLICIES.map((policy) => [policy.id, policy]));
