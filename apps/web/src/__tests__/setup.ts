import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api/v1';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user-id', email: 'test@example.com' }
          }
        }
      }),
      getUser: () => Promise.resolve({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'new-id', ...data }, error: null }),
        }),
      }),
      update: (data: any) => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'updated-id', ...data }, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}));
