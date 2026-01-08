import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  biomarkersApi,
  biomarkerStarsApi,
  biomarkerNotesApi,
  supplementsApi,
  equipmentApi,
  routinesApi,
  goalsApi,
  aiApi,
  aiApiKeysApi,
  changeLogApi,
  protocolDocsApi,
  userLinksApi,
  eightSleepApi,
  journalApi,
  scheduleItemsApi,
  userDietApi,
  routineVersionsApi,
} from "./index";
import type {
  Biomarker,
  CreateBiomarkerRequest,
  Supplement,
  CreateSupplementRequest,
  Equipment,
  CreateEquipmentRequest,
  Routine,
  Goal,
  ProtocolDoc,
  ChangeLogEntry,
  UserLink,
  BiomarkerStar,
  BiomarkerNote,
  ExtractedBiomarkerData,
  ExtractedSupplementData,
  ExtractedEquipmentData,
  AIConversation,
  AIAPIKey,
  AnalyzeBiomarkerTrendInput,
  AnalyzeBiomarkerTrendResult,
  ProtocolAnalysisInput,
  ProtocolAnalysisResult,
  EightSleepIntegrationStatus,
  SleepSession,
  SleepAnalysis,
  SleepTrend,
  SupplementCorrelation,
  CorrelationSummary,
  JournalEntry,
  CreateJournalEntryRequest,
  UpdateJournalEntryRequest,
  JournalRecipient,
  CreateJournalRecipientRequest,
  JournalPrompt,
  JournalTagCount,
  OnThisDayEntry,
  ScheduleItem,
  CreateScheduleItemRequest,
  UserDiet,
  UpdateUserDietRequest,
  RoutineVersion,
  RoutineSnapshot,
} from "@singularity/shared-types";

// ============================================
// Biomarker Hooks
// ============================================

export function useBiomarkers(params?: {
  category?: string;
  name?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["biomarkers", params],
    queryFn: async () => {
      const response = await biomarkersApi.list(params);
      return response.data.data as Biomarker[];
    },
  });
}

export function useBiomarker(id: string) {
  return useQuery({
    queryKey: ["biomarkers", id],
    queryFn: async () => {
      const response = await biomarkersApi.get(id);
      return response.data.data as Biomarker;
    },
    enabled: !!id,
  });
}

export function useBiomarkerHistory(name: string) {
  return useQuery({
    queryKey: ["biomarkers", "history", name],
    queryFn: async () => {
      const response = await biomarkersApi.getHistory(name);
      return response.data.data as Biomarker[];
    },
    enabled: !!name,
  });
}

export function useCreateBiomarker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBiomarkerRequest) => {
      const response = await biomarkersApi.create(data);
      return response.data.data as Biomarker;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
    },
  });
}

export function useCreateBiomarkersBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (biomarkers: CreateBiomarkerRequest[]) => {
      const response = await biomarkersApi.createBulk(biomarkers);
      return response.data.data as Biomarker[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
    },
  });
}

export function useUpdateBiomarker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Biomarker> }) => {
      const response = await biomarkersApi.update(id, data);
      return response.data.data as Biomarker;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
      queryClient.invalidateQueries({ queryKey: ["biomarkers", variables.id] });
    },
  });
}

export function useDeleteBiomarker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await biomarkersApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
    },
  });
}

export function useDeleteBiomarkersBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await biomarkersApi.deleteBulk(ids);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarkers"] });
    },
  });
}

// ============================================
// Biomarker Star Hooks
// ============================================

export function useBiomarkerStars() {
  return useQuery({
    queryKey: ["biomarker-stars"],
    queryFn: async () => {
      const response = await biomarkerStarsApi.list();
      return response.data.data as BiomarkerStar[];
    },
  });
}

export function useIsStarred(biomarkerName: string) {
  return useQuery({
    queryKey: ["biomarker-stars", biomarkerName],
    queryFn: async () => {
      const response = await biomarkerStarsApi.isStarred(biomarkerName);
      return response.data.data as { is_starred: boolean; star: BiomarkerStar | null };
    },
    enabled: !!biomarkerName,
  });
}

