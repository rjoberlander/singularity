--
-- PostgreSQL database dump
--

\restrict aUhlQRzFNu9Nw3R0CGMQ2fexskH3bbdeZpsV0PhPz4BsDHgR3yx8cdWGlhpfatK

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: enrichment_job_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enrichment_job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE public.enrichment_job_status OWNER TO postgres;

--
-- Name: compare_sleep_by_protocol(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.compare_sleep_by_protocol(p_user_id uuid, p_days integer DEFAULT 90) RETURNS TABLE(supplement_name text, nights_taken integer, avg_sleep_score numeric, avg_deep_sleep_pct numeric, avg_hrv numeric, wake_2_4_am_rate numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    supp->>'name' as supplement_name,
    COUNT(*)::INTEGER as nights_taken,
    ROUND(AVG(ss.sleep_score)::DECIMAL, 1) as avg_sleep_score,
    ROUND(AVG(ss.deep_sleep_pct)::DECIMAL, 1) as avg_deep_sleep_pct,
    ROUND(AVG(ss.avg_hrv)::DECIMAL, 1) as avg_hrv,
    ROUND(
      (SUM(CASE WHEN ss.woke_between_2_and_4_am THEN 1 ELSE 0 END)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 1
    ) as wake_2_4_am_rate
  FROM sleep_sessions ss
  JOIN sleep_protocol_correlation spc ON ss.id = spc.sleep_session_id
  CROSS JOIN LATERAL jsonb_array_elements(spc.supplements_taken) as supp
  WHERE ss.user_id = p_user_id
    AND ss.date >= CURRENT_DATE - p_days
  GROUP BY supp->>'name'
  ORDER BY nights_taken DESC;
END;
$$;


ALTER FUNCTION public.compare_sleep_by_protocol(p_user_id uuid, p_days integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: rv_enrichment_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rv_enrichment_jobs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    status public.enrichment_job_status DEFAULT 'pending'::public.enrichment_job_status NOT NULL,
    total_locations integer DEFAULT 0 NOT NULL,
    processed_locations integer DEFAULT 0 NOT NULL,
    successful_locations integer DEFAULT 0 NOT NULL,
    failed_locations integer DEFAULT 0 NOT NULL,
    photos_downloaded integer DEFAULT 0 NOT NULL,
    estimated_cost_usd numeric(10,4) DEFAULT 0,
    current_location_id uuid,
    current_location_name text,
    current_step text,
    location_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb,
    options jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rv_enrichment_jobs OWNER TO postgres;

--
-- Name: TABLE rv_enrichment_jobs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.rv_enrichment_jobs IS 'Tracks batch enrichment jobs with progress for live status updates';


--
-- Name: get_active_enrichment_job(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_active_enrichment_job(p_user_id uuid) RETURNS public.rv_enrichment_jobs
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  job rv_enrichment_jobs;
BEGIN
  SELECT * INTO job
  FROM rv_enrichment_jobs
  WHERE user_id = p_user_id
    AND status IN ('pending', 'running')
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN job;
END;
$$;


ALTER FUNCTION public.get_active_enrichment_job(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_monthly_api_usage(uuid, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_monthly_api_usage(p_user_id uuid, p_month date DEFAULT CURRENT_DATE) RETURNS TABLE(provider text, api_type text, total_count bigint, total_estimated_cost_usd numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.provider,
    t.api_type,
    SUM(t.count)::BIGINT AS total_count,
    SUM(t.estimated_cost_usd) AS total_estimated_cost_usd
  FROM api_usage_tracking t
  WHERE t.user_id = p_user_id
    AND DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', p_month::TIMESTAMPTZ)
  GROUP BY t.provider, t.api_type
  ORDER BY t.provider, t.api_type;
END;
$$;


ALTER FUNCTION public.get_monthly_api_usage(p_user_id uuid, p_month date) OWNER TO postgres;

--
-- Name: get_sleep_analysis(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sleep_analysis(p_user_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(total_nights integer, avg_sleep_score numeric, avg_deep_sleep_pct numeric, avg_rem_sleep_pct numeric, avg_hrv numeric, avg_time_slept_hours numeric, nights_with_2_4_am_wake integer, wake_2_4_am_rate numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_nights,
    ROUND(AVG(ss.sleep_score)::DECIMAL, 1) as avg_sleep_score,
    ROUND(AVG(ss.deep_sleep_pct)::DECIMAL, 1) as avg_deep_sleep_pct,
    ROUND(AVG(ss.rem_sleep_pct)::DECIMAL, 1) as avg_rem_sleep_pct,
    ROUND(AVG(ss.avg_hrv)::DECIMAL, 1) as avg_hrv,
    ROUND(AVG(ss.time_slept / 60.0)::DECIMAL, 2) as avg_time_slept_hours,
    SUM(CASE WHEN ss.woke_between_2_and_4_am THEN 1 ELSE 0 END)::INTEGER as nights_with_2_4_am_wake,
    ROUND(
      (SUM(CASE WHEN ss.woke_between_2_and_4_am THEN 1 ELSE 0 END)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 1
    ) as wake_2_4_am_rate
  FROM sleep_sessions ss
  WHERE ss.user_id = p_user_id
    AND ss.date >= CURRENT_DATE - p_days;
END;
$$;


ALTER FUNCTION public.get_sleep_analysis(p_user_id uuid, p_days integer) OWNER TO postgres;

--
-- Name: get_ticket_details_optimized(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer DEFAULT 10) RETURNS TABLE(id uuid, short_id character varying, channel_id uuid, channel character varying, customer_id uuid, subject text, title text, description text, status character varying, priority character varying, assigned_agent_id uuid, tags text[], role character varying, created_at timestamp with time zone, updated_at timestamp with time zone, received_at timestamp with time zone, replied_at timestamp with time zone, closed_at timestamp with time zone, snoozed_until timestamp with time zone, archived_at timestamp with time zone, from_email text, to_email text, metadata jsonb, customer_name text, customer_phone text, customer_email text, agent_id uuid, agent_name text, agent_email text, messages jsonb, total_messages bigint, messages_loaded integer, has_more_messages boolean)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_total_messages BIGINT;
BEGIN
  -- Get total message count first
  SELECT COUNT(*)
  INTO v_total_messages
  FROM ticket_messages tm
  WHERE tm.ticket_id = p_ticket_id;

  RETURN QUERY
  WITH ticket_data AS (
    -- Get ticket with contact and agent joins
    SELECT
      t.id,
      t.short_id,
      t.channel_id,
      t.channel,
      t.contact_id AS customer_id,
      t.subject,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.assigned_agent_id,
      t.tags,
      t.role,
      t.created_at,
      t.updated_at,
      t.received_at,
      t.replied_at,
      t.closed_at,
      t.snoozed_until,
      t.archived_at,
      t.from_email,
      t.to_email,
      t.metadata,
      c.name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      u.id AS agent_id,
      u.full_name AS agent_name,
      u.email AS agent_email
    FROM tickets t
    LEFT JOIN contacts c ON c.id = t.contact_id
    LEFT JOIN users u ON u.id = t.assigned_agent_id
    WHERE t.id = p_ticket_id
      AND t.workspace_id = p_workspace_id
  ),
  messages_with_attachments AS (
    -- Get most recent N messages with their attachments
    SELECT
      m.id,
      m.ticket_id,
      m.short_id,
      m.content,
      m.content_html,
      m.direction,
      m.sent_at,
      m.created_at,
      m.sender_email,
      m.sender_name,
      m.recipient_email,
      m.recipient_name,
      m.read_at,
      m.is_internal,
      m.metadata,
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'message_id', a.message_id,
            'filename', a.filename,
            'url', a.url,
            'size', a.size,
            'content_type', a.content_type
          )
        )
        FROM ticket_message_attachments a
        WHERE a.message_id = m.id
        ), '[]'::jsonb
      ) AS attachments
    FROM ticket_messages m
    WHERE m.ticket_id = p_ticket_id
    ORDER BY m.sent_at DESC
    LIMIT p_message_limit
  ),
  messages_data AS (
    -- Aggregate messages into JSONB array
    SELECT
      mwa.ticket_id,
      jsonb_agg(
        jsonb_build_object(
          'id', mwa.id,
          'short_id', mwa.short_id,
          'content', mwa.content,
          'content_html', mwa.content_html,
          'direction', mwa.direction,
          'sent_at', mwa.sent_at,
          'created_at', mwa.created_at,
          'sender_email', mwa.sender_email,
          'sender_name', mwa.sender_name,
          'recipient_email', mwa.recipient_email,
          'recipient_name', mwa.recipient_name,
          'read_at', mwa.read_at,
          'is_internal', mwa.is_internal,
          'metadata', mwa.metadata,
          'attachments', mwa.attachments
        ) ORDER BY mwa.sent_at DESC
      ) AS messages_json
    FROM messages_with_attachments mwa
    GROUP BY mwa.ticket_id
  )
  SELECT
    td.id,
    td.short_id,
    td.channel_id,
    td.channel,
    td.customer_id,
    td.subject,
    td.title,
    td.description,
    td.status,
    td.priority,
    td.assigned_agent_id,
    td.tags,
    td.role,
    td.created_at,
    td.updated_at,
    td.received_at,
    td.replied_at,
    td.closed_at,
    td.snoozed_until,
    td.archived_at,
    td.from_email,
    td.to_email,
    td.metadata,
    td.customer_name,
    td.customer_phone,
    td.customer_email,
    td.agent_id,
    td.agent_name,
    td.agent_email,
    COALESCE(md.messages_json, '[]'::jsonb) AS messages,
    v_total_messages AS total_messages,
    COALESCE(jsonb_array_length(md.messages_json), 0)::INT AS messages_loaded,
    (v_total_messages > p_message_limit) AS has_more_messages
  FROM ticket_data td
  LEFT JOIN messages_data md ON md.ticket_id = td.id;
END;
$$;


ALTER FUNCTION public.get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer) OWNER TO postgres;

--
-- Name: FUNCTION get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer) IS 'Optimized single-ticket fetch with contact data, paginated messages, and message attachments (MMS images, etc.).';


--
-- Name: get_travel_phase_templates(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_travel_phase_templates(p_user_id uuid, p_phase_number integer) RETURNS TABLE(template_key text, display_name text, filename text, content_type text, is_input boolean, description text, content text, is_customized boolean, sort_order integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    td.template_key,
    td.display_name,
    td.filename,
    td.content_type,
    td.is_input,
    td.description,
    COALESCE(ut.content, td.default_content) as content,
    ut.id IS NOT NULL as is_customized,
    td.sort_order
  FROM travel_guide_template_definitions td
  LEFT JOIN travel_guide_templates ut
    ON ut.phase_number = td.phase_number
    AND ut.template_key = td.template_key
    AND ut.user_id = p_user_id
  WHERE td.phase_number = p_phase_number
  ORDER BY td.sort_order;
END;
$$;


ALTER FUNCTION public.get_travel_phase_templates(p_user_id uuid, p_phase_number integer) OWNER TO postgres;

--
-- Name: FUNCTION get_travel_phase_templates(p_user_id uuid, p_phase_number integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_travel_phase_templates(p_user_id uuid, p_phase_number integer) IS 'Get all templates for a phase with customization status';


--
-- Name: get_travel_template(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_content text;
BEGIN
  -- Try user's custom template first
  SELECT content INTO v_content
  FROM travel_guide_templates
  WHERE user_id = p_user_id
    AND phase_number = p_phase_number
    AND template_key = p_template_key;

  -- Fall back to default if no custom template
  IF v_content IS NULL THEN
    SELECT default_content INTO v_content
    FROM travel_guide_template_definitions
    WHERE phase_number = p_phase_number
      AND template_key = p_template_key;
  END IF;

  RETURN v_content;
END;
$$;


ALTER FUNCTION public.get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text) OWNER TO postgres;

--
-- Name: FUNCTION get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text) IS 'Get template content (user custom or default)';


--
-- Name: import_research_item_to_activity(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid) OWNER TO postgres;

--
-- Name: FUNCTION import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid) IS 'Converts a research item to an activity. Supports both v2 legacy columns and v3 JSONB columns (deep_dive, kid_engagement, location, ratings, practical).';


--
-- Name: update_ai_api_keys_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ai_api_keys_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_ai_api_keys_updated_at() OWNER TO postgres;

--
-- Name: update_chat_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_chat_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_chat_sessions_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: access_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    token_hash text NOT NULL,
    token_prefix text NOT NULL,
    scopes text[] DEFAULT ARRAY['read'::text, 'write'::text],
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.access_tokens OWNER TO postgres;

--
-- Name: ai_api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    key_name character varying(255) NOT NULL,
    api_key_encrypted text NOT NULL,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    health_status character varying(50) DEFAULT 'unknown'::character varying,
    consecutive_failures integer DEFAULT 0,
    last_health_check timestamp with time zone,
    last_error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_api_keys_health_status_check CHECK (((health_status)::text = ANY ((ARRAY['healthy'::character varying, 'unhealthy'::character varying, 'warning'::character varying, 'critical'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT ai_api_keys_provider_check CHECK (((provider)::text = ANY ((ARRAY['anthropic'::character varying, 'openai'::character varying, 'perplexity'::character varying])::text[])))
);


ALTER TABLE public.ai_api_keys OWNER TO postgres;

--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    context text,
    messages jsonb DEFAULT '[]'::jsonb,
    extracted_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    biomarker_name text,
    title text
);


ALTER TABLE public.ai_conversations OWNER TO postgres;

--
-- Name: api_usage_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_usage_tracking (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    api_type text NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    estimated_cost_usd numeric(10,6),
    context_type text,
    context_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_usage_tracking OWNER TO postgres;

--
-- Name: TABLE api_usage_tracking; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.api_usage_tracking IS 'Tracks API usage across the app for billing visibility';


--
-- Name: api_usage_monthly_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.api_usage_monthly_summary AS
 SELECT user_id,
    provider,
    api_type,
    date_trunc('month'::text, created_at) AS month,
    sum(count) AS total_count,
    sum(estimated_cost_usd) AS total_estimated_cost_usd,
    count(*) AS request_count
   FROM public.api_usage_tracking
  GROUP BY user_id, provider, api_type, (date_trunc('month'::text, created_at));


ALTER VIEW public.api_usage_monthly_summary OWNER TO postgres;

--
-- Name: biomarker_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biomarker_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    biomarker_name text NOT NULL,
    content text NOT NULL,
    created_by text DEFAULT 'user'::text,
    ai_context text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT biomarker_notes_created_by_check CHECK ((created_by = ANY (ARRAY['user'::text, 'ai'::text])))
);


ALTER TABLE public.biomarker_notes OWNER TO postgres;

--
-- Name: biomarker_stars; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biomarker_stars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    biomarker_name text NOT NULL,
    starred_at timestamp with time zone DEFAULT now(),
    starred_by text DEFAULT 'user'::text,
    ai_reason text,
    CONSTRAINT biomarker_stars_starred_by_check CHECK ((starred_by = ANY (ARRAY['user'::text, 'ai'::text])))
);


ALTER TABLE public.biomarker_stars OWNER TO postgres;

--
-- Name: biomarkers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biomarkers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    category text,
    value numeric NOT NULL,
    unit text NOT NULL,
    date_tested date NOT NULL,
    lab_source text,
    reference_range_low numeric,
    reference_range_high numeric,
    optimal_range_low numeric,
    optimal_range_high numeric,
    notes text,
    source_image text,
    ai_extracted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_calculated boolean DEFAULT false
);


ALTER TABLE public.biomarkers OWNER TO postgres;

--
-- Name: change_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date timestamp with time zone DEFAULT now(),
    change_type text,
    item_type text,
    item_name text,
    previous_value text,
    new_value text,
    reason text,
    linked_concern text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT change_log_change_type_check CHECK ((change_type = ANY (ARRAY['started'::text, 'stopped'::text, 'modified'::text])))
);


ALTER TABLE public.change_log OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    sources jsonb,
    tokens_used integer,
    response_time_ms integer,
    model_used character varying(100),
    user_feedback character varying(20),
    feedback_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying])::text[]))),
    CONSTRAINT chat_messages_user_feedback_check CHECK (((user_feedback)::text = ANY ((ARRAY['helpful'::character varying, 'not_helpful'::character varying])::text[])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    is_active boolean DEFAULT true,
    message_count integer DEFAULT 0,
    last_message_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chat_sessions OWNER TO postgres;

--
-- Name: daily_schedule_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_schedule_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    day_id uuid NOT NULL,
    segment_id uuid,
    time_start time without time zone NOT NULL,
    time_end time without time zone NOT NULL,
    duration_minutes integer GENERATED ALWAYS AS ((EXTRACT(epoch FROM (time_end - time_start)) / (60)::numeric)) STORED,
    event_type character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    notes text,
    tips text[],
    location_name character varying(255),
    location_address text,
    location_lat numeric(10,7),
    location_lng numeric(10,7),
    google_maps_url text,
    travel_mode character varying(20),
    travel_minutes integer,
    travel_distance_km numeric(6,2),
    travel_from_name character varying(255),
    travel_from_lat numeric(10,7),
    travel_from_lng numeric(10,7),
    travel_to_name character varying(255),
    travel_to_lat numeric(10,7),
    travel_to_lng numeric(10,7),
    travel_instructions text,
    research_item_id uuid,
    cost_estimate numeric(10,2),
    cost_currency character varying(3) DEFAULT 'EUR'::character varying,
    booking_required boolean DEFAULT false,
    booking_url text,
    booking_confirmation character varying(100),
    calendar_title character varying(255),
    calendar_description text,
    calendar_location character varying(500),
    calendar_event_id character varying(255),
    calendar_sync_status character varying(20) DEFAULT 'pending'::character varying,
    calendar_synced_at timestamp with time zone,
    calendar_sync_error text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    validation_status character varying(20) DEFAULT 'pending'::character varying,
    validation_issues jsonb,
    CONSTRAINT daily_schedule_items_calendar_sync_status_check CHECK (((calendar_sync_status)::text = ANY ((ARRAY['pending'::character varying, 'synced'::character varying, 'modified'::character varying, 'error'::character varying, 'deleted'::character varying])::text[]))),
    CONSTRAINT daily_schedule_items_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['activity'::character varying, 'meal'::character varying, 'transit'::character varying, 'buffer'::character varying, 'logistics'::character varying])::text[]))),
    CONSTRAINT daily_schedule_items_travel_mode_check CHECK (((travel_mode)::text = ANY ((ARRAY['walking'::character varying, 'driving'::character varying, 'transit'::character varying, 'taxi'::character varying, 'ferry'::character varying])::text[])))
);


ALTER TABLE public.daily_schedule_items OWNER TO postgres;

--
-- Name: TABLE daily_schedule_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.daily_schedule_items IS 'Phase 4 Daily Assembly: 15-minute precision schedule items with travel times and calendar sync';


