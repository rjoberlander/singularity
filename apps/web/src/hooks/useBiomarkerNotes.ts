import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { biomarkerNotesApi } from "@/lib/api";
import { BiomarkerNote } from "@/types";

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
