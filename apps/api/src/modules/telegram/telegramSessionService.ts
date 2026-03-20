/**
 * Telegram Session Service
 * Manages chat sessions and maps Telegram chat IDs to Singularity user IDs
 */

import { supabase } from '../../config/supabase';
import { TelegramChatSession } from './types';

const TAG = '[TelegramSession]';
const STALE_SESSION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const telegramSessionService = {
  async getOrCreateSession(
    chatId: number,
    username?: string,
    firstName?: string
  ): Promise<TelegramChatSession> {
    const { data: existing, error: fetchError } = await supabase
      .from('telegram_chat_sessions')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .eq('is_active', true)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch session: ${fetchError.message}`);
    }

    if (existing) {
      const lastActivity = existing.last_message_at || existing.updated_at || existing.created_at;
      const gapMs = Date.now() - new Date(lastActivity).getTime();

      if (gapMs > STALE_SESSION_THRESHOLD_MS) {
        console.log(TAG, `Session stale for chat ${chatId} (${Math.round(gapMs / 1000)}s gap), auto-resetting`);
        return this.resetSession(chatId, username, firstName);
      }

      return existing as TelegramChatSession;
    }

    // Create new session
    const { data: newSession, error: insertError } = await supabase
      .from('telegram_chat_sessions')
      .insert({
        telegram_chat_id: chatId,
        telegram_username: username || null,
        telegram_first_name: firstName || null,
        is_active: true,
        message_count: 0,
      })
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create session: ${insertError.message}`);

    console.log(TAG, `New session created for chat ${chatId}`);
    return newSession as TelegramChatSession;
  },

  async resetSession(
    chatId: number,
    username?: string,
    firstName?: string
  ): Promise<TelegramChatSession> {
    await supabase
      .from('telegram_chat_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('telegram_chat_id', chatId)
      .eq('is_active', true);

    return this.getOrCreateSession(chatId, username, firstName);
  },

  async recordMessage(sessionId: string): Promise<void> {
    await supabase.rpc('increment_telegram_message_count', { session_uuid: sessionId });
  },

  async linkUserToChat(chatId: number, userId: string): Promise<void> {
    await supabase
      .from('telegram_chat_sessions')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('telegram_chat_id', chatId)
      .eq('is_active', true);
  },
};

// Cache for chat ID → user ID mapping
const userIdCache = new Map<number, string>();

export async function getUserIdForChat(chatId: number): Promise<string | null> {
  const cached = userIdCache.get(chatId);
  if (cached) return cached;

  // Check session for linked user
  const { data: chatSession } = await supabase
    .from('telegram_chat_sessions')
    .select('user_id')
    .eq('telegram_chat_id', chatId)
    .eq('is_active', true)
    .not('user_id', 'is', null)
    .limit(1)
    .single();

  if (chatSession?.user_id) {
    userIdCache.set(chatId, chatSession.user_id);
    return chatSession.user_id;
  }

  return null;
}
