import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serverMessageSchema, type ServerMessage } from "@econova/contracts";
import { RoomClient, type RoomSocket } from "../src/room-client.js";

class FakeSocket implements RoomSocket {
  readyState = 0;
  readonly sent: unknown[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.({} as Event); }
  receive(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent); }
  drop(code = 1006) { this.readyState = 3; this.onclose?.({ code } as CloseEvent); }
}

const session = { role: "player" as const, token: "opaque_token_for_client_test_1234567890", expiresAt: 1_000_000, roomId: "room-a", playerId: "player-a" };
const publicState = (version: number) => ({ gameId: "game-a", roomId: "room-a", stateVersion: version, phase: "player_turn", round: 1, turnOrder: ["player-a"], currentTurnIndex: 0, turn: { number: 1, playerId: "player-a", stage: "awaiting_roll", actionsRemaining: 2, roll: null, deadlineAt: 61_000 }, players: [{ playerId: "player-a", name: "Ada", position: 0, propertyIds: [], connected: true }], properties: [], demand: { food: 0, tech: 0, entertainment: 0, mobility: 0 }, activeBreakingNewsId: null, activePolicyIds: [], auction: null, council: null, emergencySale: null, tradePending: false, results: [], announcements: [] });
const snapshot = (version = 1) => serverMessageSchema.parse({ type: "state_snapshot", audience: "player", roomId: "room-a", stateVersion: version, projection: { public: publicState(version), self: { playerId: "player-a", credits: 5000, influence: 0, cards: [], propertyIds: [], objectiveId: null, objectiveOffer: null, pendingEventChoice: null, pendingLandingFee: null, auction: null, councilAllocation: null, trade: null, capabilities: { expectedStateVersion: version, commandTypes: ["roll"] } } } });
const lobby = (revision = 1) => ({ type: "lobby_snapshot", audience: "player", roomId: "room-a", projection: { roomId: "room-a", code: "ABC123", revision, players: [{ playerId: "player-a", name: "Ada", connected: true }] } });
const clients: RoomClient[] = [];
const harness = (options: Partial<ConstructorParameters<typeof RoomClient>[0]> = {}) => {
  const sockets: FakeSocket[] = [];
  const urls: string[] = [];
  let id = 0;
  const client = new RoomClient({ apiBaseUrl: "https://game.test/", session, makeId: () => `id-${++id}`, commandTimeoutMs: 100, handshakeTimeoutMs: 200, heartbeatIntervalMs: 1000, heartbeatTimeoutMs: 500, retryBaseMs: 50, retryMaxMs: 200, ...options, socketFactory: (url) => { urls.push(url); const socket = new FakeSocket(); sockets.push(socket); return socket; } });
  clients.push(client);
  client.open();
  return { client, sockets, urls, socket: sockets[0]! };
};
const accepted = (command: { requestId: string; actionId: string }, version: number) => ({ type: "action_accepted", requestId: command.requestId, actionId: command.actionId, stateVersion: version });
const lastCommand = (client: RoomClient) => Object.values(client.getState().commands).at(-1)!;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1000); });
afterEach(() => { clients.splice(0).forEach((client) => client.close()); vi.useRealTimers(); });