export function useStarBiomarker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { biomarker_name: string; starred_by?: 'user' | 'ai'; ai_reason?: string }) => {
      const response = await biomarkerStarsApi.star(data);
      return response.data.data as BiomarkerStar;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["biomarker-stars"] });
      queryClient.invalidateQueries({ queryKey: ["biomarker-stars", variables.biomarker_name] });
    },
  });
}

export function useUnstarBiomarker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (biomarkerName: string) => {
      const response = await biomarkerStarsApi.unstar(biomarkerName);
      return response.data;
    },
    onSuccess: (_, biomarkerName) => {
      queryClient.invalidateQueries({ queryKey: ["biomarker-stars"] });
      queryClient.invalidateQueries({ queryKey: ["biomarker-stars", biomarkerName] });
    },
  });
}

export function useToggleStar() {
  const starMutation = useStarBiomarker();
  const unstarMutation = useUnstarBiomarker();

  return {
    toggle: async (biomarkerName: string, isCurrentlyStarred: boolean) => {
      if (isCurrentlyStarred) {
        await unstarMutation.mutateAsync(biomarkerName);
      } else {
        await starMutation.mutateAsync({ biomarker_name: biomarkerName });
      }
    },
    isLoading: starMutation.isPending || unstarMutation.isPending,
  };
}

// ============================================
// Biomarker Note Hooks
// ============================================

export function useBiomarkerNotes(biomarkerName?: string) {
  return useQuery({
    queryKey: ["biomarker-notes", biomarkerName],
    queryFn: async () => {
      if (biomarkerName) {
        const response = await biomarkerNotesApi.getForBiomarker(biomarkerName);
        return response.data.data as BiomarkerNote[];
      }
      const response = await biomarkerNotesApi.list();
      return response.data.data as BiomarkerNote[];
    },
  });
}

export function useCreateBiomarkerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      biomarker_name: string;
      content: string;
      created_by?: 'user' | 'ai';
      ai_context?: string
    }) => {
      const response = await biomarkerNotesApi.create(data);
      return response.data.data as BiomarkerNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["biomarker-notes"] });
      queryClient.invalidateQueries({ queryKey: ["biomarker-notes", variables.biomarker_name] });
    },
  });
}

export function useUpdateBiomarkerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const response = await biomarkerNotesApi.update(id, { content });
      return response.data.data as BiomarkerNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarker-notes"] });
    },
  });
}

export function useDeleteBiomarkerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await biomarkerNotesApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biomarker-notes"] });
    },
  });
}

// ============================================
// Supplement Hooks
// ============================================

export function useSupplements(params?: {
  category?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ["supplements", params],
    queryFn: async () => {
      const response = await supplementsApi.list(params);
      return response.data.data as Supplement[];
    },
  });
}

export function useSupplement(id: string) {
  return useQuery({
    queryKey: ["supplements", id],
    queryFn: async () => {
      const response = await supplementsApi.get(id);
      return response.data.data as Supplement;
    },
    enabled: !!id,
  });
}

export function useCreateSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplementRequest) => {
      const response = await supplementsApi.create(data);
      return response.data.data as Supplement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

export function useCreateSupplementsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplements: CreateSupplementRequest[]) => {
      const response = await supplementsApi.createBulk(supplements);
      return response.data.data as Supplement[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

export function useUpdateSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplement> }) => {
      const response = await supplementsApi.update(id, data);
      return response.data.data as Supplement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      queryClient.invalidateQueries({ queryKey: ["supplements", variables.id] });
    },
  });
}

export function useToggleSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await supplementsApi.toggle(id);
      return response.data.data as Supplement;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
      queryClient.invalidateQueries({ queryKey: ["supplements", id] });
    },
  });
}

export function useDeleteSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await supplementsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplements"] });
    },
  });
}

// ============================================
// Equipment Hooks
// ============================================

export function useEquipment(params?: {
  category?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ["equipment", params],
    queryFn: async () => {
      const response = await equipmentApi.list(params);
      return response.data.data as Equipment[];
    },
  });
}

