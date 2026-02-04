-- RV Media Deduplication Migration
-- Adds columns for content-based photo deduplication (matching trip_media pattern)

-- =============================================
-- RV LOCATION MEDIA DEDUP COLUMNS
-- =============================================

-- Add Google photo reference for tracking original photo
ALTER TABLE rv_location_media ADD COLUMN IF NOT EXISTS google_photo_reference TEXT;
-- The Google Places photo reference (photo.name) used to fetch this image

-- Add content hash for detecting identical images
ALTER TABLE rv_location_media ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
-- SHA256 hash of the image content for duplicate detection

-- =============================================
-- UNIQUE CONSTRAINT FOR DEDUPLICATION
-- =============================================

-- Create unique constraint on location_id + content_hash to prevent duplicates
-- Use a partial index that only applies when content_hash is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_rv_location_media_content_hash_unique
  ON rv_location_media(location_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Index for finding photos by google reference
CREATE INDEX IF NOT EXISTS idx_rv_location_media_google_ref
  ON rv_location_media(google_photo_reference)
  WHERE google_photo_reference IS NOT NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN rv_location_media.google_photo_reference IS 'Google Places photo reference ID';
COMMENT ON COLUMN rv_location_media.content_hash IS 'SHA256 hash of image content for deduplication';
