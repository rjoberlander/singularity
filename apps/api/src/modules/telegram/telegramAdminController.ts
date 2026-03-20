/**
 * Telegram Bot Admin Controller
 * Endpoints for managing the Telegram bot lifecycle
 */

import { Request, Response } from 'express';
import { telegramBotService } from './telegramBotService';

export const telegramAdminController = {
  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = await telegramBotService.getStatus();
      res.json({ success: true, ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async startBot(_req: Request, res: Response): Promise<void> {
    try {
      if (telegramBotService.isRunning()) {
        res.json({ success: true, message: 'Bot is already running' });
        return;
      }
      await telegramBotService.initialize();
      const status = await telegramBotService.getStatus();
      res.json({ success: true, message: 'Bot started', ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async stopBot(_req: Request, res: Response): Promise<void> {
    try {
      await telegramBotService.stop();
      res.json({ success: true, message: 'Bot stopped' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async sendNotify(req: Request, res: Response): Promise<void> {
    try {
      const { message, parse_mode, chat_id } = req.body;
      if (!message) {
        res.status(400).json({ success: false, error: 'message required' });
        return;
      }
      if (!chat_id) {
        res.status(400).json({ success: false, error: 'chat_id required' });
        return;
      }
      const msgId = await telegramBotService.sendMessage(chat_id, message, parse_mode);
      if (!msgId) {
        res.status(500).json({ success: false, error: 'Send failed — bot may not be running' });
        return;
      }
      res.json({ success: true, messageId: msgId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
