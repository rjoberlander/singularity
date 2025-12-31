/**
 * Twilio SMS Service for Singularity
 * Handles SMS sending and credential management
 */

import { supabase } from '../../config/supabase';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface EncryptedData {
  iv: string;
  encrypted: string;
  authTag: string;
}

/**
 * Encrypt data for storage
 */
function encryptForStorage(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('base64'),
    encrypted: encrypted,
    authTag: authTag.toString('base64')
  });
}

/**
 * Decrypt data from storage
 */
function decryptFromStorage(encryptedJson: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  const data: EncryptedData = JSON.parse(encryptedJson);
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(data.iv, 'base64');
  const authTag = Buffer.from(data.authTag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export class TwilioService {
  /**
   * Get Twilio credentials for a user
   */
  static async getCredentials(userId: string): Promise<TwilioCredentials | null> {
    const { data, error } = await supabase
      .from('twilio_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    try {
      const accountSid = decryptFromStorage(data.account_sid_encrypted);
      const authToken = decryptFromStorage(data.auth_token_encrypted);

      return {
        accountSid,
        authToken,
        fromNumber: data.from_number
      };
    } catch (err) {
      console.error('Failed to decrypt Twilio credentials:', err);
      return null;
    }
  }

  /**
   * Save Twilio credentials for a user
   */
  static async saveCredentials(
    userId: string,
    credentials: TwilioCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const encryptedSid = encryptForStorage(credentials.accountSid);
      const encryptedToken = encryptForStorage(credentials.authToken);

      // Upsert credentials
      const { error } = await supabase
        .from('twilio_credentials')
        .upsert({
          user_id: userId,
          account_sid_encrypted: encryptedSid,
          auth_token_encrypted: encryptedToken,
          from_number: credentials.fromNumber,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Test Twilio connection
   */
  static async testConnection(credentials: TwilioCredentials): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    try {
      // Dynamically import Twilio to avoid issues if not installed
      const { Twilio } = await import('twilio');
      const client = new Twilio(credentials.accountSid, credentials.authToken);

      const account = await client.api.accounts(credentials.accountSid).fetch();

      return {
        success: true,
        accountInfo: {
          friendlyName: account.friendlyName,
          status: account.status
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to Twilio'
      };
    }
  }

  /**
   * Send an SMS message
   */
  static async sendSMS(
    userId: string,
    toNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const credentials = await this.getCredentials(userId);

      if (!credentials) {
        return { success: false, error: 'Twilio credentials not configured' };
      }

      const { Twilio } = await import('twilio');
      const client = new Twilio(credentials.accountSid, credentials.authToken);

      const result = await client.messages.create({
        body: message,
        from: credentials.fromNumber,
        to: toNumber
      });

      return {
        success: true,
        messageId: result.sid
      };
    } catch (err: any) {
      console.error('Failed to send SMS:', err);
      return {
        success: false,
        error: err.message || 'Failed to send SMS'
      };
    }
  }

  /**
   * Get user's phone number for SMS reminders
   */
  static async getUserPhoneNumber(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('users')
      .select('phone_number')
      .eq('id', userId)
      .single();

    if (error || !data?.phone_number) {
      return null;
    }

    return data.phone_number;
  }

  /**
   * Delete Twilio credentials for a user
   */
  static async deleteCredentials(userId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('twilio_credentials')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get masked credentials for display
   */
  static async getMaskedCredentials(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('twilio_credentials')
      .select('from_number, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      fromNumber: data.from_number,
      isActive: data.is_active,
      hasCredentials: true,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export default TwilioService;
