/**
 * Inbucket API Helper
 *
 * Inbucket is the local email testing server that Supabase uses.
 * It captures all emails sent during local development.
 *
 * API docs: https://github.com/inbucket/inbucket/wiki/REST-API
 */

const INBUCKET_URL = process.env.INBUCKET_URL || 'http://localhost:54324';

interface InbucketMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
}

interface InbucketMessageBody {
  text: string;
  html: string;
}

interface InbucketFullMessage extends InbucketMessage {
  body: InbucketMessageBody;
}

/**
 * Get all emails for a given mailbox (email address)
 * Inbucket uses the local part of the email (before @) as the mailbox name
 */
export async function getMailbox(email: string): Promise<InbucketMessage[]> {
  const mailbox = email.split('@')[0];
  const response = await fetch(`${INBUCKET_URL}/api/v1/mailbox/${mailbox}`);

  if (!response.ok) {
    throw new Error(`Failed to get mailbox: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a specific email by ID
 */
export async function getMessage(email: string, messageId: string): Promise<InbucketFullMessage> {
  const mailbox = email.split('@')[0];
  const response = await fetch(`${INBUCKET_URL}/api/v1/mailbox/${mailbox}/${messageId}`);

  if (!response.ok) {
    throw new Error(`Failed to get message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete all emails in a mailbox
 */
export async function clearMailbox(email: string): Promise<void> {
  const mailbox = email.split('@')[0];
  const response = await fetch(`${INBUCKET_URL}/api/v1/mailbox/${mailbox}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to clear mailbox: ${response.statusText}`);
  }
}

/**
 * Wait for an email to arrive in the mailbox
 * Polls every 500ms until the email arrives or timeout is reached
 */
export async function waitForEmail(
  email: string,
  options: {
    subject?: string | RegExp;
    timeout?: number;
    pollInterval?: number;
  } = {}
): Promise<InbucketFullMessage> {
  const { subject, timeout = 30000, pollInterval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const messages = await getMailbox(email);

    for (const msg of messages) {
      const matchesSubject = !subject ||
        (typeof subject === 'string' ? msg.subject.includes(subject) : subject.test(msg.subject));

      if (matchesSubject) {
        return getMessage(email, msg.id);
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for email to ${email}${subject ? ` with subject matching "${subject}"` : ''}`);
}

/**
 * Extract confirmation link from Supabase email
 * Works with both confirmation and magic link emails
 */
export function extractConfirmationLink(message: InbucketFullMessage): string | null {
  const html = message.body.html;
  const text = message.body.text;

  // Try to find link in HTML first
  const htmlMatch = html.match(/href="([^"]*(?:confirm|verify|token)[^"]*)"/i);
  if (htmlMatch) {
    return htmlMatch[1];
  }

  // Fall back to text content
  const textMatch = text.match(/(https?:\/\/[^\s]+(?:confirm|verify|token)[^\s]*)/i);
  if (textMatch) {
    return textMatch[1];
  }

  // Generic URL pattern for Supabase auth
  const genericMatch = html.match(/href="(https?:\/\/[^"]*\/auth\/v1\/[^"]*)"/i) ||
    text.match(/(https?:\/\/[^\s]*\/auth\/v1\/[^\s]*)/i);

  return genericMatch ? genericMatch[1] : null;
}

/**
 * Get the latest email for a mailbox
 */
export async function getLatestEmail(email: string): Promise<InbucketFullMessage | null> {
  const messages = await getMailbox(email);

  if (messages.length === 0) {
    return null;
  }

  // Sort by date descending and get the first one
  const sorted = messages.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return getMessage(email, sorted[0].id);
}
