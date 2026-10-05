ALTER TABLE typing_results ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false;
ALTER TABLE contents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_contents_title_trgm ON contents USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contents_topic ON contents (topic);
CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players (room_id);
CREATE INDEX IF NOT EXISTS idx_labyrinth_players_room ON labyrinth_players (room_id);
