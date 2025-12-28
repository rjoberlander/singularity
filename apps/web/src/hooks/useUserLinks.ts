import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userLinksApi } from "@/lib/api";
import { UserLink } from "@/types";

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
