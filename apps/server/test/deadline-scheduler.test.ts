import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialGame, chooseSecretObjective, startGame, createSeededRandom, pauseGame, disconnectPlayer, type GameState } from "@econova/game-engine";
import { RoomManager, RoomRuntime, ConnectionHub, InMemoryGamePersistence } from "../src/index.js";
import { RoomRealtime } from "../src/realtime/room-realtime.js";

function activeState(roomId: string, now: number): GameState {
  let state = createInitialGame({ gameId: `game-${roomId}`, roomId, players: Array.from({ length: 4 }, (_, seat) => ({ id: `${roomId}p${seat}`, name: `Player ${seat}` })), random: createSeededRandom(6) });
  while (state.objectiveSelection !== null) state = chooseSecretObjective(state, state.objectiveSelection.playerId, state.objectiveSelection.offeredObjectiveIds[0]);
  return startGame(state, { nextInt: () => 0 }, now).state;
}
afterEach(() => vi.useRealTimers());
describe("authoritative room scheduler", () => {
  it.each(["normal", "auction", "council", "emergency_sale", "reconnect", "trade"] as const)("holds %s state while operator-paused and restores its phase on resume", async mode => {
    let state = activeState("ROOMA1", 1_000);
    const playerId = state.turn!.playerId;
    const otherId = state.currentTurnOrder[1]!;
    if (mode === "auction") {
      state.turn!.stage = "auction";
      state.turn!.turnDeadlineAt = null;
      state.turn!.remainingTurnMilliseconds = 50_000;
      state.auction = { id: "auction-1", propertyId: "P01", triggeringPlayerId: playerId, eligiblePlayerIds: state.currentTurnOrder, bids: {}, submittedPlayerIds: [], deadlineAt: 41_000 };
    }
    if (mode === "council") {
      state.round = 3; state.phase = "council"; state.turn = null;
      state.council = { id: "council-3", round: 3, optionAId: "POL01A", optionBId: "POL01B", allocations: {}, deadlineAt: 56_000 };
    }
    if (mode === "emergency_sale") {
      state.turn!.stage = "emergency_sale"; state.turn!.turnDeadlineAt = null; state.turn!.remainingTurnMilliseconds = 50_000;
      state.pendingLandingFee = { payerId: playerId, ownerId: otherId, propertyId: "P01", amount: 10 };
      state.emergencySale = { ...state.pendingLandingFee, deadlineAt: 41_000 };
    }
    if (mode === "reconnect") state = disconnectPlayer(state, playerId, 11_000).state;
    if (mode === "trade") {
      state.turn!.stage = "action_phase";
      state.trade = { id: "trade-1", proposerPlayerId: playerId, counterpartyPlayerId: otherId, offeredCredits: 1, requestedCredits: 0, offeredPropertyIds: [], requestedPropertyIds: [], createdOnTurn: state.turn!.number };
    }
    const previousPhase = state.phase;
    const paused = pauseGame(state, 11_000, "operator pause").state;
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({ state: paused, persistence, random: { nextInt: () => 0 }, now: () => 91_000 });
    expect(runtime.nextDeadlineAt()).toBeNull();
    expect(await runtime.processDeadlines()).toBeNull();
    expect(runtime.getState()).toEqual(paused);
    const receipt = await runtime.processAdminCommand({ sessionId: "admin", role: "admin", roomId: null, playerId: null, expiresAt: 999_999 }, { type: "admin_resume_game", requestId: "resume", actionId: "resume", expectedStateVersion: paused.version });
    expect(receipt.status).toBe("accepted");
    expect(runtime.getState().phase).toBe(previousPhase);
    const expectedPlayers = structuredClone(paused.players);
    if (mode === "reconnect") expectedPlayers[playerId]!.disconnectedAt = 91_000;
    expect(runtime.getState().players).toEqual(expectedPlayers);
    expect(runtime.getState().trade).toEqual(paused.trade);
    expect(runtime.isQuarantined()).toBe(false);
    if (mode === "normal" || mode === "trade") expect(runtime.getState().turn!.turnDeadlineAt).toBe(141_000);
  });

  it("resolves a turn without browser input and isolates a later room deadline", async () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const persistence = new InMemoryGamePersistence();
    const rooms = new RoomManager({ now: Date.now, randomFactory: () => ({ nextInt: () => 0 }), persistenceFactory: () => persistence });
    const first = rooms.restoreRoom({ roomId: "ROOMA1", code: "ROOMA1", state: activeState("ROOMA1", 1000) });
    const second = rooms.restoreRoom({ roomId: "ROOMB1", code: "ROOMB1", state: activeState("ROOMB1", 11000) });
    const before = second.runtime!.getState();
    const scheduler = new RoomRealtime(rooms, new ConnectionHub(), Date.now);
    scheduler.attach(first); scheduler.attach(second);
    try {
      await vi.advanceTimersByTimeAsync(60000);
      expect(first.runtime!.getState().turn!.number).toBe(2);
      expect(first.runtime!.isQuarantined()).toBe(false);
      expect(second.runtime!.getState()).toEqual(before);
      expect(persistence.transitions).toHaveLength(1);
      expect(first.runtime!.nextDeadlineAt()).toBe(121000);
    } finally { scheduler.close(); }
  });
  it("persists disconnect then expires its canonical reconnect window", async () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const persistence = new InMemoryGamePersistence();
    const rooms = new RoomManager({ now: Date.now, randomFactory: () => ({ nextInt: () => 0 }), persistenceFactory: () => persistence });
    const room = rooms.restoreRoom({ roomId: "ROOMA1", code: "ROOMA1", state: activeState("ROOMA1", 1000) });
    const runtime = room.runtime!;
    const scheduler = new RoomRealtime(rooms, new ConnectionHub(), Date.now); scheduler.attach(room);
    try {
      const playerId = runtime.getState().turn!.playerId;
      await runtime.processPresence(playerId, false);
      expect(runtime.getState().players[playerId]!.connected).toBe(false);
      expect(runtime.nextDeadlineAt()).toBe(61000);
      await vi.advanceTimersByTimeAsync(59999);
      expect(runtime.getState().turn!.number).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(runtime.getState().turn!.number).toBe(2);
      expect(persistence.transitions).toHaveLength(2);
    } finally { scheduler.close(); }
  });
  it("quarantines failed persistence without publishing uncommitted state", async () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const persistence = new InMemoryGamePersistence();
    const rooms = new RoomManager({ now: Date.now, randomFactory: () => ({ nextInt: () => 0 }), persistenceFactory: () => persistence });
    const room = rooms.restoreRoom({ roomId: "ROOMA1", code: "ROOMA1", state: activeState("ROOMA1", 1000) });
    const before = room.runtime!.getState();
    const scheduler = new RoomRealtime(rooms, new ConnectionHub(), Date.now); scheduler.attach(room);
    persistence.failNextTransition = true;
    try {
      await vi.advanceTimersByTimeAsync(60000);
      expect(room.runtime!.isQuarantined()).toBe(true);
      expect(room.runtime!.getState()).toEqual(before);
      expect(room.runtime!.nextDeadlineAt()).toBeNull();
      expect(persistence.quarantinedRooms.has(room.roomId)).toBe(true);
    } finally { scheduler.close(); }
  });
});
