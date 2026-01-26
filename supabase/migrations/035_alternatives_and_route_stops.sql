-- Migration: 035_alternatives_and_route_stops.sql
-- Description: Add support for route stops and alternatives in trip planning
-- Date: 2024-01-25

-- ========================================
-- 1. Route stops stored at segment level as JSONB
-- These are side detours along driving routes between locations
-- ========================================
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS route_stops JSONB;

-- ========================================
-- 2. Segment-level alternatives (general backups, not linked to specific activity)
-- ========================================
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS segment_alternatives JSONB;

-- ========================================
-- 3. Extend activity alternative tracking
-- ========================================

-- Alternative type: direct_replacement = replaces a specific scheduled activity
--                   general_option = general backup option for the segment
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS alternative_type VARCHAR(20);

-- Check constraint for alternative_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trip_activities_alternative_type_check'
  ) THEN
    ALTER TABLE trip_activities
    ADD CONSTRAINT trip_activities_alternative_type_check
    CHECK (alternative_type IN ('direct_replacement', 'general_option'));
  END IF;
END $$;

-- Alternative trigger: when/why to use this alternative
-- e.g., "if the boat tour is cancelled due to weather"
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS alternative_trigger TEXT;

-- Why not scheduled: explains why this alternative wasn't put on the main schedule
-- e.g., "limited opening hours conflict with our schedule"
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS why_not_scheduled TEXT;

-- ========================================
-- 4. Index for efficient alternative lookups
-- ========================================
CREATE INDEX IF NOT EXISTS idx_trip_activities_alternatives
  ON trip_activities(alternate_to_activity_id, alternative_type)
  WHERE alternate_to_activity_id IS NOT NULL;

-- ========================================
-- 5. Comments for documentation
-- ========================================
COMMENT ON COLUMN trip_segments.route_stops IS 'JSONB array of RouteStop objects - side detours along driving routes between locations';
COMMENT ON COLUMN trip_segments.segment_alternatives IS 'JSONB array of SegmentAlternative objects - general backup activities for this segment (not linked to specific activity)';
COMMENT ON COLUMN trip_activities.alternative_type IS 'Type of alternative: direct_replacement (replaces specific activity) or general_option (general backup for segment)';
COMMENT ON COLUMN trip_activities.alternative_trigger IS 'Condition that would trigger using this alternative (e.g., "if rain", "if boat tour cancelled")';
COMMENT ON COLUMN trip_activities.why_not_scheduled IS 'Explanation of why this alternative was not put on the main schedule';
