import { describe, expect, it } from "vitest";
import { chooseSecretObjective, createInitialGame, createSeededRandom, disconnectPlayer, reconnectPlayer, pauseGame, resumeGame, startGame, executeGameCommand, type GameState } from "../src/index.js";

function active(): GameState {
  let state = createInitialGame({ roomId: "room-a", gameId: "game-a", players: ["a", "b", "c", "d"].map(id => ({ id, name: id })), random: createSeededRandom(8) });
  while (state.objectiveSelection) state = chooseSecretObjective(state, state.objectiveSelection.playerId, state.objectiveSelection.offeredObjectiveIds[0]);
  return startGame(state, { nextInt: () => 0 }, 1_000).state;
}

function subphase(kind: "auction" | "council" | "emergency_sale"): GameState {
  const state = active();
  const payerId = state.turn!.playerId;
  const ownerId = state.currentTurnOrder[1]!;
  if (kind === "council") {
    state.phase = "council"; state.round = 3; state.turn = null;
    state.council = { id: "council-3", round: 3, optionAId: "POL01A", optionBId: "POL01B", allocations: {}, deadlineAt: 46_000 };
  } else {
    state.turn!.stage = kind; state.turn!.turnDeadlineAt = null; state.turn!.remainingTurnMilliseconds = 50_000;
    if (kind === "auction") state.auction = { id: "auction-1", propertyId: "P01", triggeringPlayerId: payerId, eligiblePlayerIds: state.currentTurnOrder, bids: {}, submittedPlayerIds: [], deadlineAt: 31_000 };
    else {
      state.players[payerId]!.credits = 0;
      state.properties.P05!.ownerId = payerId; state.players[payerId]!.propertyIds = ["P05"];
      state.properties.P01!.ownerId = ownerId; state.players[ownerId]!.propertyIds = ["P01"];
      state.pendingLandingFee = { payerId, ownerId, propertyId: "P01", amount: 10 };
      state.emergencySale = { ...state.pendingLandingFee, deadlineAt: 31_000 };
    }
  }
  return state;
}

