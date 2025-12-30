/**
 * AI API Key Service
 *
 * Core business logic for managing AI provider API keys:
 * - Retrieve active keys with primary/backup fallback
 * - Test API connections with provider-specific logic
 * - Health check individual keys and all keys
 */

import { supabase } from '../../../config/supabase';
import { encryptAIAPIKey, decryptAIAPIKey, maskAPIKey } from '../utils/aiApiKeyEncryption';

/**
 * AI API Key database record structure
 */
export interface AIAPIKey {
  id: string;
  user_id: string;
  provider: 'anthropic' | 'openai' | 'perplexity';
  key_name: string;
  api_key_encrypted: string;
  is_primary: boolean;
  is_active: boolean;
  health_status: 'healthy' | 'unhealthy' | 'warning' | 'critical' | 'unknown';
  consecutive_failures: number;
  last_health_check: string | null;
  last_error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Connection test result structure
 */
export interface ConnectionTestResult {
  success: boolean;
  provider: string;
  test_timestamp: string;
  response_time_ms?: number;
  error?: string;
}

/**
 * Health check summary structure
 */
export interface HealthCheckSummary {
  total_keys: number;
  healthy: number;
  unhealthy: number;
  tested_at: string;
  failures: Array<{
    user_id: string;
    provider: string;
    key_name: string;
    error: string;
  }>;
}

export class AIAPIKeyService {
  /**
   * Get active API key for provider (primary with backup fallback)
   */
  static async getActiveKeyForProvider(
    userId: string,
    provider: 'anthropic' | 'openai' | 'perplexity'
  ): Promise<{ key_id: string; api_key: string; key_name: string } | null> {
    // Step 1: Try primary key
    const { data: primaryKey, error: primaryError } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_primary', true)
      .eq('is_active', true)
      .single();

    let criticalPrimaryKey: typeof primaryKey = null;

    if (!primaryError && primaryKey) {
      // Try to use the key unless it's critical
      if (primaryKey.health_status === 'critical') {
        console.warn(`Primary ${provider} key is in critical state, trying backup first`);
        criticalPrimaryKey = primaryKey; // Save for fallback
      } else {
        try {
          const decrypted = decryptAIAPIKey({ api_key_encrypted: primaryKey.api_key_encrypted });
          console.log(`Using primary ${provider} key for user ${userId} (health: ${primaryKey.health_status})`);
          return {
            key_id: primaryKey.id,
            api_key: decrypted.api_key,
            key_name: primaryKey.key_name
          };
        } catch (error) {
          console.error(`Failed to decrypt primary ${provider} key:`, error);
          // Continue to backup if decryption fails
        }
      }
    } else {
      console.log(`No primary ${provider} key found for user ${userId}: ${primaryError?.message || 'no key'}`);
    }

    // Step 2: Fallback to backup key
    const { data: backupKey, error: backupError } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_primary', false)
      .eq('is_active', true)
      .order('consecutive_failures', { ascending: true })
      .limit(1)
      .single();

    if (!backupError && backupKey) {
      try {
        const decrypted = decryptAIAPIKey({ api_key_encrypted: backupKey.api_key_encrypted });
        console.log(`Using backup ${provider} key for user ${userId}`);
        return {
          key_id: backupKey.id,
          api_key: decrypted.api_key,
          key_name: backupKey.key_name
        };
      } catch (error) {
        console.error(`Failed to decrypt backup ${provider} key:`, error);
      }
    }

    // Step 3: Last resort - use critical primary key if available
    if (criticalPrimaryKey) {
      try {
        const decrypted = decryptAIAPIKey({ api_key_encrypted: criticalPrimaryKey.api_key_encrypted });
        console.warn(`Using CRITICAL ${provider} key for user ${userId} as last resort`);
        return {
          key_id: criticalPrimaryKey.id,
          api_key: decrypted.api_key,
          key_name: criticalPrimaryKey.key_name
        };
      } catch (error) {
        console.error(`Failed to decrypt critical ${provider} key:`, error);
      }
    }

    console.error(`No ${provider} key found for user ${userId}`);
    return null;
  }

