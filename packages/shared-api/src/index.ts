import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Type for auth token getter function - to be set by consuming apps
type GetAuthTokenFn = () => Promise<string | null>;

let getAuthToken: GetAuthTokenFn | null = null;
let apiInstance: AxiosInstance | null = null;

// Initialize the API client with configuration
export function initializeApi(config: {
  baseUrl: string;
  getAuthToken: GetAuthTokenFn;
}): AxiosInstance {
  getAuthToken = config.getAuthToken;

  apiInstance = axios.create({
    baseURL: config.baseUrl,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor to add auth token
  apiInstance.interceptors.request.use(
    async (requestConfig: InternalAxiosRequestConfig) => {
      if (getAuthToken) {
        const token = await getAuthToken();
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      return Promise.reject(error);
    }
  );

  return apiInstance;
}

// Get the API instance (throws if not initialized)
export function getApi(): AxiosInstance {
  if (!apiInstance) {
    throw new Error("API not initialized. Call initializeApi first.");
  }
  return apiInstance;
}

// Get current API URL for streaming endpoints
export function getApiUrl(): string {
  if (!apiInstance) {
    throw new Error("API not initialized. Call initializeApi first.");
  }
  return apiInstance.defaults.baseURL || "";
}

// Get current auth token for streaming
export async function getCurrentAuthToken(): Promise<string | null> {
  if (!getAuthToken) return null;
  return getAuthToken();
}

// ============================================
// API Functions
// ============================================

// Biomarkers
export const biomarkersApi = {
  list: (params?: { category?: string; name?: string; limit?: number }) =>
    getApi().get("/biomarkers", { params }),
  get: (id: string) => getApi().get(`/biomarkers/${id}`),
  getHistory: (name: string) => getApi().get(`/biomarkers/history/${name}`),
  create: (data: unknown) => getApi().post("/biomarkers", data),
  createBulk: (biomarkers: unknown[]) => getApi().post("/biomarkers/bulk", { biomarkers }),
  update: (id: string, data: unknown) => getApi().put(`/biomarkers/${id}`, data),
  delete: (id: string) => getApi().delete(`/biomarkers/${id}`),
  deleteBulk: (ids: string[]) => getApi().delete("/biomarkers/bulk", { data: { ids } }),
};

// Biomarker Stars
export const biomarkerStarsApi = {
  list: () => getApi().get("/biomarkers/stars"),
  isStarred: (biomarkerName: string) => getApi().get(`/biomarkers/stars/${encodeURIComponent(biomarkerName)}`),
  star: (data: { biomarker_name: string; starred_by?: 'user' | 'ai'; ai_reason?: string }) =>
    getApi().post("/biomarkers/stars", data),
  unstar: (biomarkerName: string) => getApi().delete(`/biomarkers/stars/${encodeURIComponent(biomarkerName)}`),
};

// Biomarker Notes
export const biomarkerNotesApi = {
  list: (params?: { biomarker_name?: string }) => getApi().get("/biomarkers/notes", { params }),
  getForBiomarker: (biomarkerName: string) => getApi().get(`/biomarkers/notes/${encodeURIComponent(biomarkerName)}`),
  create: (data: { biomarker_name: string; content: string; created_by?: 'user' | 'ai'; ai_context?: string }) =>
    getApi().post("/biomarkers/notes", data),
  update: (id: string, data: { content: string }) => getApi().put(`/biomarkers/notes/${id}`, data),
  delete: (id: string) => getApi().delete(`/biomarkers/notes/${id}`),
};

// Supplements
export const supplementsApi = {
  list: (params?: { category?: string; is_active?: boolean }) =>
    getApi().get("/supplements", { params }),
  get: (id: string) => getApi().get(`/supplements/${id}`),
  create: (data: unknown) => getApi().post("/supplements", data),
  createBulk: (supplements: unknown[]) => getApi().post("/supplements/bulk", { supplements }),
  update: (id: string, data: unknown) => getApi().put(`/supplements/${id}`, data),
  toggle: (id: string) => getApi().patch(`/supplements/${id}/toggle`),
  delete: (id: string) => getApi().delete(`/supplements/${id}`),
};

// Equipment
export const equipmentApi = {
  list: (params?: { category?: string; is_active?: boolean }) =>
    getApi().get("/equipment", { params }),
  get: (id: string) => getApi().get(`/equipment/${id}`),
  getDuplicates: () => getApi().get("/equipment/duplicates"),
  checkDuplicate: (data: { name: string; brand?: string; model?: string; excludeId?: string }) =>
    getApi().post("/equipment/check-duplicate", data),
  create: (data: unknown, skipDuplicateCheck?: boolean) =>
    getApi().post("/equipment", data, { params: skipDuplicateCheck ? { skipDuplicateCheck: 'true' } : undefined }),
  createBulk: (equipment: unknown[], skipDuplicateCheck?: boolean) =>
    getApi().post("/equipment/bulk", { equipment, skipDuplicateCheck }),
  update: (id: string, data: unknown) => getApi().put(`/equipment/${id}`, data),
  toggle: (id: string) => getApi().patch(`/equipment/${id}/toggle`),
  delete: (id: string) => getApi().delete(`/equipment/${id}`),
};

// Routines
export const routinesApi = {
  list: () => getApi().get("/routines"),
  get: (id: string) => getApi().get(`/routines/${id}`),
  create: (data: unknown) => getApi().post("/routines", data),
  update: (id: string, data: unknown) => getApi().put(`/routines/${id}`, data),
  delete: (id: string) => getApi().delete(`/routines/${id}`),
};

// Goals
export const goalsApi = {
  list: (params?: { status?: string }) => getApi().get("/goals", { params }),
  get: (id: string) => getApi().get(`/goals/${id}`),
  create: (data: unknown) => getApi().post("/goals", data),
  update: (id: string, data: unknown) => getApi().put(`/goals/${id}`, data),
  delete: (id: string) => getApi().delete(`/goals/${id}`),
};

// AI
export const aiApi = {
  extractBiomarkers: (data: { image_base64?: string; images_base64?: string[]; text_content?: string; source_type: "image" | "text" }) =>
    getApi().post("/ai/extract-biomarkers", data),
  extractSupplements: (data: { image_base64?: string; text_content?: string; source_type: "image" | "text"; product_url?: string }) =>
    getApi().post("/ai/extract-supplements", data),

  // Streaming supplement extraction for real-time progress
  extractSupplementsStream: async (
    data: { text_content: string; source_type: "image" | "text"; product_url?: string },
    onProgress: (event: { step: string; message?: string; field?: string; value?: string; confidence?: number; fields?: Array<{ key: string; status: string; confidence?: number }>; [key: string]: unknown }) => void,
    onComplete: (result: unknown) => void,
    onError: (error: string) => void
  ) => {
    const accessToken = await getCurrentAuthToken();
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/ai/extract-supplements/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Stream error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.step === 'complete') {
                onComplete(event.data);
              } else if (event.step === 'error') {
                onError(event.message);
                return;
              } else {
                onProgress(event);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Stream failed';
      onError(errorMessage);
    }
  },
  extractEquipment: (data: { text_content: string }) =>
    getApi().post("/ai/extract-equipment", data),
  analyzeBiomarkerTrend: (data: {
    biomarkerName: string;
    currentValue: number;
    unit: string;
    optimalRange: { low: number; high: number };
    trendDirection: string;
    percentChange: number | null;
    history: Array<{ value: number; date: string }>;
  }) => getApi().post("/ai/analyze-biomarker-trend", data),
  chat: (data: { message: string; context?: string; include_user_data?: boolean; biomarker_name?: string; title?: string }) =>
    getApi().post("/ai/chat", data),
  // Streaming chat for real-time responses
  chatStream: async (
    data: { message: string; context?: string; include_user_data?: boolean; biomarker_name?: string; title?: string },
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ) => {
    const accessToken = await getCurrentAuthToken();
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Stream error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.error) {
                onError(parsed.error);
                return;
              }
              if (parsed.text) {
                onChunk(parsed.text);
              }
              if (parsed.done) {
                onDone();
                return;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      onDone();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Stream failed';
      onError(errorMessage);
    }
  },
  getConversations: (params?: { context?: string; biomarker_name?: string; limit?: number }) =>
    getApi().get("/ai/conversations", { params }),
  protocolAnalysis: (data: { biomarkerName?: string; question?: string }) =>
    getApi().post("/ai/protocol-analysis", data),
};

// AI API Keys
export const aiApiKeysApi = {
  list: () => getApi().get("/ai-api-keys"),
  get: (id: string) => getApi().get(`/ai-api-keys/${id}`),
  create: (data: { provider: string; key_name: string; api_key: string }) =>
    getApi().post("/ai-api-keys", data),
  update: (id: string, data: unknown) => getApi().patch(`/ai-api-keys/${id}`, data),
  delete: (id: string) => getApi().delete(`/ai-api-keys/${id}`),
  test: (id: string) => getApi().post(`/ai-api-keys/${id}/test`),
  togglePrimary: (id: string) => getApi().post(`/ai-api-keys/${id}/toggle-primary`),
  healthCheckAll: () => getApi().post("/ai-api-keys/health-check-all"),
};

// Change Log
export const changeLogApi = {
  list: (params?: { change_type?: string; limit?: number }) =>
    getApi().get("/changelog", { params }),
  create: (data: unknown) => getApi().post("/changelog", data),
};

// Protocol Docs
export const protocolDocsApi = {
  list: (params?: { category?: string }) => getApi().get("/protocol-docs", { params }),
  get: (id: string) => getApi().get(`/protocol-docs/${id}`),
  create: (data: unknown) => getApi().post("/protocol-docs", data),
  update: (id: string, data: unknown) => getApi().put(`/protocol-docs/${id}`, data),
  delete: (id: string) => getApi().delete(`/protocol-docs/${id}`),
};

// Users
export const usersApi = {
  me: () => getApi().get("/users/me"),
  updateProfile: (data: { name?: string; avatar_url?: string; timezone?: string }) =>
    getApi().put("/users/me", data),
};

// User Links (Multi-user sharing)
export const userLinksApi = {
  list: () => getApi().get("/users/links"),
  invite: (data: { email?: string; permission: string }) =>
    getApi().post("/users/links/invite", data),
  accept: (code: string) => getApi().post("/users/links/accept", { code }),
  revoke: (id: string) => getApi().delete(`/users/links/${id}`),
};

// Eight Sleep
export const eightSleepApi = {
  // Connection
  connect: (data: { email: string; password: string; sync_time?: string; sync_timezone?: string }) =>
    getApi().post("/eight-sleep/connect", data),
  disconnect: () => getApi().delete("/eight-sleep/disconnect"),
  getStatus: () => getApi().get("/eight-sleep/status"),

  // Sync
  sync: (data?: { from_date?: string; to_date?: string; initial?: boolean }) =>
    getApi().post("/eight-sleep/sync", data || {}),

  // Sleep data
  getSessions: (params?: { from_date?: string; to_date?: string; limit?: number; offset?: number }) =>
    getApi().get("/eight-sleep/sessions", { params }),
  getSession: (id: string) => getApi().get(`/eight-sleep/sessions/${id}`),

  // Analysis
  getAnalysis: (days?: number) => getApi().get("/eight-sleep/analysis", { params: { days } }),
  getTrends: (days?: number) => getApi().get("/eight-sleep/trends", { params: { days } }),

  // Correlations
  getCorrelations: (days?: number) => getApi().get("/eight-sleep/correlations", { params: { days } }),
  getCorrelationSummary: (days?: number) => getApi().get("/eight-sleep/correlations/summary", { params: { days } }),
  getFactorCorrelations: (days?: number) => getApi().get("/eight-sleep/correlations/factors", { params: { days } }),
  buildCorrelations: (days?: number) => getApi().post("/eight-sleep/correlations/build", { days }),

  // Settings
  updateSettings: (data: { sync_enabled?: boolean; sync_time?: string; sync_timezone?: string }) =>
    getApi().patch("/eight-sleep/settings", data),
  getTimezones: () => getApi().get("/eight-sleep/timezones"),
};

// Access Tokens
export const accessTokensApi = {
  list: () => getApi().get("/access-tokens"),
  create: (data: { name: string; scopes?: string[]; expires_in_days?: number }) =>
    getApi().post("/access-tokens", data),
  delete: (id: string) => getApi().delete(`/access-tokens/${id}`),
  toggle: (id: string) => getApi().patch(`/access-tokens/${id}/toggle`),
  test: (token: string) => getApi().post("/access-tokens/test", { token }),
};

// Re-export types
export type { AxiosInstance } from 'axios';
