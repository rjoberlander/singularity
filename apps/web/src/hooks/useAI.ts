import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi, aiApiKeysApi } from "@/lib/api";
import { ExtractedBiomarkerData, ExtractedSupplementData, AIConversation, ChatMessage } from "@/types";

interface AIAPIKey {
  id: string;
  provider: string;
  key_name: string;
  api_key_masked: string;
  is_primary: boolean;
  is_active: boolean;
  health_status: string;
}

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
    }) => {
      const response = await aiApi.extractSupplements(data);
      return response.data.data as ExtractedSupplementData;
    },
  });
}

interface ExtractedEquipmentData {
  equipment: Array<{
    name: string;
    brand?: string;
    model?: string;
    category?: string;
    purpose?: string;
    specs?: Record<string, any>;
    usage_frequency?: string;
    usage_timing?: string;
    usage_duration?: string;
    usage_protocol?: string;
    contraindications?: string;
    confidence: number;
  }>;
  extraction_notes?: string;
}

export function useExtractEquipment() {
  return useMutation({
    mutationFn: async (data: { text_content: string }) => {
      const response = await aiApi.extractEquipment(data);
      return response.data.data as ExtractedEquipmentData;
    },
  });
}

interface AnalyzeBiomarkerTrendInput {
  biomarkerName: string;
  currentValue: number;
  unit: string;
  optimalRange: { low: number; high: number };
  trendDirection: string;
  percentChange: number | null;
  history: Array<{ value: number; date: string }>;
}

interface AnalyzeBiomarkerTrendResult {
  analysis: string;
}

export function useAnalyzeBiomarkerTrend() {
  return useMutation({
    mutationFn: async (data: AnalyzeBiomarkerTrendInput) => {
      const response = await aiApi.analyzeBiomarkerTrend(data);
      return response.data.data as AnalyzeBiomarkerTrendResult;
    },
  });
}

interface ProtocolAnalysisInput {
  biomarkerName?: string;
  question?: string;
}

interface ProtocolAnalysisResult {
  analysis: string;
  correlations: {
    supplements: Array<{
      name: string;
      effect: string;
      strength: string;
      mechanism: string;
    }>;
    changes: Array<{
      item_name: string;
      change_type: string;
      changed_at: string;
    }>;
    relatedBiomarkers: Array<{
      name: string;
      value: number;
      unit: string;
      status: string;
    }>;
  };
  hepatotoxicityWarnings?: Array<{
    supplement: string;
    risk: string;
  }>;
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

// Helper to manage local chat state
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function createInitialChatState(): ChatState {
  return {
    messages: [],
    isLoading: false,
  };
}

export function addMessage(state: ChatState, message: ChatMessage): ChatState {
  return {
    ...state,
    messages: [...state.messages, message],
  };
}

export function setLoading(state: ChatState, isLoading: boolean): ChatState {
  return {
    ...state,
    isLoading,
  };
}
