-- FIX: Mark ALL photos as Google-sourced (user confirmed all are from Google)
-- Then backfill missing tracking records

-- 1. Mark all photos as Google-sourced
UPDATE rv_location_media
SET is_google_sourced = true
WHERE is_google_sourced IS NOT TRUE;

-- 2. Delete existing photo tracking to avoid duplicates, then re-insert all
DELETE FROM api_usage_tracking
WHERE provider = 'google_places' AND api_type = 'photo_fetch';

-- 3. Re-insert tracking for ALL photos
INSERT INTO api_usage_tracking (user_id, provider, api_type, count, estimated_cost_usd, context_type, context_id, created_at)
SELECT
  m.user_id,
  'google_places',
  'photo_fetch',
  1,
  0.007,
  'rv_enrichment',
  m.location_id,
  COALESCE(m.created_at, NOW())
FROM rv_location_media m
WHERE m.user_id IS NOT NULL;

-- 4. Show final counts
SELECT 'Total photos now marked as Google-sourced' as metric, COUNT(*) as count
FROM rv_location_media WHERE is_google_sourced = true;

SELECT 'Total photo_fetch tracking records' as metric, COUNT(*) as count
FROM api_usage_tracking WHERE api_type = 'photo_fetch';
