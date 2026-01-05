import { initializeApi } from "@singularity/shared-api";
import { createClient } from "./supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Initialize the shared API client with web-specific auth
const api = initializeApi({
  baseUrl: API_URL,
  getAuthToken: async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  },
});

export default api;

// Re-export all API functions and hooks from shared package
export * from "@singularity/shared-api";
export * from "@singularity/shared-api/hooks";
