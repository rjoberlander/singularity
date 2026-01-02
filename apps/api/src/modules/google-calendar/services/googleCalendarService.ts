/**
 * Google Calendar Service
 * Handles OAuth flow and Calendar API interactions
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../../../config/supabase';
import { encryptForStorage, decryptFromStorage } from '../../../utils/encryption';
import {
  GoogleCalendarOAuthToken,
  GoogleOAuthCredentials,
  GoogleCalendarConnectionStatus,
  GoogleCalendarEvent,
  CalendarListEntry,
  GOOGLE_CALENDAR_SCOPES,
} from '../types';

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class GoogleCalendarService {
  /**
   * Get OAuth config for a user (from DB or env vars as fallback)
   */
  private async getOAuthConfig(userId: string): Promise<GoogleOAuthConfig> {
    // Try to get user-specific config from database
    const { data: config } = await supabase
      .from('google_oauth_config')
      .select('*')
      .eq('user_id', userId)
      .eq('is_configured', true)
      .single();

    if (config) {
      const clientId = decryptFromStorage(config.client_id_encrypted);
      const clientSecret = decryptFromStorage(config.client_secret_encrypted);
      const redirectUri = config.redirect_uri ||
        `${process.env.FRONTEND_URL}/oauth/google-calendar/callback`;
      return { clientId, clientSecret, redirectUri };
    }

    // Fallback to environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      `${process.env.FRONTEND_URL}/oauth/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured. Please add your Google Client ID and Secret in Settings.');
    }

    return { clientId, clientSecret, redirectUri };
  }

  private async getOAuth2Client(userId: string): Promise<OAuth2Client> {
    const config = await this.getOAuthConfig(userId);
    return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  }

  /**
   * Save OAuth config for a user
   */
  async saveOAuthConfig(
    userId: string,
    clientId: string,
    clientSecret: string,
    redirectUri?: string
  ): Promise<void> {
    const encryptedClientId = encryptForStorage(clientId);
    const encryptedClientSecret = encryptForStorage(clientSecret);

    const { error } = await supabase
      .from('google_oauth_config')
      .upsert({
        user_id: userId,
        client_id_encrypted: encryptedClientId,
        client_secret_encrypted: encryptedClientSecret,
        redirect_uri: redirectUri || `${process.env.FRONTEND_URL}/oauth/google-calendar/callback`,
        is_configured: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving OAuth config:', error);
      throw new Error('Failed to save Google OAuth configuration');
    }
  }

  /**
   * Get OAuth config status (whether configured, masked client ID)
   */
  async getOAuthConfigStatus(userId: string): Promise<{
    configured: boolean;
    clientIdPreview?: string;
    redirectUri?: string;
  }> {
    const { data: config } = await supabase
      .from('google_oauth_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (config && config.is_configured) {
      const clientId = decryptFromStorage(config.client_id_encrypted);
      return {
        configured: true,
        clientIdPreview: clientId.substring(0, 20) + '...',
        redirectUri: config.redirect_uri,
      };
    }

    // Check env vars
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        configured: true,
        clientIdPreview: process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '... (from server)',
        redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
          `${process.env.FRONTEND_URL}/oauth/google-calendar/callback`,
      };
    }

    return { configured: false };
  }

  /**
   * Delete OAuth config for a user
   */
  async deleteOAuthConfig(userId: string): Promise<void> {
    await supabase
      .from('google_oauth_config')
      .delete()
      .eq('user_id', userId);
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateAuthUrl(userId: string, state?: string): Promise<string> {
    const oauth2Client = await this.getOAuth2Client(userId);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_CALENDAR_SCOPES,
      prompt: 'consent', // Force consent to get refresh token
      state: state || undefined,
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(userId: string, code: string): Promise<GoogleOAuthCredentials> {
    const oauth2Client = await this.getOAuth2Client(userId);

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token from Google');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      token_type: tokens.token_type || 'Bearer',
      expires_at: tokens.expiry_date || undefined,
      scope: tokens.scope || undefined,
    };
  }

  /**
   * Get authenticated Calendar client for a user
   */
  private async getAuthenticatedClient(userId: string): Promise<{
    oauth2Client: OAuth2Client;
    calendar: calendar_v3.Calendar;
    tokenRecord: GoogleCalendarOAuthToken;
  }> {
    // Fetch user's tokens
    const { data: tokenRecord, error } = await supabase
      .from('google_calendar_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !tokenRecord) {
      throw new Error('Google Calendar not connected. Please connect your account first.');
    }

    // Decrypt tokens
    const accessToken = decryptFromStorage(tokenRecord.access_token_encrypted);
    const refreshToken = tokenRecord.refresh_token_encrypted
      ? decryptFromStorage(tokenRecord.refresh_token_encrypted)
      : undefined;

    // Create OAuth client with tokens
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenRecord.token_type,
      expiry_date: tokenRecord.expires_at ? new Date(tokenRecord.expires_at).getTime() : undefined,
    });

    // Set up token refresh handler
    oauth2Client.on('tokens', async (newTokens) => {
      console.log('🔄 Google Calendar tokens refreshed for user:', userId);

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (newTokens.access_token) {
        updates.access_token_encrypted = encryptForStorage(newTokens.access_token);
      }
      if (newTokens.refresh_token) {
        updates.refresh_token_encrypted = encryptForStorage(newTokens.refresh_token);
      }
      if (newTokens.expiry_date) {
        updates.expires_at = new Date(newTokens.expiry_date).toISOString();
      }

      await supabase
        .from('google_calendar_oauth_tokens')
        .update(updates)
        .eq('id', tokenRecord.id);
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    return { oauth2Client, calendar, tokenRecord };
  }

  /**
   * Get Google user info (email)
   */
  async getUserInfo(userId: string, accessToken: string): Promise<{ email: string; id: string }> {
    const oauth2Client = await this.getOAuth2Client(userId);
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email || !data.id) {
      throw new Error('Failed to get user info from Google');
    }

    return { email: data.email, id: data.id };
  }

  /**
   * Connect Google Calendar account
   */
  async connect(
    userId: string,
    credentials: GoogleOAuthCredentials
  ): Promise<{ success: boolean; google_email: string }> {
    // Get user info
    const userInfo = await this.getUserInfo(userId, credentials.access_token);

    // Deactivate any existing connections for this user
    await supabase
      .from('google_calendar_oauth_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Encrypt tokens
    const encryptedAccessToken = encryptForStorage(credentials.access_token);
    const encryptedRefreshToken = credentials.refresh_token
      ? encryptForStorage(credentials.refresh_token)
      : null;

    // Store new connection
    const { error } = await supabase
      .from('google_calendar_oauth_tokens')
      .insert({
        user_id: userId,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_type: credentials.token_type || 'Bearer',
        expires_at: credentials.expires_at
          ? new Date(credentials.expires_at).toISOString()
          : null,
        scopes: credentials.scope ? credentials.scope.split(' ') : GOOGLE_CALENDAR_SCOPES,
        google_email: userInfo.email,
        google_account_id: userInfo.id,
        is_active: true,
        sync_enabled: true,
      });

    if (error) {
      console.error('Error storing Google Calendar tokens:', error);
      throw new Error('Failed to save Google Calendar connection');
    }

    console.log(`📅 Google Calendar connected for user ${userId}: ${userInfo.email}`);

    return { success: true, google_email: userInfo.email };
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string): Promise<void> {
    // Get current token to revoke
    const { data: tokenRecord } = await supabase
      .from('google_calendar_oauth_tokens')
      .select('access_token_encrypted')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (tokenRecord) {
      try {
        // Try to revoke the token at Google
        const accessToken = decryptFromStorage(tokenRecord.access_token_encrypted);
        const oauth2Client = await this.getOAuth2Client(userId);
        await oauth2Client.revokeToken(accessToken);
      } catch (error) {
        // Token revocation failed, continue with local cleanup
        console.warn('Failed to revoke Google token:', error);
      }
    }

    // Delete all tokens for user
    const { error } = await supabase
      .from('google_calendar_oauth_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting Google Calendar:', error);
      throw new Error('Failed to disconnect Google Calendar');
    }

    console.log(`📅 Google Calendar disconnected for user ${userId}`);
  }

  /**
   * Get connection status
   */
  async getStatus(userId: string): Promise<GoogleCalendarConnectionStatus> {
    const { data: tokenRecord, error } = await supabase
      .from('google_calendar_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !tokenRecord) {
      return { connected: false };
    }

    return {
      connected: true,
      google_email: tokenRecord.google_email,
      is_syncing: tokenRecord.is_syncing,
      last_sync_at: tokenRecord.last_sync_at,
      sync_enabled: tokenRecord.sync_enabled,
      sync_error: tokenRecord.sync_error_message,
      scopes: tokenRecord.scopes,
    };
  }

  /**
   * Test the connection by fetching calendar list
   */
  async testConnection(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { calendar } = await this.getAuthenticatedClient(userId);

      // Try to list calendars
      await calendar.calendarList.list({ maxResults: 1 });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update error status
      await supabase
        .from('google_calendar_oauth_tokens')
        .update({
          sync_error_message: errorMessage,
          sync_error_count: supabase.rpc('increment', { x: 1 }) as unknown as number,
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * List user's calendars
   */
  async listCalendars(userId: string): Promise<CalendarListEntry[]> {
    const { calendar } = await this.getAuthenticatedClient(userId);

    const response = await calendar.calendarList.list();
    const items = response.data.items || [];

    return items.map((item) => ({
      id: item.id || '',
      summary: item.summary || '',
      description: item.description,
      primary: item.primary,
      backgroundColor: item.backgroundColor,
      foregroundColor: item.foregroundColor,
      accessRole: item.accessRole,
      timeZone: item.timeZone,
    }));
  }

  /**
   * Get calendar events
   */
  async getEvents(
    userId: string,
    options: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
    } = {}
  ): Promise<GoogleCalendarEvent[]> {
    const { calendar, tokenRecord } = await this.getAuthenticatedClient(userId);

    const calendarId = options.calendarId || tokenRecord.primary_calendar_id || 'primary';

    const response = await calendar.events.list({
      calendarId,
      timeMin: options.timeMin || new Date().toISOString(),
      timeMax: options.timeMax,
      maxResults: options.maxResults || 100,
      singleEvents: options.singleEvents !== false,
      orderBy: options.orderBy || 'startTime',
    });

    const items = response.data.items || [];

    return items.map((event) => ({
      id: event.id || '',
      summary: event.summary || '',
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start?.dateTime,
        date: event.start?.date,
        timeZone: event.start?.timeZone,
      },
      end: {
        dateTime: event.end?.dateTime,
        date: event.end?.date,
        timeZone: event.end?.timeZone,
      },
      status: event.status,
      created: event.created,
      updated: event.updated,
      organizer: event.organizer
        ? {
            email: event.organizer.email,
            displayName: event.organizer.displayName,
            self: event.organizer.self,
          }
        : undefined,
      attendees: event.attendees?.map((a) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
        self: a.self,
      })),
      htmlLink: event.htmlLink,
      recurringEventId: event.recurringEventId,
    }));
  }

  /**
   * Get today's events
   */
  async getTodayEvents(userId: string): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    return this.getEvents(userId, {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
    });
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(userId: string, days = 7): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.getEvents(userId, {
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      maxResults: 50,
    });
  }

  /**
   * Update settings
   */
  async updateSettings(
    userId: string,
    settings: { sync_enabled?: boolean; primary_calendar_id?: string }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (settings.sync_enabled !== undefined) {
      updates.sync_enabled = settings.sync_enabled;
    }
    if (settings.primary_calendar_id !== undefined) {
      updates.primary_calendar_id = settings.primary_calendar_id;
    }

    const { error } = await supabase
      .from('google_calendar_oauth_tokens')
      .update(updates)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error('Failed to update Google Calendar settings');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