--
-- Name: eight_sleep_integrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eight_sleep_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_encrypted text NOT NULL,
    password_encrypted text NOT NULL,
    eight_sleep_user_id text,
    session_token_encrypted text,
    token_expires_at timestamp with time zone,
    device_id text,
    side text,
    sync_enabled boolean DEFAULT true,
    sync_time time without time zone DEFAULT '08:00:00'::time without time zone,
    sync_timezone text DEFAULT 'America/Los_Angeles'::text,
    is_active boolean DEFAULT true,
    last_sync_at timestamp with time zone,
    last_sync_status text,
    consecutive_failures integer DEFAULT 0,
    last_error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT eight_sleep_integrations_last_sync_status_check CHECK ((last_sync_status = ANY (ARRAY['success'::text, 'failed'::text, 'syncing'::text, 'never'::text]))),
    CONSTRAINT eight_sleep_integrations_side_check CHECK ((side = ANY (ARRAY['left'::text, 'right'::text, 'solo'::text])))
);


ALTER TABLE public.eight_sleep_integrations OWNER TO postgres;

--
-- Name: TABLE eight_sleep_integrations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.eight_sleep_integrations IS 'Stores Eight Sleep account credentials and sync preferences per user';


--
-- Name: COLUMN eight_sleep_integrations.side; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.eight_sleep_integrations.side IS 'Which side of the Eight Sleep mattress (left/right/solo for single user)';


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    brand text,
    model text,
    category text,
    purpose text,
    specs jsonb DEFAULT '{}'::jsonb,
    usage_frequency text,
    usage_timing text,
    usage_duration text,
    usage_protocol text,
    contraindications text,
    purchase_date date,
    purchase_price numeric,
    purchase_url text,
    warranty_expiry date,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.equipment OWNER TO postgres;

--
-- Name: facial_products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facial_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    brand text,
    step_order integer,
    application_form text,
    application_amount text,
    application_area text,
    application_method text,
    routines text[] DEFAULT '{}'::text[],
    size_amount numeric,
    size_unit text,
    price numeric,
    purchase_url text,
    category text,
    subcategory text,
    key_ingredients text[],
    spf_rating integer,
    purpose text,
    notes text,
    is_active boolean DEFAULT true,
    product_data_source text,
    product_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    usage_frequency text,
    usage_timing text,
    frequency_days text[],
    usage_amount numeric,
    usage_unit text
);


ALTER TABLE public.facial_products OWNER TO postgres;

--
-- Name: COLUMN facial_products.usage_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.facial_products.usage_amount IS 'Amount of product used per application (e.g., 1, 2, 0.5)';


--
-- Name: COLUMN facial_products.usage_unit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.facial_products.usage_unit IS 'Unit for usage amount (e.g., ml, pumps, drops, pea-sized)';


--
-- Name: goal_interventions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goal_interventions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    intervention text NOT NULL,
    type text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.goal_interventions OWNER TO postgres;

--
-- Name: goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    category text,
    target_biomarker text,
    current_value numeric,
    target_value numeric,
    direction text,
    status text DEFAULT 'active'::text,
    priority integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT goals_direction_check CHECK ((direction = ANY (ARRAY['increase'::text, 'decrease'::text, 'maintain'::text]))),
    CONSTRAINT goals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'achieved'::text, 'paused'::text])))
);


ALTER TABLE public.goals OWNER TO postgres;

--
-- Name: google_calendar_oauth_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.google_calendar_oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_token_encrypted text NOT NULL,
    refresh_token_encrypted text,
    token_type character varying(50) DEFAULT 'Bearer'::character varying,
    expires_at timestamp with time zone,
    scopes text[] DEFAULT ARRAY['https://www.googleapis.com/auth/calendar.readonly'::text],
    google_email character varying(255),
    google_account_id character varying(255),
    is_active boolean DEFAULT true,
    is_syncing boolean DEFAULT false,
    last_sync_at timestamp with time zone,
    sync_error_message text,
    sync_error_count integer DEFAULT 0,
    primary_calendar_id character varying(255),
    sync_enabled boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.google_calendar_oauth_tokens OWNER TO postgres;

--
-- Name: TABLE google_calendar_oauth_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.google_calendar_oauth_tokens IS 'Stores encrypted OAuth tokens for Google Calendar integration';


--
-- Name: COLUMN google_calendar_oauth_tokens.access_token_encrypted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.google_calendar_oauth_tokens.access_token_encrypted IS 'AES-256-GCM encrypted access token';


--
-- Name: COLUMN google_calendar_oauth_tokens.refresh_token_encrypted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.google_calendar_oauth_tokens.refresh_token_encrypted IS 'AES-256-GCM encrypted refresh token';


--
-- Name: COLUMN google_calendar_oauth_tokens.scopes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.google_calendar_oauth_tokens.scopes IS 'OAuth scopes granted by user';


--
-- Name: COLUMN google_calendar_oauth_tokens.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.google_calendar_oauth_tokens.metadata IS 'Additional calendar settings and preferences';


--
-- Name: journal_capsule_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_capsule_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    delivered_at timestamp with time zone,
    delivery_email text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.journal_capsule_recipients OWNER TO postgres;

--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    content text NOT NULL,
    content_html text,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    entry_time time without time zone DEFAULT CURRENT_TIME,
    location_name text,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    weather_condition text,
    weather_temp_f integer,
    weather_icon text,
    mood text,
    mood_custom text,
    tags text[] DEFAULT '{}'::text[],
    entry_mode text DEFAULT 'freeform'::text,
    prompt_used text,
    is_public boolean DEFAULT false,
    public_slug text,
    share_password text,
    show_author boolean DEFAULT true,
    show_location boolean DEFAULT true,
    show_date boolean DEFAULT true,
    is_time_capsule boolean DEFAULT false,
    capsule_delivery_date date,
    capsule_delivered boolean DEFAULT false,
    capsule_reminder_30d_sent boolean DEFAULT false,
    capsule_reminder_7d_sent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.journal_entries OWNER TO postgres;

--
-- Name: journal_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_id uuid NOT NULL,
    user_id uuid NOT NULL,
    media_type text NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    width integer,
    height integer,
    duration_seconds integer,
    file_size_bytes bigint,
    sort_order integer DEFAULT 0,
    original_filename text,
    mime_type text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.journal_media OWNER TO postgres;

--
-- Name: journal_prompts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_text text NOT NULL,
    category text,
    source text DEFAULT 'curated'::text,
    user_id uuid,
    is_active boolean DEFAULT true,
    times_used integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.journal_prompts OWNER TO postgres;

--
-- Name: journal_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    relationship text,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.journal_recipients OWNER TO postgres;

--
-- Name: protocol_docs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.protocol_docs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    category text,
    file_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT protocol_docs_category_check CHECK ((category = ANY (ARRAY['routine'::text, 'biomarkers'::text, 'supplements'::text, 'goals'::text, 'reference'::text, 'other'::text])))
);


ALTER TABLE public.protocol_docs OWNER TO postgres;

--
-- Name: trip_research_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_research_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    segment_id uuid,
    item_type character varying(30) NOT NULL,
    category character varying(50),
    name character varying(255) NOT NULL,
    description text,
    why_relevant jsonb,
    source_url text,
    source_name character varying(100),
    source_date date DEFAULT CURRENT_DATE,
    additional_sources jsonb,
    location_name character varying(255),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    google_maps_url text,
    google_place_id character varying(255),
    rating numeric(2,1),
    review_count integer,
    review_summary jsonb,
    price_level integer,
    kid_friendly boolean,
    kid_assessment jsonb,
    min_age integer,
    stroller_friendly boolean,
    hours_text text,
    hours_structured jsonb,
    cost_estimate_text text,
    cost_estimate_value numeric(10,2),
    cost_currency character varying(3) DEFAULT 'EUR'::character varying,
    cost_breakdown jsonb,
    reservation_required boolean,
    reservation_details text,
    booking_url text,
    website text,
    phone character varying(30),
    time_needed jsonb,
    best_times jsonb,
    hike_details jsonb,
    restaurant_details jsonb,
    beach_details jsonb,
    historical_context jsonb,
    what_to_see jsonb,
    raw_data jsonb,
    status character varying(20) DEFAULT 'unprocessed'::character varying,
    priority character varying(20),
    assigned_day integer,
    assigned_time_block character varying(20),
    assigned_date date,
    imported_to_activity_id uuid,
    imported_at timestamp with time zone,
    import_notes text,
    expanded_at timestamp with time zone,
    expanded_by character varying(50),
    deep_dive_content text,
    kid_engagement jsonb,
    visit_script jsonb,
    photo_guide jsonb,
    practical_details_extended jsonb,
    notes text,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deep_dive jsonb,
    photo_opportunities jsonb,
    practical jsonb,
    location jsonb,
    ratings jsonb,
    assigned_time character varying(50),
    CONSTRAINT trip_research_items_assigned_time_block_check CHECK (((assigned_time_block)::text = ANY ((ARRAY['morning'::character varying, 'midday'::character varying, 'sunset'::character varying, 'evening'::character varying])::text[]))),
    CONSTRAINT trip_research_items_item_type_check CHECK (((item_type)::text = ANY ((ARRAY['restaurant'::character varying, 'hike'::character varying, 'attraction'::character varying, 'beach'::character varying, 'hotel'::character varying, 'activity'::character varying, 'shop'::character varying, 'service'::character varying, 'viewpoint'::character varying, 'transport'::character varying])::text[]))),
    CONSTRAINT trip_research_items_price_level_check CHECK (((price_level >= 1) AND (price_level <= 4))),
    CONSTRAINT trip_research_items_priority_check CHECK (((priority)::text = ANY ((ARRAY['must_do'::character varying, 'recommended'::character varying, 'optional'::character varying, 'backup'::character varying, 'if_time'::character varying])::text[]))),
    CONSTRAINT trip_research_items_status_check CHECK (((status)::text = ANY ((ARRAY['unprocessed'::character varying, 'reviewing'::character varying, 'approved'::character varying, 'expanded'::character varying, 'imported'::character varying, 'rejected'::character varying, 'deferred'::character varying])::text[])))
);


ALTER TABLE public.trip_research_items OWNER TO postgres;

--
-- Name: TABLE trip_research_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trip_research_items IS 'Research items with v3 deep-dive support. deep_dive column stores structured content with what_it_is, why_it_matters, the_story, what_youll_see. kid_engagement stores named children (parker, charlotte, xander) with scripts.';


--
-- Name: COLUMN trip_research_items.why_relevant; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.why_relevant IS 'Explanation of why Claude included this in the research. Helps user understand the recommendation.';


--
-- Name: COLUMN trip_research_items.source_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.source_url IS 'Critical field: The URL where this item was discovered. Enables later expansion by fetching the source again.';


--
-- Name: COLUMN trip_research_items.raw_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.raw_data IS 'JSONB blob for any data that does not fit structured fields. Preserves all research even if schema does not support it.';


--
-- Name: COLUMN trip_research_items.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.status IS 'Workflow status: unprocessed → reviewing → approved → expanded → imported (or rejected/deferred)';


--
-- Name: COLUMN trip_research_items.deep_dive; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.deep_dive IS 'V3 structured deep-dive: {what_it_is, why_it_matters, the_story, what_youll_see[]}';


--
-- Name: COLUMN trip_research_items.photo_opportunities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.photo_opportunities IS 'V3 photo guide: [{shot, where, when, tip}]';


--
-- Name: COLUMN trip_research_items.practical; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.practical IS 'V3 practical details: {hours, cost, time_needed, reservation, best_time, avoid, stroller, tips}';


--
-- Name: COLUMN trip_research_items.location; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.location IS 'V3 location: {area, address, latitude, longitude, google_maps_url}';


--
-- Name: COLUMN trip_research_items.ratings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.ratings IS 'V3 ratings: {score, count, summary}';


--
-- Name: COLUMN trip_research_items.assigned_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_research_items.assigned_time IS 'V3 specific time slot: "9:00-11:00am"';


--
-- Name: trip_segments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    location_name character varying(255),
    latitude numeric(10,7),
    longitude numeric(10,7),
    cover_image_url text,
    city_info jsonb,
    key_activities_summary text,
    driving_from_previous character varying(100),
    driving_notes text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    google_place_id character varying(255),
    google_rating numeric(2,1),
    population integer,
    timezone character varying(50),
    country character varying(100),
    country_code character varying(3),
    region character varying(100),
    main_attractions jsonb,
    weather_summary text,
    best_time_to_visit text,
    local_currency character varying(10),
    languages text[],
    photos_fetched boolean DEFAULT false,
    local_food jsonb,
    packing_list jsonb,
    booking_priorities jsonb,
    accommodation jsonb,
    theme text,
    segment_number integer,
    nights integer,
    days integer,
    why_here text,
    key_experiences jsonb,
    driving jsonb,
    day_trips jsonb,
    priority character varying(20),
    flexibility text,
    weather_considerations text,
    booking_urgency jsonb,
    notes text,
    research_status character varying(20) DEFAULT 'not_started'::character varying,
    selected_hotel_id uuid,
    route_stops jsonb,
    segment_alternatives jsonb,
    CONSTRAINT trip_segments_google_rating_check CHECK (((google_rating IS NULL) OR ((google_rating >= 1.0) AND (google_rating <= 5.0))))
);


ALTER TABLE public.trip_segments OWNER TO postgres;

--
-- Name: TABLE trip_segments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trip_segments IS 'Trip segments with v3 skeleton support. Stores segment shells from Phase 1 (Trip Planner) that are later filled by Phase 2 (Segment Research).';


--
-- Name: COLUMN trip_segments.city_info; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.city_info IS 'V3 city info: {intro, deep_history: {sections: [{title, content, relevance}]}, culture: {overview, traditions}, cuisine: {overview, signature_foods}}';


--
-- Name: COLUMN trip_segments.google_place_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.google_place_id IS 'Google Places API place ID for this city/region';


--
-- Name: COLUMN trip_segments.google_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.google_rating IS 'Google rating if available';


--
-- Name: COLUMN trip_segments.population; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.population IS 'City/region population';


--
-- Name: COLUMN trip_segments.timezone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.timezone IS 'Timezone (e.g., Europe/Lisbon)';


--
-- Name: COLUMN trip_segments.country; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.country IS 'Country name';


--
-- Name: COLUMN trip_segments.country_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.country_code IS 'ISO country code';


--
-- Name: COLUMN trip_segments.region; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.region IS 'Region name for this segment';


--
-- Name: COLUMN trip_segments.main_attractions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.main_attractions IS 'JSON array of attractions: [{name, description, type}]';


--
-- Name: COLUMN trip_segments.weather_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.weather_summary IS 'Climate/weather description';


--
-- Name: COLUMN trip_segments.best_time_to_visit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.best_time_to_visit IS 'Best season/months to visit';


--
-- Name: COLUMN trip_segments.local_currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.local_currency IS 'Local currency code';


--
-- Name: COLUMN trip_segments.languages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.languages IS 'Languages spoken (array)';


--
-- Name: COLUMN trip_segments.photos_fetched; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.photos_fetched IS 'Whether Google photos have been fetched';


--
-- Name: COLUMN trip_segments.local_food; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.local_food IS 'Local dishes to try: [{name, description, where_to_find}]';


--
-- Name: COLUMN trip_segments.packing_list; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.packing_list IS 'Segment-specific packing list: [{item, category, notes}]';


--
-- Name: COLUMN trip_segments.booking_priorities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.booking_priorities IS 'Booking timing: {book_now: [], book_week_ahead: []}';


--
-- Name: COLUMN trip_segments.accommodation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.accommodation IS 'V3 accommodation: {recommendation, area, why, specific_hotels[]}';


--
-- Name: COLUMN trip_segments.theme; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.theme IS 'V3 segment theme - the story of this segment';


--
-- Name: COLUMN trip_segments.segment_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.segment_number IS 'Segment number (1, 2, 3, etc.)';


--
-- Name: COLUMN trip_segments.nights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.nights IS 'Number of nights at this base';


--
-- Name: COLUMN trip_segments.days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.days IS 'Number of full or partial days';


--
-- Name: COLUMN trip_segments.why_here; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.why_here IS 'Why this place is in the itinerary';


--
-- Name: COLUMN trip_segments.key_experiences; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.key_experiences IS 'Array of high-level must-do experiences for this segment';


--
-- Name: COLUMN trip_segments.driving; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.driving IS 'V3 driving info: {from_previous, to_next, car_needed_here, parking_notes, route_notes}';


--
-- Name: COLUMN trip_segments.day_trips; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.day_trips IS 'Array of day trips: [{destination, day_number, driving_time, why}]';


--
-- Name: COLUMN trip_segments.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.priority IS 'Priority: must_do, recommended, flexible';


--
-- Name: COLUMN trip_segments.flexibility; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.flexibility IS 'Can this segment be shortened/cut if needed?';


--
-- Name: COLUMN trip_segments.weather_considerations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.weather_considerations IS 'Weather-specific notes for this segment';


--
-- Name: COLUMN trip_segments.booking_urgency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.booking_urgency IS 'Array of items needing booking: [{item, urgency, reason}]';


--
-- Name: COLUMN trip_segments.research_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.research_status IS 'Research status: not_started, in_progress, completed';


--
-- Name: COLUMN trip_segments.selected_hotel_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.selected_hotel_id IS 'Phase 4: Reference to the selected hotel for this segment (from Phase 2 hotel research)';


--
-- Name: COLUMN trip_segments.route_stops; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.route_stops IS 'JSONB array of RouteStop objects - side detours along driving routes between locations';


--
-- Name: COLUMN trip_segments.segment_alternatives; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_segments.segment_alternatives IS 'JSONB array of SegmentAlternative objects - general backup activities for this segment (not linked to specific activity)';


--
-- Name: research_items_with_segment; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.research_items_with_segment AS
 SELECT ri.id,
    ri.trip_id,
    ri.segment_id,
    ri.item_type,
    ri.category,
    ri.name,
    ri.description,
    ri.why_relevant,
    ri.source_url,
    ri.source_name,
    ri.source_date,
    ri.additional_sources,
    ri.location_name,
    ri.address,
    ri.latitude,
    ri.longitude,
    ri.google_maps_url,
    ri.google_place_id,
    ri.rating,
    ri.review_count,
    ri.review_summary,
    ri.price_level,
    ri.kid_friendly,
    ri.kid_assessment,
    ri.min_age,
    ri.stroller_friendly,
    ri.hours_text,
    ri.hours_structured,
    ri.cost_estimate_text,
    ri.cost_estimate_value,
    ri.cost_currency,
    ri.cost_breakdown,
    ri.reservation_required,
    ri.reservation_details,
    ri.booking_url,
    ri.website,
    ri.phone,
    ri.time_needed,
    ri.best_times,
    ri.hike_details,
    ri.restaurant_details,
    ri.beach_details,
    ri.historical_context,
    ri.what_to_see,
    ri.raw_data,
    ri.status,
    ri.priority,
    ri.assigned_day,
    ri.assigned_time_block,
    ri.assigned_date,
    ri.imported_to_activity_id,
    ri.imported_at,
    ri.import_notes,
    ri.expanded_at,
    ri.expanded_by,
    ri.deep_dive_content,
    ri.kid_engagement,
    ri.visit_script,
    ri.photo_guide,
    ri.practical_details_extended,
    ri.notes,
    ri.tags,
    ri.created_at,
    ri.updated_at,
    ts.name AS segment_name,
    ts.start_date AS segment_start_date,
    ts.end_date AS segment_end_date,
    ts.location_name AS segment_location
   FROM (public.trip_research_items ri
     LEFT JOIN public.trip_segments ts ON ((ri.segment_id = ts.id)));


