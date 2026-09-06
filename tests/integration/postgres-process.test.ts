import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { Pool } from "pg";
import WebSocket from "ws";
import { expect, it } from "vitest";
import { adminLoginResponseSchema, joinRoomResponseSchema, projectorSessionResponseSchema, serverMessageSchema, type ServerMessage } from "@econova/contracts";
import { assertGameInvariants, type GameState } from "@econova/game-engine";

// Opt-in only: never fall back to the application's DATABASE_URL or .env credentials.
// Build packages/server first. Requires a dedicated database whose name ends in _test.
const databaseUrl = process.env["TEST_DATABASE_URL"];
const delay = (ms: number) => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
const operatorKey = "postgres-process-test-operator-key-not-production";
const projectorKey = "postgres-process-test-projector-key-not-production";
const origin = "http://localhost:5173";

it.skipIf(!databaseUrl)("migrates and recovers real PostgreSQL state, sessions, receipts and audited inspection across process crashes", async () => {
  const database = new URL(databaseUrl!);
  if (!decodeURIComponent(database.pathname).endsWith("_test")) throw Error("Use a dedicated database ending in _test.");
  if (!existsSync(resolve("apps/server/dist/main.js"))) throw Error("Build packages and server before the PostgreSQL process test.");
  const schema = `econova_test_${randomUUID().replaceAll("-", "")}`;
  const bootstrap = new Pool({ connectionString: database.href, connectionTimeoutMillis: 3000 });
  await bootstrap.query(`CREATE SCHEMA "${schema}"`);
  database.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new Pool({ connectionString: database.href, connectionTimeoutMillis: 3000, max: 3 });
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  if (address === null || typeof address === "string") throw Error("No test port.");
  const port = address.port;
  await new Promise<void>((done, reject) => reservation.close(error => error ? reject(error) : done()));
  const base = `http://127.0.0.1:${port}`;
  let processUnderTest: ChildProcess | undefined;
  const sockets: WebSocket[] = [];
  const stop = async () => {
    for (const socket of sockets) socket.terminate();
    sockets.length = 0;
    if (processUnderTest && processUnderTest.exitCode === null && processUnderTest.signalCode === null) {
      const exited = once(processUnderTest, "exit");
      processUnderTest.kill("SIGKILL"); // Deliberately exercise ungraceful process loss.
      await exited;
    }
    processUnderTest = undefined;
  };
  const boot = async () => {
    processUnderTest = spawn(process.execPath, [resolve("apps/server/dist/main.js")], {
      cwd: process.cwd(), windowsHide: true, stdio: "ignore",
      env: { ...process.env, NODE_ENV: "test", DATABASE_URL: database.href, HOST: "127.0.0.1", PORT: String(port), SESSION_SECRET: "process-test-session-secret-not-production", ADMIN_BOOTSTRAP_TOKEN: operatorKey, PROJECTOR_ACCESS_KEY: projectorKey, ALLOWED_ORIGINS: origin, AUTH_ATTEMPT_LIMIT: "100", LOG_LEVEL: "silent" }
    });
    for (let retry = 0; retry < 150; retry++) {
      if (processUnderTest.exitCode !== null) throw Error("Production process exited during startup; credentials are intentionally not logged.");
      try { if ((await fetch(`${base}/health/ready`, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* Wait for migration and readiness. */ }
      await delay(100);
    }
    throw Error("Production process did not become ready.");
  };
  const post = async (path: string, body: unknown, token?: string) => {
    const response = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    return { status: response.status, headers: response.headers, body: await response.json() as unknown };
  };
  const connect = async (token: string) => {
    const socket = new WebSocket(base.replace("http", "ws") + "/ws", { origin });
    sockets.push(socket);
    const messages: ServerMessage[] = [];
    socket.on("message", raw => messages.push(serverMessageSchema.parse(JSON.parse(raw.toString()))));
    socket.on("error", () => undefined);
    await once(socket, "open");
    socket.send(JSON.stringify({ type: "resume", sessionToken: token }));
    const wait = async (predicate: (message: ServerMessage) => boolean) => {
      for (let retry = 0; retry < 250; retry++) {
        const found = messages.find(predicate);
        if (found) return found;
        await delay(20);
      }
      throw Error("Expected authorized WebSocket response was not received.");
    };
    await wait(message => message.type === "state_snapshot" || message.type === "lobby_snapshot");
    return { socket, messages, wait };
  };
  const state = async (roomId: string) => {
    const row = (await pool.query<{ state: GameState; state_version: string }>("SELECT state,state_version FROM games WHERE room_id=$1", [roomId])).rows[0];
    if (!row) throw Error("Persisted game missing.");
    assertGameInvariants(row.state);
    expect(String(row.state.version)).toBe(row.state_version);
    return row.state;
  };
  const command = async (roomId: string, payload: object) => ({ ...payload, requestId: randomUUID(), actionId: randomUUID(), expectedStateVersion: (await state(roomId)).version });
  try {
    await boot();
    const admin = adminLoginResponseSchema.parse((await post("/api/admin/login", { accessKey: operatorKey })).body);
    const players = new Map<string, ReturnType<typeof joinRoomResponseSchema.parse>>();
    for (const roomId of ["PGTEST", "PGTESB"]) {
      expect((await post("/api/admin/rooms", { roomId, code: roomId }, admin.token)).status).toBe(201);
      for (let seat = 0; seat < 6; seat++) {
        const joined = joinRoomResponseSchema.parse((await post(`/api/rooms/${roomId}/join`, { name: `${roomId}-${seat}` })).body);
        players.set(joined.playerId, joined);
      }
    }
    await stop();
    await boot(); // Durable lobby roster and hashed sessions, before any game exists.
    const peers = new Map<string, Awaited<ReturnType<typeof connect>>>();
    for (const [id, joined] of players) {
      const peer = await connect(joined.token);
      expect(peer.messages.some(message => message.type === "lobby_snapshot")).toBe(true);
      peers.set(id, peer);
    }
    let replay: { roomId: string; playerId: string; payload: object; receipt: ServerMessage } | undefined;
    for (const roomId of ["PGTEST", "PGTESB"]) {
      expect((await post(`/api/admin/rooms/${roomId}/initialize`, {}, admin.token)).status).toBe(200);
      let current = await state(roomId);
      while (current.objectiveSelection) {
        const selection = current.objectiveSelection;
        const payload = await command(roomId, { type: "choose_objective", objectiveId: selection.offeredObjectiveIds[0] });
        const peer = peers.get(selection.playerId)!;
        peer.socket.send(JSON.stringify(payload));
        const receipt = await peer.wait(message => message.type === "action_accepted" && message.requestId === payload.requestId);
        replay ??= { roomId, playerId: selection.playerId, payload, receipt };
        current = await state(roomId);
      }
      expect((await post(`/api/admin/rooms/${roomId}/command`, await command(roomId, { type: "admin_start_game" }), admin.token)).status).toBe(200);
      expect((await post(`/api/admin/rooms/${roomId}/command`, await command(roomId, { type: "admin_pause_game", reason: "Process recovery regression" }), admin.token)).status).toBe(200);
    }
    const scoped = projectorSessionResponseSchema.parse((await post("/api/admin/rooms/PGTEST/realtime-session", {}, admin.token)).body);
    const inspected = await post("/api/admin/rooms/PGTEST/private-inspection", { accessKey: operatorKey, requestId: randomUUID(), reason: "Recovery test" }, scoped.token);
    expect(inspected.status).toBe(200);
    expect(inspected.headers.get("cache-control")).toContain("no-store");
    expect((await pool.query("SELECT 1 FROM admin_audit WHERE room_id='PGTEST' AND action_type='private_inspection'")).rowCount).toBe(1);
    const savedA = await state("PGTEST");
    const savedB = await state("PGTESB");
    await stop();
    await boot();
    peers.clear();
    for (const [id, joined] of players) {
      const peer = await connect(joined.token);
      const snapshot = await peer.wait(message => message.type === "state_snapshot");
      if (snapshot.type !== "state_snapshot" || snapshot.audience !== "player") throw Error("Wrong recovered audience.");
      expect(snapshot.projection.self.playerId).toBe(id);
      expect(snapshot.roomId).toBe(joined.roomId);
      expect(JSON.stringify(snapshot.projection.public)).not.toMatch(/"cards"|"objectiveId"|"bids"|"allocations"/);
      peers.set(id, peer);
    }
    for (const saved of [savedA, savedB]) {
      const recovered = await state(saved.roomId);
      expect(recovered.phase).toBe("paused");
      expect(recovered.pauseStartedAt).toBe(saved.pauseStartedAt);
      expect(recovered.properties).toEqual(saved.properties);
      for (const id of saved.turnOrder) {
        expect(recovered.players[id]!.credits).toBe(saved.players[id]!.credits);
        expect(recovered.players[id]!.cards).toEqual(saved.players[id]!.cards);
        expect(recovered.players[id]!.secretObjectiveId).toBe(saved.players[id]!.secretObjectiveId);
      }
    }
    const beforeReplay = await state(replay!.roomId);
    const replayPeer = peers.get(replay!.playerId)!;
    replayPeer.socket.send(JSON.stringify(replay!.payload));
    expect(await replayPeer.wait(message => message.type === "action_accepted")).toEqual(replay!.receipt);
    expect(await state(replay!.roomId)).toEqual(beforeReplay);
    const routineAdmin = await connect(scoped.token);
    expect(JSON.stringify(routineAdmin.messages)).not.toMatch(/"cards"|"objectiveId"|"bids"|"allocations"/);
    expect((await post("/api/admin/rooms/PGTESB/private-inspection", { accessKey: operatorKey, requestId: randomUUID(), reason: "Wrong room regression" }, scoped.token)).status).toBe(403);
    // Fault injection is confined to this test's unique schema and one room.
    await pool.query(`CREATE FUNCTION reject_test_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.room_id='PGTEST' AND NEW.state_version<>OLD.state_version THEN RAISE EXCEPTION 'test persistence failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_test_transition BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION reject_test_transition()`);
    const beforeFailure = await state("PGTEST");
    const failed = await post("/api/admin/rooms/PGTEST/command", await command("PGTEST", { type: "admin_resume_game" }), admin.token);
    expect(failed.status).not.toBe(200);
    expect(await state("PGTEST")).toEqual(beforeFailure);
    expect((await pool.query("SELECT status FROM games WHERE room_id='PGTEST'")).rows[0].status).toBe("quarantined");
    expect((await post("/api/admin/rooms/PGTESB/command", await command("PGTESB", { type: "admin_resume_game" }), admin.token)).status).toBe(200);
    await stop();
    await boot();
    expect((await pool.query("SELECT status FROM games WHERE room_id='PGTEST'")).rows[0].status).toBe("quarantined");
    expect((await pool.query("SELECT version FROM schema_migrations ORDER BY version")).rows).toHaveLength(4);
    expect((await pool.query("SELECT player_id FROM players")).rowCount).toBe(12);
  } finally {
    await stop();
    await pool.end();
    // Only this process-generated schema is removed. Never drop/truncate the database.
    if (!/^econova_test_[a-f0-9]{32}$/.test(schema)) throw Error("Invalid cleanup target.");
    await bootstrap.query(`DROP SCHEMA "${schema}" CASCADE`);
    await bootstrap.end();
  }
}, 90_000);
