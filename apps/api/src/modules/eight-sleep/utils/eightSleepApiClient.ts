/**
 * Eight Sleep API Client
 *
 * Handles raw API calls to Eight Sleep's unofficial API.
 * Based on pyEight reference implementation.
 *
 * API Endpoints:
 * - Auth: https://client-api.8slp.net/v1
 * - Client: https://client-api.8slp.net/v1
 */

import {
  EightSleepLoginRequest,
  EightSleepLoginResponse,
  EightSleepIntervalsResponse,
  EightSleepDevice,
  EightSleepUser,
} from '../types';

const BASE_URL = 'https://client-api.8slp.net/v1';

// Rate limiting constants
const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Sleep between requests to respect rate limits
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an API request with retry logic
 */
async function makeRequest<T>(
  url: string,
  options: RequestInit,
  retries = 0
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retries] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.warn(`Rate limited by Eight Sleep API, retrying in ${delay}ms...`);
        await sleep(delay);
        return makeRequest<T>(url, options, retries + 1);
      }
      return {
        success: false,
        error: 'Rate limited by Eight Sleep API. Please try again later.',
        statusCode: 429,
      };
    }

    // Handle auth errors
    if (response.status === 401) {
      return {
        success: false,
        error: 'Invalid credentials or session expired',
        statusCode: 401,
      };
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `API error: ${response.status} - ${errorBody}`,
        statusCode: response.status,
      };
    }

    const data = await response.json() as T;
    return {
      success: true,
      data,
      statusCode: response.status,
    };
  } catch (error) {
    // Network errors - retry
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retries] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.warn(`Network error, retrying in ${delay}ms...`, error);
      await sleep(delay);
      return makeRequest<T>(url, options, retries + 1);
    }

    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Login to Eight Sleep and get session token
 */
export async function login(
  credentials: EightSleepLoginRequest
): Promise<ApiResponse<EightSleepLoginResponse>> {
  const result = await makeRequest<EightSleepLoginResponse>(
    `${BASE_URL}/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Protocol-App/1.0',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    }
  );

  return result;
}

/**
 * Get user profile information
 */
export async function getUser(
  userId: string,
  sessionToken: string
): Promise<ApiResponse<EightSleepUser>> {
  await sleep(RATE_LIMIT_DELAY_MS);

  return makeRequest<EightSleepUser>(`${BASE_URL}/users/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Protocol-App/1.0',
      'session-token': sessionToken,
      'user-id': userId,
    },
  });
}

/**
 * Get user's devices
 */
export async function getDevices(
  userId: string,
  sessionToken: string
): Promise<ApiResponse<{ devices: EightSleepDevice[] }>> {
  await sleep(RATE_LIMIT_DELAY_MS);

  return makeRequest<{ devices: EightSleepDevice[] }>(
    `${BASE_URL}/users/${userId}/devices`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Protocol-App/1.0',
        'session-token': sessionToken,
        'user-id': userId,
      },
    }
  );
}

/**
 * Get sleep intervals (main sleep data)
 *
 * @param userId - Eight Sleep user ID
 * @param sessionToken - Session token from login
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 */
export async function getIntervals(
  userId: string,
  sessionToken: string,
  fromDate: string,
  toDate: string
): Promise<ApiResponse<EightSleepIntervalsResponse>> {
  await sleep(RATE_LIMIT_DELAY_MS);

  const url = new URL(`${BASE_URL}/users/${userId}/intervals`);
  url.searchParams.set('from', fromDate);
  url.searchParams.set('to', toDate);

  return makeRequest<EightSleepIntervalsResponse>(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Protocol-App/1.0',
      'session-token': sessionToken,
      'user-id': userId,
    },
  });
}

/**
 * Test connection with stored credentials
 */
export async function testConnection(
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const loginResult = await login({ email, password });

  if (!loginResult.success || !loginResult.data) {
    return {
      success: false,
      error: loginResult.error || 'Failed to authenticate with Eight Sleep',
    };
  }

  return {
    success: true,
    userId: loginResult.data.session.userId,
  };
}

/**
 * Determine which side of the bed the user is on
 */
export function determineBedSide(
  devices: EightSleepDevice[],
  userId: string
): 'left' | 'right' | 'solo' | null {
  if (!devices || devices.length === 0) {
    return null;
  }

  const device = devices[0]; // Assume first device

  if (device.leftUserId === userId && device.rightUserId === userId) {
    return 'solo';
  }

  if (device.leftUserId === userId) {
    return 'left';
  }

  if (device.rightUserId === userId) {
    return 'right';
  }

  // Fallback - check owner
  if (device.ownerId === userId) {
    return 'solo';
  }

  return null;
}

/**
 * Parse Eight Sleep interval into our format
 */
