import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { createClient } from "./supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Don't auto-redirect on 401 - let individual components handle auth errors
    // Auto-redirecting causes issues when some API calls fail due to missing data (not auth)
    return Promise.reject(error);
  }
);

export default api;

// ============================================
// API Functions
// ============================================

// Biomarkers
export const biomarkersApi = {
  list: (params?: { category?: string; name?: string; limit?: number }) =>
    api.get("/biomarkers", { params }),
  get: (id: string) => api.get(`/biomarkers/${id}`),
  getHistory: (name: string) => api.get(`/biomarkers/history/${name}`),
  create: (data: any) => api.post("/biomarkers", data),
  createBulk: (biomarkers: any[]) => api.post("/biomarkers/bulk", { biomarkers }),
  update: (id: string, data: any) => api.put(`/biomarkers/${id}`, data),
  delete: (id: string) => api.delete(`/biomarkers/${id}`),
  deleteBulk: (ids: string[]) => api.delete("/biomarkers/bulk", { data: { ids } }),
};

// Biomarker Stars
export const biomarkerStarsApi = {
  list: () => api.get("/biomarkers/stars"),
  isStarred: (biomarkerName: string) => api.get(`/biomarkers/stars/${encodeURIComponent(biomarkerName)}`),
  star: (data: { biomarker_name: string; starred_by?: 'user' | 'ai'; ai_reason?: string }) =>
    api.post("/biomarkers/stars", data),
  unstar: (biomarkerName: string) => api.delete(`/biomarkers/stars/${encodeURIComponent(biomarkerName)}`),
};

// Biomarker Notes
export const biomarkerNotesApi = {
  list: (params?: { biomarker_name?: string }) => api.get("/biomarkers/notes", { params }),
  getForBiomarker: (biomarkerName: string) => api.get(`/biomarkers/notes/${encodeURIComponent(biomarkerName)}`),
  create: (data: { biomarker_name: string; content: string; created_by?: 'user' | 'ai'; ai_context?: string }) =>
    api.post("/biomarkers/notes", data),
  update: (id: string, data: { content: string }) => api.put(`/biomarkers/notes/${id}`, data),
  delete: (id: string) => api.delete(`/biomarkers/notes/${id}`),
};

// Supplements
export const supplementsApi = {
  list: (params?: { category?: string; is_active?: boolean }) =>
    api.get("/supplements", { params }),
  get: (id: string) => api.get(`/supplements/${id}`),
  create: (data: any) => api.post("/supplements", data),
  createBulk: (supplements: any[]) => api.post("/supplements/bulk", { supplements }),
  update: (id: string, data: any) => api.put(`/supplements/${id}`, data),
  toggle: (id: string) => api.patch(`/supplements/${id}/toggle`),
  delete: (id: string) => api.delete(`/supplements/${id}`),
};

// Equipment
export const equipmentApi = {
  list: (params?: { category?: string; is_active?: boolean }) =>
    api.get("/equipment", { params }),
  get: (id: string) => api.get(`/equipment/${id}`),
  getDuplicates: () => api.get("/equipment/duplicates"),
  checkDuplicate: (data: { name: string; brand?: string; model?: string; excludeId?: string }) =>
    api.post("/equipment/check-duplicate", data),
  create: (data: any, skipDuplicateCheck?: boolean) =>
    api.post("/equipment", data, { params: skipDuplicateCheck ? { skipDuplicateCheck: 'true' } : undefined }),
  createBulk: (equipment: any[], skipDuplicateCheck?: boolean) =>
    api.post("/equipment/bulk", { equipment, skipDuplicateCheck }),
  update: (id: string, data: any) => api.put(`/equipment/${id}`, data),
  toggle: (id: string) => api.patch(`/equipment/${id}/toggle`),
  delete: (id: string) => api.delete(`/equipment/${id}`),
};

// Routines
export const routinesApi = {
  list: () => api.get("/routines"),
  get: (id: string) => api.get(`/routines/${id}`),
  create: (data: any) => api.post("/routines", data),
  update: (id: string, data: any) => api.put(`/routines/${id}`, data),
  delete: (id: string) => api.delete(`/routines/${id}`),
};

