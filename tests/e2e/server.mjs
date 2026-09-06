import { randomInt } from 'node:crypto';
import { buildServer, RoomManager, SessionStore, ConnectionHub, InMemoryGamePersistence } from '../../apps/server/dist/index.js';

if (process.env.NODE_ENV !== 'test') throw new Error('This in-memory harness is test-only. Set NODE_ENV=test.');
const sessions = new SessionStore();
const audits = [];
const app = buildServer({
  now: Date.now, sessions,
  roomManager: new RoomManager({ now: Date.now, randomFactory: () => ({ nextInt: max => randomInt(max) }), persistenceFactory: () => new InMemoryGamePersistence() }),
  connections: new ConnectionHub(session => sessions.isActive(session.sessionId, Date.now())),
  adminAccessKey: 'test-operator-credential-not-production', projectorAccessKey: 'test-projector-credential-not-production',
  sessionTtlMilliseconds: 3_600_000, adminRealtimeTtlMilliseconds: 1_800_000,
  allowedOrigins: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  authAttemptLimit: 100, authAttemptWindowMilliseconds: 60_000,
  auditInspection: async audit => { audits.push(audit); },
  readinessCheck: async () => true, logger: false
});
await app.listen({ host: '127.0.0.1', port: 3100 });
console.log('Test-only ECONOVA browser harness listening on 127.0.0.1:3100 (in-memory persistence and audit).');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => void app.close().then(() => process.exit(0)));
