/**
 * Singularity App Configuration
 *
 * This is a single-user/family app. No workspace concept needed.
 * Configuration is simplified for the health tracking use case.
 */

// App name and version
export const APP_NAME = 'Singularity';
export const APP_VERSION = '1.0.1';

// Storage bucket name for file uploads
export const STORAGE_BUCKET = 'singularity-uploads';

// Allowed file types for lab report uploads
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf'
];

// Max file size for uploads (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// API rate limiting
export const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
};

// Claude AI settings
export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192, // Increased to handle multi-image biomarker extraction
  temperature: 0.1 // Low temperature for accurate extraction
};
