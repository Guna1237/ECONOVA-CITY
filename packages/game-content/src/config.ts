export const GAME_CONFIG = Object.freeze({
  minPlayers: 4,
  maxPlayers: 6,
  rounds: 8,
  boardSpaces: 20,
  startingCredits: 1_000,
  startingInfluence: 5,
  startingCards: 2,
  strategyCardHandLimit: 3,
  turnActions: 2,
  cityCenterPassingBonus: 150,
  demandMinimum: -2,
  demandMaximum: 2,
  maximumDevelopmentLevel: 3,
  minimumLandingFee: 5,
  minimumDevelopmentCost: 10,
  turnTimerSeconds: 45,
  turnWarningSeconds: 30,
  auctionTimerSeconds: 30,
  emergencySaleTimerSeconds: 30,
  councilTimerSeconds: 45,
  /*
   * Decisions the rules require outside a normal turn: the opening secret
   * objective pick and the Round 4 discard. Without a deadline either one
   * parks the whole room on a single unresponsive player, and an operator
   * has no way back short of resetting the game.
   */
  pendingDecisionTimerSeconds: 45,
  reconnectGraceSeconds: 60,
  influenceFinalScoreMultiplier: 10,
  fullDistrictFinalScoreBonus: 100,
  secretObjectiveScore: 200
} as const);

export const MODIFIER_PRECEDENCE = Object.freeze({
  purchasePrice: ["base", "temporary", "minimum_clamp", "payment"],
  developmentCost: [
    "base",
    "district_control",
    "policy_event_card",
    "minimum_clamp",
    "payment"
  ],
  propertyIncome: [
    "base",
    "development",
    "demand",
    "temporary_event_card",
    "policy",
    "minimum_clamp",
    "award"
  ],
  landingFee: [
    "base",
    "development",
    "demand",
    "temporary_event_card",
    "policy",
    "minimum_clamp",
    "insurance_reaction",
    "payment"
  ]
} as const);
