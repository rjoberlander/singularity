-- RV Enrichment Migration
-- Adds columns for Google reviews, AI analysis, and activity enrichment

-- =============================================
-- RV LOCATIONS ENRICHMENT COLUMNS
-- =============================================

-- Add reviews-related columns to rv_locations
ALTER TABLE rv_locations ADD COLUMN IF NOT EXISTS google_reviews JSONB;
-- Raw reviews from Google Places API: [{ author_name, rating, text, time, ... }]

ALTER TABLE rv_locations ADD COLUMN IF NOT EXISTS reviews_summary TEXT;
-- AI-generated 2-3 sentence summary of reviews

ALTER TABLE rv_locations ADD COLUMN IF NOT EXISTS reviews_highlights JSONB;
-- { positive: [{ text, author, rating }], negative: [{ text, author, rating }], summary, last_updated }

ALTER TABLE rv_locations ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
-- When the location was last enriched with Google data

-- =============================================
-- RV ACTIVITIES ENRICHMENT COLUMNS
-- =============================================

-- Add Google-related columns to rv_location_activities
ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS opening_hours JSONB;
-- { weekday_descriptions: [...], periods: [...], open_now: boolean }

ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
-- Direct link to Google Maps for this activity

ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
-- When this activity was last enriched with Google data

-- =============================================
-- RV RESEARCH SETTINGS ENHANCEMENT
-- =============================================

-- Ensure settings table has instructions column (may already exist)
ALTER TABLE rv_research_settings ADD COLUMN IF NOT EXISTS claude_instructions TEXT;
-- Claude research instructions (markdown)

-- =============================================
-- INDEXES
-- =============================================

-- Index for finding un-enriched locations
CREATE INDEX IF NOT EXISTS idx_rv_locations_enriched_at ON rv_locations(enriched_at);

-- Index for finding un-enriched activities
CREATE INDEX IF NOT EXISTS idx_rv_activities_enriched_at ON rv_location_activities(enriched_at);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN rv_locations.google_reviews IS 'Raw Google Places reviews array';
COMMENT ON COLUMN rv_locations.reviews_summary IS 'AI-generated summary of Google reviews';
COMMENT ON COLUMN rv_locations.reviews_highlights IS 'Extracted positive/negative review highlights';
COMMENT ON COLUMN rv_locations.enriched_at IS 'Timestamp of last Google enrichment';

COMMENT ON COLUMN rv_location_activities.opening_hours IS 'Google Places opening hours data';
COMMENT ON COLUMN rv_location_activities.google_maps_url IS 'Direct Google Maps URL';
COMMENT ON COLUMN rv_location_activities.enriched_at IS 'Timestamp of last Google enrichment';
