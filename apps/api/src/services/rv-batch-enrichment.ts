/**
 * RV Batch Enrichment Service
 *
 * Handles batch enrichment of RV locations with persistent job tracking
 * and SSE (Server-Sent Events) for live progress updates.
 */

import { createClient } from '@supabase/supabase-js';
import { Response } from 'express';
import { enrichLocation } from './rv-enrichment';
import type { RVEnrichmentOptions } from '@singularity/shared-types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type EnrichmentJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface EnrichmentJob {
  id: string;
  user_id: string;
  status: EnrichmentJobStatus;
  total_locations: number;
  processed_locations: number;
  successful_locations: number;
  failed_locations: number;
  photos_downloaded: number;
  estimated_cost_usd: number;
  current_location_id: string | null;
  current_location_name: string | null;
  current_step: string | null;
  location_ids: string[];
  errors: Array<{ locationId: string; name: string; error: string }>;
  options: RVEnrichmentOptions;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface EnrichmentProgress {
  jobId: string;
  status: EnrichmentJobStatus;
  totalLocations: number;
  processedLocations: number;
  successfulLocations: number;
  failedLocations: number;
  photosDownloaded: number;
  estimatedCostUsd: number;
  currentLocationId: string | null;
  currentLocationName: string | null;
  currentStep: string | null;
  errors: Array<{ locationId: string; name: string; error: string }>;
}

// Store active SSE connections by job ID
const activeConnections = new Map<string, Set<Response>>();

/**
 * Send SSE event to all connected clients for a job
 */
function sendSSEEvent(jobId: string, event: string, data: unknown): void {
  const connections = activeConnections.get(jobId);
  if (!connections) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of connections) {
    try {
      res.write(message);
    } catch {
      // Connection closed, will be cleaned up
    }
  }
}

/**
 * Register an SSE connection for a job
 */
export function registerSSEConnection(jobId: string, res: Response): void {
  if (!activeConnections.has(jobId)) {
    activeConnections.set(jobId, new Set());
  }
  activeConnections.get(jobId)!.add(res);

  // Clean up on disconnect
  res.on('close', () => {
    const connections = activeConnections.get(jobId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        activeConnections.delete(jobId);
      }
    }
  });
}

/**
 * Clean up orphaned jobs (running jobs that have been stuck for too long)
 * A job is considered orphaned if it's been "running" for more than 30 minutes
 * and the server doesn't have it tracked in memory.
 */