ALTER VIEW public.research_items_with_segment OWNER TO postgres;

--
-- Name: routine_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routine_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    routine_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    "time" text,
    duration text,
    days jsonb DEFAULT '[]'::jsonb,
    linked_supplement uuid,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.routine_items OWNER TO postgres;

--
-- Name: routine_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routine_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version_number integer NOT NULL,
    snapshot jsonb NOT NULL,
    changes jsonb NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.routine_versions OWNER TO postgres;

--
-- Name: routines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    time_of_day text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.routines OWNER TO postgres;

--
-- Name: rv_location_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rv_location_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    activity_type character varying(30),
    time_of_day character varying(20),
    kid_engagement jsonb,
    duration_minutes integer,
    duration_text character varying(50),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    distance_from_campsite character varying(100),
    cost_estimate numeric(10,2),
    cost_notes text,
    google_place_id character varying(255),
    google_rating numeric(2,1),
    alltrails_url text,
    alltrails_rating numeric(2,1),
    difficulty character varying(20),
    distance_miles numeric(5,2),
    elevation_gain_ft integer,
    tips text,
    notes text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    opening_hours jsonb,
    google_maps_url text,
    enriched_at timestamp with time zone,
    CONSTRAINT rv_location_activities_activity_type_check CHECK (((activity_type)::text = ANY ((ARRAY['hike'::character varying, 'bike'::character varying, 'swim'::character varying, 'fish'::character varying, 'kayak'::character varying, 'paddleboard'::character varying, 'horseback'::character varying, 'wildlife_viewing'::character varying, 'stargazing'::character varying, 'hot_springs'::character varying, 'beach'::character varying, 'playground'::character varying, 'visitor_center'::character varying, 'ranger_program'::character varying, 'scenic_drive'::character varying, 'photography'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT rv_location_activities_time_of_day_check CHECK (((time_of_day)::text = ANY ((ARRAY['morning'::character varying, 'midday'::character varying, 'afternoon'::character varying, 'evening'::character varying, 'any'::character varying])::text[])))
);


ALTER TABLE public.rv_location_activities OWNER TO postgres;

--
-- Name: COLUMN rv_location_activities.opening_hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_location_activities.opening_hours IS 'Google Places opening hours data';


--
-- Name: COLUMN rv_location_activities.google_maps_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_location_activities.google_maps_url IS 'Direct Google Maps URL';


--
-- Name: COLUMN rv_location_activities.enriched_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_location_activities.enriched_at IS 'Timestamp of last Google enrichment';


--
-- Name: rv_location_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rv_location_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    activity_id uuid,
    user_id uuid NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    media_type character varying(10),
    original_filename character varying(255),
    mime_type character varying(50),
    file_size_bytes bigint,
    width integer,
    height integer,
    caption text,
    google_attribution_name character varying(255),
    google_attribution_uri text,
    is_google_sourced boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    google_photo_reference text,
    content_hash character varying(64),
    is_favorite boolean DEFAULT false,
    CONSTRAINT rv_location_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[])))
);


ALTER TABLE public.rv_location_media OWNER TO postgres;

--
-- Name: COLUMN rv_location_media.google_photo_reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_location_media.google_photo_reference IS 'Google Places
   photo reference ID';


--
-- Name: COLUMN rv_location_media.content_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_location_media.content_hash IS 'SHA256 hash of image   
  content for deduplication';


--
-- Name: rv_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rv_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    hook text,
    category character varying(50),
    location_name character varying(255),
    address text,
    city character varying(100),
    state character varying(50),
    latitude numeric(10,7),
    longitude numeric(10,7),
    google_place_id character varying(255),
    google_rating numeric(2,1),
    google_review_count integer,
    google_price_level integer,
    rv_logistics jsonb,
    reservation_required boolean DEFAULT false,
    reservation_url text,
    reservation_notes text,
    cost_per_night numeric(10,2),
    cost_currency character varying(3) DEFAULT 'USD'::character varying,
    cost_notes text,
    best_season jsonb,
    drive_time_from_la character varying(100),
    drive_distance_miles integer,
    vibe jsonb,
    educational_value jsonb,
    kid_engagement jsonb,
    website text,
    phone character varying(30),
    cover_image_url text,
    status character varying(20) DEFAULT 'researching'::character varying,
    priority integer DEFAULT 0,
    tags text[],
    pros text[],
    cons text[],
    notes text,
    converted_to_trip_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    google_reviews jsonb,
    reviews_summary text,
    reviews_highlights jsonb,
    enriched_at timestamp with time zone,
    land_type text,
    share_token uuid,
    share_slug text,
    CONSTRAINT rv_locations_category_check CHECK (((category)::text = ANY ((ARRAY['harvest_hosts'::character varying, 'national_parks'::character varying, 'state_parks'::character varying, 'hot_springs'::character varying, 'lake_river'::character varying, 'boondocking'::character varying, 'couples_getaway'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT rv_locations_status_check CHECK (((status)::text = ANY ((ARRAY['researching'::character varying, 'want_to_visit'::character varying, 'visited'::character varying, 'not_interested'::character varying])::text[])))
);


ALTER TABLE public.rv_locations OWNER TO postgres;

--
-- Name: COLUMN rv_locations.google_reviews; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_locations.google_reviews IS 'Raw Google Places reviews array';


--
-- Name: COLUMN rv_locations.reviews_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_locations.reviews_summary IS 'AI-generated summary of Google reviews';


--
-- Name: COLUMN rv_locations.reviews_highlights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_locations.reviews_highlights IS 'Extracted positive/negative review highlights';


--
-- Name: COLUMN rv_locations.enriched_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_locations.enriched_at IS 'Timestamp of last Google enrichment';


--
-- Name: COLUMN rv_locations.land_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.rv_locations.land_type IS 'Land management/ownership type (national_park, state_park, blm, etc.)';


--
-- Name: rv_research_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rv_research_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    claude_instructions text,
    family_profile jsonb,
    output_template jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rv_research_settings OWNER TO postgres;

--
-- Name: schedule_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_type text NOT NULL,
    name text NOT NULL,
    timing text,
    frequency text DEFAULT 'daily'::text,
    frequency_days text[],
    exercise_type text,
    duration text,
    meal_type text,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT schedule_items_exercise_type_check CHECK ((exercise_type = ANY (ARRAY['hiit'::text, 'run'::text, 'bike'::text, 'swim'::text, 'strength'::text, 'yoga'::text, 'walk'::text, 'stretch'::text, 'sports'::text, 'other'::text]))),
    CONSTRAINT schedule_items_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'every_other_day'::text, 'custom'::text, 'as_needed'::text]))),
    CONSTRAINT schedule_items_item_type_check CHECK ((item_type = ANY (ARRAY['exercise'::text, 'meal'::text]))),
    CONSTRAINT schedule_items_meal_type_check CHECK ((meal_type = ANY (ARRAY['meal'::text, 'protein_shake'::text, 'snack'::text]))),
    CONSTRAINT schedule_items_timing_check CHECK ((timing = ANY (ARRAY['wake_up'::text, 'am'::text, 'lunch'::text, 'pm'::text, 'dinner'::text, 'evening'::text, 'bed'::text])))
);


ALTER TABLE public.schedule_items OWNER TO postgres;

--
-- Name: sleep_protocol_correlation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sleep_protocol_correlation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sleep_session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    supplements_taken jsonb DEFAULT '[]'::jsonb,
    routine_items_completed jsonb DEFAULT '[]'::jsonb,
    biomarkers_recorded jsonb DEFAULT '[]'::jsonb,
    notes text,
    alcohol_consumed boolean,
    caffeine_after_noon boolean,
    exercise_that_day boolean,
    high_stress_day boolean,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sleep_protocol_correlation OWNER TO postgres;

--
-- Name: TABLE sleep_protocol_correlation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sleep_protocol_correlation IS 'Links sleep sessions to supplements/protocols taken that day for analysis';


--
-- Name: sleep_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sleep_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    integration_id uuid,
    date date NOT NULL,
    eight_sleep_interval_id text,
    sleep_score integer,
    sleep_quality_score integer,
    time_slept integer,
    time_to_fall_asleep integer,
    time_in_bed integer,
    wake_events integer DEFAULT 0,
    wake_event_times jsonb DEFAULT '[]'::jsonb,
    woke_between_2_and_4_am boolean DEFAULT false,
    wake_time_between_2_and_4_am time without time zone,
    avg_heart_rate numeric(5,2),
    min_heart_rate numeric(5,2),
    max_heart_rate numeric(5,2),
    resting_heart_rate numeric(5,2),
    avg_hrv numeric(6,2),
    min_hrv numeric(6,2),
    max_hrv numeric(6,2),
    avg_breathing_rate numeric(4,2),
    min_breathing_rate numeric(4,2),
    max_breathing_rate numeric(4,2),
    light_sleep_minutes integer,
    deep_sleep_minutes integer,
    rem_sleep_minutes integer,
    awake_minutes integer,
    light_sleep_pct numeric(5,2),
    deep_sleep_pct numeric(5,2),
    rem_sleep_pct numeric(5,2),
    awake_pct numeric(5,2),
    avg_bed_temp numeric(5,2),
    avg_room_temp numeric(5,2),
    avg_room_humidity numeric(5,2),
    bed_temp_level integer,
    sleep_start_time timestamp with time zone,
    sleep_end_time timestamp with time zone,
    toss_and_turn_count integer,
    raw_data jsonb,
    synced_from_api boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sleep_sessions_sleep_quality_score_check CHECK (((sleep_quality_score >= 0) AND (sleep_quality_score <= 100))),
    CONSTRAINT sleep_sessions_sleep_score_check CHECK (((sleep_score >= 0) AND (sleep_score <= 100)))
);


ALTER TABLE public.sleep_sessions OWNER TO postgres;

--
-- Name: TABLE sleep_sessions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sleep_sessions IS 'Stores nightly sleep data pulled from Eight Sleep API';


--
-- Name: COLUMN sleep_sessions.woke_between_2_and_4_am; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sleep_sessions.woke_between_2_and_4_am IS 'Flag for cortisol/blood sugar wake pattern analysis';


--
-- Name: COLUMN sleep_sessions.raw_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sleep_sessions.raw_data IS 'Full Eight Sleep API response for future feature extraction';


--
-- Name: supplement_goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplement_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplement_id uuid NOT NULL,
    goal_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.supplement_goals OWNER TO postgres;

--
-- Name: TABLE supplement_goals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.supplement_goals IS 'Links supplements to health goals (many-to-many)';


--
-- Name: supplements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    brand text,
    dose_per_serving numeric,
    dose_unit text,
    servings_per_container integer,
    price numeric,
    price_per_serving numeric,
    purchase_url text,
    category text,
    timing text,
    frequency text,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reason text,
    mechanism text,
    timing_reason text,
    timing_specific time without time zone,
    intake_quantity integer DEFAULT 1,
    intake_form text,
    serving_size integer DEFAULT 1,
    product_data_source text DEFAULT 'human'::text,
    product_updated_at timestamp with time zone,
    timings text[],
    frequency_days text[],
    CONSTRAINT supplements_frequency_check CHECK (((frequency IS NULL) OR (frequency = ANY (ARRAY['daily'::text, 'every_other_day'::text, 'custom'::text, 'as_needed'::text])))),
    CONSTRAINT supplements_frequency_days_check CHECK (((frequency_days IS NULL) OR (frequency_days <@ ARRAY['sun'::text, 'mon'::text, 'tue'::text, 'wed'::text, 'thu'::text, 'fri'::text, 'sat'::text]))),
    CONSTRAINT supplements_product_data_source_check CHECK ((product_data_source = ANY (ARRAY['human'::text, 'ai'::text]))),
    CONSTRAINT supplements_timings_check CHECK (((timings IS NULL) OR (timings <@ ARRAY['wake_up'::text, 'am'::text, 'lunch'::text, 'pm'::text, 'dinner'::text, 'evening'::text, 'bed'::text, 'specific'::text])))
);


ALTER TABLE public.supplements OWNER TO postgres;

--
-- Name: COLUMN supplements.timing; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.supplements.timing IS 'When to take: wake_up, am, lunch, pm, dinner, before_bed, specific';


--
-- Name: COLUMN supplements.reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.supplements.reason IS 'Why taking this supplement (benefits, nutrients provided)';


--
-- Name: COLUMN supplements.mechanism; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.supplements.mechanism IS 'How the supplement works (mechanism of action)';


--
-- Name: COLUMN supplements.timing_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.supplements.timing_reason IS 'Why taken at this specific time';


--
-- Name: COLUMN supplements.timing_specific; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.supplements.timing_specific IS 'Exact time when timing = specific';


--
-- Name: sync_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    integration_type text NOT NULL,
    is_enabled boolean DEFAULT true,
    sync_time time without time zone DEFAULT '08:00:00'::time without time zone,
    timezone text DEFAULT 'America/Los_Angeles'::text,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sync_schedules_integration_type_check CHECK ((integration_type = ANY (ARRAY['eight_sleep'::text, 'oura'::text, 'whoop'::text, 'garmin'::text, 'apple_health'::text])))
);


ALTER TABLE public.sync_schedules OWNER TO postgres;

--
-- Name: TABLE sync_schedules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sync_schedules IS 'User preferences for automatic data sync timing';


--
-- Name: ticket_classification_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_classification_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid DEFAULT '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid NOT NULL,
    ticket_id uuid NOT NULL,
    classification_rule_id uuid NOT NULL,
    matched_field character varying(50) NOT NULL,
    matched_value text,
    action_taken character varying(20),
    matched_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ticket_classification_matches OWNER TO postgres;

--
-- Name: ticket_classification_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_classification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid DEFAULT '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid NOT NULL,
    classification_type character varying(50) NOT NULL,
    sender_email text,
    sender_domain text,
    subject_pattern text,
    reason text NOT NULL,
    notes text,
    auto_action character varying(20) DEFAULT 'archive'::character varying,
    match_count integer DEFAULT 0,
    last_matched_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ticket_classification_rules_auto_action_check CHECK (((auto_action)::text = ANY ((ARRAY['archive'::character varying, 'flag'::character varying, 'none'::character varying])::text[]))),
    CONSTRAINT ticket_classification_rules_classification_type_check CHECK (((classification_type)::text = ANY ((ARRAY['not_necessary'::character varying, 'done_needed_info'::character varying, 'unsure'::character varying])::text[]))),
    CONSTRAINT valid_pattern CHECK (((sender_email IS NOT NULL) OR (sender_domain IS NOT NULL) OR (subject_pattern IS NOT NULL)))
);


ALTER TABLE public.ticket_classification_rules OWNER TO postgres;

--
-- Name: TABLE ticket_classification_rules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ticket_classification_rules IS 'Stores patterns for auto-classifying tickets as not_necessary, done_needed_info, or unsure';


--
-- Name: COLUMN ticket_classification_rules.classification_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ticket_classification_rules.classification_type IS 'Type: not_necessary, done_needed_info, unsure';


--
-- Name: COLUMN ticket_classification_rules.sender_domain; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ticket_classification_rules.sender_domain IS 'Domain pattern like @newsletter.example.com';


--
-- Name: COLUMN ticket_classification_rules.subject_pattern; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ticket_classification_rules.subject_pattern IS 'Email subject line or pattern to match';


--
-- Name: COLUMN ticket_classification_rules.match_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ticket_classification_rules.match_count IS 'Number of times this rule has matched incoming tickets';


--
-- Name: travel_guide_phases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.travel_guide_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phase_number integer NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    icon text,
    claude_project_name text,
    claude_project_description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.travel_guide_phases OWNER TO postgres;

--
-- Name: TABLE travel_guide_phases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.travel_guide_phases IS 'Travel planning workflow phases (extensible)';


--
-- Name: travel_guide_template_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.travel_guide_template_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phase_number integer NOT NULL,
    template_key text NOT NULL,
    display_name text NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    is_input boolean DEFAULT true NOT NULL,
    description text,
    default_content text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_guide_template_definitions_content_type_check CHECK ((content_type = ANY (ARRAY['json'::text, 'markdown'::text])))
);


ALTER TABLE public.travel_guide_template_definitions OWNER TO postgres;

--
-- Name: TABLE travel_guide_template_definitions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.travel_guide_template_definitions IS 'Template definitions and defaults for each phase';


--
-- Name: travel_guide_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.travel_guide_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phase_number integer NOT NULL,
    template_key text NOT NULL,
    display_name text NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    is_input boolean DEFAULT true NOT NULL,
    content text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_guide_templates_content_type_check CHECK ((content_type = ANY (ARRAY['json'::text, 'markdown'::text])))
);


ALTER TABLE public.travel_guide_templates OWNER TO postgres;

--
-- Name: TABLE travel_guide_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.travel_guide_templates IS 'User-customized travel planning templates';


--
-- Name: travel_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.travel_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    claude_instructions text,
    claude_instructions_version character varying(20) DEFAULT '1.0'::character varying,
    family_profile jsonb,
    family_profile_version character varying(20) DEFAULT '1.0'::character varying,
    output_template jsonb,
    output_template_version character varying(20) DEFAULT '1.0'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.travel_settings OWNER TO postgres;

--
-- Name: TABLE travel_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.travel_settings IS 'User-specific travel planning configuration including Claude instructions, family profile, and output template.
Part of the trip import workflow - see docs/travel-module-prd.md for details.';


--
-- Name: trip_accommodations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_accommodations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    segment_id uuid,
    name character varying(255) NOT NULL,
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    check_in_time time without time zone DEFAULT '15:00:00'::time without time zone,
    check_out_time time without time zone DEFAULT '11:00:00'::time without time zone,
    nights integer,
    room_type character varying(100),
    cost numeric(10,2),
    currency character varying(3) DEFAULT 'USD'::character varying,
    points_used integer,
    loyalty_program character varying(50),
    booking_reference character varying(50),
    amenities jsonb,
    website text,
    phone character varying(30),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.trip_accommodations OWNER TO postgres;

