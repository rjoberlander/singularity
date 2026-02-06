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
  travelApi,
  scheduleItemsApi,
  userDietApi,
  routineVersionsApi,
  rvLocationsApi,
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
  Trip,
  TripFlight,
  TripDriving,
  TripSegment,
  TripAccommodation,
  TripDay,
  TripActivity,
  TripMedia,
  TripSharing,
  CreateTripRequest,
  CreateTripFlightRequest,
  CreateTripDrivingRequest,
  CreateTripSegmentRequest,
  CreateTripAccommodationRequest,
  CreateTripDayRequest,
  CreateTripActivityRequest,
  CreateTripMediaRequest,
  FetchGooglePlacesResponse,
  // Travel Settings & Import types (trip import workflow - see docs/travel-module-prd.md)
  TravelSettings,
  TripResearchItem,
  TripImportPayload,
  TripImportOptions,
  TripImportResult,
  TripImportValidationResult,
  UpdateResearchItemRequest,
  ResearchItemStatus,
  ResearchItemPriority,
  // Phase 2 Expansion types
  ExpansionOutput,
  // Schedule & Routine Version types
  ScheduleItem,
  CreateScheduleItemRequest,
  UserDiet,
  UpdateUserDietRequest,
  RoutineVersion,
  RoutineSnapshot,
  // Schedule Validation types
  AssembleScheduleResponse,
  ValidationResult,
  ValidationIssue,
  ScheduleItemValidationStatus,
  // RV Locations types
  RVLocation,
  RVLocationActivity,
  RVLocationMedia,
  RVResearchSettings,
  CreateRVLocationRequest,
  CreateRVLocationActivityRequest,
  CreateRVLocationMediaRequest,
  RVLocationImportPayload,
  RVLocationImportResult,
  RVImportValidationResult,
  RVLocationConvertToTripResult,
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
// Travel Hooks
// ============================================

// Trip Hooks
export function useTrips(params?: {
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["travel", "trips", params],
    queryFn: async () => {
      const response = await travelApi.trips.list(params);
      return response.data.data as Trip[];
    },
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ["travel", "trips", id],
    queryFn: async () => {
      const response = await travelApi.trips.get(id);
      return response.data.data as Trip;
    },
    enabled: !!id,
  });
}

export function useTripFull(id: string) {
  return useQuery({
    queryKey: ["travel", "trips", id, "full"],
    queryFn: async () => {
      const response = await travelApi.trips.getFull(id);
      return response.data.data as Trip & {
        flights: TripFlight[];
        driving: TripDriving[];
        segments: TripSegment[];
        accommodations: TripAccommodation[];
        days: TripDay[];
        activities: TripActivity[];
        media: TripMedia[];
        sharing: TripSharing[];
      };
    },
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTripRequest) => {
      const response = await travelApi.trips.create(data);
      return response.data.data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trip> }) => {
      const response = await travelApi.trips.update(id, data);
      return response.data.data as Trip;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.id] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await travelApi.trips.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
    },
  });
}

export function useDuplicateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await travelApi.trips.duplicate(id);
      return response.data.data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
    },
  });
}

export function useUpdateTripStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await travelApi.trips.updateStatus(id, status);
      return response.data.data as Trip;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.id, "full"] });
    },
  });
}

export function useUpdateTripPlanningProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      step,
      auto_suggested,
      completed,
    }: {
      id: string;
      step: 'basics' | 'accommodations' | 'segments' | 'meals' | 'days_activities';
      auto_suggested?: boolean;
      completed?: boolean;
    }) => {
      const response = await travelApi.trips.updatePlanningProgress(id, {
        step,
        auto_suggested,
        completed,
      });
      return response.data.data as Trip;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.id, "full"] });
    },
  });
}

// Flight Hooks
export function useTripFlights(tripId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "flights"],
    queryFn: async () => {
      const response = await travelApi.flights.list(tripId);
      return response.data.data as TripFlight[];
    },
    enabled: !!tripId,
  });
}

export function useCreateTripFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripFlightRequest }) => {
      const response = await travelApi.flights.create(tripId, data);
      return response.data.data as TripFlight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      flightId,
      data,
    }: {
      tripId: string;
      flightId: string;
      data: Partial<TripFlight>;
    }) => {
      const response = await travelApi.flights.update(tripId, flightId, data);
      return response.data.data as TripFlight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, flightId }: { tripId: string; flightId: string }) => {
      await travelApi.flights.delete(tripId, flightId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export interface ExtractedFlightData {
  tripInfo: {
    travelers?: number;
    origin?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
  };
  flights: Array<{
    direction: "outbound" | "return";
    airline: string;
    flightNumbers: string[];
    departureAirport: string;
    arrivalAirport: string;
    departureDatetime: string;
    arrivalDatetime: string;
    layovers?: Array<{ airport: string; duration: string }> | null;
    bookingReference?: string | null;
    totalPrice?: number | null;
    notes?: string;
  }>;
}

export function useExtractFlightFromImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, image, mediaType }: { tripId: string; image: string; mediaType: string }) => {
      const response = await travelApi.flights.extractFromImage(tripId, { image, mediaType });
      return response.data.data as ExtractedFlightData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "full"] });
    },
  });
}

// Driving Hooks
export function useTripDriving(tripId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "driving"],
    queryFn: async () => {
      const response = await travelApi.driving.list(tripId);
      return response.data.data as TripDriving[];
    },
    enabled: !!tripId,
  });
}

