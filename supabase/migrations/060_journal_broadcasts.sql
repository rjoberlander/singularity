-- =============================================
-- Journal Broadcasts Migration
-- Adds broadcast capabilities to journal entries
-- =============================================

-- Alter journal_entries for broadcast support
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'journal',
  ADD COLUMN IF NOT EXISTS broadcast_message TEXT,
  ADD COLUMN IF NOT EXISTS voting_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voting_type TEXT DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS voting_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT true;

-- Index for filtering by entry_type
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON journal_entries(entry_type);

-- =============================================
-- Broadcast Vote Options
-- =============================================
CREATE TABLE IF NOT EXISTS broadcast_vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_other BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_vote_options_entry ON broadcast_vote_options(entry_id);

-- =============================================
-- Broadcast Recipients
-- =============================================
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact info
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  google_contact_id TEXT,

  -- Access
  access_token TEXT NOT NULL UNIQUE,

  -- Read tracking
  first_read_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  read_count INTEGER NOT NULL DEFAULT 0,

  -- SMS tracking
  sms_sent_at TIMESTAMPTZ,
  sms_message_id TEXT,
  followup_count INTEGER NOT NULL DEFAULT 0,
  last_followup_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_entry ON broadcast_recipients(entry_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user ON broadcast_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_token ON broadcast_recipients(access_token);

-- =============================================
-- Broadcast Votes
-- =============================================
CREATE TABLE IF NOT EXISTS broadcast_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES broadcast_recipients(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES broadcast_vote_options(id) ON DELETE CASCADE,
  other_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(recipient_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_votes_entry ON broadcast_votes(entry_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_votes_recipient ON broadcast_votes(recipient_id);

-- =============================================
-- Broadcast Comments
-- =============================================
CREATE TABLE IF NOT EXISTS broadcast_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES broadcast_recipients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_comments_entry ON broadcast_comments(entry_id);

-- =============================================
-- Google Contacts Cache
-- =============================================
CREATE TABLE IF NOT EXISTS google_contacts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_resource_name TEXT NOT NULL,
  display_name TEXT,
  phone_numbers JSONB DEFAULT '[]'::jsonb,
  email_addresses JSONB DEFAULT '[]'::jsonb,
  photo_url TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, google_resource_name)
);

CREATE INDEX IF NOT EXISTS idx_google_contacts_cache_user ON google_contacts_cache(user_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE broadcast_vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_contacts_cache ENABLE ROW LEVEL SECURITY;

-- Vote Options: authors can manage via journal_entries ownership
CREATE POLICY "vote_options_select" ON broadcast_vote_options
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM journal_entries WHERE id = entry_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM broadcast_recipients WHERE entry_id = broadcast_vote_options.entry_id AND access_token IS NOT NULL)
  );

CREATE POLICY "vote_options_insert" ON broadcast_vote_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM journal_entries WHERE id = entry_id AND user_id = auth.uid())
  );

CREATE POLICY "vote_options_delete" ON broadcast_vote_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM journal_entries WHERE id = entry_id AND user_id = auth.uid())
  );

-- Recipients: authors manage their own
CREATE POLICY "recipients_select" ON broadcast_recipients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "recipients_insert" ON broadcast_recipients
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "recipients_update" ON broadcast_recipients
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "recipients_delete" ON broadcast_recipients
  FOR DELETE USING (user_id = auth.uid());

-- Votes: authors can read votes on their entries
CREATE POLICY "votes_select" ON broadcast_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE id = broadcast_votes.entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "votes_insert" ON broadcast_votes
  FOR INSERT WITH CHECK (true);

-- Comments: authors can read comments on their entries
CREATE POLICY "comments_select" ON broadcast_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE id = broadcast_comments.entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "comments_insert" ON broadcast_comments
  FOR INSERT WITH CHECK (true);

-- Google Contacts Cache: users manage their own
CREATE POLICY "contacts_cache_select" ON google_contacts_cache
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "contacts_cache_insert" ON google_contacts_cache
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "contacts_cache_update" ON google_contacts_cache
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "contacts_cache_delete" ON google_contacts_cache
  FOR DELETE USING (user_id = auth.uid());
