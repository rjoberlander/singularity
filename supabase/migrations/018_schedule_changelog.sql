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