  /**
   * Test API connection for a specific key
   */
  static async testConnection(keyId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    const { data: keyRecord, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error || !keyRecord) {
      return {
        success: false,
        provider: 'unknown',
        test_timestamp: new Date().toISOString(),
        error: `Key not found: ${keyId}`
      };
    }

    let apiKey: string;
    try {
      const decrypted = decryptAIAPIKey({ api_key_encrypted: keyRecord.api_key_encrypted });
      apiKey = decrypted.api_key;
    } catch (decryptError) {
      return {
        success: false,
        provider: keyRecord.provider,
        test_timestamp: new Date().toISOString(),
        error: `Decryption failed: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`
      };
    }

    let testResult: ConnectionTestResult;

    switch (keyRecord.provider) {
      case 'anthropic':
        testResult = await this.testAnthropicKey(apiKey);
        break;
      case 'openai':
        testResult = await this.testOpenAIKey(apiKey);
        break;
      case 'perplexity':
        testResult = await this.testPerplexityKey(apiKey);
        break;
      default:
        testResult = {
          success: false,
          provider: keyRecord.provider,
          test_timestamp: new Date().toISOString(),
          error: `Unsupported provider: ${keyRecord.provider}`
        };
    }

    testResult.response_time_ms = Date.now() - startTime;
    return testResult;
  }

  /**
   * Test Anthropic API key
   */
  private static async testAnthropicKey(apiKey: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });

      if (response.ok) {
        return {
          success: true,
          provider: 'anthropic',
          test_timestamp: new Date().toISOString()
        };
      } else {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'anthropic',
          test_timestamp: new Date().toISOString(),
          error: `HTTP ${response.status}: ${errorBody}`
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: 'anthropic',
        test_timestamp: new Date().toISOString(),
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Test OpenAI API key
   */
  private static async testOpenAIKey(apiKey: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        return {
          success: true,
          provider: 'openai',
          test_timestamp: new Date().toISOString()
        };
      } else {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'openai',
          test_timestamp: new Date().toISOString(),
          error: `HTTP ${response.status}: ${errorBody}`
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: 'openai',
        test_timestamp: new Date().toISOString(),
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Test Perplexity API key
   */
  private static async testPerplexityKey(apiKey: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });

      if (response.ok) {
        return {
          success: true,
          provider: 'perplexity',
          test_timestamp: new Date().toISOString()
        };
      } else {
        const errorBody = await response.text();
        return {
          success: false,
          provider: 'perplexity',
          test_timestamp: new Date().toISOString(),
          error: `HTTP ${response.status}: ${errorBody}`
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: 'perplexity',
        test_timestamp: new Date().toISOString(),
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Health check individual key and update database
   */
  static async healthCheck(keyId: string): Promise<ConnectionTestResult> {
    const testResult = await this.testConnection(keyId);

    const updates: Partial<AIAPIKey> = {
      last_health_check: testResult.test_timestamp
    };

    if (testResult.success) {
      updates.health_status = 'healthy';
      updates.consecutive_failures = 0;
      updates.last_error_message = null;
    } else {
      const { data: currentKey } = await supabase
        .from('ai_api_keys')
        .select('consecutive_failures')
        .eq('id', keyId)
        .single();

      const failures = (currentKey?.consecutive_failures || 0) + 1;
      updates.consecutive_failures = failures;
      updates.last_error_message = testResult.error || 'Unknown error';

      if (failures === 1) {
        updates.health_status = 'warning';
      } else if (failures === 2) {
        updates.health_status = 'unhealthy';
      } else {
        updates.health_status = 'critical';
      }
    }

    await supabase
      .from('ai_api_keys')
      .update(updates)
      .eq('id', keyId);

    return testResult;
  }

  /**
   * Health check all active keys
   */
  static async healthCheckAll(): Promise<HealthCheckSummary> {
    const { data: allKeys, error } = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('is_active', true);

    if (error || !allKeys) {
      throw new Error(`Failed to retrieve keys for health check: ${error?.message}`);
    }

    const summary: HealthCheckSummary = {
      total_keys: allKeys.length,
      healthy: 0,
      unhealthy: 0,
      tested_at: new Date().toISOString(),
      failures: []
    };

    for (const key of allKeys) {
      const result = await this.healthCheck(key.id);

      if (result.success) {
        summary.healthy++;
      } else {
        summary.unhealthy++;
        summary.failures.push({
          user_id: key.user_id,
          provider: key.provider,
          key_name: key.key_name,
          error: result.error || 'Unknown error'
        });
      }
    }

    console.log(`Health check completed: ${summary.healthy}/${summary.total_keys} healthy`);
    return summary;
  }
}

export default AIAPIKeyService;
