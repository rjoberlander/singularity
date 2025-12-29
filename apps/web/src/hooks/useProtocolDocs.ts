import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { protocolDocsApi } from "@/lib/api";
import { ProtocolDoc } from "@/types";

export function useProtocolDocs(params?: { category?: string }) {
  return useQuery({
    queryKey: ["protocol-docs", params],
    queryFn: async () => {
      const response = await protocolDocsApi.list(params);
      return response.data.data as ProtocolDoc[];
    },
  });
}

export function useProtocolDoc(id: string) {
  return useQuery({
    queryKey: ["protocol-docs", id],
    queryFn: async () => {
      const response = await protocolDocsApi.get(id);
      return response.data.data as ProtocolDoc;
    },
    enabled: !!id,
  });
}

export function useCreateProtocolDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProtocolDoc>) => {
      const response = await protocolDocsApi.create(data);
      return response.data.data as ProtocolDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-docs"] });
    },
  });
}

export function useUpdateProtocolDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProtocolDoc> }) => {
      const response = await protocolDocsApi.update(id, data);
      return response.data.data as ProtocolDoc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["protocol-docs"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-docs", variables.id] });
    },
  });
}

export function useDeleteProtocolDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await protocolDocsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-docs"] });
    },
  });
}
