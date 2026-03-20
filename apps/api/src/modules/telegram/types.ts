export interface TelegramBotConfig {
  botToken: string;
  allowedChatIds: number[];
}

export interface TelegramChatSession {
  id: string;
  telegram_chat_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  user_id: string | null;
  is_active: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelegramBotStatus {
  isRunning: boolean;
  mode: 'polling' | 'stopped';
  botUsername: string | null;
  activeSessions: number;
  startedAt: string | null;
}
