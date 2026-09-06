import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { describe, expect, it } from "vitest";
import { serverMessageSchema, joinRoomResponseSchema, projectorSessionResponseSchema, adminLoginResponseSchema, type ServerMessage } from "@econova/contracts";
import { createSeededRandom } from "@econova/game-engine";
import { buildServer, ConnectionHub, RoomManager, SessionStore, InMemoryGamePersistence } from "../src/index.js";

class Peer {
  readonly socket: WebSocket;
  readonly messages: ServerMessage[] = [];
  private readonly listeners = new Set<() => void>();
  constructor(url: string, token: string) {
    this.socket = new WebSocket(url, { origin: "http://localhost:5173" });
    this.socket.on("open", () => this.socket.send(JSON.stringify({ type: "resume", sessionToken: token })));
    this.socket.on("message", raw => {
      this.messages.push(serverMessageSchema.parse(JSON.parse(raw.toString())));
      for (const notify of this.listeners) notify();
    });
    this.socket.on("error", () => undefined);
  }
  wait(predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.listeners.delete(check); reject(Error("Expected socket message not received")); }, 5000);
      const check = () => {
        const found = this.messages.find(predicate);
        if (found !== undefined) { clearTimeout(timer); this.listeners.delete(check); resolve(found); }
      };
      this.listeners.add(check); check();
    });
  }
  send(value: unknown): void { this.socket.send(JSON.stringify(value)); }
  close(): void { this.socket.terminate(); }
}

