import { afterEach, describe, expect, it, vi } from "vitest";
import { adminCommandSchema } from "@econova/contracts";
import { EconovaApi } from "../src/api.js";

const token = "opaque_token_for_client_test_1234567890";
const session = { token, expiresAt: 99_999, roomId: "room-a" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.useRealTimers());

describe("EconovaApi", () => {
  it("reauthenticates private inspection without caching or retrying a failed audit", async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.cache).toBe("no-store");
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${token}`);
      expect(JSON.parse(String(init?.body))).toEqual({ accessKey: "fresh-key", reason: "Operator review", requestId: "inspection-1" });
      return response({ code: "AUDIT_UNAVAILABLE", message: "Inspection unavailable." }, 503);
    });
    const api = new EconovaApi({ baseUrl: "http://game.test", fetch: fetcher });
    await expect(api.inspectPrivate(token, "room-a", "fresh-key", "Operator review", "inspection-1")).rejects.toMatchObject({ code: "AUDIT_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe("http://game.test/api/admin/rooms/room-a/private-inspection");
  });
  it("uses the exact routes, payloads, bearer scope and validated results", async () => {
    const requests: { url: string; method: string; token: string | null; body: unknown }[] = [];
    const results = [
      { token, expiresAt: 99_999 },
      { rooms: [{ roomId: "room-a", code: "ABC123", playerCount: 4, status: "lobby", stateVersion: null }] },
      { roomId: "room-a", code: "ABC123" },
      { ...session, playerId: "player-a" }, session, session,
      { roomId: "room-a", gameId: "game-a", stateVersion: 1 },
      { status: "signed_out" }
    ];
    const api = new EconovaApi({ baseUrl: "https://game.example/", fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      requests.push({ url: String(url), method: init?.method ?? "GET", token: headers.get("authorization"), body: init?.body ? JSON.parse(String(init.body)) : null });
      return response(results.shift());
    } });
    expect(await api.loginAdmin("key")).toEqual({ token, expiresAt: 99_999 });
    expect((await api.listRooms(token)).rooms[0]?.status).toBe("lobby");
    await api.createRoom(token, { code: "ABC123" });
    expect((await api.joinRoom("ABC123", " Ada ")).playerId).toBe("player-a");
    await api.createProjectorSession("ABC123", "projector-key");
    await api.createAdminRealtimeSession(token, "room-a");
    await api.initializeRoom(token, "room-a");
    await api.logout(token);
    expect(requests).toEqual([
      { url: "https://game.example/api/admin/login", method: "POST", token: null, body: { accessKey: "key" } },
      { url: "https://game.example/api/admin/rooms", method: "GET", token: `Bearer ${token}`, body: null },
      { url: "https://game.example/api/admin/rooms", method: "POST", token: `Bearer ${token}`, body: { code: "ABC123" } },
      { url: "https://game.example/api/rooms/ABC123/join", method: "POST", token: null, body: { name: "Ada" } },
      { url: "https://game.example/api/rooms/ABC123/projector", method: "POST", token: null, body: { accessKey: "projector-key" } },
      { url: "https://game.example/api/admin/rooms/room-a/realtime-session", method: "POST", token: `Bearer ${token}`, body: null },
      { url: "https://game.example/api/admin/rooms/room-a/initialize", method: "POST", token: `Bearer ${token}`, body: null },
      { url: "https://game.example/api/session/logout", method: "POST", token: `Bearer ${token}`, body: null }
    ]);
  });

  it("returns a validated rejected command receipt on HTTP 409 and preserves IDs", async () => {
    const receipt = { status: "rejected", requestId: "req-a", actionId: "act-a", stateVersion: 2, code: "STALE_STATE", message: "Refresh state." };
    const api = new EconovaApi({ baseUrl: "http://game.test", fetch: async () => response(receipt, 409) });
    const command = adminCommandSchema.parse({ type: "admin_start_game", requestId: "req-a", actionId: "act-a", expectedStateVersion: 1 });
    expect(await api.adminCommand(token, "room-a", command)).toEqual(receipt);
  });

  it("rejects a valid receipt for a different action", async () => {
    const api = new EconovaApi({ baseUrl: "http://game.test", fetch: async () => response({ status: "accepted", requestId: "other", actionId: "other", stateVersion: 2 }) });
    const command = adminCommandSchema.parse({ type: "admin_start_game", requestId: "req-a", actionId: "act-a", expectedStateVersion: 1 });
    await expect(api.adminCommand(token, "room-a", command)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("sanitizes malformed server errors and rejects malformed success payloads", async () => {
    const api = new EconovaApi({ baseUrl: "http://game.test", fetch: async () => response({ message: "stack secret", stack: "private" }, 500) });
    await expect(api.loginAdmin("key")).rejects.toMatchObject({ code: "HTTP_ERROR", message: "Request failed. Please try again." });
    const invalid = new EconovaApi({ baseUrl: "http://game.test", fetch: async () => response({ token: "bad" }) });
    await expect(invalid.loginAdmin("key")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("times out a hung request without retrying and aborts it", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const api = new EconovaApi({ baseUrl: "http://game.test", timeoutMs: 100, fetch: async (_url, init) => {
      signal = init?.signal;
      return new Promise<Response>(() => undefined);
    } });
    const result = expect(api.loginAdmin("key")).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(100);
    await result;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects unsafe endpoints and malformed request data before networking", async () => {
    expect(() => new EconovaApi({ baseUrl: "https://user:secret@game.test" })).toThrow();
    expect(() => new EconovaApi({ baseUrl: "javascript:alert(1)" })).toThrow();
    const api = new EconovaApi({ baseUrl: "http://game.test", fetch: async () => { throw new Error("must not fetch"); } });
    await expect(api.joinRoom("../room", "Ada")).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
