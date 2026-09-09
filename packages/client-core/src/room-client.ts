import { clientCommandSchema, serverMessageSchema, type ClientCommand, type ServerMessage } from "@econova/contracts";
import { normalizeApiBase } from "./api.js";
import { clearStoredSession, roomSessionSchema, saveStoredSession, secureId, type RoomSession, type RoomSessionInput, type SessionStorage } from "./session.js";

type WithoutEnvelope<T> = T extends unknown ? Omit<T, "requestId" | "actionId" | "expectedStateVersion"> : never;
export type CommandInput = WithoutEnvelope<ClientCommand>;
export type RoomSnapshot = Extract<ServerMessage, { type: "state_snapshot" | "lobby_snapshot" }>;
export type ConnectionStatus = "idle" | "connecting" | "authenticating" | "synchronized" | "reconnecting" | "offline" | "expired" | "denied" | "unavailable" | "replaced" | "fatal" | "closed";
export type CommandStatus = "submitting" | "accepted" | "committed" | "rejected" | "uncertain";
export interface CommandRecord {
  readonly requestId: string;
  readonly actionId: string;
  readonly expectedStateVersion: number;
  readonly command: ClientCommand;
  readonly status: CommandStatus;
  readonly receiptVersion: number | null;
  readonly code: string | null;
  readonly message: string | null;
}
export interface ClientError { readonly code: string; readonly message: string }
export interface RoomClientState {
  readonly status: ConnectionStatus;
  readonly snapshot: RoomSnapshot | null;
  readonly stateVersion: number | null;
  readonly commands: Readonly<Record<string, CommandRecord>>;
  readonly error: ClientError | null;
}

/** Structural browser WebSocket interface, injectable only at the network boundary. */
export interface RoomSocket {
  readonly readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}
export interface RoomClientOptions {
  readonly apiBaseUrl?: string;
  readonly session: RoomSessionInput;
  readonly lastSeenStateVersion?: number | null;
  readonly socketFactory?: (url: string) => RoomSocket;
  readonly makeId?: () => string;
  readonly now?: () => number;
  readonly storage?: SessionStorage;
  readonly persistSession?: boolean;
  readonly commandTimeoutMs?: number;
  readonly handshakeTimeoutMs?: number;
  readonly heartbeatIntervalMs?: number;
  readonly heartbeatTimeoutMs?: number;
  readonly retryBaseMs?: number;
  readonly retryMaxMs?: number;
}
type Timer = ReturnType<typeof setTimeout>;
const unresolved = (record: CommandRecord) => record.status === "submitting" || record.status === "accepted" || record.status === "uncertain";
const terminal = new Set<ConnectionStatus>(["expired", "denied", "unavailable", "replaced", "fatal", "closed"]);
const closeStatus: Readonly<Record<number, ConnectionStatus>> = { 4009: "replaced", 4401: "expired", 4403: "denied", 4404: "unavailable" };

/** Single-room external store. Only validated server snapshots change displayed game state. */
export class RoomClient {
  private readonly session: RoomSession;
  private readonly baseUrl: string;
  private readonly socketUrl: string;
  private readonly factory: (url: string) => RoomSocket;
  private readonly now: () => number;
  private readonly makeId: () => string;
  private readonly options: RoomClientOptions;
  private readonly commandTimeout: number;
  private readonly handshakeTimeout: number;
  private readonly heartbeatInterval: number;
  private readonly heartbeatTimeout: number;
  private readonly retryBase: number;
  private readonly retryMax: number;
  private state: RoomClientState;
  private socket: RoomSocket | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly commandTimers = new Map<string, Timer>();
  private retryTimer: Timer | null = null;
  private handshakeTimer: Timer | null = null;
  private heartbeatTimer: Timer | null = null;
  private pongTimer: Timer | null = null;
  private expiryTimer: Timer | null = null;
  private awaitingPong: number | null = null;
  private attempts = 0;
  private active = false;
  private online = true;
  private observingNetwork = false;

