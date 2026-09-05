import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuthenticatedSession } from "./types.js";

interface StoredSession {
  readonly tokenHash: string;
  readonly session: AuthenticatedSession;
  revoked: boolean;
}

const hashToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export class SessionStore {
  private readonly byTokenHash = new Map<string, StoredSession>();
  private readonly tokenHashBySessionId = new Map<string, string>();

  issue(input: Omit<AuthenticatedSession, "sessionId">): {
    readonly token: string;
    readonly session: AuthenticatedSession;
  } {
    const token = randomBytes(32).toString("hex");
    const session: AuthenticatedSession = {
      sessionId: randomUUID(),
      role: input.role,
      roomId: input.roomId,
      playerId: input.playerId,
      expiresAt: input.expiresAt
    };
    const tokenHash = hashToken(token);
    this.byTokenHash.set(tokenHash, { tokenHash, session, revoked: false });
    this.tokenHashBySessionId.set(session.sessionId, tokenHash);
    return { token, session };
  }

  resume(token: string, now: number): AuthenticatedSession | null {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const stored = this.byTokenHash.get(hashToken(token));
    if (stored === undefined || stored.revoked || stored.session.expiresAt <= now) return null;
    return stored.session;
  }

  revoke(sessionId: string): void {
    const tokenHash = this.tokenHashBySessionId.get(sessionId);
    if (tokenHash === undefined) return;
    const stored = this.byTokenHash.get(tokenHash);
    if (stored !== undefined) stored.revoked = true;
  }

  exportRecordsForPersistence(): Array<{
    readonly tokenHash: string;
    readonly sessionId: string;
    readonly role: AuthenticatedSession["role"];
    readonly roomId: string | null;
    readonly playerId: string | null;
    readonly expiresAt: number;
    readonly revoked: boolean;
  }> {
    return [...this.byTokenHash.values()].map(({ tokenHash, session, revoked }) => ({
      tokenHash,
      sessionId: session.sessionId,
      role: session.role,
      roomId: session.roomId,
      playerId: session.playerId,
      expiresAt: session.expiresAt,
      revoked
    }));
  }
}
