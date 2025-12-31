import { initializeApi } from "@singularity/shared-api";
import { supabase, isDemoMode } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Initialize the shared API client with mobile-specific auth
export const api = initializeApi({
  baseUrl: API_URL,
  getAuthToken: async () => {
    if (isDemoMode) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  },
});

// Re-export all API functions from shared package
export * from "@singularity/shared-api";
