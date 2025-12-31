/**
 * Twilio Service for Singularity Mobile
 * Handles Twilio credentials and SMS reminder settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface TwilioConfig {
  fromNumber: string;
  isActive: boolean;
  hasCredentials: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ReminderSettings {
  enabled: boolean;
  phoneNumber: string | null;
  segmentTimes: Record<string, string>;
  enabledSegments: string[];
}

interface SegmentConfig {
  segment: string;
  label: string;
  defaultTime: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

export const twilioService = {
  /**
   * Get Twilio configuration
   */
  async getConfig(): Promise<TwilioConfig | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/config`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting Twilio config:', error);
      return null;
    }
  },

  /**
   * Save Twilio configuration
   */
  async saveConfig(config: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/config`, {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Error saving Twilio config:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Test Twilio connection
   */
  async testConnection(credentials?: {
    accountSid: string;
    authToken: string;
  }): Promise<{ success: boolean; accountInfo?: any; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify(credentials || {})
      });

      const data = await response.json();
      return {
        success: data.success,
        accountInfo: data.accountInfo,
        error: data.error
      };
    } catch (error) {
      console.error('Error testing Twilio connection:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Delete Twilio configuration
   */
  async deleteConfig(): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/config`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Error deleting Twilio config:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Get SMS reminder settings
   */
  async getReminderSettings(): Promise<{
    settings: ReminderSettings;
    segments: SegmentConfig[];
  } | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/reminders`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      if (data.success) {
        return {
          settings: data.data,
          segments: data.segments
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting reminder settings:', error);
      return null;
    }
  },

  /**
   * Save SMS reminder settings
   */
  async saveReminderSettings(settings: Partial<ReminderSettings>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/reminders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Send test reminder
   */
  async sendTestReminder(): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/reminders/test`, {
        method: 'POST',
        headers
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Error sending test reminder:', error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Send segment reminder (for testing specific segments)
   */
  async sendSegmentReminder(segment: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/v1/twilio/reminders/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ segment })
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Error sending segment reminder:', error);
      return { success: false, error: (error as Error).message };
    }
  }
};

export default twilioService;
