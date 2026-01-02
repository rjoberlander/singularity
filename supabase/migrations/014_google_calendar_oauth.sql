-- Migration 014: Google Calendar OAuth Integration
-- Created: 2026-01-02
-- Description: Adds Google Calendar OAuth tokens storage for calendar integration

-- ============================================================================
-- SECTION 1: CREATE TABLES
-- ============================================================================

-- 1.1 google_calendar_oauth_tokens - Store encrypted OAuth tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_calendar_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- OAuth tokens (encrypted)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,

    -- Token metadata
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT ARRAY['https://www.googleapis.com/auth/calendar.readonly'],

    -- User's Google account info
    google_email VARCHAR(255),
    google_account_id VARCHAR(255),

    -- Connection status
    is_active BOOLEAN DEFAULT TRUE,
    is_syncing BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    sync_error_message TEXT,
    sync_error_count INTEGER DEFAULT 0,

    -- Calendar settings
    primary_calendar_id VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT TRUE,

    -- Metadata (for storing additional calendar preferences)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE google_calendar_oauth_tokens IS 'Stores encrypted OAuth tokens for Google Calendar integration';
COMMENT ON COLUMN google_calendar_oauth_tokens.access_token_encrypted IS 'AES-256-GCM encrypted access token';
COMMENT ON COLUMN google_calendar_oauth_tokens.refresh_token_encrypted IS 'AES-256-GCM encrypted refresh token';
COMMENT ON COLUMN google_calendar_oauth_tokens.scopes IS 'OAuth scopes granted by user';
COMMENT ON COLUMN google_calendar_oauth_tokens.metadata IS 'Additional calendar settings and preferences';

-- 1.2 google_oauth_config - Store Google OAuth app credentials (per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS google_oauth_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- OAuth app credentials (encrypted)
    client_id_encrypted TEXT NOT NULL,
    client_secret_encrypted TEXT NOT NULL,

    -- Configuration
    redirect_uri VARCHAR(500),
    is_configured BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE google_oauth_config IS 'Stores user Google OAuth app credentials for calendar integration';
COMMENT ON COLUMN google_oauth_config.client_id_encrypted IS 'Encrypted Google OAuth Client ID';
COMMENT ON COLUMN google_oauth_config.client_secret_encrypted IS 'Encrypted Google OAuth Client Secret';

-- ============================================================================
-- SECTION 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id
    ON google_calendar_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_active
    ON google_calendar_oauth_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_sync_enabled
    ON google_calendar_oauth_tokens(sync_enabled) WHERE sync_enabled = TRUE;

-- Partial unique index: only one active connection per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_tokens_unique_active_user
    ON google_calendar_oauth_tokens(user_id) WHERE is_active = TRUE;

-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE google_calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OAuth tokens
CREATE POLICY "Users can read own google calendar tokens"
    ON google_calendar_oauth_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google calendar tokens"
    ON google_calendar_oauth_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google calendar tokens"
    ON google_calendar_oauth_tokens
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google calendar tokens"
    ON google_calendar_oauth_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_google_calendar_tokens_updated_at
    BEFORE UPDATE ON google_calendar_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: GRANTS
-- ============================================================================

GRANT ALL ON google_calendar_oauth_tokens TO authenticated;
GRANT ALL ON google_calendar_oauth_tokens TO service_role;
