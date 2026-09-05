import { describe, expect, it } from "vitest";

import {
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  type GameState
} from "@econova/game-engine";

import { ConnectionHub, type AuthenticatedSession } from "../src/index.js";

const game = (roomId: string): GameState => {
  let state = createInitialGame({
    gameId: `game-${roomId}`,
    roomId,
    players: Array.from({ length: 4 }, (_, index) => ({
      id: `${roomId}-p${index}`,
      name: `P${index}`
    })),
    random: createSeededRandom(9)
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

const session = (
  role: AuthenticatedSession["role"],
  roomId: string,
  playerId: string | null
): AuthenticatedSession => ({
  sessionId: `${role}-${roomId}-${playerId ?? "none"}`,
  role,
  roomId,
  playerId,
  expiresAt: 100_000
});

describe("connection projection hub", () => {
  it("broadcasts only within the bound room with recipient-specific projections", () => {
    const roomA = game("room-a");
    const roomB = game("room-b");
    const playerId = roomA.turnOrder[0]!;
    roomA.players[playerId]!.cards = ["SC12"];
    const playerMessages: unknown[] = [];
    const projectorMessages: unknown[] = [];
    const otherRoomMessages: unknown[] = [];
    const hub = new ConnectionHub();
    hub.add(session("player", "room-a", playerId), (message) => playerMessages.push(message));
    hub.add(session("projector", "room-a", null), (message) => projectorMessages.push(message));
    hub.add(session("projector", "room-b", null), (message) => otherRoomMessages.push(message));

    hub.broadcastState(roomA);

    expect(playerMessages).toHaveLength(1);
    expect(JSON.stringify(playerMessages[0])).toContain("SC12");
    expect(JSON.stringify(projectorMessages[0])).not.toContain("SC12");
    expect(otherRoomMessages).toHaveLength(0);
    expect(JSON.stringify(playerMessages[0])).not.toContain(roomB.gameId);
  });

  it("replaces stale connections for the same session", () => {
    const state = game("room-a");
    const first: unknown[] = [];
    const replacement: unknown[] = [];
    const hub = new ConnectionHub();
    const projector = session("projector", "room-a", null);
    hub.add(projector, (message) => first.push(message));
    hub.add(projector, (message) => replacement.push(message));

    hub.broadcastState(state);

    expect(first).toHaveLength(0);
    expect(replacement).toHaveLength(1);
  });
});
