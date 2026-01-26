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
-- Add timezone column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add comment for documentation
COMMENT ON COLUMN users.timezone IS 'User timezone in IANA format (e.g., America/Los_Angeles)';
-- Eight Sleep Integration Schema
-- Stores Eight Sleep credentials, sleep session data, and protocol correlations

-- =============================================
-- EIGHT SLEEP INTEGRATIONS
-- Stores user credentials and sync settings
-- =============================================
CREATE TABLE IF NOT EXISTS eight_sleep_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Encrypted credentials (AES-256-GCM)
  email_encrypted TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,

  -- Eight Sleep account info (populated after successful auth)
  eight_sleep_user_id TEXT,
  session_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Device info
  device_id TEXT,
  side TEXT CHECK (side IN ('left', 'right', 'solo')),

  -- Sync preferences
  sync_enabled BOOLEAN DEFAULT true,
  sync_time TIME DEFAULT '08:00:00',
  sync_timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'syncing', 'never')),
  consecutive_failures INTEGER DEFAULT 0,
  last_error_message TEXT,

  -- Metadata for future use
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One integration per user
  UNIQUE(user_id)
);

ALTER TABLE eight_sleep_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own integration
CREATE POLICY "Users can read own eight sleep integration" ON eight_sleep_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eight sleep integration" ON eight_sleep_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eight sleep integration" ON eight_sleep_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own eight sleep integration" ON eight_sleep_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SLEEP SESSIONS
-- Stores nightly sleep data from Eight Sleep
-- =============================================
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES eight_sleep_integrations(id) ON DELETE CASCADE,

  -- Session identification
  date DATE NOT NULL,
  eight_sleep_interval_id TEXT,

  -- Sleep scores (0-100)
  sleep_score INTEGER CHECK (sleep_score >= 0 AND sleep_score <= 100),
  sleep_quality_score INTEGER CHECK (sleep_quality_score >= 0 AND sleep_quality_score <= 100),

  -- Duration (stored in minutes)
  time_slept INTEGER,
  time_to_fall_asleep INTEGER,
  time_in_bed INTEGER,

  -- Wake events
  wake_events INTEGER DEFAULT 0,
  wake_event_times JSONB DEFAULT '[]',
  woke_between_2_and_4_am BOOLEAN DEFAULT false,
  wake_time_between_2_and_4_am TIME,

  -- Vitals - Heart Rate
  avg_heart_rate DECIMAL(5,2),
  min_heart_rate DECIMAL(5,2),
  max_heart_rate DECIMAL(5,2),
  resting_heart_rate DECIMAL(5,2),

  -- Vitals - HRV (Heart Rate Variability)
  avg_hrv DECIMAL(6,2),
  min_hrv DECIMAL(6,2),
  max_hrv DECIMAL(6,2),

  -- Vitals - Breathing
  avg_breathing_rate DECIMAL(4,2),
  min_breathing_rate DECIMAL(4,2),
  max_breathing_rate DECIMAL(4,2),

  -- Sleep stages (stored in minutes)
  light_sleep_minutes INTEGER,
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  awake_minutes INTEGER,

  -- Sleep stage percentages (0-100)
  light_sleep_pct DECIMAL(5,2),
  deep_sleep_pct DECIMAL(5,2),
  rem_sleep_pct DECIMAL(5,2),
  awake_pct DECIMAL(5,2),

  -- Environment
  avg_bed_temp DECIMAL(5,2),
  avg_room_temp DECIMAL(5,2),
  avg_room_humidity DECIMAL(5,2),

  -- Bed temperature settings (what user set)
  bed_temp_level INTEGER,

  -- Timestamps
  sleep_start_time TIMESTAMPTZ,
  sleep_end_time TIMESTAMPTZ,

  -- Tossing and turning
  toss_and_turn_count INTEGER,

  -- Raw API response for future analysis
  raw_data JSONB,

  -- Tracking
  synced_from_api BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One session per user per night
  UNIQUE(user_id, date)
);

ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read own sessions + linked users' sessions
CREATE POLICY "Users can read own sleep sessions" ON sleep_sessions
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = sleep_sessions.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own sleep sessions" ON sleep_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep sessions" ON sleep_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep sessions" ON sleep_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SLEEP PROTOCOL CORRELATION
-- Links sleep sessions to supplements/protocols taken that day
-- =============================================
CREATE TABLE IF NOT EXISTS sleep_protocol_correlation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sleep_session_id UUID REFERENCES sleep_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Snapshot of supplements taken that day
  -- Format: [{ id, name, brand, dose, dose_unit, timing, taken_at }]
  supplements_taken JSONB DEFAULT '[]',

  -- Snapshot of routine items completed
  -- Format: [{ routine_id, routine_name, item_id, item_title, completed_at }]
  routine_items_completed JSONB DEFAULT '[]',

  -- Any relevant biomarkers from that day
  -- Format: [{ id, name, value, unit }]
  biomarkers_recorded JSONB DEFAULT '[]',

  -- User notes about that day (diet, stress, exercise, etc.)
  notes TEXT,

  -- Flags for analysis
  alcohol_consumed BOOLEAN,
  caffeine_after_noon BOOLEAN,
  exercise_that_day BOOLEAN,
  high_stress_day BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One correlation per sleep session
  UNIQUE(sleep_session_id)
);

