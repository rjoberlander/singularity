/**
 * Eight Sleep Service
 * Mobile service for Eight Sleep integration
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session.data.session?.access_token) {
    headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
  }

  return headers;
}

// =============================================
// TYPES
// =============================================

export interface IntegrationStatus {
  connected: boolean;
  integration_id?: string;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'failed' | 'syncing' | 'never';
  sync_enabled: boolean;
  sync_time?: string;
  sync_timezone?: string;
  consecutive_failures: number;
  error_message?: string;
}

export interface SleepSession {
  id: string;
  user_id: string;
  date: string;
  sleep_score: number | null;
  sleep_quality_score: number | null;
  time_slept: number | null;
  time_to_fall_asleep: number | null;
  time_in_bed: number | null;
  wake_events: number;
  wake_event_times: string[];
  woke_between_2_and_4_am: boolean;
  wake_time_between_2_and_4_am: string | null;
  avg_heart_rate: number | null;
  min_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_hrv: number | null;
  min_hrv: number | null;
  max_hrv: number | null;
  avg_breathing_rate: number | null;
  light_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  awake_minutes: number | null;
  light_sleep_pct: number | null;
  deep_sleep_pct: number | null;
  rem_sleep_pct: number | null;
  awake_pct: number | null;
  avg_bed_temp: number | null;
  avg_room_temp: number | null;
  sleep_start_time: string | null;
  sleep_end_time: string | null;
  toss_and_turn_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SleepAnalysis {
  total_nights: number;
  avg_sleep_score: number | null;
  avg_deep_sleep_pct: number | null;
  avg_rem_sleep_pct: number | null;
  avg_hrv: number | null;
  avg_time_slept_hours: number | null;
  nights_with_2_4_am_wake: number;
  wake_2_4_am_rate: number;
}

export interface SleepTrend {
  date: string;
  sleep_score: number | null;
  deep_sleep_pct: number | null;
  avg_hrv: number | null;
  time_slept_hours: number | null;
  woke_2_4_am: boolean;
}

export interface ConnectRequest {
  email: string;
  password: string;
  sync_time?: string;
  sync_timezone?: string;
}

export interface ConnectResponse {
  message: string;
  integration_id: string;
  device_id?: string;
  side?: string;
}

export interface SyncResult {
  message: string;
  sessions_synced: number;
  latest_date?: string;
}

export interface UpdateSettingsRequest {
  sync_enabled?: boolean;
  sync_time?: string;
  sync_timezone?: string;
}

// =============================================
// API CALLS
// =============================================

/**
 * Connect Eight Sleep account
 */
export async function connectEightSleep(data: ConnectRequest): Promise<ConnectResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/connect`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect Eight Sleep');
  }

  return response.json();
}

/**
 * Disconnect Eight Sleep account
 */
export async function disconnectEightSleep(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/disconnect`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to disconnect Eight Sleep');
  }
}

/**
 * Get integration status
 */
export async function getEightSleepStatus(): Promise<IntegrationStatus> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/status`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get Eight Sleep status');
  }

  return response.json();
}

/**
 * Trigger manual sync
 */
export async function syncEightSleep(options?: {
  from_date?: string;
  to_date?: string;
  initial?: boolean;
}): Promise<SyncResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/sync`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync Eight Sleep');
  }

  return response.json();
}

/**
 * Get sleep sessions
 */
