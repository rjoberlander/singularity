"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSupplements, useSupplementCosts } from "@/hooks/useSupplements";
import { SupplementCard } from "@/components/supplements/SupplementCard";
import { SupplementForm } from "@/components/supplements/SupplementForm";
import { SupplementAddCombinedModal } from "@/components/supplements/SupplementAddCombinedModal";
import { SupplementChatInput } from "@/components/supplements/SupplementChatInput";
import { SupplementExtractionModal } from "@/components/supplements/SupplementExtractionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUpdateSupplement } from "@/hooks/useSupplements";
import { Supplement, SupplementTiming } from "@/types";
import { aiApi } from "@/lib/api";
import {
  Plus,
  Search,
  Pill,
  ChevronUp,
  ChevronDown,
  Atom,
  Leaf,
  Bug,
  MoreHorizontal,
  LucideIcon,
  Sparkles,
  Power,
  AlertTriangle,
  Link2,
  ExternalLink,
  Loader2,
  ArrowUpDown,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  FlaskConical,
  Droplet,
  Wind,
  Candy,
  Square,
} from "lucide-react";
import { toast } from "sonner";

// Check which supplements have missing important fields
function getSupplementsWithMissingData(supplements: Supplement[] | undefined): Supplement[] {
  if (!supplements) return [];
  return supplements.filter(s => {
    // Check timings array or legacy timing field
    const hasTimings = (s.timings && s.timings.length > 0) || s.timing;
    const missing = !s.brand || !s.price || !s.dose_per_serving || !s.dose_unit ||
                    !s.category || !hasTimings || !s.servings_per_container || !s.intake_form;
    return missing;
  });
}

const CATEGORIES = [
  "All",
  "Vitamin/Mineral",
  "Amino/Protein",
  "Herb/Botanical",
  "Probiotic",
  "Other",
];

// Category icons - exported for use in SupplementCard
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Vitamin/Mineral": Pill,
  "vitamin_mineral": Pill,
  "Amino/Protein": Atom,
  "amino_protein": Atom,
  "Herb/Botanical": Leaf,
  "herb_botanical": Leaf,
  "Probiotic": Bug,
  "probiotic": Bug,
  "Other": MoreHorizontal,
  "other": MoreHorizontal,
};

