import type { ObjectiveDefinition } from "./types.js";

export const SECRET_OBJECTIVES = Object.freeze([
  { id: "OBJ01", name: "Mogul", description: "Own at least 5 properties.", score: 200, condition: { type: "property_count_at_least", count: 5 } },
  { id: "OBJ02", name: "Developer", description: "Have at least 3 Level 3 properties.", score: 200, condition: { type: "properties_at_level_at_least", count: 3, level: 3 } },
  { id: "OBJ03", name: "Food Baron", description: "Own all 4 Food properties.", score: 200, condition: { type: "full_district", district: "food" } },
  { id: "OBJ04", name: "Tech Titan", description: "Own all 4 Tech properties.", score: 200, condition: { type: "full_district", district: "tech" } },
  { id: "OBJ05", name: "Cash Reserve", description: "Have at least 1,200 Credits.", score: 200, condition: { type: "credits_at_least", amount: 1_200 } },
  { id: "OBJ06", name: "Diversified", description: "Own each district and at least 5 properties total.", score: 200, condition: { type: "all_districts_and_property_count", count: 5 } },
  { id: "OBJ07", name: "Influencer", description: "Have at least 10 Influence.", score: 200, condition: { type: "influence_at_least", amount: 10 } },
  { id: "OBJ08", name: "Entertainment Empire", description: "Own all 4 Entertainment properties.", score: 200, condition: { type: "full_district", district: "entertainment" } },
  { id: "OBJ09", name: "Premium Collector", description: "Own at least 3 Premium properties.", score: 200, condition: { type: "tier_property_count_at_least", tier: "premium", count: 3 } },
  { id: "OBJ10", name: "Urban Planner", description: "Have at least 6 properties at Level 1 or higher.", score: 200, condition: { type: "properties_at_level_at_least", count: 6, level: 1 } }
] satisfies readonly ObjectiveDefinition[]);

export const OBJECTIVE_BY_ID = new Map(SECRET_OBJECTIVES.map((objective) => [objective.id, objective]));
