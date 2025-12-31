/**
 * SMS Reminder Service for Routine Segments
 *
 * Sends SMS reminders at the start of each day segment:
 * - Wake Up (configurable, default 6:00 AM)
 * - AM (configurable, default 9:00 AM)
 * - Lunch (configurable, default 12:00 PM)
 * - PM (configurable, default 3:00 PM)
 * - Dinner (configurable, default 6:00 PM)
 */

import { supabase } from '../../config/supabase';
import { TwilioService } from './twilioService';

export type DaySegment = 'wake_up' | 'am' | 'lunch' | 'pm' | 'dinner';

interface SegmentConfig {
  segment: DaySegment;
  label: string;
  defaultTime: string; // HH:MM format
}

export const DAY_SEGMENTS: SegmentConfig[] = [
  { segment: 'wake_up', label: 'Wake Up', defaultTime: '06:00' },
  { segment: 'am', label: 'Morning', defaultTime: '09:00' },
  { segment: 'lunch', label: 'Lunch', defaultTime: '12:00' },
  { segment: 'pm', label: 'Afternoon', defaultTime: '15:00' },
  { segment: 'dinner', label: 'Dinner', defaultTime: '18:00' }
];

interface ReminderSettings {
  userId: string;
  enabled: boolean;
  phoneNumber: string;
  segmentTimes: Record<DaySegment, string>;
  enabledSegments: DaySegment[];
}

interface RoutineItem {
  id: string;
  title: string;
  time?: string;
  segment?: DaySegment;
  linkedSupplement?: string;
}

export class SMSReminderService {
  /**
   * Get reminder settings for a user
   */
  static async getReminderSettings(userId: string): Promise<ReminderSettings | null> {
    const { data, error } = await supabase
      .from('sms_reminder_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      enabled: data.enabled,
      phoneNumber: data.phone_number,
      segmentTimes: data.segment_times || this.getDefaultSegmentTimes(),
      enabledSegments: data.enabled_segments || ['wake_up', 'am', 'lunch', 'pm', 'dinner']
    };
  }

  /**
   * Save reminder settings
   */
  static async saveReminderSettings(
    userId: string,
    settings: Partial<ReminderSettings>
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('sms_reminder_settings')
      .upsert({
        user_id: userId,
        enabled: settings.enabled ?? true,
        phone_number: settings.phoneNumber,
        segment_times: settings.segmentTimes || this.getDefaultSegmentTimes(),
        enabled_segments: settings.enabledSegments || ['wake_up', 'am', 'lunch', 'pm', 'dinner'],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get default segment times
   */
  static getDefaultSegmentTimes(): Record<DaySegment, string> {
    return DAY_SEGMENTS.reduce((acc, seg) => {
      acc[seg.segment] = seg.defaultTime;
      return acc;
    }, {} as Record<DaySegment, string>);
  }

  /**
   * Get routines for a specific segment
   */
  static async getRoutinesForSegment(userId: string, segment: DaySegment): Promise<RoutineItem[]> {
    // Get all routines with items for this user
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        items:routine_items(
          id,
          title,
          time,
          segment,
          supplement_id,
          supplements(name)
        )
      `)
      .eq('user_id', userId);

    if (error || !data) {
      return [];
    }

    // Filter items by segment
    const items: RoutineItem[] = [];
    for (const routine of data) {
      if (routine.items) {
        for (const item of routine.items as any[]) {
          if (item.segment === segment) {
            items.push({
              id: item.id,
              title: item.title,
              time: item.time,
              segment: item.segment,
              linkedSupplement: item.supplements?.name
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Format segment activities for SMS
   */
  static formatSegmentMessage(segment: DaySegment, items: RoutineItem[]): string {
    const segmentConfig = DAY_SEGMENTS.find(s => s.segment === segment);
    const segmentLabel = segmentConfig?.label || segment;

    if (items.length === 0) {
      return `${segmentLabel} - No activities scheduled.`;
    }

    let message = `${segmentLabel} Activities:\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. ${item.title}`;
      if (item.time) {
        message += ` (${item.time})`;
      }
      if (item.linkedSupplement) {
        message += ` - ${item.linkedSupplement}`;
      }
      message += '\n';
    });

    return message.trim();
  }

  /**
   * Send segment reminder to a user
   */
  static async sendSegmentReminder(
    userId: string,
    segment: DaySegment
  ): Promise<{ success: boolean; error?: string }> {
    // Get reminder settings
    const settings = await this.getReminderSettings(userId);

    if (!settings || !settings.enabled) {
      return { success: false, error: 'Reminders not enabled' };
    }

    if (!settings.enabledSegments.includes(segment)) {
      return { success: false, error: 'Segment not enabled for reminders' };
    }

    if (!settings.phoneNumber) {
      return { success: false, error: 'No phone number configured' };
    }

    // Get activities for this segment
    const items = await this.getRoutinesForSegment(userId, segment);

    // Format message
    const message = this.formatSegmentMessage(segment, items);

    // Send SMS
    const result = await TwilioService.sendSMS(userId, settings.phoneNumber, message);

    // Log the reminder
    await supabase
      .from('sms_reminder_log')
      .insert({
        user_id: userId,
        segment,
        message,
        sent_at: new Date().toISOString(),
        success: result.success,
        error: result.error,
        message_id: result.messageId
      });

    return result;
  }

  /**
   * Get all users who need reminders for a specific segment at current time
   */
  static async getUsersForSegmentReminder(segment: DaySegment): Promise<string[]> {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('sms_reminder_settings')
      .select('user_id, segment_times')
      .eq('enabled', true)
      .contains('enabled_segments', [segment]);

    if (error || !data) {
      return [];
    }

    // Filter users whose segment time matches current time (within 1 minute window)
    return data
      .filter(setting => {
        const segmentTime = setting.segment_times?.[segment];
        return segmentTime === currentTime;
      })
      .map(setting => setting.user_id);
  }

  /**
   * Process all segment reminders (called by cron job)
   */
  static async processSegmentReminders(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    for (const segmentConfig of DAY_SEGMENTS) {
      const userIds = await this.getUsersForSegmentReminder(segmentConfig.segment);

      for (const userId of userIds) {
        const result = await this.sendSegmentReminder(userId, segmentConfig.segment);
        if (result.success) {
          processed++;
        } else {
          errors++;
        }
      }
    }

    return { processed, errors };
  }

  /**
   * Send a test reminder
   */
  static async sendTestReminder(userId: string): Promise<{ success: boolean; error?: string }> {
    const settings = await this.getReminderSettings(userId);

    if (!settings?.phoneNumber) {
      return { success: false, error: 'No phone number configured' };
    }

    const testMessage = `This is a test reminder from Singularity. Your SMS reminders are working correctly!`;

    return await TwilioService.sendSMS(userId, settings.phoneNumber, testMessage);
  }
}

export default SMSReminderService;
