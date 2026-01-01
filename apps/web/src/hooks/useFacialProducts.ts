import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { facialProductsApi } from "@/lib/api";
import { FacialProduct, CreateFacialProductRequest } from "@/types";

export function useFacialProducts(params?: {
  category?: string;
  is_active?: boolean;
  routine?: string;
}) {
  return useQuery({
    queryKey: ["facial-products", params],
    queryFn: async () => {
      const response = await facialProductsApi.list(params);
      return response.data.data as FacialProduct[];
    },
  });
}

export function useFacialProduct(id: string) {
  return useQuery({
    queryKey: ["facial-products", id],
    queryFn: async () => {
      const response = await facialProductsApi.get(id);
      return response.data.data as FacialProduct;
    },
    enabled: !!id,
  });
}

export function useCreateFacialProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFacialProductRequest) => {
      const response = await facialProductsApi.create(data);
      return response.data.data as FacialProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facial-products"] });
    },
  });
}

export function useCreateFacialProductsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: CreateFacialProductRequest[]) => {
      const response = await facialProductsApi.createBulk(products);
      return response.data.data as FacialProduct[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facial-products"] });
    },
  });
}

export function useUpdateFacialProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FacialProduct> }) => {
      const response = await facialProductsApi.update(id, data);
      return response.data.data as FacialProduct;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["facial-products"] });
      queryClient.invalidateQueries({ queryKey: ["facial-products", variables.id] });
    },
  });
}

export function useToggleFacialProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await facialProductsApi.toggle(id);
      return response.data.data as FacialProduct;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["facial-products"] });
      queryClient.invalidateQueries({ queryKey: ["facial-products", id] });
    },
  });
}

export function useDeleteFacialProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await facialProductsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facial-products"] });
    },
  });
}

// Cost calculations for facial products
export function useFacialProductCosts(products: FacialProduct[] | undefined) {
  const activeProducts = products?.filter((p) => p.is_active) || [];

  // Calculate monthly cost estimate
  // Assume products last approximately:
  // - Full face products: 2-3 months
  // - Eye products: 3-4 months
  // - Sunscreen (daily): 1-2 months
  const monthlyCost = activeProducts.reduce((sum, p) => {
    if (!p.price || !p.size_amount) return sum;

    // Estimate monthly usage based on category
    let monthsPerBottle = 2; // default
    if (p.category === 'sunscreen') monthsPerBottle = 1.5;
    else if (p.category === 'eye_care') monthsPerBottle = 4;
    else if (p.category === 'mask') monthsPerBottle = 3;
    else if (p.category === 'treatment') monthsPerBottle = 3;

    return sum + (p.price / monthsPerBottle);
  }, 0);

  const roundedMonthly = Math.round(monthlyCost * 100) / 100;

  return {
    daily: Math.round((roundedMonthly / 30) * 100) / 100,
    monthly: roundedMonthly,
    yearly: Math.round(roundedMonthly * 12 * 100) / 100,
    activeCount: activeProducts.length,
    totalCount: products?.length || 0,
  };
}
