import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { biomarkerStarsApi } from "@/lib/api";
import { BiomarkerStar } from "@/types";

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

// Convenience hook for toggling star status
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
