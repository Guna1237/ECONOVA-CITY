import { randomUUID } from "node:crypto";

import { serverMessageSchema, type ServerMessage } from "@econova/contracts";

import {
  createAdminProjection,
  createPlayerProjection,
  createProjectorProjection,
  type GameState
} from "@econova/game-engine";

import type { AuthenticatedSession } from "../auth/types.js";

export type ConnectionSender = (message: ServerMessage) => void;
export type ConnectionCloser = (code: number, reason: string) => void;

interface Connection {
  readonly connectionId: string;
  readonly session: AuthenticatedSession;
  readonly send: ConnectionSender;
  readonly close?: ConnectionCloser;
}

export class ConnectionHub {
  private readonly bySessionId = new Map<string, Connection>();

  constructor(private readonly isSessionActive: (session: AuthenticatedSession) => boolean = () => true) {}

  closeSession(sessionId: string, code = 4401): void {
    const connection = this.bySessionId.get(sessionId);
    if (connection === undefined) return;
    this.bySessionId.delete(sessionId);
    connection.close?.(code, "Session ended");
  }

  closeAll(): void {
    for (const connection of this.bySessionId.values()) connection.close?.(1012, "Server restarting");
    this.bySessionId.clear();
  }

  hasPlayer(roomId: string, playerId: string): boolean {
    return [...this.bySessionId.values()].some(c => c.session.roomId === roomId && c.session.playerId === playerId && this.isSessionActive(c.session));
  }

  private deliver(connection: Connection, message: ServerMessage): void {
    if (!this.isSessionActive(connection.session)) {
      this.closeSession(connection.session.sessionId);
      return;
    }
    try { connection.send(message); }
    catch { this.closeSession(connection.session.sessionId, 1011); }
  }

  sendRoomMessage(roomId: string, build: (role: AuthenticatedSession["role"]) => ServerMessage, sessionId?: string): void {
    for (const connection of this.bySessionId.values()) {
      if (connection.session.roomId !== roomId || (sessionId !== undefined && connection.session.sessionId !== sessionId)) continue;
      this.deliver(connection, build(connection.session.role));
    }
  }

  add(session: AuthenticatedSession, send: ConnectionSender, close?: ConnectionCloser): string {
    const connectionId = randomUUID();
    const previous = this.bySessionId.get(session.sessionId);
    this.bySessionId.set(session.sessionId, {
      connectionId,
      session,
      send,
      ...(close !== undefined ? { close } : {})
    });
    previous?.close?.(4009, "Connection replaced");
    return connectionId;
  }

  isActive(sessionId: string, connectionId: string): boolean {
    return this.bySessionId.get(sessionId)?.connectionId === connectionId;
  }

  remove(sessionId: string, connectionId: string): void {
    const current = this.bySessionId.get(sessionId);
    if (current?.connectionId === connectionId) this.bySessionId.delete(sessionId);
  }

  broadcastState(state: GameState): void {
    for (const connection of this.bySessionId.values()) {
      if (connection.session.roomId !== state.roomId) continue;
      let projection: unknown;
      if (connection.session.role === "player") {
        if (connection.session.playerId === null) continue;
        projection = createPlayerProjection(
          state,
          connection.session.playerId
        );
      } else if (connection.session.role === "projector") {
        projection = createProjectorProjection(state);
      } else {
        projection = createAdminProjection(state);
      }
      this.deliver(connection, serverMessageSchema.parse({
        type: "state_snapshot",
        audience: connection.session.role,
        roomId: state.roomId,
        stateVersion: state.version,
        projection
      }));
    }
  }

  sendCurrentState(state: GameState, sessionId: string): void {
    const connection = this.bySessionId.get(sessionId);
    if (connection === undefined || connection.session.roomId !== state.roomId) return;
    let projection: unknown;
    if (connection.session.role === "player") {
      if (connection.session.playerId === null) return;
      projection = createPlayerProjection(
        state,
        connection.session.playerId
      );
    } else if (connection.session.role === "projector") {
      projection = createProjectorProjection(state);
    } else {
      projection = createAdminProjection(state);
    }
    this.deliver(connection, serverMessageSchema.parse({
      type: "state_snapshot",
      audience: connection.session.role,
      roomId: state.roomId,
      stateVersion: state.version,
      projection
    }));
  }
}
