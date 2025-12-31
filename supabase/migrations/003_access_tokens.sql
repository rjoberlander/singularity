-- Access Tokens for MCP/AI Connector Integration
-- Allows users to generate API tokens for their Claude/ChatGPT to access Singularity

-- =============================================
-- ACCESS TOKENS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL, -- First 8 chars for display
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can read own tokens" ON access_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tokens" ON access_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON access_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON access_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Index for token lookup (used during API authentication)
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token_hash ON access_tokens(token_hash);
