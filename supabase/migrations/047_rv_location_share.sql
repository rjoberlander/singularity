-- Add share_token column to rv_locations for public sharing
-- When populated, allows public access to view the location

ALTER TABLE rv_locations
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;

-- Create unique index for fast lookup by share token
CREATE UNIQUE INDEX IF NOT EXISTS idx_rv_locations_share_token
ON rv_locations(share_token)
WHERE share_token IS NOT NULL;

COMMENT ON COLUMN rv_locations.share_token IS 'UUID token for public sharing. When set, location can be viewed without authentication at /rv-locations/share/[token]';
