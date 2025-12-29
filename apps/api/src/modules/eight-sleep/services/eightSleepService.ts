/**
 * Eight Sleep Service
 *
 * Core business logic for managing Eight Sleep integration:
 * - Connect/disconnect accounts
 * - Sync sleep data
 * - Get integration status
 * - Manage sync settings
 */

import { supabase } from '../../../config/supabase';
import { encryptForStorage, decryptFromStorage } from '../../../utils/encryption';
import {
  EightSleepIntegration,
  SleepSession,
  ConnectRequest,
  ConnectResponse,
  SyncResult,
  IntegrationStatus,
  SleepAnalysisSummary,
  SleepTrend,
  UpdateSyncSettingsRequest,
} from '../types';
import {
  login,
  getDevices,
  getIntervals,
  determineBedSide,
  parseInterval,
} from '../utils/eightSleepApiClient';

export class EightSleepService {
  /**
   * Connect an Eight Sleep account
   */
  static async connect(userId: string, request: ConnectRequest): Promise<ConnectResponse> {
    // Step 1: Test credentials with Eight Sleep API
    const loginResult = await login({ email: request.email, password: request.password });

    if (!loginResult.success || !loginResult.data) {
      return {
        success: false,
        integration_id: '',
        eight_sleep_user_id: '',
        error: loginResult.error || 'Failed to authenticate with Eight Sleep',
      };
    }

    const { userId: eightSleepUserId, token, expirationDate } = loginResult.data.session;

    // Step 2: Get device info to determine bed side
    const devicesResult = await getDevices(eightSleepUserId, token);
    let deviceId: string | undefined;
    let side: 'left' | 'right' | 'solo' | undefined;

    if (devicesResult.success && devicesResult.data?.devices) {
      const devices = devicesResult.data.devices;
      if (devices.length > 0) {
        deviceId = devices[0].id;
        side = determineBedSide(devices, eightSleepUserId) || undefined;
      }
    }

    // Step 3: Encrypt credentials
    const emailEncrypted = encryptForStorage(request.email);
    const passwordEncrypted = encryptForStorage(request.password);
    const tokenEncrypted = encryptForStorage(token);

    // Step 4: Store in database (upsert)
    const { data, error } = await supabase
      .from('eight_sleep_integrations')
      .upsert(
        {
          user_id: userId,
          email_encrypted: emailEncrypted,
          password_encrypted: passwordEncrypted,
          eight_sleep_user_id: eightSleepUserId,
          session_token_encrypted: tokenEncrypted,
          token_expires_at: expirationDate,
          device_id: deviceId,
          side: side,
          sync_enabled: true,
          sync_time: request.sync_time || '08:00:00',
          sync_timezone: request.sync_timezone || 'America/Los_Angeles',
          is_active: true,
          last_sync_status: 'never',
          consecutive_failures: 0,
          last_error_message: null,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to store Eight Sleep integration:', error);
      return {
        success: false,
        integration_id: '',
        eight_sleep_user_id: '',
        error: 'Failed to store integration. Please try again.',
      };
    }

    // Step 5: Create sync schedule
    await supabase.from('sync_schedules').upsert(
      {
        user_id: userId,
        integration_type: 'eight_sleep',
        is_enabled: true,
        sync_time: request.sync_time || '08:00:00',
        timezone: request.sync_timezone || 'America/Los_Angeles',
      },
      { onConflict: 'user_id,integration_type' }
    );

    return {
      success: true,
      integration_id: data.id,
      eight_sleep_user_id: eightSleepUserId,
      device_id: deviceId,
      side: side,
    };
  }

  /**
   * Disconnect Eight Sleep account
   */
  static async disconnect(userId: string): Promise<{ success: boolean; error?: string }> {
    // Delete integration (cascades to sleep_sessions via FK)
    const { error } = await supabase
      .from('eight_sleep_integrations')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to disconnect Eight Sleep:', error);
      return { success: false, error: 'Failed to disconnect. Please try again.' };
    }

    // Delete sync schedule
    await supabase
      .from('sync_schedules')
      .delete()
      .eq('user_id', userId)
      .eq('integration_type', 'eight_sleep');

    return { success: true };
  }

  /**
   * Get integration status for a user
   */
  static async getStatus(userId: string): Promise<IntegrationStatus> {
    const { data, error } = await supabase
      .from('eight_sleep_integrations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        connected: false,
        sync_enabled: false,
        consecutive_failures: 0,
      };
    }

