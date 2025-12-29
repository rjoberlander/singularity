-- Add timezone column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add comment for documentation
COMMENT ON COLUMN users.timezone IS 'User timezone in IANA format (e.g., America/Los_Angeles)';
