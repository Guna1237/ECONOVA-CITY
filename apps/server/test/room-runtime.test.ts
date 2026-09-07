import { describe, expect, it } from "vitest";

import type { ClientCommand } from "@econova/contracts";
import {
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  startGame,
  type GameState
} from "@econova/game-engine";

import {
  InMemoryGamePersistence,
  RoomRuntime,
  type AuthenticatedSession
} from "../src/index.js";

const createGame = (roomId: string): GameState => {
  let state = createInitialGame({
    gameId: `game-${roomId}`,
    roomId,
    players: Array.from({ length: 4 }, (_, index) => ({
      id: `${roomId}-p${index + 1}`,
      name: `Player ${index + 1}`
    })),
    random: createSeededRandom(3)
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0]
    );
  }
  return startGame(state, createSeededRandom(4), 1_000).state;
};

const playerSession = (state: GameState): AuthenticatedSession => ({
  sessionId: `session-${state.roomId}`,
  role: "player",
  roomId: state.roomId,
  playerId: state.turn!.playerId,
  expiresAt: 100_000
});

const rollCommand = (state: GameState, actionId = "action-roll"): ClientCommand => ({
  type: "roll",
  requestId: `request-${actionId}`,
  actionId,
  expectedStateVersion: state.version
});

describe("serialized authoritative room runtime", () => {
  it("quarantines an invalid engine result before persistence or memory replacement and leaves the other room running", async () => {
    const state = createGame("invalid-roll");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({ state, persistence, random: { nextInt: () => 7 }, now: () => 1000 });
    expect(await runtime.processCommand(playerSession(state), rollCommand(state))).toMatchObject({ status: "rejected", code: "ROOM_QUARANTINED" });
    expect(runtime.getState()).toEqual(state);
    expect(persistence.transitions).toHaveLength(0);
    const otherState = createGame("healthy-room");
    const other = new RoomRuntime({ state: otherState, persistence: new InMemoryGamePersistence(), random: createSeededRandom(8), now: () => 1000 });
    expect(await other.processCommand(playerSession(otherState), rollCommand(otherState))).toMatchObject({ status: "accepted" });
    expect(other.isQuarantined()).toBe(false);
  });
  it("persists disconnect and reconnect through the same queue, without duplicate presence transitions", async () => {
    const state = createGame("room-presence");
    const persistence = new InMemoryGamePersistence();
    let now = 2_000;
    const runtime = new RoomRuntime({ state, persistence, random: createSeededRandom(8), now: () => now });
    const playerId = state.turn!.playerId;
    await runtime.processPresence(playerId, false);
    expect(runtime.getState().turn).toMatchObject({ turnDeadlineAt: null, remainingTurnMilliseconds: 59_000 });
    expect(runtime.getState().players[playerId]).toMatchObject({ connected: false, disconnectedAt: 2_000 });
    expect(runtime.nextDeadlineAt()).toBe(62_000);
    await runtime.processPresence(playerId, false);
    expect(persistence.transitions).toHaveLength(1);
    now = 3_000;
    await runtime.processPresence(playerId, true);
    expect(runtime.getState().turn?.turnDeadlineAt).toBe(62_000);
    expect(runtime.getState().players[playerId]?.disconnectedAt).toBeNull();
    await runtime.processPresence(playerId, true);
    expect(persistence.transitions).toHaveLength(2);
    expect(await persistence.loadLatestState(state.gameId)).toEqual(runtime.getState());
  });

  it("processes normal and reconnect deadlines only when due", async () => {
    const state = createGame("room-deadline");
    let now = 60_999;
    const runtime = new RoomRuntime({ state, persistence: new InMemoryGamePersistence(), random: createSeededRandom(8), now: () => now });
    expect(runtime.nextDeadlineAt()).toBe(61_000);
    expect(await runtime.processDeadlines()).toBeNull();
    now = 61_000;
    expect((await runtime.processDeadlines())?.status).toBe("accepted");
    expect(runtime.getState().turn?.number).toBe(2);
    expect(runtime.nextDeadlineAt()).toBe(121_000);
    await runtime.processPresence(runtime.getState().turn!.playerId, false);
    now = 120_999;
    expect(await runtime.processDeadlines()).toBeNull();
    now = 121_000;
    await runtime.processDeadlines();
    expect(runtime.getState().turn?.number).toBe(3);
  });

  it("resolves an expired deadline before a newly received command can change that turn", async () => {
    const state = createGame("room-expired");
    const runtime = new RoomRuntime({ state, persistence: new InMemoryGamePersistence(), random: createSeededRandom(8), now: () => 61_000 });
    await expect(runtime.processCommand(playerSession(state), rollCommand(state)))
      .resolves.toMatchObject({ status: "rejected", code: "STALE_STATE" });
    expect(runtime.getState().turn?.number).toBe(2);
  });

  it("isolates throwing, rejecting and mutating observers and supports unsubscribe", async () => {
    const state = createGame("room-subscribers");
    const observed: number[] = [];
    const runtime = new RoomRuntime({ state, persistence: new InMemoryGamePersistence(), random: createSeededRandom(8), now: () => 2_000 });
    runtime.subscribe(() => { throw new Error("socket closed"); });
    runtime.subscribe(async () => { throw new Error("async socket closed"); });
    runtime.subscribe((snapshot, _events, receipt) => {
      snapshot.version = 999;
      Object.assign(receipt, { status: "rejected" });
    });
    const unsubscribe = runtime.subscribe((snapshot) => { observed.push(snapshot.version); });
    const command = rollCommand(state);
    expect((await runtime.processCommand(playerSession(state), command)).status).toBe("accepted");
    expect(observed).toEqual([state.version + 1]);
    expect(runtime.getState().version).toBe(state.version + 1);
    unsubscribe();
    await runtime.processPresence(state.turn!.playerId, false);
    expect(observed).toHaveLength(1);
    expect(runtime.isQuarantined()).toBe(false);
  });

  it("retains durable replay protection after bounded cache eviction", async () => {
    const state = createGame("room-cache");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({ state, persistence, random: createSeededRandom(8), now: () => 2_000, receiptCacheLimit: 2 });
    const first = { ...rollCommand(state, "first"), expectedStateVersion: 0 };
    const rejected = await runtime.processCommand(playerSession(state), first);
    await runtime.processCommand(playerSession(state), { ...first, actionId: "second", requestId: "second" });
    await runtime.processCommand(playerSession(state), { ...first, actionId: "third", requestId: "third" });
    const read = persistence.getCommandReceipts.bind(persistence);
    const readActions: string[] = [];
    persistence.getCommandReceipts = async (gameId, actionId, requestId) => {
      readActions.push(actionId);
      return read(gameId, actionId, requestId);
    };
    await expect(runtime.processCommand(playerSession(state), first)).resolves.toEqual(rejected);
    expect(readActions).toEqual(["first"]);
    expect(persistence.transitions).toHaveLength(0);
  });

  it("does not quarantine a durable commit when an observer throws", async () => {
    const state = createGame("room-observer");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({
      state, persistence, random: createSeededRandom(8), now: () => 2_000,
      onCommitted: () => { throw new Error("Closed websocket"); }
    });
    const receipt = await runtime.processCommand(playerSession(state), rollCommand(state));
    expect(receipt.status).toBe("accepted");
    expect(runtime.status).toBe("active");
    expect(await persistence.loadLatestState(state.gameId)).toEqual(runtime.getState());
  });

  it("binds cached receipts to the actor and the complete command", async () => {
    const state = createGame("room-bind");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({ state, persistence, random: createSeededRandom(8), now: () => 2_000 });
    const original = rollCommand(state);
    await runtime.processCommand(playerSession(state), original);
    const otherPlayer = state.turnOrder.find((id) => id !== state.turn!.playerId)!;
    await expect(runtime.processCommand({ ...playerSession(state), playerId: otherPlayer }, original))
      .resolves.toMatchObject({ status: "rejected", code: "IDEMPOTENCY_CONFLICT" });
    await expect(runtime.processCommand(playerSession(state), { ...original, type: "end_turn" }))
      .resolves.toMatchObject({ status: "rejected", code: "IDEMPOTENCY_CONFLICT" });
    expect(persistence.transitions).toHaveLength(1);
  });

  it("rejects reusing a request id with a fresh action id, including after restart", async () => {
    const state = createGame("room-request");
    const persistence = new InMemoryGamePersistence();
    const options = { state, persistence, random: createSeededRandom(8), now: () => 2_000 };
    const runtime = new RoomRuntime(options);
    const original = rollCommand(state);
    const accepted = await runtime.processCommand(playerSession(state), original);
    const restarted = new RoomRuntime({ ...options, state: runtime.getState() });
    await expect(restarted.processCommand(playerSession(state), original)).resolves.toEqual(accepted);
    await expect(restarted.processCommand(playerSession(state), {
      ...original, type: "end_turn", actionId: "fresh-action", expectedStateVersion: runtime.getState().version
    })).resolves.toMatchObject({ status: "rejected", code: "IDEMPOTENCY_CONFLICT" });
    expect(persistence.transitions).toHaveLength(1);
  });

  it("quarantines receipt-read failures without rejecting the queue promise", async () => {
    const state = createGame("room-read");
    const persistence = new InMemoryGamePersistence();
    persistence.getCommandReceipts = async () => { throw new Error("Database unavailable"); };
    const runtime = new RoomRuntime({ state, persistence, random: createSeededRandom(8), now: () => 2_000 });
    await expect(runtime.processCommand(playerSession(state), rollCommand(state)))
      .resolves.toMatchObject({ status: "rejected", code: "ROOM_QUARANTINED" });
    expect(runtime.getState()).toEqual(state);
  });

  it("commits persistence before replacing in-memory state", async () => {
    const state = createGame("room-a");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({
      state,
      persistence,
      random: createSeededRandom(8),
      now: () => 2_000
    });

    const receipt = await runtime.processCommand(playerSession(state), rollCommand(state));

    expect(receipt.status).toBe("accepted");
    expect(runtime.getState().version).toBe(state.version + 1);
    expect(persistence.transitions).toHaveLength(1);
    expect(persistence.transitions[0]?.nextState.version).toBe(runtime.getState().version);
    expect(await persistence.loadLatestState(state.gameId)).toEqual(runtime.getState());
  });

  it("deduplicates concurrent commands by actionId", async () => {
    const state = createGame("room-a");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({
      state,
      persistence,
      random: createSeededRandom(8),
      now: () => 2_000
    });
    const nextCommand = rollCommand(state, "same-action");

    const [first, second] = await Promise.all([
      runtime.processCommand(playerSession(state), nextCommand),
      runtime.processCommand(playerSession(state), nextCommand)
    ]);

    expect(first).toEqual(second);
    expect(first.status).toBe("accepted");
    expect(runtime.getState().version).toBe(state.version + 1);
    expect(persistence.transitions).toHaveLength(1);
  });

  it("rejects a session bound to another room before engine execution", async () => {
    const state = createGame("room-a");
    const runtime = new RoomRuntime({
      state,
      persistence: new InMemoryGamePersistence(),
      random: createSeededRandom(8),
      now: () => 2_000
    });
    const forged = { ...playerSession(state), roomId: "room-b" };

    const receipt = await runtime.processCommand(forged, rollCommand(state));

    expect(receipt).toMatchObject({ status: "rejected", code: "AUTHORIZATION_DENIED" });
    expect(runtime.getState()).toEqual(state);
  });

  it("quarantines only the affected room and preserves its previous state on persistence failure", async () => {
    const stateA = createGame("room-a");
    const stateB = createGame("room-b");
    const persistenceA = new InMemoryGamePersistence();
    persistenceA.failNextTransition = true;
    const roomA = new RoomRuntime({
      state: stateA,
      persistence: persistenceA,
      random: createSeededRandom(8),
      now: () => 2_000
    });
    const roomB = new RoomRuntime({
      state: stateB,
      persistence: new InMemoryGamePersistence(),
      random: createSeededRandom(8),
      now: () => 2_000
    });

    const failed = await roomA.processCommand(playerSession(stateA), rollCommand(stateA));
    const healthy = await roomB.processCommand(playerSession(stateB), rollCommand(stateB));

    expect(failed).toMatchObject({ status: "rejected", code: "ROOM_QUARANTINED" });
    expect(roomA.status).toBe("quarantined");
    expect(roomA.getState()).toEqual(stateA);
    expect(healthy.status).toBe("accepted");
    expect(roomB.status).toBe("active");
  });
});
