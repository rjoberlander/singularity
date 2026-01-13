-- Migration: Specialized MCP Context Functions for Each Phase
-- These functions return all context Claude needs in one call per phase

-- ============================================================
-- Phase 1: Trip Planning Context
-- Returns: family profile, instructions, skeleton template
-- ============================================================
CREATE OR REPLACE FUNCTION get_phase1_context(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'phase', 'Trip Planning',
    'phase_number', 1,
    'family_profile', COALESCE(
      (SELECT family_profile FROM public.travel_settings WHERE user_id = p_user_id),
      '{}'::jsonb
    ),
    'instructions', get_travel_template(p_user_id, 1, 'instructions'),
    'skeleton_template', get_travel_template(p_user_id, 1, 'skeleton-template')
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_phase1_context IS 'Get all context for Phase 1 (Trip Planning) - family profile, instructions, skeleton template';

-- ============================================================
-- Phase 2: Hotel Research Context
-- Returns: family profile, instructions, hotel template, trip skeleton
-- ============================================================
CREATE OR REPLACE FUNCTION get_phase2_context(
  p_user_id uuid,
  p_trip_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_trip_skeleton jsonb;
BEGIN
  -- Get trip skeleton if trip_id provided
  IF p_trip_id IS NOT NULL THEN
    SELECT skeleton INTO v_trip_skeleton
    FROM public.trips
    WHERE id = p_trip_id AND user_id = p_user_id;
  END IF;

  SELECT jsonb_build_object(
    'phase', 'Hotel Research',
    'phase_number', 2,
    'family_profile', COALESCE(
      (SELECT family_profile FROM public.travel_settings WHERE user_id = p_user_id),
      '{}'::jsonb
    ),
    'instructions', get_travel_template(p_user_id, 2, 'instructions'),
    'hotel_research_template', get_travel_template(p_user_id, 2, 'hotel-template'),
    'trip_skeleton', COALESCE(v_trip_skeleton, '{}'::jsonb),
    'trip_id', p_trip_id
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_phase2_context IS 'Get all context for Phase 2 (Hotel Research) - family profile, instructions, hotel template, trip skeleton';

-- ============================================================
-- Phase 3: Activity Research Context
-- Returns: family profile, instructions, research template, trip skeleton, segment info
-- ============================================================
CREATE OR REPLACE FUNCTION get_phase3_context(
  p_user_id uuid,
  p_trip_id uuid DEFAULT NULL,
  p_segment_index integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_trip_skeleton jsonb;
  v_segment jsonb;
  v_hotels jsonb;
BEGIN
  -- Get trip skeleton if trip_id provided
  IF p_trip_id IS NOT NULL THEN
    SELECT skeleton INTO v_trip_skeleton
    FROM public.trips
    WHERE id = p_trip_id AND user_id = p_user_id;

    -- Get specific segment if index provided
    IF p_segment_index IS NOT NULL AND v_trip_skeleton IS NOT NULL THEN
      v_segment := v_trip_skeleton->'segments'->p_segment_index;
    END IF;

    -- Get hotels for this trip (from trip_segments table)
    SELECT jsonb_agg(
      jsonb_build_object(
        'segment_number', s.segment_number,
        'name', s.name,
        'hotel_name', s.hotel_name,
        'check_in', s.start_date,
        'check_out', s.end_date
      )
    ) INTO v_hotels
    FROM public.trip_segments s
    WHERE s.trip_id = p_trip_id AND s.hotel_name IS NOT NULL;
  END IF;

  SELECT jsonb_build_object(
    'phase', 'Activity Research',
    'phase_number', 3,
    'family_profile', COALESCE(
      (SELECT family_profile FROM public.travel_settings WHERE user_id = p_user_id),
      '{}'::jsonb
    ),
    'instructions', get_travel_template(p_user_id, 3, 'instructions'),
    'research_template', get_travel_template(p_user_id, 3, 'research-template'),
    'card_inventory', get_travel_template(p_user_id, 3, 'card-inventory'),
    'trip_skeleton', COALESCE(v_trip_skeleton, '{}'::jsonb),
    'current_segment', v_segment,
    'segment_index', p_segment_index,
    'hotels', COALESCE(v_hotels, '[]'::jsonb),
    'trip_id', p_trip_id
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_phase3_context IS 'Get all context for Phase 3 (Activity Research) - family profile, instructions, research template, trip skeleton, segment info';

-- ============================================================
-- Generic Phase Context (for phases 4+)
-- Returns: family profile and all templates for the phase
-- ============================================================
CREATE OR REPLACE FUNCTION get_phase_context(
  p_user_id uuid,
  p_phase_number integer,
  p_trip_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_trip_skeleton jsonb;
  v_templates jsonb;
  v_phase_name text;
BEGIN
  -- Get phase name
  SELECT name INTO v_phase_name
  FROM public.travel_guide_phases
  WHERE phase_number = p_phase_number;

  -- Get trip skeleton if trip_id provided
  IF p_trip_id IS NOT NULL THEN
    SELECT skeleton INTO v_trip_skeleton
    FROM public.trips
    WHERE id = p_trip_id AND user_id = p_user_id;
  END IF;

  -- Get all templates for this phase
  SELECT jsonb_object_agg(
    t.template_key,
    t.content
  ) INTO v_templates
  FROM get_travel_phase_templates(p_user_id, p_phase_number) t;

  SELECT jsonb_build_object(
    'phase', COALESCE(v_phase_name, 'Phase ' || p_phase_number),
    'phase_number', p_phase_number,
    'family_profile', COALESCE(
      (SELECT family_profile FROM public.travel_settings WHERE user_id = p_user_id),
      '{}'::jsonb
    ),
    'templates', COALESCE(v_templates, '{}'::jsonb),
    'trip_skeleton', COALESCE(v_trip_skeleton, '{}'::jsonb),
    'trip_id', p_trip_id
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_phase_context IS 'Get all context for any phase - generic function for phases 4+';

-- ============================================================
-- List User Trips (helper for MCP to find trip IDs)
-- ============================================================
CREATE OR REPLACE FUNCTION list_user_trips(p_user_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'destination', t.skeleton->'overview'->>'destination',
        'start_date', t.skeleton->'overview'->>'start_date',
        'end_date', t.skeleton->'overview'->>'end_date',
        'created_at', t.created_at
      ) ORDER BY t.created_at DESC
    )
    FROM public.trips t
    WHERE t.user_id = p_user_id),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION list_user_trips IS 'List all trips for a user with basic info';

-- ============================================================
-- Get Trip Summary (for phase 2 & 3 context)
-- ============================================================
CREATE OR REPLACE FUNCTION get_trip_summary(
  p_user_id uuid,
  p_trip_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_trip public.trips%ROWTYPE;
  v_segments jsonb;
BEGIN
  -- Get trip
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id AND user_id = p_user_id;

  IF v_trip.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Trip not found');
  END IF;

  -- Get segments with hotels
  SELECT jsonb_agg(
    jsonb_build_object(
      'segment_number', s.segment_number,
      'name', s.name,
      'location', s.location,
      'start_date', s.start_date,
      'end_date', s.end_date,
      'nights', s.nights,
      'hotel_name', s.hotel_name,
      'activity_count', (SELECT COUNT(*) FROM public.trip_activities a WHERE a.segment_id = s.id)
    ) ORDER BY s.segment_number
  ) INTO v_segments
  FROM public.trip_segments s
  WHERE s.trip_id = p_trip_id;

  RETURN jsonb_build_object(
    'trip_id', v_trip.id,
    'name', v_trip.name,
    'overview', v_trip.skeleton->'overview',
    'segments', COALESCE(v_segments, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_trip_summary IS 'Get trip summary with segments and activity counts';
