-- Deep enrichment: trip/segment/day-level narrative content

-- Trip-level deep overview (country background, culture, practical tips)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deep_overview JSONB;

-- Segment-level narrative synthesis (ties together accommodation + activities + meals)
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS segment_narrative JSONB;

-- Day-level tour guide narrative
ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS day_narrative TEXT;