// Category colors for button backgrounds - exported for use in SupplementCard
export const CATEGORY_COLORS: Record<string, string> = {
  All: "rgba(107, 142, 90, 0.2)",
  "Vitamin/Mineral": "rgba(234, 179, 8, 0.2)",
  "vitamin_mineral": "rgba(234, 179, 8, 0.2)",
  "Amino/Protein": "rgba(139, 92, 246, 0.2)",
  "amino_protein": "rgba(139, 92, 246, 0.2)",
  "Herb/Botanical": "rgba(34, 197, 94, 0.2)",
  "herb_botanical": "rgba(34, 197, 94, 0.2)",
  "Probiotic": "rgba(236, 72, 153, 0.2)",
  "probiotic": "rgba(236, 72, 153, 0.2)",
  "Other": "rgba(107, 114, 128, 0.2)",
  "other": "rgba(107, 114, 128, 0.2)",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Timing order for sorting (earliest to latest in the day)
const TIMING_ORDER: Record<string, number> = {
  wake_up: 1,
  morning: 2,
  am: 3,
  with_meals: 4,
  lunch: 5,
  afternoon: 6,
  pm: 7,
  evening: 8,
  dinner: 9,
  before_bed: 10,
  empty_stomach: 11, // no specific time
};

const SORT_OPTIONS = [
  { value: "time", label: "Time of Day" },
  { value: "name", label: "Name (A-Z)" },
  { value: "cost", label: "Monthly Cost" },
  { value: "duration", label: "Bottle Duration" },
];

// Timing icons and colors for the modal
const TIMING_CONFIG: Record<string, { icon: LucideIcon; color: string; selectedColor: string; label: string }> = {
  wake_up: { icon: Sunrise, color: "text-orange-400", selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-400", label: "Wake" },
  am: { icon: Sun, color: "text-yellow-400", selectedColor: "bg-yellow-500/30 border-yellow-500/50 text-yellow-400", label: "AM" },
  lunch: { icon: Utensils, color: "text-amber-500", selectedColor: "bg-amber-500/30 border-amber-500/50 text-amber-500", label: "Lunch" },
  pm: { icon: Sunset, color: "text-orange-500", selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-500", label: "PM" },
  dinner: { icon: Utensils, color: "text-purple-400", selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400", label: "Dinner" },
  before_bed: { icon: Moon, color: "text-indigo-400", selectedColor: "bg-indigo-500/30 border-indigo-500/50 text-indigo-400", label: "Before Bed" },
  bed: { icon: Moon, color: "text-violet-400", selectedColor: "bg-violet-500/30 border-violet-500/50 text-violet-400", label: "Bed" },
};

// Intake form icons and colors
const INTAKE_FORM_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  capsule: { icon: Pill, color: "text-blue-400", bgColor: "bg-blue-500/20", label: "Capsule" },
  capsules: { icon: Pill, color: "text-blue-400", bgColor: "bg-blue-500/20", label: "Capsules" },
  powder: { icon: FlaskConical, color: "text-amber-400", bgColor: "bg-amber-500/20", label: "Powder" },
  liquid: { icon: Droplet, color: "text-cyan-400", bgColor: "bg-cyan-500/20", label: "Liquid" },
  spray: { icon: Wind, color: "text-teal-400", bgColor: "bg-teal-500/20", label: "Spray" },
  gummy: { icon: Candy, color: "text-pink-400", bgColor: "bg-pink-500/20", label: "Gummy" },
  gummies: { icon: Candy, color: "text-pink-400", bgColor: "bg-pink-500/20", label: "Gummies" },
  patch: { icon: Square, color: "text-purple-400", bgColor: "bg-purple-500/20", label: "Patch" },
  softgel: { icon: Pill, color: "text-blue-300", bgColor: "bg-blue-400/20", label: "Softgel" },
  softgels: { icon: Pill, color: "text-blue-300", bgColor: "bg-blue-400/20", label: "Softgels" },
  tablet: { icon: Pill, color: "text-slate-400", bgColor: "bg-slate-500/20", label: "Tablet" },
  tablets: { icon: Pill, color: "text-slate-400", bgColor: "bg-slate-500/20", label: "Tablets" },
};

// Dose unit colors
const DOSE_UNIT_CONFIG: Record<string, { color: string; bgColor: string }> = {
  mg: { color: "text-green-400", bgColor: "bg-green-500/20" },
  g: { color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
  mcg: { color: "text-lime-400", bgColor: "bg-lime-500/20" },
  IU: { color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  ml: { color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
  CFU: { color: "text-pink-400", bgColor: "bg-pink-500/20" },
  cap: { color: "text-blue-400", bgColor: "bg-blue-500/20" },
  Tbsp: { color: "text-orange-400", bgColor: "bg-orange-500/20" },
};

export default function SupplementsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("time");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [extractionInput, setExtractionInput] = useState<{ text?: string; file?: File; url?: string } | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlEntries, setUrlEntries] = useState<Record<string, string>>({});
  const [isSavingUrls, setIsSavingUrls] = useState(false);
  const [isUserInputModalOpen, setIsUserInputModalOpen] = useState(false);
  const [userInputEntries, setUserInputEntries] = useState<Record<string, { frequency: string; timings: string[] }>>({});
  const [isSavingUserInput, setIsSavingUserInput] = useState(false);
  const [isCostWarningModalOpen, setIsCostWarningModalOpen] = useState(false);
  const [isCostBreakdownModalOpen, setIsCostBreakdownModalOpen] = useState(false);

  // Batch AI population state
  const [isBatchAIModalOpen, setIsBatchAIModalOpen] = useState(false);
  const [batchAIResults, setBatchAIResults] = useState<Record<string, {
    status: 'pending' | 'fetching' | 'saving' | 'saved' | 'success' | 'error';
    data?: {
      brand?: string;
      price?: number;
      servings_per_container?: number;
      serving_size?: number;
      intake_form?: string;
      dose_per_serving?: number;
      dose_unit?: string;
      category?: string;
    };
    error?: string;
    selected?: boolean;
  }>>({});
  const [isBatchFetching, setIsBatchFetching] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const updateSupplement = useUpdateSupplement();

  // Get all supplements for counting (no filters)
  const { data: allSupplements, isLoading, error, refetch } = useSupplements({});

  // Filter supplements based on selected category and status
  const supplements = useMemo(() => {
    if (!allSupplements) return undefined;
    return allSupplements.filter((s) => {
      // Category filter
      if (selectedCategory !== "All") {
        const categoryValue = selectedCategory.toLowerCase().replace("/", "_").replace(" ", "_");
        // For "Other", include supplements with legacy categories or explicitly set to "other"
        if (selectedCategory === "Other") {
          const validCategories = ["vitamin_mineral", "amino_protein", "herb_botanical", "probiotic"];
          if (validCategories.includes(s.category || "")) return false;
        } else {
          if (s.category !== categoryValue) return false;
        }
      }
      // Status filter
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      return true;
    });
  }, [allSupplements, selectedCategory, statusFilter]);

  // Calculate counts for categories and status
  const counts = useMemo(() => {
    if (!allSupplements) return { categories: {} as Record<string, number>, active: 0, inactive: 0, all: 0 };

    const categories: Record<string, number> = { All: allSupplements.length };
    let active = 0;
    let inactive = 0;

    allSupplements.forEach((s) => {
      // Status counts
      if (s.is_active) active++;
      else inactive++;

      // Category counts - map db values to display values
      const cat = s.category;
      let displayCat: string;

      if (cat === "vitamin_mineral") {
        displayCat = "Vitamin/Mineral";
      } else if (cat === "amino_protein") {
        displayCat = "Amino/Protein";
      } else if (cat === "herb_botanical") {
        displayCat = "Herb/Botanical";
      } else if (cat === "probiotic") {
        displayCat = "Probiotic";
      } else {
        // No category, "other", or legacy categories all go to Other
        displayCat = "Other";
      }

      categories[displayCat] = (categories[displayCat] || 0) + 1;
    });

    return { categories, active, inactive, all: allSupplements.length };
  }, [allSupplements]);

  // Calculate missing field counts across all supplements
  const missingFieldCounts = useMemo(() => {
    if (!allSupplements) return { total: 0, fields: {} as Record<string, number>, needsUrl: [] as Supplement[] };

    const fields: Record<string, number> = {};
    let supplementsWithMissing = 0;
    const needsUrl: Supplement[] = [];

    allSupplements.forEach((s) => {
      let hasMissing = false;
      let hasProductFieldMissing = false;

      if (!s.brand) { fields.brand = (fields.brand || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }
      if (!s.price) { fields.price = (fields.price || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }
      if (!s.dose_per_serving) { fields.dose = (fields.dose || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }
      if (!s.dose_unit) { fields.unit = (fields.unit || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }
      if (!s.category) { fields.category = (fields.category || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }
      const hasTimings = (s.timings && s.timings.length > 0) || s.timing;
      if (!hasTimings) { fields.timing = (fields.timing || 0) + 1; hasMissing = true; }
      if (!s.frequency) { fields.frequency = (fields.frequency || 0) + 1; hasMissing = true; }
      if (!s.servings_per_container) { fields.servings = (fields.servings || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }
      if (!s.intake_form) { fields.form = (fields.form || 0) + 1; hasMissing = true; hasProductFieldMissing = true; }

      if (hasMissing) supplementsWithMissing++;

      // Track supplements that need URL to power AI (have missing product fields but no URL)
      if (hasProductFieldMissing && !s.purchase_url) {
        needsUrl.push(s);
      }
    });

    return { total: supplementsWithMissing, fields, needsUrl };
  }, [allSupplements]);

  const costs = useSupplementCosts(supplements);
  const supplementsWithMissingData = getSupplementsWithMissingData(allSupplements);

  // Helper to get earliest timing for a supplement
  const getEarliestTiming = (s: Supplement): number => {
    const timings = s.timings || (s.timing ? [s.timing] : []);
    if (timings.length === 0) return 999; // No timing = sort to end
    return Math.min(...timings.map(t => TIMING_ORDER[t] || 999));
  };

  // Helper to calculate monthly cost
  const getMonthlyCost = (s: Supplement): number => {
    if (!s.price || !s.servings_per_container) return 999999;
    const intakeQty = s.intake_quantity || 1;
    const timingsCount = s.timings?.length || (s.timing ? 1 : 0) || 1;
    let freqMultiplier = 1;
    if (s.frequency === "every_other_day") freqMultiplier = 0.5;
    else if (s.frequency === "as_needed") freqMultiplier = 0.5;
    const dailyServings = intakeQty * timingsCount * freqMultiplier;
    const costPerServing = s.price / s.servings_per_container;
    return costPerServing * dailyServings * 30;
  };

  // Helper to get bottle duration in days
  const getBottleDuration = (s: Supplement): number => {
    if (!s.servings_per_container) return 0;
    const intakeQty = s.intake_quantity || 1;
    const timingsCount = s.timings?.length || (s.timing ? 1 : 0) || 1;
    let freqMultiplier = 1;
    if (s.frequency === "every_other_day") freqMultiplier = 0.5;
    else if (s.frequency === "as_needed") freqMultiplier = 0.5;
    const dailyServings = intakeQty * timingsCount * freqMultiplier;
    return dailyServings > 0 ? s.servings_per_container / dailyServings : 0;
  };

  // Sorted supplements by monthly cost for breakdown modal
  const supplementsSortedByCost = useMemo(() => {
    if (!allSupplements) return [];
    return [...allSupplements]
      .filter(s => s.is_active)
      .map(s => ({
        ...s,
        monthlyCost: getMonthlyCost(s) === 999999 ? 0 : getMonthlyCost(s)
      }))
      .sort((a, b) => b.monthlyCost - a.monthlyCost);
  }, [allSupplements]);

  const filteredSupplements = useMemo(() => {
    let result = supplements?.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.brand?.toLowerCase().includes(search.toLowerCase())
    );

    if (result) {
      result = [...result].sort((a, b) => {
        // First, sort by active status (active items first, inactive at bottom)
        if (a.is_active !== b.is_active) {
          return a.is_active ? -1 : 1;
        }

        // Then sort by the selected sort option within each group
        switch (sortBy) {
          case "time":
            return getEarliestTiming(a) - getEarliestTiming(b);
          case "name":
            return a.name.localeCompare(b.name);
          case "cost":
            return getMonthlyCost(b) - getMonthlyCost(a); // Most expensive first
          case "duration":
            return getBottleDuration(b) - getBottleDuration(a); // Longest first
          default:
            return 0;
        }
      });
    }

    return result;
  }, [supplements, search, sortBy]);

  const handleEdit = (supplement: Supplement) => {
    setEditingSupplement(supplement);
    setFormOpen(true);
  };

  const handleChatSubmit = (data: { text?: string; file?: File; url?: string }) => {
    setExtractionInput(data);
    setIsProcessing(true);
    setIsExtractionModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsExtractionModalOpen(open);
    if (!open) {
      setExtractionInput(undefined);
      setIsProcessing(false);
    }
  };

  const handleOpenUrlModal = () => {
    // Initialize URL entries from supplements that need URLs
    const entries: Record<string, string> = {};
    missingFieldCounts.needsUrl.forEach((s) => {
      entries[s.id] = s.purchase_url || "";
    });
    setUrlEntries(entries);
    setIsUrlModalOpen(true);
  };

  const handleSaveUrlsAndPopulate = async () => {
    setIsSavingUrls(true);
    try {
      // Save all URLs that have been entered
      const updates = Object.entries(urlEntries).filter(([_, url]) => url.trim() !== "");

      for (const [id, url] of updates) {
        await updateSupplement.mutateAsync({ id, data: { purchase_url: url } });
      }

      if (updates.length > 0) {
        toast.success(`Saved ${updates.length} URLs`);
      }

      setIsUrlModalOpen(false);
      refetch();

      // Open first supplement with missing data for AI population
      if (supplementsWithMissingData.length > 0) {
        setEditingSupplement(supplementsWithMissingData[0]);
        setFormOpen(true);
      }
    } catch (error) {
      toast.error("Failed to save URLs");
    } finally {
      setIsSavingUrls(false);
    }
  };

  // Get supplements missing frequency or timing
  const supplementsNeedingUserInput = useMemo(() => {
    if (!allSupplements) return [];
    return allSupplements.filter((s) => {
      const hasTimings = (s.timings && s.timings.length > 0) || s.timing;
      return !s.frequency || !hasTimings;
    });
  }, [allSupplements]);

  // Get supplements missing cost-related data (price, servings, dose)
  const supplementsMissingCostData = useMemo(() => {
    if (!allSupplements) return [];
    return allSupplements.filter((s) => s.is_active && (!s.price || !s.servings_per_container || !s.dose_per_serving));
  }, [allSupplements]);

  const handleOpenUserInputModal = () => {
    const entries: Record<string, { frequency: string; timings: string[] }> = {};
    supplementsNeedingUserInput.forEach((s) => {
      entries[s.id] = {
        frequency: s.frequency || "",
        timings: s.timings || (s.timing ? [s.timing] : []),
      };
    });
    setUserInputEntries(entries);
    setIsUserInputModalOpen(true);
  };

  const handleSaveUserInput = async () => {
    setIsSavingUserInput(true);
    try {
      let updateCount = 0;
      for (const [id, data] of Object.entries(userInputEntries)) {
        if (data.frequency || data.timings.length > 0) {
          await updateSupplement.mutateAsync({
            id,
            data: {
              frequency: data.frequency || undefined,
              timings: data.timings.length > 0 ? data.timings as SupplementTiming[] : undefined,
            },
          });
          updateCount++;
        }
      }

      if (updateCount > 0) {
        toast.success(`Updated ${updateCount} supplements`);
      }

      setIsUserInputModalOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSavingUserInput(false);
    }
  };

  // Open batch AI modal and initialize results
  const handleOpenBatchAIModal = useCallback(() => {
    const initialResults: typeof batchAIResults = {};
    supplementsWithMissingData.forEach((s) => {
      initialResults[s.id] = { status: 'pending', selected: true };
    });
    setBatchAIResults(initialResults);
    setIsBatchAIModalOpen(true);
  }, [supplementsWithMissingData]);

  // Fetch AI data for a single supplement with real-time per-field updates
  const fetchAIForSupplement = async (supplementId: string, supplement: Supplement): Promise<{
    data?: typeof batchAIResults[string]['data'];
    error?: string;
  }> => {
    const searchQuery = `${supplement.name} ${supplement.brand || ""} supplement. Find: brand, price, servings, form, dose, unit, category.`;
    const normalizeValue = (val: string | undefined) => val?.toLowerCase().replace(/\s+/g, '_');

    return new Promise((resolve) => {
      let result: any = null;
      let hasError = false;
      // Track streamed data internally (not relying on React state batching)
      const streamedData: Record<string, any> = {};

      aiApi.extractSupplementsStream(
        {
          text_content: searchQuery,
          source_type: "text",
          product_url: supplement.purchase_url || undefined,
        },
        // onProgress - update fields in real-time as they're found
        (event) => {
          // Handle per-field updates from web search
          if (event.step === 'field_found' && event.field && event.value !== undefined) {
            const fieldKey = event.field as string;
            let fieldValue: any = event.value;

            // Normalize and convert values appropriately
            if (fieldKey === 'intake_form' || fieldKey === 'category') {
              fieldValue = normalizeValue(fieldValue as string);
            } else if (fieldKey === 'price' || fieldKey === 'dose_per_serving') {
              fieldValue = parseFloat(fieldValue as string) || fieldValue;
            } else if (fieldKey === 'servings_per_container' || fieldKey === 'serving_size') {
              fieldValue = parseInt(fieldValue as string, 10) || fieldValue;
            }

            // Track locally for auto-save
            streamedData[fieldKey] = fieldValue;

            // Update this specific field in real-time for UI
            setBatchAIResults((prev) => ({
              ...prev,
              [supplementId]: {
                ...prev[supplementId],
                data: {
                  ...prev[supplementId]?.data,
                  [fieldKey]: fieldValue,
                }
              }
            }));
          }

          // Handle first_pass_done as fallback (fields already streamed via field_found)
          // This ensures we have all data even if some field_found events were missed
          if (event.step === 'first_pass_done' && event.supplement) {
            const supplementData = event.supplement as Record<string, any>;
            const fieldsToUpdate: Record<string, any> = {};

            for (const fieldKey of ['brand', 'price', 'servings_per_container', 'serving_size', 'intake_form', 'dose_per_serving', 'dose_unit', 'category']) {
              let fieldValue = supplementData[fieldKey];
              if (fieldValue !== undefined && fieldValue !== null) {
                if (fieldKey === 'intake_form' || fieldKey === 'category') {
                  fieldValue = normalizeValue(fieldValue as string);
                }
                fieldsToUpdate[fieldKey] = fieldValue;
                // Track locally for auto-save
                streamedData[fieldKey] = fieldValue;
              }
            }

            setBatchAIResults((prev) => ({
              ...prev,
              [supplementId]: {
                ...prev[supplementId],
                data: {
                  ...prev[supplementId]?.data,
                  ...fieldsToUpdate,
                }
              }
            }));
          }
        },
        (data) => {
          result = data;
        },
        (error) => {
          hasError = true;
          resolve({ error });
        }
      ).then(() => {
        if (hasError) return;

        if (result?.supplements?.[0]) {
          const s = result.supplements[0];
          // Return final complete data merged with streamed data
          // (use ?? to preserve 0 values, filter only null/undefined)
          const finalData = {
            brand: s.brand ?? undefined,
            price: s.price ?? undefined,
            servings_per_container: s.servings_per_container ?? undefined,
            serving_size: s.serving_size ?? undefined,
            intake_form: normalizeValue(s.intake_form) ?? undefined,
            dose_per_serving: s.dose_per_serving ?? undefined,
            dose_unit: s.dose_unit ?? undefined,
            category: normalizeValue(s.category) ?? undefined,
          };
          // Merge: streamed data first, then final data overwrites
          resolve({
            data: { ...streamedData, ...finalData }
          });
        } else if (Object.keys(streamedData).length > 0) {
          // No final result, but we have streamed data - use it
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

    const supplementsToFetch = supplementsWithMissingData.filter(
      (s) => batchAIResults[s.id]?.selected !== false
    );

    for (const supplement of supplementsToFetch) {
      // Update status to fetching
      setBatchAIResults((prev) => ({
        ...prev,
        [supplement.id]: { ...prev[supplement.id], status: 'fetching' }
      }));

      const result = await fetchAIForSupplement(supplement.id, supplement);

      if (result.error) {
        // Update with error status
        setBatchAIResults((prev) => ({
          ...prev,
          [supplement.id]: {
            ...prev[supplement.id],
            status: 'error',
            error: result.error,
          }
        }));
      } else {
        // Update with found data, then auto-save
        // result.data now includes streamed data merged with final data
        const currentData = result.data || {};

        setBatchAIResults((prev) => ({
          ...prev,
          [supplement.id]: {
            ...prev[supplement.id],
            status: 'saving',
            data: { ...prev[supplement.id]?.data, ...currentData },
          }
        }));

        // Auto-save immediately
        try {
          console.log(`[BatchAI] Auto-save for ${supplement.name}:`, currentData);
          const updateData: Record<string, any> = {
            product_data_source: 'ai',
            product_updated_at: new Date().toISOString(),
          };

          // Only include fields that have actual values
          if (currentData.brand) updateData.brand = currentData.brand;
          if (currentData.price != null) updateData.price = currentData.price;
          if (currentData.servings_per_container != null) updateData.servings_per_container = currentData.servings_per_container;
          if (currentData.serving_size != null) updateData.serving_size = currentData.serving_size;
          if (currentData.intake_form) updateData.intake_form = currentData.intake_form;
          if (currentData.dose_per_serving != null) updateData.dose_per_serving = currentData.dose_per_serving;
          if (currentData.dose_unit) updateData.dose_unit = currentData.dose_unit;
          if (currentData.category) updateData.category = currentData.category;

          console.log(`[BatchAI] Update data for ${supplement.name}:`, updateData, `Keys: ${Object.keys(updateData).length}`);

          // Save if we have at least one field to update
          if (Object.keys(updateData).length > 2) {
            await updateSupplement.mutateAsync({ id: supplement.id, data: updateData });
            console.log(`[BatchAI] Saved ${supplement.name} successfully`);
            setBatchAIResults((prev) => ({
              ...prev,
              [supplement.id]: { ...prev[supplement.id], status: 'saved' }
            }));
          } else {
            // No data to save, mark as success
            console.log(`[BatchAI] No data to save for ${supplement.name}`);
            setBatchAIResults((prev) => ({
              ...prev,
              [supplement.id]: { ...prev[supplement.id], status: 'success' }
            }));
          }
        } catch (saveError) {
          console.error(`[BatchAI] Auto-save FAILED for ${supplement.name}:`, saveError);
          setBatchAIResults((prev) => ({
            ...prev,
            [supplement.id]: { ...prev[supplement.id], status: 'error', error: String(saveError) }
          }));
        }
      }
    }

    setIsBatchFetching(false);
    refetch(); // Refresh the main list
  };

  // Save all selected batch AI results
  const handleSaveBatchAI = async () => {
    setIsSavingBatch(true);
    let savedCount = 0;
    let failedCount = 0;
    const failedNames: string[] = [];

    // Save supplements that have data (from AI or manual entry)
    for (const supplement of supplementsWithMissingData) {
      const result = batchAIResults[supplement.id];

      // Skip if deselected
      if (result?.selected === false) continue;

      // Skip if no data at all
      if (!result?.data) continue;

      try {
        const updateData: Record<string, any> = {
          product_data_source: 'ai',
          product_updated_at: new Date().toISOString(),
        };

        // Only include fields that have actual values (not null/undefined)
        if (result.data.brand) updateData.brand = result.data.brand;
        if (result.data.price != null) updateData.price = result.data.price;
        if (result.data.servings_per_container != null) updateData.servings_per_container = result.data.servings_per_container;
        if (result.data.serving_size != null) updateData.serving_size = result.data.serving_size;
        if (result.data.intake_form) updateData.intake_form = result.data.intake_form;
        if (result.data.dose_per_serving != null) updateData.dose_per_serving = result.data.dose_per_serving;
        if (result.data.dose_unit) updateData.dose_unit = result.data.dose_unit;
        if (result.data.category) updateData.category = result.data.category;

        // Only save if we have at least one field to update (besides metadata)
        if (Object.keys(updateData).length > 2) {
          await updateSupplement.mutateAsync({ id: supplement.id, data: updateData });
          savedCount++;
        }
      } catch (error: any) {
        console.error(`Failed to save supplement ${supplement.name}:`, error);
        failedNames.push(supplement.name);
        failedCount++;
      }
    }

    if (savedCount > 0 && failedCount === 0) {
      toast.success(`Updated ${savedCount} supplements with AI data`);
    } else if (savedCount > 0 && failedCount > 0) {
      toast.warning(`Updated ${savedCount} supplements. Failed: ${failedNames.join(', ')}`);
    } else if (failedCount > 0) {
      toast.error(`Failed to save: ${failedNames.join(', ')}`);
    } else {
      toast.info("No supplements had data to save");
    }

    setIsBatchAIModalOpen(false);
    refetch();
    setIsSavingBatch(false);
  };

  // Toggle selection for a supplement in batch AI
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
          <h1 className="text-2xl font-semibold">Supplements</h1>
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

                {/* User Input Fields - Orange */}
                {(missingFieldCounts.fields.timing || missingFieldCounts.fields.frequency) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-400">
                      <span className="font-semibold">{supplementsNeedingUserInput.length}</span> need frequency/timing
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30 text-orange-400"
                      onClick={handleOpenUserInputModal}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Schedule
                      <span className="ml-1 text-xs bg-orange-500/30 px-1.5 py-0.5 rounded">
                        {supplementsNeedingUserInput.length}
                      </span>
                    </Button>
                  </div>
                )}

                {/* AI-Populatable Fields - Purple Box */}
                {(() => {
                  const hasAiFields = ['price', 'servings', 'form', 'dose', 'unit', 'category', 'brand'].some(
                    (field) => missingFieldCounts.fields[field] > 0
                  );
                  // Count supplements with missing AI-fillable fields
                  const supplementsWithAiFields = allSupplements?.filter((s) =>
                    !s.brand || !s.price || !s.dose_per_serving || !s.dose_unit ||
                    !s.category || !s.servings_per_container || !s.intake_form
                  ).length || 0;

                  if (hasAiFields) {
                    return (
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-sm text-purple-400">
                          <span className="font-semibold">{supplementsWithAiFields}</span> Supplements missing product info: AI can search & fill
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
                            {missingFieldCounts.total}
                          </span>
                        </Button>
                      </div>
                    );
                  } else if (missingFieldCounts.needsUrl.length > 0) {
                    return (
                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10">
                        <Link2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-sm text-blue-400">
                          Add product URLs to power AI population
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30 text-blue-400 ml-auto"
                          onClick={handleOpenUrlModal}
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Add URLs
                          <span className="ml-1 text-xs bg-blue-500/30 px-1.5 py-0.5 rounded">
                            {missingFieldCounts.needsUrl.length}
                          </span>
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Main Content - Two Column Layout */}
            <div className="flex gap-4">
              {/* Left Sidebar */}
              <div className="w-52 flex-shrink-0 space-y-4">
                {/* Search */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">SEARCH SUPPLEMENTS</h3>
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

                {/* Chat Input - AI Quick Add */}
                <div className="pt-2">
                  <SupplementChatInput onSubmit={handleChatSubmit} isProcessing={isProcessing} />
                </div>

                {/* Add Supplement Button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setAddModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplement
                  </Button>
                </div>

                {/* Supplement Cost Summary - Below Add button */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">SUPPLEMENT COSTS</h3>
                  {supplements && supplements.length > 0 ? (
                    <>
                      <div
                        className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={() => setIsCostBreakdownModalOpen(true)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {costs.activeCount} active / {costs.totalCount} total
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Daily</span>
                            <span className="text-sm font-medium text-muted-foreground">${costs.daily.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Monthly</span>
                            <span className="text-lg font-bold">${costs.monthly.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Yearly</span>
                            <span className="text-sm font-medium text-muted-foreground">${costs.yearly.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Cost Warning */}
                      {supplementsMissingCostData.length > 0 && (
                        <div
                          className="mt-3 p-2 rounded border border-red-500/30 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-colors"
                          onClick={() => setIsCostWarningModalOpen(true)}
                        >
                          <div className="flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium">Cost may be inaccurate</span>
                          </div>
                          <p className="text-[10px] text-red-400/80 mt-0.5">
                            {supplementsMissingCostData.length} missing price/dose
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No supplements yet. Add supplements to track costs.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Content - Supplement Cards */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">ALL SUPPLEMENTS</h3>
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
                    <p className="text-destructive">Failed to load supplements</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please check your connection and try again
                    </p>
                  </div>
                ) : filteredSupplements && filteredSupplements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredSupplements.map((supplement) => (
                      <SupplementCard
                        key={supplement.id}
                        supplement={supplement}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                      <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No supplements yet</h3>
                      <p className="text-muted-foreground">
                        Add your first supplement to start tracking your stack
                      </p>
                    </div>

                    {/* Inline Add Interface */}
                    <div className="space-y-4">
                      {/* AI Extraction Input */}
                      <SupplementChatInput
                        onSubmit={handleChatSubmit}
                        isProcessing={isProcessing}
                      />

                      {/* Add Supplement Button */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setAddModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Supplement
                      </Button>
                    </div>
                  </div>
                )}

                {filteredSupplements && filteredSupplements.length === 0 && supplements && supplements.length > 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No supplements match your current filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Form Dialog (for editing existing supplements) */}
      <SupplementForm
        supplement={editingSupplement}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* Add Combined Modal (AI/Manual tabs) */}
      <SupplementAddCombinedModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => refetch()}
        onOpenExtractionModal={(input) => {
          setExtractionInput(input);
          setIsProcessing(true);
          setIsExtractionModalOpen(true);
        }}
      />

      {/* Extraction Modal */}
      <SupplementExtractionModal
        open={isExtractionModalOpen}
        onOpenChange={handleModalClose}
        onSuccess={() => refetch()}
        initialInput={extractionInput}
      />

      {/* URL Input Modal */}
      <Dialog open={isUrlModalOpen} onOpenChange={setIsUrlModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              Add Product URLs
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add product URLs to help AI populate missing fields. Paste Amazon, iHerb, or other store links.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            <div className="space-y-3">
              {missingFieldCounts.needsUrl.map((supplement) => (
                <div key={supplement.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="w-1/3 shrink-0">
                    <p className="font-medium text-sm truncate">{supplement.name}</p>
                    {supplement.brand && (
                      <p className="text-xs text-muted-foreground truncate">{supplement.brand}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="https://www.amazon.com/..."
                      value={urlEntries[supplement.id] || ""}
                      onChange={(e) => setUrlEntries((prev) => ({
                        ...prev,
                        [supplement.id]: e.target.value,
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsUrlModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUrlsAndPopulate}
              disabled={isSavingUrls}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {isSavingUrls ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save & Populate by AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Input Modal - Frequency & Timing */}
      <Dialog open={isUserInputModalOpen} onOpenChange={setIsUserInputModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Add Frequency & Timing
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Set when and how often you take each supplement
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr,140px,200px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
              <div>Supplement</div>
              <div>Frequency</div>
              <div>Timing</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {supplementsNeedingUserInput.map((supplement) => (
                <div key={supplement.id} className="grid grid-cols-[1fr,140px,200px] gap-2 px-2 py-2 items-center">
                  <div className="truncate text-sm font-medium">{supplement.name}</div>
                  <select
                    value={userInputEntries[supplement.id]?.frequency || ""}
                    onChange={(e) => setUserInputEntries((prev) => ({
                      ...prev,
                      [supplement.id]: { ...prev[supplement.id], frequency: e.target.value },
                    }))}
                    className="h-7 text-xs rounded border bg-background px-2"
                  >
                    <option value="">Select...</option>
                    <option value="daily">Daily</option>
                    <option value="every_other_day">Every Other</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                  <div className="flex flex-wrap gap-1">
                    {['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed'].map((time) => {
                      const config = TIMING_CONFIG[time];
                      const TimingIcon = config.icon;
                      const isSelected = userInputEntries[supplement.id]?.timings?.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            const current = userInputEntries[supplement.id]?.timings || [];
                            const newTimings = isSelected
                              ? current.filter((t) => t !== time)
                              : [...current, time];
                            setUserInputEntries((prev) => ({
                              ...prev,
                              [supplement.id]: { ...prev[supplement.id], timings: newTimings },
                            }));
                          }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                            isSelected
                              ? config.selectedColor
                              : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <TimingIcon className="w-3 h-3" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsUserInputModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUserInput}
              disabled={isSavingUserInput}
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isSavingUserInput ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Warning Modal */}
      <Dialog open={isCostWarningModalOpen} onOpenChange={setIsCostWarningModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Missing Cost Data
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              These supplements are missing price or dosage info needed to calculate accurate costs
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr,80px,80px,80px,120px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
              <div>Supplement</div>
              <div>Price</div>
              <div>Servings</div>
              <div>Dose</div>
              <div>Product URL</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {supplementsMissingCostData.map((supplement) => {
                const missingPrice = !supplement.price;
                const missingServings = !supplement.servings_per_container;
                const missingDose = !supplement.dose_per_serving;
                const missingUrl = !supplement.purchase_url;

                return (
                  <div key={supplement.id} className="grid grid-cols-[1fr,80px,80px,80px,120px] gap-2 px-2 py-2 items-center text-sm">
                    <div className="truncate font-medium">{supplement.name}</div>
                    <div>
                      {missingPrice ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">missing</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">${supplement.price}</span>
                      )}
                    </div>
                    <div>
                      {missingServings ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">missing</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{supplement.servings_per_container}</span>
                      )}
                    </div>
                    <div>
                      {missingDose ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">missing</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{supplement.dose_per_serving}{supplement.dose_unit}</span>
                      )}
                    </div>
                    <div>
                      {missingUrl ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">no URL</span>
                      ) : (
                        <span className="text-xs text-green-400">has URL</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2">
            <Button variant="outline" onClick={() => setIsCostWarningModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30 text-blue-400"
              onClick={() => {
                setIsCostWarningModalOpen(false);
                handleOpenUrlModal();
              }}
            >
              <Link2 className="w-4 h-4 mr-2" />
              Add URLs
            </Button>
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => {
                setIsCostWarningModalOpen(false);
                handleOpenBatchAIModal();
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Populate by AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch AI Population Modal */}
      <Dialog open={isBatchAIModalOpen} onOpenChange={setIsBatchAIModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Populate All Supplements by AI
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
                    Processing {Object.values(batchAIResults).filter((r) => r.status === 'success' || r.status === 'error').length}/{Object.keys(batchAIResults).length}
                  </span>
                </div>
              )}
              {!isBatchFetching && Object.values(batchAIResults).some((r) => r.status === 'success') && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">
                    {Object.values(batchAIResults).filter((r) => r.status === 'success').length} found
                  </span>
                </div>
              )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[40px,1fr,100px,80px,80px,100px,80px,80px,100px,80px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
              <div></div>
              <div>Supplement</div>
              <div>Status</div>
              <div>Brand</div>
              <div>Price</div>
              <div>Servings</div>
              <div>Form</div>
              <div>Dose</div>
              <div>Unit</div>
              <div>Category</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {supplementsWithMissingData.map((supplement) => {
                const result = batchAIResults[supplement.id];
                return (
                  <div
                    key={supplement.id}
                    className={`grid grid-cols-[40px,1fr,100px,80px,80px,100px,80px,80px,100px,80px] gap-2 px-2 py-2 items-center text-sm ${
                      result?.selected === false ? 'opacity-50' : ''
                    }`}
                  >
                    <div>
                      <Checkbox
                        checked={result?.selected !== false}
                        onCheckedChange={() => toggleBatchSelection(supplement.id)}
                      />
                    </div>
                    <div className="truncate font-medium flex items-center gap-1">
                      <span className="truncate">{supplement.name}</span>
                      {supplement.purchase_url ? (
                        <a
                          href={supplement.purchase_url}
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
                      ) : supplement.brand ? (
                        <span className="text-muted-foreground">{supplement.brand}</span>
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
                              [supplement.id]: {
                                ...prev[supplement.id],
                                data: { ...prev[supplement.id]?.data, price: val }
                              }
                            }));
                          }}
                          className="w-16 h-6 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : supplement.price ? (
                        <span className="text-muted-foreground">${supplement.price}</span>
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
                                [supplement.id]: {
                                  ...prev[supplement.id],
                                  status: prev[supplement.id]?.status === 'pending' ? 'success' : prev[supplement.id]?.status || 'success',
                                  data: { ...prev[supplement.id]?.data, price: val }
                                }
                              }));
                            }
                          }}
                          className="w-12 h-6 px-1 rounded bg-yellow-500/10 text-yellow-500 font-medium border border-yellow-500/30 text-xs placeholder:text-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    </div>
                    <div className="text-xs">
                      {result?.data?.servings_per_container ? (
                        <input
                          type="number"
                          value={result.data.servings_per_container}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            setBatchAIResults((prev) => ({
                              ...prev,
                              [supplement.id]: {
                                ...prev[supplement.id],
                                data: { ...prev[supplement.id]?.data, servings_per_container: val }
                              }
                            }));
                          }}
                          className="w-14 h-6 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : supplement.servings_per_container ? (
                        <span className="text-muted-foreground">{supplement.servings_per_container}</span>
                      ) : (
                        <input
                          type="number"
                          placeholder="?"
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            if (val) {
                              setBatchAIResults((prev) => ({
                                ...prev,
                                [supplement.id]: {
                                  ...prev[supplement.id],
                                  status: prev[supplement.id]?.status === 'pending' ? 'success' : prev[supplement.id]?.status || 'success',
                                  data: { ...prev[supplement.id]?.data, servings_per_container: val }
                                }
                              }));
                            }
                          }}
                          className="w-12 h-6 px-1 rounded bg-yellow-500/10 text-yellow-500 font-medium border border-yellow-500/30 text-xs placeholder:text-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    </div>
                    <div className="text-xs">
                      {(() => {
                        const formValue = result?.data?.intake_form || supplement.intake_form;
                        const isNew = !!result?.data?.intake_form;
                        if (formValue) {
                          const config = INTAKE_FORM_CONFIG[formValue.toLowerCase()];
                          if (config) {
                            const FormIcon = config.icon;
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isNew ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : config.bgColor} ${config.color} font-medium`}>
                                <FormIcon className="w-3 h-3" />
                                {config.label}
                              </span>
                            );
                          }
                          return (
                            <span className={`px-1.5 py-0.5 rounded ${isNew ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/50 text-muted-foreground'} font-medium`}>
                              {formValue}
                            </span>
                          );
                        }
                        return (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setBatchAIResults((prev) => ({
                                  ...prev,
                                  [supplement.id]: {
                                    ...prev[supplement.id],
                                    status: prev[supplement.id]?.status === 'pending' ? 'success' : prev[supplement.id]?.status || 'success',
                                    data: { ...prev[supplement.id]?.data, intake_form: e.target.value }
                                  }
                                }));
                              }
                            }}
                            className="h-6 px-1 rounded bg-yellow-500/10 text-yellow-500 font-medium border border-yellow-500/30 text-xs"
                          >
                            <option value="">?</option>
                            <option value="capsule">Capsule</option>
                            <option value="powder">Powder</option>
                            <option value="liquid">Liquid</option>
                            <option value="softgel">Softgel</option>
                            <option value="tablet">Tablet</option>
                            <option value="gummy">Gummy</option>
                          </select>
                        );
                      })()}
                    </div>
                    <div className="text-xs">
                      {result?.data?.dose_per_serving ? (
                        <input
                          type="number"
                          value={result.data.dose_per_serving}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            setBatchAIResults((prev) => ({
                              ...prev,
                              [supplement.id]: {
                                ...prev[supplement.id],
                                data: { ...prev[supplement.id]?.data, dose_per_serving: val }
                              }
                            }));
                          }}
                          className="w-14 h-6 px-1.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/30 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : supplement.dose_per_serving ? (
                        <span className="text-muted-foreground">{supplement.dose_per_serving}</span>
                      ) : (
                        <input
                          type="number"
                          placeholder="?"
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            if (val) {
                              setBatchAIResults((prev) => ({
                                ...prev,
                                [supplement.id]: {
                                  ...prev[supplement.id],
                                  status: prev[supplement.id]?.status === 'pending' ? 'success' : prev[supplement.id]?.status || 'success',
                                  data: { ...prev[supplement.id]?.data, dose_per_serving: val }
                                }
                              }));
                            }
                          }}
                          className="w-12 h-6 px-1 rounded bg-yellow-500/10 text-yellow-500 font-medium border border-yellow-500/30 text-xs placeholder:text-yellow-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    </div>
                    <div className="text-xs">
                      {(() => {
                        const unitValue = result?.data?.dose_unit || supplement.dose_unit;
                        const isNew = !!result?.data?.dose_unit;
                        if (unitValue) {
                          const config = DOSE_UNIT_CONFIG[unitValue];
                          if (config) {
                            return (
                              <span className={`px-1.5 py-0.5 rounded ${isNew ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : config.bgColor} ${config.color} font-medium`}>
                                {unitValue}
                              </span>
                            );
                          }
                          return (
                            <span className={`px-1.5 py-0.5 rounded ${isNew ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/50 text-muted-foreground'} font-medium`}>
                              {unitValue}
                            </span>
                          );
                        }
                        return (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setBatchAIResults((prev) => ({
                                  ...prev,
                                  [supplement.id]: {
                                    ...prev[supplement.id],
                                    status: prev[supplement.id]?.status === 'pending' ? 'success' : prev[supplement.id]?.status || 'success',
                                    data: { ...prev[supplement.id]?.data, dose_unit: e.target.value }
                                  }
                                }));
                              }
                            }}
                            className="h-6 px-1 rounded bg-yellow-500/10 text-yellow-500 font-medium border border-yellow-500/30 text-xs"
                          >
                            <option value="">?</option>
                            <option value="mg">mg</option>
                            <option value="g">g</option>
                            <option value="mcg">mcg</option>
                            <option value="IU">IU</option>
                            <option value="ml">ml</option>
                            <option value="CFU">CFU</option>
                          </select>
                        );
                      })()}
                    </div>
                    <div className="text-xs truncate">
                      {(() => {
                        const catValue = result?.data?.category || supplement.category;
                        const isNew = !!result?.data?.category;
                        if (catValue) {
                          const CategoryIcon = CATEGORY_ICONS[catValue];
                          const bgColor = CATEGORY_COLORS[catValue] || "rgba(107, 114, 128, 0.2)";
                          // Map category values to display labels
                          const catLabels: Record<string, string> = {
                            vitamin_mineral: "Vitamin",
                            amino_protein: "Amino",
                            herb_botanical: "Herb",
                            probiotic: "Probiotic",
                            other: "Other",
                          };
                          const label = catLabels[catValue] || catValue;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${isNew ? 'ring-1 ring-emerald-500/30' : ''}`}
                              style={{ backgroundColor: bgColor }}
                            >
                              {CategoryIcon && <CategoryIcon className="w-3 h-3" />}
                              {label}
                            </span>
                          );
                        }
                        return (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setBatchAIResults((prev) => ({
                                  ...prev,
                                  [supplement.id]: {
                                    ...prev[supplement.id],
                                    status: prev[supplement.id]?.status === 'pending' ? 'success' : prev[supplement.id]?.status || 'success',
                                    data: { ...prev[supplement.id]?.data, category: e.target.value }
                                  }
                                }));
                              }
                            }}
                            className="h-6 px-1 rounded bg-yellow-500/10 text-yellow-500 font-medium border border-yellow-500/30 text-xs"
                          >
                            <option value="">?</option>
                            <option value="vitamin_mineral">Vitamin</option>
                            <option value="amino_protein">Amino</option>
                            <option value="herb_botanical">Herb</option>
                            <option value="probiotic">Probiotic</option>
                            <option value="other">Other</option>
                          </select>
                        );
                      })()}
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

      {/* Cost Breakdown Modal */}
      <Dialog open={isCostBreakdownModalOpen} onOpenChange={setIsCostBreakdownModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Monthly Cost Breakdown
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {costs.activeCount} active supplements • ${costs.monthly.toFixed(2)}/month
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr,100px,100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
              <div>Supplement</div>
              <div className="text-right">Monthly</div>
              <div className="text-right">Running Total</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {(() => {
                let runningTotal = 0;
                return supplementsSortedByCost.map((supplement) => {
                  runningTotal += supplement.monthlyCost;
                  return (
                    <div key={supplement.id} className="grid grid-cols-[1fr,100px,100px] gap-2 px-3 py-2.5 items-center hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{supplement.name}</span>
                        {supplement.purchase_url ? (
                          <a
                            href={supplement.purchase_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 shrink-0"
                            title="Open product page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                      </div>
                      <div className="text-right">
                        {supplement.monthlyCost > 0 ? (
                          <span className="text-sm font-medium">${supplement.monthlyCost.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">${runningTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-3">
            <div className="flex-1 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Daily:</span>
                <span className="font-medium">${costs.daily.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Yearly:</span>
                <span className="font-medium">${costs.yearly.toFixed(2)}</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsCostBreakdownModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
