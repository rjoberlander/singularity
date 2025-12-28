import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Supabase environment variables not configured. Using placeholder values.');
  console.warn('Missing:', {
    SUPABASE_URL: !process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create Supabase client for frontend authentication (with anon key)
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key').trim().replace(/\s+/g, '');

if (!process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase anon key not configured. Frontend auth may not work.');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;