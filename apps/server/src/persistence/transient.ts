/*
 * Retrying a database write that failed for reasons unrelated to the game.
 *
 * Every accepted or rejected command is persisted before a player sees it, and
 * a room that cannot persist is quarantined, so that memory never runs ahead
 * of the database. That is right for a real conflict. It was also what a
 * dropped connection, a reset socket or a database failover did, which on a
 * hosted database froze a live game over a network blip lasting a second.
 *
 * Only failures of the connection itself are retried. Anything the database
 * rejected on its merits (a constraint, a version conflict, bad data) is a
 * statement about the game and still surfaces immediately.
 */

/* SQLSTATE class 08 is connection exception; 57P0x is an operator or crash
   shutdown of the server. Node socket codes cover a connection that died
   before PostgreSQL could say anything at all. */
const TRANSIENT_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "57P01",
  "57P02",
  "57P03",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH"
]);

/* pg reports some lost connections only as a message, with no code. */
const TRANSIENT_MESSAGE =
  /connection terminated|connection timeout|timeout exceeded when trying to connect|client has encountered a connection error/i;

export const isTransientDatabaseError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  return typeof message === "string" && TRANSIENT_MESSAGE.test(message);
};

export interface RetryOptions {
  /** Total attempts, including the first. */
  readonly attempts: number;
  /** Delay before the n-th retry is `backoffMilliseconds * n`. */
  readonly backoffMilliseconds: number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

export const DEFAULT_RETRY: RetryOptions = { attempts: 3, backoffMilliseconds: 150 };

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Run `write`, retrying only transient connection failures.
 *
 * `write` receives `isRetry`, because a retry must be idempotent: when a
 * previous attempt committed but its acknowledgement was lost, the write has
 * already happened and repeating it would look like a conflict. Each write
 * decides for itself how to recognise its own earlier success.
 */
export const withTransientRetry = async <T>(
  write: (isRetry: boolean) => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY
): Promise<T> => {
  const sleep = options.sleep ?? wait;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await write(attempt > 1);
    } catch (error) {
      if (attempt >= options.attempts || !isTransientDatabaseError(error)) throw error;
      await sleep(options.backoffMilliseconds * attempt);
    }
  }
};
