-- Migration 015: Google OAuth Config RLS
-- Created: 2026-01-02
-- Description: Adds RLS policies and grants for google_oauth_config table

-- ============================================================================
-- SECTION 1: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE google_oauth_config ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OAuth config
CREATE POLICY "Users can read own google oauth config"
    ON google_oauth_config
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google oauth config"
    ON google_oauth_config
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google oauth config"
    ON google_oauth_config
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google oauth config"
    ON google_oauth_config
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 2: TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_google_oauth_config_updated_at
    BEFORE UPDATE ON google_oauth_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 3: GRANTS
-- ============================================================================

GRANT ALL ON google_oauth_config TO authenticated;
GRANT ALL ON google_oauth_config TO service_role;
