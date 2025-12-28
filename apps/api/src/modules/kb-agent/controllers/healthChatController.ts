/**
 * Health Chat Controller
 */

import { Request, Response } from 'express';
import { healthChatService } from '../services/healthChatService';
import { ChatRequest } from '../types';

export class HealthChatController {
  /**
   * POST /api/v1/chat
   * Send a message to the health assistant
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { message, session_id } = req.body as ChatRequest;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Message is required' });
        return;
      }

      const response = await healthChatService.chat(userId, {
        message: message.trim(),
        session_id
      });

      res.json({ success: true, data: response });
    } catch (error) {
      console.error('[HealthChatController] Chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/chat/sessions
   * Get user's chat sessions
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await healthChatService.getUserSessions(userId, limit, offset);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[HealthChatController] Get sessions error:', error);
      res.status(500).json({ success: false, error: 'Failed to get sessions' });
    }
  }

  /**
   * POST /api/v1/chat/sessions
   * Create a new session
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const session = await healthChatService.createSession(userId);
      res.json({ success: true, data: { session } });
    } catch (error) {
      console.error('[HealthChatController] Create session error:', error);
      res.status(500).json({ success: false, error: 'Failed to create session' });
    }
  }

  /**
   * GET /api/v1/chat/sessions/:sessionId
   * Get a session with message history
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await healthChatService.getSessionHistory(sessionId, userId);

      if (!result) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[HealthChatController] Get session error:', error);
      res.status(500).json({ success: false, error: 'Failed to get session' });
    }
  }

  /**
   * DELETE /api/v1/chat/sessions/:sessionId
   * Delete a session
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await healthChatService.deleteSession(sessionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('[HealthChatController] Delete session error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete session' });
    }
  }

  /**
   * POST /api/v1/chat/messages/:messageId/feedback
   * Submit feedback on a message
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;
      const { feedback } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!feedback || !['helpful', 'not_helpful'].includes(feedback)) {
        res.status(400).json({ success: false, error: 'Invalid feedback' });
        return;
      }

      const message = await healthChatService.submitFeedback(messageId, userId, feedback);
      res.json({ success: true, data: { message } });
    } catch (error) {
      console.error('[HealthChatController] Submit feedback error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit feedback' });
    }
  }
}

export const healthChatController = new HealthChatController();
