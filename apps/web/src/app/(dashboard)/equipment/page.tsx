"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useEquipment, useCreateEquipmentBulk, useEquipmentDuplicates } from "@/hooks/useEquipment";
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
} from "lucide-react";
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

  const { data: equipment, isLoading, error, refetch } = useEquipment({
    category: selectedCategory === "All" ? undefined : selectedCategory.toLowerCase(),
    is_active: statusFilter === "all" ? undefined : statusFilter === "active",
  });

  const createBulkMutation = useCreateEquipmentBulk();
  const extractMutation = useExtractEquipment();

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
  const VALID_FREQUENCIES = ['daily', 'every_other_day', 'as_needed', 'custom'];
  const VALID_TIMINGS = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed'];
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

  // Handler to open first equipment needing schedule
  const handleOpenScheduleModal = () => {
    if (missingFieldCounts.equipmentNeedingSchedule.length > 0) {
      setEditingEquipment(missingFieldCounts.equipmentNeedingSchedule[0]);
      setFormOpen(true);
    }
  };

  // Handler to open first equipment needing product info and trigger AI
  const handlePopulateByAI = () => {
    if (missingFieldCounts.equipmentNeedingProductInfo.length > 0) {
      const item = missingFieldCounts.equipmentNeedingProductInfo[0];
      setEditingEquipment(item);
      setFormOpen(true);
      setTimeout(() => {
        const aiButton = document.querySelector('[data-ai-fill-button]') as HTMLButtonElement;
        if (aiButton) aiButton.click();
      }, 100);
    }
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

                {/* Status Filter */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">STATUS</h3>
                  <div className="flex flex-col gap-1">
                    {STATUS_FILTERS.map((filter) => (
                      <Button
                        key={filter.value}
                        variant={statusFilter === filter.value ? "secondary" : "ghost"}
                        size="sm"
                        className="justify-start h-7"
                        onClick={() => setStatusFilter(filter.value)}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
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
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">ALL EQUIPMENT</h3>

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
    </div>
  );
}
