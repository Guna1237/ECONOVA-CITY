import { serverMessageSchema } from "@econova/contracts";
import type { ManagedRoom, RoomManager } from "../rooms/room-manager.js";
import type { RoomRuntime } from "../rooms/room-runtime.js";
import type { ConnectionHub } from "./connection-hub.js";

/** One scheduler per room; deadlines and presence share the runtime command queue. */
export class RoomRealtime {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly unsubscribers = new Map<string, () => void>();
  private stopped = false;
  constructor(private readonly rooms: RoomManager, private readonly hub: ConnectionHub, private readonly now: () => number) {}

  attach(room: ManagedRoom): void {
    const runtime = room.runtime;
    if (runtime === null || this.unsubscribers.has(room.roomId)) return;
    this.unsubscribers.set(room.roomId, runtime.subscribe(() => {
      try { this.broadcast(room); } finally { this.schedule(room.roomId, runtime); }
    }));
    this.schedule(room.roomId, runtime);
  }

  broadcast(room: ManagedRoom, sessionId?: string): void {
    if (room.recoveryBlocked) {
      this.hub.sendRoomMessage(room.roomId, () => serverMessageSchema.parse({ type: "room_unavailable", roomId: room.roomId, code: "ROOM_QUARANTINED", message: "Room requires recovery review." }), sessionId);
      return;
    }
    if (room.runtime === null) {
      this.hub.sendRoomMessage(room.roomId, audience => serverMessageSchema.parse({
        type: "lobby_snapshot", audience, roomId: room.roomId,
        projection: { roomId: room.roomId, code: room.code, revision: room.players.length,
          players: room.players.map(p => ({ ...p, connected: this.hub.hasPlayer(room.roomId, p.playerId) })) }
      }), sessionId);
    } else if (room.runtime.isQuarantined()) {
      this.hub.sendRoomMessage(room.roomId, () => serverMessageSchema.parse({ type: "room_unavailable", roomId: room.roomId, code: "ROOM_QUARANTINED", message: "Room paused for operator review." }), sessionId);
    } else if (sessionId !== undefined) {
      this.hub.sendCurrentState(room.runtime.getState(), sessionId);
    } else {
      this.hub.broadcastState(room.runtime.getState());
    }
  }

  async presence(roomId: string, playerId: string): Promise<void> {
    const room = this.rooms.getRoom(roomId);
    if (room === undefined || this.stopped) return;
    if (room.runtime !== null) {
      this.attach(room);
      await room.runtime.processPresence(playerId, this.hub.hasPlayer(roomId, playerId));
    }
    this.broadcast(room);
  }

  private schedule(roomId: string, runtime: RoomRuntime): void {
    const old = this.timers.get(roomId);
    if (old !== undefined) clearTimeout(old);
    this.timers.delete(roomId);
    const deadline = runtime.nextDeadlineAt();
    if (this.stopped || deadline === null) return;
    const timer = setTimeout(() => {
      void runtime.processDeadlines().finally(() => this.schedule(roomId, runtime));
    }, Math.max(1, Math.min(2_147_483_647, deadline - this.now())));
    timer.unref();
    this.timers.set(roomId, timer);
  }

  close(): void {
    this.stopped = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    for (const unsubscribe of this.unsubscribers.values()) unsubscribe();
    this.timers.clear();
    this.unsubscribers.clear();
  }
}
