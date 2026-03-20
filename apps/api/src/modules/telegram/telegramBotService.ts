/**
 * Telegram Bot Service for Singularity
 * Manual polling approach (raw fetch) — adapted from SlackKB
 *
 * Features:
 * - /start, /help commands
 * - Text message handling (broadcast reply detection)
 * - Manual long-polling loop (Telegraf's built-in polling can hang)
 * - Graceful shutdown
 */

import { supabase } from '../../config/supabase';
import { TelegramBotConfig, TelegramBotStatus } from './types';
import { telegramMarkdownService } from './telegramMarkdownService';
import { telegramSessionService, getUserIdForChat } from './telegramSessionService';

const TAG = '[TelegramBot]';

let bot: any = null;
let botUsername: string | null = null;
let startedAt: string | null = null;
let allowedChatIds: number[] = [];

/**
 * Load bot config from environment or database
 */
async function loadConfig(): Promise<TelegramBotConfig | null> {
  // Check environment variable first
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken) {
    const chatIds = process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    return {
      botToken: envToken,
      allowedChatIds: chatIds ? chatIds.split(',').map(Number).filter(Boolean) : [],
    };
  }

  // No token configured
  return null;
}

function isChatAllowed(chatId: number): boolean {
  if (allowedChatIds.length === 0) return true;
  return allowedChatIds.includes(chatId);
}

async function sendSafe(ctx: any, text: string, parseMode?: string): Promise<any> {
  try {
    return await ctx.reply(text, parseMode ? { parse_mode: parseMode } : undefined);
  } catch (err: any) {
    if (parseMode && err.message?.includes('parse')) {
      console.warn(TAG, 'MarkdownV2 parse failed, falling back to plain text');
      return await ctx.reply(telegramMarkdownService.stripMarkdown(text));
    }
    throw err;
  }
}

