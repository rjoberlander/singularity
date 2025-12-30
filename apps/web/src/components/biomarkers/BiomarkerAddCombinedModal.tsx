"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useExtractBiomarkers, useHasActiveAIKey } from "@/hooks/useAI";
import { useCreateBiomarkersBulk, useCreateBiomarker, useBiomarkers } from "@/hooks/useBiomarkers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Check,
  X,
  Sparkles,
  PenLine,
  Upload,
  Edit2,
  FileSearch,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  CircleDot,
  Activity,
  Zap,
  Sun,
  Gem,
  Beaker,
  Bean,
  Flame,
  Heart,
  Shield,
  LucideIcon,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { ExtractedBiomarkerData, ExtractedReading, CreateBiomarkerRequest } from "@/types";
import { BIOMARKER_REFERENCE, BiomarkerReference } from "@/data/biomarkerReference";
import { cn } from "@/lib/utils";

// Bar colors matching the main biomarker display
const STATUS_COLORS = {
  optimal: "#6B8E5A",
  suboptimal: "#D4A84B",
  critical: "#8B4513",
  unknown: "#6B7280",
};

// Text colors for values (brighter for readability)
const TEXT_COLORS = {
  optimal: "#22C55E",
  suboptimal: "#EAB308",
  critical: "#DC2626",
};

// Category icons matching main biomarker display
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  blood: Droplet,
  lipid: CircleDot,
  metabolic: Activity,
  thyroid: Zap,
  hormone: Sparkles,
  vitamin: Sun,
  mineral: Gem,
  liver: Beaker,
  kidney: Bean,
  inflammation: Flame,
  cardiac: Heart,
  immune: Shield,
};

// Category colors for card backgrounds
const CATEGORY_COLORS: Record<string, string> = {
  blood: "rgba(220, 38, 38, 0.08)",
  lipid: "rgba(249, 115, 22, 0.08)",
  metabolic: "rgba(234, 179, 8, 0.08)",
  thyroid: "rgba(139, 92, 246, 0.08)",
  hormone: "rgba(236, 72, 153, 0.08)",
  vitamin: "rgba(34, 197, 94, 0.08)",
  mineral: "rgba(20, 184, 166, 0.08)",
  liver: "rgba(168, 85, 247, 0.08)",
  kidney: "rgba(59, 130, 246, 0.08)",
  inflammation: "rgba(239, 68, 68, 0.08)",
  cardiac: "rgba(244, 63, 94, 0.08)",
  immune: "rgba(6, 182, 212, 0.08)",
  other: "rgba(107, 114, 128, 0.08)",
};

// Helper to find biomarker reference by name
function findBiomarkerReference(name: string): BiomarkerReference | null {
  const normalizedName = name.toLowerCase().trim();
  return BIOMARKER_REFERENCE.find(ref => {
    if (ref.name.toLowerCase() === normalizedName) return true;
    return ref.aliases.some(alias => alias.toLowerCase() === normalizedName);
  }) || null;
}

// Helper to determine value status based on reference ranges
function getValueStatus(
  value: number,
  ref: BiomarkerReference
): "optimal" | "suboptimal" | "critical" {
  const { optimalRange, suboptimalLowRange, suboptimalHighRange } = ref;

  if (value >= optimalRange.low && value <= optimalRange.high) {
    return "optimal";
  }

  if (suboptimalLowRange && value >= suboptimalLowRange.low && value < optimalRange.low) {
    return "suboptimal";
  }

  if (suboptimalHighRange && value > optimalRange.high && value <= suboptimalHighRange.high) {
    return "suboptimal";
  }

  return "critical";
}

// Format number for display
function formatRefNumber(val: number): string {
  if (Math.abs(val - Math.round(val)) < 0.01) {
    return Math.round(val).toString();
  }
  if (Math.abs(val) >= 10) {
    return Math.round(val).toString();
  }
  return val.toFixed(1);
}

