import { describe, expect, it } from "vitest";

import type { AdminCommand } from "@econova/contracts";
import {
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  type GameState
} from "@econova/game-engine";

import {
  InMemoryGamePersistence,
  RoomRuntime,
  type AuthenticatedSession
} from "../src/index.js";

const readyState = (): GameState => {
  let state = createInitialGame({
    gameId: "game-room-a",
    roomId: "room-a",
    players: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
    random: createSeededRandom(1)
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

const admin: AuthenticatedSession = {
  sessionId: "admin-1",
  role: "admin",
  roomId: null,
  playerId: null,
  expiresAt: 100_000
};

let sequence = 0;
const adminCommand = (
  state: GameState,
  type: AdminCommand["type"],
  payload: Record<string, unknown> = {}
): AdminCommand => {
  sequence += 1;
  return {
    requestId: `admin-request-${sequence}`,
    actionId: `admin-action-${sequence}`,
    expectedStateVersion: state.version,
    type,
    ...payload
  } as AdminCommand;
};

describe("privileged room operations", () => {
  it("rechecks admin authorization when a queued command begins", async () => {
    const state = readyState();
    const runtime = new RoomRuntime({ state, persistence: new InMemoryGamePersistence(), random: createSeededRandom(2), now: () => 1_000 });
    let authorized = true;
    const pending = runtime.processAdminCommand(admin, adminCommand(state, "admin_start_game"), () => authorized);
    authorized = false;
    await expect(pending).resolves.toMatchObject({ status: "rejected", code: "AUTHORIZATION_DENIED" });
    await runtime.drain();
    expect(runtime.getState()).toEqual(state);
  });

  it("quarantines a stale-command receipt write failure without losing the queue", async () => {
    const state = readyState();
    const persistence = new InMemoryGamePersistence();
    persistence.failNextReceipt = true;
    const runtime = new RoomRuntime({ state, persistence, random: createSeededRandom(2), now: () => 1_000 });
    await expect(runtime.processAdminCommand(admin, {
      ...adminCommand(state, "admin_start_game"), expectedStateVersion: state.version + 1
    })).resolves.toMatchObject({ status: "rejected", code: "ROOM_QUARANTINED" });
    expect(runtime.getState()).toEqual(state);
  });

  it("starts, pauses, and resumes through the serialized persistence boundary", async () => {
    const persistence = new InMemoryGamePersistence();
    const runtime = new RoomRuntime({
      state: readyState(),
      persistence,
      random: createSeededRandom(2),
      now: () => 1_000
    });

    let receipt = await runtime.processAdminCommand(
      admin,
      adminCommand(runtime.getState(), "admin_start_game")
    );
    expect(receipt.status).toBe("accepted");
    expect(runtime.getState().phase).toBe("player_turn");

    receipt = await runtime.processAdminCommand(
      admin,
      adminCommand(runtime.getState(), "admin_pause_game", { reason: "Operator check" })
    );
    expect(receipt.status).toBe("accepted");
    expect(runtime.getState().phase).toBe("paused");

    receipt = await runtime.processAdminCommand(
      admin,
      adminCommand(runtime.getState(), "admin_resume_game")
    );
    expect(receipt.status).toBe("accepted");
    expect(runtime.getState().phase).toBe("player_turn");
    expect(persistence.transitions).toHaveLength(3);
    expect(persistence.transitions.every(({ adminAudit }) => adminAudit !== undefined)).toBe(true);
  });

  it("rejects player sessions and unsupported destructive admin actions", async () => {
    const state = readyState();
    const runtime = new RoomRuntime({
      state,
      persistence: new InMemoryGamePersistence(),
      random: createSeededRandom(2),
      now: () => 1_000
    });
    const player: AuthenticatedSession = {
      sessionId: "p-session",
      role: "player",
      roomId: "room-a",
      playerId: state.turnOrder[0]!,
      expiresAt: 100_000
    };

    await expect(
      runtime.processAdminCommand(player, adminCommand(state, "admin_start_game"))
    ).resolves.toMatchObject({ status: "rejected", code: "AUTHORIZATION_DENIED" });
    await expect(
      runtime.processAdminCommand(
        admin,
        adminCommand(state, "admin_end_game", { reason: "forged end" })
      )
    ).resolves.toMatchObject({ status: "rejected", code: "ADMIN_ACTION_UNAVAILABLE" });
  });
});