export function useCreateTripDriving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripDrivingRequest }) => {
      const response = await travelApi.driving.create(tripId, data);
      return response.data.data as TripDriving;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripDriving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      drivingId,
      data,
    }: {
      tripId: string;
      drivingId: string;
      data: Partial<TripDriving>;
    }) => {
      const response = await travelApi.driving.update(tripId, drivingId, data);
      return response.data.data as TripDriving;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripDriving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, drivingId }: { tripId: string; drivingId: string }) => {
      await travelApi.driving.delete(tripId, drivingId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

// Segment Hooks
export function useTripSegments(tripId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "segments"],
    queryFn: async () => {
      const response = await travelApi.segments.list(tripId);
      return response.data.data as TripSegment[];
    },
    enabled: !!tripId,
  });
}

export function useCreateTripSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripSegmentRequest }) => {
      const response = await travelApi.segments.create(tripId, data);
      return response.data.data as TripSegment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      segmentId,
      data,
    }: {
      tripId: string;
      segmentId: string;
      data: Partial<TripSegment>;
    }) => {
      const response = await travelApi.segments.update(tripId, segmentId, data);
      return response.data.data as TripSegment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, segmentId }: { tripId: string; segmentId: string }) => {
      await travelApi.segments.delete(tripId, segmentId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useReorderTripSegments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, segmentIds }: { tripId: string; segmentIds: string[] }) => {
      await travelApi.segments.reorder(tripId, segmentIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useSyncSegmentDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, segmentId }: { tripId: string; segmentId: string }) => {
      const response = await travelApi.segments.syncDays(segmentId);
      return response.data.data as {
        segment_id: string;
        segment_dates: { start: string; end: string };
        days_updated: number;
        days_created: number;
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "days"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "full"] });
    },
  });
}

// Accommodation Hooks
export function useTripAccommodations(tripId: string, segmentId?: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "accommodations", segmentId],
    queryFn: async () => {
      const response = await travelApi.accommodations.list(tripId, { segment_id: segmentId });
      return response.data.data as TripAccommodation[];
    },
    enabled: !!tripId,
  });
}

export function useCreateTripAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripAccommodationRequest }) => {
      const response = await travelApi.accommodations.create(tripId, data);
      return response.data.data as TripAccommodation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      accommodationId,
      data,
    }: {
      tripId: string;
      accommodationId: string;
      data: Partial<TripAccommodation>;
    }) => {
      const response = await travelApi.accommodations.update(tripId, accommodationId, data);
      return response.data.data as TripAccommodation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, accommodationId }: { tripId: string; accommodationId: string }) => {
      await travelApi.accommodations.delete(tripId, accommodationId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

// Day Hooks
export function useTripDays(tripId: string, segmentId?: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "days", segmentId],
    queryFn: async () => {
      const response = await travelApi.days.list(tripId, { segment_id: segmentId });
      return response.data.data as TripDay[];
    },
    enabled: !!tripId,
  });
}

export function useTripDay(tripId: string, dayId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "days", dayId],
    queryFn: async () => {
      const response = await travelApi.days.get(tripId, dayId);
      return response.data.data as TripDay;
    },
    enabled: !!tripId && !!dayId,
  });
}

export function useCreateTripDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripDayRequest }) => {
      const response = await travelApi.days.create(tripId, data);
      return response.data.data as TripDay;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      dayId,
      data,
    }: {
      tripId: string;
      dayId: string;
      data: Partial<TripDay>;
    }) => {
      const response = await travelApi.days.update(tripId, dayId, data);
      return response.data.data as TripDay;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, dayId }: { tripId: string; dayId: string }) => {
      await travelApi.days.delete(tripId, dayId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useReorderTripDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, dayIds }: { tripId: string; dayIds: string[] }) => {
      await travelApi.days.reorder(tripId, dayIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useGenerateTripDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await travelApi.days.generateFromDates(tripId);
      return response.data.data as TripDay[];
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId] });
    },
  });
}

// Activity Hooks
export function useTripActivities(tripId: string, dayId?: string, isBackup?: boolean) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "activities", dayId, isBackup],
    queryFn: async () => {
      const response = await travelApi.activities.list(tripId, {
        day_id: dayId,
        is_backup: isBackup,
      });
      return response.data.data as TripActivity[];
    },
    enabled: !!tripId,
  });
}

export function useTripActivity(tripId: string, activityId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "activities", activityId],
    queryFn: async () => {
      const response = await travelApi.activities.get(tripId, activityId);
      return response.data.data as TripActivity;
    },
    enabled: !!tripId && !!activityId,
  });
}

export function useCreateTripActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripActivityRequest }) => {
      const response = await travelApi.activities.create(tripId, data);
      return response.data.data as TripActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      activityId,
      data,
    }: {
      tripId: string;
      activityId: string;
      data: Partial<TripActivity>;
    }) => {
      const response = await travelApi.activities.update(tripId, activityId, data);
      return response.data.data as TripActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, activityId }: { tripId: string; activityId: string }) => {
      await travelApi.activities.delete(tripId, activityId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useReorderTripActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      dayId,
      activityIds,
    }: {
      tripId: string;
      dayId: string;
      activityIds: string[];
    }) => {
      await travelApi.activities.reorder(tripId, dayId, activityIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useMoveActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      activityId,
      newDayId,
    }: {
      tripId: string;
      activityId: string;
      newDayId: string;
    }) => {
      const response = await travelApi.activities.moveToDay(tripId, activityId, newDayId);
      return response.data.data as TripActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useToggleActivityBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, activityId }: { tripId: string; activityId: string }) => {
      const response = await travelApi.activities.toggleBackup(tripId, activityId);
      return response.data.data as TripActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

// Google Places Fetch Hooks
export function useFetchGooglePlacesForActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      activityId,
    }: {
      tripId: string;
      activityId: string;
    }) => {
      const response = await travelApi.activities.fetchGooglePlaces(tripId, activityId);
      return response.data.data as FetchGooglePlacesResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate all trip-related queries including the "full" query used by useTripFull
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "full"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "media"] });
    },
  });
}

export function useFetchGooglePlacesForSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      segmentId,
    }: {
      tripId: string;
      segmentId: string;
    }) => {
      const response = await travelApi.segments.fetchGooglePlaces(tripId, segmentId);
      return response.data.data as FetchGooglePlacesResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate all trip-related queries including the "full" query used by useTripFull
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "full"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "segments"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "media"] });
    },
  });
}

export function useApproveTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      mediaId,
      approved,
    }: {
      tripId: string;
      mediaId: string;
      approved: boolean;
    }) => {
      const response = await travelApi.media.update(tripId, mediaId, { approved });
      return response.data.data as TripMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "media"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

// Media Hooks
export function useTripMedia(tripId: string, parentType?: string, parentId?: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "media", parentType, parentId],
    queryFn: async () => {
      const response = await travelApi.media.list(tripId, {
        parent_type: parentType,
        parent_id: parentId,
      });
      return response.data.data as TripMedia[];
    },
    enabled: !!tripId,
  });
}

export function useCreateTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: CreateTripMediaRequest }) => {
      const response = await travelApi.media.create(tripId, data);
      return response.data.data as TripMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useCreateTripMediaBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, media }: { tripId: string; media: CreateTripMediaRequest[] }) => {
      const response = await travelApi.media.createBulk(tripId, media);
      return response.data.data as TripMedia[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUpdateTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      mediaId,
      data,
    }: {
      tripId: string;
      mediaId: string;
      data: Partial<TripMedia>;
    }) => {
      const response = await travelApi.media.update(tripId, mediaId, data);
      return response.data.data as TripMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeleteTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, mediaId }: { tripId: string; mediaId: string }) => {
      await travelApi.media.delete(tripId, mediaId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useReorderTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      parentType,
      parentId,
      mediaIds,
    }: {
      tripId: string;
      parentType: string;
      parentId: string;
      mediaIds: string[];
    }) => {
      await travelApi.media.reorder(tripId, parentType, parentId, mediaIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useDeduplicateTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId }: { tripId: string }) => {
      const response = await travelApi.media.deduplicate(tripId);
      return response.data as {
        success: boolean;
        message: string;
        stats: {
          total: number;
          hashes_computed: number;
          duplicates_removed: number;
          remaining: number;
        };
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useBulkDeleteTripMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, mediaIds }: { tripId: string; mediaIds: string[] }) => {
      const response = await travelApi.media.bulkDelete(tripId, mediaIds);
      return response.data as {
        success: boolean;
        message: string;
        deleted_count: number;
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

// Sharing Hooks
export function useTripSharing(tripId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "sharing"],
    queryFn: async () => {
      const response = await travelApi.sharing.list(tripId);
      return response.data.data as TripSharing[];
    },
    enabled: !!tripId,
  });
}

export function useAddTripShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      email,
      permission,
    }: {
      tripId: string;
      email: string;
      permission?: string;
    }) => {
      const response = await travelApi.sharing.add(tripId, { email, permission });
      return response.data.data as TripSharing;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "sharing"] });
    },
  });
}

export function useUpdateTripShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      shareId,
      permission,
    }: {
      tripId: string;
      shareId: string;
      permission: string;
    }) => {
      const response = await travelApi.sharing.update(tripId, shareId, { permission });
      return response.data.data as TripSharing;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "sharing"] });
    },
  });
}

export function useRemoveTripShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, shareId }: { tripId: string; shareId: string }) => {
      await travelApi.sharing.remove(tripId, shareId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "sharing"] });
    },
  });
}

export function useMakeTripPublic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      slug,
      password,
    }: {
      tripId: string;
      slug?: string;
      password?: string;
    }) => {
      const response = await travelApi.sharing.makePublic(tripId, { slug, password });
      return response.data.data as Trip;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useMakeTripPrivate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      await travelApi.sharing.makePrivate(tripId);
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId] });
    },
  });
}

export function usePublicTrip(slug: string, password?: string) {
  return useQuery({
    queryKey: ["travel", "public", slug],
    queryFn: async () => {
      const response = await travelApi.sharing.getPublic(slug, password);
      return response.data.data as Trip;
    },
    enabled: !!slug,
  });
}

// Calendar Sync Hooks
export function useSyncTripToCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, calendarId }: { tripId: string; calendarId?: string }) => {
      const response = await travelApi.calendar.syncTrip(tripId, { calendar_id: calendarId });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUnsyncTripFromCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      await travelApi.calendar.unsyncTrip(tripId);
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId] });
    },
  });
}

export function useSyncActivityToCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      activityId,
      calendarId,
    }: {
      tripId: string;
      activityId: string;
      calendarId?: string;
    }) => {
      const response = await travelApi.calendar.syncActivity(tripId, activityId, {
        calendar_id: calendarId,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

export function useUnsyncActivityFromCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, activityId }: { tripId: string; activityId: string }) => {
      await travelApi.calendar.unsyncActivity(tripId, activityId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId] });
    },
  });
}

