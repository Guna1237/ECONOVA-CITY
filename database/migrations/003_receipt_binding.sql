BEGIN;

-- Existing receipts cannot be safely attributed retroactively. Leave them unbound;
-- the runtime refuses their replay. New receipts always carry both fields.
ALTER TABLE action_receipts ADD COLUMN IF NOT EXISTS actor_key TEXT;
ALTER TABLE action_receipts ADD COLUMN IF NOT EXISTS command_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS action_receipts_bound_request_idx
  ON action_receipts(game_id, request_id) WHERE actor_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS action_receipts_request_lookup_idx
  ON action_receipts(game_id, request_id);

INSERT INTO schema_migrations(version)
VALUES ('003_receipt_binding')
ON CONFLICT (version) DO NOTHING;

COMMIT;
