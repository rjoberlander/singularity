import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { ExtractedBiomarkerData, AIConversation, ChatMessage } from "@/types";

export function useExtractBiomarkers() {
  return useMutation({
    mutationFn: async (data: {
      image_base64?: string;
      text_content?: string;
      source_type: "image" | "text";
    }) => {
      const response = await aiApi.extractBiomarkers(data);
      return response.data.data as ExtractedBiomarkerData;
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