async function networkFixture() {
  let clock = 1000;
  const now = () => clock;
  const sessions = new SessionStore();
  const persistence = new Map<string, InMemoryGamePersistence>();
  const manager = new RoomManager({ now, randomFactory: () => createSeededRandom(4), persistenceFactory: roomId => {
    const store = persistence.get(roomId) ?? new InMemoryGamePersistence(); persistence.set(roomId, store); return store;
  } });
  const peers: Peer[] = [];
  const app = buildServer({ now, sessions, roomManager: manager, connections: new ConnectionHub(session => sessions.isActive(session.sessionId, now())), adminAccessKey: "a".repeat(32), projectorAccessKey: "p".repeat(32), sessionTtlMilliseconds: 300000, adminRealtimeTtlMilliseconds: 250000, allowedOrigins: ["http://localhost:5173"], authAttemptLimit: 100, authAttemptWindowMilliseconds: 60000, readinessCheck: async () => true, logger: false });
  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  const post = async (path: string, body: unknown, token?: string) => {
    const response = await fetch(address + path, { method: "POST", headers: { "content-type": "application/json", ...(token === undefined ? {} : { authorization: `Bearer ${token}` }) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() as unknown };
  };
  const admin = adminLoginResponseSchema.parse((await post("/api/admin/login", { accessKey: "a".repeat(32) })).body);
  const connect = (token: string) => { const peer = new Peer(address.replace("http", "ws") + "/ws", token); peers.push(peer); return peer; };
  const envelope = (roomId: string, payload: object) => ({ ...payload, requestId: randomUUID(), actionId: randomUUID(), expectedStateVersion: manager.getRoom(roomId)!.runtime!.getState().version });
  return { app, manager, persistence, sessions, peers, post, admin, connect, envelope, now, advance: (milliseconds: number) => { clock += milliseconds; }, close: async () => { peers.forEach(peer => peer.close()); await app.close(); } };
}

describe("real HTTP and WebSocket multiplayer", () => {
  it("runs twelve identities in two isolated rooms with projector/admin privacy, reconnect, and safe replay", async () => {
    const ctx = await networkFixture();
    try {
      const playerPeers = new Map<string, Peer>();
      const playerTokens = new Map<string, string>();
      const projectors = new Map<string, Peer>();
      const admins = new Map<string, Peer>();
      for (const roomId of ["ROOMA1", "ROOMB1"]) {
        expect((await ctx.post("/api/admin/rooms", { roomId, code: roomId }, ctx.admin.token)).status).toBe(201);
        for (let seat = 0; seat < 6; seat++) {
          const joined = joinRoomResponseSchema.parse((await ctx.post(`/api/rooms/${roomId}/join`, { name: `${roomId} Player ${seat}` })).body);
          const peer = ctx.connect(joined.token);
          playerPeers.set(joined.playerId, peer);
          playerTokens.set(joined.playerId, joined.token);
          await peer.wait(message => message.type === "lobby_snapshot");
        }
        const projector = projectorSessionResponseSchema.parse((await ctx.post(`/api/rooms/${roomId}/projector`, { accessKey: "p".repeat(32) })).body);
        const projectorPeer = ctx.connect(projector.token); projectors.set(roomId, projectorPeer);
        await projectorPeer.wait(message => message.type === "lobby_snapshot");
        const admin = projectorSessionResponseSchema.parse((await ctx.post(`/api/admin/rooms/${roomId}/realtime-session`, {}, ctx.admin.token)).body);
        const adminPeer = ctx.connect(admin.token); admins.set(roomId, adminPeer);
        await adminPeer.wait(message => message.type === "lobby_snapshot");
        expect((await ctx.post(`/api/admin/rooms/${roomId}/initialize`, {}, ctx.admin.token)).status).toBe(200);
        const runtime = ctx.manager.getRoom(roomId)!.runtime!;
        while (runtime.getState().objectiveSelection !== null) {
          const choice = runtime.getState().objectiveSelection!;
          const peer = playerPeers.get(choice.playerId)!;
          const command = ctx.envelope(roomId, { type: "choose_objective", objectiveId: choice.offeredObjectiveIds[0] });
          peer.send(command);
          await peer.wait(message => message.type === "action_accepted" && message.requestId === command.requestId);
        }
        const started = await ctx.post(`/api/admin/rooms/${roomId}/command`, ctx.envelope(roomId, { type: "admin_start_game" }), ctx.admin.token);
        expect(started.status).toBe(200);
        await projectorPeer.wait(message => message.type === "state_snapshot" && message.stateVersion === runtime.getState().version);
      }

      const roomA = ctx.manager.getRoom("ROOMA1")!.runtime!;
      const roomB = ctx.manager.getRoom("ROOMB1")!.runtime!;
      const beforeB = roomB.getState();
      let firstPlayer = playerPeers.get(roomA.getState().turn!.playerId)!;
      const roll = ctx.envelope("ROOMA1", { type: "roll" });
      firstPlayer.send(roll); firstPlayer.send(roll);
      await firstPlayer.wait(message => message.type === "action_accepted" && message.requestId === roll.requestId);
      const rolledVersion = roll.expectedStateVersion + 1;
      await projectors.get("ROOMA1")!.wait(message => message.type === "state_snapshot" && message.stateVersion === rolledVersion);
      expect(roomA.getState().version).toBe(rolledVersion);
      for (const [playerId, token] of playerTokens) {
        const old = playerPeers.get(playerId)!;
        const replaced = new Promise<number>(resolve => old.socket.once("close", code => resolve(code)));
        const fresh = ctx.connect(token);
        const snapshot = await fresh.wait(message => message.type === "state_snapshot" && message.audience === "player");
        expect(await replaced).toBe(4009);
        if (snapshot.type !== "state_snapshot" || snapshot.audience !== "player") throw Error("Unexpected role");
        expect(snapshot.projection.self.playerId).toBe(playerId);
        expect(snapshot.projection.public.players).toHaveLength(6);
        expect(snapshot.roomId).toBe(ctx.sessions.resume(token, ctx.now())!.roomId);
        expect(JSON.stringify(snapshot.projection.public)).not.toMatch(/"cards"|"objectiveId"|"bids"|"credits"|"influence"/);
        playerPeers.set(playerId, fresh);
      }
      expect(ctx.manager.getRoom("ROOMA1")!.players).toHaveLength(6);
      expect(ctx.manager.getRoom("ROOMB1")!.players).toHaveLength(6);
      firstPlayer = playerPeers.get(roomA.getState().turn!.playerId)!;
      expect(roomB.getState()).toEqual(beforeB);
      firstPlayer.send({ ...roll, actionId: randomUUID(), requestId: randomUUID() });
      await firstPlayer.wait(message => message.type === "action_rejected" && message.code === "STALE_STATE");
      firstPlayer.send({ ...ctx.envelope("ROOMA1", { type: "end_turn" }), roomId: "ROOMB1", credits: 999999 });
      await firstPlayer.wait(message => message.type === "action_rejected" && message.code === "INVALID_COMMAND");
      projectors.get("ROOMA1")!.send(ctx.envelope("ROOMA1", { type: "roll" }));
      await projectors.get("ROOMA1")!.wait(message => message.type === "action_rejected" && message.code === "AUTHORIZATION_DENIED");
      for (const [roomId, peer] of [...projectors, ...admins]) {
        const snapshots = peer.messages.filter(message => message.type === "state_snapshot");
        expect(snapshots.length).toBeGreaterThan(0);
        for (const message of snapshots) {
          expect(message.roomId).toBe(roomId);
          expect(JSON.stringify(message)).not.toMatch(/"cards"|"objectiveId"|"objectiveOffer"|"bids"|"allocations"|"credits"|"influence"|"token"|"sessionId"/);
        }
      }
      for (const [playerId, peer] of playerPeers) {
        const snapshots = peer.messages.filter(message => message.type === "state_snapshot" && message.audience === "player");
        expect(snapshots.length).toBeGreaterThan(0);
        for (const message of snapshots) {
          if (message.type !== "state_snapshot" || message.audience !== "player") throw Error("Unexpected role");
          expect(message.projection.self.playerId).toBe(playerId);
          expect(JSON.stringify(message.projection.public)).not.toMatch(/"cards"|"objectiveId"|"bids"|"credits"|"influence"/);
        }
      }
      const secondPlayer = playerPeers.get(roomB.getState().turn!.playerId)!;
      const secondRoll = ctx.envelope("ROOMB1", { type: "roll" });
      secondPlayer.send(secondRoll);
      await secondPlayer.wait(message => message.type === "action_accepted" && message.requestId === secondRoll.requestId);
      expect(roomA.getState().version).toBe(rolledVersion);
    } finally { await ctx.close(); }
  }, 30000);

  it("supersedes sockets without duplicate players and rejects expired sessions", async () => {
    const ctx = await networkFixture();
    try {
      await ctx.post("/api/admin/rooms", { roomId: "ROOMA1", code: "ROOMA1" }, ctx.admin.token);
      const joined = joinRoomResponseSchema.parse((await ctx.post("/api/rooms/ROOMA1/join", { name: "Ada" })).body);
      const old = ctx.connect(joined.token);
      await old.wait(message => message.type === "lobby_snapshot");
      const replaced = new Promise<number>(resolve => old.socket.once("close", code => resolve(code)));
      const fresh = ctx.connect(joined.token);
      await fresh.wait(message => message.type === "lobby_snapshot");
      expect(await replaced).toBe(4009);
      expect(ctx.manager.getRoom("ROOMA1")!.players).toHaveLength(1);
      fresh.socket.send("{");
      await fresh.wait(message => message.type === "action_rejected" && message.code === "INVALID_COMMAND");
      ctx.advance(300001);
      const denied = ctx.connect(joined.token);
      const closeCode = await new Promise<number>(resolve => denied.socket.once("close", code => resolve(code)));
      expect(closeCode).toBe(4403);
    } finally { await ctx.close(); }
  });
});
