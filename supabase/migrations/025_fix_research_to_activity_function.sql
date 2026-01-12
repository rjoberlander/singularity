-- Migration: 025_fix_research_to_activity_function.sql
-- Description: Fix import_research_item_to_activity function for v3 schema
--
-- Issue 1: Function referenced non-existent column 'kid_notes'
-- Issue 2: deep_dive JSONB was being stored as TEXT string instead of JSONB

-- Add deep_dive JSONB column to activities for v3 structured content
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS deep_dive JSONB;
COMMENT ON COLUMN trip_activities.deep_dive IS 'V3 structured deep-dive: {what_it_is, why_it_matters, the_story, what_youll_see[]}';

-- Drop and recreate the function with correct column mappings
CREATE OR REPLACE FUNCTION import_research_item_to_activity(
  p_research_item_id UUID,
  p_day_id UUID
) RETURNS UUID AS $$
DECLARE
  v_research_item trip_research_items%ROWTYPE;
  v_activity_id UUID;
BEGIN
  -- Get the research item
  SELECT * INTO v_research_item
  FROM trip_research_items
  WHERE id = p_research_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Research item not found';
  END IF;

  -- Create the activity with v3 schema columns
  INSERT INTO trip_activities (
    trip_id,
    day_id,
    name,
    description,
    activity_type,
    time_block,
    -- Location fields (can come from v3 location JSONB or legacy columns)
    location_name,
    address,
    latitude,
    longitude,
    google_maps_url,
    google_place_id,
    -- Content
    why_its_great,
    -- V3 JSONB columns
    kid_engagement,
    deep_dive,
    deep_dive_content,
    -- Costs (from v3 practical or legacy)
    cost_estimate,
    cost_currency,
    -- Contact/booking
    website,
    booking_url,
    phone,
    reservation_required,
    -- Ratings
    google_rating,
    google_review_count,
    google_price_level,
    -- Context (legacy columns)
    historical_context,
    what_to_see,
    -- Priority
    priority,
    notes
  ) VALUES (
    v_research_item.trip_id,
    p_day_id,
    v_research_item.name,
    v_research_item.description,
    v_research_item.item_type,
    -- Use assigned_time if available, otherwise assigned_time_block
    COALESCE(v_research_item.assigned_time, v_research_item.assigned_time_block),
    -- Location: prefer v3 location JSONB, fallback to legacy columns
    COALESCE(v_research_item.location->>'area', v_research_item.location_name),
    COALESCE(v_research_item.location->>'address', v_research_item.address),
    COALESCE((v_research_item.location->>'latitude')::DECIMAL, v_research_item.latitude),
    COALESCE((v_research_item.location->>'longitude')::DECIMAL, v_research_item.longitude),
    COALESCE(v_research_item.location->>'google_maps_url', v_research_item.google_maps_url),
    v_research_item.google_place_id,
    -- Why it's great: use why_relevant
    v_research_item.why_relevant,
    -- V3 kid_engagement JSONB (contains parker, charlotte, xander scripts)
    v_research_item.kid_engagement,
    -- V3 deep_dive as JSONB (structured content)
    v_research_item.deep_dive,
    -- Legacy deep_dive_content as TEXT (fallback)
    v_research_item.deep_dive_content,
    -- Costs: prefer legacy numeric value (v3 cost strings contain currency symbols like "€40.50")
    v_research_item.cost_estimate_value,
    v_research_item.cost_currency,
    v_research_item.website,
    COALESCE(v_research_item.practical->'reservation'->>'url', v_research_item.booking_url),
    v_research_item.phone,
    -- Reservation: prefer v3 practical, fallback to legacy
    CASE
      WHEN v_research_item.practical->'reservation'->>'required' = 'true' THEN TRUE
      WHEN v_research_item.practical->'reservation'->>'required' = 'false' THEN FALSE
      ELSE v_research_item.reservation_required
    END,
    -- Ratings: prefer v3 ratings JSONB, fallback to legacy
    COALESCE((v_research_item.ratings->>'score')::DECIMAL, v_research_item.rating),
    COALESCE((v_research_item.ratings->>'count')::INTEGER, v_research_item.review_count),
    v_research_item.price_level,
    v_research_item.historical_context,
    v_research_item.what_to_see,
    v_research_item.priority,
    v_research_item.notes
  ) RETURNING id INTO v_activity_id;

  -- Update the research item to track import
  UPDATE trip_research_items
  SET
    status = 'imported',
    imported_to_activity_id = v_activity_id,
    imported_at = NOW()
  WHERE id = p_research_item_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION import_research_item_to_activity IS 'Converts a research item to an activity. Supports both v2 legacy columns and v3 JSONB columns (deep_dive, kid_engagement, location, ratings, practical).';
