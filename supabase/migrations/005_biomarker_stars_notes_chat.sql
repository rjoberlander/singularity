-- Migration: Biomarker Stars, Notes, and AI Chat Integration
-- Description: Add tables for starring biomarkers, notes per biomarker, and link conversations to biomarkers

-- =====================================================
-- BIOMARKER STARS TABLE
-- Stars are per biomarker NAME (not per reading), per user
-- =====================================================
CREATE TABLE IF NOT EXISTS biomarker_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biomarker_name TEXT NOT NULL,
  starred_at TIMESTAMPTZ DEFAULT NOW(),
  starred_by TEXT CHECK (starred_by IN ('user', 'ai')) DEFAULT 'user',
  ai_reason TEXT, -- Reason if AI starred it (e.g., "Critical trend detected")
  UNIQUE(user_id, biomarker_name)
);

-- Enable RLS
ALTER TABLE biomarker_stars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own stars" ON biomarker_stars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stars" ON biomarker_stars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stars" ON biomarker_stars
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_biomarker_stars_user_id ON biomarker_stars(user_id);
CREATE INDEX IF NOT EXISTS idx_biomarker_stars_biomarker_name ON biomarker_stars(biomarker_name);

-- =====================================================
-- BIOMARKER NOTES TABLE
-- Notes are per biomarker NAME (not per reading), per user
-- =====================================================
CREATE TABLE IF NOT EXISTS biomarker_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  biomarker_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT CHECK (created_by IN ('user', 'ai')) DEFAULT 'user',
  ai_context TEXT, -- Context if AI created the note (e.g., "Based on trend analysis")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE biomarker_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own notes" ON biomarker_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON biomarker_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON biomarker_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON biomarker_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_biomarker_notes_user_id ON biomarker_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_biomarker_notes_biomarker_name ON biomarker_notes(biomarker_name);

-- Trigger for updated_at
CREATE TRIGGER update_biomarker_notes_updated_at BEFORE UPDATE ON biomarker_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MODIFY AI_CONVERSATIONS TABLE
-- Add biomarker_name to link conversations to specific biomarkers
-- =====================================================
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS biomarker_name TEXT;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS title TEXT;

-- Index for biomarker filtering
CREATE INDEX IF NOT EXISTS idx_ai_conversations_biomarker_name ON ai_conversations(biomarker_name);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_context ON ai_conversations(context);
