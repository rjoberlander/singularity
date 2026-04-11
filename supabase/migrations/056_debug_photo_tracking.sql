-- Debug: Check photo tracking vs other types

-- 1. Compare tracking counts by api_type
SELECT api_type, COUNT(*) as count
FROM api_usage_tracking
WHERE provider = 'google_places'
GROUP BY api_type;

-- 2. Check if photo records have correct user_id
SELECT 'photo_fetch with user b201a860...' as metric, COUNT(*) as count
FROM api_usage_tracking
WHERE api_type = 'photo_fetch'
  AND user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271';

-- 3. Check date range for photos
SELECT
  api_type,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM api_usage_tracking
WHERE provider = 'google_places'
GROUP BY api_type;

-- 4. Sample of photo_fetch records
SELECT user_id, api_type, count, created_at
FROM api_usage_tracking
WHERE api_type = 'photo_fetch'
LIMIT 5;
