-- Singularity Health Tracking App - Initial Schema
-- Run this in Supabase SQL Editor

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'profile',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- USER LINKS (Family Sharing)
-- =============================================
CREATE TABLE IF NOT EXISTS user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  linked_user UUID REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own links" ON user_links
  FOR SELECT USING (auth.uid() = owner_user OR auth.uid() = linked_user);

CREATE POLICY "Users can create links" ON user_links
  FOR INSERT WITH CHECK (auth.uid() = owner_user);

CREATE POLICY "Owners can update links" ON user_links
  FOR UPDATE USING (auth.uid() = owner_user);

-- =============================================
-- BIOMARKERS
-- =============================================
CREATE TABLE IF NOT EXISTS biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  date_tested DATE NOT NULL,
  lab_source TEXT,
  reference_range_low DECIMAL,
  reference_range_high DECIMAL,
  optimal_range_low DECIMAL,
  optimal_range_high DECIMAL,
  notes TEXT,
  source_image TEXT,
  ai_extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;

-- Users can read own biomarkers + linked users' biomarkers
CREATE POLICY "Users can read own biomarkers" ON biomarkers
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = biomarkers.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own biomarkers" ON biomarkers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own biomarkers" ON biomarkers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own biomarkers" ON biomarkers
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SUPPLEMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  dose TEXT,
  dose_per_serving DECIMAL,
  dose_unit TEXT,
  servings_per_container INTEGER,
  price DECIMAL,
  price_per_serving DECIMAL,
  purchase_url TEXT,
  category TEXT,
  timing TEXT,
  frequency TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own supplements" ON supplements
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = supplements.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own supplements" ON supplements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supplements" ON supplements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplements" ON supplements
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- ROUTINES
-- =============================================
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  time_of_day TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routines" ON routines
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = routines.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own routines" ON routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines" ON routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines" ON routines
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- ROUTINE ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS routine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  time TEXT,
  duration TEXT,
  days JSONB DEFAULT '[]',
  linked_supplement UUID REFERENCES supplements(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routine items" ON routine_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routines
      WHERE routines.id = routine_items.routine_id
      AND (
        routines.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_links
          WHERE linked_user = auth.uid()
          AND owner_user = routines.user_id
          AND status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can insert own routine items" ON routine_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines
      WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own routine items" ON routine_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routines
      WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own routine items" ON routine_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routines
      WHERE routines.id = routine_items.routine_id
      AND routines.user_id = auth.uid()
    )
  );

-- =============================================
-- GOALS
-- =============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  target_biomarker TEXT,
  current_value DECIMAL,
  target_value DECIMAL,
  direction TEXT CHECK (direction IN ('increase', 'decrease', 'maintain')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goals" ON goals
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = goals.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- GOAL INTERVENTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS goal_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  intervention TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goal_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own goal interventions" ON goal_interventions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_interventions.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own goal interventions" ON goal_interventions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals
      WHERE goals.id = goal_interventions.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- =============================================
-- CHANGE LOG
-- =============================================
CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  change_type TEXT CHECK (change_type IN ('started', 'stopped', 'modified')),
  item_type TEXT,
  item_name TEXT,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  linked_concern TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own change log" ON change_log
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = change_log.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own change log" ON change_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- PROTOCOL DOCS (from KB module)
-- =============================================
CREATE TABLE IF NOT EXISTS protocol_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT CHECK (category IN ('routine', 'biomarkers', 'supplements', 'goals', 'reference', 'other')),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE protocol_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own protocol docs" ON protocol_docs
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = protocol_docs.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own protocol docs" ON protocol_docs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own protocol docs" ON protocol_docs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own protocol docs" ON protocol_docs
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- AI CONVERSATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  context TEXT,
  messages JSONB DEFAULT '[]',
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_biomarkers_user_id ON biomarkers(user_id);
CREATE INDEX IF NOT EXISTS idx_biomarkers_date_tested ON biomarkers(date_tested);
CREATE INDEX IF NOT EXISTS idx_biomarkers_name ON biomarkers(name);
CREATE INDEX IF NOT EXISTS idx_supplements_user_id ON supplements(user_id);
CREATE INDEX IF NOT EXISTS idx_supplements_is_active ON supplements(is_active);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_change_log_user_id ON change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_change_log_date ON change_log(date);
CREATE INDEX IF NOT EXISTS idx_user_links_owner ON user_links(owner_user);
CREATE INDEX IF NOT EXISTS idx_user_links_linked ON user_links(linked_user);
CREATE INDEX IF NOT EXISTS idx_user_links_invite_code ON user_links(invite_code);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biomarkers_updated_at BEFORE UPDATE ON biomarkers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplements_updated_at BEFORE UPDATE ON supplements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocol_docs_updated_at BEFORE UPDATE ON protocol_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
