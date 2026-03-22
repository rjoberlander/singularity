/**
 * API Usage Tracking Service
 *
 * Tracks API usage across the app for billing visibility.
 * Supports Google Places, Anthropic, OpenAI, Perplexity, etc.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Known pricing for various APIs (as of 2024)
const API_PRICING = {
  google_places: {
    photo_fetch: 0.007, // $7 per 1,000 photos
    text_search: 0.032, // $32 per 1,000 requests (Basic tier)
    place_details: 0.017, // $17 per 1,000 requests (Basic tier)
  },
  anthropic: {
    // Claude Sonnet 3.5 pricing per 1M tokens
    input_tokens: 0.003, // $3 per 1M input tokens
    output_tokens: 0.015, // $15 per 1M output tokens
  },
  openai: {
    // GPT-4o pricing per 1M tokens
    input_tokens: 0.005,
    output_tokens: 0.015,
  },
  perplexity: {
    // Perplexity API pricing
    request: 0.005, // Approximate per request
  },
  google_routes: {
    // Google Routes API (Essentials tier)
    compute_routes: 0.005, // $5 per 1,000 requests
  },
} as const;

export interface TrackUsageParams {
  userId: string;
  provider: 'google_places' | 'anthropic' | 'openai' | 'perplexity' | string;
  apiType: string;
  count?: number;
  estimatedCostUsd?: number;
  contextType?: 'rv_enrichment' | 'travel_planning' | 'chat' | 'research' | string;
  contextId?: string;
  metadata?: Record<string, unknown>;
}

export interface MonthlyUsageSummary {
  provider: string;
  api_type: string;
  total_count: number;
  total_estimated_cost_usd: number;
}

export interface GooglePlacesUsageSummary {
  photos: {
    count: number;
    cost: number;
    freeRemaining: number;
  };
  textSearches: {
    count: number;
    cost: number;
  };
  placeDetails: {
    count: number;
    cost: number;
  };
  totalCost: number;
}

/**
 * Track an API usage event
 */
export async function trackApiUsage(params: TrackUsageParams): Promise<void> {
  const {
    userId,
    provider,
    apiType,
    count = 1,
    estimatedCostUsd,
    contextType,
    contextId,
    metadata = {},
  } = params;

  // Calculate estimated cost if not provided
  let cost = estimatedCostUsd;
  if (cost === undefined) {
    const providerPricing = API_PRICING[provider as keyof typeof API_PRICING];
    if (providerPricing) {
      const pricePerUnit = providerPricing[apiType as keyof typeof providerPricing];
      if (typeof pricePerUnit === 'number') {
        cost = pricePerUnit * count;
      }
    }
  }

  try {
    const { error } = await getSupabase().from('api_usage_tracking').insert({
      user_id: userId,
      provider,
      api_type: apiType,
      count,
      estimated_cost_usd: cost,
      context_type: contextType,
      context_id: contextId,
      metadata,
    });

    if (error) {
      console.error('[API Usage] Failed to track usage:', error);
    }
  } catch (error) {
    // Don't throw - tracking failures shouldn't break the main flow
    console.error('[API Usage] Error tracking usage:', error);
  }
}

/**
 * Track Google Places photo download
 */
export async function trackPhotoDownload(
  userId: string,
  count: number = 1,
  contextType?: string,
  contextId?: string
): Promise<void> {
  await trackApiUsage({
    userId,
    provider: 'google_places',
    apiType: 'photo_fetch',
    count,
    contextType,
    contextId,
  });
}

/**
 * Track Google Places text search
 */
export async function trackTextSearch(
  userId: string,
  contextType?: string,
  contextId?: string
): Promise<void> {
  await trackApiUsage({
    userId,
    provider: 'google_places',
    apiType: 'text_search',
    count: 1,
    contextType,
    contextId,
  });
}

/**
 * Track Google Places details fetch
 */
export async function trackPlaceDetails(
  userId: string,
  contextType?: string,
  contextId?: string
): Promise<void> {
  await trackApiUsage({
    userId,
    provider: 'google_places',
    apiType: 'place_details',
    count: 1,
    contextType,
    contextId,
  });
}

/**
 * Track Anthropic API usage
 */