export const telegramBotService = {
  async initialize(): Promise<void> {
    if (process.env.DISABLE_TELEGRAM_BOT === 'true') {
      console.log(TAG, 'DISABLE_TELEGRAM_BOT=true — bot will not start');
      return;
    }
    if (bot) {
      console.warn(TAG, 'Bot already running, skipping initialize');
      return;
    }

    const config = await loadConfig();
    if (!config) {
      console.log(TAG, 'No Telegram bot token configured — bot will not start');
      return;
    }

    allowedChatIds = config.allowedChatIds;

    const { Telegraf } = await import('telegraf');
    bot = new Telegraf(config.botToken);

    // Log updates
    bot.use(async (ctx: any, next: any) => {
      const keys = Object.keys(ctx.update).filter((k: string) => k !== 'update_id');
      console.log(TAG, `[UPDATE] ${keys.join(',')}`);
      return next();
    });

    // /start command
    bot.start(async (ctx: any) => {
      if (!isChatAllowed(ctx.chat.id)) return;

      const firstName = ctx.from?.first_name || '';
      const name = firstName ? ` ${firstName}` : '';
      const msg = `Hey${name}! I'm the Singularity Bot.\n\nI can notify you about broadcasts and let you reply right here.\n\nCommands:\n/start - Welcome message\n/help - Show commands\n/link <email> - Link your Singularity account`;

      await sendSafe(ctx, telegramMarkdownService.escapeMarkdownV2(msg), 'MarkdownV2');
    });

    // /help command
    bot.help(async (ctx: any) => {
      if (!isChatAllowed(ctx.chat.id)) return;

      const msg = `**Available commands:**\n\n/start - Welcome message\n/help - This help message\n/link <email> - Link your Singularity account\n\nReply to any broadcast notification to add a comment.`;

      await sendSafe(ctx, telegramMarkdownService.convertToMarkdownV2(msg), 'MarkdownV2');
    });

    // /link command — link Telegram chat to Singularity user
    bot.command('link', async (ctx: any) => {
      if (!isChatAllowed(ctx.chat.id)) return;

      const text = ctx.message.text || '';
      const parts = text.split(' ');
      const email = parts[1]?.trim();

      if (!email) {
        await sendSafe(ctx, 'Usage: /link your@email.com');
        return;
      }

      // Look up user by email
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (!user) {
        await sendSafe(ctx, `No Singularity account found for ${email}`);
        return;
      }

      await telegramSessionService.linkUserToChat(ctx.chat.id, user.id);
      await sendSafe(ctx, `Linked to ${email}! You'll now receive broadcast notifications here.`);
    });

    // Text messages — check if it's a reply to a broadcast
    bot.on('text', async (ctx: any) => {
      if (!isChatAllowed(ctx.chat.id)) return;

      const chatId = ctx.chat.id;
      const text = ctx.message.text;

      // Get session and record message
      const session = await telegramSessionService.getOrCreateSession(
        chatId, ctx.from?.username, ctx.from?.first_name
      );
      await telegramSessionService.recordMessage(session.id);

      // Try to find linked user and their most recent broadcast
      const userId = await getUserIdForChat(chatId);
      if (!userId) {
        await sendSafe(ctx, 'Use /link your@email.com to connect your Singularity account first.');
        return;
      }

      // Find the user's most recent unread broadcast (as a recipient)
      const { data: recentRecipient } = await supabase
        .from('broadcast_recipients')
        .select('id, entry_id, contact_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentRecipient && text.trim()) {
        // Create a broadcast comment
        const { error: commentError } = await supabase
          .from('broadcast_comments')
          .insert({
            entry_id: recentRecipient.entry_id,
            recipient_id: recentRecipient.id,
            content: text.trim(),
          });

        if (commentError) {
          console.error(TAG, 'Failed to create comment:', commentError.message);
          await sendSafe(ctx, 'Failed to post your comment. Please try again.');
        } else {
          await sendSafe(ctx, 'Comment posted on the broadcast!');
        }
      } else {
        await sendSafe(ctx, 'No active broadcast found. Your message was not posted as a comment.');
      }
    });

    // Authenticate and start polling
    const MAX_AUTH_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_AUTH_RETRIES; attempt++) {
      try {
        const botInfo = await bot.telegram.getMe();
        bot.botInfo = botInfo;
        botUsername = botInfo.username;
        console.log(TAG, `Bot authenticated as @${botUsername}`);

        // Delete any stale webhook to enable polling
        const webhookInfo = await bot.telegram.getWebhookInfo();
        if (webhookInfo.url) {
          console.warn(TAG, `Stale webhook detected: ${webhookInfo.url} — deleting`);
          await bot.telegram.deleteWebhook({ drop_pending_updates: false });
        }
        break;
      } catch (err: any) {
        console.error(TAG, `Auth attempt ${attempt}/${MAX_AUTH_RETRIES} failed:`, err.message);
        if (attempt === MAX_AUTH_RETRIES) { bot = null; throw err; }
        await new Promise(r => setTimeout(r, attempt * 5000));
      }
    }

    bot.catch((err: any) => { console.error(TAG, 'Bot error:', err.message); });

    // Manual polling loop (raw fetch — more reliable than Telegraf's built-in)
    const apiBase = `https://api.telegram.org/bot${config.botToken}`;
    console.log(TAG, 'Starting manual polling loop...');
    let pollingOffset = 0;
    let pollingActive = true;

    const pollOnce = async () => {
      try {
        const body = JSON.stringify({
          timeout: 30,
          offset: pollingOffset,
          allowed_updates: ['message', 'callback_query'],
        });
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 45_000);

        const resp = await fetch(`${apiBase}/getUpdates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
        clearTimeout(fetchTimeout);

        const data = await resp.json() as any;
        if (!data.ok) {
          console.error(TAG, `[POLL] getUpdates error: ${data.error_code} ${data.description}`);
          await new Promise(r => setTimeout(r, 5000));
          return;
        }

        const updates = data.result || [];
        if (updates.length > 0) {
          console.log(TAG, `[POLL] Received ${updates.length} update(s)`);
          pollingOffset = updates[updates.length - 1].update_id + 1;
          for (const update of updates) {
            try { await bot.handleUpdate(update); }
            catch (err: any) { console.error(TAG, `[POLL] Handler error:`, err.message); }
          }
        }
      } catch (err: any) {
        if (!pollingActive) return;
        console.error(TAG, '[POLL] fetch error:', err.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    };

    (bot as any).__manualPollingActive = true;
    (bot as any).__stopManualPolling = () => { pollingActive = false; };

    (async () => {
      await pollOnce();
      console.log(TAG, '[POLL] First getUpdates completed — polling is active');
      while (pollingActive) { await pollOnce(); }
      console.log(TAG, '[POLL] Polling loop ended');
    })().catch(err => console.error(TAG, '[POLL] Polling loop crashed:', err.message));

    startedAt = new Date().toISOString();
    console.log(TAG, `Bot started in manual polling mode as @${botUsername}`);
  },

  async stop(): Promise<void> {
    if (!bot) return;
    try {
      if ((bot as any).__stopManualPolling) (bot as any).__stopManualPolling();
      try { bot.stop('Graceful shutdown'); } catch {}
      console.log(TAG, 'Bot stopped');
    } catch (err: any) {
      console.error(TAG, 'Error stopping bot:', err.message);
    }
    bot = null;
    botUsername = null;
    startedAt = null;
  },

  async getStatus(): Promise<TelegramBotStatus> {
    let activeSessions = 0;
    if (bot) {
      const { count } = await supabase
        .from('telegram_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      activeSessions = count || 0;
    }
    return {
      isRunning: !!bot,
      mode: bot ? 'polling' : 'stopped',
      botUsername,
      activeSessions,
      startedAt,
    };
  },

  isRunning(): boolean { return !!bot; },

  async sendMessage(chatId: number, text: string, parseMode?: string): Promise<number | null> {
    if (!bot) return null;
    try {
      const result = await bot.telegram.sendMessage(
        chatId, text, parseMode ? { parse_mode: parseMode } : undefined
      );
      return result?.message_id || null;
    } catch (err: any) {
      if (parseMode && err.message?.includes('parse')) {
        try {
          const plain = telegramMarkdownService.stripMarkdown(text);
          const result = await bot.telegram.sendMessage(chatId, plain);
          return result?.message_id || null;
        } catch { return null; }
      }
      console.error(TAG, 'sendMessage failed:', err.message);
      return null;
    }
  },
};
