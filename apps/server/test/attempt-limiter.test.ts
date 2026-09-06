import { describe, expect, it } from "vitest";

import { AttemptLimiter } from "../src/security/attempt-limiter.js";

describe("bounded authentication attempts", () => {
  it("rejects attempts above the configured limit within a window", () => {
    let now = 1_000;
    const limiter = new AttemptLimiter({ limit: 2, windowMilliseconds: 10_000, now: () => now });

    expect(limiter.consume("admin:127.0.0.1")).toBe(true);
    expect(limiter.consume("admin:127.0.0.1")).toBe(true);
    expect(limiter.consume("admin:127.0.0.1")).toBe(false);

    now += 10_001;
    expect(limiter.consume("admin:127.0.0.1")).toBe(true);
  });

  it("isolates counters by operation and client key", () => {
    const limiter = new AttemptLimiter({ limit: 1, windowMilliseconds: 10_000, now: () => 1_000 });

    expect(limiter.consume("join:one")).toBe(true);
    expect(limiter.consume("join:one")).toBe(false);
    expect(limiter.consume("join:two")).toBe(true);
    expect(limiter.consume("admin:one")).toBe(true);
  });
});
