-- Check date distribution of tracked photos
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as count
FROM api_usage_tracking
WHERE api_type = 'photo_fetch'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Check date distribution of actual photos
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as count
FROM rv_location_media
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
