-- Migration: Add planning_progress column to trips table
-- This stores the step-by-step planning progress for guided trip planning

ALTER TABLE trips ADD COLUMN IF NOT EXISTS planning_progress JSONB DEFAULT '{
  "basics": {"auto_suggested": false, "completed": false},
  "accommodations": {"auto_suggested": false, "completed": false},
  "segments": {"auto_suggested": false, "completed": false},
  "days_activities": {"auto_suggested": false, "completed": false}
}'::jsonb;

-- Add a comment to document the column structure
COMMENT ON COLUMN trips.planning_progress IS 'Tracks planning progress for guided trip planning. Structure: {basics: {auto_suggested, completed, completed_at?}, accommodations: {...}, segments: {...}, days_activities: {...}}';
