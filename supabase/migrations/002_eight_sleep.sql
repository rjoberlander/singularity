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
