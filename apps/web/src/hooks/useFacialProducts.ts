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
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["facial-products"] });

      // Get all cached queries and update them optimistically
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: ["facial-products"] });

      const previousData: { queryKey: unknown[]; data: FacialProduct[] }[] = [];

      queries.forEach((query) => {
        const data = query.state.data as FacialProduct[] | undefined;
        if (data && Array.isArray(data)) {
          previousData.push({ queryKey: query.queryKey, data });
          queryClient.setQueryData<FacialProduct[]>(query.queryKey,
            data.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p)
          );
        }
      });

      return { previousData };
    },
    onError: (_, __, context) => {
      // Rollback on error
      context?.previousData?.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["facial-products"] });
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

// Valid frequencies and timings for cost calculation
const VALID_FREQUENCIES = ['daily', 'every_other_day', 'as_needed'];
const VALID_TIMINGS = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed'];

// Calculate daily applications for a product
function calculateDailyApplications(product: FacialProduct): number | null {
  const usageFrequency = (product as any).usage_frequency?.toLowerCase() || '';
  const usageTiming = (product as any).usage_timing?.toLowerCase() || '';

  // Must have valid timing
  const timingsPerDay = usageTiming && VALID_TIMINGS.includes(usageTiming) ? 1 : 0;
  if (timingsPerDay === 0) return null;

  // Frequency multiplier
  let freqMultiplier = 1;
  if (usageFrequency === 'every_other_day') freqMultiplier = 0.5;
  else if (usageFrequency === 'as_needed') freqMultiplier = 0.5; // estimate
  else if (!VALID_FREQUENCIES.includes(usageFrequency)) return null;

  return timingsPerDay * freqMultiplier;
}

// Unit conversion constants
const ML_PER_OZ = 29.5735; // 1 oz = ~29.57 ml
const ML_PER_PUMP = 0.5;   // 1 pump ≈ 0.5 ml
const ML_PER_DROP = 0.05;  // 1 drop ≈ 0.05 ml (20 drops per ml)
const ML_PER_PEA_SIZED = 0.5; // pea-sized ≈ 0.5 ml
const G_PER_PEA_SIZED = 0.5;  // pea-sized ≈ 0.5 g

// Calculate monthly cost for a single product
function calculateProductMonthlyCost(product: FacialProduct): number | null {
  const dailyApplications = calculateDailyApplications(product);
  if (!product.price || !product.size_amount || !product.usage_amount || !dailyApplications) return null;

  const sizeUnit = product.size_unit?.toLowerCase() || '';
  const usageUnit = product.usage_unit?.toLowerCase() || '';

  // Convert size to ml for unified calculation
  let sizeInMl: number;
  if (sizeUnit === 'ml') {
    sizeInMl = product.size_amount;
  } else if (sizeUnit === 'oz') {
    sizeInMl = product.size_amount * ML_PER_OZ;
  } else if (sizeUnit === 'g') {
    // Approximate: 1g ≈ 1ml for most skincare products
    sizeInMl = product.size_amount;
  } else {
    return null; // Unknown size unit
  }

  // Convert usage to ml for unified calculation
  let usageInMl: number;
  if (usageUnit === 'ml') {
    usageInMl = product.usage_amount;
  } else if (usageUnit === 'pumps') {
    usageInMl = product.usage_amount * ML_PER_PUMP;
  } else if (usageUnit === 'drops') {
    usageInMl = product.usage_amount * ML_PER_DROP;
  } else if (usageUnit === 'pea-sized') {
    usageInMl = product.usage_amount * ML_PER_PEA_SIZED;
  } else {
    return null; // Unknown usage unit
  }

  // Calculate cost
  const mlPerDay = usageInMl * dailyApplications;
  const daysPerContainer = sizeInMl / (mlPerDay || 1);
  return (product.price / daysPerContainer) * 30;
}

// Cost calculations for facial products
export function useFacialProductCosts(products: FacialProduct[] | undefined) {
  const activeProducts = products?.filter((p) => p.is_active) || [];

  // Calculate monthly cost - use actual usage data when available
  const monthlyCost = activeProducts.reduce((sum, p) => {
    if (!p.price) return sum;

    // Try to calculate from actual usage data
    const actualCost = calculateProductMonthlyCost(p);
    if (actualCost !== null) {
      return sum + actualCost;
    }

    // No usage data - don't include in estimate (user sees warning about missing data)
    return sum;
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
