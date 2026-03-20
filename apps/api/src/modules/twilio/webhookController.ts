/**
 * Twilio Inbound SMS Webhook Controller
 * Handles incoming SMS messages and maps them to broadcast comments
 */

import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

const TAG = '[TwilioWebhook]';
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * Normalize phone number to E.164 format for matching
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim();
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');
  if (!cleaned) return '';

  if (hasPlus) return '+' + cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return '+' + cleaned;
  if (cleaned.length === 10) return '+1' + cleaned;
  return '+' + cleaned;
}

function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b) && normalizePhone(a) !== '';
}

/**
 * POST /api/v1/webhooks/twilio/sms/incoming
 * Handle incoming SMS from Twilio
 */
export const handleIncomingSMS = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const from = payload.From;
    const to = payload.To;
    const body = payload.Body || '';
    const messageSid = payload.MessageSid;
    const numMedia = parseInt(payload.NumMedia || '0');

    console.log(TAG, 'Incoming SMS:', {
      from, to, messageSid,
      body: body.substring(0, 80),
      numMedia,
    });

    // Self-message prevention: skip if From matches our own number
    const { data: twilioConfig } = await supabase
      .from('twilio_credentials')
      .select('from_number, user_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (twilioConfig && phonesMatch(from, twilioConfig.from_number)) {
      console.log(TAG, 'Self-message detected, ignoring');
      return res.status(200).contentType('text/xml').send(EMPTY_TWIML);
    }

    // Collect media URLs if present
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      if (payload[`MediaUrl${i}`]) {
        mediaUrls.push(payload[`MediaUrl${i}`]);
      }
    }

    // Find broadcast recipient by phone number (most recent broadcast first)
    const normalizedFrom = normalizePhone(from);
    const { data: recipients } = await supabase
      .from('broadcast_recipients')
      .select('id, entry_id, user_id, contact_name, contact_phone, access_token')
      .not('contact_phone', 'is', null)
      .order('created_at', { ascending: false });

    // Match by normalized phone number
    const matchingRecipient = recipients?.find(r =>
      r.contact_phone && phonesMatch(r.contact_phone, normalizedFrom)
    );

    let broadcastEntryId: string | null = null;
    let broadcastRecipientId: string | null = null;
    let userId: string | null = twilioConfig?.user_id || null;

    if (matchingRecipient) {
      broadcastEntryId = matchingRecipient.entry_id;
      broadcastRecipientId = matchingRecipient.id;
      userId = matchingRecipient.user_id;

      console.log(TAG, `Matched to broadcast recipient: ${matchingRecipient.contact_name} (entry: ${broadcastEntryId})`);

      // Auto-create broadcast comment if there's text
      if (body.trim()) {
        const { data: comment, error: commentError } = await supabase
          .from('broadcast_comments')
          .insert({
            entry_id: broadcastEntryId,
            recipient_id: broadcastRecipientId,
            content: body.trim(),
          })
          .select('id')
          .single();

        if (commentError) {
          console.error(TAG, 'Failed to create broadcast comment:', commentError.message);
        } else {
          console.log(TAG, `Created broadcast comment: ${comment.id}`);
        }

        // Also mark as read if not already
        await supabase
          .from('broadcast_recipients')
          .update({
            first_read_at: new Date().toISOString(),
            last_read_at: new Date().toISOString(),
            read_count: 1,
          })
          .eq('id', broadcastRecipientId)
          .is('first_read_at', null);
      }
    } else {
      console.log(TAG, `No broadcast recipient found for ${normalizedFrom}`);
    }

    // Store inbound message for logging
    const { error: logError } = await supabase
      .from('inbound_sms_messages')
      .insert({
        user_id: userId,
        from_number: normalizedFrom,
        to_number: normalizePhone(to),
        body: body || null,
        message_sid: messageSid,
        num_media: numMedia,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        broadcast_entry_id: broadcastEntryId,
        broadcast_recipient_id: broadcastRecipientId,
        status: 'received',
      });

    if (logError) {
      console.error(TAG, 'Failed to log inbound SMS:', logError.message);
    }

    // ALWAYS return empty TwiML — never <Message> (causes infinite loops)
    res.status(200).contentType('text/xml').send(EMPTY_TWIML);
  } catch (error) {
    console.error(TAG, 'Error processing incoming SMS:', error);
    // Always return 200 to Twilio, even on errors
    res.status(200).contentType('text/xml').send(EMPTY_TWIML);
  }
};

/**
 * POST /api/v1/webhooks/twilio/sms/status
 * Handle Twilio delivery status callbacks
 */
export const handleStatusCallback = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const messageSid = payload.MessageSid;
    const messageStatus = payload.MessageStatus;

    console.log(TAG, 'Status callback:', {
      messageSid,
      status: messageStatus,
      errorCode: payload.ErrorCode,
    });

    // Update broadcast_recipients sms_status if this SID matches
    if (messageSid) {
      const smsStatusMap: Record<string, string> = {
        'queued': 'queued',
        'sending': 'sending',
        'sent': 'sent',
        'delivered': 'delivered',
        'undelivered': 'failed',
        'failed': 'failed',
        'read': 'read',
      };

      const status = smsStatusMap[messageStatus] || messageStatus;

      // Try to update broadcast recipient by sms_message_id
      await supabase
        .from('broadcast_recipients')
        .update({ sms_status: status })
        .eq('sms_message_id', messageSid);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error(TAG, 'Error processing status callback:', error);
    res.status(200).send('OK');
  }
};
