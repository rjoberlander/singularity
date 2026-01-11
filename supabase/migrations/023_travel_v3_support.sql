-- Migration: 023_travel_v3_support.sql
-- Description: Add support for v3 travel planning workflow
--
-- V3 CHANGES:
-- 1. trip_days.schedule - JSONB column for time-based schedule items
-- 2. trip_research_items.deep_dive - JSONB for structured deep-dive content (vs. TEXT deep_dive_content)
-- 3. trip_research_items.kid_engagement already exists, but v3 uses named children (parker, charlotte, xander)
--
-- V3 Schema Changes from SIMPLIFIED-WORKFLOW-V3.md:
-- - city_info.deep_history.sections[] with title, content, relevance
-- - research_items.deep_dive with what_it_is, why_it_matters, the_story, what_youll_see
-- - research_items.kid_engagement with named children (parker, charlotte, xander) and scripts
-- - days.schedule[] with time-based activities

-- ============================================================================
-- TRIP DAYS - Add schedule column for v3 time-based activities
-- ============================================================================

-- V3 format: [{time: "9:00-11:00am", activity_name: "...", activity_type: "...", location: "...", notes: "...", is_deep_dive: true}]
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS schedule JSONB;

COMMENT ON COLUMN trip_days.schedule IS 'V3 schedule format: [{time, activity_name, activity_type, location, notes, is_deep_dive}]';

-- ============================================================================
-- TRIP RESEARCH ITEMS - Add deep_dive JSONB for v3 structured content
-- ============================================================================

-- V3 deep_dive structure:
-- {
--   what_it_is: string,
--   why_it_matters: {content: string},
--   the_story: {content: string},
--   what_youll_see: [{area: string, highlights: [{name, description}]}],
--   how_it_survived?: string,
--   interesting_facts?: string[],
--   connections?: string
-- }
ALTER TABLE trip_research_items ADD COLUMN IF NOT EXISTS deep_dive JSONB;

COMMENT ON COLUMN trip_research_items.deep_dive IS 'V3 structured deep-dive: {what_it_is, why_it_matters, the_story, what_youll_see[]}';

-- V3 photo_opportunities structure:
-- [{shot: string, where: string, when: string, tip: string}]
ALTER TABLE trip_research_items ADD COLUMN IF NOT EXISTS photo_opportunities JSONB;

COMMENT ON COLUMN trip_research_items.photo_opportunities IS 'V3 photo guide: [{shot, where, when, tip}]';

-- V3 practical info enhanced structure
-- {hours, cost: {description, adult, child, family_total, tips}, time_needed, reservation, best_time, avoid, stroller, tips[]}
ALTER TABLE trip_research_items ADD COLUMN IF NOT EXISTS practical JSONB;

COMMENT ON COLUMN trip_research_items.practical IS 'V3 practical details: {hours, cost, time_needed, reservation, best_time, avoid, stroller, tips}';

-- V3 location with area field
ALTER TABLE trip_research_items ADD COLUMN IF NOT EXISTS location JSONB;

COMMENT ON COLUMN trip_research_items.location IS 'V3 location: {area, address, latitude, longitude, google_maps_url}';

-- V3 ratings structure
ALTER TABLE trip_research_items ADD COLUMN IF NOT EXISTS ratings JSONB;

COMMENT ON COLUMN trip_research_items.ratings IS 'V3 ratings: {score, count, summary}';

-- V3 assigned_time for specific time slots (e.g., "9:00-11:00am")
ALTER TABLE trip_research_items ADD COLUMN IF NOT EXISTS assigned_time VARCHAR(50);

COMMENT ON COLUMN trip_research_items.assigned_time IS 'V3 specific time slot: "9:00-11:00am"';

-- ============================================================================
-- TRIP DAYS - Add meals and backup_plan columns
-- ============================================================================

-- V3 meals structure: {breakfast: {plan, location, notes}, lunch: {...}, dinner: {...}}
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS meals JSONB;

COMMENT ON COLUMN trip_days.meals IS 'V3 meal plans: {breakfast, lunch, dinner}';

-- V3 logistics structure: {driving, parking, tickets_needed[], tips}
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS logistics JSONB;

COMMENT ON COLUMN trip_days.logistics IS 'V3 day logistics: {driving, parking, tickets_needed, tips}';

-- V3 backup_plan structure: {if_rain, if_tired, if_kids_meltdown}
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS backup_plan JSONB;

COMMENT ON COLUMN trip_days.backup_plan IS 'V3 backup plans: {if_rain, if_tired, if_kids_meltdown}';

-- ============================================================================
-- TRIP SEGMENTS - Enhance city_info comment for v3 structure
-- ============================================================================

COMMENT ON COLUMN trip_segments.city_info IS 'V3 city info: {intro, deep_history: {sections: [{title, content, relevance}]}, culture: {overview, traditions}, cuisine: {overview, signature_foods}}';

-- V3 accommodation structure
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS accommodation JSONB;

COMMENT ON COLUMN trip_segments.accommodation IS 'V3 accommodation: {recommendation, area, why, specific_hotels[]}';

-- V3 theme field for segment
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS theme TEXT;

COMMENT ON COLUMN trip_segments.theme IS 'V3 segment theme - the story of this segment';

-- ============================================================================
-- TRIPS - Add logistics fields for skeleton import
-- ============================================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS logistics JSONB;

COMMENT ON COLUMN trips.logistics IS 'V3 trip logistics: {flights, car_rental, driving_summary, trains, ferries}';

ALTER TABLE trips ADD COLUMN IF NOT EXISTS overview TEXT;

COMMENT ON COLUMN trips.overview IS 'V3 trip overview - 2-3 paragraph trip vision and summary';

ALTER TABLE trips ADD COLUMN IF NOT EXISTS route_description TEXT;

COMMENT ON COLUMN trips.route_description IS 'V3 route description - geographical flow of the trip';

ALTER TABLE trips ADD COLUMN IF NOT EXISTS pacing_notes TEXT;

COMMENT ON COLUMN trips.pacing_notes IS 'V3 pacing notes - notes about trip pace, rest days';

ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_country VARCHAR(100);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_country_code VARCHAR(3);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE trip_days IS 'Trip days with v3 schedule support. Each day can have a time-based schedule array with specific times like "9:00-11:00am" instead of just time blocks.';

COMMENT ON TABLE trip_research_items IS 'Research items with v3 deep-dive support. deep_dive column stores structured content with what_it_is, why_it_matters, the_story, what_youll_see. kid_engagement stores named children (parker, charlotte, xander) with scripts.';
