/**
 * TypeScript types for Google Calendar integration
 */

export interface GoogleCalendarOAuthToken {
  id: string;
  user_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted?: string;
  token_type: string;
  expires_at: Date | null;
  scopes: string[];
  google_email: string | null;
  google_account_id: string | null;
  is_active: boolean;
  is_syncing: boolean;
  last_sync_at: Date | null;
  sync_error_message: string | null;
  sync_error_count: number;
  primary_calendar_id: string | null;
  sync_enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface GoogleOAuthCredentials {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_at?: number;
  scope?: string;
}

export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  google_email?: string;
  is_syncing?: boolean;
  last_sync_at?: Date | null;
  sync_enabled?: boolean;
  sync_error?: string | null;
  scopes?: string[];
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  created?: string;
  updated?: string;
  organizer?: {
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  htmlLink?: string;
  recurringEventId?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
  timeZone?: string;
}

export interface GoogleCalendarSettings {
  sync_enabled?: boolean;
  primary_calendar_id?: string;
}

// OAuth scopes for Google Calendar
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];

// Full access scopes (if needed for write operations)
export const GOOGLE_CALENDAR_FULL_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];