// Packing Hooks
export function useTripPacking(tripId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "packing"],
    queryFn: async () => {
      const response = await travelApi.packing.get(tripId);
      return response.data.data as Array<{ item: string; checked: boolean; category?: string }>;
    },
    enabled: !!tripId,
  });
}

export function useUpdateTripPacking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      checklist,
    }: {
      tripId: string;
      checklist: Array<{ item: string; checked: boolean; category?: string }>;
    }) => {
      const response = await travelApi.packing.update(tripId, checklist);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "packing"] });
    },
  });
}

export function useTogglePackingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, itemIndex }: { tripId: string; itemIndex: number }) => {
      const response = await travelApi.packing.toggleItem(tripId, itemIndex);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "packing"] });
    },
  });
}

export function useAddPackingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      item,
      category,
    }: {
      tripId: string;
      item: string;
      category?: string;
    }) => {
      const response = await travelApi.packing.addItem(tripId, { item, category });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "packing"] });
    },
  });
}

export function useRemovePackingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, itemIndex }: { tripId: string; itemIndex: number }) => {
      await travelApi.packing.removeItem(tripId, itemIndex);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.tripId, "packing"] });
    },
  });
}

// Travel helper functions
export function getTripStatusColor(status: string): string {
  switch (status) {
    case "planning":
      return "#3B82F6"; // blue
    case "confirmed":
      return "#22C55E"; // green
    case "in_progress":
      return "#F59E0B"; // amber
    case "completed":
      return "#6B7280"; // gray
    default:
      return "#9CA3AF";
  }
}

export function getTripStatusLabel(status: string): string {
  switch (status) {
    case "planning":
      return "Planning";
    case "confirmed":
      return "Confirmed";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

export function getActivityTypeIcon(type: string): string {
  switch (type) {
    case "hike":
      return "🥾";
    case "beach":
      return "🏖️";
    case "restaurant":
      return "🍽️";
    case "museum":
      return "🏛️";
    case "transport":
      return "🚗";
    case "activity":
      return "⭐";
    case "shopping":
      return "🛍️";
    case "viewpoint":
      return "📸";
    case "nightlife":
      return "🍸";
    default:
      return "📍";
  }
}

export function getTimeBlockLabel(block: string): string {
  switch (block) {
    case "morning":
      return "Morning";
    case "midday":
      return "Midday";
    case "afternoon":
      return "Afternoon";
    case "sunset":
      return "Sunset";
    case "evening":
      return "Evening";
    default:
      return block;
  }
}

/**
 * Parse a date string (YYYY-MM-DD) as local time, not UTC.
 * This prevents the common bug where "2026-06-15" gets interpreted as UTC midnight,
 * which shows as June 14 in Pacific time.
 */
function parseLocalDate(dateString: string): Date {
  // Handle both "2026-06-15" and "2026-06-15T00:00:00" formats
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatTripDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTripDateRange(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.getDate()}, ${end.getFullYear()}`;
  } else if (sameYear) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${end.getFullYear()}`;
  } else {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
}

export function calculateTripDuration(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end days
}

// Export parseLocalDate for use in other components
export { parseLocalDate };

// ============================================
// Travel Settings & Import Hooks
// Part of the trip import workflow - see docs/travel-module-prd.md
// ============================================

/**
 * Get user's travel settings (Claude instructions, family profile, output template)
 */
export function useTravelSettings() {
  return useQuery({
    queryKey: ["travel-settings"],
    queryFn: async () => {
      const response = await travelApi.settings.get();
      return response.data.data as TravelSettings | null;
    },
  });
}

/**
 * Update travel settings
 */
export function useUpdateTravelSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      claude_instructions?: string;
      family_profile?: unknown;
      output_template?: unknown;
    }) => {
      const response = await travelApi.settings.update(data);
      return response.data.data as TravelSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-settings"] });
    },
  });
}

/**
 * Update only Claude instructions
 */
export function useUpdateClaudeInstructions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claude_instructions: string) => {
      const response = await travelApi.settings.updateClaudeInstructions(claude_instructions);
      return response.data.data as TravelSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-settings"] });
    },
  });
}

/**
 * Update only family profile
 */
export function useUpdateFamilyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (family_profile: unknown) => {
      const response = await travelApi.settings.updateFamilyProfile(family_profile);
      return response.data.data as TravelSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-settings"] });
    },
  });
}

/**
 * Validate import payload before importing
 */
export function useValidateImport() {
  return useMutation({
    mutationFn: async (payload: TripImportPayload) => {
      const response = await travelApi.import.validate(payload);
      return response.data as TripImportValidationResult;
    },
  });
}

/**
 * Import research JSON from Claude
 */
export function useImportTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      options,
    }: {
      payload: TripImportPayload;
      options?: TripImportOptions;
    }) => {
      const response = await travelApi.import.import({ payload, options });
      return response.data as TripImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip", result.trip_id] });
      queryClient.invalidateQueries({ queryKey: ["trip-segments", result.trip_id] });
      queryClient.invalidateQueries({ queryKey: ["trip-days", result.trip_id] });
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", result.trip_id] });
    },
  });
}

/**
 * Get import template
 */
export function useImportTemplate() {
  return useQuery({
    queryKey: ["travel-import-template"],
    queryFn: async () => {
      const response = await travelApi.import.getTemplate();
      return response.data;
    },
  });
}

/**
 * Import meals research
 * Updates existing meal activities with restaurant details from Claude research
 */
