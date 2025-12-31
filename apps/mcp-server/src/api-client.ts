import { config } from './config';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class SingularityApiClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = config.apiBaseUrl;
    this.token = config.apiToken;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json() as ApiResponse<T>;

    if (!response.ok || !json.success) {
      throw new Error(json.error || json.message || `API error: ${response.status}`);
    }

    return json.data as T;
  }

  // Biomarkers
  async getBiomarkers(options?: {
    category?: string;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.date_from) params.append('date_from', options.date_from);
    if (options?.date_to) params.append('date_to', options.date_to);

    const query = params.toString();
    return this.request<any[]>('GET', `/biomarkers${query ? `?${query}` : ''}`);
  }

  async getBiomarkerHistory(name: string) {
    return this.request<any[]>('GET', `/biomarkers/history/${encodeURIComponent(name)}`);
  }

  async createBiomarker(data: {
    name: string;
    value: number;
    unit: string;
    date_tested: string;
    category?: string;
    reference_range_low?: number;
    reference_range_high?: number;
    notes?: string;
  }) {
    return this.request<any>('POST', '/biomarkers', data);
  }

  // Supplements
  async getSupplements(options?: {
    category?: string;
    active_only?: boolean;
  }) {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.active_only) params.append('is_active', 'true');

    const query = params.toString();
    return this.request<any[]>('GET', `/supplements${query ? `?${query}` : ''}`);
  }

  async createSupplement(data: {
    name: string;
    brand?: string;
    dose?: string;
    category?: string;
    timing?: string;
    frequency?: string;
    notes?: string;
  }) {
    return this.request<any>('POST', '/supplements', data);
  }

  // Routines
  async getRoutines() {
    return this.request<any[]>('GET', '/routines');
  }

  // Goals
  async getGoals(options?: {
    status?: 'active' | 'achieved' | 'paused';
    category?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.category) params.append('category', options.category);

    const query = params.toString();
    return this.request<any[]>('GET', `/goals${query ? `?${query}` : ''}`);
  }

  async createGoal(data: {
    title: string;
    category?: string;
    target_biomarker?: string;
    target_value?: number;
    direction: 'increase' | 'decrease' | 'maintain';
    priority?: number;
    notes?: string;
  }) {
    return this.request<any>('POST', '/goals', data);
  }

  // Protocol Docs / Knowledge Base
  async getProtocolDocs(options?: { category?: string }) {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);

    const query = params.toString();
    return this.request<any[]>('GET', `/protocol-docs${query ? `?${query}` : ''}`);
  }

  async searchProtocolDocs(query: string) {
    return this.request<any[]>('GET', `/protocol-docs/search?q=${encodeURIComponent(query)}`);
  }

  async createProtocolDoc(data: {
    title: string;
    content: string;
    category: 'routine' | 'biomarkers' | 'supplements' | 'goals' | 'reference' | 'other';
  }) {
    return this.request<any>('POST', '/protocol-docs', data);
  }

  // Sleep data (Eight Sleep)
  async getSleepSessions(options?: { limit?: number }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());

    const query = params.toString();
    return this.request<any[]>('GET', `/eight-sleep/sessions${query ? `?${query}` : ''}`);
  }

  async getSleepAnalysis() {
    return this.request<any>('GET', '/eight-sleep/analysis');
  }
}

export const apiClient = new SingularityApiClient();
