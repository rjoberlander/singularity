-- Migration: 034_schedule_validation.sql
-- Description: Add validation fields for Smart Schedule Assembly feature
--
-- Features:
-- 1. Track Google data fetch timestamp on activities
-- 2. Add validation status and issues to daily_schedule_items
-- 3. Support for opening hours validation, travel time checks, amenity validation

-- ============================================================================
-- TRIP ACTIVITIES - Add Google data fetch tracking and photos
-- ============================================================================

ALTER TABLE trip_activities
  ADD COLUMN IF NOT EXISTS google_data_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_photos JSONB;

COMMENT ON COLUMN trip_activities.google_data_fetched_at IS 'Timestamp when Google Places data was last fetched for this activity';
COMMENT ON COLUMN trip_activities.google_photos IS 'Array of Google Place photo references: [{photo_reference, width, height}]';

-- ============================================================================
-- DAILY SCHEDULE ITEMS - Add validation status and issues
-- ============================================================================

ALTER TABLE daily_schedule_items
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'valid', 'warning', 'error')),
  ADD COLUMN IF NOT EXISTS validation_issues JSONB;

COMMENT ON COLUMN daily_schedule_items.validation_status IS 'Validation status: pending (not validated), valid, warning, error';
COMMENT ON COLUMN daily_schedule_items.validation_issues IS 'Array of validation issues: [{severity, category, message, details}]';

-- Index for filtering by validation status
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_validation_status
  ON daily_schedule_items(validation_status)
  WHERE validation_status IN ('warning', 'error');

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE daily_schedule_items IS 'Phase 4 Daily Assembly: 15-minute precision schedule items with travel times, calendar sync, and validation status';
