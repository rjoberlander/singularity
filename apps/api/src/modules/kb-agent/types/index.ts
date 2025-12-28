/**
 * Health Chat Agent Types
 * Adapted from slackkb KB Agent for health protocol tracking
 */

export interface ChatSession {
  id: string;
  user_id: string;
  title?: string;
  is_active: boolean;
  message_count: number;
  last_message_at?: string;
  metadata?: Record<string, any>;
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
  feedback_at?: string;
  created_at: string;
}

export interface SourceCitation {
  type: 'biomarker' | 'supplement' | 'routine' | 'goal';
  id: string;
  name: string;
  relevance: number;
}

// Request/Response types
export interface ChatRequest {
  message: string;
  session_id?: string;
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

// Context for AI
export interface HealthContext {
  biomarkers: any[];
  supplements: any[];
  routines: any[];
  goals: any[];
}

export interface LLMResponse {
  content: string;
  sources: SourceCitation[];
  tokens_used: number;
}

export interface FeedbackRequest {
  feedback: 'helpful' | 'not_helpful';
}
