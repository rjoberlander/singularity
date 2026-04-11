-- DIAGNOSTIC: Compare actual photos vs tracked usage

-- 1. Total media records
SELECT 'Total rv_location_media records' as metric, COUNT(*) as count
FROM rv_location_media;

-- 2. Media with Google indicators
SELECT 'Media with google_photo_reference' as metric, COUNT(*) as count
FROM rv_location_media WHERE google_photo_reference IS NOT NULL;

SELECT 'Media with is_google_sourced = true' as metric, COUNT(*) as count
FROM rv_location_media WHERE is_google_sourced = true;

-- 3. Media NOT marked as Google sourced
SELECT 'Media NOT marked as Google sourced' as metric, COUNT(*) as count
FROM rv_location_media
WHERE is_google_sourced IS NOT TRUE;

-- 4. What's tracked in api_usage_tracking for photos
SELECT 'Tracked photo_fetch records' as metric, COUNT(*) as count
FROM api_usage_tracking
WHERE provider = 'google_places' AND api_type = 'photo_fetch';

-- 5. Activity and location counts
SELECT 'Total activities' as metric, COUNT(*) as count
FROM rv_location_activities;

SELECT 'Activities with google_place_id' as metric, COUNT(*) as count
FROM rv_location_activities WHERE google_place_id IS NOT NULL;

SELECT 'Total locations' as metric, COUNT(*) as count
FROM rv_locations;

SELECT 'Enriched locations (with google_place_id)' as metric, COUNT(*) as count
FROM rv_locations WHERE google_place_id IS NOT NULL;
