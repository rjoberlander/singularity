-- Create RPC function to aggregate API usage by month
-- This avoids the Supabase 1000 row limit by aggregating in the database

CREATE OR REPLACE FUNCTION get_monthly_usage_summary(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  provider TEXT,
  api_type TEXT,
  total_count BIGINT,
  total_estimated_cost_usd NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aut.provider,
    aut.api_type,
    SUM(aut.count)::BIGINT AS total_count,
    SUM(aut.estimated_cost_usd) AS total_estimated_cost_usd
  FROM api_usage_tracking aut
  WHERE aut.user_id = p_user_id
    AND aut.created_at >= p_start_date
    AND aut.created_at <= p_end_date
  GROUP BY aut.provider, aut.api_type;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_monthly_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_usage_summary TO service_role;