export function useEquipmentItem(id: string) {
  return useQuery({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const response = await equipmentApi.get(id);
      return response.data.data as Equipment;
    },
    enabled: !!id,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEquipmentRequest) => {
      const response = await equipmentApi.create(data);
      return response.data.data as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useCreateEquipmentBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: CreateEquipmentRequest[]) => {
      const response = await equipmentApi.createBulk(equipment);
      return response.data.data as Equipment[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Equipment> }) => {
      const response = await equipmentApi.update(id, data);
      return response.data.data as Equipment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment", variables.id] });
    },
  });
}

export function useToggleEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await equipmentApi.toggle(id);
      return response.data.data as Equipment;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment", id] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await equipmentApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-duplicates"] });
    },
  });
}

export function useEquipmentDuplicates() {
  return useQuery({
    queryKey: ["equipment-duplicates"],
    queryFn: async () => {
      const response = await equipmentApi.getDuplicates();
      return response.data.data as {
        duplicateIds: string[];
        groups: Array<{
          items: Array<{
            id: string;
            name: string;
            brand?: string;
            confidence: number;
          }>;
        }>;
      };
    },
  });
}

// ============================================
// Routine Hooks
// ============================================

export function useRoutines() {
  return useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const response = await routinesApi.list();
      return response.data.data as Routine[];
    },
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: ["routines", id],
    queryFn: async () => {
      const response = await routinesApi.get(id);
      return response.data.data as Routine;
    },
    enabled: !!id,
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Routine>) => {
      const response = await routinesApi.create(data);
      return response.data.data as Routine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Routine> }) => {
      const response = await routinesApi.update(id, data);
      return response.data.data as Routine;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routines", variables.id] });
    },
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await routinesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });
}

// ============================================
// Goal Hooks
// ============================================

export function useGoals(params?: { status?: string }) {
  return useQuery({
    queryKey: ["goals", params],
    queryFn: async () => {
      const response = await goalsApi.list(params);
      return response.data.data as Goal[];
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ["goals", id],
    queryFn: async () => {
      const response = await goalsApi.get(id);
      return response.data.data as Goal;
    },
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Goal>) => {
      const response = await goalsApi.create(data);
      return response.data.data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }) => {
      const response = await goalsApi.update(id, data);
      return response.data.data as Goal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", variables.id] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await goalsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

// ============================================
// AI Hooks
// ============================================

export function useAIApiKeys() {
  return useQuery({
    queryKey: ["ai-api-keys"],
    queryFn: async () => {
      const response = await aiApiKeysApi.list();
      return response.data.data as AIAPIKey[];
    },
  });
}

export function useHasActiveAIKey() {
  const { data: keys, isLoading } = useAIApiKeys();
  const hasKey = keys && keys.length > 0 && keys.some((k) => k.is_active);
  return { hasKey, isLoading };
}

export function useExtractBiomarkers() {
  return useMutation({
    mutationFn: async (data: {
      image_base64?: string;
      images_base64?: string[];
      text_content?: string;
      source_type: "image" | "text";
    }) => {
      const response = await aiApi.extractBiomarkers(data);
      return response.data.data as ExtractedBiomarkerData;
    },
  });
}

export function useExtractSupplements() {
  return useMutation({
    mutationFn: async (data: {
      image_base64?: string;
      text_content?: string;
      source_type: "image" | "text";
      product_url?: string;
    }) => {
      const response = await aiApi.extractSupplements(data);
      return response.data.data as ExtractedSupplementData;
    },
  });
}

export function useExtractEquipment() {
  return useMutation({
    mutationFn: async (data: { text_content: string }) => {
      const response = await aiApi.extractEquipment(data);
      return response.data.data as ExtractedEquipmentData;
    },
  });
}

export function useAnalyzeBiomarkerTrend() {
  return useMutation({
    mutationFn: async (data: AnalyzeBiomarkerTrendInput) => {
      const response = await aiApi.analyzeBiomarkerTrend(data);
      return response.data.data as AnalyzeBiomarkerTrendResult;
    },
  });
}

export function useProtocolAnalysis() {
  return useMutation({
    mutationFn: async (data: ProtocolAnalysisInput) => {
      const response = await aiApi.protocolAnalysis(data);
      return response.data.data as ProtocolAnalysisResult;
    },
  });
}

export function useAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      message: string;
      context?: string;
      include_user_data?: boolean;
      biomarker_name?: string;
      title?: string;
    }) => {
      const response = await aiApi.chat(data);
      return response.data.data as { response: string; context: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
  });
}

