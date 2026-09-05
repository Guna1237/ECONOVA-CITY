import type { EventDefinition } from "./types.js";

export const SPECIAL_EVENTS = Object.freeze([
  { id: "SE01", name: "Startup Grant", description: "Gain 80 Credits.", effect: { type: "gain_credits", amount: 80 } },
  { id: "SE02", name: "Community Support", description: "Gain 2 Influence.", effect: { type: "gain_influence", amount: 2 } },
  { id: "SE03", name: "Demand Surge", description: "Choose a district; Demand increases by 1.", effect: { type: "choose_demand_delta", delta: 1 } },
  { id: "SE04", name: "Economic Downturn", description: "Choose a district; Demand decreases by 1.", effect: { type: "choose_demand_delta", delta: -1 } },
  { id: "SE05", name: "Lucky Find", description: "Draw one Strategy Card.", effect: { type: "draw_strategy_card", count: 1 } },
  { id: "SE06", name: "Renovation Subsidy", description: "Next development this turn costs 30 less, minimum 10.", effect: { type: "development_discount_this_turn", amount: 30, minimum: 10 } },
  { id: "SE07", name: "Networking Event", description: "Gain 1 Influence and 40 Credits.", effect: { type: "gain_credits_and_influence", credits: 40, influence: 1 } },
  { id: "SE08", name: "City Festival", description: "Highest-Demand district properties gain 10 income this round; all tied districts benefit.", effect: { type: "highest_demand_income_bonus_this_round", amount: 10 } }
] satisfies readonly EventDefinition[]);

export const BREAKING_NEWS = Object.freeze([
  { id: "BN01", name: "Tech Boom", description: "Tech Demand +1.", duration: "instant", effect: { type: "district_demand_delta", district: "tech", delta: 1 } },
  { id: "BN02", name: "Food Festival", description: "Food Demand +1.", duration: "instant", effect: { type: "district_demand_delta", district: "food", delta: 1 } },
  { id: "BN03", name: "Transportation Strike", description: "Mobility Demand -1.", duration: "instant", effect: { type: "district_demand_delta", district: "mobility", delta: -1 } },
  { id: "BN04", name: "Entertainment Craze", description: "Entertainment Demand +1.", duration: "instant", effect: { type: "district_demand_delta", district: "entertainment", delta: 1 } },
  { id: "BN05", name: "Economic Stimulus", description: "Every player gains 60 Credits.", duration: "instant", effect: { type: "all_players_gain_credits", amount: 60 } },
  { id: "BN06", name: "Market Volatility", description: "Two random districts each change Demand by a random direction.", duration: "instant", effect: { type: "random_district_demand_changes", districts: 2 } },
  { id: "BN07", name: "Construction Boom", description: "Development costs are 20 lower this round, minimum 10.", duration: "round", effect: { type: "development_discount", amount: 20, minimum: 10 } },
  { id: "BN08", name: "Recession Fears", description: "Landing fees are 10 lower this round, minimum 5.", duration: "round", effect: { type: "landing_fee_discount", amount: 10, minimum: 5 } },
  { id: "BN09", name: "Innovation Wave", description: "Player(s) with fewest properties gain 100 Credits.", duration: "instant", effect: { type: "fewest_properties_gain_credits", amount: 100 } },
  { id: "BN10", name: "Urban Expansion", description: "Level 0 property purchase prices are 20 lower this round, minimum 50.", duration: "round", effect: { type: "undeveloped_purchase_discount", amount: 20, minimum: 50 } }
] satisfies readonly EventDefinition[]);
