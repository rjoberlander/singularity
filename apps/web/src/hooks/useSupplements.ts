import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplementsApi } from "@/lib/api";
import { Supplement, CreateSupplementRequest } from "@/types";

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

// Cost calculations
export function useSupplementCosts(supplements: Supplement[] | undefined) {
  const activeSupplements = supplements?.filter((s) => s.is_active) || [];

  const dailyCost = activeSupplements.reduce(
    (sum, s) => sum + (s.price_per_serving || 0),
    0
  );

  return {
    daily: dailyCost,
    weekly: dailyCost * 7,
    monthly: dailyCost * 30,
    yearly: dailyCost * 365,
    activeCount: activeSupplements.length,
    totalCount: supplements?.length || 0,
  };
}
