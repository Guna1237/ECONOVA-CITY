import type { StrategyCardDefinition } from "./types.js";

export const STRATEGY_CARDS = Object.freeze([
  {
    id: "SC01",
    name: "Rush Hour",
    description: "The next dice roll this turn is 6.",
    timing: "before_roll",
    actionCost: 0,
    effect: { type: "replace_next_roll", value: 6 }
  },
  {
    id: "SC02",
    name: "Market Boom",
    description: "Set one district's Demand to +2.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "set_demand", value: 2 }
  },
  {
    id: "SC03",
    name: "Market Crash",
    description: "Set one district's Demand to -2.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "set_demand", value: -2 }
  },
  {
    id: "SC04",
    name: "Flash Sale",
    description: "The next unowned-property purchase this turn costs 40 less, minimum 40.",
    timing: "before_buy",
    actionCost: 0,
    effect: { type: "purchase_discount", amount: 40, minimum: 40 }
  },
  {
    id: "SC05",
    name: "Quick Build",
    description: "Develop one owned property by one level for free.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "free_development" }
  },
  {
    id: "SC06",
    name: "Tax Refund",
    description: "Gain 120 Credits.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "gain_credits", amount: 120 }
  },
  {
    id: "SC07",
    name: "City Connections",
    description: "Gain 60 Credits and 1 Influence.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "gain_credits_and_influence", credits: 60, influence: 1 }
  },
  {
    id: "SC08",
    name: "Urban Renewal",
    description: "One owned property generates double income this round.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "double_property_income_this_round" }
  },
  {
    id: "SC09",
    name: "Lobbying Power",
    description: "Gain 3 Influence.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "gain_influence", amount: 3 }
  },
  {
    id: "SC10",
    name: "Toll Booth",
    description: "The next player landing on any owned property this round pays double fee.",
    timing: "action_phase",
    actionCost: 1,
    effect: { type: "double_next_landing_fee_this_round" }
  },
  {
    id: "SC11",
    name: "Shortcut",
    description: "After rolling, move backward by the unmodified die result.",
    timing: "after_roll_before_move",
    actionCost: 0,
    effect: { type: "backward_unmodified_roll" }
  },
  {
    id: "SC12",
    name: "Insurance Policy",
    description: "React before landing-fee payment; the fee becomes 0.",
    timing: "landing_fee_reaction",
    actionCost: 1,
    effect: { type: "prevent_landing_fee" }
  }
] satisfies readonly StrategyCardDefinition[]);

export const STRATEGY_CARD_BY_ID = new Map(STRATEGY_CARDS.map((card) => [card.id, card]));
