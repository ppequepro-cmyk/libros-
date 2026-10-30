CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reading_events (
  session_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('started','finished')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, book_id, event_type)
);
CREATE INDEX IF NOT EXISTS idx_reading_events_type ON reading_events(event_type);
