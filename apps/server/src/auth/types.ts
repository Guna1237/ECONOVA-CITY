export type SessionRole = "player" | "projector" | "admin";

export interface AuthenticatedSession {
  readonly sessionId: string;
  readonly role: SessionRole;
  readonly roomId: string | null;
  readonly playerId: string | null;
  readonly expiresAt: number;
}