export async function trackAnthropicUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  contextType?: string,
  contextId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Track input tokens
  if (inputTokens > 0) {
    await trackApiUsage({
      userId,
      provider: 'anthropic',
      apiType: 'input_tokens',
      count: inputTokens,
      estimatedCostUsd: (inputTokens / 1_000_000) * API_PRICING.anthropic.input_tokens,
      contextType,
      contextId,
      metadata,
    });
  }

  // Track output tokens
  if (outputTokens > 0) {
    await trackApiUsage({
      userId,
      provider: 'anthropic',
      apiType: 'output_tokens',
      count: outputTokens,
      estimatedCostUsd: (outputTokens / 1_000_000) * API_PRICING.anthropic.output_tokens,
      contextType,
      contextId,
      metadata,
    });
  }
}

/**
 * Get monthly usage summary for a user
 */
export async function getMonthlyUsage(
  userId: string,
  month?: Date
): Promise<MonthlyUsageSummary[]> {
  const targetMonth = month || new Date();
  // Use UTC methods to avoid timezone issues
  const year = targetMonth.getUTCFullYear();
  const monthIndex = targetMonth.getUTCMonth();
  const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  // Use RPC to aggregate in database (avoids Supabase 1000 row limit)
  const { data, error } = await getSupabase().rpc('get_monthly_usage_summary', {
    p_user_id: userId,
    p_start_date: startOfMonth.toISOString(),
    p_end_date: endOfMonth.toISOString(),
  });

  if (error) {
    // Fallback to client-side aggregation with pagination if RPC doesn't exist
    console.log('[API Usage] RPC not available, using fallback query with pagination');
    console.log('[API Usage] Date range:', startOfMonth.toISOString(), 'to', endOfMonth.toISOString());

    // Aggregate by provider and api_type using pagination to get all records
    const aggregated = new Map<string, MonthlyUsageSummary>();
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    let totalRows = 0;

    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('api_usage_tracking')
        .select('provider, api_type, count, estimated_cost_usd')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .range(offset, offset + pageSize - 1);

      if (pageError) {
        console.error('[API Usage] Failed to get monthly usage:', pageError);
        break;
      }

      const rowCount = pageData?.length || 0;
      totalRows += rowCount;

      // Aggregate this page
      for (const row of pageData || []) {
        const key = `${row.provider}:${row.api_type}`;
        const existing = aggregated.get(key);

        if (existing) {
          existing.total_count += row.count || 0;
          existing.total_estimated_cost_usd += row.estimated_cost_usd || 0;
        } else {
          aggregated.set(key, {
            provider: row.provider,
            api_type: row.api_type,
            total_count: row.count || 0,
            total_estimated_cost_usd: row.estimated_cost_usd || 0,
          });
        }
      }

      // Check if we need to fetch more
      hasMore = rowCount === pageSize;
      offset += pageSize;
    }

    console.log('[API Usage] Fallback query returned', totalRows, 'total rows');
    const result = Array.from(aggregated.values());
    console.log('[API Usage] Aggregated result:', JSON.stringify(result));
    return result;
  }

  return (data || []).map((row: { provider: string; api_type: string; total_count: number; total_estimated_cost_usd: number }) => ({
    provider: row.provider,
    api_type: row.api_type,
    total_count: Number(row.total_count) || 0,
    total_estimated_cost_usd: Number(row.total_estimated_cost_usd) || 0,
  }));
}

/**
 * Get Google Places specific usage summary with free tier info
 */
export async function getGooglePlacesUsageSummary(
  userId: string,
  month?: Date
): Promise<GooglePlacesUsageSummary> {
  const usage = await getMonthlyUsage(userId, month);

  const photoUsage = usage.find(
    (u) => u.provider === 'google_places' && u.api_type === 'photo_fetch'
  );
  const textSearchUsage = usage.find(
    (u) => u.provider === 'google_places' && u.api_type === 'text_search'
  );
  const placeDetailsUsage = usage.find(
    (u) => u.provider === 'google_places' && u.api_type === 'place_details'
  );

  const photoCount = photoUsage?.total_count || 0;
  const FREE_PHOTOS_PER_MONTH = 1000;

  // Calculate photo cost (first 1000 are free)
  const billablePhotos = Math.max(0, photoCount - FREE_PHOTOS_PER_MONTH);
  const photoCost = billablePhotos * API_PRICING.google_places.photo_fetch;

  return {
    photos: {
      count: photoCount,
      cost: photoCost,
      freeRemaining: Math.max(0, FREE_PHOTOS_PER_MONTH - photoCount),
    },
    textSearches: {
      count: textSearchUsage?.total_count || 0,
      cost: textSearchUsage?.total_estimated_cost_usd || 0,
    },
    placeDetails: {
      count: placeDetailsUsage?.total_count || 0,
      cost: placeDetailsUsage?.total_estimated_cost_usd || 0,
    },
    totalCost:
      photoCost +
      (textSearchUsage?.total_estimated_cost_usd || 0) +
      (placeDetailsUsage?.total_estimated_cost_usd || 0),
  };
}

