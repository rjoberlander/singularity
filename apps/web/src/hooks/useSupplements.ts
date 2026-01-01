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

// Cost calculations
export function useSupplementCosts(supplements: Supplement[] | undefined) {
  const activeSupplements = supplements?.filter((s) => s.is_active) || [];

  // Calculate daily cost for each supplement based on price, servings, intake quantity, timings, and frequency
  const dailyCost = activeSupplements.reduce((sum, s) => {
    if (!s.price || !s.servings_per_container) return sum;

    const intakeQty = s.intake_quantity || 1;
    const timingsCount = s.timings?.length || (s.timing ? 1 : 0) || 1;

    let freqMultiplier = 1;
    if (s.frequency === "every_other_day") freqMultiplier = 0.5;
    else if (s.frequency === "as_needed") freqMultiplier = 0.5;

    const dailyServings = intakeQty * timingsCount * freqMultiplier;
    const costPerServing = s.price / s.servings_per_container;
    const supplementDailyCost = costPerServing * dailyServings;

    return sum + supplementDailyCost;
  }, 0);

  // Round daily to 2 decimal places, then derive monthly/yearly from that
  // This ensures the displayed math is consistent (daily * 30 = monthly)
  const roundedDaily = Math.round(dailyCost * 100) / 100;

  return {
    daily: roundedDaily,
    weekly: Math.round(roundedDaily * 7 * 100) / 100,
    monthly: Math.round(roundedDaily * 30 * 100) / 100,
    yearly: Math.round(roundedDaily * 365 * 100) / 100,
    activeCount: activeSupplements.length,
    totalCount: supplements?.length || 0,
  };
}