export function useImportMeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payload,
      trip_id,
    }: {
      payload: {
        meals: Array<{
          activity_id: string;
          original_name: string;
          recommended: {
            name: string;
            why_chosen: string;
            cuisine?: string;
            price_range?: string;
            address?: string;
            google_maps_url?: string;
            reservation_needed?: boolean;
            typical_wait?: string;
            kid_notes?: string;
            must_try?: string[];
            tips?: string;
          };
          alternatives?: Array<{
            name: string;
            why_backup: string;
            cuisine?: string;
            price_range?: string;
          }>;
        }>;
      };
      trip_id: string;
    }) => {
      const response = await travelApi.import.meals({ payload, trip_id });
      return response.data as {
        success: boolean;
        data: {
          updated: number;
          skipped: number;
          total: number;
          errors?: string[];
        };
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.trip_id] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", variables.trip_id, "full"] });
    },
  });
}

// ============================================
// Research Items Hooks
// Part of the trip import workflow - see docs/travel-module-prd.md
// ============================================

/**
 * Get research items for a trip
 */
export function useTripResearchItems(
  tripId: string,
  params?: {
    status?: ResearchItemStatus;
    item_type?: string;
    priority?: ResearchItemPriority;
    segment_id?: string;
    assigned_day?: number;
  }
) {
  return useQuery({
    queryKey: ["trip-research-items", tripId, params],
    queryFn: async () => {
      const response = await travelApi.researchItems.list(tripId, params);
      return response.data.data as TripResearchItem[];
    },
    enabled: !!tripId,
  });
}

/**
 * Get a single research item
 */
export function useTripResearchItem(id: string) {
  return useQuery({
    queryKey: ["trip-research-item", id],
    queryFn: async () => {
      const response = await travelApi.researchItems.get(id);
      return response.data.data as TripResearchItem;
    },
    enabled: !!id,
  });
}

/**
 * Update a research item
 */
export function useUpdateResearchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateResearchItemRequest;
    }) => {
      const response = await travelApi.researchItems.update(id, updates);
      return response.data.data as TripResearchItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", data.trip_id] });
      queryClient.invalidateQueries({ queryKey: ["trip-research-item", data.id] });
    },
  });
}

/**
 * Delete a research item
 */
export function useDeleteResearchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      await travelApi.researchItems.delete(id);
      return { id, tripId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", data.tripId] });
    },
  });
}

/**
 * Bulk update research items
 */
export function useBulkUpdateResearchItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      updates,
      tripId,
    }: {
      ids: string[];
      updates: UpdateResearchItemRequest;
      tripId: string;
    }) => {
      const response = await travelApi.researchItems.bulkUpdate(ids, updates);
      return { data: response.data.data, tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", result.tripId] });
    },
  });
}

/**
 * Import a research item as an activity
 */
export function useImportResearchItemToActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dayId,
      tripId,
    }: {
      id: string;
      dayId: string;
      tripId: string;
    }) => {
      const response = await travelApi.researchItems.importToActivity(id, dayId);
      return { ...response.data, tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", result.tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-activities", result.tripId] });
    },
  });
}

// Research Item utility functions

export function getResearchItemStatusColor(status: ResearchItemStatus): string {
  switch (status) {
    case "unprocessed":
      return "#9CA3AF"; // gray
    case "reviewing":
      return "#F59E0B"; // amber
    case "approved":
      return "#22C55E"; // green
    case "expanded":
      return "#3B82F6"; // blue
    case "imported":
      return "#6366F1"; // indigo
    case "rejected":
      return "#EF4444"; // red
    case "deferred":
      return "#8B5CF6"; // violet
    default:
      return "#9CA3AF";
  }
}

export function getResearchItemStatusLabel(status: ResearchItemStatus): string {
  switch (status) {
    case "unprocessed":
      return "Unprocessed";
    case "reviewing":
      return "Reviewing";
    case "approved":
      return "Approved";
    case "expanded":
      return "Expanded";
    case "imported":
      return "Imported";
    case "rejected":
      return "Rejected";
    case "deferred":
      return "Deferred";
    default:
      return status;
  }
}

export function getResearchItemPriorityColor(priority: ResearchItemPriority): string {
  switch (priority) {
    case "must_do":
      return "#EF4444"; // red
    case "recommended":
      return "#F59E0B"; // amber
    case "optional":
      return "#22C55E"; // green
    case "backup":
      return "#6B7280"; // gray
    case "if_time":
      return "#9CA3AF"; // light gray
    default:
      return "#9CA3AF";
  }
}

export function getResearchItemPriorityLabel(priority: ResearchItemPriority): string {
  switch (priority) {
    case "must_do":
      return "Must Do";
    case "recommended":
      return "Recommended";
    case "optional":
      return "Optional";
    case "backup":
      return "Backup";
    case "if_time":
      return "If Time";
    default:
      return priority;
  }
}

// ============================================
// Phase 2 Expansion Hooks
// Transforms research items into rich narrative content via Claude API
// See docs/travel-module-prd.md and HOW-IT-WORKS.md
// ============================================

/**
 * Expand a single research item using Claude API
 * Generates deep_dive_content, kid_engagement, visit_script, photo_guide
 */
export function useExpandResearchItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      tripId,
    }: {
      id: string;
      tripId: string;
    }) => {
      const response = await travelApi.researchItems.expand(id);
      return { ...response.data, tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", result.tripId] });
      queryClient.invalidateQueries({ queryKey: ["trip-research-item", result.data?.id] });
    },
  });
}

