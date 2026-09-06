import type { FastifyInstance } from "fastify";
import { clientCommandSchema, pingMessageSchema, resumeMessageSchema, serverMessageSchema, type ServerMessage } from "@econova/contracts";
import type { BuildServerOptions } from "../app.js";
import type { AuthenticatedSession } from "../auth/types.js";
import type { RoomRealtime } from "./room-realtime.js";

export const registerSocketRoute = (app: FastifyInstance, options: BuildServerOptions, realtime: RoomRealtime): void => {
  app.get("/ws", { websocket: true }, (socket, request) => {
    if (request.headers.origin !== undefined && !options.allowedOrigins.includes(request.headers.origin)) {
      socket.close(4403, "Origin denied"); return;
    }
    let session: AuthenticatedSession | null = null;
    let connectionId: string | null = null;
    let queue = Promise.resolve();
    let queued = 0;
    let closed = false;
    let alive = true;
    let messages = 0;
    let windowAt = options.now();
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const authenticationTimer = setTimeout(() => socket.close(4401, "Authentication required"), 5000);
    authenticationTimer.unref();
    const heartbeat = setInterval(() => {
      if (session !== null && !options.sessions.isActive(session.sessionId, options.now())) { socket.close(4401, "Session expired"); return; }
      if (!alive) { socket.terminate(); return; }
      alive = false;
      if (socket.readyState === 1) socket.ping();
    }, 15000);
    heartbeat.unref();
    socket.on("pong", () => { alive = true; });
    socket.on("error", () => socket.close(1011, "Connection failed"));

    const send = (message: ServerMessage): void => {
      if (socket.readyState !== 1) return;
      if (socket.bufferedAmount > 256 * 1024) { socket.close(1013, "Client too slow"); return; }
      socket.send(JSON.stringify(message));
    };
    const reject = (code: string, message: string): void => send(serverMessageSchema.parse({ type: "action_rejected", code, message }));

    socket.on("message", (raw, binary) => {
      if (closed) return;
      if (options.now() - windowAt >= 1000) { messages = 0; windowAt = options.now(); }
      if (++messages > 60 || queued >= 16) { socket.close(1008, "Message limit exceeded"); return; }
      queued++;
      queue = queue.then(async () => {
        if (closed) return;
        if (binary) { reject("INVALID_COMMAND", "Text messages required."); return; }
        const buffer = Array.isArray(raw) ? Buffer.concat(raw) : Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        if (buffer.byteLength > 64 * 1024) { socket.close(1009, "Message too large"); return; }
        let decoded: unknown;
        try { decoded = JSON.parse(buffer.toString("utf8")); }
        catch { reject("INVALID_COMMAND", "Invalid message."); return; }

        if (session === null) {
          const resume = resumeMessageSchema.safeParse(decoded);
          if (!resume.success) { socket.close(4401, "Authentication required"); return; }
          const resolved = options.sessions.resume(resume.data.sessionToken, options.now());
          if (resolved === null || resolved.roomId === null) { socket.close(4403, "Session denied"); return; }
          let room;
          try { room = options.roomManager.getRoomForSession(resolved); }
          catch { socket.close(4404, "Room unavailable"); return; }
          session = resolved;
          clearTimeout(authenticationTimer);
          connectionId = options.connections.add(resolved, send, (code, reason) => socket.close(code, reason));
          expiryTimer = setTimeout(() => socket.close(4401, "Session expired"), Math.max(1, resolved.expiresAt - options.now()));
          expiryTimer.unref();
          realtime.attach(room);
          if (resolved.role === "player" && resolved.playerId !== null) await realtime.presence(room.roomId, resolved.playerId);
          if (!closed) realtime.broadcast(room, resolved.sessionId);
          app.log.info({ roomId: room.roomId, role: resolved.role }, "Room connection authenticated");
          return;
        }

        if (connectionId === null || !options.connections.isActive(session.sessionId, connectionId) || !options.sessions.isActive(session.sessionId, options.now())) {
          socket.close(4401, "Session ended"); return;
        }
        const ping = pingMessageSchema.safeParse(decoded);
        if (ping.success) { send({ type: "pong", clientTime: ping.data.clientTime, serverTime: options.now() }); return; }
        const command = clientCommandSchema.safeParse(decoded);
        if (!command.success) { reject("INVALID_COMMAND", "Invalid command."); return; }
        if (session.role !== "player") { reject("AUTHORIZATION_DENIED", "This connection is read-only."); return; }
        const room = options.roomManager.getRoomForSession(session);
        if (room.runtime === null) { reject("ROOM_UNAVAILABLE", "Wait for the game to initialize."); return; }
        const activeSession = session;
        const activeConnection = connectionId;
        const receipt = await room.runtime.processCommand(session, command.data, () => options.connections.isActive(activeSession.sessionId, activeConnection) && options.sessions.isActive(activeSession.sessionId, options.now()));
        app.log.info({ roomId: room.roomId, actionId: receipt.actionId, status: receipt.status, stateVersion: receipt.stateVersion }, "Game command processed");
        send(serverMessageSchema.parse(receipt.status === "accepted"
          ? { type: "action_accepted", requestId: receipt.requestId, actionId: receipt.actionId, stateVersion: receipt.stateVersion }
          : { type: "action_rejected", requestId: receipt.requestId, actionId: receipt.actionId, code: receipt.code, message: receipt.message, currentStateVersion: receipt.stateVersion }));
        if (receipt.status === "rejected") realtime.broadcast(room);
      }).catch(() => socket.close(1011, "Connection unavailable")).finally(() => { queued--; });
    });
    socket.on("close", () => {
      closed = true;
      clearTimeout(authenticationTimer); clearTimeout(expiryTimer); clearInterval(heartbeat);
      if (session === null || connectionId === null) return;
      const departed = session;
      // An old socket closing must not remove its replacement or disconnect the player.
      options.connections.remove(departed.sessionId, connectionId);
      if (departed.role === "player" && departed.roomId !== null && departed.playerId !== null) {
        void realtime.presence(departed.roomId, departed.playerId).catch(() => app.log.error({ roomId: departed.roomId }, "Presence transition failed"));
      }
    });
  });
};
