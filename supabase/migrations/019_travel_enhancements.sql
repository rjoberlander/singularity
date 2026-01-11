-- Travel Module Enhancements
-- Add fields for detailed itinerary support and better Google Calendar sync

-- =============================================
-- TRIP DAYS ENHANCEMENTS
-- =============================================

-- Add theme for day (e.g., "Gentle landing day", "Castle exploration morning")
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS theme VARCHAR(255);

-- Add alternate activities as structured data
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS alternate_activities JSONB;  -- [{name, description, why}]

-- =============================================
-- TRIP ACTIVITIES ENHANCEMENTS
-- =============================================

-- Duration in minutes (for activities without explicit end_time)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Booking URL (separate from general website)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Kid-friendliness as numeric rating (1-5 scale)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS kid_rating DECIMAL(2,1) CHECK (kid_rating >= 1 AND kid_rating <= 5);

-- Calendar sync tracking
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS calendar_synced_at TIMESTAMPTZ;

-- Link to alternate activity (when this activity is an alternative to another)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS alternate_to_activity_id UUID REFERENCES trip_activities(id) ON DELETE SET NULL;

-- Priority/importance level
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS priority VARCHAR(20) CHECK (priority IN ('must_do', 'recommended', 'optional', 'if_time'));

-- Confirmation status
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(20) DEFAULT 'unconfirmed'
  CHECK (confirmation_status IN ('unconfirmed', 'pending', 'confirmed', 'cancelled'));
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS confirmation_number VARCHAR(100);

-- Index for calendar sync lookups
CREATE INDEX IF NOT EXISTS idx_trip_activities_calendar_sync ON trip_activities(calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- Index for alternate activities
CREATE INDEX IF NOT EXISTS idx_trip_activities_alternate ON trip_activities(alternate_to_activity_id) WHERE alternate_to_activity_id IS NOT NULL;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN trip_days.theme IS 'Day theme/focus (e.g., "Gentle landing day", "Beach day")';
COMMENT ON COLUMN trip_days.alternate_activities IS 'JSON array of backup activities: [{name, description, why}]';

COMMENT ON COLUMN trip_activities.duration_minutes IS 'Estimated duration when end_time not specified';
COMMENT ON COLUMN trip_activities.booking_url IS 'Direct booking/reservation URL';
COMMENT ON COLUMN trip_activities.kid_rating IS 'Kid-friendliness rating 1-5 stars';
COMMENT ON COLUMN trip_activities.calendar_synced_at IS 'Last time synced to Google Calendar';
COMMENT ON COLUMN trip_activities.alternate_to_activity_id IS 'If this is an alternate, links to the main activity';
COMMENT ON COLUMN trip_activities.priority IS 'Activity priority: must_do, recommended, optional, if_time';
COMMENT ON COLUMN trip_activities.confirmation_status IS 'Booking status: unconfirmed, pending, confirmed, cancelled';
COMMENT ON COLUMN trip_activities.confirmation_number IS 'Booking/reservation confirmation number';
