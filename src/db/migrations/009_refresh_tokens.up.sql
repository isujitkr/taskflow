CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- sha256 of raw token, raw never stored
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_id: CASCADE - tokens are meaningless without the user.

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id); -- revoke-all lookups
-- token_hash lookup on every refresh call is already covered by the UNIQUE btree.
