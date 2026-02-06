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

// Facial Products (Skincare)
export const facialProductsApi = {
  list: (params?: { category?: string; is_active?: boolean; routine?: string }) =>
    getApi().get("/facial-products", { params }),
  get: (id: string) => getApi().get(`/facial-products/${id}`),
  create: (data: unknown) => getApi().post("/facial-products", data),
  createBulk: (products: unknown[]) => getApi().post("/facial-products/bulk", { products }),
  update: (id: string, data: unknown) => getApi().put(`/facial-products/${id}`, data),
  toggle: (id: string) => getApi().patch(`/facial-products/${id}/toggle`),
  delete: (id: string) => getApi().delete(`/facial-products/${id}`),
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
  extractEquipment: (data: { text_content: string }) =>
    getApi().post("/ai/extract-equipment", data),
  extractFacialProducts: (data: { image_base64?: string; text_content?: string; source_type: "image" | "text"; product_url?: string }) =>
    getApi().post("/ai/extract-facial-products", data),

  // Universal product enrichment - works for supplements, facial_products, equipment
  enrichProductStream: async (
    data: {
      product_name: string;
      brand?: string;
      product_url?: string;
      product_type: 'supplement' | 'facial_product' | 'equipment';
      existing_data?: Record<string, unknown>;
    },
    onProgress: (event: {
      step: string;
      message?: string;
      field?: string;
      value?: unknown;
      confidence?: number;
      product?: Record<string, unknown>;
      fields?: Array<{ key: string; status: string; confidence?: number }>;
      [key: string]: unknown
    }) => void,
    onComplete: (result: { data: Record<string, unknown>; field_confidence: Record<string, number> }) => void,
    onError: (error: string) => void
  ) => {
    const accessToken = await getCurrentAuthToken();
    const apiUrl = getApiUrl();

    try {
      const response = await fetch(`${apiUrl}/ai/enrich-product/stream`, {
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
                onComplete({ data: event.data, field_confidence: event.field_confidence || {} });
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
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  },

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

// Journal
export const journalApi = {
  // Entries
  list: (params?: {
    tag?: string;
    start_date?: string;
    end_date?: string;
    mood?: string;
    entry_mode?: string;
    limit?: number;
    offset?: number;
  }) => getApi().get("/journal", { params }),
  get: (id: string) => getApi().get(`/journal/${id}`),
  create: (data: {
    title?: string;
    content: string;
    entry_date?: string;
    entry_time?: string;
    location_name?: string;
    location_lat?: number;
    location_lng?: number;
    weather_condition?: string;
    weather_temp_f?: number;
    weather_icon?: string;
    mood?: string;
    mood_custom?: string;
    tags?: string[];
    entry_mode?: 'freeform' | 'guided';
    prompt_used?: string;
    is_public?: boolean;
    public_slug?: string;
    show_author?: boolean;
    show_location?: boolean;
    show_date?: boolean;
  }) => getApi().post("/journal", data),
  update: (id: string, data: unknown) => getApi().put(`/journal/${id}`, data),
  delete: (id: string) => getApi().delete(`/journal/${id}`),

  // On This Day
  onThisDay: (date?: string) =>
    getApi().get("/journal/on-this-day", { params: date ? { date } : undefined }),

  // Tags
  getTags: () => getApi().get("/journal/tags"),

  // Public entries (no auth)
  getPublic: (slug: string, password?: string) =>
    getApi().get(`/journal/public/${slug}`, { params: password ? { password } : undefined }),

  // Media
  addMedia: (entryId: string, media: Array<{
    media_type: 'image' | 'video';
    file_url: string;
    thumbnail_url?: string;
    width?: number;
    height?: number;
    duration_seconds?: number;
    file_size_bytes?: number;
    original_filename?: string;
    mime_type?: string;
  }>) => getApi().post(`/journal/${entryId}/media`, { media }),
  deleteMedia: (entryId: string, mediaId: string) =>
    getApi().delete(`/journal/${entryId}/media/${mediaId}`),
  reorderMedia: (entryId: string, mediaIds: string[]) =>
    getApi().put(`/journal/${entryId}/media/reorder`, { media_ids: mediaIds }),

  // Sharing
  updateShare: (entryId: string, settings: {
    is_public: boolean;
    password?: string;
    custom_slug?: string;
    show_author?: boolean;
    show_location?: boolean;
    show_date?: boolean;
  }) => getApi().post(`/journal/${entryId}/share`, settings),
  revokeShare: (entryId: string) => getApi().delete(`/journal/${entryId}/share`),

  // Time Capsule
  assignCapsule: (entryId: string, data: {
    recipient_ids: string[];
    delivery_date: string;
  }) => getApi().post(`/journal/${entryId}/capsule`, data),
  cancelCapsule: (entryId: string) => getApi().delete(`/journal/${entryId}/capsule`),

  // Recipients
  getRecipients: () => getApi().get("/journal/recipients/list"),
  createRecipient: (data: {
    name: string;
    relationship?: string;
    email?: string;
    phone?: string;
  }) => getApi().post("/journal/recipients", data),
  updateRecipient: (id: string, data: unknown) =>
    getApi().put(`/journal/recipients/${id}`, data),
  deleteRecipient: (id: string) => getApi().delete(`/journal/recipients/${id}`),

  // Prompts
  getRandomPrompt: (category?: string) =>
    getApi().get("/journal/prompts/random", { params: category ? { category } : undefined }),
  getMyPrompts: () => getApi().get("/journal/prompts/mine"),
  createPrompt: (data: { prompt_text: string; category?: string }) =>
    getApi().post("/journal/prompts", data),
  deletePrompt: (id: string) => getApi().delete(`/journal/prompts/${id}`),
};

// Schedule Items (Exercises & Meals)
export const scheduleItemsApi = {
  list: (params?: { item_type?: string; is_active?: boolean }) =>
    getApi().get("/schedule-items", { params }),
  get: (id: string) => getApi().get(`/schedule-items/${id}`),
  create: (data: unknown) => getApi().post("/schedule-items", data),
  update: (id: string, data: unknown) => getApi().put(`/schedule-items/${id}`, data),
  toggle: (id: string) => getApi().patch(`/schedule-items/${id}/toggle`),
  delete: (id: string) => getApi().delete(`/schedule-items/${id}`),
};

// User Diet
export const userDietApi = {
  get: () => getApi().get("/user-diet"),
  update: (data: unknown) => getApi().patch("/user-diet", data),
};

// Routine Versions (Change Log)
export const routineVersionsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    getApi().get("/routine-versions", { params }),
  get: (id: string) => getApi().get(`/routine-versions/${id}`),
  getLatest: () => getApi().get("/routine-versions/latest"),
  getCurrentSnapshot: () => getApi().get("/routine-versions/current-snapshot"),
  create: (data?: { reason?: string }) => getApi().post("/routine-versions", data || {}),
};

// Google Calendar
export const googleCalendarApi = {
  // OAuth configuration (Client ID/Secret)
  getConfig: () => getApi().get("/google-calendar/config"),
  saveConfig: (data: { client_id: string; client_secret: string; redirect_uri?: string }) =>
    getApi().post("/google-calendar/config", data),
  deleteConfig: () => getApi().delete("/google-calendar/config"),

  // OAuth flow
  getAuthUrl: (state?: string) =>
    getApi().post("/google-calendar/auth-url", { state }),
  handleCallback: (code: string) =>
    getApi().post("/google-calendar/callback", { code }),

  // Connection management
  disconnect: () => getApi().delete("/google-calendar/disconnect"),
  getStatus: () => getApi().get("/google-calendar/status"),
  testConnection: () => getApi().post("/google-calendar/test"),

  // Calendar data
  listCalendars: () => getApi().get("/google-calendar/calendars"),
  getEvents: (params?: {
    calendar_id?: string;
    time_min?: string;
    time_max?: string;
    max_results?: number;
  }) => getApi().get("/google-calendar/events", { params }),
  getTodayEvents: () => getApi().get("/google-calendar/events/today"),
  getUpcomingEvents: (days?: number) =>
    getApi().get("/google-calendar/events/upcoming", { params: { days } }),

  // Settings
  updateSettings: (data: { sync_enabled?: boolean; primary_calendar_id?: string }) =>
    getApi().patch("/google-calendar/settings", data),
};

// Travel
export const travelApi = {
  // Trips
  trips: {
    list: (params?: {
      status?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }) => getApi().get("/travel/trips", { params }),
    get: (id: string) => getApi().get(`/travel/trips/${id}`),
    getFull: (id: string) => getApi().get(`/travel/trips/${id}/full`),
    create: (data: unknown) => getApi().post("/travel/trips", data),
    update: (id: string, data: unknown) => getApi().put(`/travel/trips/${id}`, data),
    delete: (id: string) => getApi().delete(`/travel/trips/${id}`),
    duplicate: (id: string) => getApi().post(`/travel/trips/${id}/duplicate`),
    updateStatus: (id: string, status: string) =>
      getApi().patch(`/travel/trips/${id}/status`, { status }),
    updatePlanningProgress: (id: string, data: { step: string; auto_suggested?: boolean; completed?: boolean }) =>
      getApi().patch(`/travel/trips/${id}/planning-progress`, data),
  },

  // Flights
  flights: {
    list: (tripId: string) => getApi().get(`/travel/trips/${tripId}/flights`),
    get: (tripId: string, flightId: string) =>
      getApi().get(`/travel/trips/${tripId}/flights/${flightId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/flights`, data),
    update: (tripId: string, flightId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/flights/${flightId}`, data),
    delete: (tripId: string, flightId: string) =>
      getApi().delete(`/travel/trips/${tripId}/flights/${flightId}`),
    extractFromImage: (tripId: string, data: { image: string; mediaType: string }) =>
      getApi().post(`/travel/trips/${tripId}/flights/extract`, data),
  },

  // Driving
  driving: {
    list: (tripId: string) => getApi().get(`/travel/trips/${tripId}/driving`),
    get: (tripId: string, drivingId: string) =>
      getApi().get(`/travel/trips/${tripId}/driving/${drivingId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/driving`, data),
    update: (tripId: string, drivingId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/driving/${drivingId}`, data),
    delete: (tripId: string, drivingId: string) =>
      getApi().delete(`/travel/trips/${tripId}/driving/${drivingId}`),
  },

  // Segments
  segments: {
    list: (tripId: string) => getApi().get(`/travel/trips/${tripId}/segments`),
    get: (tripId: string, segmentId: string) =>
      getApi().get(`/travel/trips/${tripId}/segments/${segmentId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/segments`, data),
    update: (tripId: string, segmentId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/segments/${segmentId}`, data),
    delete: (tripId: string, segmentId: string) =>
      getApi().delete(`/travel/trips/${tripId}/segments/${segmentId}`),
    reorder: (tripId: string, segmentIds: string[]) =>
      getApi().put(`/travel/trips/${tripId}/segments/reorder`, { segment_ids: segmentIds }),
    fetchGooglePlaces: (tripId: string, segmentId: string) =>
      getApi().post(`/travel/trips/${tripId}/segments/${segmentId}/fetch-google`),
    syncDays: (segmentId: string) =>
      getApi().post(`/travel/segments/${segmentId}/sync-days`),
  },

  // Accommodations
  accommodations: {
    list: (tripId: string, params?: { segment_id?: string }) =>
      getApi().get(`/travel/trips/${tripId}/accommodations`, { params }),
    get: (tripId: string, accommodationId: string) =>
      getApi().get(`/travel/trips/${tripId}/accommodations/${accommodationId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/accommodations`, data),
    update: (tripId: string, accommodationId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/accommodations/${accommodationId}`, data),
    delete: (tripId: string, accommodationId: string) =>
      getApi().delete(`/travel/trips/${tripId}/accommodations/${accommodationId}`),
  },

  // Days
  days: {
    list: (tripId: string, params?: { segment_id?: string }) =>
      getApi().get(`/travel/trips/${tripId}/days`, { params }),
    get: (tripId: string, dayId: string) =>
      getApi().get(`/travel/trips/${tripId}/days/${dayId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/days`, data),
    update: (tripId: string, dayId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/days/${dayId}`, data),
    delete: (tripId: string, dayId: string) =>
      getApi().delete(`/travel/trips/${tripId}/days/${dayId}`),
    reorder: (tripId: string, dayIds: string[]) =>
      getApi().put(`/travel/trips/${tripId}/days/reorder`, { day_ids: dayIds }),
    generateFromDates: (tripId: string) =>
      getApi().post(`/travel/trips/${tripId}/days/generate`),
  },

  // Activities
  activities: {
    list: (tripId: string, params?: { day_id?: string; is_backup?: boolean }) =>
      getApi().get(`/travel/trips/${tripId}/activities`, { params }),
    get: (tripId: string, activityId: string) =>
      getApi().get(`/travel/trips/${tripId}/activities/${activityId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/activities`, data),
    update: (tripId: string, activityId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/activities/${activityId}`, data),
    delete: (tripId: string, activityId: string) =>
      getApi().delete(`/travel/trips/${tripId}/activities/${activityId}`),
    reorder: (tripId: string, dayId: string, activityIds: string[]) =>
      getApi().put(`/travel/trips/${tripId}/activities/reorder`, {
        day_id: dayId,
        activity_ids: activityIds,
      }),
    moveToDay: (tripId: string, activityId: string, newDayId: string) =>
      getApi().patch(`/travel/trips/${tripId}/activities/${activityId}/move`, {
        day_id: newDayId,
      }),
    toggleBackup: (tripId: string, activityId: string) =>
      getApi().patch(`/travel/trips/${tripId}/activities/${activityId}/toggle-backup`),
    fetchGooglePlaces: (tripId: string, activityId: string) =>
      getApi().post(`/travel/trips/${tripId}/activities/${activityId}/fetch-google`),
  },

  // Media
  media: {
    list: (tripId: string, params?: { parent_type?: string; parent_id?: string }) =>
      getApi().get(`/travel/trips/${tripId}/media`, { params }),
    get: (tripId: string, mediaId: string) =>
      getApi().get(`/travel/trips/${tripId}/media/${mediaId}`),
    create: (tripId: string, data: unknown) =>
      getApi().post(`/travel/trips/${tripId}/media`, data),
    createBulk: (tripId: string, mediaItems: unknown[]) =>
      getApi().post(`/travel/trips/${tripId}/media/bulk`, { media: mediaItems }),
    update: (tripId: string, mediaId: string, data: unknown) =>
      getApi().put(`/travel/trips/${tripId}/media/${mediaId}`, data),
    delete: (tripId: string, mediaId: string) =>
      getApi().delete(`/travel/trips/${tripId}/media/${mediaId}`),
    reorder: (tripId: string, parentType: string, parentId: string, mediaIds: string[]) =>
      getApi().put(`/travel/trips/${tripId}/media/reorder`, {
        parent_type: parentType,
        parent_id: parentId,
        media_ids: mediaIds,
      }),
    deduplicate: (tripId: string) =>
      getApi().post(`/travel/trips/${tripId}/media/deduplicate`),
    bulkDelete: (tripId: string, mediaIds: string[]) =>
      getApi().post(`/travel/trips/${tripId}/media/bulk-delete`, { media_ids: mediaIds }),
  },

  // Sharing
  sharing: {
    list: (tripId: string) => getApi().get(`/travel/trips/${tripId}/sharing`),
    add: (tripId: string, data: { email: string; permission?: string }) =>
      getApi().post(`/travel/trips/${tripId}/sharing`, data),
    update: (tripId: string, shareId: string, data: { permission: string }) =>
      getApi().put(`/travel/trips/${tripId}/sharing/${shareId}`, data),
    remove: (tripId: string, shareId: string) =>
      getApi().delete(`/travel/trips/${tripId}/sharing/${shareId}`),
    makePublic: (tripId: string, data?: { slug?: string; password?: string }) =>
      getApi().post(`/travel/trips/${tripId}/sharing/public`, data || {}),
    makePrivate: (tripId: string) =>
      getApi().delete(`/travel/trips/${tripId}/sharing/public`),
    getPublic: (slug: string, password?: string) =>
      getApi().get(`/travel/public/${slug}`, { params: password ? { password } : undefined }),
  },

  // Calendar Sync
  calendar: {
    syncTrip: (tripId: string, data?: { calendar_id?: string }) =>
      getApi().post(`/travel/trips/${tripId}/calendar/sync`, data || {}),
    unsyncTrip: (tripId: string) =>
      getApi().delete(`/travel/trips/${tripId}/calendar/sync`),
    syncActivity: (tripId: string, activityId: string, data?: { calendar_id?: string }) =>
      getApi().post(`/travel/trips/${tripId}/activities/${activityId}/calendar/sync`, data || {}),
    unsyncActivity: (tripId: string, activityId: string) =>
      getApi().delete(`/travel/trips/${tripId}/activities/${activityId}/calendar/sync`),
  },

  // Packing
  packing: {
    get: (tripId: string) => getApi().get(`/travel/trips/${tripId}/packing`),
    update: (tripId: string, checklist: unknown[]) =>
      getApi().put(`/travel/trips/${tripId}/packing`, { checklist }),
    toggleItem: (tripId: string, itemIndex: number) =>
      getApi().patch(`/travel/trips/${tripId}/packing/toggle`, { item_index: itemIndex }),
    addItem: (tripId: string, item: { item: string; category?: string }) =>
      getApi().post(`/travel/trips/${tripId}/packing`, item),
    removeItem: (tripId: string, itemIndex: number) =>
      getApi().delete(`/travel/trips/${tripId}/packing/${itemIndex}`),
  },

  // Settings (Family Profile, Claude Instructions)
  // Part of the trip import workflow - see docs/travel-module-prd.md
  settings: {
    get: () => getApi().get("/travel/settings"),
    update: (data: {
      claude_instructions?: string;
      family_profile?: unknown;
      output_template?: unknown;
    }) => getApi().put("/travel/settings", data),
    updateClaudeInstructions: (claude_instructions: string) =>
      getApi().patch("/travel/settings/claude-instructions", { claude_instructions }),
    updateFamilyProfile: (family_profile: unknown) =>
      getApi().patch("/travel/settings/family-profile", { family_profile }),
  },

  // Import (JSON from Claude research)
  // Part of the trip import workflow - see docs/travel-module-prd.md
  import: {
    validate: (payload: unknown) =>
      getApi().post("/travel/import/validate", payload),
    import: (data: { payload: unknown; options?: unknown }) =>
      getApi().post("/travel/import", data),
    getTemplate: () => getApi().get("/travel/import/template"),
    meals: (data: { payload: unknown; trip_id: string }) =>
      getApi().post("/travel/import/meals", data),
  },

  // Research Items
  // Part of the trip import workflow - see docs/travel-module-prd.md
  researchItems: {
    list: (tripId: string, params?: {
      status?: string;
      item_type?: string;
      priority?: string;
      segment_id?: string;
      assigned_day?: number;
    }) => getApi().get(`/travel/trips/${tripId}/research-items`, { params }),
    get: (id: string) => getApi().get(`/travel/research-items/${id}`),
    update: (id: string, data: unknown) =>
      getApi().patch(`/travel/research-items/${id}`, data),
    delete: (id: string) => getApi().delete(`/travel/research-items/${id}`),
    bulkUpdate: (ids: string[], updates: unknown) =>
      getApi().post("/travel/research-items/bulk-update", { ids, updates }),
    importToActivity: (id: string, dayId: string) =>
      getApi().post(`/travel/research-items/${id}/import-to-activity`, { day_id: dayId }),
    // Phase 2: Expansion (calls Claude API)
    expand: (id: string) =>
      getApi().post(`/travel/research-items/${id}/expand`),
    expandBulk: (ids: string[]) =>
      getApi().post("/travel/research-items/expand-bulk", { ids }),
  },

  // Schedule Assembly (Phase 4)
  schedule: {
    get: (tripId: string) =>
      getApi().get(`/travel/trips/${tripId}/schedule`),
    assemble: (tripId: string, options?: { validateOnly?: boolean; skipEnrichment?: boolean }) => {
      const params = new URLSearchParams();
      if (options?.validateOnly) params.append('validate_only', 'true');
      if (options?.skipEnrichment) params.append('skip_enrichment', 'true');
      const queryString = params.toString();
      return getApi().post(`/travel/trips/${tripId}/assemble-schedule${queryString ? `?${queryString}` : ''}`);
    },
  },
};

// RV Locations
export const rvLocationsApi = {
  // Locations CRUD
  list: (params?: {
    category?: string;
    status?: string;
    state?: string;
    tags?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => getApi().get("/rv-locations", { params }),
  get: (id: string) => getApi().get(`/rv-locations/${id}`),
  getFull: (id: string) => getApi().get(`/rv-locations/${id}/full`),
  create: (data: unknown) => getApi().post("/rv-locations", data),
  update: (id: string, data: unknown) => getApi().put(`/rv-locations/${id}`, data),
  delete: (id: string) => getApi().delete(`/rv-locations/${id}`),

  // Activities
  activities: {
    list: (locationId: string) =>
      getApi().get(`/rv-locations/${locationId}/activities`),
    create: (locationId: string, data: unknown) =>
      getApi().post(`/rv-locations/${locationId}/activities`, data),
    update: (locationId: string, activityId: string, data: unknown) =>
      getApi().put(`/rv-locations/${locationId}/activities/${activityId}`, data),
    delete: (locationId: string, activityId: string) =>
      getApi().delete(`/rv-locations/${locationId}/activities/${activityId}`),
  },

  // Media
  media: {
    list: (locationId: string) =>
      getApi().get(`/rv-locations/${locationId}/media`),
    create: (locationId: string, data: unknown) =>
      getApi().post(`/rv-locations/${locationId}/media`, data),
    createBulk: (locationId: string, media: unknown[]) =>
      getApi().post(`/rv-locations/${locationId}/media/bulk`, { media }),
    delete: (locationId: string, mediaId: string) =>
      getApi().delete(`/rv-locations/${locationId}/media/${mediaId}`),
    toggleFavorite: (locationId: string, mediaId: string) =>
      getApi().patch(`/rv-locations/${locationId}/media/${mediaId}/favorite`),
  },

  // Google Places
  fetchGooglePlaces: (locationId: string, data?: { place_id?: string; fetch_photos?: boolean }) =>
    getApi().post(`/rv-locations/${locationId}/fetch-google`, data || {}),
  fetchActivityGooglePlaces: (locationId: string, activityId: string, data?: { place_id?: string }) =>
    getApi().post(`/rv-locations/${locationId}/activities/${activityId}/fetch-google`, data || {}),

  // Import
  import: (payload: unknown, dryRun?: boolean) =>
    getApi().post("/rv-locations/import", payload, { params: dryRun ? { dryRun: 'true' } : undefined }),
  validateImport: (payload: unknown) => getApi().post("/rv-locations/import/validate", payload),

  // Enrichment
  enrich: (locationId: string, options?: { fetch_reviews?: boolean; fetch_photos?: boolean; fetch_hours?: boolean; enrich_activities?: boolean; max_photos?: number }) =>
    getApi().post(`/rv-locations/${locationId}/enrich`, options || {}),
  suggestActivities: (locationId: string) =>
    getApi().post(`/rv-locations/${locationId}/suggest-activities`),

  // Convert to Trip
  convertToTrip: (locationId: string, options?: { start_date?: string; end_date?: string; traveler_count?: number }) =>
    getApi().post(`/rv-locations/${locationId}/convert-to-trip`, options || {}),

  // Sharing
  share: {
    generate: (locationId: string) => getApi().post(`/rv-locations/${locationId}/share`),
    revoke: (locationId: string) => getApi().delete(`/rv-locations/${locationId}/share`),
    getPublic: (slug: string) => getApi().get(`/rv-locations/share/${slug}`),
    getAll: (params?: { status?: string; category?: string; search?: string }) =>
      getApi().get("/rv-locations/share/all", { params }),
  },

  // Settings
  settings: {
    get: () => getApi().get("/rv-locations/settings"),
    update: (data: { claude_instructions?: string; family_profile?: unknown; output_template?: unknown }) =>
      getApi().put("/rv-locations/settings", data),
    updateInstructions: (claude_instructions: string) =>
      getApi().patch("/rv-locations/settings/instructions", { claude_instructions }),
  },
};

// Re-export types
export type { AxiosInstance } from 'axios';
