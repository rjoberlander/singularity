-- Migration: 024_travel_skeleton_support.sql
-- Description: Add support for trip skeleton import (Phase 1 workflow)
--
-- This migration adds columns needed to store the complete trip skeleton data
-- from the Trip Planner (Project 1 / Phase 1) output.

-- ============================================================================
-- TRIPS - Add missing v3 skeleton fields
-- ============================================================================

-- Note: Some of these were added in 023 but let's ensure they exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_days INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_nights INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget JSONB;

COMMENT ON COLUMN trips.total_days IS 'Total number of days in the trip';
COMMENT ON COLUMN trips.total_nights IS 'Total number of nights in the trip';
COMMENT ON COLUMN trips.budget IS 'V3 budget: {strategy, accommodation_split, splurge_moments[], save_moments[], estimated_daily, notes}';

-- ============================================================================
-- TRIP SEGMENTS - Add missing v3 skeleton fields
-- ============================================================================

-- Basic info
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS segment_number INTEGER;
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS region VARCHAR(255);
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS nights INTEGER;
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS days INTEGER;

COMMENT ON COLUMN trip_segments.segment_number IS 'Segment number (1, 2, 3, etc.)';
COMMENT ON COLUMN trip_segments.region IS 'Region name for this segment';
COMMENT ON COLUMN trip_segments.nights IS 'Number of nights at this base';
COMMENT ON COLUMN trip_segments.days IS 'Number of full or partial days';

-- Segment purpose
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS why_here TEXT;
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS key_experiences JSONB;

COMMENT ON COLUMN trip_segments.why_here IS 'Why this place is in the itinerary';
COMMENT ON COLUMN trip_segments.key_experiences IS 'Array of high-level must-do experiences for this segment';

-- Location extras
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

COMMENT ON COLUMN trip_segments.country IS 'Country name';
COMMENT ON COLUMN trip_segments.country_code IS 'ISO country code';
COMMENT ON COLUMN trip_segments.timezone IS 'Timezone (e.g., Europe/Lisbon)';

-- Driving details as JSONB
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS driving JSONB;

COMMENT ON COLUMN trip_segments.driving IS 'V3 driving info: {from_previous, to_next, car_needed_here, parking_notes, route_notes}';

-- Day trips
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS day_trips JSONB;

COMMENT ON COLUMN trip_segments.day_trips IS 'Array of day trips: [{destination, day_number, driving_time, why}]';

-- Planning metadata
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS flexibility TEXT;
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS weather_considerations TEXT;
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS booking_urgency JSONB;
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN trip_segments.priority IS 'Priority: must_do, recommended, flexible';
COMMENT ON COLUMN trip_segments.flexibility IS 'Can this segment be shortened/cut if needed?';
COMMENT ON COLUMN trip_segments.weather_considerations IS 'Weather-specific notes for this segment';
COMMENT ON COLUMN trip_segments.booking_urgency IS 'Array of items needing booking: [{item, urgency, reason}]';
-- notes column already exists as TEXT in some schemas

-- Research status tracking
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS research_status VARCHAR(20) DEFAULT 'not_started';

COMMENT ON COLUMN trip_segments.research_status IS 'Research status: not_started, in_progress, completed';

-- Add index on segment_number for ordering
CREATE INDEX IF NOT EXISTS idx_trip_segments_segment_number ON trip_segments(trip_id, segment_number);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE trip_segments IS 'Trip segments with v3 skeleton support. Stores segment shells from Phase 1 (Trip Planner) that are later filled by Phase 2 (Segment Research).';