/**
 * Expand multiple research items in bulk
 */
export function useExpandResearchItemsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      tripId,
    }: {
      ids: string[];
      tripId: string;
    }) => {
      const response = await travelApi.researchItems.expandBulk(ids);
      return { ...response.data, tripId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trip-research-items", result.tripId] });
    },
  });
}

/**
 * Type guard to check if a research item has been expanded
 */
export function isResearchItemExpanded(item: TripResearchItem): boolean {
  return !!(item.deep_dive_content || item.expanded_at);
}

/**
 * Get the expansion output from a research item (if expanded)
 */
export function getExpansionOutput(item: TripResearchItem): ExpansionOutput | null {
  if (!isResearchItemExpanded(item)) {
    return null;
  }

  return {
    deep_dive_content: item.deep_dive_content || "",
    kid_engagement: item.kid_engagement || {
      age_7: [],
      age_5: [],
      age_3: [],
      conversation_starters: [],
      games: [],
    },
    visit_script: item.visit_script || {
      arrival: "",
      flow: "",
      highlight_moments: [],
      exit_strategy: "",
    },
    photo_guide: item.photo_guide || [],
    practical_details_extended: item.practical_details_extended || {
      insider_tips: [],
      warnings: [],
      money_saving: [],
      with_stroller: "",
      bathroom_locations: "",
      food_nearby: "",
      rest_spots: "",
    },
  };
}

// ============================================
// Travel Schedule Assembly Hooks (Phase 4)
// 15-minute precision daily schedules with travel times
// ============================================

/**
 * Fetch assembled schedule items for a trip
 */
export function useTripSchedule(tripId: string) {
  return useQuery({
    queryKey: ["travel", "trips", tripId, "schedule"],
    queryFn: async () => {
      const response = await travelApi.schedule.get(tripId);
      return response.data.data as DailyScheduleItem[];
    },
    enabled: !!tripId,
  });
}

/**
 * Assemble daily schedule using AI
 * This replaces any existing schedule with newly generated 15-minute precision items
 *
 * Options:
 * - validateOnly: Dry run, just validate existing schedule without regenerating
 * - skipEnrichment: Skip pre-flight Google data fetch for activities
 */
export function useAssembleTripSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, validateOnly, skipEnrichment }: {
      tripId: string;
      validateOnly?: boolean;
      skipEnrichment?: boolean;
    }) => {
      const response = await travelApi.schedule.assemble(tripId, { validateOnly, skipEnrichment });
      return response.data as AssembleScheduleResponse;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"] });
    },
  });
}

// DailyScheduleItem type for assembled schedule
export interface DailyScheduleItem {
  id: string;
  trip_id: string;
  day_id: string;
  segment_id?: string;
  time_start: string;
  time_end: string;
  duration_minutes?: number;
  event_type: "activity" | "meal" | "transit" | "buffer" | "logistics";
  title: string;
  description?: string;
  notes?: string;
  tips?: string[];
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  google_maps_url?: string;
  travel_mode?: "walking" | "driving" | "transit" | "taxi" | "ferry";
  travel_minutes?: number;
  travel_distance_km?: number;
  travel_from_name?: string;
  travel_to_name?: string;
  research_item_id?: string;
  cost_estimate?: number;
  cost_currency?: string;
  booking_required?: boolean;
  booking_url?: string;
  calendar_sync_status?: string;
  // Validation fields
  validation_status?: ScheduleItemValidationStatus;
  validation_issues?: ValidationIssue[];
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  day?: { id: string; date: string; day_number: number };
  segment?: { id: string; name: string };
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

// ============================================
// RV Locations Hooks
// ============================================

// RV Location Hooks
export function useRVLocations(params?: {
  category?: string;
  status?: string;
  state?: string;
  tags?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["rv-locations", params],
    queryFn: async () => {
      const response = await rvLocationsApi.list(params);
      return response.data.data as RVLocation[];
    },
  });
}

export function useRVLocation(id: string) {
  return useQuery({
    queryKey: ["rv-locations", id],
    queryFn: async () => {
      const response = await rvLocationsApi.get(id);
      return response.data.data as RVLocation;
    },
    enabled: !!id,
  });
}

export function useRVLocationFull(id: string) {
  return useQuery({
    queryKey: ["rv-locations", id, "full"],
    queryFn: async () => {
      const response = await rvLocationsApi.getFull(id);
      return response.data.data as RVLocation & {
        activities: RVLocationActivity[];
        media: RVLocationMedia[];
      };
    },
    enabled: !!id,
  });
}

export function useCreateRVLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRVLocationRequest) => {
      const response = await rvLocationsApi.create(data);
      return response.data.data as RVLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations"] });
    },
  });
}

export function useUpdateRVLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RVLocation> }) => {
      const response = await rvLocationsApi.update(id, data);
      return response.data.data as RVLocation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations"] });
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.id] });
    },
  });
}

export function useDeleteRVLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await rvLocationsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations"] });
    },
  });
}

// RV Location Activities Hooks
export function useRVLocationActivities(locationId: string) {
  return useQuery({
    queryKey: ["rv-locations", locationId, "activities"],
    queryFn: async () => {
      const response = await rvLocationsApi.activities.list(locationId);
      return response.data.data as RVLocationActivity[];
    },
    enabled: !!locationId,
  });
}

