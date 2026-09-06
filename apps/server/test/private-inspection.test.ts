import { describe, it, expect } from "vitest";
import { createSeededRandom } from "@econova/game-engine";
import { privateInspectionProjectionSchema, adminProjectionSchema } from "@econova/contracts";
import { buildServer, RoomManager, SessionStore, ConnectionHub, InMemoryGamePersistence } from "../src/index.js";
import { createAdminProjection } from "@econova/game-engine";
import type { InspectionAudit } from "../src/security/private-inspection.js";

const accessKey = "a".repeat(32);
async function fixture() {
  let clock = 1000;
  const now = () => clock;
  const sessions = new SessionStore();
  const manager = new RoomManager({ now, randomFactory: () => createSeededRandom(3), persistenceFactory: () => new InMemoryGamePersistence() });
  const admin = sessions.issue({ role: "admin", roomId: null, playerId: null, expiresAt: 99999 });
  for (const code of ["ROOMA1", "ROOMB1"]) {
    await manager.createRoom(admin.session, { roomId: code, code });
    for (let player = 0; player < 4; player++) await manager.joinRoom(code, { playerId: `${code}p${player}`, name: `Player ${player}` });
    await manager.initializeRoom(admin.session, code);
  }
  const roomAdmin = sessions.issue({ role: "admin", roomId: "ROOMA1", playerId: null, parentSessionId: admin.session.sessionId, expiresAt: 50000 });
  const audit: InspectionAudit[] = [];
  let failAudit = false;
  let expireDuringAudit = false;
  const app = buildServer({ now, sessions, roomManager: manager, connections: new ConnectionHub(), adminAccessKey: accessKey, projectorAccessKey: "p".repeat(32), sessionTtlMilliseconds: 60000, adminRealtimeTtlMilliseconds: 30000, allowedOrigins: ["http://localhost:5173"], authAttemptLimit: 50, authAttemptWindowMilliseconds: 60000, readinessCheck: async () => true, logger: false,
    auditInspection: async entry => { if (failAudit) throw Error("storage offline"); audit.push(entry); if (expireDuringAudit) clock = 60000; }
  });
  const inspect = (token = roomAdmin.token, roomId = "ROOMA1", key = accessKey) => app.inject({ method: "POST", url: `/api/admin/rooms/${roomId}/private-inspection`, headers: { authorization: `Bearer ${token}` }, payload: { accessKey: key, requestId: "inspection-1", reason: "Investigate event issue" } });
  return { app, inspect, sessions, admin, roomAdmin, manager, audit, expire: () => { clock = 60000; }, failAudit: () => { failAudit = true; }, expireDuringAudit: () => { expireDuringAudit = true; } };
}
describe("separately authorized private inspection", () => {
  it("requires room binding, role, valid session and fresh credential", async () => {
    const ctx = await fixture();
    try {
      expect((await ctx.inspect("x".repeat(64))).statusCode).toBe(403);
      expect((await ctx.inspect(ctx.admin.token)).statusCode).toBe(403);
      expect((await ctx.inspect(ctx.roomAdmin.token, "ROOMB1")).statusCode).toBe(403);
      expect((await ctx.inspect(ctx.roomAdmin.token, "ROOMA1", "wrong")).statusCode).toBe(401);
      const player = ctx.sessions.issue({ role: "player", roomId: "ROOMA1", playerId: "ROOMA1p0", expiresAt: 50000 });
      expect((await ctx.inspect(player.token)).statusCode).toBe(403);
      ctx.expire();
      expect((await ctx.inspect()).statusCode).toBe(403);
      expect(ctx.audit).toHaveLength(0);
    } finally { await ctx.app.close(); }
  });
  it("audits exact room/version before returning a no-store private DTO", async () => {
    const ctx = await fixture();
    try {
      const response = await ctx.inspect();
      expect(response.statusCode).toBe(200);
      const data = privateInspectionProjectionSchema.parse(response.json());
      expect(ctx.audit).toHaveLength(1);
      expect(ctx.audit[0]).toMatchObject({ roomId: "ROOMA1", stateVersion: data.public.stateVersion, adminSessionId: ctx.roomAdmin.session.sessionId });
      expect(response.headers["cache-control"]).toContain("no-store");
      expect(data.players[0]!.cards).toHaveLength(2);
      const routine = createAdminProjection(ctx.manager.getRoom("ROOMA1")!.runtime!.getState());
      expect(adminProjectionSchema.safeParse(routine).success).toBe(true);
      expect(JSON.stringify(routine)).not.toMatch(/"cards"|"objectiveId"|"bids"|"allocations"|"token"/);
      expect(adminProjectionSchema.safeParse(data).success).toBe(false);
    } finally { await ctx.app.close(); }
  });
  it("never returns private data when audit fails or auth expires during audit", async () => {
    for (const mode of ["failure", "expiry"]) {
      const ctx = await fixture();
      try {
        if (mode === "failure") ctx.failAudit(); else ctx.expireDuringAudit();
        const response = await ctx.inspect();
        expect(response.statusCode).toBe(mode === "failure" ? 503 : 403);
        expect(response.body).not.toMatch(/cards|objective|bids|allocations/);
      } finally { await ctx.app.close(); }
    }
  });
});
