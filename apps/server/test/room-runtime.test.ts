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
