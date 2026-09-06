BEGIN;

ALTER TABLE games ADD COLUMN IF NOT EXISTS room_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS games_room_code_active_idx
  ON games(room_code)
  WHERE room_code IS NOT NULL AND status <> 'completed';

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_role_binding_check CHECK (
  (role = 'admin' AND player_id IS NULL)
  OR (role = 'projector' AND room_id IS NOT NULL AND player_id IS NULL)
  OR (role = 'player' AND room_id IS NOT NULL AND player_id IS NOT NULL)
);

INSERT INTO schema_migrations(version)
VALUES ('002_phase2_recovery')
ON CONFLICT (version) DO NOTHING;

COMMIT;
