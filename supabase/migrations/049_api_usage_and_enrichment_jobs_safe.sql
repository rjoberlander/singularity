-- API Usage Tracking and Enrichment Jobs (SAFE VERSION)
-- Handles cases where some objects already exist

-- =============================================
-- API USAGE TRACKING (app-wide)
-- =============================================

CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  estimated_cost_usd DECIMAL(10, 6),
  context_type TEXT,
  context_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_api_usage_user_provider_date
  ON api_usage_tracking(user_id, provider, created_at);

CREATE INDEX IF NOT EXISTS idx_api_usage_context
  ON api_usage_tracking(context_type, context_id);

-- RLS policies (drop and recreate to be safe)
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own API usage" ON api_usage_tracking;
CREATE POLICY "Users can view their own API usage"
  ON api_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert API usage" ON api_usage_tracking;
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
-- ENRICHMENT JOBS
-- =============================================

DO $$ BEGIN
  CREATE TYPE enrichment_job_status AS ENUM (
    'pending', 'running', 'completed', 'failed', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS rv_enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status enrichment_job_status NOT NULL DEFAULT 'pending',
  total_locations INTEGER NOT NULL DEFAULT 0,
  processed_locations INTEGER NOT NULL DEFAULT 0,
  successful_locations INTEGER NOT NULL DEFAULT 0,
  failed_locations INTEGER NOT NULL DEFAULT 0,
  photos_downloaded INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 4) DEFAULT 0,
  current_location_id UUID,
  current_location_name TEXT,
  current_step TEXT,
  location_ids UUID[] NOT NULL DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  options JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_user_status
  ON rv_enrichment_jobs(user_id, status);

ALTER TABLE rv_enrichment_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enrichment jobs" ON rv_enrichment_jobs;
CREATE POLICY "Users can view their own enrichment jobs"
  ON rv_enrichment_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own enrichment jobs" ON rv_enrichment_jobs;
CREATE POLICY "Users can create their own enrichment jobs"
  ON rv_enrichment_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own enrichment jobs" ON rv_enrichment_jobs;
CREATE POLICY "Users can update their own enrichment jobs"
  ON rv_enrichment_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
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