--
-- Name: trip_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    day_id uuid,
    name character varying(255) NOT NULL,
    description text,
    activity_type character varying(30),
    time_block character varying(20),
    start_time time without time zone,
    end_time time without time zone,
    location_name character varying(255),
    address text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    google_maps_url text,
    why_its_great text,
    kid_friendliness text,
    gear_prep text,
    cost_estimate numeric(10,2),
    cost_currency character varying(3) DEFAULT 'USD'::character varying,
    website text,
    phone character varying(30),
    reservation_required boolean DEFAULT false,
    reservation_details text,
    is_backup boolean DEFAULT false,
    alltrails_url text,
    alltrails_rating numeric(2,1),
    alltrails_review_summary text,
    activity_details jsonb,
    tips text,
    notes text,
    sort_order integer DEFAULT 0,
    calendar_event_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    duration_minutes integer,
    booking_url text,
    kid_rating numeric(2,1),
    calendar_synced_at timestamp with time zone,
    alternate_to_activity_id uuid,
    priority character varying(20),
    confirmation_status character varying(20) DEFAULT 'unconfirmed'::character varying,
    confirmation_number character varying(100),
    date date,
    segment_id uuid,
    google_place_id character varying(255),
    google_rating numeric(2,1),
    google_review_count integer,
    google_price_level integer,
    opening_hours jsonb,
    photos_fetched boolean DEFAULT false,
    estimated_duration_minutes integer,
    practical_details jsonb,
    kid_engagement jsonb,
    deep_dive_content text,
    what_to_see jsonb,
    historical_context text,
    architecture_notes text,
    accessibility_info jsonb,
    warnings text[],
    deep_dive jsonb,
    google_editorial_summary text,
    wheelchair_accessible boolean,
    good_for_children boolean,
    good_for_groups boolean,
    reservable boolean,
    serves_breakfast boolean,
    serves_lunch boolean,
    serves_dinner boolean,
    serves_brunch boolean,
    serves_vegetarian boolean,
    dine_in boolean,
    takeout boolean,
    delivery boolean,
    outdoor_seating boolean,
    serves_beer boolean,
    serves_wine boolean,
    serves_cocktails boolean,
    live_music boolean,
    allows_dogs boolean,
    google_data_fetched_at timestamp with time zone,
    google_photos jsonb,
    alternative_type character varying(20),
    alternative_trigger text,
    why_not_scheduled text,
    CONSTRAINT trip_activities_alternative_type_check CHECK (((alternative_type)::text = ANY ((ARRAY['direct_replacement'::character varying, 'general_option'::character varying])::text[]))),
    CONSTRAINT trip_activities_confirmation_status_check CHECK (((confirmation_status)::text = ANY ((ARRAY['unconfirmed'::character varying, 'pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT trip_activities_google_price_level_check CHECK (((google_price_level IS NULL) OR ((google_price_level >= 1) AND (google_price_level <= 4)))),
    CONSTRAINT trip_activities_google_rating_check CHECK (((google_rating IS NULL) OR ((google_rating >= 1.0) AND (google_rating <= 5.0)))),
    CONSTRAINT trip_activities_kid_rating_check CHECK (((kid_rating >= (1)::numeric) AND (kid_rating <= (5)::numeric))),
    CONSTRAINT trip_activities_priority_check CHECK (((priority)::text = ANY ((ARRAY['must_do'::character varying, 'recommended'::character varying, 'optional'::character varying, 'if_time'::character varying])::text[])))
);


ALTER TABLE public.trip_activities OWNER TO postgres;

--
-- Name: COLUMN trip_activities.duration_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.duration_minutes IS 'Estimated duration when end_time not specified';


--
-- Name: COLUMN trip_activities.booking_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.booking_url IS 'Direct booking URL';


--
-- Name: COLUMN trip_activities.kid_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.kid_rating IS 'Kid-friendliness rating 1-5 stars';


--
-- Name: COLUMN trip_activities.calendar_synced_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.calendar_synced_at IS 'Last time synced to Google Calendar';


--
-- Name: COLUMN trip_activities.alternate_to_activity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.alternate_to_activity_id IS 'If this is an alternate, links to the main activity';


--
-- Name: COLUMN trip_activities.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.priority IS 'Activity priority: must_do, recommended, optional, backup, if_time';


--
-- Name: COLUMN trip_activities.confirmation_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.confirmation_status IS 'Booking status: unconfirmed, pending, confirmed, cancelled';


--
-- Name: COLUMN trip_activities.confirmation_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.confirmation_number IS 'Booking/reservation confirmation number';


--
-- Name: COLUMN trip_activities.google_place_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.google_place_id IS 'Google Places API place ID for this activity';


--
-- Name: COLUMN trip_activities.google_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.google_rating IS 'Google Places rating (1-5)';


--
-- Name: COLUMN trip_activities.google_review_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.google_review_count IS 'Number of Google reviews';


--
-- Name: COLUMN trip_activities.google_price_level; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.google_price_level IS 'Google price level (1-4)';


--
-- Name: COLUMN trip_activities.opening_hours; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.opening_hours IS 'JSON: {open_now, periods, weekday_text}';


--
-- Name: COLUMN trip_activities.photos_fetched; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.photos_fetched IS 'Whether Google photos have been fetched';


--
-- Name: COLUMN trip_activities.estimated_duration_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.estimated_duration_minutes IS 'Estimated visit duration in minutes';


--
-- Name: COLUMN trip_activities.practical_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.practical_details IS 'Structured practical info: {hours, cost_breakdown, time_needed, avoid_times, etc}';


--
-- Name: COLUMN trip_activities.kid_engagement; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.kid_engagement IS 'Tips for engaging kids by age: {age_7: [], age_5: [], age_3: [], general: []}';


--
-- Name: COLUMN trip_activities.deep_dive_content; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.deep_dive_content IS 'Long-form tour-guide narrative - "Why it matters" content';


--
-- Name: COLUMN trip_activities.what_to_see; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.what_to_see IS 'Specific things to look for: [{name, description, location_hint}]';


--
-- Name: COLUMN trip_activities.historical_context; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.historical_context IS 'Place-specific historical background';


--
-- Name: COLUMN trip_activities.architecture_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.architecture_notes IS 'Architectural style and features description';


--
-- Name: COLUMN trip_activities.accessibility_info; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.accessibility_info IS 'Stroller/accessibility: {stroller_friendly, notes, alternatives}';


--
-- Name: COLUMN trip_activities.warnings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.warnings IS 'Safety warnings and important cautions';


--
-- Name: COLUMN trip_activities.deep_dive; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.deep_dive IS 'V3 structured deep-dive: {what_it_is, why_it_matters, the_story, what_youll_see[]}';


--
-- Name: COLUMN trip_activities.google_editorial_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.google_editorial_summary IS 'Brief description from Google Places';


--
-- Name: COLUMN trip_activities.wheelchair_accessible; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.wheelchair_accessible IS 'Wheelchair accessible entrance';


--
-- Name: COLUMN trip_activities.good_for_children; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.good_for_children IS 'Good for children/families';


--
-- Name: COLUMN trip_activities.good_for_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.good_for_groups IS 'Good for groups';


--
-- Name: COLUMN trip_activities.reservable; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.reservable IS 'Accepts reservations';


--
-- Name: COLUMN trip_activities.alternative_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.alternative_type IS 'Type of alternative: direct_replacement (replaces specific activity) or general_option (general backup for segment)';


--
-- Name: COLUMN trip_activities.alternative_trigger; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.alternative_trigger IS 'Condition that would trigger using this alternative (e.g., "if rain", "if boat tour cancelled")';


--
-- Name: COLUMN trip_activities.why_not_scheduled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_activities.why_not_scheduled IS 'Explanation of why this alternative was not put on the main schedule';


--
-- Name: trip_calendar_sync; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_calendar_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    segment_id uuid,
    user_id uuid NOT NULL,
    google_calendar_id character varying(255),
    calendar_name character varying(255),
    sync_enabled boolean DEFAULT true,
    last_full_sync_at timestamp with time zone,
    last_sync_error text,
    total_events_synced integer DEFAULT 0,
    sync_activities boolean DEFAULT true,
    sync_meals boolean DEFAULT true,
    sync_transit boolean DEFAULT true,
    sync_logistics boolean DEFAULT true,
    sync_buffer boolean DEFAULT false,
    color_activity character varying(20) DEFAULT 'blue'::character varying,
    color_meal character varying(20) DEFAULT 'orange'::character varying,
    color_transit character varying(20) DEFAULT 'gray'::character varying,
    color_logistics character varying(20) DEFAULT 'purple'::character varying,
    color_buffer character varying(20) DEFAULT 'green'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.trip_calendar_sync OWNER TO postgres;

--
-- Name: TABLE trip_calendar_sync; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trip_calendar_sync IS 'Phase 4: Google Calendar sync configuration and status per trip/segment';


--
-- Name: trip_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_days (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    segment_id uuid,
    date date NOT NULL,
    day_number integer,
    title character varying(255),
    overview text,
    weather_high_c integer,
    weather_low_c integer,
    weather_conditions character varying(100),
    photo_opportunities jsonb,
    notes text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    theme character varying(255),
    alternate_activities jsonb,
    schedule jsonb,
    meals jsonb,
    logistics jsonb,
    backup_plan jsonb,
    assembly_status character varying(20) DEFAULT 'not_started'::character varying,
    assembly_summary jsonb,
    CONSTRAINT trip_days_assembly_status_check CHECK (((assembly_status)::text = ANY ((ARRAY['not_started'::character varying, 'in_progress'::character varying, 'assembled'::character varying, 'synced'::character varying])::text[])))
);


ALTER TABLE public.trip_days OWNER TO postgres;

--
-- Name: TABLE trip_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.trip_days IS 'Trip days with v3 schedule support. Each day can have a time-based schedule array with specific times like "9:00-11:00am" instead of just time blocks.';


--
-- Name: COLUMN trip_days.theme; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.theme IS 'Daily theme (e.g., "Gentle landing, jet-lag management")';


--
-- Name: COLUMN trip_days.alternate_activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.alternate_activities IS 'JSON array of backup activities: [{name, description, why}]';


--
-- Name: COLUMN trip_days.schedule; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.schedule IS 'V3 schedule format: [{time, activity_name, activity_type, location, notes, is_deep_dive}]';


--
-- Name: COLUMN trip_days.meals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.meals IS 'V3 meal plans: {breakfast, lunch, dinner}';


--
-- Name: COLUMN trip_days.logistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.logistics IS 'V3 day logistics: {driving, parking, tickets_needed, tips}';


--
-- Name: COLUMN trip_days.backup_plan; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.backup_plan IS 'V3 backup plans: {if_rain, if_tired, if_kids_meltdown}';


--
-- Name: COLUMN trip_days.assembly_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.assembly_status IS 'Phase 4 assembly status: not_started, in_progress, assembled, synced';


--
-- Name: COLUMN trip_days.assembly_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_days.assembly_summary IS 'Phase 4 summary: {total_events, total_transit_mins, total_walking_km, earliest_start, latest_end}';


--
-- Name: trip_driving; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_driving (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    rental_company character varying(100),
    vehicle_type character varying(100),
    pickup_location character varying(255),
    dropoff_location character varying(255),
    pickup_datetime timestamp with time zone,
    dropoff_datetime timestamp with time zone,
    booking_reference character varying(50),
    total_distance_km integer,
    fuel_estimate numeric(10,2),
    toll_estimate numeric(10,2),
    daily_rate numeric(10,2),
    insurance_included boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.trip_driving OWNER TO postgres;

--
-- Name: trip_flights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_flights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    direction character varying(20),
    airline character varying(100),
    flight_number character varying(20),
    departure_airport character varying(10),
    arrival_airport character varying(10),
    departure_datetime timestamp with time zone,
    arrival_datetime timestamp with time zone,
    booking_reference character varying(50),
    seat_assignments jsonb,
    layovers jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trip_flights_direction_check CHECK (((direction)::text = ANY ((ARRAY['outbound'::character varying, 'return'::character varying])::text[])))
);


ALTER TABLE public.trip_flights OWNER TO postgres;

--
-- Name: trip_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_type character varying(20) NOT NULL,
    parent_id uuid NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    media_type character varying(10),
    original_filename character varying(255),
    mime_type character varying(50),
    file_size_bytes bigint,
    width integer,
    height integer,
    caption text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    google_attribution_name character varying(255),
    google_attribution_uri text,
    is_google_sourced boolean DEFAULT false,
    approved boolean,
    google_photo_reference character varying(500),
    content_hash character varying(64),
    CONSTRAINT trip_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying])::text[]))),
    CONSTRAINT trip_media_parent_type_check CHECK (((parent_type)::text = ANY ((ARRAY['trip'::character varying, 'segment'::character varying, 'day'::character varying, 'activity'::character varying, 'accommodation'::character varying])::text[])))
);


ALTER TABLE public.trip_media OWNER TO postgres;

--
-- Name: COLUMN trip_media.google_attribution_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_media.google_attribution_name IS 'Google photo contributor name (required for attribution)';


--
-- Name: COLUMN trip_media.google_attribution_uri; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_media.google_attribution_uri IS 'Google photo contributor profile URL';


--
-- Name: COLUMN trip_media.is_google_sourced; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_media.is_google_sourced IS 'True if photo was fetched from Google Places';


--
-- Name: COLUMN trip_media.approved; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_media.approved IS 'Approval status: NULL=pending, TRUE=approved, FALSE=rejected';


--
-- Name: COLUMN trip_media.google_photo_reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trip_media.google_photo_reference IS 'Google Places photo name for duplicate detection';


--
-- Name: trip_sharing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trip_sharing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trip_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    permission character varying(20) DEFAULT 'view'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trip_sharing_permission_check CHECK (((permission)::text = ANY ((ARRAY['view'::character varying, 'edit'::character varying])::text[])))
);


ALTER TABLE public.trip_sharing OWNER TO postgres;

--
-- Name: trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    origin character varying(255),
    destination character varying(255),
    transportation_type character varying(20),
    cover_image_url text,
    traveler_count integer DEFAULT 1,
    budget_estimate jsonb,
    packing_checklist jsonb,
    status character varying(20) DEFAULT 'planning'::character varying,
    is_public boolean DEFAULT false,
    public_slug character varying(100),
    share_password_hash text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    logistics jsonb,
    overview text,
    route_description text,
    pacing_notes text,
    destination_country character varying(100),
    destination_country_code character varying(3),
    total_days integer,
    total_nights integer,
    budget jsonb,
    planning_progress jsonb DEFAULT '{"basics": {"completed": false, "auto_suggested": false}, "segments": {"completed": false, "auto_suggested": false}, "accommodations": {"completed": false, "auto_suggested": false}, "days_activities": {"completed": false, "auto_suggested": false}}'::jsonb,
    CONSTRAINT trips_status_check CHECK (((status)::text = ANY ((ARRAY['planning'::character varying, 'confirmed'::character varying, 'in_progress'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT trips_transportation_type_check CHECK (((transportation_type)::text = ANY ((ARRAY['flying'::character varying, 'driving'::character varying, 'both'::character varying])::text[])))
);


ALTER TABLE public.trips OWNER TO postgres;

--
-- Name: COLUMN trips.logistics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.logistics IS 'V3 trip logistics: {flights, car_rental, driving_summary, trains, ferries}';


--
-- Name: COLUMN trips.overview; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.overview IS 'V3 trip overview - 2-3 paragraph trip vision and summary';


--
-- Name: COLUMN trips.route_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.route_description IS 'V3 route description - geographical flow of the trip';


--
-- Name: COLUMN trips.pacing_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.pacing_notes IS 'V3 pacing notes - notes about trip pace, rest days';


--
-- Name: COLUMN trips.total_days; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.total_days IS 'Total number of days in the trip';


--
-- Name: COLUMN trips.total_nights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.total_nights IS 'Total number of nights in the trip';


--
-- Name: COLUMN trips.budget; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.budget IS 'V3 budget: {strategy, accommodation_split, splurge_moments[], save_moments[], estimated_daily, notes}';


--
-- Name: COLUMN trips.planning_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.trips.planning_progress IS 'Tracks planning progress for guided trip planning. Structure: {basics: {auto_suggested, completed, completed_at?}, accommodations: {...}, segments: {...}, days_activities: {...}}';


--
-- Name: user_diet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_diet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    diet_type text DEFAULT 'untracked'::text,
    diet_type_other text,
    target_protein_g integer,
    target_carbs_g integer,
    target_fat_g integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_diet_diet_type_check CHECK ((diet_type = ANY (ARRAY['untracked'::text, 'standard'::text, 'keto'::text, 'carnivore'::text, 'vegan'::text, 'vegetarian'::text, 'mediterranean'::text, 'paleo'::text, 'low_fodmap'::text, 'other'::text])))
);


ALTER TABLE public.user_diet OWNER TO postgres;

--
-- Name: user_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user uuid NOT NULL,
    linked_user uuid,
    permission text DEFAULT 'read'::text,
    status text DEFAULT 'pending'::text,
    invite_code text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_links_permission_check CHECK ((permission = ANY (ARRAY['read'::text, 'write'::text, 'admin'::text]))),
    CONSTRAINT user_links_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'revoked'::text])))
);


ALTER TABLE public.user_links OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text,
    avatar_url text,
    role text DEFAULT 'member'::text,
    is_active boolean DEFAULT true,
    onboarding_completed boolean DEFAULT false,
    onboarding_step text DEFAULT 'profile'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    timezone text DEFAULT 'America/Los_Angeles'::text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: access_tokens access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_tokens
    ADD CONSTRAINT access_tokens_pkey PRIMARY KEY (id);


--
-- Name: ai_api_keys ai_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_api_keys
    ADD CONSTRAINT ai_api_keys_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: api_usage_tracking api_usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_usage_tracking
    ADD CONSTRAINT api_usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: biomarker_notes biomarker_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarker_notes
    ADD CONSTRAINT biomarker_notes_pkey PRIMARY KEY (id);


--
-- Name: biomarker_stars biomarker_stars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarker_stars
    ADD CONSTRAINT biomarker_stars_pkey PRIMARY KEY (id);


--
-- Name: biomarker_stars biomarker_stars_user_id_biomarker_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarker_stars
    ADD CONSTRAINT biomarker_stars_user_id_biomarker_name_key UNIQUE (user_id, biomarker_name);


--
-- Name: biomarkers biomarkers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarkers
    ADD CONSTRAINT biomarkers_pkey PRIMARY KEY (id);


--
-- Name: biomarkers biomarkers_user_name_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarkers
    ADD CONSTRAINT biomarkers_user_name_date_unique UNIQUE (user_id, name, date_tested);


--
-- Name: change_log change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: daily_schedule_items daily_schedule_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_schedule_items
    ADD CONSTRAINT daily_schedule_items_pkey PRIMARY KEY (id);


--
-- Name: eight_sleep_integrations eight_sleep_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eight_sleep_integrations
    ADD CONSTRAINT eight_sleep_integrations_pkey PRIMARY KEY (id);