export function useAIConversations(params?: { context?: string; limit?: number }) {
  return useQuery({
    queryKey: ["ai", "conversations", params],
    queryFn: async () => {
      const response = await aiApi.getConversations(params);
      return response.data.data as AIConversation[];
    },
  });
}

// ============================================
// Change Log Hooks
// ============================================

export function useChangeLog(params?: {
  change_type?: string;
  item_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["changelog", params],
    queryFn: async () => {
      const response = await changeLogApi.list(params);
      return response.data.data as ChangeLogEntry[];
    },
  });
}

// ============================================
// Protocol Doc Hooks
// ============================================

export function useProtocolDocs(params?: { category?: string }) {
  return useQuery({
    queryKey: ["protocol-docs", params],
    queryFn: async () => {
      const response = await protocolDocsApi.list(params);
      return response.data.data as ProtocolDoc[];
    },
  });
}

export function useProtocolDoc(id: string) {
  return useQuery({
    queryKey: ["protocol-docs", id],
    queryFn: async () => {
      const response = await protocolDocsApi.get(id);
      return response.data.data as ProtocolDoc;
    },
    enabled: !!id,
  });
}

export function useCreateProtocolDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProtocolDoc>) => {
      const response = await protocolDocsApi.create(data);
      return response.data.data as ProtocolDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-docs"] });
    },
  });
}

export function useUpdateProtocolDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProtocolDoc> }) => {
      const response = await protocolDocsApi.update(id, data);
      return response.data.data as ProtocolDoc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-docs"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-docs", variables.id] });
    },
  });
}

export function useDeleteProtocolDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await protocolDocsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-docs"] });
    },
  });
}

// ============================================
// User Link Hooks
// ============================================

export function useUserLinks() {
  return useQuery({
    queryKey: ["userLinks"],
    queryFn: async () => {
      const response = await userLinksApi.list();
      return response.data.data as UserLink[];
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email?: string; permission: "read" | "write" | "admin" }) => {
      const response = await userLinksApi.invite(data);
      return response.data.data as UserLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLinks"] });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await userLinksApi.accept(code);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLinks"] });
    },
  });
}

export function useRevokeUserLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await userLinksApi.revoke(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLinks"] });
    },
  });
}

// ============================================
// Eight Sleep Hooks
// ============================================

export function useEightSleepStatus() {
  return useQuery({
    queryKey: ["eight-sleep", "status"],
    queryFn: async () => {
      const response = await eightSleepApi.getStatus();
      return response.data as EightSleepIntegrationStatus;
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

// Eight Sleep helper functions
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
  if (score >= 85) return "#22C55E";
  if (score >= 70) return "#EAB308";
  return "#EF4444";
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

// ============================================
// Journal Hooks
// ============================================

export function useJournalEntries(params?: {
  tag?: string;
  start_date?: string;
  end_date?: string;
  mood?: string;
  entry_mode?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["journal", "entries", params],
    queryFn: async () => {
      const response = await journalApi.list(params);
      return response.data.data as JournalEntry[];
    },
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ["journal", "entries", id],
    queryFn: async () => {
      const response = await journalApi.get(id);
      return response.data.data as JournalEntry;
    },
    enabled: !!id,
  });
}

export function useJournalOnThisDay(date?: string) {
  return useQuery({
    queryKey: ["journal", "on-this-day", date],
    queryFn: async () => {
      const response = await journalApi.onThisDay(date);
      return response.data.data as OnThisDayEntry[];
    },
  });
}

export function useJournalTags() {
  return useQuery({
    queryKey: ["journal", "tags"],
    queryFn: async () => {
      const response = await journalApi.getTags();
      return response.data.data as JournalTagCount[];
    },
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJournalEntryRequest) => {
      const response = await journalApi.create(data);
      return response.data.data as JournalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateJournalEntryRequest }) => {
      const response = await journalApi.update(id, data);
      return response.data.data as JournalEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", variables.id] });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await journalApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

// Journal Media Hooks
export function useAddJournalMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      media,
    }: {
      entryId: string;
      media: Array<{
        media_type: "image" | "video";
        file_url: string;
        thumbnail_url?: string;
        width?: number;
        height?: number;
        duration_seconds?: number;
        file_size_bytes?: number;
        original_filename?: string;
        mime_type?: string;
      }>;
    }) => {
      const response = await journalApi.addMedia(entryId, media);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", variables.entryId] });
    },
  });
}

