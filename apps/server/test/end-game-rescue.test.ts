import { describe, expect, it } from "vitest";

import type { AdminCommand } from "@econova/contracts";
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
    random: createSeededRandom(3),
    now: 1_000
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0],
      1_000
    );
  }
  return startGame(state, createSeededRandom(4), 1_000).state;
};

const adminSession = (state: GameState): AuthenticatedSession => ({
  sessionId: `session-${state.roomId}`,
  role: "admin",
  roomId: state.roomId,
  playerId: null,
  expiresAt: 100_000
});

/* Operator commands are version-checked like any other, so a real console
   sends the version it was looking at. */
const admin = (
  type: AdminCommand["type"],
  actionId: string,
  expectedStateVersion: number
): AdminCommand =>
  ({
    type,
    requestId: `request-${actionId}`,
    actionId,
    expectedStateVersion,
    reason: "Event slot ended"
  }) as AdminCommand;

/**
 * A quarantined room refuses every command so a suspect state cannot keep
 * playing, which is right, but it left a failed session with no result at
 * all. The failed transition is discarded before it reaches memory, so the
 * state still held is the last one that passed its invariants, and scoring
 * that is the one safe operation worth allowing.
 */
describe("ending a session that cannot continue", () => {
  const quarantinedRoom = async () => {
    const state = createGame("room-rescue");
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({
      state,
      persistence,
      // An engine result this invalid quarantines the room on first use.
      random: { nextInt: () => 7 },
      now: () => 1_000
    });
    await runtime.processCommand(
      { ...adminSession(state), role: "player", playerId: state.turn!.playerId },
      { type: "roll", requestId: "r1", actionId: "a1", expectedStateVersion: state.version }
    );
    return { runtime, state, persistence };
  };

  it("still refuses ordinary operator commands once quarantined", async () => {
    const { runtime, state } = await quarantinedRoom();
    expect(runtime.isQuarantined()).toBe(true);

    for (const type of ["admin_pause_game", "admin_resume_game", "admin_skip_turn"] as const) {
      const version = runtime.getState().version;
      expect(
        await runtime.processAdminCommand(adminSession(state), admin(type, type, version))
      ).toMatchObject({
        status: "rejected",
        code: "ROOM_QUARANTINED"
      });
    }
  });

  it("scores the last good state so the session still has a winner", async () => {
    const { runtime, state, persistence } = await quarantinedRoom();

    const receipt = await runtime.processAdminCommand(
      adminSession(state),
      admin("admin_end_game", "end", runtime.getState().version)
    );

    expect(receipt).toMatchObject({ status: "accepted" });
    const ended = runtime.getState();
    expect(ended.phase).toBe("completed");
    expect(ended.results).toHaveLength(4);
    // The result is durable, not only in memory.
    expect(persistence.transitions.at(-1)?.nextState.phase).toBe("completed");
  });

  it("reads as a finished room afterwards rather than staying flagged", async () => {
    const { runtime, state } = await quarantinedRoom();
    await runtime.processAdminCommand(
      adminSession(state),
      admin("admin_end_game", "end", runtime.getState().version)
    );
    expect(runtime.isQuarantined()).toBe(false);
  });

  it("ends a healthy room early and stops further play", async () => {
    const state = createGame("room-timeup");
    const runtime = new RoomRuntime({
      state,
      persistence: new InMemoryGamePersistence(),
      random: createSeededRandom(8),
      now: () => 1_000
    });

    expect(
      await runtime.processAdminCommand(
        adminSession(state),
        admin("admin_end_game", "end", runtime.getState().version)
      )
    ).toMatchObject({ status: "accepted" });
    expect(runtime.getState().phase).toBe("completed");

    // A finished game accepts no further turns, and nothing is left on a timer.
    expect(
      await runtime.processCommand(
        { ...adminSession(state), role: "player", playerId: state.turn!.playerId },
        { type: "roll", requestId: "r2", actionId: "a2", expectedStateVersion: runtime.getState().version }
      )
    ).toMatchObject({ status: "rejected" });
    expect(runtime.nextDeadlineAt()).toBeNull();
  });
});

/**
 * The engine leaves the objective deadline unset when no clock is supplied, so
 * that setup stays deterministic. That is only safe while the real server
 * always supplies one; this is the test that keeps it true.
 */
describe("rooms the server creates are always timed", () => {
  it("arms the opening objective deadline from the operator's clock", async () => {
    const { RoomManager } = await import("../src/index.js");
    let clock = 5_000;
    const manager = new RoomManager({
      now: () => clock,
      randomFactory: () => createSeededRandom(3),
      persistenceFactory: () => new InMemoryGamePersistence()
    });
    const owner: AuthenticatedSession = {
      sessionId: "admin-session",
      role: "admin",
      roomId: null,
      playerId: null,
      expiresAt: 900_000
    };
    await manager.createRoom(owner, { roomId: "ROOMA1", code: "ROOMA1" });
    for (let seat = 0; seat < 4; seat++) {
      await manager.joinRoom("ROOMA1", { playerId: `ROOMA1p${seat}`, name: `Player ${seat}` });
    }
    clock = 60_000;
    const runtime = await manager.initializeRoom(owner, "ROOMA1");

    // Anchored to when the operator opened the room, not to when the process
    // started, so the very first decision cannot be born already expired.
    expect(runtime.getState().objectiveSelection?.deadlineAt).toBe(60_000 + 45_000);
    expect(runtime.nextDeadlineAt()).toBe(105_000);
  });
});
