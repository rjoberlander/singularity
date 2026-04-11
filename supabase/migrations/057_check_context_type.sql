-- Check context_type for all api types
SELECT api_type, context_type, COUNT(*) as count
FROM api_usage_tracking
WHERE provider = 'google_places'
  AND user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271'
GROUP BY api_type, context_type
ORDER BY api_type;
