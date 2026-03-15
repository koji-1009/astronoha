-- Heatmap: year-by-year speech count per keyword and search target.
-- Past years are immutable (parliamentary records don't change).
-- Only the current year is periodically refreshed.
CREATE TABLE IF NOT EXISTS heatmap (
  keyword TEXT NOT NULL,
  target  TEXT NOT NULL CHECK (target IN ('kokkai', 'teikoku')),
  year    INTEGER NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (keyword, target, year)
);

CREATE INDEX IF NOT EXISTS idx_heatmap_keyword_target
  ON heatmap (keyword, target);
