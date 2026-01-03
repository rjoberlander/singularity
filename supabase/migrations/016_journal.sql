-- Singularity Journal Module
-- Day One-inspired journaling with time capsule feature

-- =============================================
-- JOURNAL ENTRIES
-- =============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  title TEXT,
  content TEXT NOT NULL,
  content_html TEXT,                    -- Pre-rendered HTML for display

  -- Metadata
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIME DEFAULT CURRENT_TIME,
  location_name TEXT,                   -- "San Francisco, CA"
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  weather_condition TEXT,               -- "Partly Cloudy"
  weather_temp_f INTEGER,
  weather_icon TEXT,

  -- Mood
  mood TEXT,                            -- "happy", "calm", "neutral", etc.
  mood_custom TEXT,                     -- User-typed custom mood

  -- Organization
  tags TEXT[] DEFAULT '{}',             -- Array of tag strings

  -- Entry mode
  entry_mode TEXT DEFAULT 'freeform',   -- "freeform" | "guided"
  prompt_used TEXT,                     -- The prompt question if guided

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  public_slug TEXT UNIQUE,              -- Custom URL slug
  share_password TEXT,                  -- Hashed password if protected
  show_author BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  show_date BOOLEAN DEFAULT true,

  -- Time Capsule
  is_time_capsule BOOLEAN DEFAULT false,
  capsule_delivery_date DATE,
  capsule_delivered BOOLEAN DEFAULT false,
  capsule_reminder_30d_sent BOOLEAN DEFAULT false,
  capsule_reminder_7d_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_public ON journal_entries(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_journal_entries_capsule ON journal_entries(capsule_delivery_date)
  WHERE is_time_capsule = true AND capsule_delivered = false;

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can read own entries + public entries
CREATE POLICY "Users can read own journal entries" ON journal_entries
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = journal_entries.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own journal entries" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- JOURNAL MEDIA
-- =============================================
CREATE TABLE IF NOT EXISTS journal_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Media info
  media_type TEXT NOT NULL,             -- "image" | "video"
  file_url TEXT NOT NULL,               -- Supabase Storage URL
  thumbnail_url TEXT,                   -- For videos

  -- Dimensions
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,             -- For videos
  file_size_bytes BIGINT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  original_filename TEXT,
  mime_type TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for journal_media
CREATE INDEX IF NOT EXISTS idx_journal_media_entry_id ON journal_media(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_media_user_id ON journal_media(user_id);

-- Enable RLS
ALTER TABLE journal_media ENABLE ROW LEVEL SECURITY;

-- Media follows entry visibility
CREATE POLICY "Users can read journal media" ON journal_media
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_media.entry_id
      AND (journal_entries.is_public = true OR journal_entries.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own journal media" ON journal_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal media" ON journal_media
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal media" ON journal_media
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- JOURNAL RECIPIENTS (for time capsule)
-- =============================================
CREATE TABLE IF NOT EXISTS journal_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Recipient info
  name TEXT NOT NULL,
  relationship TEXT,                    -- "Daughter", "Son", "Friend", etc.
  email TEXT,                           -- Optional
  phone TEXT,                           -- Optional

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_recipients_user_id ON journal_recipients(user_id);

-- Enable RLS
ALTER TABLE journal_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recipients" ON journal_recipients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipients" ON journal_recipients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipients" ON journal_recipients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipients" ON journal_recipients
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- JOURNAL CAPSULE RECIPIENTS (junction table)
-- =============================================
CREATE TABLE IF NOT EXISTS journal_capsule_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES journal_recipients(id) ON DELETE CASCADE,

  -- Delivery tracking
  delivered_at TIMESTAMPTZ,
  delivery_email TEXT,                  -- Email used at time of delivery

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entry_id, recipient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_capsule_recipients_entry ON journal_capsule_recipients(entry_id);
CREATE INDEX IF NOT EXISTS idx_capsule_recipients_recipient ON journal_capsule_recipients(recipient_id);

-- Enable RLS
ALTER TABLE journal_capsule_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own capsule recipients" ON journal_capsule_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_capsule_recipients.entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own capsule recipients" ON journal_capsule_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_capsule_recipients.entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own capsule recipients" ON journal_capsule_recipients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_capsule_recipients.entry_id
      AND journal_entries.user_id = auth.uid()
    )
  );

-- =============================================
-- JOURNAL PROMPTS
-- =============================================
CREATE TABLE IF NOT EXISTS journal_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prompt content
  prompt_text TEXT NOT NULL,
  category TEXT,                        -- "gratitude", "reflection", "memory", etc.

  -- Source
  source TEXT DEFAULT 'curated',        -- "curated" | "ai" | "user"
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,    -- Only for user-created

  -- Usage
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_prompts_active ON journal_prompts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_journal_prompts_user ON journal_prompts(user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE journal_prompts ENABLE ROW LEVEL SECURITY;

-- Anyone can read curated prompts, users can read their own
CREATE POLICY "Users can read prompts" ON journal_prompts
  FOR SELECT USING (
    source = 'curated'
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert own prompts" ON journal_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id AND source = 'user');

CREATE POLICY "Users can update own prompts" ON journal_prompts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts" ON journal_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- INSERT DEFAULT PROMPTS
-- =============================================
INSERT INTO journal_prompts (prompt_text, category, source, is_active) VALUES
  ('What made you smile today?', 'gratitude', 'curated', true),
  ('What are you grateful for?', 'gratitude', 'curated', true),
  ('What did you learn today?', 'reflection', 'curated', true),
  ('What''s one thing you want to remember about today?', 'memory', 'curated', true),
  ('How are you feeling right now?', 'mood', 'curated', true),
  ('What''s on your mind?', 'reflection', 'curated', true),
  ('Describe a moment from today in detail.', 'memory', 'curated', true),
  ('What would you tell your future self?', 'reflection', 'curated', true),
  ('What challenged you today and how did you handle it?', 'growth', 'curated', true),
  ('What are you looking forward to?', 'anticipation', 'curated', true),
  ('Who made a positive impact on your day?', 'gratitude', 'curated', true),
  ('What would make tomorrow great?', 'planning', 'curated', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_recipients_updated_at BEFORE UPDATE ON journal_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
