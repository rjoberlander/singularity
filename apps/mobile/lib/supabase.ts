import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Get environment variables (Expo uses EXPO_PUBLIC_ prefix)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Demo mode check - if no credentials, we'll work in demo mode
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

// Create Supabase client (or mock for demo mode)
export const supabase = isDemoMode
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

// Mock client for demo mode
function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: async () => ({
        data: null,
        error: { message: 'Demo mode - authentication disabled' }
      }),
      signUp: async () => ({
        data: null,
        error: { message: 'Demo mode - registration disabled' }
      }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ data: [], error: null }),
        }),
        order: () => ({ data: [], error: null }),
      }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
  } as any;
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferences: any;
          onboarding_completed: boolean;
          onboarding_step: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      biomarkers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          value: number;
          unit: string;
          reference_range_low: number | null;
          reference_range_high: number | null;
          optimal_range_low: number | null;
          optimal_range_high: number | null;
          test_date: string;
          source: string | null;
          notes: string | null;
          created_at: string;
        };
      };
      supplements: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          dose: string;
          timing: string;
          frequency: string;
          is_active: boolean;
          price_per_serving: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          time_of_day: string;
          days_of_week: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      routine_items: {
        Row: {
          id: string;
          routine_id: string;
          title: string;
          time: string | null;
          duration: string | null;
          linked_supplement_id: string | null;
          order_index: number;
          created_at: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string | null;
          target_biomarker_id: string | null;
          target_value: number | null;
          direction: 'increase' | 'decrease' | 'maintain';
          status: 'active' | 'achieved' | 'paused';
          progress: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

export type SupabaseClient = typeof supabase;