export function useCreateRVLocationActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      data,
    }: {
      locationId: string;
      data: CreateRVLocationActivityRequest;
    }) => {
      const response = await rvLocationsApi.activities.create(locationId, data);
      return response.data.data as RVLocationActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

export function useUpdateRVLocationActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      activityId,
      data,
    }: {
      locationId: string;
      activityId: string;
      data: Partial<RVLocationActivity>;
    }) => {
      const response = await rvLocationsApi.activities.update(locationId, activityId, data);
      return response.data.data as RVLocationActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

export function useDeleteRVLocationActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, activityId }: { locationId: string; activityId: string }) => {
      await rvLocationsApi.activities.delete(locationId, activityId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

// RV Location Media Hooks
export function useRVLocationMedia(locationId: string) {
  return useQuery({
    queryKey: ["rv-locations", locationId, "media"],
    queryFn: async () => {
      const response = await rvLocationsApi.media.list(locationId);
      return response.data.data as RVLocationMedia[];
    },
    enabled: !!locationId,
  });
}

export function useCreateRVLocationMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      data,
    }: {
      locationId: string;
      data: CreateRVLocationMediaRequest;
    }) => {
      const response = await rvLocationsApi.media.create(locationId, data);
      return response.data.data as RVLocationMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

export function useCreateRVLocationMediaBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      media,
    }: {
      locationId: string;
      media: CreateRVLocationMediaRequest[];
    }) => {
      const response = await rvLocationsApi.media.createBulk(locationId, media);
      return response.data.data as RVLocationMedia[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

export function useDeleteRVLocationMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, mediaId }: { locationId: string; mediaId: string }) => {
      await rvLocationsApi.media.delete(locationId, mediaId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

export function useToggleRVLocationMediaFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, mediaId }: { locationId: string; mediaId: string }) => {
      const response = await rvLocationsApi.media.toggleFavorite(locationId, mediaId);
      return response.data.data as RVLocationMedia;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

// RV Location Google Places Hooks
export function useFetchRVLocationGooglePlaces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      placeId,
      fetchPhotos = true,
    }: {
      locationId: string;
      placeId?: string;
      fetchPhotos?: boolean;
    }) => {
      const response = await rvLocationsApi.fetchGooglePlaces(locationId, {
        place_id: placeId,
        fetch_photos: fetchPhotos,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

export function useFetchRVActivityGooglePlaces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      activityId,
      placeId,
    }: {
      locationId: string;
      activityId: string;
      placeId?: string;
    }) => {
      const response = await rvLocationsApi.fetchActivityGooglePlaces(locationId, activityId, {
        place_id: placeId,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
    },
  });
}

// RV Location Import Hook
export function useImportRVLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RVLocationImportPayload) => {
      const response = await rvLocationsApi.import(payload);
      return response.data.data as RVLocationImportResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations"] });
    },
  });
}

// RV Location Import Validation Hook (dry-run)
export function useValidateRVImport() {
  return useMutation({
    mutationFn: async (payload: RVLocationImportPayload) => {
      const response = await rvLocationsApi.validateImport(payload);
      return response.data as RVImportValidationResult;
    },
  });
}

// RV Location Enrichment Hook
export function useEnrichRVLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      options,
    }: {
      locationId: string;
      options?: {
        fetch_reviews?: boolean;
        fetch_photos?: boolean;
        fetch_hours?: boolean;
        enrich_activities?: boolean;
        max_photos?: number;
      };
    }) => {
      const response = await rvLocationsApi.enrich(locationId, options);
      return response.data as {
        success: boolean;
        location_updated: boolean;
        activities_enriched: number;
        photos_added: number;
        reviews_fetched: number;
        errors?: string[];
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
      queryClient.invalidateQueries({ queryKey: ["rv-locations"] });
    },
  });
}

// RV Location Activity Suggestions Hook
export function useSuggestRVActivities() {
  return useMutation({
    mutationFn: async (locationId: string) => {
      const response = await rvLocationsApi.suggestActivities(locationId);
      return response.data as {
        success: boolean;
        suggestions: Array<{
          name: string;
          activity_type: string;
          description: string;
          duration_text?: string;
          difficulty?: string;
          why_recommended: string;
          kid_engagement?: Record<string, unknown>;
        }>;
      };
    },
  });
}

// RV Location Convert to Trip Hook
export function useConvertRVLocationToTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      options,
    }: {
      locationId: string;
      options?: { start_date?: string; end_date?: string; traveler_count?: number };
    }) => {
      const response = await rvLocationsApi.convertToTrip(locationId, options);
      return response.data.data as RVLocationConvertToTripResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", variables.locationId] });
      queryClient.invalidateQueries({ queryKey: ["travel", "trips"] });
    },
  });
}

// RV Location Share Hooks
export function useGenerateRVLocationShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      const response = await rvLocationsApi.share.generate(locationId);
      return response.data.data as { share_slug: string };
    },
    onSuccess: (_, locationId) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", locationId] });
    },
  });
}

export function useRevokeRVLocationShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      await rvLocationsApi.share.revoke(locationId);
    },
    onSuccess: (_, locationId) => {
      queryClient.invalidateQueries({ queryKey: ["rv-locations", locationId] });
    },
  });
}

export function usePublicRVLocation(slug: string) {
  return useQuery({
    queryKey: ["rv-locations", "public", slug],
    queryFn: async () => {
      const response = await rvLocationsApi.share.getPublic(slug);
      return response.data.data as RVLocation & {
        activities: RVLocationActivity[];
        media: RVLocationMedia[];
      };
    },
    enabled: !!slug,
  });
}

