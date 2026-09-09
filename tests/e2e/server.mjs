import { randomInt } from 'node:crypto';
import { buildServer, RoomManager, SessionStore, ConnectionHub, InMemoryGamePersistence } from '../../apps/server/dist/index.js';

if (process.env.NODE_ENV !== 'test') throw new Error('This in-memory harness is test-only. Set NODE_ENV=test.');
const sessions = new SessionStore();
const audits = [];
const port = Number(process.env.E2E_SERVER_PORT ?? 3100);
const allowedOrigins = [
  process.env.E2E_PLAYER_ORIGIN ?? 'http://localhost:5173',
  process.env.E2E_PROJECTOR_ORIGIN ?? 'http://localhost:5174',
  process.env.E2E_ADMIN_ORIGIN ?? 'http://localhost:5175',
];
const app = buildServer({
  now: Date.now, sessions,
  roomManager: new RoomManager({ now: Date.now, randomFactory: () => ({ nextInt: max => randomInt(max) }), persistenceFactory: () => new InMemoryGamePersistence() }),
  connections: new ConnectionHub(session => sessions.isActive(session.sessionId, Date.now())),
  adminAccessKey: 'test-operator-credential-not-production', projectorAccessKey: 'test-projector-credential-not-production',
  sessionTtlMilliseconds: 3_600_000, adminRealtimeTtlMilliseconds: 1_800_000,
  allowedOrigins,
  authAttemptLimit: 100, authAttemptWindowMilliseconds: 60_000,
  auditInspection: async audit => { audits.push(audit); },
  readinessCheck: async () => true, logger: false
});
await app.listen({ host: '127.0.0.1', port });
console.log(`Test-only ECONOVA browser harness listening on 127.0.0.1:${port} (in-memory persistence and audit).`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void app.close().then(() => process.exit(0)));
