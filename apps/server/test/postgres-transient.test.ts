import type { Pool } from "pg";
import { describe, expect, it } from "vitest";

import {
  chooseSecretObjective,
  createInitialGame,
  createSeededRandom,
  startGame,
  type GameState
} from "@econova/game-engine";

import { PostgresGamePersistence } from "../src/persistence/postgres.js";
import {
  isTransientDatabaseError,
  withTransientRetry
} from "../src/persistence/transient.js";
import type { PersistedTransition } from "../src/persistence/types.js";

const noSleep = { attempts: 3, backoffMilliseconds: 0, sleep: async () => undefined };

const connectionReset = (): Error =>
  Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });

describe("which database failures are worth retrying", () => {
  it("retries a lost connection", () => {
    expect(isTransientDatabaseError(connectionReset())).toBe(true);
    expect(isTransientDatabaseError(Object.assign(new Error("x"), { code: "57P01" }))).toBe(true);
    expect(isTransientDatabaseError(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("does not retry anything the database refused on its merits", () => {
    // A retry cannot fix a constraint, a conflict or bad data; it only hides it.
    expect(isTransientDatabaseError(Object.assign(new Error("dup"), { code: "23505" }))).toBe(false);
    expect(isTransientDatabaseError(new Error("Persistence state-version conflict"))).toBe(false);
    expect(isTransientDatabaseError("not an error")).toBe(false);
  });

  it("gives up after the attempt budget rather than holding the room forever", async () => {
    let calls = 0;
    await expect(
      withTransientRetry(async () => {
        calls += 1;
        throw connectionReset();
      }, noSleep)
    ).rejects.toThrow("ECONNRESET");
    expect(calls).toBe(3);
  });

  it("surfaces a real failure on the first attempt, without retrying", async () => {
    let calls = 0;
    await expect(
      withTransientRetry(async () => {
        calls += 1;
        throw new Error("Persistence state-version conflict");
      }, noSleep)
    ).rejects.toThrow("conflict");
    expect(calls).toBe(1);
  });
});

/*
 * A stand-in for PostgreSQL that only makes writes visible on COMMIT, so a
 * failure can be injected before or after the commit point, which is exactly
 * the difference between "nothing was written" and "written, ack lost".
 */
class FakeDatabase {
  version: number;
  commits = 0;
  destroyedClients = 0;
  releasedClients = 0;
  failOn: ((sql: string, attempt: number) => Error | null) | null = null;
  attempt = 0;

  constructor(version: number) {
    this.version = version;
  }

  pool(): Pool {
    return {
      connect: async () => {
        this.attempt += 1;
        const attempt = this.attempt;
        let pendingVersion: number | null = null;
        return {
          query: async (sql: string, params?: unknown[]) => {
            const text = sql.trim();
            const injected = this.failOn?.(text, attempt) ?? null;
            if (text === "COMMIT") {
              if (pendingVersion !== null) this.version = pendingVersion;
              this.commits += 1;
              // An error after the commit is the lost-acknowledgement case.
              if (injected !== null) throw injected;
              return { rowCount: 0, rows: [] };
            }
            if (injected !== null) throw injected;
            if (text.startsWith("UPDATE games")) {
              const previous = params?.[5];
              if (previous !== this.version) return { rowCount: 0, rows: [] };
              pendingVersion = params?.[1] as number;
              return { rowCount: 1, rows: [] };
            }
            if (text.startsWith("SELECT state_version")) {
              return { rowCount: 1, rows: [{ state_version: String(this.version) }] };
            }
            return { rowCount: 1, rows: [] };
          },
          release: (destroy?: boolean) => {
            if (destroy === true) this.destroyedClients += 1;
            else this.releasedClients += 1;
          }
        };
      }
    } as unknown as Pool;
  }
}

const playing = (): GameState => {
  let state = createInitialGame({
    gameId: "game-a",
    roomId: "room-a",
    players: Array.from({ length: 4 }, (_, index) => ({ id: `p${index}`, name: `P${index}` })),
    random: createSeededRandom(3),
    now: 1_000
  });
  while (state.objectiveSelection !== null) {
    state = chooseSecretObjective(
      state,
      state.objectiveSelection.playerId,
      state.objectiveSelection.offeredObjectiveIds[0],
      1_000
    );
  }
  return startGame(state, createSeededRandom(4), 1_000).state;
};

const transitionFrom = (state: GameState): PersistedTransition => {
  const nextState = { ...state, version: state.version + 1 };
  return {
    roomId: state.roomId,
    gameId: state.gameId,
    previousVersion: state.version,
    actorPlayerId: null,
    nextState,
    events: [],
    receipt: {
      status: "accepted",
      requestId: "r1",
      actionId: "a1",
      stateVersion: nextState.version
    },
    receiptBinding: { actorKey: "system", commandHash: "h" }
  } as PersistedTransition;
};

describe("persisting a move through a flaky connection", () => {
  it("rides out a connection lost before anything was written", async () => {
    const state = playing();
    const db = new FakeDatabase(state.version);
    db.failOn = (sql, attempt) => (attempt === 1 && sql === "BEGIN" ? connectionReset() : null);

    await new PostgresGamePersistence(db.pool()).persistTransition(transitionFrom(state));

    expect(db.version).toBe(state.version + 1);
    expect(db.commits).toBe(1);
  });

  it("accepts its own write when the commit landed but the acknowledgement was lost", async () => {
    const state = playing();
    const db = new FakeDatabase(state.version);
    // The first COMMIT reaches the database, then the reply is lost.
    db.failOn = (sql, attempt) => (attempt === 1 && sql === "COMMIT" ? connectionReset() : null);

    // Without recognising its own earlier success, the retry would report a
    // version conflict and quarantine a perfectly healthy room.
    await expect(
      new PostgresGamePersistence(db.pool()).persistTransition(transitionFrom(state))
    ).resolves.toBeUndefined();
    expect(db.version).toBe(state.version + 1);
    expect(db.commits).toBe(1);
  });

  it("still reports a genuine conflict, and does not retry it", async () => {
    const state = playing();
    // The database is ahead of this runtime: a real divergence.
    const db = new FakeDatabase(state.version + 5);

    await expect(
      new PostgresGamePersistence(db.pool()).persistTransition(transitionFrom(state))
    ).rejects.toThrow("state-version conflict");
    expect(db.attempt).toBe(1);
  });

  it("destroys a connection that failed instead of returning it to the pool", async () => {
    const state = playing();
    const db = new FakeDatabase(state.version);
    db.failOn = (sql, attempt) => (attempt === 1 && sql === "BEGIN" ? connectionReset() : null);

    await new PostgresGamePersistence(db.pool()).persistTransition(transitionFrom(state));

    // One poisoned connection thrown away, one healthy one returned.
    expect(db.destroyedClients).toBe(1);
    expect(db.releasedClients).toBe(1);
  });

  it("keeps the real error when rollback also fails on a dead connection", async () => {
    const state = playing();
    const db = new FakeDatabase(state.version + 5);
    db.failOn = (sql) => (sql === "ROLLBACK" ? connectionReset() : null);

    // Previously the rollback failure replaced the conflict, hiding the cause.
    await expect(
      new PostgresGamePersistence(db.pool()).persistTransition(transitionFrom(state))
    ).rejects.toThrow("state-version conflict");
  });
});
