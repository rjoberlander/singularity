"use client";

import { useState, useMemo, useCallback } from "react";
import { useFacialProducts, useFacialProductCosts, useUpdateFacialProduct, useToggleFacialProduct } from "@/hooks/useFacialProducts";
import { FacialProductCard } from "@/components/facial-products/FacialProductCard";
import { FacialProductForm } from "@/components/facial-products/FacialProductForm";
import { FacialProductChatInput } from "@/components/facial-products/FacialProductChatInput";
import { FacialProductAddCombinedModal } from "@/components/facial-products/FacialProductAddCombinedModal";
import { FacialProductExtractionModal } from "@/components/facial-products/FacialProductExtractionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FacialProduct } from "@/types";
import { aiApi } from "@/lib/api";
import {
  Plus,
  Search,
  Droplet,
  ChevronUp,
  ChevronDown,
  LucideIcon,
  Power,
  ArrowUpDown,
  FlaskConical,
  Layers,
  Shield,
  Sparkles,
  MoreHorizontal,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
  BedDouble,
} from "lucide-react";
import { toast } from "sonner";

// Simplified categories (matching form and card)
const CATEGORIES = [
  "All",
  "Cleanser",
  "Toner",
  "Serum",
  "Moisturizer",
  "Sunscreen",
  "Other",
];

// Category icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  All: Droplet,
  Cleanser: Droplet,
  cleanser: Droplet,
  Toner: Droplet,
  toner: Droplet,
  Serum: FlaskConical,
  serum: FlaskConical,
  Moisturizer: Layers,
  moisturizer: Layers,
  Sunscreen: Shield,
  sunscreen: Shield,
  Other: MoreHorizontal,
  other: MoreHorizontal,
};

// Category colors for button backgrounds
const CATEGORY_COLORS: Record<string, string> = {
  All: "rgba(107, 142, 90, 0.2)",
  Cleanser: "rgba(59, 130, 246, 0.2)",
  cleanser: "rgba(59, 130, 246, 0.2)",
  Toner: "rgba(147, 197, 253, 0.2)",
  toner: "rgba(147, 197, 253, 0.2)",
  Serum: "rgba(236, 72, 153, 0.2)",
  serum: "rgba(236, 72, 153, 0.2)",
  Moisturizer: "rgba(74, 222, 128, 0.2)",
  moisturizer: "rgba(74, 222, 128, 0.2)",
  Sunscreen: "rgba(251, 191, 36, 0.2)",
  sunscreen: "rgba(251, 191, 36, 0.2)",
  Other: "rgba(107, 114, 128, 0.2)",
  other: "rgba(107, 114, 128, 0.2)",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name (A-Z)" },
  { value: "price", label: "Price" },
  { value: "category", label: "Category" },
];

// Category display to db value mapping
const categoryToDbValue: Record<string, string> = {
  Cleanser: "cleanser",
  Toner: "toner",
  Serum: "serum",
  Moisturizer: "moisturizer",
  Sunscreen: "sunscreen",
  Other: "other",
};

const dbValueToCategory: Record<string, string> = {
  cleanser: "Cleanser",
  toner: "Toner",
  serum: "Serum",
  moisturizer: "Moisturizer",
  sunscreen: "Sunscreen",
  other: "Other",
};

// Form icons and labels for batch AI modal
const FORM_CONFIG: Record<string, { label: string }> = {
  cream: { label: "Cream" },
  gel: { label: "Gel" },
  liquid: { label: "Liquid" },
  foam: { label: "Foam" },
};

// Valid frequencies (custom without days is not valid)
const VALID_FREQUENCIES = ['daily', 'every_other_day', 'as_needed'];

// Valid timings
const VALID_TIMINGS = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed'];