describe("RoomClient synchronization and identity", () => {
  it("owns one socket, authenticates without URL credentials and waits for a snapshot", () => {
    const { client, socket, sockets, urls } = harness();
    client.open();
    expect(sockets).toHaveLength(1);
    expect(urls).toEqual(["wss://game.test/ws"]);
    expect(client.dispatch({ type: "roll" })).toBeNull();
    socket.open();
    expect(socket.sent).toEqual([{ type: "resume", sessionToken: session.token }]);
    expect(client.getState().status).toBe("authenticating");
    expect(client.dispatch({ type: "roll" })).toBeNull();
    socket.receive(snapshot());
    expect(client.getState().status).toBe("synchronized");
  });

  it.each([
    ["outer room", (s: Extract<ServerMessage, { type: "state_snapshot" }>) => ({ ...s, roomId: "room-b" })],
    ["inner room", (s: Extract<ServerMessage, { type: "state_snapshot"; audience: "player" }>) => ({ ...s, projection: { ...s.projection, public: { ...s.projection.public, roomId: "room-b" } } })],
    ["player", (s: Extract<ServerMessage, { type: "state_snapshot"; audience: "player" }>) => ({ ...s, projection: { ...s.projection, self: { ...s.projection.self, playerId: "player-b" } } })],
    ["version", (s: Extract<ServerMessage, { type: "state_snapshot" }>) => ({ ...s, stateVersion: 9 })],
    ["role", () => ({ type: "state_snapshot", audience: "projector", roomId: "room-a", stateVersion: 1, projection: publicState(1) })]
  ])("fails closed for a valid-shaped snapshot with wrong %s binding", (_label, mutate) => {
    const { client, socket } = harness(); socket.open();
    socket.receive(mutate(snapshot() as Extract<ServerMessage, { type: "state_snapshot"; audience: "player" }>));
    expect(client.getState().snapshot).toBeNull();
    expect(client.getState().status).toBe("fatal");
    expect(socket.readyState).toBe(3);
  });

  it("ignores older state and lobby revisions and never replaces active game with lobby", () => {
    const { client, socket } = harness(); socket.open();
    socket.receive(lobby(2));
    const initial = client.getState().snapshot;
    socket.receive(lobby(1));
    expect(client.getState().snapshot).toBe(initial);
    socket.receive(snapshot(3));
    const active = client.getState().snapshot;
    socket.receive(snapshot(2)); socket.receive(lobby(100));
    expect(client.getState().snapshot).toBe(active);
    expect(client.getState().stateVersion).toBe(3);
  });

  it("notifies subscribers with stable store snapshots and unsubscribes cleanly", () => {
    const { client, socket } = harness();
    const states: string[] = [];
    const unsubscribe = client.subscribe(() => states.push(client.getState().status));
    expect(client.getState()).toBe(client.getState());
    socket.open(); socket.receive(snapshot()); unsubscribe(); socket.drop();
    expect(states).toEqual(["authenticating", "synchronized"]);
  });

  it("rejects malformed messages without exposing their content", () => {
    const { client, socket } = harness(); socket.open();
    socket.receive({ ...snapshot(), privateSecret: "secret" });
    expect(client.getState().status).toBe("fatal");
    expect(JSON.stringify(client.getState())).not.toContain("secret");
  });
});

describe("RoomClient command lifecycle", () => {
  it("generates and validates IDs/version without changing the authoritative projection", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot(7));
    const before = client.getState().snapshot;
    const command = client.dispatch({ type: "roll" });
    expect(command).toMatchObject({ requestId: "id-1", actionId: "id-2", expectedStateVersion: 7, status: "submitting" });
    expect(socket.sent.at(-1)).toEqual({ type: "roll", requestId: "id-1", actionId: "id-2", expectedStateVersion: 7 });
    expect(client.getState().snapshot).toBe(before);
    expect(client.dispatch({ type: "roll" })).toBeNull();
  });

  it("never commits on an unrelated snapshot or mismatched receipt; needs both matching receipt and sufficiently new snapshot", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    const command = client.dispatch({ type: "roll" })!;
    socket.receive(snapshot(2));
    expect(lastCommand(client).status).toBe("submitting");
    socket.receive({ ...accepted(command, 3), actionId: "unrelated" });
    expect(lastCommand(client).status).toBe("submitting");
    socket.receive(accepted(command, 3));
    expect(lastCommand(client).status).toBe("accepted");
    socket.receive(snapshot(3));
    expect(lastCommand(client).status).toBe("committed");
  });

  it("handles a snapshot arriving before its matching acceptance", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    const command = client.dispatch({ type: "roll" })!;
    socket.receive(snapshot(2)); socket.receive(accepted(command, 2));
    expect(lastCommand(client).status).toBe("committed");
  });

  it("reports matched rejection and does not turn later snapshots into success", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    const command = client.dispatch({ type: "roll" })!;
    socket.receive({ type: "action_rejected", requestId: command.requestId, actionId: command.actionId, code: "STALE_STATE", message: "Use current state.", currentStateVersion: 2 });
    socket.receive(snapshot(2));
    expect(lastCommand(client)).toMatchObject({ status: "rejected", code: "STALE_STATE" });
  });

  it("bounds accepted-without-snapshot and missing-receipt waits as uncertain", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    const command = client.dispatch({ type: "roll" })!;
    socket.receive(accepted(command, 2));
    vi.advanceTimersByTime(100);
    expect(lastCommand(client).status).toBe("uncertain");
    expect(client.dispatch({ type: "roll" })).toBeNull();
    client.dismissCommand(command.requestId);
    expect(client.dispatch({ type: "roll" })).not.toBeNull();
  });

  it("does not auto replay after disconnect or claim success without the receipt", () => {
    const { client, socket, sockets } = harness(); socket.open(); socket.receive(snapshot());
    client.dispatch({ type: "roll" }); socket.drop();
    expect(lastCommand(client).status).toBe("uncertain");
    vi.advanceTimersByTime(50);
    const next = sockets[1]!; next.open();
    expect(next.sent).toEqual([{ type: "resume", sessionToken: session.token, lastSeenStateVersion: 1 }]);
    next.receive(snapshot(5));
    expect(lastCommand(client).status).toBe("uncertain");
    expect(next.sent).toHaveLength(1);
    expect(client.getState().status).toBe("synchronized");
  });

  it("keeps projector and admin sockets read-only", () => {
    const { client, socket } = harness({ session: { role: "projector", token: session.token, roomId: "room-a", expiresAt: session.expiresAt } });
    socket.open(); socket.receive({ type: "state_snapshot", audience: "projector", roomId: "room-a", stateVersion: 1, projection: publicState(1) });
    expect(client.dispatch({ type: "roll" })).toBeNull();
    expect(socket.sent).toHaveLength(1);
  });
});

