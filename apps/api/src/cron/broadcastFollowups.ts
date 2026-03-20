/**
 * Broadcast Follow-up SMS Cron Job
 *
 * Runs Mon-Fri at 10am PST (18:00 UTC) to send follow-up SMS
 * to recipients who haven't read their broadcast yet.
 * Max 3 follow-ups per recipient, within 14 days of broadcast creation.
 */

import cron from 'node-cron';
import { supabase } from '../config/supabase';
import { TwilioService } from '../modules/twilio/twilioService';

export function startBroadcastFollowupCron(): void {
  // 0 18 * * 1-5 = Mon-Fri at 18:00 UTC (10am PST)
  const cronExpression = '0 18 * * 1-5';

  console.log('Scheduling broadcast follow-up cron job (Mon-Fri 10am PST / 18:00 UTC)');

  cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Starting broadcast follow-up check...`);

    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Find recipients who:
      // - Haven't read the broadcast
      // - Have been sent an SMS
      // - Have fewer than 3 follow-ups
      // - Broadcast was created within 14 days
      const { data: recipients, error } = await supabase
        .from('broadcast_recipients')
        .select(`
          *,
          entry:journal_entries!inner(id, broadcast_message, user_id, created_at)
        `)
        .is('first_read_at', null)
        .not('sms_sent_at', 'is', null)
        .lt('followup_count', 3)
        .gte('entry.created_at', fourteenDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching follow-up recipients:', error);
        return;
      }

      if (!recipients || recipients.length === 0) {
        console.log('No follow-ups needed');
        return;
      }

      console.log(`Found ${recipients.length} recipients needing follow-up`);

      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
      let sentCount = 0;
      let failCount = 0;

      for (const r of recipients) {
        if (!r.contact_phone) continue;

        const entry = r.entry as any;
        const smsLink = `${FRONTEND_URL}/broadcast/${r.access_token}`;
        const smsBody = `Reminder: ${entry.broadcast_message}\n\n${smsLink}`;

        const result = await TwilioService.sendSMS(entry.user_id, r.contact_phone, smsBody);

        if (result.success) {
          await supabase
            .from('broadcast_recipients')
            .update({
              followup_count: r.followup_count + 1,
              last_followup_at: new Date().toISOString(),
            })
            .eq('id', r.id);

          sentCount++;
        } else {
          failCount++;
          console.error(`Follow-up SMS failed for ${r.contact_name}: ${result.error}`);
        }
      }

      console.log(`[${new Date().toISOString()}] Broadcast follow-up complete: ${sentCount} sent, ${failCount} failed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Broadcast follow-up cron error:`, error);
    }
  });

  console.log('Broadcast follow-up cron job scheduled successfully');
}