ALTER TABLE sleep_protocol_correlation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sleep correlations" ON sleep_protocol_correlation
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = sleep_protocol_correlation.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own sleep correlations" ON sleep_protocol_correlation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep correlations" ON sleep_protocol_correlation
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep correlations" ON sleep_protocol_correlation
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SYNC SCHEDULES
-- User preferences for when to sync each integration
-- =============================================
CREATE TABLE IF NOT EXISTS sync_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Integration type (extensible for future integrations like Oura, Whoop, etc.)
  integration_type TEXT NOT NULL CHECK (integration_type IN ('eight_sleep', 'oura', 'whoop', 'garmin', 'apple_health')),

  -- Schedule settings
  is_enabled BOOLEAN DEFAULT true,
  sync_time TIME DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One schedule per user per integration type
  UNIQUE(user_id, integration_type)
);

ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync schedules" ON sync_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync schedules" ON sync_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync schedules" ON sync_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync schedules" ON sync_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Eight Sleep Integrations
CREATE INDEX IF NOT EXISTS idx_eight_sleep_integrations_user_id
  ON eight_sleep_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_eight_sleep_integrations_sync_enabled
  ON eight_sleep_integrations(sync_enabled) WHERE sync_enabled = true;

-- Sleep Sessions
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id
  ON sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_date
  ON sleep_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_date
  ON sleep_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_woke_2_4_am
  ON sleep_sessions(user_id, woke_between_2_and_4_am)
  WHERE woke_between_2_and_4_am = true;

