-- Travel Module Google Places Integration
-- Add fields to support Google Places API data for activities and segments

-- =============================================
-- TRIP ACTIVITIES - Google Places Data
-- =============================================

-- Google Place ID for caching and reference
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);

-- Google rating (1.0 - 5.0)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1)
  CHECK (google_rating IS NULL OR (google_rating >= 1.0 AND google_rating <= 5.0));

-- Number of Google reviews
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_review_count INTEGER;

-- Price level (1-4: $ to $$$$)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_price_level INTEGER
  CHECK (google_price_level IS NULL OR (google_price_level >= 1 AND google_price_level <= 4));

-- Opening hours from Google
-- Structure: {open_now: boolean, periods: [{open: {day, time}, close: {day, time}}], weekday_text: string[]}
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- Whether photos have been fetched from Google
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS photos_fetched BOOLEAN DEFAULT false;

-- Index for Google Place ID lookups
CREATE INDEX IF NOT EXISTS idx_trip_activities_google_place_id
  ON trip_activities(google_place_id) WHERE google_place_id IS NOT NULL;

-- =============================================
-- TRIP SEGMENTS - Google Places City/Region Data
-- =============================================

-- Google Place ID for the city/region
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);

-- Overall rating if available
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1)
  CHECK (google_rating IS NULL OR (google_rating >= 1.0 AND google_rating <= 5.0));

-- City population
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS population INTEGER;

-- Timezone (e.g., "Europe/Lisbon")
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- Country name
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- ISO country code (e.g., "PT", "US")
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);

-- State/Province/Region
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- Main attractions/points of interest
-- Structure: [{name: string, description?: string, type?: string}]
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS main_attractions JSONB;

-- Climate/weather summary
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS weather_summary TEXT;

-- Best time to visit recommendations
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS best_time_to_visit TEXT;

-- Local currency (e.g., "EUR", "USD")
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS local_currency VARCHAR(10);

-- Languages spoken (array)
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS languages TEXT[];

-- Whether photos have been fetched from Google
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS photos_fetched BOOLEAN DEFAULT false;

-- Index for Google Place ID lookups
CREATE INDEX IF NOT EXISTS idx_trip_segments_google_place_id
  ON trip_segments(google_place_id) WHERE google_place_id IS NOT NULL;

-- =============================================
-- TRIP MEDIA - Google Attribution Fields
-- =============================================

-- Google attribution name (required by Google TOS when displaying their photos)
ALTER TABLE trip_media ADD COLUMN IF NOT EXISTS google_attribution_name VARCHAR(255);

-- Google attribution URI (link to contributor's profile)
ALTER TABLE trip_media ADD COLUMN IF NOT EXISTS google_attribution_uri TEXT;

-- Flag to distinguish Google-sourced vs user-uploaded media
ALTER TABLE trip_media ADD COLUMN IF NOT EXISTS is_google_sourced BOOLEAN DEFAULT false;

-- Approval status for Google-sourced photos
-- NULL = not reviewed, TRUE = approved, FALSE = rejected
ALTER TABLE trip_media ADD COLUMN IF NOT EXISTS approved BOOLEAN;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_trip_media_google_sourced
  ON trip_media(is_google_sourced) WHERE is_google_sourced = true;

-- Index for filtering approved Google photos
CREATE INDEX IF NOT EXISTS idx_trip_media_approved
  ON trip_media(approved) WHERE is_google_sourced = true;

-- =============================================
-- DOCUMENTATION
-- =============================================

COMMENT ON COLUMN trip_activities.google_place_id IS 'Google Places API place ID for this activity';
COMMENT ON COLUMN trip_activities.google_rating IS 'Google rating 1.0-5.0';
COMMENT ON COLUMN trip_activities.google_review_count IS 'Number of Google reviews';
COMMENT ON COLUMN trip_activities.google_price_level IS 'Google price level 1-4 ($ to $$$$)';
COMMENT ON COLUMN trip_activities.opening_hours IS 'JSON: {open_now, periods, weekday_text}';
COMMENT ON COLUMN trip_activities.photos_fetched IS 'Whether Google photos have been fetched';

COMMENT ON COLUMN trip_segments.google_place_id IS 'Google Places API place ID for this city/region';
COMMENT ON COLUMN trip_segments.google_rating IS 'Google rating if available';
COMMENT ON COLUMN trip_segments.population IS 'City/region population';
COMMENT ON COLUMN trip_segments.timezone IS 'IANA timezone (e.g., Europe/Lisbon)';
COMMENT ON COLUMN trip_segments.country IS 'Country name';
COMMENT ON COLUMN trip_segments.country_code IS 'ISO country code';
COMMENT ON COLUMN trip_segments.region IS 'State/Province/Region';
COMMENT ON COLUMN trip_segments.main_attractions IS 'JSON array of attractions: [{name, description, type}]';
COMMENT ON COLUMN trip_segments.weather_summary IS 'Climate/weather description';
COMMENT ON COLUMN trip_segments.best_time_to_visit IS 'Best season/months to visit';
COMMENT ON COLUMN trip_segments.local_currency IS 'Local currency code';
COMMENT ON COLUMN trip_segments.languages IS 'Languages spoken (array)';
COMMENT ON COLUMN trip_segments.photos_fetched IS 'Whether Google photos have been fetched';

COMMENT ON COLUMN trip_media.google_attribution_name IS 'Google photo contributor name (required for attribution)';
COMMENT ON COLUMN trip_media.google_attribution_uri IS 'Google photo contributor profile URL';
COMMENT ON COLUMN trip_media.is_google_sourced IS 'True if photo was fetched from Google Places';
COMMENT ON COLUMN trip_media.approved IS 'Approval status: NULL=pending, TRUE=approved, FALSE=rejected';
