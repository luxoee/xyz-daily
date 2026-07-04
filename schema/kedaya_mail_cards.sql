CREATE TABLE IF NOT EXISTS kedaya_mail_cards (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('issued', 'claimed', 'revoked')),
  created_at INTEGER NOT NULL,
  issued_at INTEGER NOT NULL,
  claimed_at INTEGER,
  last_access_at INTEGER,
  access_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kedaya_mail_cards_status ON kedaya_mail_cards(status);
CREATE INDEX IF NOT EXISTS idx_kedaya_mail_cards_email ON kedaya_mail_cards(email);
