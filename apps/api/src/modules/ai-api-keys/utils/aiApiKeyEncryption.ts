/**
 * AI API Key Encryption Utilities
 *
 * Provides encryption/decryption for AI provider API keys using AES-256-GCM.
 */

import {
  encryptForStorage,
  decryptFromStorage,
  validateEncryptionSetup as validateBaseEncryption
} from '../../../utils/encryption';

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
  api_key_encrypted: string;
}

/**
 * Encrypt AI API key for database storage
 */
export function encryptAIAPIKey(credentials: AIAPIKeyPlain): AIAPIKeyEncrypted {
  if (!credentials.api_key) {
    throw new Error('Cannot encrypt empty API key');
  }

  try {
    return {
      api_key_encrypted: encryptForStorage(credentials.api_key)
    };
  } catch (error) {
    throw new Error(
      `Failed to encrypt AI API key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypt AI API key from database storage
 */
export function decryptAIAPIKey(encrypted: AIAPIKeyEncrypted): AIAPIKeyPlain {
  if (!encrypted.api_key_encrypted) {
    throw new Error('Cannot decrypt empty encrypted data');
  }

  try {
    return {
      api_key: decryptFromStorage(encrypted.api_key_encrypted)
    };
  } catch (error) {
    throw new Error(
      `Failed to decrypt AI API key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Mask API key for display (show first 6 + last 8 characters)
 */
export function maskAPIKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 14) {
    return '***';
  }

  const prefix = apiKey.substring(0, 6);
  const suffix = apiKey.substring(apiKey.length - 8);
  const maskedMiddle = '*'.repeat(15);

  return `${prefix}${maskedMiddle}${suffix}`;
}

/**
 * Validate encryption setup
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  return validateBaseEncryption();
}

/**
 * Test encryption/decryption with sample data
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

export default {
  encryptAIAPIKey,
  decryptAIAPIKey,
  maskAPIKey,
  validateEncryptionSetup,
  testEncryption
};
