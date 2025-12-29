/**
 * Supabase Admin API Helper
 *
 * Uses the service role key to perform admin operations
 * like auto-confirming users or generating confirmation links.
 */

import { createClient } from '@supabase/supabase-js';

// Load from environment or use the values from .env files
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fcsiqoebtpfhzreamotp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg';

// Create admin client with service role (bypasses RLS)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get user by email using admin API
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return data.users.find(u => u.email === email);
}

/**
 * Auto-confirm a user's email address using the admin API
 * This bypasses the need for email confirmation in tests
 */
export async function confirmUserEmail(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to confirm user email: ${error.message}`);
  }
}

/**
 * Generate an email confirmation link for a user
 */
export async function generateConfirmationLink(email: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
  });

  if (error) {
    throw new Error(`Failed to generate confirmation link: ${error.message}`);
  }

  return data.properties.action_link;
}

/**
 * Delete a test user by email (cleanup after tests)
 */
export async function deleteUserByEmail(email: string): Promise<void> {
  const user = await getUserByEmail(email);

  if (user) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}

/**
 * Create a user and auto-confirm them (for testing)
 */
export async function createConfirmedUser(email: string, password: string, metadata?: { name?: string }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm
    user_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data.user;
}

/**
 * Wait for a user to exist in the database
 */
export async function waitForUser(email: string, timeout = 10000): Promise<ReturnType<typeof getUserByEmail>> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const user = await getUserByEmail(email);
    if (user) {
      return user;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Timeout waiting for user ${email} to be created`);
}
