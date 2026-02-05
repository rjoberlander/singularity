-- Add is_favorite column to rv_location_media for photo favoriting
-- Favorited photos will be sorted higher in the gallery

ALTER TABLE rv_location_media
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Create index for efficient filtering/sorting by favorite status
CREATE INDEX IF NOT EXISTS idx_rv_location_media_favorite
ON rv_location_media(location_id, is_favorite DESC, sort_order ASC);

COMMENT ON COLUMN rv_location_media.is_favorite IS 'Whether the photo is marked as a favorite - favorites sort first in gallery';
