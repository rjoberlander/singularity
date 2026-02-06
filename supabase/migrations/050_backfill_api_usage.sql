-- BACKFILL HISTORICAL API USAGE
-- Run this ONCE after 049_api_usage_and_enrichment_jobs_safe.sql
-- Estimates historical usage based on existing data in the database

-- 1. Count photos downloaded from Google
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
WHERE m.google_photo_reference IS NOT NULL
  AND m.user_id IS NOT NULL;

-- 2. Count enriched locations (text search)
INSERT INTO api_usage_tracking (user_id, provider, api_type, count, estimated_cost_usd, context_type, context_id, created_at)
SELECT
  l.user_id,
  'google_places',
  'text_search',
  1,
  0.032,
  'rv_enrichment',
  l.id,
  COALESCE(l.enriched_at, NOW())
FROM rv_locations l
WHERE l.enriched_at IS NOT NULL
  AND l.google_place_id IS NOT NULL;

-- 3. Count enriched locations (place details)
INSERT INTO api_usage_tracking (user_id, provider, api_type, count, estimated_cost_usd, context_type, context_id, created_at)
SELECT
  l.user_id,
  'google_places',
  'place_details',
  1,
  0.017,
  'rv_enrichment',
  l.id,
  COALESCE(l.enriched_at, NOW())
FROM rv_locations l
WHERE l.enriched_at IS NOT NULL
  AND l.google_place_id IS NOT NULL;

-- 4. Count enriched activities (text search)
INSERT INTO api_usage_tracking (user_id, provider, api_type, count, estimated_cost_usd, context_type, context_id, created_at)
SELECT
  l.user_id,
  'google_places',
  'text_search',
  1,
  0.032,
  'rv_enrichment',
  a.location_id,
  COALESCE(a.updated_at, NOW())
FROM rv_location_activities a
JOIN rv_locations l ON a.location_id = l.id
WHERE a.google_place_id IS NOT NULL;

-- 5. Count enriched activities (place details)
INSERT INTO api_usage_tracking (user_id, provider, api_type, count, estimated_cost_usd, context_type, context_id, created_at)
SELECT
  l.user_id,
  'google_places',
  'place_details',
  1,
  0.017,
  'rv_enrichment',
  a.location_id,
  COALESCE(a.updated_at, NOW())
FROM rv_location_activities a
JOIN rv_locations l ON a.location_id = l.id
WHERE a.google_place_id IS NOT NULL;