// Goals
export const goalsApi = {
  list: (params?: { status?: string }) => api.get("/goals", { params }),
  get: (id: string) => api.get(`/goals/${id}`),
  create: (data: any) => api.post("/goals", data),
  update: (id: string, data: any) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

// AI
export const aiApi = {
  extractBiomarkers: (data: { image_base64?: string; images_base64?: string[]; text_content?: string; source_type: "image" | "text" }) =>
    api.post("/ai/extract-biomarkers", data),
  extractSupplements: (data: { image_base64?: string; text_content?: string; source_type: "image" | "text"; product_url?: string }) =>
    api.post("/ai/extract-supplements", data),

  // Streaming supplement extraction for real-time progress
  extractSupplementsStream: async (
    data: { text_content: string; source_type: "image" | "text"; product_url?: string },
    onProgress: (event: { step: string; [key: string]: any }) => void,
    onComplete: (result: any) => void,
    onError: (error: string) => void
  ) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    try {
      const response = await fetch(`${API_URL}/ai/extract-supplements/stream`, {
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
    } catch (error: any) {
      onError(error.message || 'Stream failed');
    }
  },
  extractEquipment: (data: { text_content: string }) =>
    api.post("/ai/extract-equipment", data),
  analyzeBiomarkerTrend: (data: {
    biomarkerName: string;
    currentValue: number;
    unit: string;
    optimalRange: { low: number; high: number };
    trendDirection: string;
    percentChange: number | null;
    history: Array<{ value: number; date: string }>;
  }) => api.post("/ai/analyze-biomarker-trend", data),
  chat: (data: { message: string; context?: string; include_user_data?: boolean; biomarker_name?: string; title?: string }) =>
    api.post("/ai/chat", data),
  // Streaming chat for real-time responses
  chatStream: async (
    data: { message: string; context?: string; include_user_data?: boolean; biomarker_name?: string; title?: string },
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    try {
      const response = await fetch(`${API_URL}/ai/chat/stream`, {
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
    } catch (error: any) {
      onError(error.message || 'Stream failed');
    }
  },
  getConversations: (params?: { context?: string; biomarker_name?: string; limit?: number }) =>
    api.get("/ai/conversations", { params }),
  protocolAnalysis: (data: { biomarkerName?: string; question?: string }) =>
    api.post("/ai/protocol-analysis", data),
};

// AI API Keys
export const aiApiKeysApi = {
  list: () => api.get("/ai-api-keys"),
  get: (id: string) => api.get(`/ai-api-keys/${id}`),
  create: (data: { provider: string; key_name: string; api_key: string }) =>
    api.post("/ai-api-keys", data),
  update: (id: string, data: any) => api.patch(`/ai-api-keys/${id}`, data),
  delete: (id: string) => api.delete(`/ai-api-keys/${id}`),
  test: (id: string) => api.post(`/ai-api-keys/${id}/test`),
  togglePrimary: (id: string) => api.post(`/ai-api-keys/${id}/toggle-primary`),
  healthCheckAll: () => api.post("/ai-api-keys/health-check-all"),
};

// Change Log
export const changeLogApi = {
  list: (params?: { change_type?: string; limit?: number }) =>
    api.get("/changelog", { params }),
  create: (data: any) => api.post("/changelog", data),
};

// Protocol Docs
export const protocolDocsApi = {
  list: (params?: { category?: string }) => api.get("/protocol-docs", { params }),
  get: (id: string) => api.get(`/protocol-docs/${id}`),
  create: (data: any) => api.post("/protocol-docs", data),
  update: (id: string, data: any) => api.put(`/protocol-docs/${id}`, data),
  delete: (id: string) => api.delete(`/protocol-docs/${id}`),
};

// Users
export const usersApi = {
  me: () => api.get("/users/me"),
  updateProfile: (data: { name?: string; avatar_url?: string; timezone?: string }) =>
    api.put("/users/me", data),
};

// User Links (Multi-user sharing)
export const userLinksApi = {
  list: () => api.get("/users/links"),
  invite: (data: { email?: string; permission: string }) =>
    api.post("/users/links/invite", data),
  accept: (code: string) => api.post("/users/links/accept", { code }),
  revoke: (id: string) => api.delete(`/users/links/${id}`),
};

// Eight Sleep
export const eightSleepApi = {
  // Connection
  connect: (data: { email: string; password: string; sync_time?: string; sync_timezone?: string }) =>
    api.post("/eight-sleep/connect", data),
  disconnect: () => api.delete("/eight-sleep/disconnect"),
  getStatus: () => api.get("/eight-sleep/status"),

  // Sync
  sync: (data?: { from_date?: string; to_date?: string; initial?: boolean }) =>
    api.post("/eight-sleep/sync", data || {}),

  // Sleep data
  getSessions: (params?: { from_date?: string; to_date?: string; limit?: number; offset?: number }) =>
    api.get("/eight-sleep/sessions", { params }),
  getSession: (id: string) => api.get(`/eight-sleep/sessions/${id}`),

  // Analysis
  getAnalysis: (days?: number) => api.get("/eight-sleep/analysis", { params: { days } }),
  getTrends: (days?: number) => api.get("/eight-sleep/trends", { params: { days } }),

  // Correlations
  getCorrelations: (days?: number) => api.get("/eight-sleep/correlations", { params: { days } }),
  getCorrelationSummary: (days?: number) => api.get("/eight-sleep/correlations/summary", { params: { days } }),
  getFactorCorrelations: (days?: number) => api.get("/eight-sleep/correlations/factors", { params: { days } }),
  buildCorrelations: (days?: number) => api.post("/eight-sleep/correlations/build", { days }),

  // Settings
  updateSettings: (data: { sync_enabled?: boolean; sync_time?: string; sync_timezone?: string }) =>
    api.patch("/eight-sleep/settings", data),
  getTimezones: () => api.get("/eight-sleep/timezones"),
};