export async function getSleepSessions(options?: {
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<{ sessions: SleepSession[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.from_date) params.set('from_date', options.from_date);
  if (options?.to_date) params.set('to_date', options.to_date);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const url = `${API_BASE_URL}/api/v1/eight-sleep/sessions${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get sleep sessions');
  }

  return response.json();
}

/**
 * Get single sleep session
 */
export async function getSleepSession(id: string): Promise<SleepSession> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/sessions/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get sleep session');
  }

  return response.json();
}

/**
 * Get sleep analysis
 */
export async function getSleepAnalysis(days: number = 30): Promise<SleepAnalysis> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/analysis?days=${days}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get sleep analysis');
  }

  return response.json();
}

/**
 * Get sleep trends
 */
export async function getSleepTrends(days: number = 30): Promise<{ trends: SleepTrend[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/trends?days=${days}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get sleep trends');
  }

  return response.json();
}

/**
 * Update sync settings
 */
export async function updateEightSleepSettings(settings: UpdateSettingsRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/settings`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update settings');
  }
}

/**
 * Get supported timezones
 */
export async function getTimezones(): Promise<{ timezones: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/timezones`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get timezones');
  }

  return response.json();
}

// =============================================
// CORRELATION TYPES
// =============================================

export interface SupplementCorrelation {
  supplement_id: string;
  supplement_name: string;
  supplement_brand: string | null;
  nights_taken: number;
  nights_not_taken: number;
  avg_sleep_score_with: number | null;
  avg_sleep_score_without: number | null;
  avg_deep_sleep_pct_with: number | null;
  avg_deep_sleep_pct_without: number | null;
  avg_hrv_with: number | null;
  avg_hrv_without: number | null;
  wake_2_4_am_rate_with: number;
  wake_2_4_am_rate_without: number;
  sleep_score_diff: number | null;
  deep_sleep_diff: number | null;
  hrv_diff: number | null;
  wake_rate_diff: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
}

export interface DailyFactor {
  factor: string;
  nights_with: number;
  nights_without: number;
  avg_score_with: number | null;
  avg_score_without: number | null;
  score_diff: number | null;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CorrelationSummary {
  period_days: number;
  total_nights_analyzed: number;
  top_positive_supplements: SupplementCorrelation[];
  top_negative_supplements: SupplementCorrelation[];
  daily_factors: DailyFactor[];
  recommendations: string[];
}

// =============================================
// CORRELATION API CALLS
// =============================================

/**
 * Get supplement correlations
 */
export async function getCorrelations(days: number = 90): Promise<{ correlations: SupplementCorrelation[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/correlations?days=${days}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get correlations');
  }

  return response.json();
}

/**
 * Get full correlation summary with recommendations
 */
export async function getCorrelationSummary(days: number = 90): Promise<CorrelationSummary> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/correlations/summary?days=${days}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get correlation summary');
  }

  return response.json();
}

/**
 * Get daily factor correlations
 */
export async function getDailyFactorCorrelations(days: number = 90): Promise<{ factors: DailyFactor[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/correlations/factors?days=${days}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get factor correlations');
  }

  return response.json();
}

/**
 * Build/rebuild correlation data
 */
export async function buildCorrelations(days: number = 90): Promise<{ correlations_created: number }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/correlations/build`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ days }),
  });

  if (!response.ok) {
    throw new Error('Failed to build correlations');
  }

  return response.json();
}

// =============================================
// HELPERS
// =============================================

/**
 * Format minutes to hours and minutes string
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format sleep score with color
 */
export function getSleepScoreColor(score: number | null): string {
  if (score === null) return '#9ca3af'; // gray
  if (score >= 85) return '#22c55e'; // green
  if (score >= 70) return '#84cc16'; // lime
  if (score >= 55) return '#eab308'; // yellow
  if (score >= 40) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get sleep stage color
 */
export function getSleepStageColor(stage: 'deep' | 'rem' | 'light' | 'awake'): string {
  switch (stage) {
    case 'deep': return '#6366f1'; // indigo
    case 'rem': return '#8b5cf6'; // violet
    case 'light': return '#a78bfa'; // purple light
    case 'awake': return '#f87171'; // red light
    default: return '#9ca3af';
  }
}

/**
 * Format time string (HH:MM:SS to HH:MM AM/PM)
 */
export function formatTime(time: string | null): string {
  if (!time) return '--';
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Common timezones for picker
 */
export const COMMON_TIMEZONES = [
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Arizona (MST)', value: 'America/Phoenix' },
  { label: 'Alaska (AKST)', value: 'America/Anchorage' },
  { label: 'Hawaii (HST)', value: 'Pacific/Honolulu' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
];
