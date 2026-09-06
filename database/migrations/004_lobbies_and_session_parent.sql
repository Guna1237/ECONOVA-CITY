BEGIN;

CREATE TABLE rooms (
  room_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6}$'),
  players JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(players) = 'array' AND jsonb_array_length(players) <= 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO rooms (room_id, code, players)
SELECT room_id, room_code, '[]'::jsonb FROM games WHERE room_code IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE sessions ADD COLUMN parent_session_id TEXT REFERENCES sessions(id);
ALTER TABLE sessions ADD CONSTRAINT session_parent_role CHECK (parent_session_id IS NULL OR (role = 'admin' AND room_id IS NOT NULL));
CREATE INDEX sessions_parent_idx ON sessions(parent_session_id);

INSERT INTO schema_migrations(version) VALUES ('004_lobbies_and_session_parent') ON CONFLICT DO NOTHING;
COMMIT;
