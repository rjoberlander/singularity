-- API Usage Tracking and Enrichment Jobs
-- Tracks API usage across the app and provides persistent enrichment job tracking

-- =============================================
-- API USAGE TRACKING (app-wide)
-- =============================================

CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What API was called
  provider TEXT NOT NULL, -- 'google_places', 'anthropic', 'openai', 'perplexity', etc.
  api_type TEXT NOT NULL, -- 'photo_fetch', 'text_search', 'place_details', 'chat_completion', etc.

  -- Usage details
  count INTEGER NOT NULL DEFAULT 1,

  -- Cost tracking (optional, for APIs with known pricing)
  estimated_cost_usd DECIMAL(10, 6),

  -- Context about the usage
  context_type TEXT, -- 'rv_enrichment', 'travel_planning', 'chat', etc.
  context_id UUID, -- ID of the related entity (location_id, trip_id, etc.)

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying monthly usage by user and provider
-- Using created_at directly since DATE_TRUNC is not immutable
CREATE INDEX idx_api_usage_user_provider_date
  ON api_usage_tracking(user_id, provider, created_at);

-- Index for querying by context
CREATE INDEX idx_api_usage_context
  ON api_usage_tracking(context_type, context_id);

-- RLS policies
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API usage"
  ON api_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert API usage"
  ON api_usage_tracking FOR INSERT
  WITH CHECK (true);

-- =============================================
-- API USAGE MONTHLY SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW api_usage_monthly_summary AS
SELECT
  user_id,
  provider,
  api_type,
  DATE_TRUNC('month', created_at) AS month,
  SUM(count) AS total_count,
  SUM(estimated_cost_usd) AS total_estimated_cost_usd,
  COUNT(*) AS request_count
FROM api_usage_tracking
GROUP BY user_id, provider, api_type, DATE_TRUNC('month', created_at);

-- =============================================
-- ENRICHMENT JOBS (for RV locations batch processing)
-- =============================================

-- Create enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE enrichment_job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS rv_enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job status
  status enrichment_job_status NOT NULL DEFAULT 'pending',

  -- Progress tracking
  total_locations INTEGER NOT NULL DEFAULT 0,
  processed_locations INTEGER NOT NULL DEFAULT 0,
  successful_locations INTEGER NOT NULL DEFAULT 0,
  failed_locations INTEGER NOT NULL DEFAULT 0,

  -- Photo tracking
  photos_downloaded INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0,

  -- Current item being processed
  current_location_id UUID REFERENCES rv_locations(id) ON DELETE SET NULL,
  current_location_name TEXT,
  current_step TEXT, -- 'searching', 'fetching_details', 'analyzing_reviews', 'downloading_photos', etc.

  -- Location IDs to process (stored as array)
  location_ids UUID[] NOT NULL DEFAULT '{}',

  -- Error tracking
  errors JSONB DEFAULT '[]',

  -- Options used for this job
  options JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying active jobs by user
CREATE INDEX idx_enrichment_jobs_user_status
  ON rv_enrichment_jobs(user_id, status);

-- RLS policies
ALTER TABLE rv_enrichment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrichment jobs"
  ON rv_enrichment_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrichment jobs"
  ON rv_enrichment_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrichment jobs"
  ON rv_enrichment_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTION: Get current month's API usage
-- =============================================

CREATE OR REPLACE FUNCTION get_monthly_api_usage(p_user_id UUID, p_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  provider TEXT,
  api_type TEXT,
  total_count BIGINT,
  total_estimated_cost_usd DECIMAL
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: Get active enrichment job
-- =============================================

CREATE OR REPLACE FUNCTION get_active_enrichment_job(p_user_id UUID)
RETURNS rv_enrichment_jobs AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE api_usage_tracking IS 'Tracks API usage across the app for billing visibility';
COMMENT ON TABLE rv_enrichment_jobs IS 'Tracks batch enrichment jobs with progress for live status updates';