export function usePublicRVLocations(params?: {
  status?: string;
  category?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["rv-locations", "public", "all", params],
    queryFn: async () => {
      const response = await rvLocationsApi.share.getAll(params);
      return response.data.data as (RVLocation & {
        activities?: Array<{ id: string; name: string; activity_type?: string }>;
        activity_count?: number;
        preview_photos?: string[];
      })[];
    },
  });
}

// RV Location Settings Hooks
export function useRVResearchSettings() {
  return useQuery({
    queryKey: ["rv-research-settings"],
    queryFn: async () => {
      const response = await rvLocationsApi.settings.get();
      return response.data.data as RVResearchSettings | null;
    },
  });
}

export function useUpdateRVResearchSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      claude_instructions?: string;
      family_profile?: RVResearchSettings["family_profile"];
      output_template?: Record<string, unknown>;
    }) => {
      const response = await rvLocationsApi.settings.update(data);
      return response.data.data as RVResearchSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rv-research-settings"] });
    },
  });
}

export function useUpdateRVClaudeInstructions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claude_instructions: string) => {
      const response = await rvLocationsApi.settings.updateInstructions(claude_instructions);
      return response.data.data as RVResearchSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rv-research-settings"] });
    },
  });
}

// RV Location Helper Functions
export function getRVLocationStatusColor(status: string): string {
  switch (status) {
    case "researching":
      return "#3B82F6"; // blue
    case "want_to_visit":
      return "#22C55E"; // green
    case "visited":
      return "#6B7280"; // gray
    case "not_interested":
      return "#EF4444"; // red
    default:
      return "#9CA3AF";
  }
}

export function getRVLocationStatusLabel(status: string): string {
  switch (status) {
    case "researching":
      return "Researching";
    case "want_to_visit":
      return "Want to Visit";
    case "visited":
      return "Visited";
    case "not_interested":
      return "Not Interested";
    default:
      return status;
  }
}

export function getRVLocationCategoryLabel(category: string): string {
  switch (category) {
    case "harvest_hosts":
      return "Harvest Hosts";
    case "national_parks":
      return "National Parks";
    case "state_parks":
      return "State Parks";
    case "hot_springs":
      return "Hot Springs";
    case "lake_river":
      return "Lake/River";
    case "boondocking":
      return "Boondocking";
    case "couples_getaway":
      return "Couples Getaway";
    case "other":
      return "Other";
    default:
      return category;
  }
}

export function getRVLocationCategoryColor(category: string): string {
  switch (category) {
    case "harvest_hosts":
      return "#F59E0B"; // amber
    case "national_parks":
      return "#22C55E"; // green
    case "state_parks":
      return "#84CC16"; // lime
    case "hot_springs":
      return "#EF4444"; // red
    case "lake_river":
      return "#3B82F6"; // blue
    case "boondocking":
      return "#8B5CF6"; // violet
    case "couples_getaway":
      return "#EC4899"; // pink
    case "other":
      return "#6B7280"; // gray
    default:
      return "#9CA3AF";
  }
}

export function getRVLandTypeLabel(landType: string): string {
  switch (landType) {
    case "national_park":
      return "National Park";
    case "state_park":
      return "State Park";
    case "national_monument":
      return "National Monument";
    case "national_forest":
      return "National Forest";
    case "blm":
      return "BLM";
    case "national_recreation_area":
      return "Nat'l Rec Area";
    case "national_wildlife_refuge":
      return "Wildlife Refuge";
    case "army_corps":
      return "Army Corps";
    case "county_park":
      return "County Park";
    case "city_park":
      return "City Park";
    case "private_rv_park":
      return "Private RV Park";
    case "private_campground":
      return "Private Campground";
    case "casino":
      return "Casino";
    case "other":
      return "Other";
    default:
      return landType;
  }
}

export function getRVLandTypeColor(landType: string): string {
  switch (landType) {
    case "national_park":
      return "#166534"; // dark green (NPS)
    case "state_park":
      return "#15803D"; // green
    case "national_monument":
      return "#B45309"; // amber/brown
    case "national_forest":
      return "#14532D"; // forest green
    case "blm":
      return "#CA8A04"; // yellow/gold
    case "national_recreation_area":
      return "#0369A1"; // sky blue
    case "national_wildlife_refuge":
      return "#065F46"; // teal
    case "army_corps":
      return "#1E40AF"; // blue
    case "county_park":
      return "#7C3AED"; // purple
    case "city_park":
      return "#A855F7"; // light purple
    case "private_rv_park":
      return "#DC2626"; // red
    case "private_campground":
      return "#EA580C"; // orange
    case "casino":
      return "#BE185D"; // pink
    case "other":
      return "#6B7280"; // gray
    default:
      return "#9CA3AF";
  }
}

export function getRVActivityTypeIcon(type: string): string {
  switch (type) {
    case "hike":
      return "🥾";
    case "bike":
      return "🚴";
    case "swim":
      return "🏊";
    case "fish":
      return "🎣";
    case "kayak":
      return "🛶";
    case "paddleboard":
      return "🏄";
    case "horseback":
      return "🐴";
    case "wildlife_viewing":
      return "🦌";
    case "stargazing":
      return "⭐";
    case "hot_springs":
      return "♨️";
    case "beach":
      return "🏖️";
    case "playground":
      return "🎠";
    case "visitor_center":
      return "🏛️";
    case "ranger_program":
      return "🏕️";
    case "scenic_drive":
      return "🚗";
    case "photography":
      return "📷";
    default:
      return "📍";
  }
}