  constructor(options: RoomClientOptions) {
    this.options = options;
    this.session = roomSessionSchema.parse(options.session);
    this.baseUrl = normalizeApiBase(options.apiBaseUrl);
    this.socketUrl = `${this.baseUrl.replace(/^http/, "ws")}/ws`;
    this.factory = options.socketFactory ?? ((url) => new WebSocket(url));
    this.now = options.now ?? Date.now;
    this.makeId = options.makeId ?? secureId;
    this.commandTimeout = options.commandTimeoutMs ?? 10_000;
    this.handshakeTimeout = options.handshakeTimeoutMs ?? 10_000;
    this.heartbeatInterval = options.heartbeatIntervalMs ?? 20_000;
    this.heartbeatTimeout = options.heartbeatTimeoutMs ?? 10_000;
    this.retryBase = options.retryBaseMs ?? 500;
    this.retryMax = options.retryMaxMs ?? 10_000;
    for (const value of [this.commandTimeout, this.handshakeTimeout, this.heartbeatInterval, this.heartbeatTimeout, this.retryBase, this.retryMax]) {
      if (!Number.isFinite(value) || value <= 0 || value > 2_147_483_647) throw new Error("Invalid connection timeout");
    }
    const version = options.lastSeenStateVersion ?? null;
    if (version !== null && (!Number.isSafeInteger(version) || version < 0)) throw new Error("Invalid saved state version");
    this.state = { status: "idle", snapshot: null, stateVersion: version, commands: {}, error: null };
  }

  getState = (): RoomClientState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<RoomClientState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  open(): void {
    if (this.active || terminal.has(this.state.status)) return;
    this.active = true;
    if (typeof window !== "undefined") {
      this.online = window.navigator.onLine;
      window.addEventListener("online", this.onOnline);
      window.addEventListener("offline", this.onOffline);
      this.observingNetwork = true;
    }
    this.watchExpiry();
    if (this.active) this.connect();
  }

  /** Explicit manual retry for a transient outage only; terminal identities need new authentication. */
  reconnect(): void {
    if (!this.active || terminal.has(this.state.status)) return;
    this.uncertainCommands();
    this.disposeSocket();
    this.clearRetry();
    this.connect();
  }

  private readonly onOnline = () => this.setOnline(true);
  private readonly onOffline = () => this.setOnline(false);

  /** Also usable by an embedding environment that provides its own network events. */
  setOnline(online: boolean): void {
    this.online = online;
    if (!this.active || terminal.has(this.state.status)) return;
    if (!online) {
      this.uncertainCommands();
      this.clearRetry();
      this.disposeSocket();
      this.update({ status: "offline" });
    } else if (this.state.status === "offline") this.connect();
  }

  private connect(): void {
    if (!this.active || this.socket !== null) return;
    if (this.session.expiresAt <= this.now()) { this.finish("expired", "SESSION_EXPIRED", "Your session expired. Sign in again."); return; }
    if (!this.online) { this.update({ status: "offline" }); return; }
    this.update({ status: this.attempts ? "reconnecting" : "connecting", error: null });
    let socket: RoomSocket;
    try { socket = this.factory(this.socketUrl); } catch { this.scheduleRetry(); return; }
    this.socket = socket;
    const current = () => this.active && this.socket === socket;
    this.handshakeTimer = setTimeout(() => { if (current()) this.lostConnection(); }, this.handshakeTimeout);
    socket.onopen = () => {
      if (!current()) return;
      this.update({ status: "authenticating" });
      try {
        socket.send(JSON.stringify({ type: "resume", sessionToken: this.session.token, ...(this.state.stateVersion === null ? {} : { lastSeenStateVersion: this.state.stateVersion }) }));
      } catch { this.lostConnection(); }
    };
    socket.onmessage = (event) => { if (current()) this.receive(event.data); };
    socket.onclose = (event) => {
      if (!current()) return;
      const status = closeStatus[event.code];
      if (status) {
        this.finish(status, `SOCKET_${event.code}`, status === "replaced" ? "This session is active in another connection." : status === "unavailable" ? "This room is no longer available." : "Your session is no longer valid. Sign in again.");
      } else this.lostConnection();
    };
    socket.onerror = () => { if (current()) this.lostConnection(); };
  }

