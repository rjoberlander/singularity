import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api";
import { Equipment, CreateEquipmentRequest } from "@/types";

export function useEquipment(params?: {
  category?: string;
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ["equipment", params],
    queryFn: async () => {
      const response = await equipmentApi.list(params);
      return response.data.data as Equipment[];
    },
  });
}

export function useEquipmentItem(id: string) {
  return useQuery({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const response = await equipmentApi.get(id);
      return response.data.data as Equipment;
    },
    enabled: !!id,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEquipmentRequest) => {
      const response = await equipmentApi.create(data);
      return response.data.data as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useCreateEquipmentBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: CreateEquipmentRequest[]) => {
      const response = await equipmentApi.createBulk(equipment);
      return response.data.data as Equipment[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Equipment> }) => {
      const response = await equipmentApi.update(id, data);
      return response.data.data as Equipment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment", variables.id] });
    },
  });
}

export function useToggleEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await equipmentApi.toggle(id);
      return response.data.data as Equipment;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment", id] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await equipmentApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-duplicates"] });
    },
  });
}

export function useEquipmentDuplicates() {
  return useQuery({
    queryKey: ["equipment-duplicates"],
    queryFn: async () => {
      const response = await equipmentApi.getDuplicates();
      return response.data.data as {
        duplicateIds: string[];
        groups: Array<{
          items: Array<{
            id: string;
            name: string;
            brand?: string;
            confidence: number;
          }>;
        }>;
      };
    },
  });
}
