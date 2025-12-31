-- Twilio Credentials and SMS Reminder Tables for Singularity
-- Run this in Supabase SQL Editor

-- ============================================
-- Twilio Credentials Table
-- ============================================
CREATE TABLE IF NOT EXISTS twilio_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_sid_encrypted TEXT NOT NULL,
    auth_token_encrypted TEXT NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_twilio_user UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_twilio_credentials_user ON twilio_credentials(user_id);

-- RLS
ALTER TABLE twilio_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Twilio credentials" ON twilio_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Twilio credentials" ON twilio_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Twilio credentials" ON twilio_credentials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Twilio credentials" ON twilio_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SMS Reminder Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS sms_reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    phone_number VARCHAR(20),
    segment_times JSONB DEFAULT '{
        "wake_up": "06:00",
        "am": "09:00",
        "lunch": "12:00",
        "pm": "15:00",
        "dinner": "18:00"
    }'::jsonb,
    enabled_segments TEXT[] DEFAULT ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner'],
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_sms_settings_user UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_reminder_settings_user ON sms_reminder_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminder_settings_enabled ON sms_reminder_settings(enabled) WHERE enabled = true;

-- RLS
ALTER TABLE sms_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SMS reminder settings" ON sms_reminder_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SMS reminder settings" ON sms_reminder_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SMS reminder settings" ON sms_reminder_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own SMS reminder settings" ON sms_reminder_settings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SMS Reminder Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS sms_reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    segment VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    error TEXT,
    message_id VARCHAR(100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_reminder_log_user ON sms_reminder_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminder_log_sent_at ON sms_reminder_log(sent_at);

-- RLS
ALTER TABLE sms_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SMS reminder logs" ON sms_reminder_log
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert logs
CREATE POLICY "Service can insert SMS reminder logs" ON sms_reminder_log
    FOR INSERT WITH CHECK (true);

-- ============================================
-- Add segment column to routine_items if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'routine_items' AND column_name = 'segment'
    ) THEN
        ALTER TABLE routine_items ADD COLUMN segment VARCHAR(20);
    END IF;
END $$;

-- Add phone_number to users if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
    END IF;
END $$;

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_twilio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_twilio_credentials_updated_at ON twilio_credentials;
CREATE TRIGGER trigger_twilio_credentials_updated_at
    BEFORE UPDATE ON twilio_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_twilio_updated_at();

DROP TRIGGER IF EXISTS trigger_sms_reminder_settings_updated_at ON sms_reminder_settings;
CREATE TRIGGER trigger_sms_reminder_settings_updated_at
    BEFORE UPDATE ON sms_reminder_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_twilio_updated_at();
