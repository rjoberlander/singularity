-- Check records within February 2026 date range
-- The API queries: >= '2026-02-01T00:00:00.000Z' AND <= '2026-02-28T23:59:59.999Z'

SELECT api_type, COUNT(*) as count
FROM api_usage_tracking
WHERE provider = 'google_places'
  AND user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271'
  AND created_at >= '2026-02-01T00:00:00.000Z'
  AND created_at <= '2026-02-28T23:59:59.999Z'
GROUP BY api_type;

-- Check what dates the photo_fetch records actually have
SELECT
  DATE(created_at) as date,
  COUNT(*) as count
FROM api_usage_tracking
WHERE api_type = 'photo_fetch'
  AND user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271'
GROUP BY DATE(created_at)
ORDER BY date;
