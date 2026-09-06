import { describe, expect, it } from "vitest";

import { parseServerConfig } from "../src/config.js";

const validEnvironment = {
  NODE_ENV: "production",
  HOST: "0.0.0.0",
  PORT: "3000",
  DATABASE_URL: "postgresql://econova:secret@127.0.0.1:5432/econova",
  SESSION_SECRET: "s".repeat(32),
  ADMIN_BOOTSTRAP_TOKEN: "a".repeat(32),
  PROJECTOR_ACCESS_KEY: "p".repeat(32),
  ALLOWED_ORIGINS: "http://localhost:5173,http://localhost:5174",
  LOG_LEVEL: "info"
};

describe("production server configuration", () => {
  it("parses and normalizes a valid environment", () => {
    expect(parseServerConfig(validEnvironment)).toMatchObject({
      nodeEnv: "production",
      host: "0.0.0.0",
      port: 3000,
      allowedOrigins: ["http://localhost:5173", "http://localhost:5174"]
    });
  });

  it("rejects missing secrets and wildcard origins", () => {
    expect(() => parseServerConfig({ ...validEnvironment, SESSION_SECRET: "short" })).toThrow();
    expect(() => parseServerConfig({ ...validEnvironment, ALLOWED_ORIGINS: "*" })).toThrow();
  });

  it("uses bounded operational defaults", () => {
    expect(parseServerConfig(validEnvironment)).toMatchObject({
      sessionTtlMilliseconds: 43_200_000,
      adminRealtimeTtlMilliseconds: 1_800_000,
      authAttemptWindowMilliseconds: 60_000,
      authAttemptLimit: 10
    });
  });
});