--
-- Name: eight_sleep_integrations eight_sleep_integrations_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eight_sleep_integrations
    ADD CONSTRAINT eight_sleep_integrations_user_id_key UNIQUE (user_id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: facial_products facial_products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facial_products
    ADD CONSTRAINT facial_products_pkey PRIMARY KEY (id);


--
-- Name: goal_interventions goal_interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goal_interventions
    ADD CONSTRAINT goal_interventions_pkey PRIMARY KEY (id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_oauth_tokens google_calendar_oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_calendar_oauth_tokens
    ADD CONSTRAINT google_calendar_oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: journal_capsule_recipients journal_capsule_recipients_entry_id_recipient_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_capsule_recipients
    ADD CONSTRAINT journal_capsule_recipients_entry_id_recipient_id_key UNIQUE (entry_id, recipient_id);


--
-- Name: journal_capsule_recipients journal_capsule_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_capsule_recipients
    ADD CONSTRAINT journal_capsule_recipients_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_public_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_public_slug_key UNIQUE (public_slug);


--
-- Name: journal_media journal_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_media
    ADD CONSTRAINT journal_media_pkey PRIMARY KEY (id);


--
-- Name: journal_prompts journal_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_prompts
    ADD CONSTRAINT journal_prompts_pkey PRIMARY KEY (id);


--
-- Name: journal_recipients journal_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_recipients
    ADD CONSTRAINT journal_recipients_pkey PRIMARY KEY (id);


--
-- Name: protocol_docs protocol_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.protocol_docs
    ADD CONSTRAINT protocol_docs_pkey PRIMARY KEY (id);


--
-- Name: routine_items routine_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT routine_items_pkey PRIMARY KEY (id);


--
-- Name: routine_versions routine_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_versions
    ADD CONSTRAINT routine_versions_pkey PRIMARY KEY (id);


--
-- Name: routine_versions routine_versions_user_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_versions
    ADD CONSTRAINT routine_versions_user_id_version_number_key UNIQUE (user_id, version_number);


--
-- Name: routines routines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_pkey PRIMARY KEY (id);


--
-- Name: rv_enrichment_jobs rv_enrichment_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_enrichment_jobs
    ADD CONSTRAINT rv_enrichment_jobs_pkey PRIMARY KEY (id);


--
-- Name: rv_location_activities rv_location_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_location_activities
    ADD CONSTRAINT rv_location_activities_pkey PRIMARY KEY (id);


--
-- Name: rv_location_media rv_location_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_location_media
    ADD CONSTRAINT rv_location_media_pkey PRIMARY KEY (id);


--
-- Name: rv_locations rv_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_locations
    ADD CONSTRAINT rv_locations_pkey PRIMARY KEY (id);


--
-- Name: rv_research_settings rv_research_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_research_settings
    ADD CONSTRAINT rv_research_settings_pkey PRIMARY KEY (id);


--
-- Name: rv_research_settings rv_research_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_research_settings
    ADD CONSTRAINT rv_research_settings_user_id_key UNIQUE (user_id);


--
-- Name: schedule_items schedule_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_pkey PRIMARY KEY (id);


--
-- Name: sleep_protocol_correlation sleep_protocol_correlation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_protocol_correlation
    ADD CONSTRAINT sleep_protocol_correlation_pkey PRIMARY KEY (id);


--
-- Name: sleep_protocol_correlation sleep_protocol_correlation_sleep_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_protocol_correlation
    ADD CONSTRAINT sleep_protocol_correlation_sleep_session_id_key UNIQUE (sleep_session_id);


--
-- Name: sleep_sessions sleep_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_sessions
    ADD CONSTRAINT sleep_sessions_pkey PRIMARY KEY (id);


--
-- Name: sleep_sessions sleep_sessions_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_sessions
    ADD CONSTRAINT sleep_sessions_user_id_date_key UNIQUE (user_id, date);


--
-- Name: supplement_goals supplement_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplement_goals
    ADD CONSTRAINT supplement_goals_pkey PRIMARY KEY (id);


--
-- Name: supplement_goals supplement_goals_supplement_id_goal_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplement_goals
    ADD CONSTRAINT supplement_goals_supplement_id_goal_id_key UNIQUE (supplement_id, goal_id);


--
-- Name: supplements supplements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplements
    ADD CONSTRAINT supplements_pkey PRIMARY KEY (id);


--
-- Name: sync_schedules sync_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_schedules
    ADD CONSTRAINT sync_schedules_pkey PRIMARY KEY (id);


--
-- Name: sync_schedules sync_schedules_user_id_integration_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_schedules
    ADD CONSTRAINT sync_schedules_user_id_integration_type_key UNIQUE (user_id, integration_type);


--
-- Name: ticket_classification_matches ticket_classification_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_classification_matches
    ADD CONSTRAINT ticket_classification_matches_pkey PRIMARY KEY (id);


--
-- Name: ticket_classification_matches ticket_classification_matches_ticket_id_classification_rule_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_classification_matches
    ADD CONSTRAINT ticket_classification_matches_ticket_id_classification_rule_key UNIQUE (ticket_id, classification_rule_id);


--
-- Name: ticket_classification_rules ticket_classification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_classification_rules
    ADD CONSTRAINT ticket_classification_rules_pkey PRIMARY KEY (id);


--
-- Name: travel_guide_phases travel_guide_phases_phase_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_phases
    ADD CONSTRAINT travel_guide_phases_phase_number_key UNIQUE (phase_number);


--
-- Name: travel_guide_phases travel_guide_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_phases
    ADD CONSTRAINT travel_guide_phases_pkey PRIMARY KEY (id);


--
-- Name: travel_guide_template_definitions travel_guide_template_definitions_phase_number_template_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_template_definitions
    ADD CONSTRAINT travel_guide_template_definitions_phase_number_template_key_key UNIQUE (phase_number, template_key);


--
-- Name: travel_guide_template_definitions travel_guide_template_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_template_definitions
    ADD CONSTRAINT travel_guide_template_definitions_pkey PRIMARY KEY (id);


--
-- Name: travel_guide_templates travel_guide_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_templates
    ADD CONSTRAINT travel_guide_templates_pkey PRIMARY KEY (id);


--
-- Name: travel_guide_templates travel_guide_templates_user_id_phase_number_template_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_templates
    ADD CONSTRAINT travel_guide_templates_user_id_phase_number_template_key_key UNIQUE (user_id, phase_number, template_key);


--
-- Name: travel_settings travel_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_settings
    ADD CONSTRAINT travel_settings_pkey PRIMARY KEY (id);


--
-- Name: travel_settings travel_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_settings
    ADD CONSTRAINT travel_settings_user_id_key UNIQUE (user_id);


--
-- Name: trip_accommodations trip_accommodations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_accommodations
    ADD CONSTRAINT trip_accommodations_pkey PRIMARY KEY (id);


--
-- Name: trip_activities trip_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_activities
    ADD CONSTRAINT trip_activities_pkey PRIMARY KEY (id);


--
-- Name: trip_calendar_sync trip_calendar_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_calendar_sync
    ADD CONSTRAINT trip_calendar_sync_pkey PRIMARY KEY (id);


--
-- Name: trip_calendar_sync trip_calendar_sync_trip_id_segment_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_calendar_sync
    ADD CONSTRAINT trip_calendar_sync_trip_id_segment_id_user_id_key UNIQUE (trip_id, segment_id, user_id);


--
-- Name: trip_days trip_days_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_days
    ADD CONSTRAINT trip_days_pkey PRIMARY KEY (id);


--
-- Name: trip_driving trip_driving_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_driving
    ADD CONSTRAINT trip_driving_pkey PRIMARY KEY (id);


--
-- Name: trip_flights trip_flights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_flights
    ADD CONSTRAINT trip_flights_pkey PRIMARY KEY (id);


--
-- Name: trip_media trip_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_media
    ADD CONSTRAINT trip_media_pkey PRIMARY KEY (id);


--
-- Name: trip_research_items trip_research_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_research_items
    ADD CONSTRAINT trip_research_items_pkey PRIMARY KEY (id);


--
-- Name: trip_segments trip_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_segments
    ADD CONSTRAINT trip_segments_pkey PRIMARY KEY (id);


--
-- Name: trip_sharing trip_sharing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_sharing
    ADD CONSTRAINT trip_sharing_pkey PRIMARY KEY (id);


--
-- Name: trip_sharing trip_sharing_trip_id_shared_with_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_sharing
    ADD CONSTRAINT trip_sharing_trip_id_shared_with_user_id_key UNIQUE (trip_id, shared_with_user_id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: trips trips_public_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_public_slug_key UNIQUE (public_slug);


--
-- Name: user_diet user_diet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_diet
    ADD CONSTRAINT user_diet_pkey PRIMARY KEY (id);


--
-- Name: user_diet user_diet_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_diet
    ADD CONSTRAINT user_diet_user_id_key UNIQUE (user_id);


--
-- Name: user_links user_links_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_links
    ADD CONSTRAINT user_links_invite_code_key UNIQUE (invite_code);


--
-- Name: user_links user_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_links
    ADD CONSTRAINT user_links_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_access_tokens_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_access_tokens_token_hash ON public.access_tokens USING btree (token_hash);


--
-- Name: idx_access_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_access_tokens_user_id ON public.access_tokens USING btree (user_id);


--
-- Name: idx_ai_api_keys_health; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_api_keys_health ON public.ai_api_keys USING btree (health_status);


--
-- Name: idx_ai_api_keys_primary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_api_keys_primary ON public.ai_api_keys USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_ai_api_keys_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_api_keys_provider ON public.ai_api_keys USING btree (provider);


--
-- Name: idx_ai_api_keys_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_api_keys_user ON public.ai_api_keys USING btree (user_id);


--
-- Name: idx_ai_conversations_biomarker_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_conversations_biomarker_name ON public.ai_conversations USING btree (biomarker_name);


--
-- Name: idx_ai_conversations_context; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_conversations_context ON public.ai_conversations USING btree (context);


--
-- Name: idx_api_usage_context; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_context ON public.api_usage_tracking USING btree (context_type, context_id);


--
-- Name: idx_api_usage_user_provider_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_usage_user_provider_date ON public.api_usage_tracking USING btree (user_id, provider, created_at);


--
-- Name: idx_biomarker_notes_biomarker_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarker_notes_biomarker_name ON public.biomarker_notes USING btree (biomarker_name);


--
-- Name: idx_biomarker_notes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarker_notes_user_id ON public.biomarker_notes USING btree (user_id);


--
-- Name: idx_biomarker_stars_biomarker_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarker_stars_biomarker_name ON public.biomarker_stars USING btree (biomarker_name);


--
-- Name: idx_biomarker_stars_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarker_stars_user_id ON public.biomarker_stars USING btree (user_id);


--
-- Name: idx_biomarkers_date_tested; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarkers_date_tested ON public.biomarkers USING btree (date_tested);


--
-- Name: idx_biomarkers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarkers_name ON public.biomarkers USING btree (name);


--
-- Name: idx_biomarkers_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_biomarkers_user_id ON public.biomarkers USING btree (user_id);


--
-- Name: idx_capsule_recipients_entry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_capsule_recipients_entry ON public.journal_capsule_recipients USING btree (entry_id);


--
-- Name: idx_capsule_recipients_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_capsule_recipients_recipient ON public.journal_capsule_recipients USING btree (recipient_id);


--
-- Name: idx_change_log_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_change_log_date ON public.change_log USING btree (date);


--
-- Name: idx_change_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_change_log_user_id ON public.change_log USING btree (user_id);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (created_at);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id);


--
-- Name: idx_chat_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_sessions_active ON public.chat_sessions USING btree (is_active);


--
-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_classification_matches_rule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_matches_rule ON public.ticket_classification_matches USING btree (classification_rule_id);


--
-- Name: idx_classification_matches_ticket; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_matches_ticket ON public.ticket_classification_matches USING btree (ticket_id);


--
-- Name: idx_classification_matches_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_matches_workspace ON public.ticket_classification_matches USING btree (workspace_id);


--
-- Name: idx_classification_rules_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_rules_active ON public.ticket_classification_rules USING btree (is_active);


--
-- Name: idx_classification_rules_domain; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_rules_domain ON public.ticket_classification_rules USING btree (sender_domain) WHERE (sender_domain IS NOT NULL);


--
-- Name: idx_classification_rules_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_rules_subject ON public.ticket_classification_rules USING btree (subject_pattern) WHERE (subject_pattern IS NOT NULL);


--
-- Name: idx_classification_rules_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_rules_type ON public.ticket_classification_rules USING btree (classification_type);


--
-- Name: idx_classification_rules_workspace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classification_rules_workspace ON public.ticket_classification_rules USING btree (workspace_id);


--
-- Name: idx_daily_schedule_items_calendar_sync; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_calendar_sync ON public.daily_schedule_items USING btree (calendar_sync_status) WHERE ((calendar_sync_status)::text <> 'synced'::text);


--
-- Name: idx_daily_schedule_items_day_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_day_id ON public.daily_schedule_items USING btree (day_id);


--
-- Name: idx_daily_schedule_items_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_event_type ON public.daily_schedule_items USING btree (event_type);


--
-- Name: idx_daily_schedule_items_segment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_segment_id ON public.daily_schedule_items USING btree (segment_id);


--
-- Name: idx_daily_schedule_items_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_sort ON public.daily_schedule_items USING btree (day_id, sort_order);


--
-- Name: idx_daily_schedule_items_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_time ON public.daily_schedule_items USING btree (time_start, time_end);


--
-- Name: idx_daily_schedule_items_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_schedule_items_trip_id ON public.daily_schedule_items USING btree (trip_id);


--
-- Name: idx_eight_sleep_integrations_sync_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_eight_sleep_integrations_sync_enabled ON public.eight_sleep_integrations USING btree (sync_enabled) WHERE (sync_enabled = true);


--
-- Name: idx_eight_sleep_integrations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_eight_sleep_integrations_user_id ON public.eight_sleep_integrations USING btree (user_id);


--
-- Name: idx_enrichment_jobs_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrichment_jobs_user_status ON public.rv_enrichment_jobs USING btree (user_id, status);


--
-- Name: idx_equipment_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipment_category ON public.equipment USING btree (category);


--
-- Name: idx_equipment_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipment_is_active ON public.equipment USING btree (is_active);


--
-- Name: idx_equipment_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_equipment_user_id ON public.equipment USING btree (user_id);


--
-- Name: idx_facial_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facial_products_category ON public.facial_products USING btree (category);


--
-- Name: idx_facial_products_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facial_products_is_active ON public.facial_products USING btree (is_active);


--
-- Name: idx_facial_products_routines; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facial_products_routines ON public.facial_products USING gin (routines);


--
-- Name: idx_facial_products_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facial_products_user_id ON public.facial_products USING btree (user_id);


--
-- Name: idx_goals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_goals_status ON public.goals USING btree (status);


--
-- Name: idx_goals_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_goals_user_id ON public.goals USING btree (user_id);


--
-- Name: idx_google_calendar_tokens_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_google_calendar_tokens_active ON public.google_calendar_oauth_tokens USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_google_calendar_tokens_sync_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_google_calendar_tokens_sync_enabled ON public.google_calendar_oauth_tokens USING btree (sync_enabled) WHERE (sync_enabled = true);


--
-- Name: idx_google_calendar_tokens_unique_active_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_google_calendar_tokens_unique_active_user ON public.google_calendar_oauth_tokens USING btree (user_id) WHERE (is_active = true);


--
-- Name: idx_google_calendar_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_google_calendar_tokens_user_id ON public.google_calendar_oauth_tokens USING btree (user_id);


--
-- Name: idx_journal_entries_capsule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_entries_capsule ON public.journal_entries USING btree (capsule_delivery_date) WHERE ((is_time_capsule = true) AND (capsule_delivered = false));


--
-- Name: idx_journal_entries_entry_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_entries_entry_date ON public.journal_entries USING btree (entry_date);


--
-- Name: idx_journal_entries_is_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_entries_is_public ON public.journal_entries USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_journal_entries_tags; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_entries_tags ON public.journal_entries USING gin (tags);


--
-- Name: idx_journal_entries_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_entries_user_id ON public.journal_entries USING btree (user_id);


--
-- Name: idx_journal_media_entry_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_media_entry_id ON public.journal_media USING btree (entry_id);


--
-- Name: idx_journal_media_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_media_user_id ON public.journal_media USING btree (user_id);


--
-- Name: idx_journal_prompts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_prompts_active ON public.journal_prompts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_journal_prompts_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_prompts_user ON public.journal_prompts USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_journal_recipients_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journal_recipients_user_id ON public.journal_recipients USING btree (user_id);


--
-- Name: idx_research_items_day; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_day ON public.trip_research_items USING btree (trip_id, assigned_day, assigned_time_block);


--
-- Name: idx_research_items_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_priority ON public.trip_research_items USING btree (priority);


--
-- Name: idx_research_items_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_search ON public.trip_research_items USING gin (to_tsvector('english'::regconfig, (((COALESCE(name, ''::character varying))::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_research_items_segment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_segment ON public.trip_research_items USING btree (segment_id);


--
-- Name: idx_research_items_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_source ON public.trip_research_items USING btree (source_url);


--
-- Name: idx_research_items_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_status ON public.trip_research_items USING btree (status);


--
-- Name: idx_research_items_trip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_trip ON public.trip_research_items USING btree (trip_id);


--
-- Name: idx_research_items_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_type ON public.trip_research_items USING btree (item_type);


--
-- Name: idx_research_items_workflow; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_research_items_workflow ON public.trip_research_items USING btree (trip_id, status, priority);


--
-- Name: idx_routine_versions_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_routine_versions_user ON public.routine_versions USING btree (user_id);


--
-- Name: idx_routine_versions_user_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_routine_versions_user_version ON public.routine_versions USING btree (user_id, version_number DESC);


--
-- Name: idx_routines_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_routines_user_id ON public.routines USING btree (user_id);


--
-- Name: idx_rv_activities_enriched_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_activities_enriched_at ON public.rv_location_activities USING btree (enriched_at);


--
-- Name: idx_rv_location_activities_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_activities_location_id ON public.rv_location_activities USING btree (location_id);


--
-- Name: idx_rv_location_activities_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_activities_sort ON public.rv_location_activities USING btree (location_id, sort_order);


--
-- Name: idx_rv_location_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_activities_type ON public.rv_location_activities USING btree (activity_type);


--
-- Name: idx_rv_location_media_activity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_media_activity_id ON public.rv_location_media USING btree (activity_id);


--
-- Name: idx_rv_location_media_content_hash_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_rv_location_media_content_hash_unique ON public.rv_location_media USING btree (location_id, COALESCE(activity_id, '00000000-0000-0000-0000-000000000000'::uuid), content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: INDEX idx_rv_location_media_content_hash_unique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_rv_location_media_content_hash_unique IS 'Prevents duplicate content within same location+activity. COALESCE handles null activity_id (campground photos).';


--
-- Name: idx_rv_location_media_favorite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_media_favorite ON public.rv_location_media USING btree (location_id, is_favorite DESC, sort_order);


--
-- Name: idx_rv_location_media_google_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_media_google_ref ON public.rv_location_media USING btree (google_photo_reference) WHERE (google_photo_reference IS NOT NULL);


--
-- Name: idx_rv_location_media_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_media_location_id ON public.rv_location_media USING btree (location_id);


--
-- Name: idx_rv_location_media_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_location_media_user_id ON public.rv_location_media USING btree (user_id);


--
-- Name: idx_rv_locations_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_locations_category ON public.rv_locations USING btree (category);


--
-- Name: idx_rv_locations_enriched_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_locations_enriched_at ON public.rv_locations USING btree (enriched_at);


--
-- Name: idx_rv_locations_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_locations_priority ON public.rv_locations USING btree (user_id, priority);


--
-- Name: idx_rv_locations_share_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_rv_locations_share_slug ON public.rv_locations USING btree (share_slug) WHERE (share_slug IS NOT NULL);


--
-- Name: idx_rv_locations_share_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_rv_locations_share_token ON public.rv_locations USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_rv_locations_state; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_locations_state ON public.rv_locations USING btree (state);


--
-- Name: idx_rv_locations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_locations_status ON public.rv_locations USING btree (status);


--
-- Name: idx_rv_locations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_locations_user_id ON public.rv_locations USING btree (user_id);


--
-- Name: idx_rv_research_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rv_research_settings_user_id ON public.rv_research_settings USING btree (user_id);


--
-- Name: idx_schedule_items_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_items_active ON public.schedule_items USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_schedule_items_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_items_type ON public.schedule_items USING btree (user_id, item_type);


--
-- Name: idx_schedule_items_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schedule_items_user ON public.schedule_items USING btree (user_id);


--
-- Name: idx_sleep_protocol_correlation_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_protocol_correlation_date ON public.sleep_protocol_correlation USING btree (date DESC);


--
-- Name: idx_sleep_protocol_correlation_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_protocol_correlation_session ON public.sleep_protocol_correlation USING btree (sleep_session_id);


--
-- Name: idx_sleep_protocol_correlation_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_protocol_correlation_user_id ON public.sleep_protocol_correlation USING btree (user_id);


--
-- Name: idx_sleep_sessions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_sessions_date ON public.sleep_sessions USING btree (date DESC);


--
-- Name: idx_sleep_sessions_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_sessions_user_date ON public.sleep_sessions USING btree (user_id, date DESC);


--
-- Name: idx_sleep_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_sessions_user_id ON public.sleep_sessions USING btree (user_id);


--
-- Name: idx_sleep_sessions_woke_2_4_am; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sleep_sessions_woke_2_4_am ON public.sleep_sessions USING btree (user_id, woke_between_2_and_4_am) WHERE (woke_between_2_and_4_am = true);


--
-- Name: idx_supplement_goals_goal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplement_goals_goal ON public.supplement_goals USING btree (goal_id);


--
-- Name: idx_supplement_goals_supplement; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplement_goals_supplement ON public.supplement_goals USING btree (supplement_id);


--
-- Name: idx_supplements_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplements_is_active ON public.supplements USING btree (is_active);


--
-- Name: idx_supplements_product_data_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplements_product_data_source ON public.supplements USING btree (product_data_source);


--
-- Name: idx_supplements_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_supplements_user_id ON public.supplements USING btree (user_id);


--
-- Name: idx_sync_schedules_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_schedules_enabled ON public.sync_schedules USING btree (is_enabled, integration_type) WHERE (is_enabled = true);


--
-- Name: idx_sync_schedules_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_schedules_user_id ON public.sync_schedules USING btree (user_id);


--
-- Name: idx_travel_guide_templates_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_travel_guide_templates_lookup ON public.travel_guide_templates USING btree (user_id, phase_number, template_key);


--
-- Name: idx_travel_guide_templates_phase; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_travel_guide_templates_phase ON public.travel_guide_templates USING btree (user_id, phase_number);


--
-- Name: idx_travel_guide_templates_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_travel_guide_templates_user_id ON public.travel_guide_templates USING btree (user_id);


--
-- Name: idx_travel_settings_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_travel_settings_user ON public.travel_settings USING btree (user_id);


--
-- Name: idx_trip_accommodations_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_accommodations_dates ON public.trip_accommodations USING btree (check_in_date, check_out_date);


--
-- Name: idx_trip_accommodations_segment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_accommodations_segment_id ON public.trip_accommodations USING btree (segment_id);


--
-- Name: idx_trip_accommodations_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_accommodations_trip_id ON public.trip_accommodations USING btree (trip_id);


--
-- Name: idx_trip_activities_alternate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_alternate ON public.trip_activities USING btree (alternate_to_activity_id) WHERE (alternate_to_activity_id IS NOT NULL);


--
-- Name: idx_trip_activities_alternatives; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_alternatives ON public.trip_activities USING btree (alternate_to_activity_id, alternative_type) WHERE (alternate_to_activity_id IS NOT NULL);


--
-- Name: idx_trip_activities_backup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_backup ON public.trip_activities USING btree (day_id, is_backup);


--
-- Name: idx_trip_activities_calendar_sync; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_calendar_sync ON public.trip_activities USING btree (calendar_event_id) WHERE (calendar_event_id IS NOT NULL);


--
-- Name: idx_trip_activities_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_date ON public.trip_activities USING btree (trip_id, date);


--
-- Name: idx_trip_activities_day_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_day_id ON public.trip_activities USING btree (day_id);


--
-- Name: idx_trip_activities_google_place_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_google_place_id ON public.trip_activities USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);


--
-- Name: idx_trip_activities_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_sort ON public.trip_activities USING btree (day_id, sort_order);


--
-- Name: idx_trip_activities_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_time ON public.trip_activities USING btree (start_time);


--
-- Name: idx_trip_activities_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_activities_trip_id ON public.trip_activities USING btree (trip_id);


--
-- Name: idx_trip_calendar_sync_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_calendar_sync_trip_id ON public.trip_calendar_sync USING btree (trip_id);


--
-- Name: idx_trip_calendar_sync_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_calendar_sync_user_id ON public.trip_calendar_sync USING btree (user_id);


--
-- Name: idx_trip_days_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_days_date ON public.trip_days USING btree (date);


--
-- Name: idx_trip_days_segment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_days_segment_id ON public.trip_days USING btree (segment_id);


--
-- Name: idx_trip_days_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_days_sort ON public.trip_days USING btree (trip_id, sort_order);


--
-- Name: idx_trip_days_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_days_trip_id ON public.trip_days USING btree (trip_id);


--
-- Name: idx_trip_driving_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_driving_trip_id ON public.trip_driving USING btree (trip_id);


--
-- Name: idx_trip_flights_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_flights_trip_id ON public.trip_flights USING btree (trip_id);


--
-- Name: idx_trip_media_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_approved ON public.trip_media USING btree (approved) WHERE (is_google_sourced = true);


--
-- Name: idx_trip_media_content_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_content_hash ON public.trip_media USING btree (content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_trip_media_content_hash_trip_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_trip_media_content_hash_trip_unique ON public.trip_media USING btree (trip_id, content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: INDEX idx_trip_media_content_hash_trip_unique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_trip_media_content_hash_trip_unique IS 'Prevents duplicate images by content within a trip';


--
-- Name: idx_trip_media_file_url_trip_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_trip_media_file_url_trip_unique ON public.trip_media USING btree (trip_id, file_url);


--
-- Name: INDEX idx_trip_media_file_url_trip_unique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_trip_media_file_url_trip_unique IS 'Prevents duplicate file URLs within a trip';


--
-- Name: idx_trip_media_google_photo_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_google_photo_ref ON public.trip_media USING btree (google_photo_reference) WHERE (google_photo_reference IS NOT NULL);


--
-- Name: idx_trip_media_google_photo_trip_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_trip_media_google_photo_trip_unique ON public.trip_media USING btree (trip_id, google_photo_reference) WHERE (google_photo_reference IS NOT NULL);


--
-- Name: INDEX idx_trip_media_google_photo_trip_unique; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_trip_media_google_photo_trip_unique IS 'Prevents duplicate Google photo references within a trip';


--
-- Name: idx_trip_media_google_photo_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_trip_media_google_photo_unique ON public.trip_media USING btree (parent_type, parent_id, google_photo_reference) WHERE (google_photo_reference IS NOT NULL);


--
-- Name: idx_trip_media_google_sourced; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_google_sourced ON public.trip_media USING btree (is_google_sourced) WHERE (is_google_sourced = true);


--
-- Name: idx_trip_media_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_parent ON public.trip_media USING btree (parent_type, parent_id);


--
-- Name: idx_trip_media_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_trip_id ON public.trip_media USING btree (trip_id);


--
-- Name: idx_trip_media_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_media_user_id ON public.trip_media USING btree (user_id);


--
-- Name: idx_trip_segments_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_segments_dates ON public.trip_segments USING btree (start_date, end_date);


--
-- Name: idx_trip_segments_google_place_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_segments_google_place_id ON public.trip_segments USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);


--
-- Name: idx_trip_segments_segment_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_segments_segment_number ON public.trip_segments USING btree (trip_id, segment_number);


--
-- Name: idx_trip_segments_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_segments_sort ON public.trip_segments USING btree (trip_id, sort_order);


--
-- Name: idx_trip_segments_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_segments_trip_id ON public.trip_segments USING btree (trip_id);


--
-- Name: idx_trip_sharing_trip_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_sharing_trip_id ON public.trip_sharing USING btree (trip_id);


--
-- Name: idx_trip_sharing_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trip_sharing_user_id ON public.trip_sharing USING btree (shared_with_user_id);


--
-- Name: idx_trips_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_dates ON public.trips USING btree (start_date, end_date);


--
-- Name: idx_trips_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_public ON public.trips USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_trips_public_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_public_slug ON public.trips USING btree (public_slug) WHERE (public_slug IS NOT NULL);


--
-- Name: idx_trips_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_status ON public.trips USING btree (status);


--
-- Name: idx_trips_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trips_user_id ON public.trips USING btree (user_id);


--
-- Name: idx_user_diet_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_diet_user ON public.user_diet USING btree (user_id);


--
-- Name: idx_user_links_invite_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_links_invite_code ON public.user_links USING btree (invite_code);


--
-- Name: idx_user_links_linked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_links_linked ON public.user_links USING btree (linked_user);


--
-- Name: idx_user_links_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_links_owner ON public.user_links USING btree (owner_user);


--
-- Name: unique_primary_per_provider_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_primary_per_provider_per_user ON public.ai_api_keys USING btree (user_id, provider) WHERE (is_primary = true);


--
-- Name: ai_api_keys trigger_ai_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_ai_api_keys_updated_at BEFORE UPDATE ON public.ai_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_ai_api_keys_updated_at();


--
-- Name: chat_sessions trigger_chat_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_chat_sessions_updated_at();


--
-- Name: trip_research_items trigger_update_research_item_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_research_item_timestamp BEFORE UPDATE ON public.trip_research_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_conversations update_ai_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: biomarker_notes update_biomarker_notes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_biomarker_notes_updated_at BEFORE UPDATE ON public.biomarker_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: biomarkers update_biomarkers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_biomarkers_updated_at BEFORE UPDATE ON public.biomarkers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: daily_schedule_items update_daily_schedule_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_daily_schedule_items_updated_at BEFORE UPDATE ON public.daily_schedule_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: eight_sleep_integrations update_eight_sleep_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_eight_sleep_integrations_updated_at BEFORE UPDATE ON public.eight_sleep_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: equipment update_equipment_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: facial_products update_facial_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_facial_products_updated_at BEFORE UPDATE ON public.facial_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goals update_goals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: google_calendar_oauth_tokens update_google_calendar_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_google_calendar_tokens_updated_at BEFORE UPDATE ON public.google_calendar_oauth_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journal_entries update_journal_entries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journal_recipients update_journal_recipients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_journal_recipients_updated_at BEFORE UPDATE ON public.journal_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: protocol_docs update_protocol_docs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_protocol_docs_updated_at BEFORE UPDATE ON public.protocol_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rv_location_activities update_rv_location_activities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rv_location_activities_updated_at BEFORE UPDATE ON public.rv_location_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rv_locations update_rv_locations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rv_locations_updated_at BEFORE UPDATE ON public.rv_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rv_research_settings update_rv_research_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_rv_research_settings_updated_at BEFORE UPDATE ON public.rv_research_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: schedule_items update_schedule_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_schedule_items_updated_at BEFORE UPDATE ON public.schedule_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sleep_sessions update_sleep_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sleep_sessions_updated_at BEFORE UPDATE ON public.sleep_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplements update_supplements_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_supplements_updated_at BEFORE UPDATE ON public.supplements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sync_schedules update_sync_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sync_schedules_updated_at BEFORE UPDATE ON public.sync_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_guide_phases update_travel_guide_phases_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_travel_guide_phases_updated_at BEFORE UPDATE ON public.travel_guide_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_guide_template_definitions update_travel_guide_template_definitions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_travel_guide_template_definitions_updated_at BEFORE UPDATE ON public.travel_guide_template_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_guide_templates update_travel_guide_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_travel_guide_templates_updated_at BEFORE UPDATE ON public.travel_guide_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_settings update_travel_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_travel_settings_updated_at BEFORE UPDATE ON public.travel_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_accommodations update_trip_accommodations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_trip_accommodations_updated_at BEFORE UPDATE ON public.trip_accommodations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_activities update_trip_activities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_trip_activities_updated_at BEFORE UPDATE ON public.trip_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_calendar_sync update_trip_calendar_sync_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_trip_calendar_sync_updated_at BEFORE UPDATE ON public.trip_calendar_sync FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_days update_trip_days_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_trip_days_updated_at BEFORE UPDATE ON public.trip_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trip_segments update_trip_segments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_trip_segments_updated_at BEFORE UPDATE ON public.trip_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trips update_trips_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_diet update_user_diet_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_diet_updated_at BEFORE UPDATE ON public.user_diet FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: access_tokens access_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_tokens
    ADD CONSTRAINT access_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_api_keys ai_api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_api_keys
    ADD CONSTRAINT ai_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_usage_tracking api_usage_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_usage_tracking
    ADD CONSTRAINT api_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: biomarker_stars biomarker_stars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarker_stars
    ADD CONSTRAINT biomarker_stars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: biomarkers biomarkers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biomarkers
    ADD CONSTRAINT biomarkers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: change_log change_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.change_log
    ADD CONSTRAINT change_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: daily_schedule_items daily_schedule_items_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_schedule_items
    ADD CONSTRAINT daily_schedule_items_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.trip_days(id) ON DELETE CASCADE;


--
-- Name: daily_schedule_items daily_schedule_items_research_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_schedule_items
    ADD CONSTRAINT daily_schedule_items_research_item_id_fkey FOREIGN KEY (research_item_id) REFERENCES public.trip_research_items(id) ON DELETE SET NULL;


--
-- Name: daily_schedule_items daily_schedule_items_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_schedule_items
    ADD CONSTRAINT daily_schedule_items_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.trip_segments(id) ON DELETE SET NULL;


--
-- Name: daily_schedule_items daily_schedule_items_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_schedule_items
    ADD CONSTRAINT daily_schedule_items_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: eight_sleep_integrations eight_sleep_integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eight_sleep_integrations
    ADD CONSTRAINT eight_sleep_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: facial_products facial_products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facial_products
    ADD CONSTRAINT facial_products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: goal_interventions goal_interventions_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goal_interventions
    ADD CONSTRAINT goal_interventions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: goals goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: google_calendar_oauth_tokens google_calendar_oauth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_calendar_oauth_tokens
    ADD CONSTRAINT google_calendar_oauth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: journal_capsule_recipients journal_capsule_recipients_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_capsule_recipients
    ADD CONSTRAINT journal_capsule_recipients_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: journal_capsule_recipients journal_capsule_recipients_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_capsule_recipients
    ADD CONSTRAINT journal_capsule_recipients_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.journal_recipients(id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: journal_media journal_media_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_media
    ADD CONSTRAINT journal_media_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: journal_media journal_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_media
    ADD CONSTRAINT journal_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: journal_prompts journal_prompts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_prompts
    ADD CONSTRAINT journal_prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: journal_recipients journal_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_recipients
    ADD CONSTRAINT journal_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: protocol_docs protocol_docs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.protocol_docs
    ADD CONSTRAINT protocol_docs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: routine_items routine_items_linked_supplement_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT routine_items_linked_supplement_fkey FOREIGN KEY (linked_supplement) REFERENCES public.supplements(id) ON DELETE SET NULL;


--
-- Name: routine_items routine_items_routine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_items
    ADD CONSTRAINT routine_items_routine_id_fkey FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE CASCADE;


--
-- Name: routine_versions routine_versions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routine_versions
    ADD CONSTRAINT routine_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: routines routines_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rv_enrichment_jobs rv_enrichment_jobs_current_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_enrichment_jobs
    ADD CONSTRAINT rv_enrichment_jobs_current_location_id_fkey FOREIGN KEY (current_location_id) REFERENCES public.rv_locations(id) ON DELETE SET NULL;


--
-- Name: rv_enrichment_jobs rv_enrichment_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_enrichment_jobs
    ADD CONSTRAINT rv_enrichment_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rv_location_activities rv_location_activities_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_location_activities
    ADD CONSTRAINT rv_location_activities_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.rv_locations(id) ON DELETE CASCADE;


--
-- Name: rv_location_media rv_location_media_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_location_media
    ADD CONSTRAINT rv_location_media_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.rv_location_activities(id) ON DELETE CASCADE;


--
-- Name: rv_location_media rv_location_media_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_location_media
    ADD CONSTRAINT rv_location_media_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.rv_locations(id) ON DELETE CASCADE;


--
-- Name: rv_location_media rv_location_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_location_media
    ADD CONSTRAINT rv_location_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rv_locations rv_locations_converted_to_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_locations
    ADD CONSTRAINT rv_locations_converted_to_trip_id_fkey FOREIGN KEY (converted_to_trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;


--
-- Name: rv_locations rv_locations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_locations
    ADD CONSTRAINT rv_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rv_research_settings rv_research_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rv_research_settings
    ADD CONSTRAINT rv_research_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule_items schedule_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sleep_protocol_correlation sleep_protocol_correlation_sleep_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_protocol_correlation
    ADD CONSTRAINT sleep_protocol_correlation_sleep_session_id_fkey FOREIGN KEY (sleep_session_id) REFERENCES public.sleep_sessions(id) ON DELETE CASCADE;


--
-- Name: sleep_protocol_correlation sleep_protocol_correlation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_protocol_correlation
    ADD CONSTRAINT sleep_protocol_correlation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sleep_sessions sleep_sessions_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_sessions
    ADD CONSTRAINT sleep_sessions_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.eight_sleep_integrations(id) ON DELETE CASCADE;


--
-- Name: sleep_sessions sleep_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sleep_sessions
    ADD CONSTRAINT sleep_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: supplement_goals supplement_goals_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplement_goals
    ADD CONSTRAINT supplement_goals_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;


--
-- Name: supplement_goals supplement_goals_supplement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplement_goals
    ADD CONSTRAINT supplement_goals_supplement_id_fkey FOREIGN KEY (supplement_id) REFERENCES public.supplements(id) ON DELETE CASCADE;


--
-- Name: supplements supplements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplements
    ADD CONSTRAINT supplements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sync_schedules sync_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_schedules
    ADD CONSTRAINT sync_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ticket_classification_matches ticket_classification_matches_classification_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_classification_matches
    ADD CONSTRAINT ticket_classification_matches_classification_rule_id_fkey FOREIGN KEY (classification_rule_id) REFERENCES public.ticket_classification_rules(id) ON DELETE CASCADE;


--
-- Name: travel_guide_template_definitions travel_guide_template_definitions_phase_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_template_definitions
    ADD CONSTRAINT travel_guide_template_definitions_phase_number_fkey FOREIGN KEY (phase_number) REFERENCES public.travel_guide_phases(phase_number) ON DELETE CASCADE;


--
-- Name: travel_guide_templates travel_guide_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_guide_templates
    ADD CONSTRAINT travel_guide_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: travel_settings travel_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.travel_settings
    ADD CONSTRAINT travel_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trip_accommodations trip_accommodations_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_accommodations
    ADD CONSTRAINT trip_accommodations_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.trip_segments(id) ON DELETE SET NULL;


--
-- Name: trip_accommodations trip_accommodations_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_accommodations
    ADD CONSTRAINT trip_accommodations_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_activities trip_activities_alternate_to_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_activities
    ADD CONSTRAINT trip_activities_alternate_to_activity_id_fkey FOREIGN KEY (alternate_to_activity_id) REFERENCES public.trip_activities(id) ON DELETE SET NULL;


--
-- Name: trip_activities trip_activities_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_activities
    ADD CONSTRAINT trip_activities_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.trip_days(id) ON DELETE CASCADE;


--
-- Name: trip_activities trip_activities_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_activities
    ADD CONSTRAINT trip_activities_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.trip_segments(id) ON DELETE SET NULL;


--
-- Name: trip_activities trip_activities_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_activities
    ADD CONSTRAINT trip_activities_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_calendar_sync trip_calendar_sync_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_calendar_sync
    ADD CONSTRAINT trip_calendar_sync_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.trip_segments(id) ON DELETE CASCADE;


--
-- Name: trip_calendar_sync trip_calendar_sync_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_calendar_sync
    ADD CONSTRAINT trip_calendar_sync_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_calendar_sync trip_calendar_sync_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_calendar_sync
    ADD CONSTRAINT trip_calendar_sync_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trip_days trip_days_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_days
    ADD CONSTRAINT trip_days_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.trip_segments(id) ON DELETE SET NULL;


--
-- Name: trip_days trip_days_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_days
    ADD CONSTRAINT trip_days_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_driving trip_driving_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_driving
    ADD CONSTRAINT trip_driving_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_flights trip_flights_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_flights
    ADD CONSTRAINT trip_flights_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_media trip_media_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_media
    ADD CONSTRAINT trip_media_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_media trip_media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_media
    ADD CONSTRAINT trip_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trip_research_items trip_research_items_imported_to_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_research_items
    ADD CONSTRAINT trip_research_items_imported_to_activity_id_fkey FOREIGN KEY (imported_to_activity_id) REFERENCES public.trip_activities(id) ON DELETE SET NULL;


--
-- Name: trip_research_items trip_research_items_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_research_items
    ADD CONSTRAINT trip_research_items_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.trip_segments(id) ON DELETE SET NULL;


--
-- Name: trip_research_items trip_research_items_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_research_items
    ADD CONSTRAINT trip_research_items_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_segments trip_segments_selected_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_segments
    ADD CONSTRAINT trip_segments_selected_hotel_id_fkey FOREIGN KEY (selected_hotel_id) REFERENCES public.trip_accommodations(id) ON DELETE SET NULL;


--
-- Name: trip_segments trip_segments_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_segments
    ADD CONSTRAINT trip_segments_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trip_sharing trip_sharing_shared_with_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_sharing
    ADD CONSTRAINT trip_sharing_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: trip_sharing trip_sharing_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trip_sharing
    ADD CONSTRAINT trip_sharing_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;


--
-- Name: trips trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_diet user_diet_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_diet
    ADD CONSTRAINT user_diet_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_links user_links_linked_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_links
    ADD CONSTRAINT user_links_linked_user_fkey FOREIGN KEY (linked_user) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_links user_links_owner_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_links
    ADD CONSTRAINT user_links_owner_user_fkey FOREIGN KEY (owner_user) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: travel_guide_phases All authenticated users can view phases; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "All authenticated users can view phases" ON public.travel_guide_phases FOR SELECT TO authenticated USING (true);


--
-- Name: travel_guide_template_definitions All authenticated users can view template definitions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "All authenticated users can view template definitions" ON public.travel_guide_template_definitions FOR SELECT TO authenticated USING (true);


--
-- Name: user_links Owners can update links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owners can update links" ON public.user_links FOR UPDATE USING ((auth.uid() = owner_user));


--
-- Name: api_usage_tracking Service role can insert API usage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert API usage" ON public.api_usage_tracking FOR INSERT WITH CHECK (true);


--
-- Name: trip_sharing Shared users can read sharing; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Shared users can read sharing" ON public.trip_sharing FOR SELECT USING ((shared_with_user_id = auth.uid()));


--
-- Name: daily_schedule_items Users can CRUD own daily schedule items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own daily schedule items" ON public.daily_schedule_items USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = daily_schedule_items.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: rv_location_activities Users can CRUD own rv_location_activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own rv_location_activities" ON public.rv_location_activities USING ((EXISTS ( SELECT 1
   FROM public.rv_locations
  WHERE ((rv_locations.id = rv_location_activities.location_id) AND (rv_locations.user_id = auth.uid())))));


--
-- Name: rv_location_media Users can CRUD own rv_location_media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own rv_location_media" ON public.rv_location_media USING ((auth.uid() = user_id));


--
-- Name: rv_research_settings Users can CRUD own rv_research_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own rv_research_settings" ON public.rv_research_settings USING ((auth.uid() = user_id));


--
-- Name: trip_accommodations Users can CRUD own trip accommodations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip accommodations" ON public.trip_accommodations USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_accommodations.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trip_activities Users can CRUD own trip activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip activities" ON public.trip_activities USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_activities.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trip_days Users can CRUD own trip days; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip days" ON public.trip_days USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_days.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trip_driving Users can CRUD own trip driving; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip driving" ON public.trip_driving USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_driving.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trip_flights Users can CRUD own trip flights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip flights" ON public.trip_flights USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_flights.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: trip_media Users can CRUD own trip media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip media" ON public.trip_media USING ((auth.uid() = user_id));


--
-- Name: trip_segments Users can CRUD own trip segments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can CRUD own trip segments" ON public.trip_segments USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_segments.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: user_links Users can create links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create links" ON public.user_links FOR INSERT WITH CHECK ((auth.uid() = owner_user));


--
-- Name: access_tokens Users can create own tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own tokens" ON public.access_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: rv_enrichment_jobs Users can create their own enrichment jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own enrichment jobs" ON public.rv_enrichment_jobs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_api_keys Users can delete own API keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own API keys" ON public.ai_api_keys FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: biomarkers Users can delete own biomarkers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own biomarkers" ON public.biomarkers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journal_capsule_recipients Users can delete own capsule recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own capsule recipients" ON public.journal_capsule_recipients FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.journal_entries
  WHERE ((journal_entries.id = journal_capsule_recipients.entry_id) AND (journal_entries.user_id = auth.uid())))));


--
-- Name: chat_sessions Users can delete own chat sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: eight_sleep_integrations Users can delete own eight sleep integration; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own eight sleep integration" ON public.eight_sleep_integrations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: equipment Users can delete own equipment; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own equipment" ON public.equipment FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: facial_products Users can delete own facial products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own facial products" ON public.facial_products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: goals Users can delete own goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: google_calendar_oauth_tokens Users can delete own google calendar tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own google calendar tokens" ON public.google_calendar_oauth_tokens FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journal_entries Users can delete own journal entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own journal entries" ON public.journal_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journal_media Users can delete own journal media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own journal media" ON public.journal_media FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: biomarker_notes Users can delete own notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own notes" ON public.biomarker_notes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journal_prompts Users can delete own prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own prompts" ON public.journal_prompts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: protocol_docs Users can delete own protocol docs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own protocol docs" ON public.protocol_docs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: journal_recipients Users can delete own recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own recipients" ON public.journal_recipients FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: routine_items Users can delete own routine items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own routine items" ON public.routine_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.routines
  WHERE ((routines.id = routine_items.routine_id) AND (routines.user_id = auth.uid())))));


--
-- Name: routines Users can delete own routines; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own routines" ON public.routines FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: rv_locations Users can delete own rv_locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own rv_locations" ON public.rv_locations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: schedule_items Users can delete own schedule items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own schedule items" ON public.schedule_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sleep_protocol_correlation Users can delete own sleep correlations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own sleep correlations" ON public.sleep_protocol_correlation FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sleep_sessions Users can delete own sleep sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own sleep sessions" ON public.sleep_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: biomarker_stars Users can delete own stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own stars" ON public.biomarker_stars FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: supplement_goals Users can delete own supplement goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own supplement goals" ON public.supplement_goals FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.supplements
  WHERE ((supplements.id = supplement_goals.supplement_id) AND (supplements.user_id = auth.uid())))));


