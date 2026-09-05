import { randomUUID } from "node:crypto";

import {
  createAdminProjection,
  createPlayerProjection,
  createProjectorProjection,
  type GameState
} from "@econova/game-engine";

import type { AuthenticatedSession } from "../auth/types.js";

export type ConnectionSender = (message: Record<string, unknown>) => void;

interface Connection {
  readonly connectionId: string;
  readonly session: AuthenticatedSession;
  readonly send: ConnectionSender;
}

export class ConnectionHub {
  private readonly bySessionId = new Map<string, Connection>();

  add(session: AuthenticatedSession, send: ConnectionSender): string {
    const connectionId = randomUUID();
    this.bySessionId.set(session.sessionId, { connectionId, session, send });
    return connectionId;
  }

  remove(sessionId: string, connectionId: string): void {
    const current = this.bySessionId.get(sessionId);
    if (current?.connectionId === connectionId) this.bySessionId.delete(sessionId);
  }

  broadcastState(state: GameState): void {
    for (const connection of this.bySessionId.values()) {
      if (connection.session.roomId !== state.roomId) continue;
      let projection: Record<string, unknown>;
      if (connection.session.role === "player") {
        if (connection.session.playerId === null) continue;
        projection = createPlayerProjection(
          state,
          connection.session.playerId
        ) as unknown as Record<string, unknown>;
      } else if (connection.session.role === "projector") {
        projection = createProjectorProjection(state) as unknown as Record<string, unknown>;
      } else {
        projection = createAdminProjection(state) as unknown as Record<string, unknown>;
      }
      connection.send({
        type: "state_snapshot",
        roomId: state.roomId,
        stateVersion: state.version,
        projection
      });
    }
  }

  sendCurrentState(state: GameState, sessionId: string): void {
    const connection = this.bySessionId.get(sessionId);
    if (connection === undefined || connection.session.roomId !== state.roomId) return;
    let projection: Record<string, unknown>;
    if (connection.session.role === "player") {
      if (connection.session.playerId === null) return;
      projection = createPlayerProjection(
        state,
        connection.session.playerId
      ) as unknown as Record<string, unknown>;
    } else if (connection.session.role === "projector") {
      projection = createProjectorProjection(state) as unknown as Record<string, unknown>;
    } else {
      projection = createAdminProjection(state) as unknown as Record<string, unknown>;
    }
    connection.send({
      type: "state_snapshot",
      roomId: state.roomId,
      stateVersion: state.version,
      projection
    });
  }
}