-- Sleep Protocol Correlation
CREATE INDEX IF NOT EXISTS idx_sleep_protocol_correlation_user_id
  ON sleep_protocol_correlation(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_protocol_correlation_date
  ON sleep_protocol_correlation(date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_protocol_correlation_session
  ON sleep_protocol_correlation(sleep_session_id);

-- Sync Schedules
CREATE INDEX IF NOT EXISTS idx_sync_schedules_user_id
  ON sync_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_enabled
  ON sync_schedules(is_enabled, integration_type) WHERE is_enabled = true;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_eight_sleep_integrations_updated_at
  BEFORE UPDATE ON eight_sleep_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sleep_sessions_updated_at
  BEFORE UPDATE ON sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_schedules_updated_at
  BEFORE UPDATE ON sync_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get sleep analysis summary for a user
CREATE OR REPLACE FUNCTION get_sleep_analysis(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_nights INTEGER,
  avg_sleep_score DECIMAL,
  avg_deep_sleep_pct DECIMAL,
  avg_rem_sleep_pct DECIMAL,
  avg_hrv DECIMAL,
  avg_time_slept_hours DECIMAL,
  nights_with_2_4_am_wake INTEGER,
  wake_2_4_am_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_nights,
    ROUND(AVG(ss.sleep_score)::DECIMAL, 1) as avg_sleep_score,
    ROUND(AVG(ss.deep_sleep_pct)::DECIMAL, 1) as avg_deep_sleep_pct,
    ROUND(AVG(ss.rem_sleep_pct)::DECIMAL, 1) as avg_rem_sleep_pct,
    ROUND(AVG(ss.avg_hrv)::DECIMAL, 1) as avg_hrv,
    ROUND(AVG(ss.time_slept / 60.0)::DECIMAL, 2) as avg_time_slept_hours,
    SUM(CASE WHEN ss.woke_between_2_and_4_am THEN 1 ELSE 0 END)::INTEGER as nights_with_2_4_am_wake,
    ROUND(
      (SUM(CASE WHEN ss.woke_between_2_and_4_am THEN 1 ELSE 0 END)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 1
    ) as wake_2_4_am_rate
  FROM sleep_sessions ss
  WHERE ss.user_id = p_user_id
    AND ss.date >= CURRENT_DATE - p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compare sleep by supplement protocol
CREATE OR REPLACE FUNCTION compare_sleep_by_protocol(
  p_user_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  supplement_name TEXT,
  nights_taken INTEGER,
  avg_sleep_score DECIMAL,
  avg_deep_sleep_pct DECIMAL,
  avg_hrv DECIMAL,
  wake_2_4_am_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    supp->>'name' as supplement_name,
    COUNT(*)::INTEGER as nights_taken,
    ROUND(AVG(ss.sleep_score)::DECIMAL, 1) as avg_sleep_score,
    ROUND(AVG(ss.deep_sleep_pct)::DECIMAL, 1) as avg_deep_sleep_pct,
    ROUND(AVG(ss.avg_hrv)::DECIMAL, 1) as avg_hrv,
    ROUND(
      (SUM(CASE WHEN ss.woke_between_2_and_4_am THEN 1 ELSE 0 END)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 1
    ) as wake_2_4_am_rate
  FROM sleep_sessions ss
  JOIN sleep_protocol_correlation spc ON ss.id = spc.sleep_session_id
  CROSS JOIN LATERAL jsonb_array_elements(spc.supplements_taken) as supp
  WHERE ss.user_id = p_user_id
    AND ss.date >= CURRENT_DATE - p_days
  GROUP BY supp->>'name'
  ORDER BY nights_taken DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE eight_sleep_integrations IS 'Stores Eight Sleep account credentials and sync preferences per user';
COMMENT ON TABLE sleep_sessions IS 'Stores nightly sleep data pulled from Eight Sleep API';
COMMENT ON TABLE sleep_protocol_correlation IS 'Links sleep sessions to supplements/protocols taken that day for analysis';
COMMENT ON TABLE sync_schedules IS 'User preferences for automatic data sync timing';

COMMENT ON COLUMN sleep_sessions.woke_between_2_and_4_am IS 'Flag for cortisol/blood sugar wake pattern analysis';
COMMENT ON COLUMN sleep_sessions.raw_data IS 'Full Eight Sleep API response for future feature extraction';
COMMENT ON COLUMN eight_sleep_integrations.side IS 'Which side of the Eight Sleep mattress (left/right/solo for single user)';
-- Supplement Enhancements Migration
-- Adds: reason, mechanism, timing_reason, standardized timing, goal linking

-- =============================================
-- ADD NEW COLUMNS TO SUPPLEMENTS
-- =============================================

-- Why taking this supplement (e.g., "Phospholipid-bound omega-3s + astaxanthin + choline")
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS reason TEXT;

-- How it works (e.g., "Phospholipid form integrates directly into cell membranes")
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS mechanism TEXT;

-- Why at this specific time (e.g., "cognitive benefits during waking hours")
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS timing_reason TEXT;

-- Specific time when timing = 'specific' (e.g., '14:00')
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS timing_specific TIME;

-- =============================================
-- STANDARDIZE TIMING VALUES
-- =============================================

-- First, migrate existing timing values to new format
UPDATE supplements SET timing = 'wake_up' WHERE LOWER(timing) IN ('wake up', 'wakeup', 'upon waking', 'wake-up', 'waking');
UPDATE supplements SET timing = 'am' WHERE LOWER(timing) IN ('am', 'morning', 'morning after breakfast', 'breakfast', 'with breakfast');
UPDATE supplements SET timing = 'lunch' WHERE LOWER(timing) IN ('lunch', 'midday', 'noon', 'with lunch', 'afternoon');
UPDATE supplements SET timing = 'pm' WHERE LOWER(timing) IN ('pm');
UPDATE supplements SET timing = 'dinner' WHERE LOWER(timing) IN ('dinner', 'evening', 'with dinner', 'night', 'with food');
UPDATE supplements SET timing = 'before_bed' WHERE LOWER(timing) IN ('before bed', 'bedtime', 'before sleep', 'nighttime', 'sleep', 'bed');

-- Set any remaining non-standard values to NULL (will need manual update)
UPDATE supplements SET timing = NULL
WHERE timing IS NOT NULL
AND timing NOT IN ('wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed', 'specific');

-- Drop existing constraint if any
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timing_check;

-- Add check constraint for timing (allows NULL for flexibility)
ALTER TABLE supplements ADD CONSTRAINT supplements_timing_check
  CHECK (timing IS NULL OR timing IN ('wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed', 'specific'));

-- =============================================
-- SUPPLEMENT-GOALS JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS supplement_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID REFERENCES supplements(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplement_id, goal_id)
);

-- Enable RLS
ALTER TABLE supplement_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for re-running)
DROP POLICY IF EXISTS "Users can read own supplement goals" ON supplement_goals;
DROP POLICY IF EXISTS "Users can insert own supplement goals" ON supplement_goals;
DROP POLICY IF EXISTS "Users can delete own supplement goals" ON supplement_goals;

-- Users can read supplement_goals for their own supplements
CREATE POLICY "Users can read own supplement goals" ON supplement_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM supplements
      WHERE supplements.id = supplement_goals.supplement_id
      AND supplements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own supplement goals" ON supplement_goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM supplements
      WHERE supplements.id = supplement_goals.supplement_id
      AND supplements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own supplement goals" ON supplement_goals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM supplements
      WHERE supplements.id = supplement_goals.supplement_id
      AND supplements.user_id = auth.uid()
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_supplement_goals_supplement ON supplement_goals(supplement_id);
CREATE INDEX IF NOT EXISTS idx_supplement_goals_goal ON supplement_goals(goal_id);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN supplements.reason IS 'Why taking this supplement (benefits, nutrients provided)';
COMMENT ON COLUMN supplements.mechanism IS 'How the supplement works (mechanism of action)';
COMMENT ON COLUMN supplements.timing_reason IS 'Why taken at this specific time';
COMMENT ON COLUMN supplements.timing_specific IS 'Exact time when timing = specific';
COMMENT ON COLUMN supplements.timing IS 'When to take: wake_up, am, lunch, pm, dinner, before_bed, specific';
COMMENT ON TABLE supplement_goals IS 'Links supplements to health goals (many-to-many)';
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
-- Equipment/Devices Table Migration
-- For tracking health devices like iRestore, Dr. Pen, Eight Sleep, LED masks, etc.

-- =============================================
-- EQUIPMENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT, -- e.g., 'LLLT', 'microneedling', 'sleep', 'skincare', 'recovery'
  purpose TEXT, -- e.g., 'Hair loss treatment', 'Sleep temperature regulation'
  specs JSONB DEFAULT '{}', -- Flexible key specs like {"diodes": 500, "wavelength": "triple"}

  -- Usage protocol
  usage_frequency TEXT, -- e.g., 'daily', 'weekly', '3-5x/week'
  usage_timing TEXT, -- e.g., 'morning, after shower', 'evening, after retinol'
  usage_duration TEXT, -- e.g., '25 minutes', 'all night'
  usage_protocol TEXT, -- Detailed protocol notes
  contraindications TEXT, -- e.g., 'Skip minoxidil 24hrs after', 'Stop 5-7 days before laser'

  -- Purchase info
  purchase_date DATE,
  purchase_price DECIMAL,
  purchase_url TEXT,
  warranty_expiry DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies (matching supplements pattern)
CREATE POLICY "Users can read own equipment" ON equipment
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = equipment.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own equipment" ON equipment
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own equipment" ON equipment
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own equipment" ON equipment
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_is_active ON equipment(is_active);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);

-- Updated at trigger
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
-- Supplement Serving Size Migration
-- Adds: serving_size, intake_form, intake_quantity columns
--
-- This allows proper tracking of:
-- - How many units (capsules, scoops, etc.) = 1 serving
-- - What form the supplement comes in (capsule, powder, liquid, etc.)
-- - How many units the user takes per dose
--
-- Example: A bottle of 180 capsules with serving_size=2 means:
--   - 90 servings per container
--   - If dose_per_serving=1000mg, then each capsule is 500mg

-- =============================================
-- ADD NEW COLUMNS TO SUPPLEMENTS
-- =============================================

-- How many units (capsules, scoops, etc.) make up 1 serving
-- Default 1 since most supplements have 1 unit = 1 serving
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS serving_size INTEGER DEFAULT 1;

-- Physical form of the supplement (capsule, powder, liquid, spray, gummy, patch)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS intake_form TEXT;

-- How many units the user takes per dose (their personal intake, not serving size)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS intake_quantity INTEGER DEFAULT 1;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN supplements.serving_size IS 'Number of units (capsules, scoops, etc.) per serving. E.g., 2 capsules = 1 serving';
COMMENT ON COLUMN supplements.intake_form IS 'Physical form: capsule, powder, liquid, spray, gummy, patch';
COMMENT ON COLUMN supplements.intake_quantity IS 'How many units the user takes per dose';
-- Add product data tracking fields to supplements
-- Tracks whether product data was entered by human or AI, and when product specs were last updated

-- Add product_data_source column ('human' or 'ai'), null by default until data is entered
ALTER TABLE supplements
ADD COLUMN IF NOT EXISTS product_data_source TEXT CHECK (product_data_source IN ('human', 'ai'));

-- Add product_updated_at column for tracking when product specs were last updated
ALTER TABLE supplements
ADD COLUMN IF NOT EXISTS product_updated_at TIMESTAMPTZ;

-- Create index for filtering by data source
CREATE INDEX IF NOT EXISTS idx_supplements_product_data_source ON supplements(product_data_source);

-- Update existing records to have product_updated_at match their created_at if they have product data
UPDATE supplements
SET product_updated_at = updated_at
WHERE product_updated_at IS NULL
  AND (brand IS NOT NULL OR price IS NOT NULL OR servings_per_container IS NOT NULL);
-- Migration: Supplement frequency and timing improvements
-- Changes:
-- 1. Add `timings` TEXT[] column for multi-select timing (replaces single `timing`)
-- 2. Add `frequency_days` TEXT[] for custom day selection (e.g., ['mon', 'wed', 'fri'])
-- 3. Migrate existing timing values to timings array
-- 4. Update frequency constraint for new values

-- Add timings array column (multi-select: wake_up, am, lunch, pm, dinner, before_bed)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS timings TEXT[];

-- Add frequency_days array column (for custom frequency: sun, mon, tue, wed, thu, fri, sat)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS frequency_days TEXT[];

-- Migrate existing timing values to timings array
UPDATE supplements
SET timings = ARRAY[timing]
WHERE timing IS NOT NULL
  AND timing != ''
  AND (timings IS NULL OR array_length(timings, 1) IS NULL);

-- Drop old timing constraint if exists
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timing_check;

-- Add constraint for timings array values
ALTER TABLE supplements ADD CONSTRAINT supplements_timings_check
  CHECK (timings IS NULL OR timings <@ ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed', 'specific']::TEXT[]);

-- Add constraint for frequency_days array values
ALTER TABLE supplements ADD CONSTRAINT supplements_frequency_days_check
  CHECK (frequency_days IS NULL OR frequency_days <@ ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']::TEXT[]);

-- Add constraint for frequency values (updated options)
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_frequency_check;
ALTER TABLE supplements ADD CONSTRAINT supplements_frequency_check
  CHECK (frequency IS NULL OR frequency IN ('daily', 'every_other_day', 'custom', 'as_needed'));

-- Migrate old frequency values to new values
UPDATE supplements SET frequency = 'daily' WHERE frequency IN ('twice_daily', 'three_times_daily');
UPDATE supplements SET frequency = 'custom' WHERE frequency = 'weekly';
-- Migration: Simplify supplement categories from 10 to 5
-- Old categories: vitamin, mineral, amino_acid, herb, probiotic, omega, antioxidant, hormone, enzyme, other
-- New categories: vitamin_mineral, amino_protein, herb_botanical, probiotic, other

-- Update vitamin and mineral to vitamin_mineral
UPDATE supplements SET category = 'vitamin_mineral' WHERE category IN ('vitamin', 'mineral');

-- Update amino_acid to amino_protein
UPDATE supplements SET category = 'amino_protein' WHERE category = 'amino_acid';

-- Update herb to herb_botanical
UPDATE supplements SET category = 'herb_botanical' WHERE category = 'herb';

-- Update omega, antioxidant, hormone, enzyme to other
UPDATE supplements SET category = 'other' WHERE category IN ('omega', 'antioxidant', 'hormone', 'enzyme');

-- probiotic and other remain unchanged
-- Migration: Add 'bed' timing option
-- Separates "Before Bed" and "Bed" as distinct timing options

-- Drop existing constraint
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timings_check;

-- Add updated constraint with 'bed' option
ALTER TABLE supplements ADD CONSTRAINT supplements_timings_check
  CHECK (timings IS NULL OR timings <@ ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed', 'bed', 'specific']::TEXT[]);
-- Facial Products (Skincare) Table
-- Structure similar to supplements but adapted for facial skincare products

-- =============================================
-- FACIAL PRODUCTS
-- =============================================
CREATE TABLE IF NOT EXISTS facial_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,

  -- Application details
  step_order INTEGER, -- Order in routine (1, 2, 3, etc.)
  application_form TEXT, -- cream, gel, lotion, oil, serum, liquid, spray, mask, balm, foam, powder
  application_amount TEXT, -- pea-sized, 2-3 drops, generous, etc.
  application_area TEXT, -- full_face, under_eyes, t_zone, targeted, full_face_and_neck
  application_method TEXT, -- pat, massage, apply, layer

  -- Timing (AM/PM routine)
  routines TEXT[] DEFAULT '{}', -- 'am', 'pm' (can be both)

  -- Product details
  size_amount DECIMAL, -- 50, 200, etc.
  size_unit TEXT, -- ml, oz, g
  price DECIMAL,
  purchase_url TEXT,

  -- Categorization
  category TEXT, -- cleanser, toner, essence_serum, moisturizer, sunscreen, eye_care, treatment, mask, other
  subcategory TEXT, -- oil_cleanser, water_cleanser, retinoid, vitamin_c, aha, bha, niacinamide, etc.

  -- Active ingredients
  key_ingredients TEXT[], -- Main active ingredients

  -- SPF for sunscreens
  spf_rating INTEGER,

  -- Notes and purpose
  purpose TEXT, -- Why using this product
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  product_data_source TEXT, -- 'ai' or 'human'
  product_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE facial_products ENABLE ROW LEVEL SECURITY;

-- Users can read own facial products + linked users' facial products
CREATE POLICY "Users can read own facial products" ON facial_products
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = facial_products.user_id
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own facial products" ON facial_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facial products" ON facial_products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own facial products" ON facial_products
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_facial_products_user_id ON facial_products(user_id);
CREATE INDEX IF NOT EXISTS idx_facial_products_is_active ON facial_products(is_active);
CREATE INDEX IF NOT EXISTS idx_facial_products_category ON facial_products(category);
CREATE INDEX IF NOT EXISTS idx_facial_products_routines ON facial_products USING GIN(routines);

-- Updated_at trigger
CREATE TRIGGER update_facial_products_updated_at BEFORE UPDATE ON facial_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Migration: Consolidate timing options
-- - Add 'evening' (was missing)
-- - Remove 'before_bed' (duplicate of 'bed')
-- - Migrate existing 'before_bed' values to 'bed'

-- 1. Migrate 'before_bed' to 'bed' in timings array
UPDATE supplements
SET timings = array_replace(timings, 'before_bed', 'bed')
WHERE 'before_bed' = ANY(timings);

-- 2. Migrate legacy timing field
UPDATE supplements
SET timing = 'bed'
WHERE timing = 'before_bed';

-- 3. Drop existing constraint
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timings_check;

-- 4. Add updated constraint (removed 'before_bed', added 'evening')
ALTER TABLE supplements ADD CONSTRAINT supplements_timings_check
  CHECK (timings IS NULL OR timings <@ ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed', 'specific']::TEXT[]);
-- Add usage amount columns to facial_products table for cost calculations
-- Similar to intake_quantity in supplements

-- Add new columns for usage tracking
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS usage_amount DECIMAL;
ALTER TABLE facial_products ADD COLUMN IF NOT EXISTS usage_unit TEXT;

-- Comment explaining the fields
COMMENT ON COLUMN facial_products.usage_amount IS 'Amount of product used per application (e.g., 1, 2, 0.5)';
COMMENT ON COLUMN facial_products.usage_unit IS 'Unit for usage amount (e.g., ml, pumps, drops, pea-sized)';
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
-- Migration: Add unique constraint on biomarkers (user_id, name, date_tested)
-- This prevents duplicate entries for the same biomarker on the same date

-- Step 1: Delete duplicate entries, keeping only the most recent (by created_at) for each combination
DELETE FROM biomarkers
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, name, date_tested
             ORDER BY created_at DESC
           ) as row_num
    FROM biomarkers
  ) ranked
  WHERE row_num > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE biomarkers
ADD CONSTRAINT biomarkers_user_name_date_unique
UNIQUE (user_id, name, date_tested);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT biomarkers_user_name_date_unique ON biomarkers IS
'Ensures only one entry per biomarker name per date per user';
-- Schedule & Change Log Enhancement
-- Adds schedule_items (exercises, meals), user_diet, and routine_versions tables

-- =============================================
-- SCHEDULE ITEMS (Exercises & Meals)
-- =============================================
CREATE TABLE IF NOT EXISTS schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Item classification
  item_type TEXT NOT NULL CHECK (item_type IN ('exercise', 'meal')),

  -- Common fields
  name TEXT NOT NULL,

  -- Timing (same system as supplements/equipment)
  timing TEXT CHECK (timing IN ('wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed')),
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'every_other_day', 'custom', 'as_needed')),
  frequency_days TEXT[],  -- ['mon', 'wed', 'fri'] for custom frequency

  -- Exercise-specific (NULL for meals)
  exercise_type TEXT CHECK (exercise_type IN ('hiit', 'run', 'bike', 'swim', 'strength', 'yoga', 'walk', 'stretch', 'sports', 'other')),
  duration TEXT,  -- "30 min", "1 hour", free text

  -- Meal-specific (NULL for exercises)
  meal_type TEXT CHECK (meal_type IN ('meal', 'protein_shake', 'snack')),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for schedule_items
CREATE INDEX IF NOT EXISTS idx_schedule_items_user ON schedule_items(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_active ON schedule_items(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedule_items_type ON schedule_items(user_id, item_type);

-- Enable RLS
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own schedule items" ON schedule_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule items" ON schedule_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule items" ON schedule_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule items" ON schedule_items
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_schedule_items_updated_at BEFORE UPDATE ON schedule_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- USER DIET
-- =============================================
CREATE TABLE IF NOT EXISTS user_diet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Diet type
  diet_type TEXT DEFAULT 'untracked' CHECK (diet_type IN (
    'untracked', 'standard', 'keto', 'carnivore', 'vegan',
    'vegetarian', 'mediterranean', 'paleo', 'low_fodmap', 'other'
  )),
  diet_type_other TEXT,  -- Custom name if 'other' selected

  -- Optional macros (all nullable) - just 3: P, C, F
  target_protein_g INTEGER,
  target_carbs_g INTEGER,
  target_fat_g INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_diet
CREATE INDEX IF NOT EXISTS idx_user_diet_user ON user_diet(user_id);

-- Enable RLS
ALTER TABLE user_diet ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own diet" ON user_diet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diet" ON user_diet
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diet" ON user_diet
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_diet_updated_at BEFORE UPDATE ON user_diet
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================
-- ROUTINE VERSIONS (Change Log)
-- =============================================
CREATE TABLE IF NOT EXISTS routine_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Version tracking
  version_number INTEGER NOT NULL,  -- Auto-increment per user

  -- Full snapshot (for time-travel/reconstruction)
  snapshot JSONB NOT NULL,

  -- Diff from previous version (for display)
  changes JSONB NOT NULL,

  -- User-provided context (optional)
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, version_number)
);

-- Indexes for routine_versions
CREATE INDEX IF NOT EXISTS idx_routine_versions_user ON routine_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_versions_user_version ON routine_versions(user_id, version_number DESC);

-- Enable RLS
ALTER TABLE routine_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own routine versions" ON routine_versions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routine versions" ON routine_versions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: No update/delete - versions are immutable
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
-- Chat Sessions and Messages tables for Singularity Health Chat

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    is_active BOOLEAN DEFAULT true,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    model_used VARCHAR(100),
    user_feedback VARCHAR(20) CHECK (user_feedback IN ('helpful', 'not_helpful')),
    feedback_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chat_messages (via session ownership)
CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own chat messages" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Updated_at trigger for sessions
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trigger_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_sessions_updated_at();