describe("RoomClient connection lifecycle", () => {
  it.each([[4009, "replaced"], [4401, "expired"], [4403, "denied"], [4404, "unavailable"]])("treats %i as terminal %s and clears every timer", (code, status) => {
    const { client, socket, sockets } = harness(); socket.open(); socket.receive(snapshot());
    client.dispatch({ type: "roll" }); socket.drop(code as number);
    expect(client.getState().status).toBe(status);
    vi.advanceTimersByTime(50_000);
    expect(sockets).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(lastCommand(client).status).toBe("uncertain");
  });

  it("requires a fresh snapshot after reconnect and ignores callbacks from old sockets", () => {
    const { client, socket, sockets } = harness(); socket.open(); socket.receive(snapshot(3));
    const oldCallback = socket.onmessage!;
    socket.drop(); vi.advanceTimersByTime(50);
    sockets[1]!.open();
    oldCallback({ data: JSON.stringify(snapshot(99)) } as MessageEvent);
    expect(client.getState().status).toBe("authenticating");
    expect(client.getState().stateVersion).toBe(3);
    expect(client.dispatch({ type: "roll" })).toBeNull();
    sockets[1]!.receive(snapshot(3));
    expect(client.getState().status).toBe("synchronized");
  });

  it("detects a hung handshake and retries with capped exponential backoff", () => {
    const { client, sockets } = harness();
    vi.advanceTimersByTime(200);
    expect(client.getState().status).toBe("reconnecting");
    vi.advanceTimersByTime(49); expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1); expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(299); expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1); expect(sockets).toHaveLength(3);
    vi.advanceTimersByTime(400); expect(sockets).toHaveLength(4);
  });

  it("detects silent sockets using a matching pong timeout", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    vi.advanceTimersByTime(1000);
    expect(socket.sent.at(-1)).toEqual({ type: "ping", clientTime: 2000 });
    socket.receive({ type: "pong", clientTime: 42, serverTime: 2000 });
    vi.advanceTimersByTime(500);
    expect(client.getState().status).toBe("reconnecting");
    expect(socket.readyState).toBe(3);
  });

  it("accepts a matching pong and cleans all timers on close", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    vi.advanceTimersByTime(1000);
    socket.receive({ type: "pong", clientTime: 2000, serverTime: 2001 });
    vi.advanceTimersByTime(500);
    expect(client.getState().status).toBe("synchronized");
    client.close();
    expect(vi.getTimerCount()).toBe(0);
    expect(client.getState().status).toBe("closed");
  });

  it("expires locally before opening or while connected", () => {
    const { client, socket } = harness({ session: { ...session, expiresAt: 1200 } });
    socket.open(); socket.receive(snapshot()); vi.advanceTimersByTime(200);
    expect(client.getState().status).toBe("expired");
    expect(vi.getTimerCount()).toBe(0);
    const expired = harness({ session: { ...session, expiresAt: 1100 } });
    expect(expired.sockets).toHaveLength(0);
    expect(expired.client.getState().status).toBe("expired");
  });

  it("handles room quarantine as terminal and never displays another room's notice", () => {
    const { client, socket } = harness(); socket.open(); socket.receive(snapshot());
    socket.receive({ type: "room_unavailable", roomId: "room-a", code: "ROOM_QUARANTINED", message: "Room is paused for recovery." });
    expect(client.getState()).toMatchObject({ status: "unavailable", error: { code: "ROOM_QUARANTINED" } });
    expect(vi.getTimerCount()).toBe(0);
  });
});
