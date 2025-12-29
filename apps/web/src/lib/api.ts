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
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
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
  extractBiomarkers: (data: { image_base64?: string; text_content?: string; source_type: "image" | "text" }) =>
    api.post("/ai/extract-biomarkers", data),
  extractSupplements: (data: { image_base64?: string; text_content?: string; source_type: "image" | "text" }) =>
    api.post("/ai/extract-supplements", data),
  chat: (data: { message: string; context?: string; include_user_data?: boolean }) =>
    api.post("/ai/chat", data),
  getConversations: (params?: { context?: string; limit?: number }) =>
    api.get("/ai/conversations", { params }),
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
