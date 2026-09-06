import { z } from "zod";
import {
  adminCommandSchema, adminLoginRequestSchema, adminLoginResponseSchema,
  adminRealtimeSessionResponseSchema, commandReceiptSchema, createRoomRequestSchema,
  createRoomResponseSchema, errorResponseSchema, initializeRoomResponseSchema,
  joinRoomRequestSchema, joinRoomResponseSchema, logoutResponseSchema,
  projectorSessionRequestSchema, projectorSessionResponseSchema, roomCodeSchema,
  roomIdSchema, roomListResponseSchema, sessionTokenSchema, type AdminCommand,
  type CreateRoomRequest, privateInspectionProjectionSchema, accessKeySchema, requestIdSchema
} from "@econova/contracts";

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly httpStatus?: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** Absolute HTTP origin/path; credentials must never be carried in a URL. */
export function normalizeApiBase(baseUrl = ""): string {
  const location = globalThis.location;
  const url = new URL(baseUrl || location?.origin || "", location?.origin);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ApiError("INVALID_ENDPOINT", "Use an HTTP or HTTPS server address without credentials.");
  }
  return url.href.replace(/\/+$/, "");
}

function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError("INVALID_REQUEST", "Request data is invalid.");
  return result.data;
}

export interface EconovaApiOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly timeoutMs?: number;
}

/** HTTP courier only. No automatic retries: a lost response can hide a committed mutation. */
export class EconovaApi {
  readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(options: EconovaApiOptions = {}) {
    this.baseUrl = normalizeApiBase(options.baseUrl);
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) throw new Error("Invalid HTTP timeout");
  }

  private async request<T>(path: string, schema: z.ZodType<T>, method: "GET" | "POST", token?: string, body?: unknown, receipt = false): Promise<T> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const headers: Record<string, string> = { accept: "application/json" };
    if (token !== undefined) headers["authorization"] = `Bearer ${input(sessionTokenSchema, token)}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const work = async (): Promise<T> => {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method, headers, signal: controller.signal, credentials: "omit", cache: "no-store",
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      let decoded: unknown;
      try { decoded = await response.json(); } catch { decoded = null; }
      if (!response.ok && !(receipt && response.status === 409 && commandReceiptSchema.safeParse(decoded).data?.status === "rejected")) {
        const error = errorResponseSchema.safeParse(decoded);
        throw error.success
          ? new ApiError(error.data.code, error.data.message, response.status)
          : new ApiError("HTTP_ERROR", "Request failed. Please try again.", response.status);
      }
      const parsed = schema.safeParse(decoded);
      if (!parsed.success) throw new ApiError("INVALID_RESPONSE", "The server returned an unexpected response.", response.status);
      return parsed.data;
    };
    try {
      return await Promise.race([
        work(),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            reject(new ApiError("TIMEOUT", "The request timed out. Check current state before trying again."));
            controller.abort();
          }, this.timeoutMs);
        })
      ]);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("NETWORK_ERROR", "Could not reach the server. Check your connection.");
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  async loginAdmin(accessKey: string) {
    return this.request("/api/admin/login", adminLoginResponseSchema, "POST", undefined, input(adminLoginRequestSchema, { accessKey }));
  }
  async listRooms(token: string) {
    return this.request("/api/admin/rooms", roomListResponseSchema, "GET", token);
  }
  async createRoom(token: string, room: CreateRoomRequest) {
    return this.request("/api/admin/rooms", createRoomResponseSchema, "POST", token, input(createRoomRequestSchema, room));
  }
  async joinRoom(code: string, name: string) {
    return this.request(`/api/rooms/${input(roomCodeSchema, code)}/join`, joinRoomResponseSchema, "POST", undefined, input(joinRoomRequestSchema, { name }));
  }
  async createProjectorSession(code: string, accessKey: string) {
    return this.request(`/api/rooms/${input(roomCodeSchema, code)}/projector`, projectorSessionResponseSchema, "POST", undefined, input(projectorSessionRequestSchema, { accessKey }));
  }
  async createAdminRealtimeSession(token: string, roomId: string) {
    return this.request(`/api/admin/rooms/${input(roomIdSchema, roomId)}/realtime-session`, adminRealtimeSessionResponseSchema, "POST", token);
  }
  async initializeRoom(token: string, roomId: string) {
    return this.request(`/api/admin/rooms/${input(roomIdSchema, roomId)}/initialize`, initializeRoomResponseSchema, "POST", token);
  }
  async adminCommand(token: string, roomId: string, command: AdminCommand) {
    const validated = input(adminCommandSchema, command);
    const receipt = await this.request(`/api/admin/rooms/${input(roomIdSchema, roomId)}/command`, commandReceiptSchema, "POST", token, validated, true);
    if (receipt.requestId !== validated.requestId || receipt.actionId !== validated.actionId) {
      throw new ApiError("INVALID_RESPONSE", "The server returned a receipt for a different request.");
    }
    return receipt;
  }
  async logout(token: string) {
    return this.request("/api/session/logout", logoutResponseSchema, "POST", token);
  }
  async inspectPrivate(token: string, roomId: string, accessKey: string, reason: string, requestId: string) {
    const body = input(z.object({ accessKey: accessKeySchema, reason: z.string().trim().min(1).max(240), requestId: requestIdSchema }).strict(), { accessKey, reason, requestId });
    return this.request(`/api/admin/rooms/${input(roomIdSchema, roomId)}/private-inspection`, privateInspectionProjectionSchema, "POST", token, body);
  }
}
