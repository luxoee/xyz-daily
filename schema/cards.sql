CREATE TABLE IF NOT EXISTS cards (
  token TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('issued', 'claimed', 'revoked')),
  created_at INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  claimed_at INTEGER,
  last_access_at INTEGER,
  access_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_code ON cards(code);
