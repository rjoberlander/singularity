/**
 * Encryption utilities for secure storage of API keys
 * Uses AES-256-GCM encryption
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 32;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Derive key from master key using PBKDF2
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 10000, 32, 'sha512');
}

/**
 * Encrypt sensitive data
 */
export function encryptData(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty data');
  }

  const masterKey = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64')
  };
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: EncryptedData): string {
  if (!encryptedData || !encryptedData.encrypted) {
    throw new Error('Cannot decrypt empty data');
  }

  const masterKey = getEncryptionKey();
  const salt = Buffer.from(encryptedData.salt, 'base64');
  const key = deriveKey(masterKey, salt);
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt a string and return as JSON string for database storage
 */
export function encryptForStorage(plaintext: string): string {
  const encrypted = encryptData(plaintext);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt a JSON string from database storage
 */
export function decryptFromStorage(encryptedJson: string): string {
  if (!encryptedJson) {
    throw new Error('Cannot decrypt empty encrypted data');
  }

  let encryptedData: EncryptedData;
  try {
    encryptedData = JSON.parse(encryptedJson);
  } catch (error) {
    throw new Error('Invalid encrypted data format');
  }

  return decryptData(encryptedData);
}

/**
 * Test encryption/decryption
 */
export function testEncryption(): boolean {
  try {
    const testData = 'Test encryption data';
    const encrypted = encryptForStorage(testData);
    const decrypted = decryptFromStorage(encrypted);
    return testData === decrypted;
  } catch (error) {
    console.error('Encryption test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Validate encryption setup
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  try {
    getEncryptionKey();
    const testResult = testEncryption();
    if (!testResult) {
      return { valid: false, error: 'Encryption test failed' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default {
  encryptData,
  decryptData,
  encryptForStorage,
  decryptFromStorage,
  testEncryption,
  validateEncryptionSetup
};
