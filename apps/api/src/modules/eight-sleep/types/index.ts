/**
 * Eight Sleep Integration Types
 */

// =============================================
// DATABASE TYPES
// =============================================

export interface EightSleepIntegration {
  id: string;
  user_id: string;
  email_encrypted: string;
  password_encrypted: string;
  eight_sleep_user_id: string | null;
  session_token_encrypted: string | null;
  token_expires_at: string | null;
  device_id: string | null;
  side: 'left' | 'right' | 'solo' | null;
  sync_enabled: boolean;
  sync_time: string;
  sync_timezone: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'syncing' | 'never' | null;
  consecutive_failures: number;
  last_error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SleepSession {
  id: string;
  user_id: string;
  integration_id: string | null;
  date: string;
  eight_sleep_interval_id: string | null;

  // Scores
  sleep_score: number | null;
  sleep_quality_score: number | null;

  // Duration (minutes)
  time_slept: number | null;
  time_to_fall_asleep: number | null;
  time_in_bed: number | null;

  // Wake events
  wake_events: number;
  wake_event_times: string[];
  woke_between_2_and_4_am: boolean;
  wake_time_between_2_and_4_am: string | null;

  // Vitals - Heart Rate
  avg_heart_rate: number | null;
  min_heart_rate: number | null;
  max_heart_rate: number | null;
  resting_heart_rate: number | null;

  // Vitals - HRV
  avg_hrv: number | null;
  min_hrv: number | null;
  max_hrv: number | null;

  // Vitals - Breathing
  avg_breathing_rate: number | null;
  min_breathing_rate: number | null;
  max_breathing_rate: number | null;

  // Sleep stages (minutes)
  light_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  awake_minutes: number | null;

  // Sleep stage percentages
  light_sleep_pct: number | null;
  deep_sleep_pct: number | null;
  rem_sleep_pct: number | null;
  awake_pct: number | null;

  // Environment
  avg_bed_temp: number | null;
  avg_room_temp: number | null;
  avg_room_humidity: number | null;
  bed_temp_level: number | null;

  // Timestamps
  sleep_start_time: string | null;
  sleep_end_time: string | null;

  // Misc
  toss_and_turn_count: number | null;
  raw_data: Record<string, unknown> | null;
  synced_from_api: boolean;
  created_at: string;
  updated_at: string;
}

export interface SleepProtocolCorrelation {
  id: string;
  sleep_session_id: string;
  user_id: string;
  date: string;
  supplements_taken: SupplementSnapshot[];
  routine_items_completed: RoutineItemSnapshot[];
  biomarkers_recorded: BiomarkerSnapshot[];
  notes: string | null;
  alcohol_consumed: boolean | null;
  caffeine_after_noon: boolean | null;
  exercise_that_day: boolean | null;
  high_stress_day: boolean | null;
  created_at: string;
}

export interface SupplementSnapshot {
  id: string;
  name: string;
  brand?: string;
  dose?: string;
  dose_unit?: string;
  timing?: string;
  taken_at?: string;
}

export interface RoutineItemSnapshot {
  routine_id: string;
  routine_name: string;
  item_id: string;
  item_title: string;
  completed_at?: string;
}

export interface BiomarkerSnapshot {
  id: string;
  name: string;
  value: number;
  unit: string;
}

export interface SyncSchedule {
  id: string;
  user_id: string;
  integration_type: 'eight_sleep' | 'oura' | 'whoop' | 'garmin' | 'apple_health';
  is_enabled: boolean;
  sync_time: string;
  timezone: string;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// EIGHT SLEEP API TYPES
// =============================================

export interface EightSleepLoginRequest {
  email: string;
  password: string;
}

export interface EightSleepLoginResponse {
  session: {
    userId: string;
    token: string;
    expirationDate: string;
  };
}

export interface EightSleepUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  features: Record<string, unknown>;
}

export interface EightSleepDevice {
  id: string;
  side: string;
  ownerId: string;
  leftUserId?: string;
  rightUserId?: string;
  lastSeen: string;
  features: Record<string, unknown>;
}

export interface EightSleepInterval {
  id: string;
  ts: string; // Start timestamp
  stages: EightSleepStage[];
  score: number;
  timeseries: {
    heartRate?: TimeseriesData[];
    hrv?: TimeseriesData[];
    respiratoryRate?: TimeseriesData[];
    bedTemperature?: TimeseriesData[];
    roomTemperature?: TimeseriesData[];
    tnt?: TimeseriesData[]; // Toss and turn
  };
  incomplete: boolean;
}

export interface EightSleepStage {
  stage: 'awake' | 'light' | 'deep' | 'rem' | 'out';
  duration: number; // seconds
}

export interface TimeseriesData {
  time: string;
  value: number;
}

export interface EightSleepIntervalsResponse {
  intervals: EightSleepInterval[];
}

// =============================================
// SERVICE TYPES
// =============================================

export interface ConnectRequest {
  email: string;
  password: string;
  sync_time?: string;
  sync_timezone?: string;
}

export interface ConnectResponse {
  success: boolean;
  integration_id: string;
  eight_sleep_user_id: string;
  device_id?: string;
  side?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  sessions_synced: number;
  latest_date?: string;
  error?: string;
}

export interface IntegrationStatus {
  connected: boolean;
  integration_id?: string;
  last_sync_at?: string;
  last_sync_status?: string;
  sync_enabled: boolean;
  sync_time?: string;
  sync_timezone?: string;
  consecutive_failures: number;
  error_message?: string;
}

export interface SleepAnalysisSummary {
  total_nights: number;
  avg_sleep_score: number;
  avg_deep_sleep_pct: number;
  avg_rem_sleep_pct: number;
  avg_hrv: number;
  avg_time_slept_hours: number;
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

export interface UpdateSyncSettingsRequest {
  sync_enabled?: boolean;
  sync_time?: string;
  sync_timezone?: string;
}

// =============================================
// TIMEZONE HELPERS
// =============================================

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
  'Australia/Melbourne',
] as const;

export type CommonTimezone = typeof COMMON_TIMEZONES[number];
