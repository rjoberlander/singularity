-- Add missing columns to rv_location_activities for Google enrichment
-- These columns were used by the enrichment service but didn't exist in the table

-- Google review count
ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Google Maps URL
ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Enrichment timestamp
ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Opening hours (JSONB for flexibility)
ALTER TABLE rv_location_activities ADD COLUMN IF NOT EXISTS opening_hours JSONB;