// Timing options with icons and colors for the modal
const TIMING_OPTIONS: { value: string; label: string; icon: LucideIcon; selectedColor: string }[] = [
  { value: "wake_up", label: "Wake", icon: Sunrise, selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-400" },
  { value: "am", label: "AM", icon: Sun, selectedColor: "bg-yellow-500/30 border-yellow-500/50 text-yellow-400" },
  { value: "lunch", label: "Lunch", icon: Utensils, selectedColor: "bg-amber-500/30 border-amber-500/50 text-amber-500" },
  { value: "pm", label: "PM", icon: Sunset, selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-500" },
  { value: "dinner", label: "Dinner", icon: Utensils, selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400" },
  { value: "evening", label: "Evening", icon: Moon, selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400" },
  { value: "bed", label: "Bed", icon: BedDouble, selectedColor: "bg-indigo-500/30 border-indigo-500/50 text-indigo-400" },
];

// Check if product has valid frequency
function hasValidFrequency(product: FacialProduct): boolean {
  const usageFrequency = (product as any).usage_frequency?.toLowerCase() || '';
  const frequencyDays = (product as any).frequency_days || [];
  return VALID_FREQUENCIES.includes(usageFrequency) ||
    (usageFrequency === 'custom' && frequencyDays.length > 0);
}

// Check if product has valid timing
function hasValidTiming(product: FacialProduct): boolean {
  const usageTiming = (product as any).usage_timing?.toLowerCase() || '';
  return VALID_TIMINGS.includes(usageTiming);
}

// Get products with missing data
function getProductsWithMissingData(products: FacialProduct[] | undefined): FacialProduct[] {
  if (!products) return [];
  return products.filter((p) => {
    return !p.brand || !p.price || !p.category || !p.application_form || !p.size_amount ||
      !hasValidFrequency(p) || !hasValidTiming(p);
  });
}

export default function FacialProductsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [extractionInput, setExtractionInput] = useState<{ text?: string; file?: File; url?: string } | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<FacialProduct | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Schedule modal state (frequency/timing)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEntries, setScheduleEntries] = useState<Record<string, { frequency: string; timing: string; days: string[] }>>({});
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  // Batch AI population state
  const [isBatchAIModalOpen, setIsBatchAIModalOpen] = useState(false);
  const [batchAIResults, setBatchAIResults] = useState<Record<string, {
    status: 'pending' | 'fetching' | 'saving' | 'saved' | 'success' | 'error';
    data?: {
      brand?: string;
      price?: number;
      size_amount?: number;
      size_unit?: string;
      application_form?: string;
      category?: string;
      usage_amount?: number;
      usage_unit?: string;
    };
    error?: string;
    selected?: boolean;
  }>>({});
  const [isBatchFetching, setIsBatchFetching] = useState(false);
  const [isCostWarningModalOpen, setIsCostWarningModalOpen] = useState(false);

  const updateProduct = useUpdateFacialProduct();
  const toggleProduct = useToggleFacialProduct();

  // Get all products for counting (no filters)
  const { data: allProducts, isLoading, error, refetch } = useFacialProducts({});
  const productsWithMissingData = getProductsWithMissingData(allProducts);

  // Filter products based on selected category and status
  const products = useMemo(() => {
    if (!allProducts) return undefined;
    return allProducts.filter((p) => {
      // Category filter
      if (selectedCategory !== "All") {
        const categoryValue = categoryToDbValue[selectedCategory];
        if (selectedCategory === "Other") {
          const validCategories = ["cleanser", "toner", "serum", "moisturizer", "sunscreen"];
          if (validCategories.includes(p.category || "")) return false;
        } else {
          if (p.category !== categoryValue) return false;
        }
      }
      // Status filter
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;
      return true;
    });
  }, [allProducts, selectedCategory, statusFilter]);

  // Calculate counts for categories and status
  const counts = useMemo(() => {
    if (!allProducts) return { categories: {} as Record<string, number>, active: 0, inactive: 0, all: 0 };

    const categories: Record<string, number> = { All: allProducts.length };
    let active = 0;
    let inactive = 0;

    allProducts.forEach((p) => {
      // Status counts
      if (p.is_active) active++;
      else inactive++;

      // Category counts
      const displayCat = p.category ? dbValueToCategory[p.category] || "Other" : "Other";
      categories[displayCat] = (categories[displayCat] || 0) + 1;
    });

    return { categories, active, inactive, all: allProducts.length };
  }, [allProducts]);

  // Calculate missing field counts (only for active products)
  const missingFieldCounts = useMemo(() => {
    if (!allProducts) return { total: 0, fields: {} as Record<string, number> };

    const fields: Record<string, number> = {};
    let productsWithMissing = 0;

    allProducts.filter(p => p.is_active).forEach((p) => {
      let hasMissing = false;

      // Schedule fields
      if (!hasValidFrequency(p)) { fields.frequency = (fields.frequency || 0) + 1; hasMissing = true; }
      if (!hasValidTiming(p)) { fields.timing = (fields.timing || 0) + 1; hasMissing = true; }

      // Product info fields
      if (!p.brand) { fields.brand = (fields.brand || 0) + 1; hasMissing = true; }
      if (!p.price) { fields.price = (fields.price || 0) + 1; hasMissing = true; }
      if (!p.category) { fields.category = (fields.category || 0) + 1; hasMissing = true; }
      if (!p.application_form) { fields.form = (fields.form || 0) + 1; hasMissing = true; }
      if (!p.size_amount) { fields.size = (fields.size || 0) + 1; hasMissing = true; }
      if (!p.usage_amount) { fields.usage = (fields.usage || 0) + 1; hasMissing = true; }
      if (!p.purchase_url) { fields.url = (fields.url || 0) + 1; hasMissing = true; }

      if (hasMissing) productsWithMissing++;
    });

    return { total: productsWithMissing, fields };
  }, [allProducts]);

  const costs = useFacialProductCosts(products);

  // Get active products missing cost-related data (price, size, usage info, frequency, timing)
  const productsMissingCostData = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => {
      if (!p.is_active) return false;
      // Missing price or size makes cost estimate impossible
      if (!p.price || !p.size_amount) return true;
      // Missing usage amount or frequency/timing makes accurate estimate impossible
      const usageFrequency = (p as any).usage_frequency?.toLowerCase() || '';
      const usageTiming = (p as any).usage_timing?.toLowerCase() || '';
      const usageAmount = p.usage_amount;
      const hasFrequency = ['daily', 'every_other_day', 'as_needed'].includes(usageFrequency);
      const hasTiming = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed'].includes(usageTiming);
      return !usageAmount || !hasFrequency || !hasTiming;
    });
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let result = products?.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase())
    );

    if (result) {
      result = [...result].sort((a, b) => {
        // First, sort by active status (active items first, inactive at bottom)
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }

        // Then sort by the selected sort option within each group
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "price":
            return (b.price || 0) - (a.price || 0);
          case "category":
            return (a.category || "zzz").localeCompare(b.category || "zzz");
          default:
            return 0;
        }
      });
    }

    return result;
  }, [products, search, sortBy]);

  // Get active products missing frequency or timing (schedule)
  const productsNeedingSchedule = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => p.is_active && (!hasValidFrequency(p) || !hasValidTiming(p)));
  }, [allProducts]);

  // Get active products missing AI-fillable product info (including usage_amount)
  const productsWithMissingProductInfo = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) =>
      p.is_active && (!p.brand || !p.price || !p.category || !p.application_form || !p.size_amount || !p.usage_amount)
    );
  }, [allProducts]);

  // Schedule modal handlers
  const handleOpenScheduleModal = () => {
    const entries: Record<string, { frequency: string; timing: string; days: string[] }> = {};
    productsNeedingSchedule.forEach((p) => {
      entries[p.id] = {
        frequency: (p as any).usage_frequency?.toLowerCase() || "",
        timing: (p as any).usage_timing?.toLowerCase() || "",
        days: (p as any).frequency_days || [],
      };
    });
    setScheduleEntries(entries);
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      let updateCount = 0;
      for (const [id, data] of Object.entries(scheduleEntries)) {
        if (data.frequency || data.timing || data.days?.length > 0) {
          await updateProduct.mutateAsync({
            id,
            data: {
              usage_frequency: data.frequency || undefined,
              usage_timing: data.timing || undefined,
              frequency_days: data.days?.length > 0 ? data.days : undefined,
            } as any,
          });
          updateCount++;
        }
      }

      if (updateCount > 0) {
        toast.success(`Updated ${updateCount} products`);
      }

      setIsScheduleModalOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleEdit = (product: FacialProduct) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setAddModalOpen(true);
  };

  const handleChatSubmit = (data: { text?: string; file?: File; url?: string }) => {
    // Open the extraction modal directly with the submitted data
    setExtractionInput(data);
    setExtractionModalOpen(true);
  };

  // Open batch AI modal and initialize results
  const handleOpenBatchAIModal = useCallback(() => {
    const initialResults: typeof batchAIResults = {};
    productsWithMissingProductInfo.forEach((p) => {
      initialResults[p.id] = { status: 'pending', selected: true };
    });
    setBatchAIResults(initialResults);
    setIsBatchAIModalOpen(true);
  }, [productsWithMissingProductInfo]);

  // Fetch AI data for a single product
  const fetchAIForProduct = async (productId: string, product: FacialProduct): Promise<{
    data?: typeof batchAIResults[string]['data'];
    error?: string;
  }> => {
    const normalizeValue = (val: string | undefined) => val?.toLowerCase().replace(/\s+/g, '_');

    return new Promise((resolve) => {
      let result: any = null;
      let hasError = false;
      const streamedData: Record<string, any> = {};

      aiApi.enrichProductStream(
        {
          product_name: product.name,
          brand: product.brand || undefined,
          product_url: product.purchase_url || undefined,
          product_type: 'facial_product',
        },
        // onProgress
        (event) => {
          if (event.step === 'field_found' && event.field && event.value !== undefined) {
            const fieldKey = event.field as string;
            let fieldValue: any = event.value;

            if (fieldKey === 'application_form' || fieldKey === 'category' || fieldKey === 'usage_unit') {
              fieldValue = normalizeValue(fieldValue as string);
            } else if (fieldKey === 'price' || fieldKey === 'size_amount' || fieldKey === 'usage_amount') {
              fieldValue = parseFloat(fieldValue as string) || fieldValue;
            }

            streamedData[fieldKey] = fieldValue;

            setBatchAIResults((prev) => ({
              ...prev,
              [productId]: {
                ...prev[productId],
                data: {
                  ...prev[productId]?.data,
                  [fieldKey]: fieldValue,
                }
              }
            }));
          }

          if (event.step === 'first_pass_done' && event.product) {
            const productData = event.product as Record<string, any>;
            const fieldsToUpdate: Record<string, any> = {};

            for (const fieldKey of ['brand', 'price', 'size_amount', 'size_unit', 'application_form', 'category', 'usage_amount', 'usage_unit']) {
              let fieldValue = productData[fieldKey];
              if (fieldValue !== undefined && fieldValue !== null) {
                if (fieldKey === 'application_form' || fieldKey === 'category' || fieldKey === 'usage_unit') {
                  fieldValue = normalizeValue(fieldValue as string);
                } else if (fieldKey === 'usage_amount') {
                  fieldValue = parseFloat(fieldValue as string) || fieldValue;
                }
                fieldsToUpdate[fieldKey] = fieldValue;
                streamedData[fieldKey] = fieldValue;
              }
            }

            setBatchAIResults((prev) => ({
              ...prev,
              [productId]: {
                ...prev[productId],
                data: {
                  ...prev[productId]?.data,
                  ...fieldsToUpdate,
                }
              }
            }));
          }
        },
        (completeResult) => {
          result = completeResult;
        },
        (error) => {
          hasError = true;
          resolve({ error });
        }
      ).then(() => {
        if (hasError) return;

        if (result?.data) {
          const p = result.data;
          const finalData = {
            brand: p.brand ?? undefined,
            price: p.price ?? undefined,
            size_amount: p.size_amount ?? undefined,
            size_unit: p.size_unit ?? undefined,
            application_form: normalizeValue(p.application_form) ?? undefined,
            category: normalizeValue(p.category) ?? undefined,
            usage_amount: p.usage_amount ?? undefined,
            usage_unit: p.usage_unit ? normalizeValue(p.usage_unit) : undefined,
          };
          // Merge: streamedData first, then finalData, but don't overwrite non-null with null
          const merged = { ...streamedData };
          for (const [key, value] of Object.entries(finalData)) {
            if (value !== undefined) {
              merged[key] = value;
            }
          }
          resolve({
            data: merged
          });
        } else if (Object.keys(streamedData).length > 0) {
          resolve({ data: streamedData });
        } else {
          resolve({ error: 'No data found' });
        }
      }).catch((e) => {
        resolve({ error: e.message || 'Failed' });
      });
    });
  };

  // Start batch AI fetching
  const handleStartBatchAI = async () => {
    setIsBatchFetching(true);

    const productsToFetch = productsWithMissingProductInfo.filter(
      (p) => batchAIResults[p.id]?.selected !== false
    );

    for (const product of productsToFetch) {
      setBatchAIResults((prev) => ({
        ...prev,
        [product.id]: { ...prev[product.id], status: 'fetching' }
      }));

      const result = await fetchAIForProduct(product.id, product);

      if (result.error) {
        setBatchAIResults((prev) => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            status: 'error',
            error: result.error,
          }
        }));
      } else {
        const currentData = result.data || {};

        setBatchAIResults((prev) => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            status: 'saving',
            data: { ...prev[product.id]?.data, ...currentData },
          }
        }));

        // Auto-save immediately
        try {
          const updateData: Record<string, any> = {
            product_data_source: 'ai',
            product_updated_at: new Date().toISOString(),
          };

          if (currentData.brand) updateData.brand = currentData.brand;
          if (currentData.price != null) updateData.price = currentData.price;
          if (currentData.size_amount != null) updateData.size_amount = currentData.size_amount;
          if (currentData.size_unit) updateData.size_unit = currentData.size_unit;
          if (currentData.application_form) updateData.application_form = currentData.application_form;
          if (currentData.category) updateData.category = currentData.category;
          if (currentData.usage_amount != null) updateData.usage_amount = currentData.usage_amount;
          if (currentData.usage_unit) updateData.usage_unit = currentData.usage_unit;

          if (Object.keys(updateData).length > 2) {
            await updateProduct.mutateAsync({ id: product.id, data: updateData });
            setBatchAIResults((prev) => ({
              ...prev,
              [product.id]: { ...prev[product.id], status: 'saved' }
            }));
          } else {
            setBatchAIResults((prev) => ({
              ...prev,
              [product.id]: { ...prev[product.id], status: 'success' }
            }));
          }
        } catch (saveError) {
          setBatchAIResults((prev) => ({
            ...prev,
            [product.id]: { ...prev[product.id], status: 'error', error: String(saveError) }
          }));
        }
      }
    }

    setIsBatchFetching(false);
    refetch();
  };

  // Toggle selection for a product in batch AI
  const toggleBatchSelection = (id: string) => {
    setBatchAIResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id]?.selected }
    }));
  };

  // Select/deselect all in batch AI
  const toggleAllBatchSelection = (selected: boolean) => {
    setBatchAIResults((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], selected };
      });
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h1 className="text-2xl font-semibold">Facial Products</h1>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Filter Bar - Categories + Status */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((category) => {
                  const IconComponent = CATEGORY_ICONS[category];
                  const count = counts.categories[category] || 0;
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      className="px-2"
                      onClick={() => setSelectedCategory(category)}
                      style={selectedCategory !== category ? { backgroundColor: CATEGORY_COLORS[category] } : undefined}
                    >
                      {IconComponent && <IconComponent className="w-3.5 h-3.5 mr-1" />}
                      {category}
                      <span className="ml-1 text-xs opacity-60">{count}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-muted-foreground/30" />

              {/* Status Filter - Active/Inactive */}
              <div className="flex items-center gap-1">
                <Power className="w-3.5 h-3.5 text-muted-foreground" />
                {STATUS_FILTERS.map((filter) => {
                  const count = filter.value === "all" ? counts.all
                    : filter.value === "active" ? counts.active
                    : counts.inactive;
                  return (
                    <Button
                      key={filter.value}
                      variant={statusFilter === filter.value ? "default" : "outline"}
                      size="sm"
                      className="px-2 h-8"
                      onClick={() => setStatusFilter(filter.value)}
                    >
                      {filter.label}
                      <span className="ml-1 text-xs opacity-60">{count}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Missing Data Warning Bar */}
            {missingFieldCounts.total > 0 && (
              <div className="flex items-center gap-4">
                {/* Warning Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  <span className="text-lg font-bold text-yellow-500">Warning:</span>
                </div>

                {/* Schedule Fields - Orange */}
                {productsNeedingSchedule.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-400">
                      <span className="font-semibold">{productsNeedingSchedule.length}</span> need frequency/timing
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30 text-orange-400"
                      onClick={handleOpenScheduleModal}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Schedule
                      <span className="ml-1 text-xs bg-orange-500/30 px-1.5 py-0.5 rounded">
                        {productsNeedingSchedule.length}
                      </span>
                    </Button>
                  </div>
                )}

                {/* AI-Populatable Fields - Purple */}
                {productsWithMissingProductInfo.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm text-purple-400">
                      <span className="font-semibold">{productsWithMissingProductInfo.length}</span> Products missing product info: AI can search & fill
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30 text-purple-400 ml-auto"
                      onClick={handleOpenBatchAIModal}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Populate by AI
                      <span className="ml-1 text-xs bg-purple-500/30 px-1.5 py-0.5 rounded">
                        {productsWithMissingProductInfo.length}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Main Content - Two Column Layout */}
            <div className="flex gap-4">
              {/* Left Sidebar */}
              <div className="w-52 flex-shrink-0 space-y-4">
                {/* Search */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">SEARCH PRODUCTS</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-7 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* AI Chat Input */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">AI EXTRACT</h3>
                  <FacialProductChatInput
                    onSubmit={handleChatSubmit}
                    isProcessing={isExtracting}
                  />
                </div>

                {/* Add Product Button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddNew}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>

                {/* Cost Summary */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">SKINCARE COSTS</h3>
                  {products && products.length > 0 ? (
                    <div className="rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplet className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {costs.activeCount} active / {costs.totalCount} total
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Monthly (est.)</span>
                          <span className="text-lg font-bold">${costs.monthly.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Yearly (est.)</span>
                          <span className="text-sm font-medium text-muted-foreground">${costs.yearly.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Cost Warning */}
                      {productsMissingCostData.length > 0 && (
                        <div
                          className="mt-3 p-2 rounded border border-red-500/30 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors"
                          onClick={() => setIsCostWarningModalOpen(true)}
                        >
                          <div className="flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium">Cost may be inaccurate</span>
                          </div>
                          <p className="text-[10px] text-red-400/80 mt-0.5">
                            {productsMissingCostData.length} missing usage amount
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No products yet. Add products to track costs.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Content - Product Cards */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">ALL PRODUCTS</h3>
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          sortBy === option.value
                            ? "text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-[180px] rounded-lg" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-destructive">Failed to load products</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please check your connection and try again
                    </p>
                  </div>
                ) : filteredProducts && filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredProducts.map((product) => (
                      <FacialProductCard
                        key={product.id}
                        product={product}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                      <Droplet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No facial products yet</h3>
                      <p className="text-muted-foreground">
                        Add your first skincare product to start tracking your routine
                      </p>
                    </div>

                    {/* Add Product Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleAddNew}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                )}

                {filteredProducts && filteredProducts.length === 0 && products && products.length > 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No products match your current filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Product Form Dialog - for editing */}
      <FacialProductForm
        product={editingProduct}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingProduct(null);
            refetch();
          }
        }}
      />

      {/* Add Product Modal - with AI Extract and Manual tabs */}
      <FacialProductAddCombinedModal
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) {
            refetch();
          }
        }}
        onOpenExtractionModal={(input) => {
          setAddModalOpen(false);
          setExtractionInput(input);
          setExtractionModalOpen(true);
        }}
      />

      {/* AI Extraction Modal */}
      <FacialProductExtractionModal
        open={extractionModalOpen}
        onOpenChange={(open) => {
          setExtractionModalOpen(open);
          if (!open) {
            setExtractionInput(undefined);
            refetch();
          }
        }}
        initialInput={extractionInput}
        onSuccess={() => refetch()}
      />

      {/* Batch AI Population Modal */}
      <Dialog open={isBatchAIModalOpen} onOpenChange={setIsBatchAIModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Populate All Products by AI
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              AI will search for product information and fill in missing fields. Review the results before saving.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Controls */}
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={Object.values(batchAIResults).every((r) => r.selected !== false)}
                  onCheckedChange={(checked) => toggleAllBatchSelection(!!checked)}
                />
                <span className="text-xs text-muted-foreground">Select All</span>
              </div>
              {!isBatchFetching && Object.values(batchAIResults).every((r) => r.status === 'pending') && (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg shadow-purple-500/25"
                  onClick={handleStartBatchAI}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Fetch All with AI
                </Button>
              )}
              {isBatchFetching && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">
                    Processing {Object.values(batchAIResults).filter((r) => r.status === 'success' || r.status === 'error' || r.status === 'saved').length}/{Object.keys(batchAIResults).length}
                  </span>
                </div>
              )}
              {!isBatchFetching && Object.values(batchAIResults).some((r) => r.status === 'saved') && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">
                    {Object.values(batchAIResults).filter((r) => r.status === 'saved').length} saved
                  </span>
                </div>
              )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[40px,1fr,100px,80px,80px,80px,80px,80px,80px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
              <div></div>
              <div>Product</div>
              <div>Status</div>
              <div>Brand</div>
              <div>Price</div>
              <div>Size</div>
              <div>Form</div>
              <div>Category</div>
              <div>Usage</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {productsWithMissingProductInfo.map((product) => {
                const result = batchAIResults[product.id];
                return (
                  <div
                    key={product.id}
                    className={`grid grid-cols-[40px,1fr,100px,80px,80px,80px,80px,80px,80px] gap-2 px-2 py-2 items-center text-sm ${
                      result?.selected === false ? 'opacity-50' : ''
                    }`}
                  >
                    <div>
                      <Checkbox
                        checked={result?.selected !== false}
                        onCheckedChange={() => toggleBatchSelection(product.id)}
                      />
                    </div>
                    <div className="truncate font-medium flex items-center gap-1">
                      <span className="truncate">{product.name}</span>
                      {product.purchase_url ? (
                        <a
                          href={product.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 hover:text-blue-300 shrink-0"
                          title="Open product page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/40 shrink-0" title="No product URL">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      {result?.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                          <Clock className="w-3 h-3" />
                          Waiting
                        </span>
                      )}
                      {result?.status === 'fetching' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Fetching
                        </span>
                      )}
                      {result?.status === 'saving' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving
                        </span>
                      )}
                      {result?.status === 'saved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          Saved
                        </span>
                      )}
                      {result?.status === 'success' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Found
                        </span>
                      )}
                      {result?.status === 'error' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30" title={result.error}>
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs">
                      {result?.data?.brand ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{result.data.brand}</span>
                      ) : product.brand ? (
                        <span className="text-muted-foreground">{product.brand}</span>
                      ) : (
                        <span className="text-yellow-500/70 font-medium">?</span>
                      )}
                    </div>
                    <div className="text-xs">
                      {result?.data?.price ? (
                        <input
                          type="number"
                          step="0.01"
                          value={result.data.price}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            setBatchAIResults((prev) => ({
                              ...prev,
                              [product.id]: {
                                ...prev[product.id],
                                data: { ...prev[product.id]?.data, price: val }
                              }
                            }));
                          }}
                          className="w-16 h-6 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : product.price ? (
                        <span className="text-muted-foreground">${product.price}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="?"
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            if (val) {
                              setBatchAIResults((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  status: prev[product.id]?.status === 'pending' ? 'success' : prev[product.id]?.status || 'success',
                                  data: { ...prev[product.id]?.data, price: val }
                                }
                              }));
                            }
                          }}
                          className="w-16 h-6 px-1.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-xs placeholder:text-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    </div>
                    <div className="text-xs">
                      {result?.data?.size_amount ? (
                        <input
                          type="number"
                          step="1"
                          value={result.data.size_amount}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            setBatchAIResults((prev) => ({
                              ...prev,
                              [product.id]: {
                                ...prev[product.id],
                                data: { ...prev[product.id]?.data, size_amount: val }
                              }
                            }));
                          }}
                          className="w-16 h-6 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : product.size_amount ? (
                        <span className="text-muted-foreground">{product.size_amount}{product.size_unit || 'ml'}</span>
                      ) : (
                        <input
                          type="number"
                          step="1"
                          placeholder="?"
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            if (val) {
                              setBatchAIResults((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  status: prev[product.id]?.status === 'pending' ? 'success' : prev[product.id]?.status || 'success',
                                  data: { ...prev[product.id]?.data, size_amount: val }
                                }
                              }));
                            }
                          }}
                          className="w-16 h-6 px-1.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-xs placeholder:text-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    </div>
                    <div className="text-xs">
                      {(() => {
                        const formValue = result?.data?.application_form || product.application_form;
                        const isNew = !!result?.data?.application_form;
                        const needsInput = !formValue;
                        if (needsInput || isNew) {
                          return (
                            <select
                              value={result?.data?.application_form || ""}
                              onChange={(e) => {
                                setBatchAIResults((prev) => ({
                                  ...prev,
                                  [product.id]: {
                                    ...prev[product.id],
                                    status: prev[product.id]?.status === 'pending' ? 'success' : prev[product.id]?.status || 'success',
                                    data: { ...prev[product.id]?.data, application_form: e.target.value || undefined }
                                  }
                                }));
                              }}
                              className={`h-6 px-1 rounded border text-xs ${isNew ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}
                            >
                              <option value="">?</option>
                              <option value="cream">Cream</option>
                              <option value="gel">Gel</option>
                              <option value="liquid">Liquid</option>
                              <option value="foam">Foam</option>
                            </select>
                          );
                        }
                        const config = FORM_CONFIG[formValue];
                        return (
                          <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-medium">
                            {config?.label || formValue}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs">
                      {(() => {
                        const catValue = result?.data?.category || product.category;
                        const isNew = !!result?.data?.category;
                        const needsInput = !catValue;
                        if (needsInput || isNew) {
                          return (
                            <select
                              value={result?.data?.category || ""}
                              onChange={(e) => {
                                setBatchAIResults((prev) => ({
                                  ...prev,
                                  [product.id]: {
                                    ...prev[product.id],
                                    status: prev[product.id]?.status === 'pending' ? 'success' : prev[product.id]?.status || 'success',
                                    data: { ...prev[product.id]?.data, category: e.target.value || undefined }
                                  }
                                }));
                              }}
                              className={`h-6 px-1 rounded border text-xs ${isNew ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}
                            >
                              <option value="">?</option>
                              <option value="cleanser">Cleanser</option>
                              <option value="toner">Toner</option>
                              <option value="serum">Serum</option>
                              <option value="moisturizer">Moisturizer</option>
                              <option value="sunscreen">Sunscreen</option>
                              <option value="other">Other</option>
                            </select>
                          );
                        }
                        const displayCat = dbValueToCategory[catValue] || catValue;
                        return (
                          <span className="px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-medium">
                            {displayCat}
                          </span>
                        );
                      })()}
                    </div>
                    {/* Usage Amount Column */}
                    <div className="text-xs">
                      {result?.data?.usage_amount ? (
                        <input
                          type="number"
                          step="0.5"
                          value={result.data.usage_amount}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            setBatchAIResults((prev) => ({
                              ...prev,
                              [product.id]: {
                                ...prev[product.id],
                                data: { ...prev[product.id]?.data, usage_amount: val }
                              }
                            }));
                          }}
                          className="w-12 h-6 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : product.usage_amount ? (
                        <span className="text-muted-foreground">{product.usage_amount}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.5"
                          placeholder="?"
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            if (val) {
                              setBatchAIResults((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  status: prev[product.id]?.status === 'pending' ? 'success' : prev[product.id]?.status || 'success',
                                  data: { ...prev[product.id]?.data, usage_amount: val }
                                }
                              }));
                            }
                          }}
                          className="w-12 h-6 px-1.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-xs placeholder:text-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2">
            <div className="flex-1 text-xs text-muted-foreground">
              {(() => {
                const saved = Object.values(batchAIResults).filter((r) => r.status === 'saved').length;
                const found = Object.values(batchAIResults).filter((r) => r.status === 'success').length;
                const fetching = Object.values(batchAIResults).filter((r) => r.status === 'fetching' || r.status === 'saving').length;
                const errors = Object.values(batchAIResults).filter((r) => r.status === 'error').length;

                if (fetching > 0) return `Processing... ${saved} saved`;
                if (saved > 0 || found > 0 || errors > 0) {
                  const parts = [];
                  if (saved > 0) parts.push(`${saved} saved`);
                  if (found > 0) parts.push(`${found} found (no data)`);
                  if (errors > 0) parts.push(`${errors} failed`);
                  return parts.join(', ');
                }
                return 'Click "Fetch All with AI" to start';
              })()}
            </div>
            <Button variant="outline" onClick={() => setIsBatchAIModalOpen(false)}>
              {isBatchFetching ? 'Cancel' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal - Frequency & Timing */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Add Frequency & Timing
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Set when and how often you use each product
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Product Rows - Stacked layout like Equipment */}
            <div className="divide-y">
              {productsNeedingSchedule.map((product) => (
                <div key={product.id} className="px-4 py-4 space-y-2">
                  {/* Line 1: Product Name + Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{product.name}</span>
                    {(() => {
                      const isActive = pendingToggles[product.id] ?? product.is_active;
                      return (
                        <>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => {
                              setPendingToggles(prev => ({ ...prev, [product.id]: !isActive }));
                              toggleProduct.mutate(product.id);
                            }}
                            className="data-[state=checked]:bg-green-500 scale-75"
                          />
                          <span className={`text-xs ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Line 2: When */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-20">When:</span>
                    <div className="flex flex-wrap gap-1">
                      {TIMING_OPTIONS.map((opt) => {
                        const isSelected = scheduleEntries[product.id]?.timing === opt.value;
                        const TimingIcon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setScheduleEntries((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  timing: isSelected ? "" : opt.value,
                                },
                              }));
                            }}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                              isSelected
                                ? opt.selectedColor
                                : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <TimingIcon className="w-3.5 h-3.5" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Line 3: Frequency */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-20">Frequency:</span>
                    <div className="flex gap-1">
                      {[
                        { value: "daily", label: "Daily" },
                        { value: "every_other_day", label: "Every Other Day" },
                        { value: "as_needed", label: "As Needed" },
                      ].map((opt) => {
                        const isSelected = scheduleEntries[product.id]?.frequency === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setScheduleEntries((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  frequency: isSelected ? "" : opt.value,
                                  days: [], // Clear days when selecting preset
                                },
                              }));
                            }}
                            className={`px-3 py-1 text-xs rounded border transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-sm text-muted-foreground">or Custom:</span>
                    <div className="flex gap-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => {
                        const dayValues = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                        const dayValue = dayValues[idx];
                        const isSelected = scheduleEntries[product.id]?.days?.includes(dayValue);
                        return (
                          <button
                            key={`${day}-${idx}`}
                            type="button"
                            onClick={() => {
                              const currentDays = scheduleEntries[product.id]?.days || [];
                              const newDays = isSelected
                                ? currentDays.filter((d) => d !== dayValue)
                                : [...currentDays, dayValue];
                              setScheduleEntries((prev) => ({
                                ...prev,
                                [product.id]: {
                                  ...prev[product.id],
                                  frequency: newDays.length > 0 ? "custom" : prev[product.id]?.frequency || "",
                                  days: newDays,
                                },
                              }));
                            }}
                            className={`w-7 h-7 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSavingSchedule ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Save All</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Warning Modal */}
      <Dialog open={isCostWarningModalOpen} onOpenChange={setIsCostWarningModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Incomplete Cost Data
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              These products are missing price or usage info needed to calculate accurate costs:
            </p>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {productsMissingCostData.map((product) => {
                const missing: string[] = [];
                if (!product.price) missing.push('Price');
                if (!product.size_amount) missing.push('Size');
                if (!product.usage_amount) missing.push('Usage amount');
                const usageFrequency = (product as any).usage_frequency?.toLowerCase() || '';
                const usageTiming = (product as any).usage_timing?.toLowerCase() || '';
                if (!['daily', 'every_other_day', 'as_needed'].includes(usageFrequency)) missing.push('Frequency');
                if (!['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed'].includes(usageTiming)) missing.push('When');

                return (
                  <div
                    key={product.id}
                    className="p-2 rounded border border-muted-foreground/20 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setIsCostWarningModalOpen(false);
                      handleEdit(product);
                    }}
                  >
                    <div className="font-medium text-sm truncate">{product.name}</div>
                    <div className="text-[10px] text-red-400 mt-0.5">
                      Missing: {missing.join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCostWarningModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsCostWarningModalOpen(false);
                if (productsMissingCostData.length > 0) {
                  handleEdit(productsMissingCostData[0]);
                }
              }}
            >
              Edit First Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
