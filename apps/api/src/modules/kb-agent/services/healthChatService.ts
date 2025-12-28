/**
 * Health Chat Service
 * AI-powered health assistant that answers questions about user's health data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { AIAPIKeyService } from '../../ai-api-keys/services/aiAPIKeyService';
import {
  ChatSession,
  ChatMessage,
  SourceCitation,
  ChatRequest,
  ChatResponse,
  SessionListResponse,
  SessionHistoryResponse,
  HealthContext,
  LLMResponse
} from '../types';

export class HealthChatService {
  private supabase: SupabaseClient;
  private readonly MODEL = 'claude-sonnet-4-20250514';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get Anthropic client with user's API key
   */
  private async getAnthropicClient(userId: string): Promise<Anthropic | null> {
    const keyData = await AIAPIKeyService.getActiveKeyForProvider(userId, 'anthropic');
    if (!keyData) {
      console.warn(`No Anthropic API key found for user ${userId}`);
      return null;
    }
    return new Anthropic({ apiKey: keyData.api_key });
  }

  /**
   * Main chat handler
   */
  async chat(userId: string, request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get or create session
    let session: ChatSession;
    if (request.session_id) {
      const existing = await this.getSession(request.session_id, userId);
      if (!existing) {
        throw new Error('Session not found or access denied');
      }
      session = existing;
    } else {
      session = await this.createSession(userId);
    }

    // Save user message
    await this.saveMessage(session.id, 'user', request.message);

    // Set session title from first message
    if (!session.title && session.message_count === 0) {
      await this.setSessionTitle(session.id, request.message);
    }

    // Get user's health context
    const context = await this.getHealthContext(userId);

    // Get conversation history
    const history = await this.getRecentMessages(session.id, 10);

    // Generate response with Claude
    const llmResponse = await this.generateResponse(userId, request.message, context, history);

    const responseTime = Date.now() - startTime;

    // Save assistant message
    const assistantMessage = await this.saveMessage(
      session.id,
      'assistant',
      llmResponse.content,
      {
        sources: llmResponse.sources,
        tokens_used: llmResponse.tokens_used,
        response_time_ms: responseTime,
        model_used: this.MODEL
      }
    );

    // Update session
    await this.updateSession(session.id);
    const updatedSession = await this.getSession(session.id, userId);

    return {
      message: assistantMessage,
      session: updatedSession!
    };
  }

  // Session management
  async createSession(userId: string): Promise<ChatSession> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        is_active: true,
        message_count: 0
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return data;
  }

  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get session: ${error.message}`);
    }
    return data;
  }

  async getUserSessions(userId: string, limit = 20, offset = 0): Promise<SessionListResponse> {
    const { data, error, count } = await this.supabase
      .from('chat_sessions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get sessions: ${error.message}`);
    return { sessions: data || [], total: count || 0 };
  }

  async getSessionHistory(sessionId: string, userId: string): Promise<SessionHistoryResponse | null> {
    const session = await this.getSession(sessionId, userId);
    if (!session) return null;

    const { data: messages, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    return { session, messages: messages || [] };
  }

  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('chat_sessions')
      .update({ is_active: false })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete session: ${error.message}`);
    return true;
  }

  private async setSessionTitle(sessionId: string, firstMessage: string): Promise<void> {
    let title = firstMessage.replace(/\s+/g, ' ').trim().substring(0, 100);
    if (firstMessage.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    await this.supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);
  }

  private async updateSession(sessionId: string): Promise<void> {
    const { data } = await this.supabase
      .from('chat_sessions')
      .select('message_count')
      .eq('id', sessionId)
      .single();

    await this.supabase
      .from('chat_sessions')
      .update({
        message_count: (data?.message_count || 0) + 1,
        last_message_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }

  // Message management
  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Partial<ChatMessage>
  ): Promise<ChatMessage> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        ...metadata
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to save message: ${error.message}`);
    return data;
  }

  private async getRecentMessages(sessionId: string, limit = 10): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    return (data || []).reverse();
  }

  // Health context retrieval
  private async getHealthContext(userId: string): Promise<HealthContext> {
    const [biomarkers, supplements, routines, goals] = await Promise.all([
      this.supabase.from('biomarkers').select('*').eq('user_id', userId).order('date_tested', { ascending: false }).limit(20),
      this.supabase.from('supplements').select('*').eq('user_id', userId).eq('is_active', true),
      this.supabase.from('routines').select('*, routine_items(*)').eq('user_id', userId),
      this.supabase.from('goals').select('*, goal_interventions(*)').eq('user_id', userId).eq('status', 'active')
    ]);

    return {
      biomarkers: biomarkers.data || [],
      supplements: supplements.data || [],
      routines: routines.data || [],
      goals: goals.data || []
    };
  }

  // AI Response generation
  private async generateResponse(
    userId: string,
    userMessage: string,
    context: HealthContext,
    history: ChatMessage[]
  ): Promise<LLMResponse> {
    const anthropic = await this.getAnthropicClient(userId);

    if (!anthropic) {
      return {
        content: "I'm sorry, but I can't process your request right now. Please add your Anthropic API key in Settings > AI API Keys to use the health assistant.",
        sources: [],
        tokens_used: 0
      };
    }

    // Build context
    const contextText = this.buildContextText(context);

    // Build conversation history
    const historyMessages = history
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    const systemPrompt = `You are a helpful AI health assistant for a personal health tracking app called Protocol. You help users understand their biomarkers, supplements, routines, and health goals.

## YOUR ROLE:
1. Answer questions about the user's health data shown below
2. Provide personalized insights based on their biomarkers and supplements
3. Suggest improvements to their health protocols
4. Explain what biomarkers mean and optimal ranges
5. Help optimize supplement timing and dosing

## IMPORTANT GUIDELINES:
- Be helpful but NOT a replacement for medical advice
- If asked about serious medical conditions, recommend consulting a healthcare provider
- Base your answers on the user's actual data when available
- Be specific and actionable in your recommendations
- Use simple language, avoid jargon

## USER'S HEALTH DATA:
${contextText}

Answer the user's question based on their health data. Be conversational but informative.`;

    try {
      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...historyMessages,
          { role: 'user', content: userMessage }
        ]
      });

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Extract sources from context
      const sources = this.extractSources(userMessage, context);

      return {
        content,
        sources,
        tokens_used: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      console.error('[HealthChatService] LLM error:', error);
      throw new Error('Failed to generate response');
    }
  }

  private buildContextText(context: HealthContext): string {
    let text = '';

    if (context.biomarkers.length > 0) {
      text += '### Recent Biomarkers:\n';
      context.biomarkers.slice(0, 10).forEach(b => {
        const status = this.getBiomarkerStatus(b);
        text += `- ${b.name}: ${b.value} ${b.unit} (${status}) - tested ${b.date_tested}\n`;
      });
      text += '\n';
    }

    if (context.supplements.length > 0) {
      text += '### Active Supplements:\n';
      context.supplements.forEach(s => {
        text += `- ${s.name} (${s.brand}): ${s.dose}, ${s.timing}, ${s.frequency}\n`;
      });
      text += '\n';
    }

    if (context.routines.length > 0) {
      text += '### Daily Routines:\n';
      context.routines.forEach(r => {
        text += `- ${r.name} (${r.time_of_day}): ${r.routine_items?.length || 0} items\n`;
      });
      text += '\n';
    }

    if (context.goals.length > 0) {
      text += '### Active Goals:\n';
      context.goals.forEach(g => {
        text += `- ${g.title}: ${g.target_biomarker ? `Target ${g.target_biomarker} from ${g.current_value} to ${g.target_value}` : g.category}\n`;
      });
    }

    return text || 'No health data recorded yet.';
  }

  private getBiomarkerStatus(biomarker: any): string {
    if (biomarker.optimal_range_low && biomarker.optimal_range_high) {
      if (biomarker.value >= biomarker.optimal_range_low && biomarker.value <= biomarker.optimal_range_high) {
        return 'optimal';
      }
    }
    if (biomarker.reference_range_low && biomarker.reference_range_high) {
      if (biomarker.value >= biomarker.reference_range_low && biomarker.value <= biomarker.reference_range_high) {
        return 'normal';
      }
      return biomarker.value < biomarker.reference_range_low ? 'low' : 'high';
    }
    return 'unknown';
  }

  private extractSources(message: string, context: HealthContext): SourceCitation[] {
    const sources: SourceCitation[] = [];
    const messageLower = message.toLowerCase();

    // Check for biomarker mentions
    context.biomarkers.forEach(b => {
      if (messageLower.includes(b.name.toLowerCase())) {
        sources.push({ type: 'biomarker', id: b.id, name: b.name, relevance: 0.9 });
      }
    });

    // Check for supplement mentions
    context.supplements.forEach(s => {
      if (messageLower.includes(s.name.toLowerCase())) {
        sources.push({ type: 'supplement', id: s.id, name: s.name, relevance: 0.9 });
      }
    });

    return sources.slice(0, 5);
  }

  // Feedback
  async submitFeedback(messageId: string, userId: string, feedback: 'helpful' | 'not_helpful'): Promise<ChatMessage> {
    const { data: message, error: msgError } = await this.supabase
      .from('chat_messages')
      .select('*, chat_sessions!inner(user_id)')
      .eq('id', messageId)
      .single();

    if (msgError || !message) throw new Error('Message not found');
    if (message.chat_sessions.user_id !== userId) throw new Error('Access denied');

    const { data: updated, error } = await this.supabase
      .from('chat_messages')
      .update({
        user_feedback: feedback,
        feedback_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw new Error(`Failed to submit feedback: ${error.message}`);
    return updated;
  }
}

export const healthChatService = new HealthChatService();