export function useDeleteJournalMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, mediaId }: { entryId: string; mediaId: string }) => {
      await journalApi.deleteMedia(entryId, mediaId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", variables.entryId] });
    },
  });
}

export function useReorderJournalMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, mediaIds }: { entryId: string; mediaIds: string[] }) => {
      await journalApi.reorderMedia(entryId, mediaIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", variables.entryId] });
    },
  });
}

// Journal Sharing Hooks
export function useUpdateJournalShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      settings,
    }: {
      entryId: string;
      settings: {
        is_public: boolean;
        password?: string;
        custom_slug?: string;
        show_author?: boolean;
        show_location?: boolean;
        show_date?: boolean;
      };
    }) => {
      const response = await journalApi.updateShare(entryId, settings);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", variables.entryId] });
    },
  });
}

export function useRevokeJournalShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      await journalApi.revokeShare(entryId);
    },
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", entryId] });
    },
  });
}

// Time Capsule Hooks
export function useAssignTimeCapsule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      recipientIds,
      deliveryDate,
    }: {
      entryId: string;
      recipientIds: string[];
      deliveryDate: string;
    }) => {
      const response = await journalApi.assignCapsule(entryId, {
        recipient_ids: recipientIds,
        delivery_date: deliveryDate,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", variables.entryId] });
    },
  });
}

export function useCancelTimeCapsule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      await journalApi.cancelCapsule(entryId);
    },
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ["journal", "entries", entryId] });
    },
  });
}

// Journal Recipients Hooks
export function useJournalRecipients() {
  return useQuery({
    queryKey: ["journal", "recipients"],
    queryFn: async () => {
      const response = await journalApi.getRecipients();
      return response.data.data as JournalRecipient[];
    },
  });
}

export function useCreateJournalRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJournalRecipientRequest) => {
      const response = await journalApi.createRecipient(data);
      return response.data.data as JournalRecipient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "recipients"] });
    },
  });
}

export function useUpdateJournalRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<JournalRecipient> }) => {
      const response = await journalApi.updateRecipient(id, data);
      return response.data.data as JournalRecipient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "recipients"] });
    },
  });
}

export function useDeleteJournalRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await journalApi.deleteRecipient(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "recipients"] });
    },
  });
}

// Journal Prompts Hooks
export function useRandomJournalPrompt(category?: string) {
  return useQuery({
    queryKey: ["journal", "prompts", "random", category],
    queryFn: async () => {
      const response = await journalApi.getRandomPrompt(category);
      return response.data.data as JournalPrompt;
    },
    // Don't auto-refetch on window focus for random prompts
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export function useMyJournalPrompts() {
  return useQuery({
    queryKey: ["journal", "prompts", "mine"],
    queryFn: async () => {
      const response = await journalApi.getMyPrompts();
      return response.data.data as JournalPrompt[];
    },
  });
}

export function useCreateJournalPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { prompt_text: string; category?: string }) => {
      const response = await journalApi.createPrompt(data);
      return response.data.data as JournalPrompt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "prompts"] });
    },
  });
}

export function useDeleteJournalPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await journalApi.deletePrompt(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal", "prompts"] });
    },
  });
}

