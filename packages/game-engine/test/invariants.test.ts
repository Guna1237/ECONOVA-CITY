import { describe, expect, it } from "vitest";

import {
  assertGameInvariants,
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  startGame,
  type GameState,
  validateGameState
} from "../src/index.js";

const validState = () => {
  let state = createInitialGame({
    gameId: "g",
    roomId: "r",
    players: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
    random: createSeededRandom(12)
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0]
    );
  }
  return state;
};

describe("game-state invariants", () => {
  it.each([
    ["non-finite Credits", (s: GameState) => { s.players.p0!.credits = NaN; }],
    ["fractional Credits", (s: GameState) => { s.players.p0!.credits = 0.5; }],
    ["non-finite Influence", (s: GameState) => { s.players.p0!.influence = Infinity; }],
    ["fractional position", (s: GameState) => { s.players.p0!.position = 0.5; }],
    ["unsafe version", (s: GameState) => { s.version = Number.MAX_SAFE_INTEGER + 1; }],
    ["round nine", (s: GameState) => { s.round = 9; }],
    ["round zero during play", (s: GameState) => { s.round = 0; }],
    ["unsupported schema", (s: GameState) => { Object.assign(s, { schemaVersion: 2 }); }],
    ["pause without resumable phase", (s: GameState) => { s.phase = "paused"; s.phaseBeforePause = null; }],
    ["fractional round", (s: GameState) => { s.round = 1.5; }],
    ["unknown phase", (s: GameState) => { s.phase = "foreign" as never; }],
    ["too few players", (s: GameState) => { delete s.players.p0; s.turnOrder = s.turnOrder.filter(id => id !== "p0"); s.currentTurnOrder = [...s.turnOrder]; }],
    ["mismatched player identity", (s: GameState) => { s.players.p0 = { ...s.players.p0!, id: "foreign" }; }],
    ["mismatched property identity", (s: GameState) => { s.properties.P01 = { ...s.properties.P01!, id: "P02" }; }],
    ["missing district", (s: GameState) => { delete (s.demand as Partial<GameState["demand"]>).tech; }],
    ["duplicate objective in deck", (s: GameState) => { s.objectiveDeck[0] = s.players.p0!.secretObjectiveId!; }],
    ["unknown turn stage", (s: GameState) => { s.turn!.stage = "foreign" as never; }],
    ["negative actions", (s: GameState) => { s.turn!.actionsRemaining = -1; }],
    ["impossible die", (s: GameState) => { s.turn!.roll = 7; }],
    ["missing auction", (s: GameState) => { s.turn!.stage = "auction"; }],
    ["missing emergency sale", (s: GameState) => { s.turn!.stage = "emergency_sale"; }],
    ["non-finite timer", (s: GameState) => { s.turn!.turnDeadlineAt = NaN; }]
  ] as const)("rejects %s without mutating the snapshot", (_name, corrupt) => {
    const state = startGame(validState(), createSeededRandom(3), 1000).state;
    corrupt(state);
    const before = structuredClone(state);
    expect(() => assertGameInvariants(state)).toThrow(/invariant/i);
    expect(state).toEqual(before);
  });
  it("rejects corrupt pause timestamps and deferred foreign identities", () => {
    const state = validState();
    state.pauseStartedAt = -1;
    state.deferredDisconnectPlayerIds = ["foreign-player"];
    expect(() => assertGameInvariants(state)).toThrow(/invariant/i);
  });
  it("accepts a canonical setup state", () => {
    expect(validateGameState(validState())).toEqual([]);
    expect(() => assertGameInvariants(validState())).not.toThrow();
  });

  it("detects credit corruption and contradictory property ownership", () => {
    const state = validState();
    state.players.p0!.credits = -1;
    state.properties.P01!.ownerId = "p0";
    state.players.p1!.propertyIds.push("P01");

    const issues = validateGameState(state).join("\n");
    expect(issues).toContain("negative Credits");
    expect(issues).toContain("P01");
    expect(() => assertGameInvariants(state)).toThrow(/invariant/i);
  });

  it("detects impossible Demand, levels, hands, and turn references", () => {
    const state = validState();
    state.demand.tech = 3;
    state.properties.P02!.developmentLevel = 4 as never;
    state.players.p0!.cards = ["SC01", "SC02", "SC03", "SC04"];
    state.phase = "player_turn";
    state.turn = null;

    const issues = validateGameState(state).join("\n");
    expect(issues).toContain("Demand outside");
    expect(issues).toContain("invalid development level");
    expect(issues).toContain("hand limit");
    expect(issues).toContain("requires an active turn");
  });
});
