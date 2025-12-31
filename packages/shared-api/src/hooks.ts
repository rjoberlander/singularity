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