// Get triglyceride value from extracted biomarkers for a specific date
function getTriglycerideValue(
  biomarkers: ExtractedBiomarkerData["biomarkers"],
  targetDate: string
): number | null {
  const trigBiomarker = biomarkers.find(b =>
    b.name.toLowerCase().includes("triglyceride") ||
    b.name.toLowerCase() === "tg"
  );
  if (!trigBiomarker) return null;

  const matchingReading = trigBiomarker.readings.find(r => r.date === targetDate);
  if (matchingReading) return matchingReading.value;

  if (trigBiomarker.readings.length > 0) {
    return trigBiomarker.readings[0].value;
  }
  return null;
}

// Generate calculated LDL tooltip text
function getCalculatedLDLTooltip(trigValue: number | null, ldlValue: number): string {
  const baseText = "About calculated LDL (aka the Friedewald equation): It becomes less accurate when triglycerides are very low (<100) or very high (>400).";

  if (trigValue === null) {
    return `${baseText}\n\nYour LDL of ${ldlValue} mg/dL may differ from a direct measurement.`;
  }

  let accuracyNote = "";
  if (trigValue < 100) {
    accuracyNote = `Your triglycerides are ${trigValue} mg/dL — well below 100.\n\nThe result: Calculated LDL tends to overestimate your actual LDL when triglycerides are this low. Your reported LDL of ${ldlValue} mg/dL may actually be lower if measured directly.`;
  } else if (trigValue > 400) {
    accuracyNote = `Your triglycerides are ${trigValue} mg/dL — above 400.\n\nThe result: Calculated LDL becomes unreliable when triglycerides are this high. Consider requesting a direct LDL measurement.`;
  } else {
    accuracyNote = `Your triglycerides are ${trigValue} mg/dL — within the reliable range (100-400).\n\nYour calculated LDL of ${ldlValue} mg/dL should be reasonably accurate.`;
  }

  return `${baseText}\n\n${accuracyNote}`;
}

// Horizontal reference bar component
function HorizontalReferenceBar({
  reference,
  values
}: {
  reference: BiomarkerReference | null;
  values: number[];
}) {
  if (!reference) {
    return (
      <div className="mb-2 px-1">
        <div className="h-3 rounded-full bg-gray-500/20" />
        <div className="text-[10px] text-muted-foreground text-center mt-0.5">No reference data</div>
      </div>
    );
  }

  const { optimalRange, suboptimalLowRange, suboptimalHighRange, referenceRange } = reference;

  const minVal = referenceRange.low;
  const maxValue = values.length > 0 ? Math.max(...values) : referenceRange.high;
  const maxVal = Math.max(referenceRange.high, maxValue * 1.1);
  const range = maxVal - minVal;

  const getPercent = (val: number) => Math.max(0, Math.min(100, ((val - minVal) / range) * 100));

  const optStart = suboptimalLowRange ? getPercent(suboptimalLowRange.high) : getPercent(optimalRange.low);
  const optEnd = getPercent(optimalRange.high);
  const subHighEnd = suboptimalHighRange ? getPercent(suboptimalHighRange.high) : optEnd;

  const labelValues = [
    minVal,
    optimalRange.high,
    maxVal
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="mb-2 px-1">
      <div className="relative h-3 rounded-full overflow-hidden bg-gray-700/30 flex">
        {suboptimalLowRange && (
          <div
            style={{
              width: `${getPercent(suboptimalLowRange.low)}%`,
              backgroundColor: STATUS_COLORS.critical
            }}
          />
        )}
        {suboptimalLowRange && (
          <div
            style={{
              width: `${optStart - getPercent(suboptimalLowRange.low)}%`,
              backgroundColor: STATUS_COLORS.suboptimal
            }}
          />
        )}
        <div
          style={{
            width: `${optEnd - optStart}%`,
            backgroundColor: STATUS_COLORS.optimal
          }}
        />
        {suboptimalHighRange && (
          <div
            style={{
              width: `${subHighEnd - optEnd}%`,
              backgroundColor: STATUS_COLORS.suboptimal
            }}
          />
        )}
        <div
          className="flex-1"
          style={{ backgroundColor: STATUS_COLORS.critical }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        {labelValues.map((val, i) => (
          <span key={i} className="text-[9px] text-muted-foreground">
            {formatRefNumber(val)}
          </span>
        ))}
      </div>
    </div>
  );
}

type ReadingKey = string;

interface BiomarkerAddCombinedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialInput?: { text?: string; files?: File[] };
  initialTab?: "ai" | "manual";
}

