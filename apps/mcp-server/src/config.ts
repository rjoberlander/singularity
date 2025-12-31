import * as dotenv from 'dotenv';

dotenv.config();

export interface Config {
  // API mode - connect via Singularity API with user token
  apiBaseUrl: string;
  apiToken: string;

  // Optional: Direct Supabase mode for personal/dev use
  supabaseUrl?: string;
  supabaseKey?: string;
  userId?: string;

  // Server settings
  readOnly: boolean;
}

export function getConfig(): Config {
  const apiBaseUrl = process.env.SINGULARITY_API_URL || 'http://localhost:3001/api/v1';
  const apiToken = process.env.SINGULARITY_API_TOKEN || '';

  if (!apiToken) {
    console.error('Warning: SINGULARITY_API_TOKEN not set. API calls will fail.');
  }

  return {
    apiBaseUrl,
    apiToken,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    userId: process.env.SINGULARITY_USER_ID,
    readOnly: process.env.SINGULARITY_READ_ONLY === 'true',
  };
}

export const config = getConfig();
