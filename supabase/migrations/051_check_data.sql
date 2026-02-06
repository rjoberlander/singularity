-- Check what data exists for backfill
-- Run each SELECT separately to see results

-- 1. Check if api_usage_tracking has any data
SELECT COUNT(*) as usage_count FROM api_usage_tracking;

-- 2. Check rv_location_media with google references
SELECT COUNT(*) as google_photos_count
FROM rv_location_media
WHERE google_photo_reference IS NOT NULL;

-- 3. Check enriched locations
SELECT COUNT(*) as enriched_locations_count
FROM rv_locations
WHERE enriched_at IS NOT NULL
  AND google_place_id IS NOT NULL;

-- 4. Check activities with google data
SELECT COUNT(*) as google_activities_count
FROM rv_location_activities
WHERE google_place_id IS NOT NULL;

-- 5. Sample of rv_location_media to see structure
SELECT id, user_id, location_id, google_photo_reference, created_at
FROM rv_location_media
LIMIT 5;
