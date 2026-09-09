import { Pool, type PoolClient } from "pg";

import {
  assertGameInvariants,
  type GameState
} from "@econova/game-engine";

import type {
  CommandReceipt,
  GamePersistence,
  PersistedTransition,
  ReceiptBinding,
  StoredCommandReceipt
} from "./types.js";

const gameStatus = (state: GameState): string => {
  if (state.phase === "completed") return "completed";
  if (state.phase === "paused") return "paused";
  if (state.phase === "objective_selection" || state.phase === "ready") return "setup";
  return "active";
};

const parseJson = <T>(value: unknown): T => {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
};

const insertReceipt = async (
  client: Pick<PoolClient, "query">,
  gameId: string,
  roomId: string,
  playerId: string | null,
  receipt: CommandReceipt,
  binding?: ReceiptBinding
): Promise<void> => {
  await client.query(
    `INSERT INTO action_receipts
      (game_id, action_id, request_id, room_id, player_id, status, code, message, state_version, receipt,
       actor_key, command_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)`,
    [
      gameId,
      receipt.actionId,
      receipt.requestId,
      roomId,
      playerId,
      receipt.status,
      receipt.status === "rejected" ? receipt.code : null,
      receipt.status === "rejected" ? receipt.message : null,
      receipt.stateVersion,
      JSON.stringify(receipt),
      binding?.actorKey ?? null,
      binding?.commandHash ?? null
    ]
  );
};

export class PostgresGamePersistence implements GamePersistence {
  async quarantineRoom(gameId: string, roomId: string): Promise<void> {
    await this.pool.query("UPDATE games SET status='quarantined', updated_at=NOW() WHERE id=$1 AND room_id=$2", [gameId, roomId]);
  }
  constructor(private readonly pool: Pool) {}

  async persistInitialState(
    state: GameState,
    recovery?: { readonly roomCode: string }
  ): Promise<void> {
    assertGameInvariants(state);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO games (id, room_id, room_code, status, state_version, state)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          state.gameId,
          state.roomId,
          recovery?.roomCode ?? null,
          gameStatus(state),
          state.version,
          JSON.stringify(state)
        ]
      );
      for (const [seatIndex, playerId] of state.turnOrder.entries()) {
        const player = state.players[playerId];
        if (player === undefined) throw new Error(`Missing setup player ${playerId}`);
        await client.query(
          `INSERT INTO players (game_id, player_id, display_name, seat_index)
           VALUES ($1, $2, $3, $4)`,
          [state.gameId, player.id, player.name, seatIndex]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async loadLatestState(gameId: string): Promise<GameState | null> {
    const result = await this.pool.query<{ state: unknown }>(
      "SELECT state FROM games WHERE id = $1",
      [gameId]
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    const state = parseJson<GameState>(row.state);
    assertGameInvariants(state);
    return state;
  }

  async getActionReceipt(gameId: string, actionId: string): Promise<CommandReceipt | null> {
    const result = await this.pool.query<{ receipt: unknown }>(
      "SELECT receipt FROM action_receipts WHERE game_id = $1 AND action_id = $2",
      [gameId, actionId]
    );
    const row = result.rows[0];
    return row === undefined ? null : parseJson<CommandReceipt>(row.receipt);
  }

  async persistRejectedReceipt(
    gameId: string,
    roomId: string,
    receipt: Extract<CommandReceipt, { status: "rejected" }>,
    binding?: ReceiptBinding
  ): Promise<void> {
    await insertReceipt(this.pool, gameId, roomId, null, receipt, binding);
  }

  async getCommandReceipts(
    gameId: string,
    actionId: string,
    requestId: string
  ): Promise<readonly StoredCommandReceipt[]> {
    const result = await this.pool.query<{
      receipt: unknown;
      actor_key: string | null;
      command_hash: string | null;
    }>(
      `SELECT receipt, actor_key, command_hash FROM action_receipts
        WHERE game_id = $1 AND (action_id = $2 OR request_id = $3)`,
      [gameId, actionId, requestId]
    );
    return result.rows.map((row) => ({
      receipt: parseJson<CommandReceipt>(row.receipt),
      binding: row.actor_key === null || row.command_hash === null ? null : {
        actorKey: row.actor_key,
        commandHash: row.command_hash
      }
    }));
  }

  async persistTransition(transition: PersistedTransition): Promise<void> {
    assertGameInvariants(transition.nextState);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const update = await client.query(
        `UPDATE games
            SET status = $1, state_version = $2, state = $3::jsonb, updated_at = NOW()
          WHERE id = $4 AND room_id = $5 AND state_version = $6`,
        [
          gameStatus(transition.nextState),
          transition.nextState.version,
          JSON.stringify(transition.nextState),
          transition.gameId,
          transition.roomId,
          transition.previousVersion
        ]
      );
      if (update.rowCount !== 1) {
        throw new Error("Persistence state-version conflict");
      }
      for (const [eventIndex, event] of transition.events.entries()) {
        await client.query(
          `INSERT INTO game_events
            (game_id, room_id, state_version, event_index, event_type, visibility, player_id, payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
          [
            transition.gameId,
            transition.roomId,
            transition.nextState.version,
            eventIndex,
            event.type,
            event.visibility,
            event.playerId ?? null,
            JSON.stringify(event.payload)
          ]
        );
      }
      await insertReceipt(
        client,
        transition.gameId,
        transition.roomId,
        transition.actorPlayerId,
        transition.receipt,
        transition.receiptBinding
      );
      if (transition.adminAudit !== undefined) {
        await client.query(
          `INSERT INTO admin_audit
            (admin_session_id, room_id, game_id, request_id, action_id, action_type,
             previous_state_version, next_state_version, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}'::jsonb)`,
          [
            transition.adminAudit.adminSessionId,
            transition.roomId,
            transition.gameId,
            transition.adminAudit.requestId,
            transition.adminAudit.actionId,
            transition.adminAudit.actionType,
            transition.previousVersion,
            transition.nextState.version
          ]
        );
      }
      if (transition.nextState.phase === "completed") {
        for (const result of transition.nextState.results) {
          await client.query(
            `INSERT INTO game_results
              (game_id, player_id, final_rank, final_score, score_breakdown, objective_id, objective_completed)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
             ON CONFLICT (game_id, player_id) DO UPDATE SET
               final_rank = EXCLUDED.final_rank,
               final_score = EXCLUDED.final_score,
               score_breakdown = EXCLUDED.score_breakdown,
               objective_id = EXCLUDED.objective_id,
               objective_completed = EXCLUDED.objective_completed`,
            [
              transition.gameId,
              result.playerId,
              result.rank,
              result.breakdown.total,
              JSON.stringify(result.breakdown),
              result.objectiveId,
              result.objectiveCompleted
            ]
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const createPostgresPool = (connectionString: string): Pool => {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3_000,
    query_timeout: 5_000,
    statement_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: false
  });
  pool.on("connect", client => {
    // pg rejects pending queries on connection loss, but also emits an error
    // event while checked out. Preserve the transaction's rejection/quarantine
    // path instead of allowing that event to crash every room in the process.
    client.on("error", () => undefined);
  });
  pool.on("error", () => {
    // pg already removed the failed idle client. Never log its error payload:
    // it may contain connection details, and no game state needs changing here.
    process.emitWarning("An idle PostgreSQL connection failed and was removed from the pool.", {
      code: "POSTGRES_IDLE_CONNECTION_ERROR"
    });
  });
  return pool;
};
