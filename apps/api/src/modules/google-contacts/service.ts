/**
 * Google Contacts Service
 * Syncs and caches Google Contacts via People API
 * Reuses existing Google OAuth tokens from google_calendar_oauth_tokens
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../../config/supabase';
import { decryptFromStorage, encryptForStorage } from '../../utils/encryption';

export const GOOGLE_CONTACTS_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class GoogleContactsService {
  private async getOAuthConfig(userId: string): Promise<GoogleOAuthConfig> {
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

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      `${process.env.FRONTEND_URL}/oauth/google-calendar/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    return { clientId, clientSecret, redirectUri };
  }

  private async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const config = await this.getOAuthConfig(userId);
    const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);

    // Reuse tokens from google_calendar_oauth_tokens
    const { data: tokenRecord, error } = await supabase
      .from('google_calendar_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !tokenRecord) {
      throw new Error('Google account not connected. Please connect via Google Calendar settings first.');
    }

    const accessToken = decryptFromStorage(tokenRecord.access_token_encrypted);
    const refreshToken = tokenRecord.refresh_token_encrypted
      ? decryptFromStorage(tokenRecord.refresh_token_encrypted)
      : undefined;

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenRecord.token_type,
      expiry_date: tokenRecord.expires_at ? new Date(tokenRecord.expires_at).getTime() : undefined,
    });

    // Handle token refresh
    oauth2Client.on('tokens', async (newTokens) => {
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

    return oauth2Client;
  }

  /**
   * Check if contacts scope is authorized
   */
  async hasContactsScope(userId: string): Promise<boolean> {
    try {
      const { data: tokenRecord } = await supabase
        .from('google_calendar_oauth_tokens')
        .select('scope')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!tokenRecord?.scope) return false;
      return tokenRecord.scope.includes('contacts.readonly');
    } catch {
      return false;
    }
  }

  /**
   * Sync contacts from Google People API to cache
   */
  async syncContacts(userId: string): Promise<{ synced: number }> {
    const oauth2Client = await this.getAuthenticatedClient(userId);
    const people = google.people({ version: 'v1', auth: oauth2Client });

    let nextPageToken: string | undefined;
    let totalSynced = 0;

    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        personFields: 'names,phoneNumbers,emailAddresses,photos',
        pageToken: nextPageToken,
      });

      const connections = response.data.connections || [];

      for (const person of connections) {
        const resourceName = person.resourceName;
        if (!resourceName) continue;

        const displayName = person.names?.[0]?.displayName || '';
        const phoneNumbers = (person.phoneNumbers || []).map(p => ({
          value: p.value || '',
          type: p.type || '',
        }));
        const emailAddresses = (person.emailAddresses || []).map(e => ({
          value: e.value || '',
          type: e.type || '',
        }));
        const photoUrl = person.photos?.[0]?.url || null;

        await supabase
          .from('google_contacts_cache')
          .upsert({
            user_id: userId,
            google_resource_name: resourceName,
            display_name: displayName,
            phone_numbers: phoneNumbers,
            email_addresses: emailAddresses,
            photo_url: photoUrl,
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,google_resource_name',
          });

        totalSynced++;
      }

      nextPageToken = response.data.nextPageToken || undefined;
    } while (nextPageToken);

    return { synced: totalSynced };
  }

  /**
   * Get cached contacts with optional search
   */
  async getContacts(userId: string, search?: string): Promise<any[]> {
    let query = supabase
      .from('google_contacts_cache')
      .select('*')
      .eq('user_id', userId)
      .order('display_name', { ascending: true });

    if (search) {
      query = query.ilike('display_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }

    return data || [];
  }
}

export const googleContactsService = new GoogleContactsService();
