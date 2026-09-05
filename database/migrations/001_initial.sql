BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('setup', 'active', 'paused', 'completed', 'quarantined')),
  state_version BIGINT NOT NULL CHECK (state_version >= 0),
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  seat_index SMALLINT NOT NULL CHECK (seat_index >= 0 AND seat_index < 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, player_id),
  UNIQUE (game_id, seat_index)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('player', 'projector', 'admin')),
  room_id TEXT,
  player_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((role = 'admin' AND room_id IS NULL AND player_id IS NULL)
      OR (role = 'projector' AND room_id IS NOT NULL AND player_id IS NULL)
      OR (role = 'player' AND room_id IS NOT NULL AND player_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS game_events (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  state_version BIGINT NOT NULL CHECK (state_version > 0),
  event_index INTEGER NOT NULL CHECK (event_index >= 0),
  event_type TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'player', 'admin')),
  player_id TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, state_version, event_index)
);

CREATE TABLE IF NOT EXISTS action_receipts (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  player_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected')),
  code TEXT,
  message TEXT,
  state_version BIGINT NOT NULL CHECK (state_version >= 0),
  receipt JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, action_id)
);

CREATE TABLE IF NOT EXISTS game_results (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  final_rank SMALLINT NOT NULL CHECK (final_rank > 0),
  final_score INTEGER NOT NULL CHECK (final_score >= 0),
  score_breakdown JSONB NOT NULL,
  objective_id TEXT NOT NULL,
  objective_completed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, player_id)
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGSERIAL PRIMARY KEY,
  admin_session_id TEXT NOT NULL,
  room_id TEXT,
  game_id TEXT,
  request_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  previous_state_version BIGINT,
  next_state_version BIGINT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS games_status_idx ON games(status);
CREATE INDEX IF NOT EXISTS game_events_room_version_idx
  ON game_events(room_id, state_version, event_index);
CREATE INDEX IF NOT EXISTS sessions_room_idx ON sessions(room_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_audit_room_created_idx ON admin_audit(room_id, created_at DESC);

INSERT INTO schema_migrations(version)
VALUES ('001_initial')
ON CONFLICT (version) DO NOTHING;

COMMIT;
