import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routinesApi } from "@/lib/api";
import { Routine, RoutineItem } from "@/types";

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

// Helper to filter routine items by day
export function filterRoutineItemsByDay(
  items: RoutineItem[],
  dayOfWeek: string // "mon", "tue", "wed", "thu", "fri", "sat", "sun"
): RoutineItem[] {
  return items.filter((item) => {
    if (!item.days || item.days.length === 0) return true; // Show if no days specified
    return item.days.includes(dayOfWeek.toLowerCase());
  });
}

// Get current day abbreviation
export function getCurrentDayAbbrev(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
}