  private receive(raw: unknown): void {
    // Production browser WebSockets receive textual JSON. Binary/oversized data is never rendered.
    if (typeof raw !== "string" || raw.length > 512 * 1024) { this.protocolFailure(); return; }
    let decoded: unknown;
    try { decoded = JSON.parse(raw); } catch { this.protocolFailure(); return; }
    const parsed = serverMessageSchema.safeParse(decoded);
    if (!parsed.success) { this.protocolFailure(); return; }
    const message = parsed.data;
    switch (message.type) {
      case "state_snapshot": {
        const publicState = message.audience === "projector" ? message.projection : message.projection.public;
        if (message.audience !== this.session.role || message.roomId !== this.session.roomId || publicState.roomId !== this.session.roomId || publicState.stateVersion !== message.stateVersion ||
            (message.audience === "player" && (this.session.role !== "player" || message.projection.self.playerId !== this.session.playerId || message.projection.self.capabilities.expectedStateVersion !== message.stateVersion))) {
          this.protocolFailure(); return;
        }
        if (this.state.stateVersion !== null && message.stateVersion < this.state.stateVersion) return;
        this.synchronize(message, message.stateVersion);
        return;
      }
      case "lobby_snapshot": {
        const playerId = this.session.role === "player" ? this.session.playerId : null;
        if (message.audience !== this.session.role || message.roomId !== this.session.roomId || message.projection.roomId !== this.session.roomId ||
            (playerId !== null && !message.projection.players.some((player) => player.playerId === playerId))) {
          this.protocolFailure(); return;
        }
        if (this.state.stateVersion !== null || this.state.snapshot?.type === "state_snapshot") return;
        if (this.state.snapshot?.type === "lobby_snapshot" && message.projection.revision < this.state.snapshot.projection.revision) return;
        this.synchronize(message, null);
        return;
      }
      case "room_unavailable":
        if (message.roomId !== this.session.roomId) { this.protocolFailure(); return; }
        this.finish("unavailable", message.code, message.message);
        return;
      case "action_accepted": {
        const record = this.state.commands[message.requestId];
        if (!record || record.actionId !== message.actionId || !unresolved(record)) return;
        const committed = this.state.status === "synchronized" && this.state.stateVersion !== null && this.state.stateVersion >= message.stateVersion;
        this.replaceCommand({ ...record, receiptVersion: message.stateVersion, status: committed ? "committed" : record.status === "uncertain" ? "uncertain" : "accepted", code: null, message: null });
        return;
      }
      case "action_rejected": {
        if (message.code === "AUTHENTICATION_REQUIRED" || message.code === "AUTHORIZATION_DENIED") {
          this.finish(message.code === "AUTHENTICATION_REQUIRED" ? "expired" : "denied", message.code, message.message); return;
        }
        if (!message.requestId || !message.actionId) return;
        const record = this.state.commands[message.requestId];
        if (!record || record.actionId !== message.actionId || !unresolved(record)) return;
        this.replaceCommand({ ...record, status: "rejected", code: message.code, message: message.message });
        return;
      }
      case "pong":
        if (this.awaitingPong === message.clientTime) {
          if (this.pongTimer !== null) clearTimeout(this.pongTimer);
          this.pongTimer = null;
          this.awaitingPong = null;
          this.scheduleHeartbeat();
        }
    }
  }

  private synchronize(snapshot: RoomSnapshot, version: number | null): void {
    if (this.handshakeTimer !== null) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = null;
    this.attempts = 0;
    const commands = { ...this.state.commands };
    for (const record of Object.values(commands)) {
      if (unresolved(record) && record.receiptVersion !== null && version !== null && version >= record.receiptVersion) {
        commands[record.requestId] = { ...record, status: "committed", code: null, message: null };
        this.clearCommandTimer(record.requestId);
      }
    }
    this.update({ snapshot, stateVersion: version, status: "synchronized", commands, error: null });
    if (this.options.persistSession !== false) saveStoredSession(this.baseUrl, this.session, version, this.options.storage);
    if (this.heartbeatTimer === null && this.pongTimer === null) this.scheduleHeartbeat();
  }

  dispatch(input: CommandInput): CommandRecord | null {
    const snapshot = this.state.snapshot;
    if (this.state.status !== "synchronized" || this.session.role !== "player" || this.socket?.readyState !== 1 || snapshot?.type !== "state_snapshot" || snapshot.audience !== "player" || Object.values(this.state.commands).some(unresolved)) return null;
    if (!snapshot.projection.self.capabilities.commandTypes.includes(input.type)) return null;
    let command: ClientCommand;
    try {
      command = clientCommandSchema.parse({ ...input, requestId: this.makeId(), actionId: this.makeId(), expectedStateVersion: snapshot.stateVersion });
    } catch {
      this.update({ error: { code: "INVALID_COMMAND", message: "The action could not be prepared safely." } });
      return null;
    }
    const record: CommandRecord = { requestId: command.requestId, actionId: command.actionId, expectedStateVersion: command.expectedStateVersion, command, status: "submitting", receiptVersion: null, code: null, message: null };
    // Bound retained UI history; unsettled commands are never silently forgotten.
    const history = Object.values(this.state.commands).slice(-49);
    this.update({ commands: { ...Object.fromEntries(history.map((item) => [item.requestId, item])), [record.requestId]: record }, error: null });
    this.commandTimers.set(record.requestId, setTimeout(() => {
      const current = this.state.commands[record.requestId];
      if (current && unresolved(current)) {
        this.replaceCommand({ ...current, status: "uncertain", code: "OUTCOME_UNCERTAIN", message: "No confirmed result. Review current state before taking another action." });
        // A healthy-looking socket can still have lost the command receipt or
        // snapshot. Refresh authorization/state without replaying the intent.
        this.reconnect();
      }
    }, this.commandTimeout));
    try { this.socket.send(JSON.stringify(command)); } catch { this.lostConnection(); }
    return this.state.commands[record.requestId] ?? null;
  }