/**
 * Get usage breakdown by context type (RV vs Travel vs Other)
 */
export async function getUsageByContext(
  userId: string,
  month?: Date
): Promise<{
  rv_enrichment: { photos: number; searches: number; details: number; cost: number };
  travel_planning: { photos: number; searches: number; details: number; cost: number };
  other: { photos: number; searches: number; details: number; cost: number };
}> {
  const targetMonth = month || new Date();
  // Use UTC methods to avoid timezone issues
  const year = targetMonth.getUTCFullYear();
  const monthIndex = targetMonth.getUTCMonth();
  const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  console.log('[API Usage Context] Date range:', startOfMonth.toISOString(), 'to', endOfMonth.toISOString());

  const result = {
    rv_enrichment: { photos: 0, searches: 0, details: 0, cost: 0 },
    travel_planning: { photos: 0, searches: 0, details: 0, cost: 0 },
    other: { photos: 0, searches: 0, details: 0, cost: 0 },
  };

  // Use pagination to get all records
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  let totalRows = 0;

  while (hasMore) {
    const { data, error } = await supabase
      .from('api_usage_tracking')
      .select('provider, api_type, count, estimated_cost_usd, context_type')
      .eq('user_id', userId)
      .eq('provider', 'google_places')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('[API Usage] Failed to get context usage:', error);
      break;
    }

    const rowCount = data?.length || 0;
    totalRows += rowCount;

    for (const row of data || []) {
      const context = row.context_type === 'rv_enrichment' ? 'rv_enrichment'
        : row.context_type === 'travel_planning' ? 'travel_planning'
        : 'other';

      const count = row.count || 0;
      const cost = row.estimated_cost_usd || 0;

      if (row.api_type === 'photo_fetch') {
        result[context].photos += count;
      } else if (row.api_type === 'text_search') {
        result[context].searches += count;
      } else if (row.api_type === 'place_details') {
        result[context].details += count;
      }
      result[context].cost += cost;
    }

    hasMore = rowCount === pageSize;
    offset += pageSize;
  }

  console.log('[API Usage Context] Query returned', totalRows, 'total rows');
  return result;
}

/**
 * Get all API usage summary for a user
 */
export async function getAllApiUsageSummary(
  userId: string,
  month?: Date
): Promise<{
  google_places: GooglePlacesUsageSummary;
  anthropic: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  openai: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  perplexity: {
    requests: number;
    cost: number;
  };
  totalCost: number;
}> {
  const usage = await getMonthlyUsage(userId, month);
  const googlePlaces = await getGooglePlacesUsageSummary(userId, month);

  // Anthropic
  const anthropicInput = usage.find(
    (u) => u.provider === 'anthropic' && u.api_type === 'input_tokens'
  );
  const anthropicOutput = usage.find(
    (u) => u.provider === 'anthropic' && u.api_type === 'output_tokens'
  );

  // OpenAI
  const openaiInput = usage.find(
    (u) => u.provider === 'openai' && u.api_type === 'input_tokens'
  );
  const openaiOutput = usage.find(
    (u) => u.provider === 'openai' && u.api_type === 'output_tokens'
  );

  // Perplexity
  const perplexityRequests = usage.find((u) => u.provider === 'perplexity');

  const anthropicCost =
    (anthropicInput?.total_estimated_cost_usd || 0) +
    (anthropicOutput?.total_estimated_cost_usd || 0);
  const openaiCost =
    (openaiInput?.total_estimated_cost_usd || 0) +
    (openaiOutput?.total_estimated_cost_usd || 0);
  const perplexityCost = perplexityRequests?.total_estimated_cost_usd || 0;

  return {
    google_places: googlePlaces,
    anthropic: {
      input_tokens: anthropicInput?.total_count || 0,
      output_tokens: anthropicOutput?.total_count || 0,
      cost: anthropicCost,
    },
    openai: {
      input_tokens: openaiInput?.total_count || 0,
      output_tokens: openaiOutput?.total_count || 0,
      cost: openaiCost,
    },
    perplexity: {
      requests: perplexityRequests?.total_count || 0,
      cost: perplexityCost,
    },
    totalCost: googlePlaces.totalCost + anthropicCost + openaiCost + perplexityCost,
  };
}
