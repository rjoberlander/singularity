-- AI API Keys table for Singularity
-- Stores encrypted API keys for Anthropic, OpenAI, and Perplexity

CREATE TABLE IF NOT EXISTS ai_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('anthropic', 'openai', 'perplexity')),
    key_name VARCHAR(255) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    health_status VARCHAR(50) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'warning', 'critical', 'unknown')),
    consecutive_failures INTEGER DEFAULT 0,
    last_health_check TIMESTAMP WITH TIME ZONE,
    last_error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_user ON ai_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider ON ai_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_health ON ai_api_keys(health_status);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_primary ON ai_api_keys(is_primary) WHERE is_primary = true;

-- Unique constraint: only 1 primary key per provider per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_per_provider_per_user
ON ai_api_keys(user_id, provider) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE ai_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own keys
CREATE POLICY "Users can view own API keys" ON ai_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys" ON ai_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON ai_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys" ON ai_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_api_keys_updated_at ON ai_api_keys;
CREATE TRIGGER trigger_ai_api_keys_updated_at
    BEFORE UPDATE ON ai_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_api_keys_updated_at();
