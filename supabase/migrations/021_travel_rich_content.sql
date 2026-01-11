-- Travel Module Rich Content Support
-- Adds fields for deep-dive content, kid engagement, practical details
-- Designed to store comprehensive tour-guide-style information

-- =============================================
-- TRIP SEGMENTS - Extended Content Fields
-- =============================================

-- Local food/dishes to try
-- Structure: [{name: string, description: string, where_to_find?: string}]
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS local_food JSONB;

-- Segment-specific packing list
-- Structure: [{item: string, category?: string, notes?: string}]
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS packing_list JSONB;

-- Booking priorities and timing
-- Structure: {book_now: [{item, reason}], book_week_ahead: [{item, reason}]}
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS booking_priorities JSONB;

-- =============================================
-- TRIP DAYS - Theme Field
-- =============================================

-- Daily theme (e.g., "Gentle landing, first taste of Lisbon, jet-lag management")
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS theme VARCHAR(500);

-- =============================================
-- TRIP ACTIVITIES - Rich Content Fields
-- =============================================

-- Estimated duration in minutes (e.g., 90 for "1.5-2 hours")
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

-- Practical details in structured format
-- Structure: {
--   hours: string,
--   cost_breakdown: {adults: string, seniors?: string, kids?: string, under_x_free?: string},
--   time_needed: string,
--   avoid_times: string[],
--   best_times: string[],
--   getting_there: string,
--   combo_tickets: string
-- }
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS practical_details JSONB;

-- Kid engagement tips organized by age
-- Structure: {
--   age_7: string[],
--   age_5: string[],
--   age_3: string[],
--   general: string[]
-- }
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS kid_engagement JSONB;

-- Deep dive content - the full narrative "Why it matters" section
-- This is the long-form tour-guide style content
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS deep_dive_content TEXT;

-- What to see - list of specific things to look for
-- Structure: [{name: string, description?: string, location_hint?: string}]
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS what_to_see JSONB;

-- Historical context specific to this place
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS historical_context TEXT;

-- Architecture notes (for monuments, churches, palaces)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS architecture_notes TEXT;

-- Stroller/accessibility info
-- Structure: {stroller_friendly: boolean, notes: string, alternatives?: string}
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS accessibility_info JSONB;

-- Safety warnings and important notes
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS warnings TEXT[];

-- =============================================
-- DOCUMENTATION
-- =============================================

-- Segment fields
COMMENT ON COLUMN trip_segments.local_food IS 'Local dishes to try: [{name, description, where_to_find}]';
COMMENT ON COLUMN trip_segments.packing_list IS 'Segment-specific packing list: [{item, category, notes}]';
COMMENT ON COLUMN trip_segments.booking_priorities IS 'Booking timing: {book_now: [], book_week_ahead: []}';

-- Day fields
COMMENT ON COLUMN trip_days.theme IS 'Daily theme (e.g., "Gentle landing, jet-lag management")';

-- Activity fields
COMMENT ON COLUMN trip_activities.estimated_duration_minutes IS 'Estimated visit duration in minutes';
COMMENT ON COLUMN trip_activities.practical_details IS 'Structured practical info: {hours, cost_breakdown, time_needed, avoid_times, etc}';
COMMENT ON COLUMN trip_activities.kid_engagement IS 'Tips for engaging kids by age: {age_7: [], age_5: [], age_3: [], general: []}';
COMMENT ON COLUMN trip_activities.deep_dive_content IS 'Long-form tour-guide narrative - "Why it matters" content';
COMMENT ON COLUMN trip_activities.what_to_see IS 'Specific things to look for: [{name, description, location_hint}]';
COMMENT ON COLUMN trip_activities.historical_context IS 'Place-specific historical background';
COMMENT ON COLUMN trip_activities.architecture_notes IS 'Architectural style and features description';
COMMENT ON COLUMN trip_activities.accessibility_info IS 'Stroller/accessibility: {stroller_friendly, notes, alternatives}';
COMMENT ON COLUMN trip_activities.warnings IS 'Safety warnings and important cautions';
