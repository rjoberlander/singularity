-- Update RV Media deduplication to allow same photo for different activities
-- The original constraint was (location_id, content_hash) which prevented
-- the same photo from existing under both campground and activities

-- Drop the old constraint
DROP INDEX IF EXISTS idx_rv_location_media_content_hash_unique;

-- Create new constraint that includes activity_id
-- This allows: same photo for campground (null) AND for an activity
-- But prevents: duplicate photos within same activity_id
CREATE UNIQUE INDEX idx_rv_location_media_content_hash_unique
  ON rv_location_media(location_id, COALESCE(activity_id, '00000000-0000-0000-0000-000000000000'::uuid), content_hash)
  WHERE content_hash IS NOT NULL;

COMMENT ON INDEX idx_rv_location_media_content_hash_unique IS
  'Prevents duplicate content within same location+activity. COALESCE handles null activity_id (campground photos).';