--
-- Name: supplements Users can delete own supplements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own supplements" ON public.supplements FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sync_schedules Users can delete own sync schedules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own sync schedules" ON public.sync_schedules FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: travel_guide_templates Users can delete own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own templates" ON public.travel_guide_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: access_tokens Users can delete own tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own tokens" ON public.access_tokens FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trips Users can delete own trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own trips" ON public.trips FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trip_research_items Users can delete research items for owned trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete research items for owned trips" ON public.trip_research_items FOR DELETE USING ((trip_id IN ( SELECT trips.id
   FROM public.trips
  WHERE (trips.user_id = auth.uid()))));


--
-- Name: ai_api_keys Users can insert own API keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own API keys" ON public.ai_api_keys FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: biomarkers Users can insert own biomarkers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own biomarkers" ON public.biomarkers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journal_capsule_recipients Users can insert own capsule recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own capsule recipients" ON public.journal_capsule_recipients FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.journal_entries
  WHERE ((journal_entries.id = journal_capsule_recipients.entry_id) AND (journal_entries.user_id = auth.uid())))));


--
-- Name: change_log Users can insert own change log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own change log" ON public.change_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Users can insert own chat messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: chat_sessions Users can insert own chat sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_conversations Users can insert own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own conversations" ON public.ai_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_diet Users can insert own diet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own diet" ON public.user_diet FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: eight_sleep_integrations Users can insert own eight sleep integration; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own eight sleep integration" ON public.eight_sleep_integrations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: equipment Users can insert own equipment; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own equipment" ON public.equipment FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: facial_products Users can insert own facial products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own facial products" ON public.facial_products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: goal_interventions Users can insert own goal interventions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own goal interventions" ON public.goal_interventions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.goals
  WHERE ((goals.id = goal_interventions.goal_id) AND (goals.user_id = auth.uid())))));