describe("operator pause freezes game time", () => {
  it.each(["auction", "council", "emergency_sale"] as const)("preserves remaining %s time across repeated pauses and recovery serialization", kind => {
    const state = subphase(kind);
    const deadline = kind === "council" ? state.council!.deadlineAt : kind === "auction" ? state.auction!.deadlineAt : state.emergencySale!.deadlineAt;
    const paused = JSON.parse(JSON.stringify(pauseGame(state, 11_000, "operator").state)) as GameState;
    let resumed = resumeGame(paused, 111_000).state;
    const readDeadline = (game: GameState) => kind === "council" ? game.council!.deadlineAt : kind === "auction" ? game.auction!.deadlineAt : game.emergencySale!.deadlineAt;
    expect(readDeadline(resumed)).toBe(deadline + 100_000);
    resumed = resumeGame(pauseGame(resumed, 112_000, "again").state, 212_000).state;
    expect(readDeadline(resumed)).toBe(deadline + 200_000);
    expect(resumed.players).toEqual(state.players);
    if (kind !== "council") expect(resumed.turn!.remainingTurnMilliseconds).toBe(50_000);
  });

  it("preserves normal time when a player disconnects and reconnects while paused", () => {
    const state = active(); const id = state.turn!.playerId;
    let paused = pauseGame(state, 11_000, "operator").state;
    paused = disconnectPlayer(paused, id, 21_000).state;
    paused = reconnectPlayer(paused, id, 31_000).state;
    expect(paused.turn!.turnDeadlineAt).toBeNull();
    expect(paused.turn!.remainingTurnMilliseconds).toBe(50_000);
    expect(resumeGame(paused, 111_000).state.turn!.turnDeadlineAt).toBe(161_000);
  });

  it.each([false, true])("freezes reconnect grace (disconnected during pause: %s)", duringPause => {
    const state = active(); const id = state.turn!.playerId;
    let paused = duringPause ? pauseGame(state, 11_000, "operator").state : pauseGame(disconnectPlayer(state, id, 6_000).state, 11_000, "operator").state;
    if (duringPause) paused = disconnectPlayer(paused, id, 21_000).state;
    const resumed = resumeGame(paused, 111_000).state;
    expect(resumed.turn!.turnDeadlineAt).toBeNull();
    expect(resumed.players[id]!.disconnectedAt).toBe(duringPause ? 111_000 : 106_000);
    const reconnected = reconnectPlayer(resumed, id, 112_000).state;
    expect(reconnected.turn!.turnDeadlineAt).toBe(duringPause ? 162_000 : 167_000);
  });

  it.each(["auction", "council", "emergency_sale"] as const)("defers %s disconnect effects until resume, even after reconnect", kind => {
    const original = subphase(kind);
    const id = original.turn?.playerId ?? original.currentTurnOrder[0]!;
    let paused = pauseGame(original, 11_000, "operator").state;
    paused = disconnectPlayer(paused, id, 21_000).state;
    paused = reconnectPlayer(paused, id, 31_000).state;
    expect(paused.auction).toEqual(original.auction);
    expect(paused.council).toEqual(original.council);
    expect(paused.emergencySale).toEqual(original.emergencySale);
    expect(paused.properties).toEqual(original.properties);
    const resumed = resumeGame(paused, 111_000).state;
    if (kind === "auction") expect(resumed.auction!.bids[id]).toBe(0);
    if (kind === "council") expect(resumed.council!.allocations[id]).toEqual({ optionAInfluence: 0, optionBInfluence: 0 });
    if (kind === "emergency_sale") { expect(resumed.emergencySale).toBeNull(); expect(resumed.properties.P05!.ownerId).toBeNull(); }
  });

  it("preserves outstanding trades and freezes the counterparty reconnect clock", () => {
    const state = active(); const id = state.turn!.playerId; const other = state.currentTurnOrder[1]!;
    state.turn!.stage = "action_phase";
    state.trade = { id: "trade-1", proposerPlayerId: id, counterpartyPlayerId: other, offeredCredits: 1, requestedCredits: 0, offeredPropertyIds: [], requestedPropertyIds: [], createdOnTurn: state.turn!.number };
    const disconnected = disconnectPlayer(state, other, 6_000).state;
    const resumed = resumeGame(pauseGame(disconnected, 11_000, "operator").state, 111_000).state;
    expect(resumed.trade).toEqual(state.trade);
    expect(resumed.players[other]!.disconnectedAt).toBe(106_000);
    expect(resumed.turn!.turnDeadlineAt).toBe(161_000);
  });

  it.each(["accept", "reject"] as const)("rejects a trade %s command while paused and allows it after resume", response => {
    const state = active();
    const proposer = state.turn!.playerId;
    const counterparty = state.currentTurnOrder[1]!;
    state.turn!.stage = "action_phase";
    const proposed = executeGameCommand(state, proposer, {
      type: "propose_trade", requestId: "proposal-request", actionId: "proposal-action", expectedStateVersion: state.version,
      counterpartyPlayerId: counterparty, offeredCredits: 30, offeredPropertyIds: [], requestedCredits: 0, requestedPropertyIds: []
    }, { now: 2_000, random: createSeededRandom(0) }).state;
    const paused = pauseGame(proposed, 11_000, "operator").state;
    const reply = { type: "respond_trade" as const, requestId: "reply-request", actionId: "reply-action", expectedStateVersion: paused.version, tradeId: paused.trade!.id, response };
    expect(() => executeGameCommand(paused, counterparty, reply, { now: 21_000, random: createSeededRandom(0) }))
      .toThrowError(expect.objectContaining({ code: "INVALID_PHASE" }));
    expect(paused.players).toEqual(proposed.players);
    expect(paused.trade).toEqual(proposed.trade);
    const resumed = resumeGame(paused, 111_000).state;
    const completed = executeGameCommand(resumed, counterparty, { ...reply, expectedStateVersion: resumed.version }, { now: 112_000, random: createSeededRandom(0) }).state;
    expect(completed.trade).toBeNull();
    expect(completed.players[proposer]!.credits).toBe(state.players[proposer]!.credits - (response === "accept" ? 30 : 0));
    expect(completed.players[counterparty]!.credits).toBe(state.players[counterparty]!.credits + (response === "accept" ? 30 : 0));
  });
});
