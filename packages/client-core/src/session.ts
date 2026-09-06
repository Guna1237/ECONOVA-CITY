import { z } from "zod";
import { joinRoomResponseSchema, projectorSessionResponseSchema } from "@econova/contracts";
import { normalizeApiBase } from "./api.js";

export const roomSessionSchema = z.discriminatedUnion("role", [
  joinRoomResponseSchema.extend({ role: z.literal("player") }).strict(),
  projectorSessionResponseSchema.extend({ role: z.literal("projector") }).strict(),
  projectorSessionResponseSchema.extend({ role: z.literal("admin") }).strict()
]);
export type RoomSession = z.infer<typeof roomSessionSchema>;
export type RoomSessionInput = z.input<typeof roomSessionSchema>;
export type RoomRole = RoomSession["role"];
export const storedSessionSchema = z.object({
  session: roomSessionSchema,
  lastSeenStateVersion: z.number().int().nonnegative().nullable()
}).strict();
export type StoredSession = z.infer<typeof storedSessionSchema>;
export interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): SessionStorage | undefined {
  try { return globalThis.sessionStorage; } catch { return undefined; }
}
function key(baseUrl: string, role: RoomRole): string {
  return `econova.session.v1:${encodeURIComponent(normalizeApiBase(baseUrl))}:${role}`;
}

/** Sessions are tab-scoped. Admin credentials never enter browser persistence. */
export function saveStoredSession(baseUrl: string, session: RoomSessionInput, lastSeenStateVersion: number | null = null, storage = browserStorage()): void {
  const parsed = storedSessionSchema.parse({ session, lastSeenStateVersion });
  if (parsed.session.role === "admin") return;
  try { storage?.setItem(key(baseUrl, parsed.session.role), JSON.stringify(parsed)); } catch { /* Storage is optional. */ }
}

export function clearStoredSession(baseUrl: string, role: RoomRole, storage = browserStorage()): void {
  try { storage?.removeItem(key(baseUrl, role)); } catch { /* Storage is optional. */ }
}

export function readStoredSession(baseUrl: string, role: RoomRole, storage = browserStorage(), now = Date.now()): StoredSession | null {
  if (role === "admin") return null;
  try {
    const raw = storage?.getItem(key(baseUrl, role));
    if (raw === null || raw === undefined) return null;
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.session.role === role && parsed.data.session.expiresAt > now) return parsed.data;
  } catch { /* Corrupt/unavailable storage must never create an identity. */ }
  clearStoredSession(baseUrl, role, storage);
  return null;
}

export interface SecureRandomSource {
  randomUUID?: () => string;
  getRandomValues?: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
}
/** getRandomValues works on HTTP LAN origins where randomUUID may be absent. */
export function secureId(source: SecureRandomSource = globalThis.crypto): string {
  if (source?.randomUUID) return source.randomUUID();
  if (!source?.getRandomValues) throw new Error("Secure randomness is unavailable");
  const bytes = source.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
