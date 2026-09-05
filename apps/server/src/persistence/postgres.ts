import { Pool, type PoolClient } from "pg";

import {
  assertGameInvariants,
  type GameState
} from "@econova/game-engine";

import type {
  CommandReceipt,
  GamePersistence,
  PersistedTransition
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
  receipt: CommandReceipt
): Promise<void> => {
  await client.query(
    `INSERT INTO action_receipts
      (game_id, action_id, request_id, room_id, player_id, status, code, message, state_version, receipt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT (game_id, action_id) DO NOTHING`,
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
      JSON.stringify(receipt)
    ]
  );
};

export class PostgresGamePersistence implements GamePersistence {
  constructor(private readonly pool: Pool) {}

  async persistInitialState(state: GameState): Promise<void> {
    assertGameInvariants(state);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO games (id, room_id, status, state_version, state)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [state.gameId, state.roomId, gameStatus(state), state.version, JSON.stringify(state)]
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
    receipt: Extract<CommandReceipt, { status: "rejected" }>
  ): Promise<void> {
    await insertReceipt(this.pool, gameId, roomId, null, receipt);
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
        transition.receipt
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

export const createPostgresPool = (connectionString: string): Pool =>
  new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: false
  });
