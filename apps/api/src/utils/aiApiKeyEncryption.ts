/**
 * AI API Key Encryption Utilities
 *
 * Provides encryption/decryption for AI provider API keys using AES-256-GCM.
 * Reuses the existing CSKU encryption system for consistency.
 *
 * @module aiApiKeyEncryption
 * @version 1.0.0
 */

import {
  encryptForStorage,
  decryptFromStorage,
  validateEncryptionSetup as validateCSKUEncryption
} from '../../csku/utils/encryption';

/**
 * Plain (decrypted) AI API key structure
 */
export interface AIAPIKeyPlain {
  api_key: string;
}

/**
 * Encrypted AI API key structure for database storage
 */
export interface AIAPIKeyEncrypted {
  api_key_encrypted: string; // JSON string with {encrypted, iv, tag, salt}
}

/**
 * Encrypt AI API key for database storage
 *
 * @param credentials - Plain API key object
 * @returns Encrypted API key object ready for database insertion
 * @throws Error if encryption key not configured or encryption fails
 *
 * @example
 * const plainKey = { api_key: 'sk-ant-api03-...' };
 * const encrypted = encryptAIAPIKey(plainKey);
 * // Insert encrypted.api_key_encrypted into database
 */
export function encryptAIAPIKey(credentials: AIAPIKeyPlain): AIAPIKeyEncrypted {
  if (!credentials.api_key) {
    throw new Error('Cannot encrypt empty API key');
  }

  try {
    const encrypted: AIAPIKeyEncrypted = {
      api_key_encrypted: encryptForStorage(credentials.api_key)
    };

    return encrypted;
  } catch (error) {
    throw new Error(
      `Failed to encrypt AI API key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt AI API key from database storage
 *
 * @param encrypted - Encrypted API key object from database
 * @returns Plain API key object with decrypted value
 * @throws Error if decryption fails or data is invalid
 *
 * @example
 * const encrypted = { api_key_encrypted: '{"encrypted":"...","iv":"...","tag":"...","salt":"..."}' };
 * const plain = decryptAIAPIKey(encrypted);
 * console.log(plain.api_key); // 'sk-ant-api03-...'
 */
export function decryptAIAPIKey(encrypted: AIAPIKeyEncrypted): AIAPIKeyPlain {
  if (!encrypted.api_key_encrypted) {
    throw new Error('Cannot decrypt empty encrypted data');
  }

  try {
    const plainApiKey = decryptFromStorage(encrypted.api_key_encrypted);

    return {
      api_key: plainApiKey
    };
  } catch (error) {
    throw new Error(
      `Failed to decrypt AI API key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Mask API key for display purposes (show first 6 + last 8 characters)
 *
 * @param apiKey - Plain API key string
 * @returns Masked API key string (e.g., "sk-ant-***************xyz")
 *
 * @example
 * maskAPIKey('sk-ant-api03-test-key-for-testing-purposes-only');
 * // Returns: 'sk-ant-***************ses-only'
 */
export function maskAPIKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 14) {
    return '***'; // Too short to mask safely
  }

  const prefix = apiKey.substring(0, 6); // First 6 chars (e.g., 'sk-ant')
  const suffix = apiKey.substring(apiKey.length - 8); // Last 8 chars
  const maskedMiddle = '*'.repeat(15); // Fixed-width masking

  return `${prefix}${maskedMiddle}${suffix}`;
}

/**
 * Validate encryption setup is properly configured
 *
 * @returns Object with validation result and optional error message
 *
 * @example
 * const validation = validateEncryptionSetup();
 * if (!validation.valid) {
 *   console.error('Encryption not configured:', validation.error);
 * }
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  return validateCSKUEncryption();
}

/**
 * Test encryption/decryption with sample data
 * Useful for verifying encryption is working correctly
 *
 * @returns True if encryption round-trip succeeds, false otherwise
 *
 * @example
 * if (!testEncryption()) {
 *   console.error('Encryption test failed - check ENCRYPTION_KEY');
 * }
 */
export function testEncryption(): boolean {
  try {
    const testData: AIAPIKeyPlain = {
      api_key: 'sk-ant-test-key-for-encryption-validation-12345'
    };

    const encrypted = encryptAIAPIKey(testData);
    const decrypted = decryptAIAPIKey(encrypted);

    return testData.api_key === decrypted.api_key;
  } catch (error) {
    console.error('Encryption test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Export all utilities
export default {
  encryptAIAPIKey,
  decryptAIAPIKey,
  maskAPIKey,
  validateEncryptionSetup,
  testEncryption
};
