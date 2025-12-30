import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { biomarkersApi } from "@/lib/api";
import { Biomarker, CreateBiomarkerRequest } from "@/types";

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
