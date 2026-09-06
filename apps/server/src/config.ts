import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32).max(512),
    ADMIN_BOOTSTRAP_TOKEN: z.string().min(32).max(512),
    PROJECTOR_ACCESS_KEY: z.string().min(32).max(512),
    ALLOWED_ORIGINS: z.string().min(1),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(43_200),
    ADMIN_REALTIME_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(1_800),
    AUTH_ATTEMPT_WINDOW_MS: z.coerce.number().int().min(1_000).max(600_000).default(60_000),
    AUTH_ATTEMPT_LIMIT: z.coerce.number().int().min(1).max(100).default(10)
  })
  .passthrough();

export interface ServerConfig {
  readonly nodeEnv: "development" | "test" | "production";
  readonly host: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly sessionSecret: string;
  readonly adminBootstrapToken: string;
  readonly projectorAccessKey: string;
  readonly allowedOrigins: readonly string[];
  readonly logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  readonly sessionTtlMilliseconds: number;
  readonly adminRealtimeTtlMilliseconds: number;
  readonly authAttemptWindowMilliseconds: number;
  readonly authAttemptLimit: number;
}

export const parseServerConfig = (environment: NodeJS.ProcessEnv): ServerConfig => {
  const parsed = environmentSchema.parse(environment);
  const allowedOrigins = parsed.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
  if (
    allowedOrigins.length === 0 ||
    allowedOrigins.some((origin) => origin === "*" || origin.length === 0)
  ) {
    throw new Error("ALLOWED_ORIGINS must contain explicit origins and cannot use a wildcard.");
  }
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
      throw new Error("ALLOWED_ORIGINS must be exact HTTP(S) origins without paths or credentials.");
    }
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    sessionSecret: parsed.SESSION_SECRET,
    adminBootstrapToken: parsed.ADMIN_BOOTSTRAP_TOKEN,
    projectorAccessKey: parsed.PROJECTOR_ACCESS_KEY,
    allowedOrigins,
    logLevel: parsed.LOG_LEVEL,
    sessionTtlMilliseconds: parsed.SESSION_TTL_SECONDS * 1_000,
    adminRealtimeTtlMilliseconds: parsed.ADMIN_REALTIME_TTL_SECONDS * 1_000,
    authAttemptWindowMilliseconds: parsed.AUTH_ATTEMPT_WINDOW_MS,
    authAttemptLimit: parsed.AUTH_ATTEMPT_LIMIT
  };
};