export function parseInterval(interval: any): {
  date: string;
  sleep_score: number | null;
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
  min_breathing_rate: number | null;
  max_breathing_rate: number | null;
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
  avg_room_humidity: number | null;
  sleep_start_time: string | null;
  sleep_end_time: string | null;
  toss_and_turn_count: number | null;
} {
  // Extract date from timestamp
  const startTime = new Date(interval.ts);
  const date = startTime.toISOString().split('T')[0];

  // Parse sleep stages
  let lightSleep = 0;
  let deepSleep = 0;
  let remSleep = 0;
  let awake = 0;
  const wakeEventTimes: string[] = [];

  if (interval.stages) {
    let currentTime = new Date(interval.ts);

    for (const stage of interval.stages) {
      const durationMinutes = Math.round(stage.duration / 60);

      switch (stage.stage) {
        case 'light':
          lightSleep += durationMinutes;
          break;
        case 'deep':
          deepSleep += durationMinutes;
          break;
        case 'rem':
          remSleep += durationMinutes;
          break;
        case 'awake':
          awake += durationMinutes;
          wakeEventTimes.push(currentTime.toISOString());
          break;
      }

      currentTime = new Date(currentTime.getTime() + stage.duration * 1000);
    }
  }

  const totalSleep = lightSleep + deepSleep + remSleep;
  const totalTime = totalSleep + awake;

  // Calculate end time
  let sleepEndTime: string | null = null;
  if (interval.stages && interval.stages.length > 0) {
    const totalSeconds = interval.stages.reduce((sum: number, s: any) => sum + s.duration, 0);
    sleepEndTime = new Date(startTime.getTime() + totalSeconds * 1000).toISOString();
  }

  // Detect 2-4am wakes
  let wokeBetween2and4 = false;
  let wakeTimeBetween2and4: string | null = null;

  for (const wakeTime of wakeEventTimes) {
    const wake = new Date(wakeTime);
    const hours = wake.getHours();
    if (hours >= 2 && hours < 4) {
      wokeBetween2and4 = true;
      wakeTimeBetween2and4 = wake.toTimeString().slice(0, 8); // HH:MM:SS
      break;
    }
  }

  // Parse timeseries data for vitals
  const heartRates = interval.timeseries?.heartRate || [];
  const hrvValues = interval.timeseries?.hrv || [];
  const breathingRates = interval.timeseries?.respiratoryRate || [];
  const bedTemps = interval.timeseries?.bedTemperature || [];
  const roomTemps = interval.timeseries?.roomTemperature || [];
  const tntValues = interval.timeseries?.tnt || [];

  // Helper to calculate stats from timeseries
  const calcStats = (data: { value: number }[]): { avg: number | null; min: number | null; max: number | null } => {
    if (!data || data.length === 0) {
      return { avg: null, min: null, max: null };
    }
    const values = data.map((d) => d.value).filter((v) => v != null && !isNaN(v));
    if (values.length === 0) {
      return { avg: null, min: null, max: null };
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round((sum / values.length) * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };

  const hrStats = calcStats(heartRates);
  const hrvStats = calcStats(hrvValues);
  const brStats = calcStats(breathingRates);
  const bedTempStats = calcStats(bedTemps);
  const roomTempStats = calcStats(roomTemps);

  // Toss and turn count
  const tossAndTurnCount = tntValues.length > 0
    ? tntValues.reduce((sum: number, t: { value: number }) => sum + (t.value || 0), 0)
    : null;

  return {
    date,
    sleep_score: interval.score ?? null,
    time_slept: totalSleep,
    time_to_fall_asleep: null, // Would need specific logic to calculate
    time_in_bed: totalTime,
    wake_events: wakeEventTimes.length,
    wake_event_times: wakeEventTimes,
    woke_between_2_and_4_am: wokeBetween2and4,
    wake_time_between_2_and_4_am: wakeTimeBetween2and4,
    avg_heart_rate: hrStats.avg,
    min_heart_rate: hrStats.min,
    max_heart_rate: hrStats.max,
    avg_hrv: hrvStats.avg,
    min_hrv: hrvStats.min,
    max_hrv: hrvStats.max,
    avg_breathing_rate: brStats.avg,
    min_breathing_rate: brStats.min,
    max_breathing_rate: brStats.max,
    light_sleep_minutes: lightSleep,
    deep_sleep_minutes: deepSleep,
    rem_sleep_minutes: remSleep,
    awake_minutes: awake,
    light_sleep_pct: totalTime > 0 ? Math.round((lightSleep / totalTime) * 100 * 10) / 10 : null,
    deep_sleep_pct: totalTime > 0 ? Math.round((deepSleep / totalTime) * 100 * 10) / 10 : null,
    rem_sleep_pct: totalTime > 0 ? Math.round((remSleep / totalTime) * 100 * 10) / 10 : null,
    awake_pct: totalTime > 0 ? Math.round((awake / totalTime) * 100 * 10) / 10 : null,
    avg_bed_temp: bedTempStats.avg,
    avg_room_temp: roomTempStats.avg,
    avg_room_humidity: null, // Not always available
    sleep_start_time: interval.ts,
    sleep_end_time: sleepEndTime,
    toss_and_turn_count: tossAndTurnCount,
  };
}

export default {
  login,
  getUser,
  getDevices,
  getIntervals,
  testConnection,
  determineBedSide,
  parseInterval,
};
