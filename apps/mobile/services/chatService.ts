/**
 * Health Chat Service
 * Mobile service for AI health assistant chat
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session.data.session?.access_token) {
    headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
  }

  return headers;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  is_active: boolean;
  message_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[];
  tokens_used?: number;
  response_time_ms?: number;
  model_used?: string;
  user_feedback?: 'helpful' | 'not_helpful' | null;
  created_at: string;
}

export interface SourceCitation {
  type: 'biomarker' | 'supplement' | 'routine' | 'goal';
  id: string;
  name: string;
  relevance: number;
}

export interface ChatResponse {
  message: ChatMessage;
  session: ChatSession;
}

export interface SessionListResponse {
  sessions: ChatSession[];
  total: number;
}

export interface SessionHistoryResponse {
  session: ChatSession;
  messages: ChatMessage[];
}

export async function sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ message, session_id: sessionId })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }
  const json = await response.json();
  return json.data;
}

export async function getChatSessions(limit = 20, offset = 0): Promise<SessionListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions?limit=${limit}&offset=${offset}`, {
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch chat sessions');
  const json = await response.json();
  return json.data;
}

export async function createChatSession(): Promise<{ session: ChatSession }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to create chat session');
  const json = await response.json();
  return json.data;
}

export async function getChatSession(sessionId: string): Promise<SessionHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch chat session');
  const json = await response.json();
  return json.data;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete chat session');
}

export async function submitFeedback(messageId: string, feedback: 'helpful' | 'not_helpful'): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ feedback })
  });
  if (!response.ok) throw new Error('Failed to submit feedback');
}