export async function cleanupOrphanedJobs(userId: string): Promise<number> {
  // 5 minutes is reasonable for batch enrichment - if it's been running longer without updates, it's likely orphaned
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: staleJobs, error: queryError } = await supabase
    .from('rv_enrichment_jobs')
    .select('id, status, started_at')
    .eq('user_id', userId)
    .eq('status', 'running')
    .lt('started_at', fiveMinutesAgo);

  if (queryError || !staleJobs || staleJobs.length === 0) {
    return 0;
  }

  // Mark stale jobs as failed
  for (const job of staleJobs) {
    // Only mark as failed if we don't have an active connection to it
    if (!activeConnections.has(job.id)) {
      console.log(`[Batch Enrichment] Cleaning up orphaned job ${job.id} (started at ${job.started_at})`);

      await supabase
        .from('rv_enrichment_jobs')
        .update({
          status: 'failed',
          errors: [{ locationId: '', name: '', error: 'Job timed out (server restart or crash)' }],
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }
  }

  return staleJobs.length;
}

/**
 * Get active enrichment job for a user
 * Automatically cleans up orphaned jobs first
 */
export async function getActiveJob(userId: string): Promise<EnrichmentJob | null> {
  // First, clean up any orphaned jobs
  await cleanupOrphanedJobs(userId);

  const { data, error } = await supabase
    .from('rv_enrichment_jobs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('[getActiveJob] userId:', userId, 'error:', error?.message, 'data:', data ? `job ${data.id} status=${data.status}` : 'null');

  if (error || !data) {
    return null;
  }

  return data as EnrichmentJob;
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string, userId: string): Promise<EnrichmentJob | null> {
  const { data, error } = await supabase
    .from('rv_enrichment_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as EnrichmentJob;
}

/**
 * Create a new enrichment job
 */
export async function createEnrichmentJob(
  userId: string,
  locationIds: string[],
  options: RVEnrichmentOptions = {}
): Promise<EnrichmentJob> {
  // Get location names for better progress display
  const { data: locations } = await supabase
    .from('rv_locations')
    .select('id, name')
    .in('id', locationIds);

  const { data: job, error } = await supabase
    .from('rv_enrichment_jobs')
    .insert({
      user_id: userId,
      status: 'pending',
      total_locations: locationIds.length,
      processed_locations: 0,
      successful_locations: 0,
      failed_locations: 0,
      photos_downloaded: 0,
      estimated_cost_usd: 0,
      location_ids: locationIds,
      errors: [],
      options,
    })
    .select()
    .single();

  if (error || !job) {
    throw new Error(`Failed to create enrichment job: ${error?.message}`);
  }

  return job as EnrichmentJob;
}

/**
 * Update job progress
 */
async function updateJobProgress(
  jobId: string,
  updates: Partial<EnrichmentJob>
): Promise<void> {
  const { error } = await supabase
    .from('rv_enrichment_jobs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[Batch Enrichment] Failed to update job progress:', error);
  }

  // Send SSE update
  const progress: EnrichmentProgress = {
    jobId,
    status: updates.status || 'running',
    totalLocations: updates.total_locations || 0,
    processedLocations: updates.processed_locations || 0,
    successfulLocations: updates.successful_locations || 0,
    failedLocations: updates.failed_locations || 0,
    photosDownloaded: updates.photos_downloaded || 0,
    estimatedCostUsd: updates.estimated_cost_usd || 0,
    currentLocationId: updates.current_location_id || null,
    currentLocationName: updates.current_location_name || null,
    currentStep: updates.current_step || null,
    errors: updates.errors || [],
  };

  sendSSEEvent(jobId, 'progress', progress);
}

/**
 * Run the batch enrichment job
 * This runs asynchronously and updates progress as it goes
 */
export async function runEnrichmentJob(job: EnrichmentJob): Promise<void> {
  const jobId = job.id;
  const userId = job.user_id;
  const locationIds = job.location_ids;
  const options = job.options || {};

  console.log(`[Batch Enrichment] Starting job ${jobId} for ${locationIds.length} locations`);

  // Update job to running
  await updateJobProgress(jobId, {
    status: 'running',
    started_at: new Date().toISOString(),
  } as any);

  let processedLocations = 0;
  let successfulLocations = 0;
  let failedLocations = 0;
  let photosDownloaded = 0;
  let estimatedCostUsd = 0;
  const errors: Array<{ locationId: string; name: string; error: string }> = [];

  // Get all location names upfront
  const { data: locations } = await supabase
    .from('rv_locations')
    .select('id, name')
    .in('id', locationIds);

  const locationNames = new Map(locations?.map(l => [l.id, l.name]) || []);

  for (const locationId of locationIds) {
    const locationName = locationNames.get(locationId) || 'Unknown';

    // Check if job was cancelled
    const { data: currentJob } = await supabase
      .from('rv_enrichment_jobs')
      .select('status')
      .eq('id', jobId)
      .single();

    if (currentJob?.status === 'cancelled') {
      console.log(`[Batch Enrichment] Job ${jobId} was cancelled`);
      sendSSEEvent(jobId, 'cancelled', { jobId });
      return;
    }

    // Update current location
    await updateJobProgress(jobId, {
      current_location_id: locationId,
      current_location_name: locationName,
      current_step: 'searching',
      processed_locations: processedLocations,
      successful_locations: successfulLocations,
      failed_locations: failedLocations,
      photos_downloaded: photosDownloaded,
      estimated_cost_usd: estimatedCostUsd,
      errors,
      status: 'running',
    } as any);

    try {
      console.log(`[Batch Enrichment] Enriching ${locationName} (${processedLocations + 1}/${locationIds.length})`);

      // Update step to enriching
      await updateJobProgress(jobId, {
        current_step: 'fetching_details',
        status: 'running',
      } as any);

      const result = await enrichLocation(locationId, userId, options);

      if (result.success) {
        successfulLocations++;
        photosDownloaded += result.photos_added;

        // Estimate cost based on what was done
        // Text search: $0.032, Place details: $0.017, Photos: $0.007 each
        const locationCost = 0.032 + 0.017 + (result.photos_added * 0.007);
        estimatedCostUsd += locationCost;

        console.log(`[Batch Enrichment] Successfully enriched ${locationName}: ${result.photos_added} photos`);
      } else {
        failedLocations++;
        const errorMsg = result.errors?.join(', ') || 'Unknown error';
        errors.push({ locationId, name: locationName, error: errorMsg });
        console.error(`[Batch Enrichment] Failed to enrich ${locationName}:`, errorMsg);
      }
    } catch (error: any) {
      failedLocations++;
      errors.push({ locationId, name: locationName, error: error.message || 'Unknown error' });
      console.error(`[Batch Enrichment] Exception enriching ${locationName}:`, error);
    }

    processedLocations++;

    // Update progress after each location
    await updateJobProgress(jobId, {
      processed_locations: processedLocations,
      successful_locations: successfulLocations,
      failed_locations: failedLocations,
      photos_downloaded: photosDownloaded,
      estimated_cost_usd: estimatedCostUsd,
      errors,
      status: 'running',
    } as any);
  }

  // Job complete
  const finalStatus: EnrichmentJobStatus = failedLocations === locationIds.length ? 'failed' : 'completed';

  await updateJobProgress(jobId, {
    status: finalStatus,
    completed_at: new Date().toISOString(),
    current_location_id: null,
    current_location_name: null,
    current_step: null,
    processed_locations: processedLocations,
    successful_locations: successfulLocations,
    failed_locations: failedLocations,
    photos_downloaded: photosDownloaded,
    estimated_cost_usd: estimatedCostUsd,
    errors,
  } as any);

  console.log(`[Batch Enrichment] Job ${jobId} completed: ${successfulLocations} successful, ${failedLocations} failed`);

  sendSSEEvent(jobId, 'complete', {
    jobId,
    status: finalStatus,
    successfulLocations,
    failedLocations,
    photosDownloaded,
    estimatedCostUsd,
  });
}

/**
 * Cancel an enrichment job
 */
export async function cancelEnrichmentJob(jobId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rv_enrichment_jobs')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('user_id', userId)
    .in('status', ['pending', 'running']);

  if (error) {
    console.error('[Batch Enrichment] Failed to cancel job:', error);
    return false;
  }

  sendSSEEvent(jobId, 'cancelled', { jobId });
  return true;
}

/**
 * Get recent enrichment jobs for a user
 */
export async function getRecentJobs(
  userId: string,
  limit: number = 10
): Promise<EnrichmentJob[]> {
  const { data, error } = await supabase
    .from('rv_enrichment_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Batch Enrichment] Failed to get recent jobs:', error);
    return [];
  }

  return data as EnrichmentJob[];
}

/**
 * Convert job to progress format for API response
 */
export function jobToProgress(job: EnrichmentJob): EnrichmentProgress {
  return {
    jobId: job.id,
    status: job.status,
    totalLocations: job.total_locations,
    processedLocations: job.processed_locations,
    successfulLocations: job.successful_locations,
    failedLocations: job.failed_locations,
    photosDownloaded: job.photos_downloaded,
    estimatedCostUsd: job.estimated_cost_usd,
    currentLocationId: job.current_location_id,
    currentLocationName: job.current_location_name,
    currentStep: job.current_step,
    errors: job.errors || [],
  };
}