--
-- Name: goals Users can insert own goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: google_calendar_oauth_tokens Users can insert own google calendar tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own google calendar tokens" ON public.google_calendar_oauth_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journal_entries Users can insert own journal entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own journal entries" ON public.journal_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journal_media Users can insert own journal media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own journal media" ON public.journal_media FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: biomarker_notes Users can insert own notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own notes" ON public.biomarker_notes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journal_prompts Users can insert own prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own prompts" ON public.journal_prompts FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (source = 'user'::text)));


--
-- Name: protocol_docs Users can insert own protocol docs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own protocol docs" ON public.protocol_docs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: journal_recipients Users can insert own recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own recipients" ON public.journal_recipients FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: routine_items Users can insert own routine items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own routine items" ON public.routine_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.routines
  WHERE ((routines.id = routine_items.routine_id) AND (routines.user_id = auth.uid())))));


--
-- Name: routine_versions Users can insert own routine versions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own routine versions" ON public.routine_versions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: routines Users can insert own routines; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own routines" ON public.routines FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: rv_locations Users can insert own rv_locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own rv_locations" ON public.rv_locations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: schedule_items Users can insert own schedule items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own schedule items" ON public.schedule_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sleep_protocol_correlation Users can insert own sleep correlations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own sleep correlations" ON public.sleep_protocol_correlation FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sleep_sessions Users can insert own sleep sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own sleep sessions" ON public.sleep_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: biomarker_stars Users can insert own stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own stars" ON public.biomarker_stars FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: supplement_goals Users can insert own supplement goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own supplement goals" ON public.supplement_goals FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.supplements
  WHERE ((supplements.id = supplement_goals.supplement_id) AND (supplements.user_id = auth.uid())))));


--
-- Name: supplements Users can insert own supplements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own supplements" ON public.supplements FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sync_schedules Users can insert own sync schedules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own sync schedules" ON public.sync_schedules FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: travel_guide_templates Users can insert own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own templates" ON public.travel_guide_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trips Users can insert own trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trip_research_items Users can insert research items for owned trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert research items for owned trips" ON public.trip_research_items FOR INSERT WITH CHECK ((trip_id IN ( SELECT trips.id
   FROM public.trips
  WHERE (trips.user_id = auth.uid()))));


--
-- Name: trip_calendar_sync Users can manage own calendar sync; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own calendar sync" ON public.trip_calendar_sync USING ((auth.uid() = user_id));


--
-- Name: travel_settings Users can manage own travel settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own travel settings" ON public.travel_settings USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: trip_sharing Users can manage own trip sharing; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own trip sharing" ON public.trip_sharing USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_sharing.trip_id) AND (trips.user_id = auth.uid())))));


--
-- Name: journal_media Users can read journal media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read journal media" ON public.journal_media FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.journal_entries
  WHERE ((journal_entries.id = journal_media.entry_id) AND ((journal_entries.is_public = true) OR (journal_entries.user_id = auth.uid())))))));


--
-- Name: biomarkers Users can read own biomarkers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own biomarkers" ON public.biomarkers FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = biomarkers.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: journal_capsule_recipients Users can read own capsule recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own capsule recipients" ON public.journal_capsule_recipients FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.journal_entries
  WHERE ((journal_entries.id = journal_capsule_recipients.entry_id) AND (journal_entries.user_id = auth.uid())))));


--
-- Name: change_log Users can read own change log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own change log" ON public.change_log FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = change_log.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: ai_conversations Users can read own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own conversations" ON public.ai_conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users Users can read own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_diet Users can read own diet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own diet" ON public.user_diet FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: eight_sleep_integrations Users can read own eight sleep integration; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own eight sleep integration" ON public.eight_sleep_integrations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: equipment Users can read own equipment; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own equipment" ON public.equipment FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = equipment.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: facial_products Users can read own facial products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own facial products" ON public.facial_products FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = facial_products.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: goal_interventions Users can read own goal interventions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own goal interventions" ON public.goal_interventions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.goals
  WHERE ((goals.id = goal_interventions.goal_id) AND (goals.user_id = auth.uid())))));


--
-- Name: goals Users can read own goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own goals" ON public.goals FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = goals.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: google_calendar_oauth_tokens Users can read own google calendar tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own google calendar tokens" ON public.google_calendar_oauth_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: journal_entries Users can read own journal entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own journal entries" ON public.journal_entries FOR SELECT USING (((auth.uid() = user_id) OR (is_public = true) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = journal_entries.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: user_links Users can read own links; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own links" ON public.user_links FOR SELECT USING (((auth.uid() = owner_user) OR (auth.uid() = linked_user)));


--
-- Name: biomarker_notes Users can read own notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own notes" ON public.biomarker_notes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: protocol_docs Users can read own protocol docs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own protocol docs" ON public.protocol_docs FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = protocol_docs.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: journal_recipients Users can read own recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own recipients" ON public.journal_recipients FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: routine_items Users can read own routine items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own routine items" ON public.routine_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.routines
  WHERE ((routines.id = routine_items.routine_id) AND ((routines.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.user_links
          WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = routines.user_id) AND (user_links.status = 'active'::text)))))))));


--
-- Name: routine_versions Users can read own routine versions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own routine versions" ON public.routine_versions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: routines Users can read own routines; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own routines" ON public.routines FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = routines.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: rv_locations Users can read own rv_locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own rv_locations" ON public.rv_locations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: schedule_items Users can read own schedule items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own schedule items" ON public.schedule_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sleep_protocol_correlation Users can read own sleep correlations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own sleep correlations" ON public.sleep_protocol_correlation FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = sleep_protocol_correlation.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: sleep_sessions Users can read own sleep sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own sleep sessions" ON public.sleep_sessions FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = sleep_sessions.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: biomarker_stars Users can read own stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own stars" ON public.biomarker_stars FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: supplement_goals Users can read own supplement goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own supplement goals" ON public.supplement_goals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.supplements
  WHERE ((supplements.id = supplement_goals.supplement_id) AND (supplements.user_id = auth.uid())))));


--
-- Name: supplements Users can read own supplements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own supplements" ON public.supplements FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_links
  WHERE ((user_links.linked_user = auth.uid()) AND (user_links.owner_user = supplements.user_id) AND (user_links.status = 'active'::text))))));


--
-- Name: sync_schedules Users can read own sync schedules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own sync schedules" ON public.sync_schedules FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: access_tokens Users can read own tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own tokens" ON public.access_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trips Users can read own trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own trips" ON public.trips FOR SELECT USING (((auth.uid() = user_id) OR (is_public = true) OR (EXISTS ( SELECT 1
   FROM public.trip_sharing
  WHERE ((trip_sharing.trip_id = trips.id) AND (trip_sharing.shared_with_user_id = auth.uid()))))));


--
-- Name: journal_prompts Users can read prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read prompts" ON public.journal_prompts FOR SELECT USING (((source = 'curated'::text) OR (user_id = auth.uid())));


--
-- Name: rv_location_media Users can read shared rv_location_media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read shared rv_location_media" ON public.rv_location_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.rv_locations
  WHERE ((rv_locations.id = rv_location_media.location_id) AND (rv_locations.user_id = auth.uid())))));


--
-- Name: trip_media Users can read shared trip media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read shared trip media" ON public.trip_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trips
  WHERE ((trips.id = trip_media.trip_id) AND ((trips.is_public = true) OR (trips.user_id = auth.uid()))))));


--
-- Name: ai_api_keys Users can update own API keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own API keys" ON public.ai_api_keys FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: biomarkers Users can update own biomarkers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own biomarkers" ON public.biomarkers FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can update own chat messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own chat messages" ON public.chat_messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: chat_sessions Users can update own chat sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_conversations Users can update own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own conversations" ON public.ai_conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: users Users can update own data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_diet Users can update own diet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own diet" ON public.user_diet FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: eight_sleep_integrations Users can update own eight sleep integration; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own eight sleep integration" ON public.eight_sleep_integrations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: equipment Users can update own equipment; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own equipment" ON public.equipment FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: facial_products Users can update own facial products; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own facial products" ON public.facial_products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: goals Users can update own goals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: google_calendar_oauth_tokens Users can update own google calendar tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own google calendar tokens" ON public.google_calendar_oauth_tokens FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: journal_entries Users can update own journal entries; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own journal entries" ON public.journal_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: journal_media Users can update own journal media; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own journal media" ON public.journal_media FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: biomarker_notes Users can update own notes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own notes" ON public.biomarker_notes FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: journal_prompts Users can update own prompts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own prompts" ON public.journal_prompts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: protocol_docs Users can update own protocol docs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own protocol docs" ON public.protocol_docs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: journal_recipients Users can update own recipients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own recipients" ON public.journal_recipients FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: routine_items Users can update own routine items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own routine items" ON public.routine_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.routines
  WHERE ((routines.id = routine_items.routine_id) AND (routines.user_id = auth.uid())))));


--
-- Name: routines Users can update own routines; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own routines" ON public.routines FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: rv_locations Users can update own rv_locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own rv_locations" ON public.rv_locations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: schedule_items Users can update own schedule items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own schedule items" ON public.schedule_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sleep_protocol_correlation Users can update own sleep correlations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own sleep correlations" ON public.sleep_protocol_correlation FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sleep_sessions Users can update own sleep sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own sleep sessions" ON public.sleep_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: supplements Users can update own supplements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own supplements" ON public.supplements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sync_schedules Users can update own sync schedules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own sync schedules" ON public.sync_schedules FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: travel_guide_templates Users can update own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own templates" ON public.travel_guide_templates FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: access_tokens Users can update own tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own tokens" ON public.access_tokens FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trips Users can update own trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trip_research_items Users can update research items for editable trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update research items for editable trips" ON public.trip_research_items FOR UPDATE USING ((trip_id IN ( SELECT trips.id
   FROM public.trips
  WHERE (trips.user_id = auth.uid())
UNION
 SELECT trip_sharing.trip_id
   FROM public.trip_sharing
  WHERE ((trip_sharing.shared_with_user_id = auth.uid()) AND ((trip_sharing.permission)::text = 'edit'::text)))));