  /** UI must ask the player to review current authoritative state before dismissing uncertainty. */
  dismissCommand(requestId: string): void {
    const record = this.state.commands[requestId];
    if (!record || record.status === "submitting" || record.status === "accepted" || (record.status === "uncertain" && this.state.status !== "synchronized")) return;
    const commands = { ...this.state.commands };
    delete commands[requestId];
    this.clearCommandTimer(requestId);
    this.update({ commands });
  }

  private replaceCommand(record: CommandRecord): void {
    if (record.status !== "submitting" && record.status !== "accepted") this.clearCommandTimer(record.requestId);
    this.update({ commands: { ...this.state.commands, [record.requestId]: record } });
  }
  private clearCommandTimer(requestId: string): void {
    const timer = this.commandTimers.get(requestId);
    if (timer !== undefined) clearTimeout(timer);
    this.commandTimers.delete(requestId);
  }
  private uncertainCommands(): void {
    const commands = { ...this.state.commands };
    let changed = false;
    for (const record of Object.values(commands)) {
      this.clearCommandTimer(record.requestId);
      if (record.status === "submitting" || record.status === "accepted") {
        commands[record.requestId] = { ...record, status: "uncertain", code: "OUTCOME_UNCERTAIN", message: "The connection was interrupted. Review current state before taking another action." };
        changed = true;
      }
    }
    if (changed) this.update({ commands });
  }

  private scheduleHeartbeat(): void {
    if (this.heartbeatTimer !== null) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      this.heartbeatTimer = null;
      if (!this.active || this.socket?.readyState !== 1) { this.lostConnection(); return; }
      this.awaitingPong = Math.max(0, Math.floor(this.now()));
      this.pongTimer = setTimeout(() => this.lostConnection(), this.heartbeatTimeout);
      try { this.socket.send(JSON.stringify({ type: "ping", clientTime: this.awaitingPong })); } catch { this.lostConnection(); }
    }, this.heartbeatInterval);
  }
  private lostConnection(): void {
    if (!this.active) return;
    this.uncertainCommands();
    this.disposeSocket();
    this.scheduleRetry();
  }
  private scheduleRetry(): void {
    if (!this.active || this.retryTimer !== null) return;
    if (!this.online) { this.update({ status: "offline" }); return; }
    const delay = Math.min(this.retryMax, this.retryBase * 2 ** Math.min(this.attempts, 20));
    this.attempts += 1;
    this.update({ status: "reconnecting" });
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect(); }, delay);
  }
  private clearRetry(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
  private disposeSocket(): void {
    for (const timer of [this.handshakeTimer, this.heartbeatTimer, this.pongTimer]) if (timer !== null) clearTimeout(timer);
    this.handshakeTimer = this.heartbeatTimer = this.pongTimer = null;
    this.awaitingPong = null;
    const socket = this.socket;
    this.socket = null;
    if (socket !== null) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      try { socket.close(1000, "Client disconnected"); } catch { /* Already closed. */ }
    }
  }
  private watchExpiry(): void {
    const remaining = this.session.expiresAt - this.now();
    if (remaining <= 0) { this.finish("expired", "SESSION_EXPIRED", "Your session expired. Sign in again."); return; }
    this.expiryTimer = setTimeout(() => { this.expiryTimer = null; this.watchExpiry(); }, Math.min(remaining, 2_147_483_647));
  }
  private protocolFailure(): void {
    this.finish("fatal", "INVALID_MESSAGE", "The server sent an invalid room update. Reconnect after checking the server.");
  }
  private finish(status: ConnectionStatus, code: string, message: string): void {
    this.teardown();
    if (status === "expired" || status === "denied" || status === "replaced" || status === "unavailable") clearStoredSession(this.baseUrl, this.session.role, this.options.storage);
    this.update({ status, error: { code, message } });
  }
  private teardown(): void {
    this.active = false;
    this.uncertainCommands();
    this.clearRetry();
    this.disposeSocket();
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    if (this.observingNetwork) {
      window.removeEventListener("online", this.onOnline);
      window.removeEventListener("offline", this.onOffline);
      this.observingNetwork = false;
    }
  }
  close(): void {
    this.teardown();
    this.update({ status: "closed" });
  }
}
