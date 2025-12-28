/**
 * AI API Key Service
 * Mobile service for managing AI API keys
 */

import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session.data.session?.access_token) {
    headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
  }

  return headers;
}

export interface AIAPIKey {
  id: string;
  user_id: string;
  provider: 'anthropic' | 'openai' | 'perplexity';
  key_name: string;
  api_key_masked?: string;
  is_primary: boolean;
  is_active: boolean;
  health_status: 'healthy' | 'unhealthy' | 'warning' | 'critical' | 'unknown';
  consecutive_failures: number;
  last_health_check: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAIAPIKeyRequest {
  provider: string;
  key_name: string;
  api_key: string;
  is_primary?: boolean;
}

export interface UpdateAIAPIKeyRequest {
  key_name?: string;
  api_key?: string;
  is_primary?: boolean;
  is_active?: boolean;
}

export interface TestResult {
  success: boolean;
  provider: string;
  test_timestamp: string;
  response_time_ms?: number;
  error?: string;
}

export async function getAIAPIKeys(): Promise<AIAPIKey[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys`, {
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch AI API keys');
  const json = await response.json();
  return json.data || [];
}

export async function getAIAPIKey(id: string): Promise<AIAPIKey> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys/${id}`, {
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch AI API key');
  const json = await response.json();
  return json.data;
}

export async function createAIAPIKey(data: CreateAIAPIKeyRequest): Promise<AIAPIKey> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create AI API key');
  }
  const json = await response.json();
  return json.data;
}

export async function updateAIAPIKey(id: string, data: UpdateAIAPIKeyRequest): Promise<AIAPIKey> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys/${id}`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update AI API key');
  const json = await response.json();
  return json.data;
}

export async function deleteAIAPIKey(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete AI API key');
}

export async function testAIAPIKey(id: string): Promise<TestResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys/${id}/test`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });
  const json = await response.json();
  return json.data;
}

export async function togglePrimaryKey(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ai-api-keys/${id}/toggle-primary`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to toggle primary key');
}
