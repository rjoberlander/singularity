-- Migration 061: Inbound SMS Messages + Telegram Chat Sessions
-- Run manually in Supabase Dashboard SQL Editor

-- ============================================
-- 1. Inbound SMS Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS inbound_sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    body TEXT,
    message_sid VARCHAR(100) UNIQUE,
    num_media INTEGER DEFAULT 0,
    media_urls JSONB,
    broadcast_entry_id UUID REFERENCES journal_entries(id),
    broadcast_recipient_id UUID REFERENCES broadcast_recipients(id),
    status VARCHAR(20) DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_sms_from_number ON inbound_sms_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_inbound_sms_message_sid ON inbound_sms_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_inbound_sms_broadcast_entry ON inbound_sms_messages(broadcast_entry_id);
CREATE INDEX IF NOT EXISTS idx_inbound_sms_created_at ON inbound_sms_messages(created_at);

ALTER TABLE inbound_sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage inbound SMS" ON inbound_sms_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own inbound SMS" ON inbound_sms_messages
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 2. Telegram Chat Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id BIGINT NOT NULL,
    telegram_username TEXT,
    telegram_first_name TEXT,
    user_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active session per chat
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_chat_active
    ON telegram_chat_sessions(telegram_chat_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_telegram_chat_user ON telegram_chat_sessions(user_id);

ALTER TABLE telegram_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage telegram sessions" ON telegram_chat_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own telegram sessions" ON telegram_chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Helper function to increment message count atomically
CREATE OR REPLACE FUNCTION increment_telegram_message_count(session_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE telegram_chat_sessions
    SET message_count = message_count + 1,
        last_message_at = now(),
        updated_at = now()
    WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql;