    return {
      connected: true,
      integration_id: data.id,
      last_sync_at: data.last_sync_at,
      last_sync_status: data.last_sync_status,
      sync_enabled: data.sync_enabled,
      sync_time: data.sync_time,
      sync_timezone: data.sync_timezone,
      consecutive_failures: data.consecutive_failures,
      error_message: data.last_error_message,
    };
  }

  /**
   * Get valid session token (re-authenticates if expired)
   */
  private static async getValidToken(
    integration: EightSleepIntegration
  ): Promise<{ token: string; userId: string } | null> {
    // Check if token is still valid (with 5 min buffer)
    if (
      integration.session_token_encrypted &&
      integration.token_expires_at &&
      new Date(integration.token_expires_at) > new Date(Date.now() + 5 * 60 * 1000)
    ) {
      try {
        const token = decryptFromStorage(integration.session_token_encrypted);
        return { token, userId: integration.eight_sleep_user_id! };
      } catch (e) {
        console.warn('Failed to decrypt stored token, re-authenticating...');
      }
    }

    // Re-authenticate
    try {
      const email = decryptFromStorage(integration.email_encrypted);
      const password = decryptFromStorage(integration.password_encrypted);

      const loginResult = await login({ email, password });

      if (!loginResult.success || !loginResult.data) {
        return null;
      }

      const { userId, token, expirationDate } = loginResult.data.session;
      const tokenEncrypted = encryptForStorage(token);

      // Update stored token
      await supabase
        .from('eight_sleep_integrations')
        .update({
          session_token_encrypted: tokenEncrypted,
          token_expires_at: expirationDate,
          eight_sleep_user_id: userId,
        })
        .eq('id', integration.id);

      return { token, userId };
    } catch (error) {
      console.error('Failed to re-authenticate with Eight Sleep:', error);
      return null;
    }
  }

  /**
   * Sync sleep data for a user
   */
  static async sync(
    userId: string,
    options?: { fromDate?: string; toDate?: string; initialSync?: boolean }
  ): Promise<SyncResult> {
    // Get integration
    const { data: integration, error: intError } = await supabase
      .from('eight_sleep_integrations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (intError || !integration) {
      return {
        success: false,
        sessions_synced: 0,
        error: 'Eight Sleep not connected',
      };
    }

    // Mark as syncing
    await supabase
      .from('eight_sleep_integrations')
      .update({ last_sync_status: 'syncing' })
      .eq('id', integration.id);

    try {
      // Get valid token
      const auth = await this.getValidToken(integration as EightSleepIntegration);

      if (!auth) {
        throw new Error('Failed to authenticate with Eight Sleep');
      }

      // Calculate date range
      const toDate = options?.toDate || new Date().toISOString().split('T')[0];
      let fromDate = options?.fromDate;

      if (!fromDate) {
        if (options?.initialSync) {
          // Initial sync: last 30 days
          const from = new Date();
          from.setDate(from.getDate() - 30);
          fromDate = from.toISOString().split('T')[0];
        } else {
          // Regular sync: last 2 days (to catch late-processed data)
          const from = new Date();
          from.setDate(from.getDate() - 2);
          fromDate = from.toISOString().split('T')[0];
        }
      }

      // Fetch intervals from Eight Sleep
      const intervalsResult = await getIntervals(auth.userId, auth.token, fromDate, toDate);

      if (!intervalsResult.success || !intervalsResult.data) {
        throw new Error(intervalsResult.error || 'Failed to fetch sleep data');
      }

      const intervals = intervalsResult.data.intervals || [];
      let syncedCount = 0;
      let latestDate: string | undefined;

      // Process each interval
      for (const interval of intervals) {
        if (interval.incomplete) {
          continue; // Skip incomplete sessions
        }

        const parsed = parseInterval(interval);

        // Upsert sleep session
        const { error: upsertError } = await supabase.from('sleep_sessions').upsert(
          {
            user_id: userId,
            integration_id: integration.id,
            date: parsed.date,
            eight_sleep_interval_id: interval.id,
            sleep_score: parsed.sleep_score,
            time_slept: parsed.time_slept,
            time_to_fall_asleep: parsed.time_to_fall_asleep,
            time_in_bed: parsed.time_in_bed,
            wake_events: parsed.wake_events,
            wake_event_times: parsed.wake_event_times,
            woke_between_2_and_4_am: parsed.woke_between_2_and_4_am,
            wake_time_between_2_and_4_am: parsed.wake_time_between_2_and_4_am,
            avg_heart_rate: parsed.avg_heart_rate,
            min_heart_rate: parsed.min_heart_rate,
            max_heart_rate: parsed.max_heart_rate,
            avg_hrv: parsed.avg_hrv,
            min_hrv: parsed.min_hrv,
            max_hrv: parsed.max_hrv,
            avg_breathing_rate: parsed.avg_breathing_rate,
            min_breathing_rate: parsed.min_breathing_rate,
            max_breathing_rate: parsed.max_breathing_rate,
            light_sleep_minutes: parsed.light_sleep_minutes,
            deep_sleep_minutes: parsed.deep_sleep_minutes,
            rem_sleep_minutes: parsed.rem_sleep_minutes,
            awake_minutes: parsed.awake_minutes,
            light_sleep_pct: parsed.light_sleep_pct,
            deep_sleep_pct: parsed.deep_sleep_pct,
            rem_sleep_pct: parsed.rem_sleep_pct,
            awake_pct: parsed.awake_pct,
            avg_bed_temp: parsed.avg_bed_temp,
            avg_room_temp: parsed.avg_room_temp,
            sleep_start_time: parsed.sleep_start_time,
            sleep_end_time: parsed.sleep_end_time,
            toss_and_turn_count: parsed.toss_and_turn_count,
            raw_data: interval,
            synced_from_api: true,
          },
          { onConflict: 'user_id,date' }
        );

        if (!upsertError) {
          syncedCount++;
          if (!latestDate || parsed.date > latestDate) {
            latestDate = parsed.date;
          }
        }
      }

      // Update integration status
      await supabase
        .from('eight_sleep_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
          consecutive_failures: 0,
          last_error_message: null,
        })
        .eq('id', integration.id);

      return {
        success: true,
        sessions_synced: syncedCount,
        latest_date: latestDate,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update failure status
      await supabase
        .from('eight_sleep_integrations')
        .update({
          last_sync_status: 'failed',
          consecutive_failures: (integration.consecutive_failures || 0) + 1,
          last_error_message: errorMessage,
        })
        .eq('id', integration.id);

      return {
        success: false,
        sessions_synced: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Get sleep sessions for a user
   */
  static async getSessions(
    userId: string,
    options?: {
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ sessions: Partial<SleepSession>[]; total: number }> {
    let query = supabase
      .from('sleep_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (options?.fromDate) {
      query = query.gte('date', options.fromDate);
    }

    if (options?.toDate) {
      query = query.lte('date', options.toDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch sleep sessions:', error);
      return { sessions: [], total: 0 };
    }

    return { sessions: data || [], total: count || 0 };
  }

  /**
   * Get a single sleep session
   */
  static async getSession(
    userId: string,
    sessionId: string
  ): Promise<SleepSession | null> {
    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Get sleep analysis summary
   */
  static async getAnalysis(
    userId: string,
    days: number = 30
  ): Promise<SleepAnalysisSummary | null> {
    const { data, error } = await supabase.rpc('get_sleep_analysis', {
      p_user_id: userId,
      p_days: days,
    });

    if (error || !data || data.length === 0) {
      console.error('Failed to get sleep analysis:', error);
      return null;
    }

    return data[0];
  }

  /**
   * Get sleep trends for charting
   */
  static async getTrends(
    userId: string,
    days: number = 30
  ): Promise<SleepTrend[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data, error } = await supabase
      .from('sleep_sessions')
      .select('date, sleep_score, deep_sleep_pct, avg_hrv, time_slept, woke_between_2_and_4_am')
      .eq('user_id', userId)
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((d) => ({
      date: d.date,
      sleep_score: d.sleep_score,
      deep_sleep_pct: d.deep_sleep_pct,
      avg_hrv: d.avg_hrv,
      time_slept_hours: d.time_slept ? Math.round((d.time_slept / 60) * 100) / 100 : null,
      woke_2_4_am: d.woke_between_2_and_4_am,
    }));
  }

  /**
   * Update sync settings
   */
  static async updateSettings(
    userId: string,
    settings: UpdateSyncSettingsRequest
  ): Promise<{ success: boolean; error?: string }> {
    const updates: Record<string, unknown> = {};

    if (settings.sync_enabled !== undefined) {
      updates.sync_enabled = settings.sync_enabled;
    }

    if (settings.sync_time) {
      updates.sync_time = settings.sync_time;
    }

    if (settings.sync_timezone) {
      updates.sync_timezone = settings.sync_timezone;
    }

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    const { error } = await supabase
      .from('eight_sleep_integrations')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: 'Failed to update settings' };
    }

    // Also update sync schedule
    await supabase
      .from('sync_schedules')
      .update({
        is_enabled: settings.sync_enabled,
        sync_time: settings.sync_time,
        timezone: settings.sync_timezone,
      })
      .eq('user_id', userId)
      .eq('integration_type', 'eight_sleep');

    return { success: true };
  }
}

export default EightSleepService;
