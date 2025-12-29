/**
 * Eight Sleep Sync Scheduler
 *
 * Cron-based scheduler that runs every minute and triggers syncs
 * for users based on their configured sync time and timezone.
 *
 * Usage:
 *   import { startSyncScheduler, stopSyncScheduler } from './jobs/syncScheduler';
 *   startSyncScheduler(); // Call on server start
 */

import { supabase } from '../../../config/supabase';
import { EightSleepService } from '../services/eightSleepService';

// Store interval reference for cleanup
let schedulerInterval: NodeJS.Timeout | null = null;

// Track which users we've already synced this hour to avoid duplicates
const syncedThisHour = new Map<string, string>(); // userId -> hourKey

/**
 * Get current time in a specific timezone
 */
function getTimeInTimezone(timezone: string): { hours: number; minutes: number; hourKey: string } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    // Create a unique key for this hour in this timezone
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = dateFormatter.format(now);
    const hourKey = `${dateStr}-${hours.toString().padStart(2, '0')}`;

    return { hours, minutes, hourKey };
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return { hours: -1, minutes: -1, hourKey: '' };
  }
}

/**
 * Parse sync time string (HH:MM:SS or HH:MM) to hours and minutes
 */
function parseSyncTime(syncTime: string): { hours: number; minutes: number } {
  const [hours, minutes] = syncTime.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Check if it's time to sync for a user
 */
function shouldSync(
  syncTime: string,
  syncTimezone: string,
  userId: string
): boolean {
  const { hours: targetHours, minutes: targetMinutes } = parseSyncTime(syncTime);
  const { hours: currentHours, minutes: currentMinutes, hourKey } = getTimeInTimezone(syncTimezone);

  if (currentHours === -1) return false;

  // Check if we're within the sync window (same hour, within first 5 minutes)
  const isCorrectHour = currentHours === targetHours;
  const isWithinWindow = currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 5;

  if (!isCorrectHour || !isWithinWindow) {
    return false;
  }

  // Check if we've already synced this user this hour
  const lastSync = syncedThisHour.get(userId);
  if (lastSync === hourKey) {
    return false;
  }

  return true;
}

/**
 * Mark user as synced for this hour
 */
function markSynced(userId: string, timezone: string): void {
  const { hourKey } = getTimeInTimezone(timezone);
  syncedThisHour.set(userId, hourKey);
}

/**
 * Clean up old sync records (run periodically)
 */
function cleanupSyncRecords(): void {
  // Keep only recent entries (last 2 hours worth of unique hour keys)
  if (syncedThisHour.size > 1000) {
    syncedThisHour.clear();
  }
}

/**
 * Run sync check for all users
 */
async function runSyncCheck(): Promise<void> {
  try {
    // Get all active integrations with sync enabled
    const { data: integrations, error } = await supabase
      .from('eight_sleep_integrations')
      .select('id, user_id, sync_time, sync_timezone, last_sync_at')
      .eq('is_active', true)
      .eq('sync_enabled', true);

    if (error) {
      console.error('Failed to fetch integrations for sync:', error);
      return;
    }

    if (!integrations || integrations.length === 0) {
      return;
    }

    // Check each integration
    for (const integration of integrations) {
      const { user_id, sync_time, sync_timezone } = integration;

      if (!sync_time || !sync_timezone) {
        continue;
      }

      if (shouldSync(sync_time, sync_timezone, user_id)) {
        console.log(`[SyncScheduler] Triggering sync for user ${user_id}`);

        // Mark as synced immediately to prevent duplicate triggers
        markSynced(user_id, sync_timezone);

        // Run sync in background (don't await)
        EightSleepService.sync(user_id)
          .then((result) => {
            if (result.success) {
              console.log(`[SyncScheduler] Sync completed for user ${user_id}: ${result.sessions_synced} sessions`);
            } else {
              console.error(`[SyncScheduler] Sync failed for user ${user_id}: ${result.error}`);
            }
          })
          .catch((err) => {
            console.error(`[SyncScheduler] Sync error for user ${user_id}:`, err);
          });
      }
    }

    // Periodic cleanup
    cleanupSyncRecords();
  } catch (error) {
    console.error('[SyncScheduler] Error in sync check:', error);
  }
}

/**
 * Start the sync scheduler
 * Runs every minute to check for users who need syncing
 */
export function startSyncScheduler(): void {
  if (schedulerInterval) {
    console.log('[SyncScheduler] Scheduler already running');
    return;
  }

  console.log('[SyncScheduler] Starting sync scheduler (runs every minute)');

  // Run immediately on start
  runSyncCheck();

  // Then run every minute
  schedulerInterval = setInterval(runSyncCheck, 60 * 1000);
}

/**
 * Stop the sync scheduler
 */
export function stopSyncScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[SyncScheduler] Scheduler stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  trackedUsers: number;
} {
  return {
    running: schedulerInterval !== null,
    trackedUsers: syncedThisHour.size,
  };
}

export default {
  startSyncScheduler,
  stopSyncScheduler,
  isSchedulerRunning,
  getSchedulerStatus,
};