export function BiomarkerAddCombinedModal({
  open,
  onOpenChange,
  onSuccess,
  initialInput,
  initialTab = "ai",
}: BiomarkerAddCombinedModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "manual">(initialTab);
  const [step, setStep] = useState<"input" | "extracting" | "review">("input");

  // Check for AI API key
  const { hasKey: hasAIKey, isLoading: isCheckingKey } = useHasActiveAIKey();

  // AI tab state
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [textContent, setTextContent] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Extraction state
  const [extractedData, setExtractedData] = useState<ExtractedBiomarkerData | null>(null);
  const [selectedReadings, setSelectedReadings] = useState<Set<ReadingKey>>(new Set());
  const [editingBiomarkerIndex, setEditingBiomarkerIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<number, { date: string; value: number }>>({});
  const [extractionStarted, setExtractionStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"preparing" | "analyzing" | "extracting">("preparing");
  const [fallbackDate, setFallbackDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Manual tab state
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string>("");
  const [manualValue, setManualValue] = useState<string>("");
  const [manualDateTested, setManualDateTested] = useState(new Date().toISOString().split("T")[0]);

  // Mutations
  const extractBiomarkers = useExtractBiomarkers();
  const createBiomarkersBulk = useCreateBiomarkersBulk();
  const createBiomarker = useCreateBiomarker();
  const { data: existingBiomarkers } = useBiomarkers({ limit: 1000 });

  // Get the reference data for the selected manual biomarker
  const selectedRef = useMemo(() => {
    return BIOMARKER_REFERENCE.find(ref => ref.name === selectedBiomarker);
  }, [selectedBiomarker]);

  // Detect duplicates
  const duplicateReadings = useMemo(() => {
    if (!extractedData || !existingBiomarkers) return new Set<ReadingKey>();

    const dupes = new Set<ReadingKey>();

    extractedData.biomarkers.forEach((biomarker, bIndex) => {
      biomarker.readings.forEach((reading, rIndex) => {
        const key: ReadingKey = `${bIndex}-${rIndex}`;
        const dateToUse = reading.date || extractedData.lab_info.default_date || fallbackDate;

        const isDuplicate = existingBiomarkers.some((existing) => {
          const sameName = existing.name.toLowerCase() === biomarker.name.toLowerCase();
          const sameDate = existing.date_tested === dateToUse;
          return sameName && sameDate;
        });

        if (isDuplicate) {
          dupes.add(key);
        }
      });
    });

    return dupes;
  }, [extractedData, existingBiomarkers, fallbackDate]);

  // Count total readings
  const totalReadings = useMemo(() => {
    if (!extractedData) return 0;
    return extractedData.biomarkers.reduce((sum, b) => sum + b.readings.length, 0);
  }, [extractedData]);

  // Count selected readings
  const selectedCount = useMemo(() => {
    return selectedReadings.size;
  }, [selectedReadings]);

  // AI detection stats
  const detectionStats = useMemo(() => {
    if (!extractedData) return null;

    const markers = extractedData.biomarkers.length;
    const readings = totalReadings;

    const allConfidences: number[] = [];
    let lowConfidenceCount = 0;

    extractedData.biomarkers.forEach((biomarker) => {
      const markerConf = biomarker.match_confidence ?? biomarker.confidence;
      allConfidences.push(markerConf);
      if (markerConf < 0.8) lowConfidenceCount++;

      biomarker.readings.forEach((reading) => {
        allConfidences.push(reading.confidence);
        if (reading.confidence < 0.8) lowConfidenceCount++;
      });
    });

    const avgConfidence = allConfidences.length > 0
      ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
      : 0;

    return {
      markers,
      readings,
      avgConfidence: Math.round(avgConfidence * 100),
      lowConfidenceCount,
    };
  }, [extractedData, totalReadings]);

  // Auto-deselect duplicates when detected
  useEffect(() => {
    if (duplicateReadings.size > 0 && extractedData) {
      setSelectedReadings((prev) => {
        const newSelected = new Set(prev);
        duplicateReadings.forEach((key) => newSelected.delete(key));
        return newSelected;
      });
    }
  }, [duplicateReadings, extractedData]);

  // Simulated progress animation
  useEffect(() => {
    if (step === "extracting" && extractionStarted) {
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
  }, [step, extractionStarted]);

  // Complete progress when extraction finishes
  useEffect(() => {
    if (step === "review") {
      setProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [step]);

  const resetState = useCallback(() => {
    setActiveTab(initialTab);
    setStep("input");
    setImageBase64(null);
    setTextContent("");
    setAttachedFiles([]);
    setExtractedData(null);
    setSelectedReadings(new Set());
    setEditingBiomarkerIndex(null);
    setEditValues({});
    setExtractionStarted(false);
    setProgress(0);
    setProgressStage("preparing");
    setFallbackDate(new Date().toISOString().split("T")[0]);
    setSelectedBiomarker("");
    setManualValue("");
    setManualDateTested(new Date().toISOString().split("T")[0]);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, [initialTab]);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const processFile = useCallback((file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const processFileForAI = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = useCallback(async (files?: File[], text?: string | null) => {
    const hasImage = imageBase64 || (files && files.length > 0);
    const hasText = text || textContent.trim();

    if (!hasImage && !hasText) return;

    setStep("extracting");
    setExtractionStarted(true);

    try {
      let result;

      const base64Images: string[] = [];
      if (imageBase64) {
        base64Images.push(imageBase64);
      } else if (files && files.length > 0) {
        for (const file of files) {
          const base64 = await processFileForAI(file);
          if (base64) {
            base64Images.push(base64);
          }
        }
      }

      if (base64Images.length > 0 || hasText) {
        result = await extractBiomarkers.mutateAsync({
          images_base64: base64Images.length > 0 ? base64Images : undefined,
          image_base64: base64Images.length === 1 ? base64Images[0] : undefined,
          text_content: (text || textContent) || undefined,
          source_type: base64Images.length > 0 ? "image" : "text",
        });
      }

      if (result) {
        setExtractedData(result);

        const allKeys = new Set<ReadingKey>();
        result.biomarkers.forEach((b, bIndex) => {
          b.readings.forEach((_, rIndex) => {
            allKeys.add(`${bIndex}-${rIndex}`);
          });
        });
        setSelectedReadings(allKeys);
        setStep("review");

        const totalReadingsCount = result.biomarkers.reduce(
          (sum, b) => sum + b.readings.length,
          0
        );

        toast.success(`Extracted ${result.biomarkers.length} biomarkers with ${totalReadingsCount} readings`);
      }
    } catch (error: any) {
      console.error("Extraction failed:", error);
      const errorMessage = error?.response?.data?.error || "Failed to extract biomarkers";
      toast.error(errorMessage);
      setStep("input");
      setExtractionStarted(false);
    }
  }, [extractBiomarkers, imageBase64, textContent]);

  // Auto-start extraction when modal opens with initial input
  useEffect(() => {
    if (open && initialInput && !extractionStarted) {
      setAttachedFiles(initialInput.files || []);
      if (initialInput.text) {
        setTextContent(initialInput.text);
      }
      handleExtract(initialInput.files, initialInput.text);
    }
  }, [open, initialInput, extractionStarted, handleExtract]);

  const handleSaveExtracted = async () => {
    if (!extractedData) return;

    const dataToSave: any[] = [];

    extractedData.biomarkers.forEach((biomarker, bIndex) => {
      biomarker.readings.forEach((reading, rIndex) => {
        const key: ReadingKey = `${bIndex}-${rIndex}`;
        if (selectedReadings.has(key)) {
          dataToSave.push({
            name: biomarker.name,
            value: reading.value,
            unit: biomarker.unit,
            date_tested: reading.date || extractedData.lab_info.default_date || fallbackDate,
            category: biomarker.category,
            reference_range_low: biomarker.reference_range_low,
            reference_range_high: biomarker.reference_range_high,
            optimal_range_low: biomarker.optimal_range_low,
            optimal_range_high: biomarker.optimal_range_high,
            ai_extracted: true,
          });
        }
      });
    });

    if (dataToSave.length === 0) {
      toast.error("No readings selected");
      return;
    }

    try {
      await createBiomarkersBulk.mutateAsync(dataToSave);
      toast.success(`Saved ${dataToSave.length} biomarker readings`);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save biomarkers:", error);
      toast.error("Failed to save biomarkers");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBiomarker || !manualValue || !selectedRef) {
      toast.error("Please fill in all fields");
      return;
    }

    const data: CreateBiomarkerRequest = {
      name: selectedBiomarker,
      value: parseFloat(manualValue),
      unit: selectedRef.unit,
      date_tested: manualDateTested,
      category: selectedRef.category,
    };

    try {
      await createBiomarker.mutateAsync(data);
      toast.success("Biomarker saved successfully");
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create biomarker:", error);
      toast.error("Failed to save biomarker. Please try again.");
    }
  };

  const toggleReadingSelection = (key: ReadingKey) => {
    const newSelected = new Set(selectedReadings);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedReadings(newSelected);
  };

  const toggleBiomarkerSelection = (bIndex: number, readings: ExtractedReading[]) => {
    const newSelected = new Set(selectedReadings);
    const allSelected = readings.every((_, rIndex) => {
      const key = `${bIndex}-${rIndex}`;
      return newSelected.has(key) || duplicateReadings.has(key);
    });

    readings.forEach((_, rIndex) => {
      const key = `${bIndex}-${rIndex}`;
      if (!duplicateReadings.has(key)) {
        if (allSelected) {
          newSelected.delete(key);
        } else {
          newSelected.add(key);
        }
      }
    });

    setSelectedReadings(newSelected);
  };

  const startEditingBiomarker = (bIndex: number) => {
    if (!extractedData) return;
    const biomarker = extractedData.biomarkers[bIndex];
    const values: Record<number, { date: string; value: number }> = {};
    biomarker.readings.forEach((reading, rIndex) => {
      values[rIndex] = {
        date: reading.date || extractedData.lab_info.default_date || fallbackDate,
        value: reading.value,
      };
    });
    setEditValues(values);
    setEditingBiomarkerIndex(bIndex);
  };

  const saveEditing = () => {
    if (editingBiomarkerIndex === null || !extractedData) return;

    const updatedBiomarkers = [...extractedData.biomarkers];
    const updatedReadings = updatedBiomarkers[editingBiomarkerIndex].readings.map((reading, rIndex) => ({
      ...reading,
      date: editValues[rIndex]?.date || reading.date,
      value: editValues[rIndex]?.value ?? reading.value,
    }));

    updatedBiomarkers[editingBiomarkerIndex] = {
      ...updatedBiomarkers[editingBiomarkerIndex],
      readings: updatedReadings,
    };

    setExtractedData({
      ...extractedData,
      biomarkers: updatedBiomarkers,
    });

    setEditingBiomarkerIndex(null);
    setEditValues({});
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  };

  const getCategoryIcon = (category?: string) => {
    const Icon = CATEGORY_ICONS[category || "other"] || Activity;
    return <Icon className="w-4 h-4" />;
  };

  const getCategoryColor = (category?: string) => {
    return CATEGORY_COLORS[category || "other"] || CATEGORY_COLORS.other;
  };

  // Determine dialog size based on step
  const dialogClassName = step === "review"
    ? "w-[95vw] max-w-[80vw] sm:max-w-[85vw] lg:max-w-[80vw] max-h-[85vh] overflow-hidden flex flex-col"
    : "sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={dialogClassName}>
        <DialogHeader>
          <DialogTitle>
            {step === "extracting" && (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Extracting Biomarkers...
              </span>
            )}
            {step === "review" && (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Review Extracted Biomarkers
              </span>
            )}
            {step === "input" && "Add Biomarkers"}
          </DialogTitle>
          <DialogDescription>
            {step === "extracting" && "AI is analyzing your lab results"}
            {step === "review" && "Select the readings you want to save"}
            {step === "input" && "Add biomarkers manually or extract from images"}
          </DialogDescription>
        </DialogHeader>

        {/* Input Step - Show tabs */}
        {step === "input" && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ai" | "manual")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            {/* AI Tab */}
            <TabsContent value="ai" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>AI Extraction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isCheckingKey && !hasAIKey && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Warning: No API key configured.{" "}
                        <Link href="/settings" className="underline font-medium hover:no-underline">
                          Input API Key
                        </Link>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Image Upload with Drag & Drop */}
                  <div>
                    <Label className="mb-2 block">Upload Lab Results Image</Label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : imageBase64
                          ? "border-primary"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      {imageBase64 ? (
                        <div className="space-y-4">
                          <img
                            src={imageBase64}
                            alt="Uploaded lab results"
                            className="max-h-48 mx-auto rounded"
                          />
                          <Button variant="outline" size="sm" onClick={() => setImageBase64(null)}>
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground mb-2">
                            Drag and drop an image, or click to upload
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lab reports, blood test results, or biomarker lists
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or paste text</span>
                    </div>
                  </div>

                  {/* Text Input */}
                  <div>
                    <Label htmlFor="text-content" className="mb-2 block">Paste Lab Results</Label>
                    <Textarea
                      id="text-content"
                      placeholder="Paste your lab results here..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={6}
                      disabled={!!imageBase64}
                      className={imageBase64 ? "opacity-50" : ""}
                    />
                    {imageBase64 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Remove the image above to use text input instead
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => handleExtract()}
                    disabled={(!imageBase64 && !textContent.trim()) || extractBiomarkers.isPending || !hasAIKey}
                    className="w-full"
                  >
                    {extractBiomarkers.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Extract Biomarkers with AI
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manual Tab */}
            <TabsContent value="manual" className="flex-1 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Entry</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    {/* Biomarker Selection */}
                    <div className="space-y-2">
                      <Label>Biomarker</Label>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={comboboxOpen}
                            className="w-full justify-between"
                            data-testid="biomarker-select"
                          >
                            {selectedBiomarker || "Select biomarker..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search biomarkers..." />
                            <CommandList>
                              <CommandEmpty>No biomarker found.</CommandEmpty>
                              <CommandGroup>
                                {BIOMARKER_REFERENCE.map((ref) => (
                                  <CommandItem
                                    key={ref.name}
                                    value={ref.name}
                                    onSelect={(currentValue) => {
                                      setSelectedBiomarker(currentValue === selectedBiomarker ? "" : ref.name);
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedBiomarker === ref.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <span>{ref.name}</span>
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        ({ref.unit})
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {ref.category}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Value */}
                    <div className="space-y-2">
                      <Label htmlFor="modal-value">
                        Value
                        {selectedRef && (
                          <span className="ml-2 text-muted-foreground font-normal">
                            ({selectedRef.unit})
                          </span>
                        )}
                      </Label>
                      <Input
                        id="modal-value"
                        type="number"
                        step="any"
                        value={manualValue}
                        onChange={(e) => setManualValue(e.target.value)}
                        placeholder={selectedRef ? `Enter value in ${selectedRef.unit}` : "Enter value"}
                        required
                        data-testid="biomarker-value"
                      />
                      {selectedRef && (
                        <p className="text-xs text-muted-foreground">
                          Optimal range: {selectedRef.optimalRange.low} - {selectedRef.optimalRange.high} {selectedRef.unit}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                      <Label htmlFor="modal-date">Date Tested</Label>
                      <Input
                        id="modal-date"
                        type="date"
                        value={manualDateTested}
                        onChange={(e) => setManualDateTested(e.target.value)}
                        required
                        data-testid="biomarker-date"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createBiomarker.isPending || !selectedBiomarker || !manualValue}
                        data-testid="biomarker-save"
                      >
                        {createBiomarker.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Extracting Step */}
        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center py-8">
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

            <div className="w-full max-w-md mb-4">
              <Progress value={progress} className="h-2" />
            </div>

            <p className="text-sm text-muted-foreground">
              {progressStage === "preparing" && "Reading file..."}
              {progressStage === "analyzing" && "AI is analyzing your lab results..."}
              {progressStage === "extracting" && "Extracting biomarker values..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && extractedData && (
          <>
            {/* Biomarker cards grid */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                {extractedData.biomarkers.map((biomarker, bIndex) => {
                  const isEditing = editingBiomarkerIndex === bIndex;
                  const category = biomarker.category || "other";
                  const bgColor = getCategoryColor(category);
                  const biomarkerConfidence = biomarker.match_confidence ?? biomarker.confidence;
                  const reference = findBiomarkerReference(biomarker.name);
                  const allReadingsSelected = biomarker.readings.every((_, rIndex) => {
                    const key = `${bIndex}-${rIndex}`;
                    return selectedReadings.has(key) || duplicateReadings.has(key);
                  });
                  const someReadingsSelected = biomarker.readings.some((_, rIndex) => {
                    const key = `${bIndex}-${rIndex}`;
                    return selectedReadings.has(key);
                  });

                  return (
                    <Card
                      key={bIndex}
                      className={`overflow-hidden transition-all ${
                        someReadingsSelected ? "ring-1 ring-primary/50" : "opacity-60"
                      }`}
                      style={{ backgroundColor: bgColor }}
                    >
                      <CardContent className="p-2 sm:p-3">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-1">
                          <div
                            className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0"
                            onClick={() => toggleBiomarkerSelection(bIndex, biomarker.readings)}
                          >
                            {/* Checkbox */}
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                allReadingsSelected
                                  ? "bg-primary border-primary"
                                  : someReadingsSelected
                                  ? "bg-primary/50 border-primary"
                                  : "border-muted-foreground/50"
                              }`}
                            >
                              {(allReadingsSelected || someReadingsSelected) && (
                                <Check className="w-2 h-2 text-primary-foreground" />
                              )}
                            </div>
                            {/* Icon + Name */}
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-muted-foreground shrink-0">{getCategoryIcon(category)}</span>
                              <span className="font-medium text-xs sm:text-sm truncate">{biomarker.name}</span>
                            </div>
                          </div>
                          {/* Edit button */}
                          {!isEditing && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingBiomarker(bIndex);
                              }}
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>

                        {/* Unit display */}
                        <div className="text-[10px] sm:text-xs text-muted-foreground mb-1.5">
                          {biomarker.unit}
                        </div>

                        {/* Horizontal reference bar */}
                        <HorizontalReferenceBar
                          reference={reference}
                          values={biomarker.readings.map(r => r.value)}
                        />

                        {/* Readings list */}
                        <div className="space-y-0.5">
                          {biomarker.readings.map((reading, rIndex) => {
                            const key: ReadingKey = `${bIndex}-${rIndex}`;
                            const isDuplicate = duplicateReadings.has(key);
                            const isSelected = selectedReadings.has(key);
                            const readingDate = reading.date || extractedData.lab_info.default_date || fallbackDate;
                            const readingConfidence = reading.confidence;
                            const isLowConfidence = readingConfidence < 0.8;

                            if (isEditing) {
                              return (
                                <div key={rIndex} className="flex items-center gap-2 py-1">
                                  <Input
                                    type="date"
                                    value={editValues[rIndex]?.date || readingDate}
                                    onChange={(e) =>
                                      setEditValues({
                                        ...editValues,
                                        [rIndex]: { ...editValues[rIndex], date: e.target.value },
                                      })
                                    }
                                    className="h-7 text-xs flex-1"
                                  />
                                  <Input
                                    type="number"
                                    step="any"
                                    value={editValues[rIndex]?.value ?? reading.value}
                                    onChange={(e) =>
                                      setEditValues({
                                        ...editValues,
                                        [rIndex]: { ...editValues[rIndex], value: parseFloat(e.target.value) },
                                      })
                                    }
                                    className="h-7 text-xs w-20"
                                  />
                                </div>
                              );
                            }

                            // Determine value status for coloring
                            const valueStatus = reference
                              ? getValueStatus(reading.value, reference)
                              : null;
                            const valueColor = valueStatus
                              ? TEXT_COLORS[valueStatus]
                              : undefined;

                            return (
                              <div
                                key={rIndex}
                                className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded transition-colors ${
                                  isDuplicate
                                    ? "bg-muted/30 opacity-60"
                                    : isSelected
                                    ? "bg-primary/10 cursor-pointer"
                                    : "hover:bg-muted/30 opacity-60 cursor-pointer"
                                }`}
                                onClick={() => !isDuplicate && toggleReadingSelection(key)}
                                data-testid="reading-item"
                              >
                                {/* Mini checkbox */}
                                <div
                                  className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center shrink-0 ${
                                    isDuplicate
                                      ? "border-muted-foreground/30 bg-muted/50"
                                      : isSelected
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {isDuplicate ? (
                                    <Check className="w-1.5 h-1.5 text-muted-foreground" />
                                  ) : isSelected ? (
                                    <Check className="w-1.5 h-1.5 text-primary-foreground" />
                                  ) : null}
                                </div>

                                {/* Date */}
                                <span className={`text-[10px] sm:text-xs text-muted-foreground flex-1 ${isDuplicate ? "line-through" : ""}`}>
                                  {formatDate(readingDate)}
                                </span>

                                {/* Value with status color and calculated indicator */}
                                {reading.is_calculated ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className={`font-semibold text-xs sm:text-sm cursor-help ${isDuplicate ? "line-through text-muted-foreground" : ""}`}
                                          style={{ color: isDuplicate ? undefined : valueColor }}
                                          data-testid="reading-value"
                                        >
                                          {reading.value}
                                          <span className="text-yellow-500 ml-0.5">*</span>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs whitespace-pre-line text-xs">
                                        {getCalculatedLDLTooltip(
                                          getTriglycerideValue(extractedData.biomarkers, readingDate),
                                          reading.value
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span
                                    className={`font-semibold text-xs sm:text-sm ${isDuplicate ? "line-through text-muted-foreground" : ""}`}
                                    style={{ color: isDuplicate ? undefined : valueColor }}
                                    data-testid="reading-value"
                                  >
                                    {reading.value}
                                  </span>
                                )}

                                {/* Already saved tag for duplicates */}
                                {isDuplicate && (
                                  <span className="text-[8px] sm:text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                                    Already Saved
                                  </span>
                                )}

                                {/* Low confidence warning */}
                                {!isDuplicate && isLowConfidence && (
                                  <span className="text-[8px] sm:text-[10px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-600 whitespace-nowrap">
                                    ?
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Edit mode save/cancel */}
                        {isEditing && (
                          <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7"
                              onClick={() => {
                                setEditingBiomarkerIndex(null);
                                setEditValues({});
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" className="h-7" onClick={saveEditing}>
                              <Check className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        )}

                        {/* Biomarker-level low confidence warning */}
                        {!isEditing && biomarkerConfidence < 0.8 && (
                          <div className="mt-2 pt-2 border-t border-dashed">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600">
                              AI Unsure. Double Check
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t mt-3 space-y-2">
              {/* AI Detection Stats */}
              {detectionStats && (
                <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span className="font-medium">AI Detection Result:</span>{" "}
                  <span className={detectionStats.avgConfidence >= 80 ? "text-green-500" : "text-yellow-500"}>
                    {detectionStats.avgConfidence}% Confidence
                  </span>
                  {" · "}
                  <span className={detectionStats.lowConfidenceCount === 0 ? "text-green-500" : "text-yellow-500"}>
                    {detectionStats.lowConfidenceCount} metric{detectionStats.lowConfidenceCount !== 1 ? "s" : ""} &lt;80%
                    {detectionStats.lowConfidenceCount > 0 && " (require human review)"}
                  </span>
                  {" · "}
                  Detected <span className="text-blue-400">{detectionStats.markers}</span> marker{detectionStats.markers !== 1 ? "s" : ""} &amp; <span className="text-blue-400">{detectionStats.readings}</span> reading{detectionStats.readings !== 1 ? "s" : ""}
                  {duplicateReadings.size > 0 && (
                    <>
                      {" · "}
                      <span className="text-muted-foreground">
                        <span className="text-blue-400">{duplicateReadings.size}</span> already in database (will skip)
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Actions row */}
              <div className="flex justify-end items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setStep("input");
                  setExtractedData(null);
                  setSelectedReadings(new Set());
                  setExtractionStarted(false);
                }}>
                  Back
                </Button>
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveExtracted}
                  disabled={selectedCount === 0 || createBiomarkersBulk.isPending}
                >
                  {createBiomarkersBulk.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Save {selectedCount}/{totalReadings} reading{totalReadings !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
