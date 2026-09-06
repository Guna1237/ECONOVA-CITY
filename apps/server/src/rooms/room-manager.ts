import { randomUUID } from "node:crypto";

import {
  assertGameInvariants,
  createInitialGame,
  type GameState,
  type RandomSource
} from "@econova/game-engine";

import type { AuthenticatedSession } from "../auth/types.js";
import type { PersistedSessionRecord } from "../auth/session-store.js";
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
  recoveryBlocked?: boolean;
}

export interface RoomManagerOptions {
  readonly now: () => number;
  readonly randomFactory: (roomId: string) => RandomSource;
  readonly persistenceFactory: (roomId: string) => GamePersistence;
  readonly persistLobby?: (room: LobbyRecord, session?: PersistedSessionRecord) => Promise<void>;
}

export interface LobbyRecord {
  readonly roomId: string;
  readonly code: string;
  readonly players: readonly LobbyPlayer[];
}

export interface RecoverableRoom {
  readonly roomId: string;
  readonly code: string;
  readonly state: GameState;
  readonly quarantined?: boolean;
}

export class RoomManager {
  private readonly rooms = new Map<string, ManagedRoom>();
  private readonly roomIdByCode = new Map<string, string>();
  private readonly now: () => number;
  private readonly randomFactory: RoomManagerOptions["randomFactory"];
  private readonly persistenceFactory: RoomManagerOptions["persistenceFactory"];
  private readonly persistLobby: RoomManagerOptions["persistLobby"];
  private queue: Promise<void> = Promise.resolve();

  constructor(options: RoomManagerOptions) {
    this.now = options.now;
    this.randomFactory = options.randomFactory;
    this.persistenceFactory = options.persistenceFactory;
    this.persistLobby = options.persistLobby;
  }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.queue.then(operation);
    this.queue = task.then(() => undefined, () => undefined);
    return task;
  }

  private requireAdmin(session: AuthenticatedSession): void {
    if (session.role !== "admin" || session.roomId !== null || session.expiresAt <= this.now()) {
      throw new Error("A valid admin session is required.");
    }
  }

  createRoom(
    session: AuthenticatedSession,
    input: { readonly roomId?: string; readonly code: string }
  ): Promise<ManagedRoom> {
    return this.serialize(async () => {
    this.requireAdmin(session);
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error("Room code must contain exactly 6 uppercase letters or digits.");
    }
    if (this.roomIdByCode.has(code)) throw new Error("Room code already exists.");
    const roomId = input.roomId ?? randomUUID();
    if (this.rooms.has(roomId)) throw new Error("Room identifier already exists.");
    const room: ManagedRoom = { roomId, code, players: [], runtime: null };
    await this.persistLobby?.(room);
    this.rooms.set(roomId, room);
    this.roomIdByCode.set(code, roomId);
    return room;
    });
  }

  restoreLobby(input: LobbyRecord, recoveryBlocked = false): ManagedRoom {
    if (this.rooms.has(input.roomId) || this.roomIdByCode.has(input.code)) throw new Error("Duplicate recovered lobby.");
    if (!/^[A-Z0-9]{6}$/.test(input.code) || input.players.length > 6 || new Set(input.players.map(p => p.playerId)).size !== input.players.length) throw new Error("Invalid recovered lobby.");
    const room: ManagedRoom = { ...input, players: input.players.map(p => ({ ...p })), runtime: null, recoveryBlocked };
    this.rooms.set(room.roomId, room);
    this.roomIdByCode.set(room.code, room.roomId);
    return room;
  }

  restoreRoom(input: RecoverableRoom): ManagedRoom {
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error("Recovered room code is invalid.");
    if (input.state.roomId !== input.roomId) throw new Error("Recovered room binding is invalid.");
    if (this.rooms.has(input.roomId) || this.roomIdByCode.has(code)) {
      throw new Error("Recovered room duplicates an existing room.");
    }
    assertGameInvariants(input.state);
    const players = input.state.turnOrder.map((playerId) => {
      const player = input.state.players[playerId];
      if (player === undefined) throw new Error("Recovered room contains an unknown player.");
      return { playerId, name: player.name };
    });
    const room: ManagedRoom = {
      roomId: input.roomId,
      code,
      players,
      runtime: new RoomRuntime({
        state: input.state,
        persistence: this.persistenceFactory(input.roomId),
        random: this.randomFactory(input.roomId),
        now: this.now
      })
    };
    this.rooms.set(room.roomId, room);
    this.roomIdByCode.set(room.code, room.roomId);
    if (input.quarantined && room.runtime !== null) {
      room.runtime.status = "quarantined";
      room.runtime.quarantineReason = "Recovered room requires operator review.";
    }
    return room;
  }

  joinRoom(codeInput: string, player: LobbyPlayer, session?: PersistedSessionRecord): Promise<ManagedRoom> {
    return this.serialize(async () => {
    const code = codeInput.trim().toUpperCase();
    const roomId = this.roomIdByCode.get(code);
    const room = roomId === undefined ? undefined : this.rooms.get(roomId);
    if (room === undefined) throw new Error("Room was not found.");
    if (room.recoveryBlocked) throw new Error("Room requires recovery review.");
    if (room.runtime !== null) throw new Error("Room has already been initialized.");
    if (room.players.some(({ playerId }) => playerId === player.playerId)) {
      throw new Error("Player is already in this room.");
    }
    if (room.players.length >= 6) throw new Error("Room is full.");
    const name = player.name.trim();
    if (name.length < 1 || name.length > 40) throw new Error("Player name is invalid.");
    const next = { ...room, players: [...room.players, { playerId: player.playerId, name }] };
    await this.persistLobby?.(next, session);
    room.players.push({ playerId: player.playerId, name });
    return room;
    });
  }

  async initializeRoom(
    session: AuthenticatedSession,
    roomId: string
  ): Promise<RoomRuntime> {
    return this.serialize(async () => {
    this.requireAdmin(session);
    const room = this.rooms.get(roomId);
    if (room === undefined) throw new Error("Room was not found.");
    if (room.recoveryBlocked) throw new Error("Room requires recovery review.");
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
    await persistence.persistInitialState(state, { roomCode: room.code });
    room.runtime = new RoomRuntime({
      state,
      persistence,
      random,
      now: this.now
    });
    return room.runtime;
    });
  }

  listRooms(): readonly ManagedRoom[] { return [...this.rooms.values()]; }

  getRoomForSession(session: AuthenticatedSession): ManagedRoom {
    if (session.roomId === null || session.expiresAt <= this.now()) throw new Error("Session is not bound to a room.");
    const room = this.rooms.get(session.roomId);
    if (room === undefined) throw new Error("Session room is unavailable.");
    if (session.role === "player" && !room.players.some(p => p.playerId === session.playerId)) throw new Error("Player is not in this room.");
    return room;
  }

  getRoom(roomId: string): ManagedRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByCode(code: string): ManagedRoom | undefined {
    const roomId = this.roomIdByCode.get(code.trim().toUpperCase());
    return roomId === undefined ? undefined : this.rooms.get(roomId);
  }

  getRuntimeForSession(session: AuthenticatedSession): RoomRuntime {
    const room = this.getRoomForSession(session);
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
