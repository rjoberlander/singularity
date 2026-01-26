-- Fix duplicate photos root cause: Add trip-level unique constraints
-- Previously, unique constraints were scoped to (parent_type, parent_id)
-- This allowed the same photo to be inserted for different parent_ids
-- Now we enforce uniqueness at the trip level

-- First, remove any existing duplicates within each trip (keep the earliest one)
DELETE FROM trip_media a
USING trip_media b
WHERE a.trip_id = b.trip_id
  AND a.content_hash = b.content_hash
  AND a.content_hash IS NOT NULL
  AND a.created_at > b.created_at;

DELETE FROM trip_media a
USING trip_media b
WHERE a.trip_id = b.trip_id
  AND a.file_url = b.file_url
  AND a.created_at > b.created_at;

-- Create trip-level unique constraint on content_hash
-- Same image content should never appear twice in a trip
DROP INDEX IF EXISTS idx_trip_media_content_hash_unique;
CREATE UNIQUE INDEX idx_trip_media_content_hash_trip_unique
  ON trip_media(trip_id, content_hash)
  WHERE content_hash IS NOT NULL;

-- Create trip-level unique constraint on file_url
-- Same file URL should never appear twice in a trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_file_url_trip_unique
  ON trip_media(trip_id, file_url);

-- Keep the parent-level google_photo_reference constraint (for reference tracking)
-- But add a trip-level one as well
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_media_google_photo_trip_unique
  ON trip_media(trip_id, google_photo_reference)
  WHERE google_photo_reference IS NOT NULL;

COMMENT ON INDEX idx_trip_media_content_hash_trip_unique IS 'Prevents duplicate images by content within a trip';
COMMENT ON INDEX idx_trip_media_file_url_trip_unique IS 'Prevents duplicate file URLs within a trip';
COMMENT ON INDEX idx_trip_media_google_photo_trip_unique IS 'Prevents duplicate Google photo references within a trip';
