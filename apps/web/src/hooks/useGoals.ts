import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api";
import { Goal } from "@/types";

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

// Helper to calculate goal progress
export function calculateGoalProgress(goal: Goal): number {
  if (!goal.current_value || !goal.target_value) return 0;

  const current = goal.current_value;
  const target = goal.target_value;
  const start = goal.direction === "decrease" ? target * 2 : 0;

  if (goal.direction === "decrease") {
    // For decrease goals, progress increases as value decreases
    const total = start - target;
    const progress = start - current;
    return Math.min(100, Math.max(0, (progress / total) * 100));
  } else if (goal.direction === "increase") {
    // For increase goals, progress increases as value increases
    return Math.min(100, Math.max(0, (current / target) * 100));
  } else {
    // For maintain goals, check if within range (assume 5% tolerance)
    const tolerance = target * 0.05;
    if (Math.abs(current - target) <= tolerance) return 100;
    return 50;
  }
}
