-- Add content hash for detecting visually identical photos
-- Google Places API can return the same photo with different reference IDs
-- This column stores a hash of the image content to prevent true duplicates

ALTER TABLE trip_media ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Create unique index on content_hash per parent to prevent storing identical images
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_content_hash_unique
  ON trip_media(parent_type, parent_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Index for faster lookups when checking for existing photos
CREATE INDEX IF NOT EXISTS idx_trip_media_content_hash
  ON trip_media(content_hash)
  WHERE content_hash IS NOT NULL;

COMMENT ON COLUMN trip_media.content_hash IS 'SHA-256 hash of image content for detecting identical photos';
