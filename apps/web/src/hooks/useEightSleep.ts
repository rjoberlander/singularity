import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eightSleepApi } from "@/lib/api";

// Types
export interface IntegrationStatus {
  connected: boolean;
  integration_id?: string;
  last_sync_at?: string;
  last_sync_status?: "success" | "failed" | "syncing" | "never";
  sync_enabled: boolean;
  sync_time?: string;
  sync_timezone?: string;
  consecutive_failures: number;
  error_message?: string;
}

export interface SleepSession {
  id: string;
  user_id: string;
  date: string;
  sleep_score: number | null;
  sleep_quality_score: number | null;
  time_slept: number | null;
  time_to_fall_asleep: number | null;
  time_in_bed: number | null;
  wake_events: number;
  wake_event_times: string[];
  woke_between_2_and_4_am: boolean;
  wake_time_between_2_and_4_am: string | null;
  avg_heart_rate: number | null;
  min_heart_rate: number | null;
  max_heart_rate: number | null;
  avg_hrv: number | null;
  min_hrv: number | null;
  max_hrv: number | null;
  avg_breathing_rate: number | null;
  light_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  awake_minutes: number | null;
  light_sleep_pct: number | null;
  deep_sleep_pct: number | null;
  rem_sleep_pct: number | null;
  awake_pct: number | null;
  avg_bed_temp: number | null;
  avg_room_temp: number | null;
  sleep_start_time: string | null;
  sleep_end_time: string | null;
  toss_and_turn_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface SleepAnalysis {
  total_nights: number;
  avg_sleep_score: number | null;
  avg_deep_sleep_pct: number | null;
  avg_rem_sleep_pct: number | null;
  avg_hrv: number | null;
  avg_time_slept_hours: number | null;
  nights_with_2_4_am_wake: number;
  wake_2_4_am_rate: number;
}

export interface SleepTrend {
  date: string;
  sleep_score: number | null;
  deep_sleep_pct: number | null;
  avg_hrv: number | null;
  time_slept_hours: number | null;
  woke_2_4_am: boolean;
}

export interface SupplementCorrelation {
  supplement_id: string;
  supplement_name: string;
  days_with: number;
  days_without: number;
  avg_score_with: number | null;
  avg_score_without: number | null;
  score_difference: number;
  avg_deep_with: number | null;
  avg_deep_without: number | null;
  deep_difference: number;
  avg_hrv_with: number | null;
  avg_hrv_without: number | null;
  hrv_difference: number;
  wake_rate_with: number;
  wake_rate_without: number;
  impact: "positive" | "negative" | "neutral";
  confidence: "high" | "medium" | "low";
}

export interface CorrelationSummary {
  supplements: SupplementCorrelation[];
  recommendations: string[];
  insights: string[];
  total_days_analyzed: number;
}

// Hooks
export function useEightSleepStatus() {
  return useQuery({
    queryKey: ["eight-sleep", "status"],
    queryFn: async () => {
      const response = await eightSleepApi.getStatus();
      return response.data as IntegrationStatus;
    },
    retry: false,
  });
}

export function useSleepSessions(params?: {
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["eight-sleep", "sessions", params],
    queryFn: async () => {
      const response = await eightSleepApi.getSessions(params);
      return response.data as { sessions: SleepSession[]; total: number };
    },
  });
}

export function useSleepSession(id: string) {
  return useQuery({
    queryKey: ["eight-sleep", "sessions", id],
    queryFn: async () => {
      const response = await eightSleepApi.getSession(id);
      return response.data as SleepSession;
    },
    enabled: !!id,
  });
}

export function useSleepAnalysis(days: number = 30) {
  return useQuery({
    queryKey: ["eight-sleep", "analysis", days],
    queryFn: async () => {
      const response = await eightSleepApi.getAnalysis(days);
      return response.data as SleepAnalysis;
    },
  });
}

export function useSleepTrends(days: number = 30) {
  return useQuery({
    queryKey: ["eight-sleep", "trends", days],
    queryFn: async () => {
      const response = await eightSleepApi.getTrends(days);
      return response.data as { trends: SleepTrend[] };
    },
  });
}

export function useCorrelations(days: number = 90) {
  return useQuery({
    queryKey: ["eight-sleep", "correlations", days],
    queryFn: async () => {
      const response = await eightSleepApi.getCorrelations(days);
      return response.data as { correlations: SupplementCorrelation[] };
    },
  });
}

export function useCorrelationSummary(days: number = 90) {
  return useQuery({
    queryKey: ["eight-sleep", "correlations", "summary", days],
    queryFn: async () => {
      const response = await eightSleepApi.getCorrelationSummary(days);
      return response.data as CorrelationSummary;
    },
  });
}

export function useTimezones() {
  return useQuery({
    queryKey: ["eight-sleep", "timezones"],
    queryFn: async () => {
      const response = await eightSleepApi.getTimezones();
      return response.data as { timezones: string[] };
    },
    staleTime: Infinity,
  });
}

// Mutations
export function useConnectEightSleep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      sync_time?: string;
      sync_timezone?: string;
    }) => {
      const response = await eightSleepApi.connect(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eight-sleep"] });
    },
  });
}

export function useDisconnectEightSleep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await eightSleepApi.disconnect();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eight-sleep"] });
    },
  });
}

export function useSyncEightSleep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data?: {
      from_date?: string;
      to_date?: string;
      initial?: boolean;
    }) => {
      const response = await eightSleepApi.sync(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eight-sleep"] });
    },
  });
}

export function useUpdateEightSleepSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sync_enabled?: boolean;
      sync_time?: string;
      sync_timezone?: string;
    }) => {
      const response = await eightSleepApi.updateSettings(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eight-sleep", "status"] });
    },
  });
}

export function useBuildCorrelations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (days?: number) => {
      const response = await eightSleepApi.buildCorrelations(days);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eight-sleep", "correlations"] });
    },
  });
}

// Helper functions
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function getSleepScoreColor(score: number | null): string {
  if (score === null) return "#9CA3AF";
  if (score >= 85) return "#22C55E"; // Green
  if (score >= 70) return "#EAB308"; // Yellow
  return "#EF4444"; // Red
}

export function getSleepScoreLabel(score: number | null): string {
  if (score === null) return "No data";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Poor";
}

export function getImpactColor(impact: "positive" | "negative" | "neutral"): string {
  switch (impact) {
    case "positive":
      return "#22C55E";
    case "negative":
      return "#EF4444";
    default:
      return "#9CA3AF";
  }
}
