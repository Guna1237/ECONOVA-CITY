import { randomInt } from "node:crypto";

import {
  ConnectionHub,
  PostgresGamePersistence,
  RoomManager,
  SessionStore,
  buildServer,
  createPostgresPool,
  loadRecoverableRooms,
  loadRecoverableLobbies,
  persistLobbyRecord,
  persistInspectionAudit,
  revokeSessionRecord,
  loadSessionRecords,
  parseServerConfig,
  persistSessionRecord
} from "./index.js";
import { runMigrations } from "./persistence/migrate.js";

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = existsSync(".env") ? ".env" : existsSync("../../.env") ? "../../.env" : null;
if (envPath) {
  try {
    process.loadEnvFile(resolve(envPath));
  } catch {
    // Ignore if env file cannot be loaded
  }
}

const config = parseServerConfig(process.env);
const now = () => Date.now();

await runMigrations(config.databaseUrl);
const pool = createPostgresPool(config.databaseUrl);
const sessions = new SessionStore();
sessions.hydrate(await loadSessionRecords(pool, now()), now());

const roomManager = new RoomManager({
  now,
  randomFactory: () => ({ nextInt: (maxExclusive) => randomInt(maxExclusive) }),
  persistenceFactory: () => new PostgresGamePersistence(pool),
  persistLobby: (room, session) => persistLobbyRecord(pool, room, session)
});
for (const room of await loadRecoverableRooms(pool, room => roomManager.restoreLobby({ ...room, players: [] }, true))) roomManager.restoreRoom(room);
for (const room of await loadRecoverableLobbies(pool)) roomManager.restoreLobby(room);

const app = buildServer({
  now,
  sessions,
  roomManager,
  connections: new ConnectionHub(session => sessions.isActive(session.sessionId, now())),
  adminAccessKey: config.adminBootstrapToken,
  projectorAccessKey: config.projectorAccessKey,
  sessionTtlMilliseconds: config.sessionTtlMilliseconds,
  adminRealtimeTtlMilliseconds: config.adminRealtimeTtlMilliseconds,
  allowedOrigins: config.allowedOrigins,
  authAttemptLimit: config.authAttemptLimit,
  authAttemptWindowMilliseconds: config.authAttemptWindowMilliseconds,
  persistSession: (record) => persistSessionRecord(pool, record),
  revokeSession: (sessionId) => revokeSessionRecord(pool, sessionId, now()),
  auditInspection: (audit) => persistInspectionAudit(pool, audit),
  joinSessionPersistedByRoomManager: true,
  readinessCheck: async () => {
    try {
      await pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  },
  logger: { level: config.logLevel }
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "Shutting down ECONOVA server");
  await app.close();
  await pool.end();
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error, "Graceful shutdown failed");
        process.exit(1);
      }
    );
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error, "Server startup failed");
  await shutdown("startup-error");
  process.exit(1);
}
