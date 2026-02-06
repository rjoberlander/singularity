-- Add share_slug column to rv_locations for public sharing
-- When populated, allows public access to view the location via a readable URL

ALTER TABLE rv_locations
ADD COLUMN IF NOT EXISTS share_slug TEXT DEFAULT NULL;

-- Create unique index for fast lookup by share slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_rv_locations_share_slug
ON rv_locations(share_slug)
WHERE share_slug IS NOT NULL;

COMMENT ON COLUMN rv_locations.share_slug IS 'URL-friendly slug for public sharing. When set, location can be viewed without authentication at /rv-locations/share/[slug]';
