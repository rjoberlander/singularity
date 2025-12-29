/**
 * AI API Key Controller
 *
 * HTTP endpoints for AI API key management
 */

import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';
import { encryptAIAPIKey, decryptAIAPIKey, maskAPIKey } from '../utils/aiApiKeyEncryption';
import AIAPIKeyService from '../services/aiAPIKeyService';

export class AIAPIKeyController {
  /**
   * GET /api/v1/ai-api-keys
   * List all AI API keys for user (masked)
   */
  static async getAIAPIKeys(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { data: keys, error } = await supabase
        .from('ai_api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('provider', { ascending: true })
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Failed to retrieve AI API keys:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve AI API keys' });
        return;
      }

      const maskedKeys = (keys || []).map(key => {
        try {
          const decrypted = decryptAIAPIKey({ api_key_encrypted: key.api_key_encrypted });
          return {
            id: key.id,
            user_id: key.user_id,
            provider: key.provider,
            key_name: key.key_name,
            api_key_masked: maskAPIKey(decrypted.api_key),
            is_primary: key.is_primary,
            is_active: key.is_active,
            health_status: key.health_status,
            consecutive_failures: key.consecutive_failures,
            last_health_check: key.last_health_check,
            created_at: key.created_at,
            updated_at: key.updated_at
          };
        } catch (decryptError) {
          console.error(`Failed to decrypt key ${key.id}:`, decryptError);
          return {
            id: key.id,
            user_id: key.user_id,
            provider: key.provider,
            key_name: key.key_name,
            api_key_masked: '*** DECRYPTION ERROR ***',
            is_primary: key.is_primary,
            is_active: key.is_active,
            health_status: 'critical',
            consecutive_failures: key.consecutive_failures,
            last_health_check: key.last_health_check,
            created_at: key.created_at,
            updated_at: key.updated_at
          };
        }
      });

      res.json({ success: true, data: maskedKeys });
    } catch (error) {
      console.error('Error in getAIAPIKeys:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/ai-api-keys/:id
   * Get single AI API key with decrypted API key (for editing)
   */
  static async getAIAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { data: key, error } = await supabase
        .from('ai_api_keys')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !key) {
        res.status(404).json({ success: false, error: 'API key not found' });
        return;
      }

      try {
        const decrypted = decryptAIAPIKey({ api_key_encrypted: key.api_key_encrypted });

        res.json({
          success: true,
          data: {
            id: key.id,
            user_id: key.user_id,
            provider: key.provider,
            key_name: key.key_name,
            api_key: decrypted.api_key,
            api_key_masked: maskAPIKey(decrypted.api_key),
            is_primary: key.is_primary,
            is_active: key.is_active,
            health_status: key.health_status,
            consecutive_failures: key.consecutive_failures,
            last_health_check: key.last_health_check,
            last_error_message: key.last_error_message,
            metadata: key.metadata,
            created_at: key.created_at,
            updated_at: key.updated_at
          }
        });
      } catch (decryptError) {
        console.error(`Failed to decrypt key ${id}:`, decryptError);
        res.status(500).json({ success: false, error: 'Failed to decrypt API key' });
      }
    } catch (error) {
      console.error('Error in getAIAPIKey:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/ai-api-keys
   * Create new AI API key
   */
  static async createAIAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { provider, key_name, api_key, is_primary, metadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!provider || !key_name || !api_key) {
        res.status(400).json({ success: false, error: 'Missing required fields: provider, key_name, api_key' });
        return;
      }

      const validProviders = ['anthropic', 'openai', 'perplexity'];
      if (!validProviders.includes(provider)) {
        res.status(400).json({ success: false, error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
        return;
      }

      const encrypted = encryptAIAPIKey({ api_key });

      const { data: newKey, error } = await supabase
        .from('ai_api_keys')
        .insert({
          user_id: userId,
          provider,
          key_name,
          api_key_encrypted: encrypted.api_key_encrypted,
          is_primary: is_primary || false,
          is_active: true,
          health_status: 'unknown',
          consecutive_failures: 0,
          metadata: metadata || null
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('unique')) {
          res.status(409).json({ success: false, error: 'Only 1 primary key allowed per provider. Demote the existing primary key first.' });
          return;
        }

        console.error('Failed to create AI API key:', error);
        res.status(500).json({ success: false, error: 'Failed to create AI API key' });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          id: newKey.id,
          user_id: newKey.user_id,
          provider: newKey.provider,
          key_name: newKey.key_name,
          api_key_masked: maskAPIKey(api_key),
          is_primary: newKey.is_primary,
          is_active: newKey.is_active,
          health_status: newKey.health_status,
          consecutive_failures: newKey.consecutive_failures,
          created_at: newKey.created_at
        }
      });
    } catch (error) {
      console.error('Error in createAIAPIKey:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * PATCH /api/v1/ai-api-keys/:id
   * Update AI API key
   */
  static async updateAIAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { key_name, api_key, is_active, metadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const updates: any = {};

      if (key_name !== undefined) {
        updates.key_name = key_name;
      }

      if (api_key !== undefined) {
        const encrypted = encryptAIAPIKey({ api_key });
        updates.api_key_encrypted = encrypted.api_key_encrypted;
        updates.health_status = 'unknown';
        updates.consecutive_failures = 0;
        updates.last_error_message = null;
      }

      if (is_active !== undefined) {
        updates.is_active = is_active;
      }

      if (metadata !== undefined) {
        updates.metadata = metadata;
      }

      const { data: updatedKey, error } = await supabase
        .from('ai_api_keys')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !updatedKey) {
        res.status(404).json({ success: false, error: 'API key not found or update failed' });
        return;
      }

      const decrypted = decryptAIAPIKey({ api_key_encrypted: updatedKey.api_key_encrypted });

      res.json({
        success: true,
        data: {
          id: updatedKey.id,
          user_id: updatedKey.user_id,
          provider: updatedKey.provider,
          key_name: updatedKey.key_name,
          api_key_masked: maskAPIKey(decrypted.api_key),
          is_primary: updatedKey.is_primary,
          is_active: updatedKey.is_active,
          health_status: updatedKey.health_status,
          consecutive_failures: updatedKey.consecutive_failures,
          updated_at: updatedKey.updated_at
        }
      });
    } catch (error) {
      console.error('Error in updateAIAPIKey:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * DELETE /api/v1/ai-api-keys/:id
   * Delete AI API key
   */
  static async deleteAIAPIKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { error } = await supabase
        .from('ai_api_keys')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete AI API key:', error);
        res.status(500).json({ success: false, error: 'Failed to delete AI API key' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteAIAPIKey:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/ai-api-keys/:id/test
   * Test AI API connection
   */
  static async testAIAPIConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { data: key, error: keyError } = await supabase
        .from('ai_api_keys')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (keyError || !key) {
        res.status(404).json({ success: false, error: 'API key not found' });
        return;
      }

      const testResult = await AIAPIKeyService.testConnection(id);

      res.json({ success: true, data: testResult });
    } catch (error) {
      console.error('Error in testAIAPIConnection:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/ai-api-keys/:id/toggle-primary
   * Toggle primary/backup designation
   */
  static async togglePrimaryKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { data: targetKey, error: targetError } = await supabase
        .from('ai_api_keys')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (targetError || !targetKey) {
        res.status(404).json({ success: false, error: 'API key not found' });
        return;
      }

      const newPrimaryState = !targetKey.is_primary;

      if (newPrimaryState) {
        // Demote current primary first
        const { data: currentPrimary } = await supabase
          .from('ai_api_keys')
          .select('id')
          .eq('user_id', userId)
          .eq('provider', targetKey.provider)
          .eq('is_primary', true)
          .single();

        if (currentPrimary) {
          await supabase
            .from('ai_api_keys')
            .update({ is_primary: false })
            .eq('id', currentPrimary.id);
        }

        await supabase
          .from('ai_api_keys')
          .update({ is_primary: true })
          .eq('id', id);

        res.json({
          success: true,
          data: {
            message: 'Key promoted to primary. Previous primary demoted to backup.',
            previous_primary_id: currentPrimary?.id || null,
            new_primary_id: id
          }
        });
      } else {
        await supabase
          .from('ai_api_keys')
          .update({ is_primary: false })
          .eq('id', id);

        res.json({
          success: true,
          data: {
            message: 'Key demoted to backup.',
            new_primary_id: null
          }
        });
      }
    } catch (error) {
      console.error('Error in togglePrimaryKey:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/ai-api-keys/health-check-all
   * Health check all user's keys
   */
  static async healthCheckAllUserKeys(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Get all active keys for this user
      const { data: userKeys, error } = await supabase
        .from('ai_api_keys')
        .select('id, provider, key_name')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        res.status(500).json({ success: false, error: 'Failed to retrieve keys' });
        return;
      }

      const results = [];
      let healthy = 0;
      let unhealthy = 0;

      for (const key of userKeys || []) {
        const testResult = await AIAPIKeyService.healthCheck(key.id);
        results.push({
          id: key.id,
          provider: key.provider,
          key_name: key.key_name,
          healthy: testResult.success,
          error: testResult.error || null
        });

        if (testResult.success) {
          healthy++;
        } else {
          unhealthy++;
        }
      }

      res.json({
        success: true,
        data: {
          total: results.length,
          healthy,
          unhealthy,
          tested_at: new Date().toISOString(),
          results
        }
      });
    } catch (error) {
      console.error('Error in healthCheckAllUserKeys:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

export default AIAPIKeyController;
