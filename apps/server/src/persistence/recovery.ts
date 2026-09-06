import { assertGameInvariants, type GameState } from "@econova/game-engine";
import type { Pool } from "pg";
import { z } from "zod";

import type { PersistedSessionRecord } from "../auth/session-store.js";
import type { RecoverableRoom, LobbyRecord } from "../rooms/room-manager.js";
import type { InspectionAudit } from "../security/private-inspection.js";

export interface SqlQueryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

const jsonValue = <T>(value: unknown): T =>
  (typeof value === "string" ? JSON.parse(value) : value) as T;

export const loadRecoverableRooms = async (
  queryable: SqlQueryable,
  onInvalid?: (room: { roomId: string; code: string }) => void
): Promise<RecoverableRoom[]> => {
  const result = await queryable.query(
    `SELECT id, state_version, room_id, room_code, state, status
       FROM games
      WHERE status IN ('setup', 'active', 'paused', 'quarantined', 'completed')
        AND room_code IS NOT NULL
      ORDER BY created_at`
  );
  return result.rows.flatMap((value) => {
    const row = value as { id: string; state_version: number | string; room_id: string; room_code: string; state: unknown; status?: string };
    try {
      const state = jsonValue<GameState>(row.state);
      assertGameInvariants(state);
      if (state.roomId !== row.room_id) throw new Error("Recovered game room binding is invalid.");
      // pg returns BIGINT as a decimal string; do not weaken its precision globally.
      if (state.gameId !== row.id || String(state.version) !== String(row.state_version)) {
        throw new Error("Recovered game identity/version binding is invalid.");
      }
      return [{ roomId: row.room_id, code: row.room_code, state, ...(row.status === 'quarantined' ? { quarantined: true } : {}) }];
    } catch (failure) {
      if (onInvalid === undefined) throw failure;
      onInvalid({ roomId: row.room_id, code: row.room_code });
      return [];
    }
  });
};

export const loadSessionRecords = async (
  queryable: SqlQueryable,
  now: number
): Promise<PersistedSessionRecord[]> => {
  const result = await queryable.query(
    `SELECT id, token_hash, role, room_id, player_id, expires_at, revoked_at, parent_session_id
       FROM sessions
      WHERE revoked_at IS NULL AND expires_at > $1`,
    [new Date(now)]
  );
  return result.rows.map((value) => {
    const row = value as {
      id: string;
      token_hash: string;
      role: PersistedSessionRecord["role"];
      room_id: string | null;
      player_id: string | null;
      expires_at: Date | string;
      revoked_at: Date | string | null;
      parent_session_id?: string | null;
    };
    return {
      tokenHash: row.token_hash,
      sessionId: row.id,
      role: row.role,
      roomId: row.room_id,
      playerId: row.player_id,
      expiresAt: new Date(row.expires_at).getTime(),
      revoked: row.revoked_at !== null,
      ...(row.parent_session_id == null ? {} : { parentSessionId: row.parent_session_id })
    };
  });
};

export const persistSessionRecord = async (
  queryable: SqlQueryable,
  record: PersistedSessionRecord
): Promise<void> => {
  await queryable.query(
    `INSERT INTO sessions
      (id, token_hash, role, room_id, player_id, expires_at, revoked_at, parent_session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET revoked_at = EXCLUDED.revoked_at`,
    [
      record.sessionId,
      record.tokenHash,
      record.role,
      record.roomId,
      record.playerId,
      new Date(record.expiresAt),
      record.revoked ? new Date() : null,
      record.parentSessionId ?? null
    ]
  );
};

const lobbySchema = z.object({ room_id: z.string().min(1), code: z.string().regex(/^[A-Z0-9]{6}$/), players: z.array(z.object({ playerId: z.string().min(1), name: z.string().min(1).max(40) }).strict()).max(6) });
export const loadRecoverableLobbies = async (queryable: SqlQueryable): Promise<LobbyRecord[]> => {
  const result = await queryable.query("SELECT room_id, code, players FROM rooms WHERE NOT EXISTS (SELECT 1 FROM games WHERE games.room_id = rooms.room_id) ORDER BY created_at");
  return result.rows.map(value => {
    const row = lobbySchema.parse(value);
    return { roomId: row.room_id, code: row.code, players: row.players };
  });
};

export const persistLobbyRecord = async (pool: Pool, room: LobbyRecord, session?: PersistedSessionRecord): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO rooms (room_id, code, players) VALUES ($1,$2,$3::jsonb)
      ON CONFLICT (room_id) DO UPDATE SET players=EXCLUDED.players, updated_at=NOW() WHERE rooms.code=EXCLUDED.code`, [room.roomId, room.code, JSON.stringify(room.players)]);
    if (session !== undefined) {
      if (session.role !== "player" || session.roomId !== room.roomId || !room.players.some(player => player.playerId === session.playerId)) throw new Error("Invalid lobby session binding.");
      await persistSessionRecord(client, session);
    }
    await client.query("COMMIT");
  } catch (failure) { await client.query("ROLLBACK"); throw failure; }
  finally { client.release(); }
};

export const persistInspectionAudit = async (queryable: SqlQueryable, audit: InspectionAudit): Promise<void> => {
  await queryable.query(`INSERT INTO admin_audit (admin_session_id,room_id,game_id,request_id,action_id,action_type,previous_state_version,next_state_version,details)
    VALUES ($1,$2,$3,$4,$4,'private_inspection',$5,$5,$6::jsonb)`, [audit.adminSessionId,audit.roomId,audit.gameId,audit.requestId,audit.stateVersion,JSON.stringify({ reason: audit.reason })]);
};

export const revokeSessionRecord = async (
  queryable: SqlQueryable,
  sessionId: string,
  now: number
): Promise<void> => {
  await queryable.query(
    "UPDATE sessions SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL",
    [new Date(now), sessionId]
  );
};
