import { randomUUID } from "node:crypto";

import {
  createInitialGame,
  type RandomSource
} from "@econova/game-engine";

import type { AuthenticatedSession } from "../auth/types.js";
import type { GamePersistence } from "../persistence/types.js";
import { RoomRuntime } from "./room-runtime.js";

export interface LobbyPlayer {
  readonly playerId: string;
  readonly name: string;
}

export interface ManagedRoom {
  readonly roomId: string;
  readonly code: string;
  readonly players: LobbyPlayer[];
  runtime: RoomRuntime | null;
}

export interface RoomManagerOptions {
  readonly now: () => number;
  readonly randomFactory: (roomId: string) => RandomSource;
  readonly persistenceFactory: (roomId: string) => GamePersistence;
}

export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>();
  private readonly roomIdByCode = new Map<string, string>();
  private readonly now: () => number;
  private readonly randomFactory: RoomManagerOptions["randomFactory"];
  private readonly persistenceFactory: RoomManagerOptions["persistenceFactory"];

  constructor(options: RoomManagerOptions) {
    this.now = options.now;
    this.randomFactory = options.randomFactory;
    this.persistenceFactory = options.persistenceFactory;
  }

  private requireAdmin(session: AuthenticatedSession): void {
    if (session.role !== "admin" || session.expiresAt <= this.now()) {
      throw new Error("A valid admin session is required.");
    }
  }

  createRoom(
    session: AuthenticatedSession,
    input: { readonly roomId?: string; readonly code: string }
  ): ManagedRoom {
    this.requireAdmin(session);
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error("Room code must contain exactly 6 uppercase letters or digits.");
    }
    if (this.roomIdByCode.has(code)) throw new Error("Room code already exists.");
    const roomId = input.roomId ?? randomUUID();
    if (this.rooms.has(roomId)) throw new Error("Room identifier already exists.");
    const room: ManagedRoom = { roomId, code, players: [], runtime: null };
    this.rooms.set(roomId, room);
    this.roomIdByCode.set(code, roomId);
    return room;
  }

  joinRoom(codeInput: string, player: LobbyPlayer): ManagedRoom {
    const code = codeInput.trim().toUpperCase();
    const roomId = this.roomIdByCode.get(code);
    const room = roomId === undefined ? undefined : this.rooms.get(roomId);
    if (room === undefined) throw new Error("Room was not found.");
    if (room.runtime !== null) throw new Error("Room has already been initialized.");
    if (room.players.some(({ playerId }) => playerId === player.playerId)) {
      throw new Error("Player is already in this room.");
    }
    if (room.players.length >= 6) throw new Error("Room is full.");
    const name = player.name.trim();
    if (name.length < 1 || name.length > 40) throw new Error("Player name is invalid.");
    room.players.push({ playerId: player.playerId, name });
    return room;
  }

  async initializeRoom(
    session: AuthenticatedSession,
    roomId: string
  ): Promise<RoomRuntime> {
    this.requireAdmin(session);
    const room = this.rooms.get(roomId);
    if (room === undefined) throw new Error("Room was not found.");
    if (room.runtime !== null) throw new Error("Room is already initialized.");
    if (room.players.length < 4 || room.players.length > 6) {
      throw new Error("Room requires 4-6 players before initialization.");
    }
    const random = this.randomFactory(roomId);
    const state = createInitialGame({
      gameId: `game-${roomId}-${this.now()}`,
      roomId,
      players: room.players.map(({ playerId, name }) => ({ id: playerId, name })),
      random
    });
    const persistence = this.persistenceFactory(roomId);
    await persistence.persistInitialState(state);
    room.runtime = new RoomRuntime({
      state,
      persistence,
      random,
      now: this.now
    });
    return room.runtime;
  }

  getRoom(roomId: string): ManagedRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): ManagedRoom | undefined {
    const roomId = this.roomIdByCode.get(code.trim().toUpperCase());
    return roomId === undefined ? undefined : this.rooms.get(roomId);
  }

  getRuntimeForSession(session: AuthenticatedSession): RoomRuntime {
    if (session.roomId === null) throw new Error("Session is not bound to a room.");
    const room = this.rooms.get(session.roomId);
    if (room?.runtime === null || room?.runtime === undefined) {
      throw new Error("Session room is unavailable.");
    }
    if (
      session.role === "player" &&
      (session.playerId === null ||
        !room.players.some(({ playerId }) => playerId === session.playerId))
    ) {
      throw new Error("Player session is not a member of this room.");
    }
    return room.runtime;
  }
}
