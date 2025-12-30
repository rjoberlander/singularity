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