// Journal helper functions
export function getMoodEmoji(mood: string): string {
  const moodMap: Record<string, string> = {
    happy: "😊",
    calm: "😌",
    neutral: "😐",
    sad: "😔",
    down: "😢",
    frustrated: "😤",
  };
  return moodMap[mood] || "😐";
}

export function getMoodColor(mood: string): string {
  const colorMap: Record<string, string> = {
    happy: "#22C55E",
    calm: "#3B82F6",
    neutral: "#9CA3AF",
    sad: "#6B7280",
    down: "#8B5CF6",
    frustrated: "#EF4444",
  };
  return colorMap[mood] || "#9CA3AF";
}

export function formatJournalDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" });

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
  });
}

// ============================================
// Schedule Items Hooks (Exercises & Meals)
// ============================================

export function useScheduleItems(params?: {
  item_type?: 'exercise' | 'meal';
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ["schedule-items", params],
    queryFn: async () => {
      const response = await scheduleItemsApi.list(params);
      return response.data.data as ScheduleItem[];
    },
  });
}

export function useScheduleItem(id: string) {
  return useQuery({
    queryKey: ["schedule-items", id],
    queryFn: async () => {
      const response = await scheduleItemsApi.get(id);
      return response.data.data as ScheduleItem;
    },
    enabled: !!id,
  });
}

export function useCreateScheduleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleItemRequest) => {
      const response = await scheduleItemsApi.create(data);
      return response.data.data as ScheduleItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-items"] });
      queryClient.invalidateQueries({ queryKey: ["routine-versions"] });
    },
  });
}

export function useUpdateScheduleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScheduleItem> }) => {
      const response = await scheduleItemsApi.update(id, data);
      return response.data.data as ScheduleItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-items"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-items", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["routine-versions"] });
    },
  });
}

export function useToggleScheduleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await scheduleItemsApi.toggle(id);
      return response.data.data as ScheduleItem;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-items"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-items", id] });
      queryClient.invalidateQueries({ queryKey: ["routine-versions"] });
    },
  });
}

export function useDeleteScheduleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await scheduleItemsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-items"] });
      queryClient.invalidateQueries({ queryKey: ["routine-versions"] });
    },
  });
}

// ============================================
// User Diet Hooks
// ============================================

export function useUserDiet() {
  return useQuery({
    queryKey: ["user-diet"],
    queryFn: async () => {
      const response = await userDietApi.get();
      return response.data.data as UserDiet;
    },
  });
}

export function useUpdateUserDiet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserDietRequest) => {
      const response = await userDietApi.update(data);
      return response.data.data as UserDiet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-diet"] });
      queryClient.invalidateQueries({ queryKey: ["routine-versions"] });
    },
  });
}

// ============================================
// Routine Version Hooks (Change Log)
// ============================================

export function useRoutineVersions(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["routine-versions", params],
    queryFn: async () => {
      const response = await routineVersionsApi.list(params);
      return response.data.data as RoutineVersion[];
    },
  });
}

export function useRoutineVersion(id: string) {
  return useQuery({
    queryKey: ["routine-versions", id],
    queryFn: async () => {
      const response = await routineVersionsApi.get(id);
      return response.data.data as RoutineVersion;
    },
    enabled: !!id,
  });
}

export function useLatestRoutineVersion() {
  return useQuery({
    queryKey: ["routine-versions", "latest"],
    queryFn: async () => {
      const response = await routineVersionsApi.getLatest();
      return response.data.data as RoutineVersion | null;
    },
  });
}

export function useCurrentRoutineSnapshot() {
  return useQuery({
    queryKey: ["routine-versions", "current-snapshot"],
    queryFn: async () => {
      const response = await routineVersionsApi.getCurrentSnapshot();
      return response.data.data as RoutineSnapshot;
    },
  });
}

export function useSaveRoutineVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data?: { reason?: string }) => {
      const response = await routineVersionsApi.create(data);
      return response.data.data as RoutineVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine-versions"] });
    },
  });
}
