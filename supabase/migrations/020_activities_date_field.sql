-- Simplify activity model: activities have a date, not a required day_id
-- This allows adding activities directly like a calendar without pre-creating day records

-- 1. Add date field to activities (activities can now have a date directly)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS date DATE;

-- 2. Make day_id optional (nullable)
ALTER TABLE trip_activities ALTER COLUMN day_id DROP NOT NULL;

-- 3. Backfill date from existing day_id relationships
UPDATE trip_activities
SET date = trip_days.date
FROM trip_days
WHERE trip_activities.day_id = trip_days.id
  AND trip_activities.date IS NULL;

-- 4. Add segment_id directly to activities (optional, for grouping)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES trip_segments(id) ON DELETE SET NULL;

-- 5. Backfill segment_id from day's segment
UPDATE trip_activities
SET segment_id = trip_days.segment_id
FROM trip_days
WHERE trip_activities.day_id = trip_days.id
  AND trip_activities.segment_id IS NULL;

-- 6. Add constraint: activity must have either day_id OR date
ALTER TABLE trip_activities ADD CONSTRAINT activity_has_date_or_day
  CHECK (date IS NOT NULL OR day_id IS NOT NULL);

-- 7. Index for date-based queries (calendar view)
CREATE INDEX IF NOT EXISTS idx_trip_activities_date ON trip_activities(trip_id, date);
CREATE INDEX IF NOT EXISTS idx_trip_activities_segment ON trip_activities(segment_id) WHERE segment_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN trip_activities.date IS 'Activity date - can be used directly without a day record';
COMMENT ON COLUMN trip_activities.segment_id IS 'Optional segment grouping - activities can belong to segment directly';
COMMENT ON COLUMN trip_activities.day_id IS 'Optional link to day record for extra metadata (theme, weather, etc.)';