--
-- Name: rv_enrichment_jobs Users can update their own enrichment jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own enrichment jobs" ON public.rv_enrichment_jobs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ai_api_keys Users can view own API keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own API keys" ON public.ai_api_keys FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users can view own chat messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own chat messages" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND (chat_sessions.user_id = auth.uid())))));


--
-- Name: chat_sessions Users can view own chat sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: travel_guide_templates Users can view own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own templates" ON public.travel_guide_templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trip_research_items Users can view research items for accessible trips; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view research items for accessible trips" ON public.trip_research_items FOR SELECT USING ((trip_id IN ( SELECT trips.id
   FROM public.trips
  WHERE (trips.user_id = auth.uid())
UNION
 SELECT trip_sharing.trip_id
   FROM public.trip_sharing
  WHERE (trip_sharing.shared_with_user_id = auth.uid()))));


--
-- Name: api_usage_tracking Users can view their own API usage; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own API usage" ON public.api_usage_tracking FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: rv_enrichment_jobs Users can view their own enrichment jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own enrichment jobs" ON public.rv_enrichment_jobs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: access_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_api_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: api_usage_tracking; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: biomarker_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.biomarker_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: biomarker_stars; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.biomarker_stars ENABLE ROW LEVEL SECURITY;

--
-- Name: biomarkers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.biomarkers ENABLE ROW LEVEL SECURITY;

--
-- Name: change_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_schedule_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.daily_schedule_items ENABLE ROW LEVEL SECURITY;

--
-- Name: eight_sleep_integrations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.eight_sleep_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

--
-- Name: facial_products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.facial_products ENABLE ROW LEVEL SECURITY;

--
-- Name: goal_interventions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.goal_interventions ENABLE ROW LEVEL SECURITY;

--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: google_calendar_oauth_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.google_calendar_oauth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_capsule_recipients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journal_capsule_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_media; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journal_media ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_prompts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journal_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: journal_recipients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journal_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: protocol_docs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.protocol_docs ENABLE ROW LEVEL SECURITY;

--
-- Name: routine_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;

--
-- Name: routine_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.routine_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: routines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

--
-- Name: rv_enrichment_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rv_enrichment_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: rv_location_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rv_location_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: rv_location_media; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rv_location_media ENABLE ROW LEVEL SECURITY;

--
-- Name: rv_locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rv_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: rv_research_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rv_research_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: schedule_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sleep_protocol_correlation; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sleep_protocol_correlation ENABLE ROW LEVEL SECURITY;

--
-- Name: sleep_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: supplement_goals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.supplement_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: supplements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_schedules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_classification_matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ticket_classification_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_classification_matches ticket_classification_matches_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ticket_classification_matches_insert ON public.ticket_classification_matches FOR INSERT WITH CHECK ((workspace_id = '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid));


--
-- Name: ticket_classification_matches ticket_classification_matches_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ticket_classification_matches_select ON public.ticket_classification_matches FOR SELECT USING ((workspace_id = '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid));


--
-- Name: ticket_classification_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ticket_classification_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_classification_rules ticket_classification_rules_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ticket_classification_rules_delete ON public.ticket_classification_rules FOR DELETE USING ((workspace_id = '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid));


--
-- Name: ticket_classification_rules ticket_classification_rules_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ticket_classification_rules_insert ON public.ticket_classification_rules FOR INSERT WITH CHECK ((workspace_id = '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid));


--
-- Name: ticket_classification_rules ticket_classification_rules_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ticket_classification_rules_select ON public.ticket_classification_rules FOR SELECT USING ((workspace_id = '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid));


--
-- Name: ticket_classification_rules ticket_classification_rules_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ticket_classification_rules_update ON public.ticket_classification_rules FOR UPDATE USING ((workspace_id = '6b548f36-9847-4fdc-8273-c4251dc15cde'::uuid));


--
-- Name: travel_guide_phases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.travel_guide_phases ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_guide_template_definitions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.travel_guide_template_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_guide_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.travel_guide_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.travel_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_accommodations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_accommodations ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_calendar_sync; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_calendar_sync ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_days; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_days ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_driving; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_driving ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_flights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_flights ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_media; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_media ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_research_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_research_items ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_segments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: trip_sharing; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trip_sharing ENABLE ROW LEVEL SECURITY;

--
-- Name: trips; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

--
-- Name: user_diet; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_diet ENABLE ROW LEVEL SECURITY;

--
-- Name: user_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION compare_sleep_by_protocol(p_user_id uuid, p_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.compare_sleep_by_protocol(p_user_id uuid, p_days integer) TO anon;
GRANT ALL ON FUNCTION public.compare_sleep_by_protocol(p_user_id uuid, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.compare_sleep_by_protocol(p_user_id uuid, p_days integer) TO service_role;


--
-- Name: TABLE rv_enrichment_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rv_enrichment_jobs TO anon;
GRANT ALL ON TABLE public.rv_enrichment_jobs TO authenticated;
GRANT ALL ON TABLE public.rv_enrichment_jobs TO service_role;


--
-- Name: FUNCTION get_active_enrichment_job(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_active_enrichment_job(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_active_enrichment_job(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_active_enrichment_job(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_monthly_api_usage(p_user_id uuid, p_month date); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_monthly_api_usage(p_user_id uuid, p_month date) TO anon;
GRANT ALL ON FUNCTION public.get_monthly_api_usage(p_user_id uuid, p_month date) TO authenticated;
GRANT ALL ON FUNCTION public.get_monthly_api_usage(p_user_id uuid, p_month date) TO service_role;


--
-- Name: FUNCTION get_sleep_analysis(p_user_id uuid, p_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_sleep_analysis(p_user_id uuid, p_days integer) TO anon;
GRANT ALL ON FUNCTION public.get_sleep_analysis(p_user_id uuid, p_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_sleep_analysis(p_user_id uuid, p_days integer) TO service_role;


--
-- Name: FUNCTION get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_ticket_details_optimized(p_ticket_id uuid, p_workspace_id uuid, p_message_limit integer) TO service_role;


--
-- Name: FUNCTION get_travel_phase_templates(p_user_id uuid, p_phase_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_travel_phase_templates(p_user_id uuid, p_phase_number integer) TO anon;
GRANT ALL ON FUNCTION public.get_travel_phase_templates(p_user_id uuid, p_phase_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_travel_phase_templates(p_user_id uuid, p_phase_number integer) TO service_role;


--
-- Name: FUNCTION get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text) TO anon;
GRANT ALL ON FUNCTION public.get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text) TO authenticated;
GRANT ALL ON FUNCTION public.get_travel_template(p_user_id uuid, p_phase_number integer, p_template_key text) TO service_role;


--
-- Name: FUNCTION import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid) TO anon;
GRANT ALL ON FUNCTION public.import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.import_research_item_to_activity(p_research_item_id uuid, p_day_id uuid) TO service_role;


--
-- Name: FUNCTION update_ai_api_keys_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_ai_api_keys_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_ai_api_keys_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_ai_api_keys_updated_at() TO service_role;


--
-- Name: FUNCTION update_chat_sessions_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_chat_sessions_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_chat_sessions_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_chat_sessions_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE access_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.access_tokens TO anon;
GRANT ALL ON TABLE public.access_tokens TO authenticated;
GRANT ALL ON TABLE public.access_tokens TO service_role;


--
-- Name: TABLE ai_api_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_api_keys TO anon;
GRANT ALL ON TABLE public.ai_api_keys TO authenticated;
GRANT ALL ON TABLE public.ai_api_keys TO service_role;


--
-- Name: TABLE ai_conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_conversations TO anon;
GRANT ALL ON TABLE public.ai_conversations TO authenticated;
GRANT ALL ON TABLE public.ai_conversations TO service_role;


--
-- Name: TABLE api_usage_tracking; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.api_usage_tracking TO anon;
GRANT ALL ON TABLE public.api_usage_tracking TO authenticated;
GRANT ALL ON TABLE public.api_usage_tracking TO service_role;


--
-- Name: TABLE api_usage_monthly_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.api_usage_monthly_summary TO anon;
GRANT ALL ON TABLE public.api_usage_monthly_summary TO authenticated;
GRANT ALL ON TABLE public.api_usage_monthly_summary TO service_role;


--
-- Name: TABLE biomarker_notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.biomarker_notes TO anon;
GRANT ALL ON TABLE public.biomarker_notes TO authenticated;
GRANT ALL ON TABLE public.biomarker_notes TO service_role;


--
-- Name: TABLE biomarker_stars; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.biomarker_stars TO anon;
GRANT ALL ON TABLE public.biomarker_stars TO authenticated;
GRANT ALL ON TABLE public.biomarker_stars TO service_role;


--
-- Name: TABLE biomarkers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.biomarkers TO anon;
GRANT ALL ON TABLE public.biomarkers TO authenticated;
GRANT ALL ON TABLE public.biomarkers TO service_role;


--
-- Name: TABLE change_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.change_log TO anon;
GRANT ALL ON TABLE public.change_log TO authenticated;
GRANT ALL ON TABLE public.change_log TO service_role;


--
-- Name: TABLE chat_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_messages TO anon;
GRANT ALL ON TABLE public.chat_messages TO authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role;


--
-- Name: TABLE chat_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_sessions TO anon;
GRANT ALL ON TABLE public.chat_sessions TO authenticated;
GRANT ALL ON TABLE public.chat_sessions TO service_role;


--
-- Name: TABLE daily_schedule_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.daily_schedule_items TO anon;
GRANT ALL ON TABLE public.daily_schedule_items TO authenticated;
GRANT ALL ON TABLE public.daily_schedule_items TO service_role;


--
-- Name: TABLE eight_sleep_integrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.eight_sleep_integrations TO anon;
GRANT ALL ON TABLE public.eight_sleep_integrations TO authenticated;
GRANT ALL ON TABLE public.eight_sleep_integrations TO service_role;


--
-- Name: TABLE equipment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.equipment TO anon;
GRANT ALL ON TABLE public.equipment TO authenticated;
GRANT ALL ON TABLE public.equipment TO service_role;


--
-- Name: TABLE facial_products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.facial_products TO anon;
GRANT ALL ON TABLE public.facial_products TO authenticated;
GRANT ALL ON TABLE public.facial_products TO service_role;


--
-- Name: TABLE goal_interventions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.goal_interventions TO anon;
GRANT ALL ON TABLE public.goal_interventions TO authenticated;
GRANT ALL ON TABLE public.goal_interventions TO service_role;


--
-- Name: TABLE goals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.goals TO anon;
GRANT ALL ON TABLE public.goals TO authenticated;
GRANT ALL ON TABLE public.goals TO service_role;


--
-- Name: TABLE google_calendar_oauth_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.google_calendar_oauth_tokens TO anon;
GRANT ALL ON TABLE public.google_calendar_oauth_tokens TO authenticated;
GRANT ALL ON TABLE public.google_calendar_oauth_tokens TO service_role;


--
-- Name: TABLE journal_capsule_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.journal_capsule_recipients TO anon;
GRANT ALL ON TABLE public.journal_capsule_recipients TO authenticated;
GRANT ALL ON TABLE public.journal_capsule_recipients TO service_role;


--
-- Name: TABLE journal_entries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.journal_entries TO anon;
GRANT ALL ON TABLE public.journal_entries TO authenticated;
GRANT ALL ON TABLE public.journal_entries TO service_role;


--
-- Name: TABLE journal_media; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.journal_media TO anon;
GRANT ALL ON TABLE public.journal_media TO authenticated;
GRANT ALL ON TABLE public.journal_media TO service_role;


--
-- Name: TABLE journal_prompts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.journal_prompts TO anon;
GRANT ALL ON TABLE public.journal_prompts TO authenticated;
GRANT ALL ON TABLE public.journal_prompts TO service_role;


--
-- Name: TABLE journal_recipients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.journal_recipients TO anon;
GRANT ALL ON TABLE public.journal_recipients TO authenticated;
GRANT ALL ON TABLE public.journal_recipients TO service_role;


--
-- Name: TABLE protocol_docs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.protocol_docs TO anon;
GRANT ALL ON TABLE public.protocol_docs TO authenticated;
GRANT ALL ON TABLE public.protocol_docs TO service_role;


--
-- Name: TABLE trip_research_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_research_items TO anon;
GRANT ALL ON TABLE public.trip_research_items TO authenticated;
GRANT ALL ON TABLE public.trip_research_items TO service_role;


--
-- Name: TABLE trip_segments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_segments TO anon;
GRANT ALL ON TABLE public.trip_segments TO authenticated;
GRANT ALL ON TABLE public.trip_segments TO service_role;


--
-- Name: TABLE research_items_with_segment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.research_items_with_segment TO anon;
GRANT ALL ON TABLE public.research_items_with_segment TO authenticated;
GRANT ALL ON TABLE public.research_items_with_segment TO service_role;


--
-- Name: TABLE routine_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.routine_items TO anon;
GRANT ALL ON TABLE public.routine_items TO authenticated;
GRANT ALL ON TABLE public.routine_items TO service_role;


--
-- Name: TABLE routine_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.routine_versions TO anon;
GRANT ALL ON TABLE public.routine_versions TO authenticated;
GRANT ALL ON TABLE public.routine_versions TO service_role;


--
-- Name: TABLE routines; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.routines TO anon;
GRANT ALL ON TABLE public.routines TO authenticated;
GRANT ALL ON TABLE public.routines TO service_role;


--
-- Name: TABLE rv_location_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rv_location_activities TO anon;
GRANT ALL ON TABLE public.rv_location_activities TO authenticated;
GRANT ALL ON TABLE public.rv_location_activities TO service_role;


--
-- Name: TABLE rv_location_media; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rv_location_media TO anon;
GRANT ALL ON TABLE public.rv_location_media TO authenticated;
GRANT ALL ON TABLE public.rv_location_media TO service_role;


--
-- Name: TABLE rv_locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rv_locations TO anon;
GRANT ALL ON TABLE public.rv_locations TO authenticated;
GRANT ALL ON TABLE public.rv_locations TO service_role;


--
-- Name: TABLE rv_research_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rv_research_settings TO anon;
GRANT ALL ON TABLE public.rv_research_settings TO authenticated;
GRANT ALL ON TABLE public.rv_research_settings TO service_role;


--
-- Name: TABLE schedule_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.schedule_items TO anon;
GRANT ALL ON TABLE public.schedule_items TO authenticated;
GRANT ALL ON TABLE public.schedule_items TO service_role;


--
-- Name: TABLE sleep_protocol_correlation; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sleep_protocol_correlation TO anon;
GRANT ALL ON TABLE public.sleep_protocol_correlation TO authenticated;
GRANT ALL ON TABLE public.sleep_protocol_correlation TO service_role;


--
-- Name: TABLE sleep_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sleep_sessions TO anon;
GRANT ALL ON TABLE public.sleep_sessions TO authenticated;
GRANT ALL ON TABLE public.sleep_sessions TO service_role;


--
-- Name: TABLE supplement_goals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.supplement_goals TO anon;
GRANT ALL ON TABLE public.supplement_goals TO authenticated;
GRANT ALL ON TABLE public.supplement_goals TO service_role;


--
-- Name: TABLE supplements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.supplements TO anon;
GRANT ALL ON TABLE public.supplements TO authenticated;
GRANT ALL ON TABLE public.supplements TO service_role;


--
-- Name: TABLE sync_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sync_schedules TO anon;
GRANT ALL ON TABLE public.sync_schedules TO authenticated;
GRANT ALL ON TABLE public.sync_schedules TO service_role;


--
-- Name: TABLE ticket_classification_matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_classification_matches TO anon;
GRANT ALL ON TABLE public.ticket_classification_matches TO authenticated;
GRANT ALL ON TABLE public.ticket_classification_matches TO service_role;


--
-- Name: TABLE ticket_classification_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_classification_rules TO anon;
GRANT ALL ON TABLE public.ticket_classification_rules TO authenticated;
GRANT ALL ON TABLE public.ticket_classification_rules TO service_role;


--
-- Name: TABLE travel_guide_phases; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.travel_guide_phases TO anon;
GRANT ALL ON TABLE public.travel_guide_phases TO authenticated;
GRANT ALL ON TABLE public.travel_guide_phases TO service_role;


--
-- Name: TABLE travel_guide_template_definitions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.travel_guide_template_definitions TO anon;
GRANT ALL ON TABLE public.travel_guide_template_definitions TO authenticated;
GRANT ALL ON TABLE public.travel_guide_template_definitions TO service_role;


--
-- Name: TABLE travel_guide_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.travel_guide_templates TO anon;
GRANT ALL ON TABLE public.travel_guide_templates TO authenticated;
GRANT ALL ON TABLE public.travel_guide_templates TO service_role;


--
-- Name: TABLE travel_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.travel_settings TO anon;
GRANT ALL ON TABLE public.travel_settings TO authenticated;
GRANT ALL ON TABLE public.travel_settings TO service_role;


--
-- Name: TABLE trip_accommodations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_accommodations TO anon;
GRANT ALL ON TABLE public.trip_accommodations TO authenticated;
GRANT ALL ON TABLE public.trip_accommodations TO service_role;


--
-- Name: TABLE trip_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_activities TO anon;
GRANT ALL ON TABLE public.trip_activities TO authenticated;
GRANT ALL ON TABLE public.trip_activities TO service_role;


--
-- Name: TABLE trip_calendar_sync; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_calendar_sync TO anon;
GRANT ALL ON TABLE public.trip_calendar_sync TO authenticated;
GRANT ALL ON TABLE public.trip_calendar_sync TO service_role;


--
-- Name: TABLE trip_days; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_days TO anon;
GRANT ALL ON TABLE public.trip_days TO authenticated;
GRANT ALL ON TABLE public.trip_days TO service_role;


--
-- Name: TABLE trip_driving; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_driving TO anon;
GRANT ALL ON TABLE public.trip_driving TO authenticated;
GRANT ALL ON TABLE public.trip_driving TO service_role;


--
-- Name: TABLE trip_flights; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_flights TO anon;
GRANT ALL ON TABLE public.trip_flights TO authenticated;
GRANT ALL ON TABLE public.trip_flights TO service_role;


--
-- Name: TABLE trip_media; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_media TO anon;
GRANT ALL ON TABLE public.trip_media TO authenticated;
GRANT ALL ON TABLE public.trip_media TO service_role;


--
-- Name: TABLE trip_sharing; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trip_sharing TO anon;
GRANT ALL ON TABLE public.trip_sharing TO authenticated;
GRANT ALL ON TABLE public.trip_sharing TO service_role;


--
-- Name: TABLE trips; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.trips TO anon;
GRANT ALL ON TABLE public.trips TO authenticated;
GRANT ALL ON TABLE public.trips TO service_role;


--
-- Name: TABLE user_diet; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_diet TO anon;
GRANT ALL ON TABLE public.user_diet TO authenticated;
GRANT ALL ON TABLE public.user_diet TO service_role;


--
-- Name: TABLE user_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_links TO anon;
GRANT ALL ON TABLE public.user_links TO authenticated;
GRANT ALL ON TABLE public.user_links TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict aUhlQRzFNu9Nw3R0CGMQ2fexskH3bbdeZpsV0PhPz4BsDHgR3yx8cdWGlhpfatK

