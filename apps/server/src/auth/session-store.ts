import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

import type { AuthenticatedSession } from "./types.js";

interface StoredSession {
  readonly tokenHash: string;
  readonly session: AuthenticatedSession;
  revoked: boolean;
}

export interface PersistedSessionRecord {
  readonly tokenHash: string;
  readonly sessionId: string;
  readonly role: AuthenticatedSession["role"];
  readonly roomId: string | null;
  readonly playerId: string | null;
  readonly expiresAt: number;
  readonly revoked: boolean;
  readonly parentSessionId?: string;
}

const hasValidBinding = (record: PersistedSessionRecord): boolean => {
  if (record.role === "player") return record.roomId !== null && record.playerId !== null;
  if (record.role === "projector") return record.roomId !== null && record.playerId === null;
  return record.role === "admin" && record.playerId === null;
};

const persistedSessionSchema = z.object({
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  sessionId: z.string().min(1).max(128),
  role: z.enum(["player", "projector", "admin"]),
  roomId: z.string().min(1).max(128).nullable(),
  playerId: z.string().min(1).max(128).nullable(),
  expiresAt: z.number().int().nonnegative(),
  revoked: z.boolean()
  ,parentSessionId: z.string().min(1).max(128).optional()
}).strict();

const hashToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export class SessionStore {
  private readonly byTokenHash = new Map<string, StoredSession>();
  private readonly tokenHashBySessionId = new Map<string, string>();

  issue(input: Omit<AuthenticatedSession, "sessionId">): {
    readonly token: string;
    readonly session: AuthenticatedSession;
    readonly record: PersistedSessionRecord;
  } {
    if (!hasValidBinding({ ...input, tokenHash: "", sessionId: "", revoked: false }) || !Number.isSafeInteger(input.expiresAt)) throw new Error("Invalid session binding.");
    const token = randomBytes(32).toString("hex");
    const session: AuthenticatedSession = {
      sessionId: randomUUID(),
      role: input.role,
      roomId: input.roomId,
      playerId: input.playerId,
      expiresAt: input.expiresAt
      ,...(input.parentSessionId === undefined ? {} : { parentSessionId: input.parentSessionId })
    };
    const tokenHash = hashToken(token);
    this.byTokenHash.set(tokenHash, { tokenHash, session, revoked: false });
    this.tokenHashBySessionId.set(session.sessionId, tokenHash);
    return {
      token,
      session,
      record: {
        tokenHash,
        sessionId: session.sessionId,
        role: session.role,
        roomId: session.roomId,
        playerId: session.playerId,
        expiresAt: session.expiresAt,
        revoked: false
        ,...(session.parentSessionId === undefined ? {} : { parentSessionId: session.parentSessionId })
      }
    };
  }

  resume(token: string, now: number): AuthenticatedSession | null {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const stored = this.byTokenHash.get(hashToken(token));
    if (stored === undefined || !this.isActive(stored.session.sessionId, now)) return null;
    return stored.session;
  }

  revoke(sessionId: string): void {
    const tokenHash = this.tokenHashBySessionId.get(sessionId);
    if (tokenHash === undefined) return;
    const stored = this.byTokenHash.get(tokenHash);
    if (stored !== undefined) stored.revoked = true;
  }

  isActive(sessionId: string, now: number): boolean {
    const hash = this.tokenHashBySessionId.get(sessionId);
    const entry = hash === undefined ? undefined : this.byTokenHash.get(hash);
    if (entry === undefined || entry.revoked || entry.session.expiresAt <= now) return false;
    const parentId = entry.session.parentSessionId;
    if (parentId === undefined) return true;
    const parentHash = this.tokenHashBySessionId.get(parentId);
    const parent = parentHash === undefined ? undefined : this.byTokenHash.get(parentHash);
    return parent !== undefined && !parent.revoked && parent.session.role === "admin" && parent.session.roomId === null && parent.session.parentSessionId === undefined && parent.session.expiresAt > now;
  }

  descendantsOf(sessionId: string): string[] {
    return [sessionId, ...[...this.byTokenHash.values()].filter(record => record.session.parentSessionId === sessionId).map(record => record.session.sessionId)];
  }

  hydrate(records: readonly PersistedSessionRecord[], now: number): void {
    for (const record of records) {
      if (
        !persistedSessionSchema.safeParse(record).success ||
        record.revoked ||
        record.expiresAt <= now ||
        !hasValidBinding(record)
      ) {
        continue;
      }
      const session: AuthenticatedSession = {
        sessionId: record.sessionId,
        role: record.role,
        roomId: record.roomId,
        playerId: record.playerId,
        expiresAt: record.expiresAt
        ,...(record.parentSessionId === undefined ? {} : { parentSessionId: record.parentSessionId })
      };
      this.byTokenHash.set(record.tokenHash, {
        tokenHash: record.tokenHash,
        session,
        revoked: false
      });
      this.tokenHashBySessionId.set(record.sessionId, record.tokenHash);
    }
  }

  exportRecordsForPersistence(): PersistedSessionRecord[] {
    return [...this.byTokenHash.values()].map(({ tokenHash, session, revoked }) => ({
      tokenHash,
      sessionId: session.sessionId,
      role: session.role,
      roomId: session.roomId,
      playerId: session.playerId,
      expiresAt: session.expiresAt,
      revoked
      ,...(session.parentSessionId === undefined ? {} : { parentSessionId: session.parentSessionId })
    }));
  }
}
