"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useEquipment, useCreateEquipmentBulk, useEquipmentDuplicates, useUpdateEquipment } from "@/hooks/useEquipment";
import { EquipmentDuplicatesModal } from "@/components/equipment/EquipmentDuplicatesModal";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { useExtractEquipment, useHasActiveAIKey } from "@/hooks/useAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Equipment } from "@/types";
import {
  Plus,
  Search,
  Cpu,
  ChevronUp,
  ChevronDown,
  Zap,
  Moon,
  Sparkles,
  Scissors,
  Heart,
  MoreHorizontal,
  LucideIcon,
  Send,
  Loader2,
  Check,
  Brain,
  AlertTriangle,
  Copy,
  FileSearch,
  CheckCircle2,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  BedDouble,
  Clock,
  XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// ~50K chars is safe for Claude's context (leaves room for system prompt + response)
const MAX_TEXT_LENGTH = 50000;
const WARNING_THRESHOLD = 40000;

const CATEGORIES = [
  "All",
  "LLLT",
  "Microneedling",
  "Sleep",
  "Skincare",
  "Recovery",
  "Other",
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  LLLT: Zap,
  Microneedling: Scissors,
  Sleep: Moon,
  Skincare: Sparkles,
  Recovery: Heart,
  Other: MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, string> = {
  All: "rgba(107, 142, 90, 0.2)",
  LLLT: "rgba(234, 179, 8, 0.2)",
  Microneedling: "rgba(239, 68, 68, 0.2)",
  Sleep: "rgba(139, 92, 246, 0.2)",
  Skincare: "rgba(236, 72, 153, 0.2)",
  Recovery: "rgba(34, 197, 94, 0.2)",
  Other: "rgba(107, 114, 128, 0.2)",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Timing configuration for the schedule modal
const TIMING_CONFIG: Record<string, { icon: LucideIcon; color: string; selectedColor: string; label: string }> = {
  wake_up: { icon: Sunrise, color: "text-orange-400", selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-400", label: "Wake" },
  am: { icon: Sun, color: "text-yellow-400", selectedColor: "bg-yellow-500/30 border-yellow-500/50 text-yellow-400", label: "AM" },
  lunch: { icon: Utensils, color: "text-amber-500", selectedColor: "bg-amber-500/30 border-amber-500/50 text-amber-500", label: "Lunch" },
  pm: { icon: Sunset, color: "text-orange-500", selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-500", label: "PM" },
  dinner: { icon: Utensils, color: "text-purple-400", selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400", label: "Dinner" },
  evening: { icon: Moon, color: "text-purple-400", selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400", label: "Evening" },
  bed: { icon: BedDouble, color: "text-indigo-400", selectedColor: "bg-indigo-500/30 border-indigo-500/50 text-indigo-400", label: "Bed" },
};

// Frequency options for the schedule modal (matching EquipmentForm)
const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_other_day", label: "Every Other Day" },
  { value: "as_needed", label: "As Needed" },
];

// Day options for custom frequency
const DAY_OPTIONS = [
  { value: "sun", label: "S" },
  { value: "mon", label: "M" },
  { value: "tue", label: "T" },
  { value: "wed", label: "W" },
  { value: "thu", label: "T" },
  { value: "fri", label: "F" },
  { value: "sat", label: "S" },
];

interface ExtractedEquipment {
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  purpose?: string;
  specs?: Record<string, any>;
  usage_frequency?: string;
  usage_timing?: string;
  usage_duration?: string;
  usage_protocol?: string;
  contraindications?: string;
  confidence: number;
}

export default function EquipmentPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // AI extraction state
  const [aiInput, setAiInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [extractedEquipment, setExtractedEquipment] = useState<ExtractedEquipment[]>([]);
  const [selectedExtracted, setSelectedExtracted] = useState<Set<number>>(new Set());

  // Extraction progress state
  const [extractionProgressOpen, setExtractionProgressOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"preparing" | "analyzing" | "extracting">("preparing");
  const [processedInputs, setProcessedInputs] = useState<string[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Duplicates modal state
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);

  // Schedule modal state (batch editing frequency/timing/duration)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEntries, setScheduleEntries] = useState<Record<string, { frequency: string; frequency_days: string[]; timing: string; duration: string }>>({});
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Batch AI population modal state
  const [isBatchAIModalOpen, setIsBatchAIModalOpen] = useState(false);
  const [batchAIResults, setBatchAIResults] = useState<Record<string, {
    status: 'pending' | 'fetching' | 'saving' | 'saved' | 'success' | 'error';
    data?: {
      brand?: string;
      category?: string;
      purpose?: string;
      usage_protocol?: string;
      usage_duration?: string;
    };
    error?: string;
    selected?: boolean;
  }>>({});
  const [isBatchFetching, setIsBatchFetching] = useState(false);

  const { data: equipment, isLoading, error, refetch } = useEquipment({
    category: selectedCategory === "All" ? undefined : selectedCategory.toLowerCase(),
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const createBulkMutation = useCreateEquipmentBulk();
  const extractMutation = useExtractEquipment();
  const updateEquipment = useUpdateEquipment();

  // Fetch existing duplicates for the equipment list
  const { data: existingDuplicates, refetch: refetchDuplicates } = useEquipmentDuplicates();
  const duplicateIds = useMemo(() => new Set(existingDuplicates?.duplicateIds || []), [existingDuplicates]);
  const totalDuplicates = useMemo(() => {
    if (!existingDuplicates?.groups) return 0;
    return existingDuplicates.groups.reduce((sum, group) => sum + group.items.length - 1, 0);
  }, [existingDuplicates]);

  // Check for AI API key
  const { hasKey: hasAIKey, isLoading: isCheckingKey } = useHasActiveAIKey();

  // Detect duplicates - same name + same brand
  const duplicates = useMemo(() => {
    if (extractedEquipment.length === 0 || !equipment) return new Set<number>();

    const dupes = new Set<number>();

    extractedEquipment.forEach((extracted, index) => {
      const isDuplicate = equipment.some((existing) => {
        const sameName = existing.name.toLowerCase() === extracted.name.toLowerCase();
        const sameBrand = (!existing.brand && !extracted.brand) ||
          (existing.brand?.toLowerCase() === extracted.brand?.toLowerCase());
        return sameName && sameBrand;
      });

      if (isDuplicate) {
        dupes.add(index);
      }
    });

    return dupes;
  }, [extractedEquipment, equipment]);

  // Auto-deselect duplicates when detected
  useEffect(() => {
    if (duplicates.size > 0 && extractedEquipment.length > 0) {
      setSelectedExtracted((prev) => {
        const newSelected = new Set(prev);
        duplicates.forEach((index) => newSelected.delete(index));
        return newSelected;
      });
    }
  }, [duplicates, extractedEquipment]);

  const filteredEquipment = useMemo(() => {
    const filtered = equipment?.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.brand?.toLowerCase().includes(search.toLowerCase()) ||
      e.model?.toLowerCase().includes(search.toLowerCase())
    );

    // Sort: active items first, then inactive at the bottom
    return filtered?.sort((a, b) => {
      if (a.is_active === b.is_active) return 0;
      return a.is_active ? -1 : 1;
    });
  }, [equipment, search]);

  // Valid options for validation
  const VALID_FREQUENCIES = ['daily', 'every_other_day', 'as_needed'];
  const VALID_TIMINGS = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'bed', 'evening'];
  const VALID_CATEGORIES = ['lllt', 'microneedling', 'sleep', 'skincare', 'recovery', 'other'];

  // Calculate missing field counts across all equipment
  const missingFieldCounts = useMemo(() => {
    if (!equipment) return { total: 0, needsSchedule: 0, needsProductInfo: 0, equipmentNeedingSchedule: [] as Equipment[], equipmentNeedingProductInfo: [] as Equipment[] };

    const equipmentNeedingSchedule: Equipment[] = [];
    const equipmentNeedingProductInfo: Equipment[] = [];

    equipment.forEach((e) => {
      // Check schedule (frequency + timing + duration must be valid)
      const hasValidFreq = e.usage_frequency && VALID_FREQUENCIES.includes(e.usage_frequency.toLowerCase());
      const hasValidTiming = e.usage_timing && VALID_TIMINGS.includes(e.usage_timing.toLowerCase());
      const hasDuration = e.usage_duration && e.usage_duration.trim() !== '';
      if (!hasValidFreq || !hasValidTiming || !hasDuration) {
        equipmentNeedingSchedule.push(e);
      }

      // Check product info (brand, category, purpose, protocol, duration)
      const hasValidCategory = e.category && VALID_CATEGORIES.includes(e.category.toLowerCase());
      if (!e.brand || !hasValidCategory || !e.purpose || !e.usage_protocol || !e.usage_duration) {
        equipmentNeedingProductInfo.push(e);
      }
    });

    return {
      total: new Set([...equipmentNeedingSchedule, ...equipmentNeedingProductInfo].map(e => e.id)).size,
      needsSchedule: equipmentNeedingSchedule.length,
      needsProductInfo: equipmentNeedingProductInfo.length,
      equipmentNeedingSchedule,
      equipmentNeedingProductInfo,
    };
  }, [equipment]);

  // Handler to open schedule modal for batch editing
  const handleOpenScheduleModal = () => {
    if (missingFieldCounts.equipmentNeedingSchedule.length > 0) {
      const entries: Record<string, { frequency: string; frequency_days: string[]; timing: string; duration: string }> = {};
      missingFieldCounts.equipmentNeedingSchedule.forEach((e) => {
        entries[e.id] = {
          frequency: e.usage_frequency || "",
          frequency_days: (e as any).frequency_days || [],
          timing: e.usage_timing || "",
          duration: e.usage_duration || "",
        };
      });
      setScheduleEntries(entries);
      setIsScheduleModalOpen(true);
    }
  };

  // Save schedule entries
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      let updateCount = 0;
      for (const [id, data] of Object.entries(scheduleEntries)) {
        if (data.frequency || data.timing || data.duration) {
          await updateEquipment.mutateAsync({
            id,
            data: {
              usage_frequency: data.frequency || undefined,
              usage_timing: data.timing || undefined,
              usage_duration: data.duration || undefined,
            },
          });
          updateCount++;
        }
      }

      if (updateCount > 0) {
        toast.success(`Updated ${updateCount} equipment items`);
      }

      setIsScheduleModalOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handler to open batch AI modal
  const handleOpenBatchAIModal = useCallback(() => {
    const initialResults: typeof batchAIResults = {};
    missingFieldCounts.equipmentNeedingProductInfo.forEach((e) => {
      initialResults[e.id] = { status: 'pending', selected: true };
    });
    setBatchAIResults(initialResults);
    setIsBatchAIModalOpen(true);
  }, [missingFieldCounts.equipmentNeedingProductInfo]);

  // Handler for warning bar button (uses the batch modal)
  const handlePopulateByAI = () => {
    handleOpenBatchAIModal();
  };

  // Start batch AI fetching for equipment
  const handleStartBatchAI = async () => {
    setIsBatchFetching(true);

    const equipmentToFetch = missingFieldCounts.equipmentNeedingProductInfo.filter(
      (e) => batchAIResults[e.id]?.selected !== false
    );

    for (const item of equipmentToFetch) {
      // Update status to fetching
      setBatchAIResults((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], status: 'fetching' }
      }));

      try {
        // Use the AI extract mutation to get product info
        const searchQuery = `${item.name} ${item.brand || ""} ${item.model || ""} equipment device. Find: brand, category, purpose, usage protocol, duration.`;
        const result = await extractMutation.mutateAsync({ text_content: searchQuery });

        if (result.equipment && result.equipment.length > 0) {
          const extractedData = result.equipment[0];
          const data = {
            brand: extractedData.brand,
            category: extractedData.category,
            purpose: extractedData.purpose,
            usage_protocol: extractedData.usage_protocol,
            usage_duration: extractedData.usage_duration,
          };

          // Update with found data, then auto-save
          setBatchAIResults((prev) => ({
            ...prev,
            [item.id]: { ...prev[item.id], status: 'saving', data }
          }));

          // Auto-save
          const updateData: Record<string, any> = {};
          if (data.brand) updateData.brand = data.brand;
          if (data.category) updateData.category = data.category;
          if (data.purpose) updateData.purpose = data.purpose;
          if (data.usage_protocol) updateData.usage_protocol = data.usage_protocol;
          if (data.usage_duration) updateData.usage_duration = data.usage_duration;

          if (Object.keys(updateData).length > 0) {
            await updateEquipment.mutateAsync({ id: item.id, data: updateData });
            setBatchAIResults((prev) => ({
              ...prev,
              [item.id]: { ...prev[item.id], status: 'saved' }
            }));
          } else {
            setBatchAIResults((prev) => ({
              ...prev,
              [item.id]: { ...prev[item.id], status: 'success' }
            }));
          }
        } else {
          setBatchAIResults((prev) => ({
            ...prev,
            [item.id]: { ...prev[item.id], status: 'error', error: 'No data found' }
          }));
        }
      } catch (err: any) {
        setBatchAIResults((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], status: 'error', error: err.message || 'Failed' }
        }));
      }
    }

    setIsBatchFetching(false);
    refetch();
  };

  // Toggle selection for equipment in batch AI
  const toggleBatchSelection = (id: string) => {
    setBatchAIResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id]?.selected }
    }));
  };

  const handleEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingEquipment(null);
    setFormOpen(true);
  };

  // AI Fill handler - opens form and triggers AI fill
  const handleAIFill = (item: Equipment) => {
    setEditingEquipment(item);
    setFormOpen(true);
    // Set a flag to trigger AI fill when form opens
    setTimeout(() => {
      const aiButton = document.querySelector('[data-ai-fill-button]') as HTMLButtonElement;
      if (aiButton) aiButton.click();
    }, 100);
  };

  // Progress animation effect
  useEffect(() => {
    if (extractionProgressOpen && isExtracting) {
      setProgress(0);
      setProgressStage("preparing");

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 15) {
            setProgressStage("preparing");
            return prev + 3;
          } else if (prev < 75) {
            setProgressStage("analyzing");
            return prev + 0.5;
          } else if (prev < 90) {
            setProgressStage("extracting");
            return prev + 0.3;
          }
          return prev;
        });
      }, 200);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [extractionProgressOpen, isExtracting]);

  // Complete progress when extraction finishes
  useEffect(() => {
    if (!isExtracting && extractionProgressOpen && progress > 0) {
      setProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [isExtracting, extractionProgressOpen, progress]);

  // AI Extraction handlers
  const handleAIExtract = async () => {
    if (!aiInput.trim()) return;

    // Show progress modal
    setExtractionProgressOpen(true);
    setIsExtracting(true);
    setProgress(0);
    setProgressStage("preparing");
    setProcessedInputs([]);

    // Mark input as processed
    setTimeout(() => {
      setProcessedInputs(["Text input"]);
    }, 500);

    try {
      const result = await extractMutation.mutateAsync({ text_content: aiInput });

      // Close progress modal
      setExtractionProgressOpen(false);
      setProgress(0);
      setProgressStage("preparing");
      setProcessedInputs([]);

      if (result.equipment && result.equipment.length > 0) {
        setExtractedEquipment(result.equipment);
        setSelectedExtracted(new Set(result.equipment.map((_, i) => i)));
        setExtractionModalOpen(true);
        toast.success(`Extracted ${result.equipment.length} equipment items`);
      } else {
        toast.error("No equipment found in the text");
      }
    } catch (err: any) {
      setExtractionProgressOpen(false);
      setProgress(0);
      setProgressStage("preparing");
      setProcessedInputs([]);
      toast.error(err?.response?.data?.error || "Failed to extract equipment");
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleExtractedSelection = (index: number) => {
    const newSelected = new Set(selectedExtracted);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedExtracted(newSelected);
  };

  const handleSaveExtracted = async () => {
    const toSave = extractedEquipment
      .filter((_, i) => selectedExtracted.has(i))
      .map((e) => ({
        name: e.name,
        brand: e.brand,
        model: e.model,
        category: e.category,
        purpose: e.purpose,
        specs: e.specs,
        usage_frequency: e.usage_frequency,
        usage_timing: e.usage_timing,
        usage_duration: e.usage_duration,
        usage_protocol: e.usage_protocol,
        contraindications: e.contraindications,
      }));

    try {
      await createBulkMutation.mutateAsync(toSave);
      toast.success(`Saved ${toSave.length} equipment items`);
      setExtractionModalOpen(false);
      setExtractedEquipment([]);
      setSelectedExtracted(new Set());
      setAiInput("");
      refetch();
    } catch (err) {
      toast.error("Failed to save equipment");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h1 className="text-2xl font-semibold">Equipment</h1>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Filter Bar - Categories */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((category) => {
                  const IconComponent = CATEGORY_ICONS[category];
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
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Missing Data Warning Bar */}
            {missingFieldCounts.total > 0 && (
              <div className="flex items-center gap-4 flex-wrap">
                {/* Warning Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                  <span className="text-lg font-bold text-yellow-500">Warning:</span>
                </div>

                {/* Schedule Missing - Orange */}
                {missingFieldCounts.needsSchedule > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-orange-400">
                      <span className="font-semibold">{missingFieldCounts.needsSchedule}</span> need frequency/timing/duration
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
                        {missingFieldCounts.needsSchedule}
                      </span>
                    </Button>
                  </div>
                )}

                {/* Product Info Missing - Purple */}
                {missingFieldCounts.needsProductInfo > 0 && hasAIKey && (
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-sm text-purple-400">
                      <span className="font-semibold">{missingFieldCounts.needsProductInfo}</span> Equipment missing product info: AI can search & fill
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30 text-purple-400"
                      onClick={handlePopulateByAI}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Populate by AI
                      <span className="ml-1 text-xs bg-purple-500/30 px-1.5 py-0.5 rounded">
                        {missingFieldCounts.needsProductInfo}
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
                {/* Equipment Summary */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">EQUIPMENT SUMMARY</h3>
                  {equipment && equipment.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {equipment.filter(e => e.is_active).length} active / {equipment.length} total
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No equipment yet. Add your devices to track usage.
                    </p>
                  )}
                </div>

                {/* Duplicates Warning */}
                {totalDuplicates > 0 && (
                  <div>
                    <Button
                      variant="outline"
                      className="w-full bg-yellow-500/10 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/20"
                      size="sm"
                      onClick={() => setIsDuplicatesModalOpen(true)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {totalDuplicates} Duplicate{totalDuplicates !== 1 ? "s" : ""} detected
                    </Button>
                  </div>
                )}

                {/* Search */}
                <div>
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

                {/* AI Input */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">AI EXTRACT</h3>
                  <div className="border rounded-lg p-2 space-y-2">
                    {/* API Key Warning */}
                    {!isCheckingKey && !hasAIKey && (
                      <Alert variant="destructive" className="py-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          No API key configured.{" "}
                          <Link href="/settings" className="underline font-medium hover:no-underline">
                            Add API Key
                          </Link>
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-1">
                      <Textarea
                        data-testid="equipment-ai-input"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                        placeholder="Drag & drop file or copy/paste text or URL for AI extraction."
                        className="min-h-[80px] text-xs resize-none"
                        rows={4}
                        disabled={isExtracting}
                      />
                      {aiInput.length > 0 && (
                        <div className={`text-[10px] text-right ${
                          aiInput.length > MAX_TEXT_LENGTH ? "text-destructive font-medium" :
                          aiInput.length > WARNING_THRESHOLD ? "text-amber-500" :
                          "text-muted-foreground"
                        }`}>
                          {aiInput.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                          {aiInput.length > WARNING_THRESHOLD && aiInput.length <= MAX_TEXT_LENGTH && " (approaching limit)"}
                          {aiInput.length > MAX_TEXT_LENGTH && " (over limit)"}
                        </div>
                      )}
                    </div>
                    <Button
                      data-testid="equipment-extract-button"
                      size="sm"
                      className="w-full"
                      onClick={handleAIExtract}
                      disabled={!aiInput.trim() || isExtracting || !hasAIKey || aiInput.length > MAX_TEXT_LENGTH}
                    >
                      {isExtracting ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1.5" />
                      )}
                      Extract Equipment
                    </Button>
                  </div>
                </div>

                {/* Add Button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAdd}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                </div>
              </div>

              {/* Right Content - Equipment Cards */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">ALL EQUIPMENT</h3>
                  {/* Status Toggle Buttons - like biomarkers */}
                  <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-muted/50 border border-border">
                    <button
                      onClick={() => setStatusFilter("inactive")}
                      className={`p-1 rounded-full transition-colors ${
                        statusFilter === "inactive"
                          ? "bg-red-500/20 text-red-400"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Inactive only"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`p-1 rounded-full transition-colors ${
                        statusFilter === "all"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="All"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-current" />
                      </div>
                    </button>
                    <button
                      onClick={() => setStatusFilter("active")}
                      className={`p-1 rounded-full transition-colors ${
                        statusFilter === "active"
                          ? "bg-green-500/20 text-green-400"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Active only"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-[200px] rounded-lg" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-destructive">Failed to load equipment</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please check your connection and try again
                    </p>
                  </div>
                ) : filteredEquipment && filteredEquipment.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredEquipment.map((item) => (
                      <EquipmentCard
                        key={item.id}
                        equipment={item}
                        isDuplicate={duplicateIds.has(item.id)}
                        onClick={handleEdit}
                        onAIFill={hasAIKey ? handleAIFill : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Cpu className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No equipment yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your health devices to track usage and protocols
                    </p>
                    <Button onClick={handleAdd}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Equipment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Equipment Form Modal */}
      <EquipmentForm
        equipment={editingEquipment}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {/* Extraction Progress Modal */}
      <Dialog open={extractionProgressOpen} onOpenChange={(open) => !isExtracting && setExtractionProgressOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Extracting Equipment...
            </DialogTitle>
            <DialogDescription>
              AI is analyzing your equipment information
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-8">
            {/* Progress stages */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className={`flex flex-col items-center gap-2 ${progressStage === "preparing" ? "text-primary" : progress > 15 ? "text-green-500" : "text-muted-foreground"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${progressStage === "preparing" ? "border-primary bg-primary/10" : progress > 15 ? "border-green-500 bg-green-500/10" : "border-muted"}`}>
                  {progress > 15 ? <Check className="w-5 h-5" /> : <FileSearch className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium">Preparing</span>
              </div>

              <div className={`flex flex-col items-center gap-2 ${progressStage === "analyzing" ? "text-primary" : progress > 75 ? "text-green-500" : "text-muted-foreground"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${progressStage === "analyzing" ? "border-primary bg-primary/10" : progress > 75 ? "border-green-500 bg-green-500/10" : "border-muted"}`}>
                  {progress > 75 ? <Check className="w-5 h-5" /> : progressStage === "analyzing" ? <Brain className="w-5 h-5 animate-pulse" /> : <Brain className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium">Analyzing</span>
              </div>

              <div className={`flex flex-col items-center gap-2 ${progressStage === "extracting" ? "text-primary" : progress >= 100 ? "text-green-500" : "text-muted-foreground"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${progressStage === "extracting" ? "border-primary bg-primary/10" : progress >= 100 ? "border-green-500 bg-green-500/10" : "border-muted"}`}>
                  {progress >= 100 ? <Check className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium">Extracting</span>
              </div>
            </div>

            {/* Progress bars container */}
            <div className="w-full max-w-md space-y-4 mb-4">
              {/* Input progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <FileSearch className="w-3.5 h-3.5" />
                    Input Read
                  </span>
                  <span className="font-semibold text-primary">
                    {processedInputs.length} / 1
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={processedInputs.length > 0 ? 100 : (progressStage === "preparing" ? 50 : 100)}
                    className="h-3 bg-muted/50"
                  />
                  {/* Input dot overlay */}
                  <div className="absolute inset-0 flex items-center justify-around px-1">
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        processedInputs.length > 0
                          ? "bg-white shadow-sm"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    AI Processing
                  </span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {progressStage === "preparing" && "Reading input..."}
              {progressStage === "analyzing" && "AI is analyzing equipment information..."}
              {progressStage === "extracting" && "Extracting equipment details..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complete
            </p>

            {/* Input list - show processed inputs */}
            {processedInputs.length > 0 && (
              <div className="mt-4 w-full max-w-md">
                <div className="text-xs text-muted-foreground mb-2">Input:</div>
                <div className="flex flex-wrap gap-1.5">
                  {processedInputs.map((inputName, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>{inputName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Extraction Review Modal */}
      <Dialog open={extractionModalOpen} onOpenChange={setExtractionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Review Extracted Equipment
            </DialogTitle>
            <DialogDescription>
              Review and confirm the extracted equipment before saving
            </DialogDescription>
          </DialogHeader>

          {/* Duplicate warning */}
          {duplicates.size > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-orange-500 bg-orange-500/10 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  {duplicates.size} duplicate{duplicates.size > 1 ? "s" : ""} detected
                </p>
                <p className="text-xs text-muted-foreground">
                  These equipment items already exist. They have been deselected.
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 max-h-[400px] overflow-y-auto pr-2">
            <div className="space-y-2">
              {extractedEquipment.map((item, index) => {
                const isDuplicate = duplicates.has(index);
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isDuplicate
                        ? "border-orange-500/50 bg-orange-500/5 opacity-60"
                        : selectedExtracted.has(index)
                        ? "border-primary bg-primary/5"
                        : "border-muted opacity-60"
                    }`}
                    onClick={() => toggleExtractedSelection(index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isDuplicate
                              ? "border-orange-500 bg-orange-500/20"
                              : selectedExtracted.has(index)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {isDuplicate ? (
                            <AlertTriangle className="w-3 h-3 text-orange-500" />
                          ) : selectedExtracted.has(index) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Cpu className="w-4 h-4 text-primary shrink-0" />
                            <span className="font-medium">{item.name}</span>
                            {item.brand && (
                              <span className="text-xs text-muted-foreground">
                                ({item.brand} {item.model})
                              </span>
                            )}
                          </div>

                          {item.purpose && (
                            <p className="text-xs text-muted-foreground mt-1">{item.purpose}</p>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">
                                {item.category}
                              </Badge>
                            )}
                            {item.usage_frequency && (
                              <Badge variant="outline" className="text-xs">
                                {item.usage_frequency}
                              </Badge>
                            )}
                            {item.usage_timing && (
                              <Badge variant="outline" className="text-xs">
                                {item.usage_timing}
                              </Badge>
                            )}
                          </div>

                          {item.contraindications && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                              {item.contraindications}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isDuplicate ? (
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                            Duplicate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(item.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center w-full">
              <span className="text-sm text-muted-foreground">
                {selectedExtracted.size} of {extractedEquipment.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setExtractionModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveExtracted}
                  disabled={selectedExtracted.size === 0 || createBulkMutation.isPending}
                >
                  {createBulkMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save {selectedExtracted.size} Equipment
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicates Modal */}
      <EquipmentDuplicatesModal
        open={isDuplicatesModalOpen}
        onOpenChange={setIsDuplicatesModalOpen}
        duplicateGroups={existingDuplicates?.groups || []}
        onSuccess={() => {
          refetch();
          refetchDuplicates();
        }}
      />

      {/* Schedule Modal - Batch editing frequency/timing/duration */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Add Schedule
            </DialogTitle>
            <DialogDescription>
              Set when and how often you use each equipment
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Equipment Rows */}
            <div className="space-y-3">
              {missingFieldCounts.equipmentNeedingSchedule.map((item) => (
                <div key={item.id} className="border rounded-lg px-3 py-2 space-y-1.5">
                  {/* Line 1: Equipment name + Duration */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-4">Duration:</span>
                    <Input
                      value={scheduleEntries[item.id]?.duration || ""}
                      onChange={(e) => setScheduleEntries((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], duration: e.target.value },
                      }))}
                      placeholder="e.g., 20 min"
                      className="h-6 text-xs w-28"
                    />
                  </div>
                  {/* Line 2: Timing buttons */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">When:</span>
                    {['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed'].map((time) => {
                      const config = TIMING_CONFIG[time];
                      const TimingIcon = config.icon;
                      const isSelected = scheduleEntries[item.id]?.timing === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setScheduleEntries((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], timing: isSelected ? "" : time },
                            }));
                          }}
                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                            isSelected
                              ? config.selectedColor
                              : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <TimingIcon className="w-3.5 h-3.5" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Row 2: Frequency + Days */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Frequency:</span>
                    {/* Frequency buttons */}
                    {FREQUENCY_OPTIONS.map((opt) => {
                      const isSelected = scheduleEntries[item.id]?.frequency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setScheduleEntries((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], frequency: isSelected ? "" : opt.value, frequency_days: [] },
                            }));
                          }}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    {/* Day picker */}
                    <span className="text-xs text-muted-foreground px-2">or Custom:</span>
                    {DAY_OPTIONS.map((day) => {
                      const isSelected = scheduleEntries[item.id]?.frequency_days?.includes(day.value) || false;
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const currentDays = scheduleEntries[item.id]?.frequency_days || [];
                            const newDays = isSelected
                              ? currentDays.filter(d => d !== day.value)
                              : [...currentDays, day.value];
                            setScheduleEntries((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                frequency_days: newDays,
                                frequency: newDays.length > 0 ? "custom" : prev[item.id]?.frequency || "",
                              },
                            }));
                          }}
                          className={`w-6 h-6 text-xs rounded-full border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
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
                "Save All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch AI Population Modal */}
      <Dialog open={isBatchAIModalOpen} onOpenChange={setIsBatchAIModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Populate All Equipment by AI
            </DialogTitle>
            <DialogDescription>
              AI will search for product information and fill in missing fields. Review the results before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-2">
            {/* Controls */}
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={Object.values(batchAIResults).every((r) => r.selected !== false)}
                  onCheckedChange={(checked) => {
                    setBatchAIResults((prev) => {
                      const updated = { ...prev };
                      Object.keys(updated).forEach((id) => {
                        updated[id] = { ...updated[id], selected: !!checked };
                      });
                      return updated;
                    });
                  }}
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
                    Processing {Object.values(batchAIResults).filter((r) => r.status === 'saved' || r.status === 'success' || r.status === 'error').length}/{Object.keys(batchAIResults).length}
                  </span>
                </div>
              )}
              {!isBatchFetching && Object.values(batchAIResults).some((r) => r.status === 'saved' || r.status === 'success') && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">
                    {Object.values(batchAIResults).filter((r) => r.status === 'saved' || r.status === 'success').length} found
                  </span>
                </div>
              )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[40px,1fr,100px,100px,100px,120px,120px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b sticky top-0 bg-background">
              <div></div>
              <div>Equipment</div>
              <div>Status</div>
              <div>Brand</div>
              <div>Category</div>
              <div>Purpose</div>
              <div>Protocol</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y">
              {missingFieldCounts.equipmentNeedingProductInfo.map((item) => {
                const result = batchAIResults[item.id];
                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[40px,1fr,100px,100px,100px,120px,120px] gap-2 px-2 py-2 items-center text-sm ${
                      result?.selected === false ? 'opacity-50' : ''
                    }`}
                  >
                    <div>
                      <Checkbox
                        checked={result?.selected !== false}
                        onCheckedChange={() => toggleBatchSelection(item.id)}
                      />
                    </div>
                    <div className="truncate font-medium flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{item.name}</span>
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
                      ) : item.brand ? (
                        <span className="text-muted-foreground">{item.brand}</span>
                      ) : (
                        <span className="text-yellow-500/70 font-medium">?</span>
                      )}
                    </div>
                    <div className="truncate text-xs">
                      {result?.data?.category ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium capitalize">{result.data.category}</span>
                      ) : item.category ? (
                        <span className="text-muted-foreground capitalize">{item.category}</span>
                      ) : (
                        <span className="text-yellow-500/70 font-medium">?</span>
                      )}
                    </div>
                    <div className="truncate text-xs">
                      {result?.data?.purpose ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium truncate block">{result.data.purpose}</span>
                      ) : item.purpose ? (
                        <span className="text-muted-foreground truncate block">{item.purpose}</span>
                      ) : (
                        <span className="text-yellow-500/70 font-medium">?</span>
                      )}
                    </div>
                    <div className="truncate text-xs">
                      {result?.data?.usage_protocol ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium truncate block">{result.data.usage_protocol}</span>
                      ) : item.usage_protocol ? (
                        <span className="text-muted-foreground truncate block">{item.usage_protocol}</span>
                      ) : (
                        <span className="text-yellow-500/70 font-medium">?</span>
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
    </div>
  );
}
