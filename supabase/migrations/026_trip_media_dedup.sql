-- Add Google photo reference for duplicate detection
-- The google_photo_reference stores the unique Google Places photo name (e.g., "places/ChIJ.../photos/ABC123")

ALTER TABLE trip_media ADD COLUMN IF NOT EXISTS google_photo_reference VARCHAR(500);

-- Create unique index to prevent duplicate Google photos for the same parent
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_google_photo_unique
  ON trip_media(parent_type, parent_id, google_photo_reference)
  WHERE google_photo_reference IS NOT NULL;

-- Index for faster lookups when checking for existing photos
CREATE INDEX IF NOT EXISTS idx_trip_media_google_photo_ref
  ON trip_media(google_photo_reference)
  WHERE google_photo_reference IS NOT NULL;

COMMENT ON COLUMN trip_media.google_photo_reference IS 'Google Places photo name for duplicate detection';
