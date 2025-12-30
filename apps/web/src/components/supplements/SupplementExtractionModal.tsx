"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useExtractSupplements } from "@/hooks/useAI";
import { useCreateSupplementsBulk, useSupplements } from "@/hooks/useSupplements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Check,
  X,
  Sparkles,
  Edit2,
  FileSearch,
  Brain,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Pill,
  ExternalLink,
  Target,
  Info,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface ExtractedSupplement {
  name: string;
  brand?: string;
  dose?: string;
  dose_per_serving?: number;
  dose_unit?: string;
  servings_per_container?: number;
  price?: number;
  price_per_serving?: number;
  purchase_url?: string;
  category?: string;
  timing?: string;
  timing_reason?: string;
  frequency?: string;
  reason?: string;
  mechanism?: string;
  goal_categories?: string[];
  confidence: number;
}

interface ExtractedData {
  supplements: ExtractedSupplement[];
  source_info: {
    store_name?: string;
    purchase_date?: string;
    total_items?: number;
  };
  extraction_notes?: string;
}

interface SupplementExtractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialInput?: { text?: string; file?: File; url?: string };
}

const TIMING_OPTIONS = [
  { value: "wake_up", label: "Wake Up" },
  { value: "am", label: "AM (Morning)" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM (Afternoon)" },
  { value: "dinner", label: "Dinner" },
  { value: "before_bed", label: "Before Bed" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "Twice Daily" },
  { value: "three_times_daily", label: "3x Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "As Needed" },
];

const CATEGORY_OPTIONS = [
  "vitamin",
  "mineral",
  "amino_acid",
  "herb",
  "probiotic",
  "omega",
  "antioxidant",
  "hormone",
  "enzyme",
  "other",
];

// Helper to parse and display URLs smartly
function parseProductUrl(url: string | undefined): { display: string; isAmazon: boolean; asin?: string } | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);

    // Amazon URL detection
    if (urlObj.hostname.includes('amazon.')) {
      // Extract ASIN from various Amazon URL patterns
      const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
      const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      const asin = dpMatch?.[1] || gpMatch?.[1];

      if (asin) {
        return { display: asin, isAmazon: true, asin };
      }
      return { display: 'Amazon', isAmazon: true };
    }

    // Other URLs - show simplified hostname
    const hostname = urlObj.hostname.replace('www.', '');
    return { display: hostname, isAmazon: false };
  } catch {
    return { display: url.substring(0, 30) + '...', isAmazon: false };
  }
}

// Amazon icon SVG component
function AmazonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705c-.209.189-.512.201-.746.074-1.052-.872-1.238-1.276-1.814-2.106-1.734 1.767-2.962 2.297-5.209 2.297-2.66 0-4.731-1.641-4.731-4.925 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.095v-.41c0-.753.06-1.642-.383-2.294-.385-.579-1.124-.82-1.775-.82-1.205 0-2.277.618-2.54 1.897-.054.285-.261.566-.549.58l-3.061-.333c-.259-.056-.548-.266-.472-.66C6.218 1.044 9.308 0 12.044 0c1.357 0 3.127.36 4.197 1.384 1.357 1.264 1.228 2.953 1.228 4.79v4.337c0 1.304.541 1.876 1.049 2.579.177.252.217.553-.003.74-.548.457-1.523 1.304-2.059 1.779l-.012.011-.001-.001-.001.001z"/>
      <path d="M21.63 17.727c-2.572 1.897-6.302 2.907-9.516 2.907-4.504 0-8.558-1.665-11.622-4.435-.241-.217-.026-.513.263-.345 3.309 1.926 7.404 3.085 11.632 3.085 2.852 0 5.987-.592 8.87-1.817.436-.185.8.285.373.605z"/>
      <path d="M22.698 16.452c-.328-.42-2.172-.199-2.999-.1-.252.03-.291-.189-.064-.347 1.468-1.032 3.876-.735 4.158-.389.282.349-.074 2.761-1.451 3.913-.212.177-.414.083-.32-.151.31-.774 1.005-2.505.676-2.926z"/>
    </svg>
  );
}

export function SupplementExtractionModal({
  open,
  onOpenChange,
  onSuccess,
  initialInput,
}: SupplementExtractionModalProps) {
  const [step, setStep] = useState<"extracting" | "review">("extracting");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [selectedSupplements, setSelectedSupplements] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<ExtractedSupplement>>({});
  const [extractionStarted, setExtractionStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"preparing" | "analyzing" | "extracting">("preparing");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const extractSupplements = useExtractSupplements();
  const createSupplementsBulk = useCreateSupplementsBulk();
  const { data: existingSupplements } = useSupplements();

  // Detect duplicates - same name + same brand
  const duplicates = useMemo(() => {
    if (!extractedData || !existingSupplements) return new Set<number>();

    const dupes = new Set<number>();

    extractedData.supplements.forEach((extracted, index) => {
      const isDuplicate = existingSupplements.some((existing) => {
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
  }, [extractedData, existingSupplements]);

  // Auto-deselect duplicates when detected
  useEffect(() => {
    if (duplicates.size > 0 && extractedData) {
      setSelectedSupplements((prev) => {
        const newSelected = new Set(prev);
        duplicates.forEach((index) => newSelected.delete(index));
        return newSelected;
      });
    }
  }, [duplicates, extractedData]);

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
    setStep("extracting");
    setAttachedFile(null);
    setInputText(null);
    setInputUrl(null);
    setExtractedData(null);
    setSelectedSupplements(new Set());
    setEditingIndex(null);
    setEditValues({});
    setExtractionStarted(false);
    setProgress(0);
    setProgressStage("preparing");
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

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

  const handleExtract = useCallback(async (file?: File | null, text?: string | null, url?: string | null) => {
    if (!file && !text && !url) return;

    setStep("extracting");
    setExtractionStarted(true);

    try {
      let result;

      if (file) {
        const base64 = await processFileForAI(file);
        if (!base64) {
          throw new Error("Failed to read file");
        }
        result = await extractSupplements.mutateAsync({
          image_base64: base64,
          source_type: "image",
        });
      } else if (url) {
        // For URL, we send it as text content with a special marker
        result = await extractSupplements.mutateAsync({
          text_content: `[URL]: ${url}`,
          source_type: "text",
        });
      } else if (text) {
        result = await extractSupplements.mutateAsync({
          text_content: text,
          source_type: "text",
        });
      }

      if (result) {
        // Add URL to all supplements if provided
        if (url) {
          result.supplements = result.supplements.map((s: any) => ({
            ...s,
            purchase_url: url,
          }));
        }
        setExtractedData(result);
        setSelectedSupplements(new Set(result.supplements.map((_: any, i: number) => i)));
        setStep("review");
        toast.success(`Extracted ${result.supplements.length} supplements`);
      }
    } catch (error: any) {
      console.error("Extraction failed:", error);
      const errorMessage = error?.response?.data?.error || "Failed to extract supplements";
      toast.error(errorMessage);
      handleClose();
    }
  }, [extractSupplements, handleClose]);

  // Auto-start extraction when modal opens with initial input
  useEffect(() => {
    if (open && initialInput && !extractionStarted) {
      setAttachedFile(initialInput.file || null);
      setInputText(initialInput.text || null);
      setInputUrl(initialInput.url || null);
      handleExtract(initialInput.file, initialInput.text, initialInput.url);
    }
  }, [open, initialInput, extractionStarted, handleExtract]);

  const handleSave = async () => {
    if (!extractedData) return;

    const selectedData = extractedData.supplements
      .filter((_: any, i: number) => selectedSupplements.has(i))
      .map((s: ExtractedSupplement) => ({
        name: s.name,
        brand: s.brand,
        dose: s.dose,
        dose_per_serving: s.dose_per_serving,
        dose_unit: s.dose_unit,
        servings_per_container: s.servings_per_container,
        price: s.price,
        price_per_serving: s.price_per_serving,
        purchase_url: s.purchase_url,
        category: s.category,
        timing: s.timing as any, // Cast to any since API returns string but type expects union
        timing_reason: s.timing_reason,
        frequency: s.frequency || "daily",
        reason: s.reason,
        mechanism: s.mechanism,
        // Note: goal_categories would need to be linked after creation via supplement_goals table
      }));

    try {
      await createSupplementsBulk.mutateAsync(selectedData as any);
      toast.success(`Saved ${selectedData.length} supplements`);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save supplements:", error);
      toast.error("Failed to save supplements");
    }
  };

  const toggleSupplementSelection = (index: number) => {
    const newSelected = new Set(selectedSupplements);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSupplements(newSelected);
  };

  const startEditing = (index: number, supplement: ExtractedSupplement) => {
    setEditingIndex(index);
    setEditValues({ ...supplement });
  };

  const saveEditing = () => {
    if (editingIndex === null || !extractedData) return;

    const updatedSupplements = [...extractedData.supplements];
    updatedSupplements[editingIndex] = {
      ...updatedSupplements[editingIndex],
      ...editValues,
    };

    setExtractedData({
      ...extractedData,
      supplements: updatedSupplements,
    });

    setEditingIndex(null);
    setEditValues({});
  };

  const getConfidenceBadge = (confidence: number) => {
    const displayConfidence = Math.round(confidence * 100);
    let variant: "default" | "secondary" | "outline" = "default";
    if (displayConfidence >= 90) variant = "default";
    else if (displayConfidence >= 70) variant = "secondary";
    else variant = "outline";

    return (
      <Badge variant={variant} className="text-xs">
        {displayConfidence}%
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {step === "extracting" && "Extracting Supplements..."}
            {step === "review" && "Review Extracted Supplements"}
          </DialogTitle>
          <DialogDescription>
            {step === "extracting" && "AI is analyzing your supplement information"}
            {step === "review" && "Review and confirm the extracted supplements before saving"}
          </DialogDescription>
        </DialogHeader>

        {/* Extracting Step */}
        {step === "extracting" && (
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

            {/* Progress bar */}
            <div className="w-full max-w-md mb-4">
              <Progress value={progress} className="h-2" />
            </div>

            <p className="text-sm text-muted-foreground">
              {progressStage === "preparing" && "Reading input..."}
              {progressStage === "analyzing" && "AI is analyzing supplement information..."}
              {progressStage === "extracting" && "Extracting supplement details..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && extractedData && (
          <>
            {/* Source info */}
            <div className="space-y-3 mb-4">
              {extractedData.source_info.store_name && (
                <div className="text-sm text-muted-foreground">
                  Source: {extractedData.source_info.store_name}
                  {extractedData.source_info.total_items &&
                    ` (${extractedData.source_info.total_items} items)`}
                </div>
              )}

              {/* Duplicate warning */}
              {duplicates.size > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-orange-500 bg-orange-500/10">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {duplicates.size} duplicate{duplicates.size > 1 ? "s" : ""} detected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      These supplements already exist. They have been deselected.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 max-h-[350px] overflow-y-auto pr-4">
              <div className="space-y-2">
                {extractedData.supplements.map((supplement, index) => {
                  const isDuplicate = duplicates.has(index);
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        isDuplicate
                          ? "border-orange-500/50 bg-orange-500/5 opacity-60"
                          : selectedSupplements.has(index)
                          ? "border-primary bg-primary/5"
                          : "border-muted opacity-60"
                      }`}
                      onClick={() =>
                        editingIndex !== index && toggleSupplementSelection(index)
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                              isDuplicate
                                ? "border-orange-500 bg-orange-500/20"
                                : selectedSupplements.has(index)
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isDuplicate ? (
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                            ) : selectedSupplements.has(index) && (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {editingIndex === index ? (
                              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editValues.name || ""}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, name: e.target.value })
                                  }
                                  placeholder="Name"
                                  className="h-8"
                                />
                                <Input
                                  value={editValues.brand || ""}
                                  onChange={(e) =>
                                    setEditValues({ ...editValues, brand: e.target.value })
                                  }
                                  placeholder="Brand"
                                  className="h-8"
                                />
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editValues.dose || ""}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, dose: e.target.value })
                                    }
                                    placeholder="Dose (e.g., 1000mg)"
                                    className="h-8 flex-1"
                                  />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editValues.price || ""}
                                    onChange={(e) =>
                                      setEditValues({
                                        ...editValues,
                                        price: parseFloat(e.target.value),
                                      })
                                    }
                                    placeholder="Price"
                                    className="h-8 w-24"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={editValues.timing || ""}
                                    onValueChange={(v) =>
                                      setEditValues({ ...editValues, timing: v })
                                    }
                                  >
                                    <SelectTrigger className="h-8 flex-1">
                                      <SelectValue placeholder="Timing" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIMING_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={editValues.frequency || ""}
                                    onValueChange={(v) =>
                                      setEditValues({ ...editValues, frequency: v })
                                    }
                                  >
                                    <SelectTrigger className="h-8 flex-1">
                                      <SelectValue placeholder="Frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FREQUENCY_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEditing}>
                                    <Check className="w-3 h-3 mr-1" /> Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingIndex(null);
                                      setEditValues({});
                                    }}
                                  >
                                    <X className="w-3 h-3 mr-1" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Header: Name, Brand, URL */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Pill className="w-4 h-4 text-primary shrink-0" />
                                  <span className="font-medium">{supplement.name}</span>
                                  {supplement.brand && (
                                    <span className="text-xs text-muted-foreground">
                                      ({supplement.brand})
                                    </span>
                                  )}
                                  {/* Smart URL display */}
                                  {(() => {
                                    const urlInfo = parseProductUrl(supplement.purchase_url);
                                    if (!urlInfo) return null;
                                    return (
                                      <a
                                        href={supplement.purchase_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                                      >
                                        {urlInfo.isAmazon ? (
                                          <>
                                            <AmazonIcon className="w-3 h-3" />
                                            <span>{urlInfo.display}</span>
                                          </>
                                        ) : (
                                          <>
                                            <ExternalLink className="w-3 h-3" />
                                            <span>{urlInfo.display}</span>
                                          </>
                                        )}
                                      </a>
                                    );
                                  })()}
                                </div>

                                {/* Row 2: Dose, Timing, Price */}
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  {supplement.dose && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                      {supplement.dose}
                                    </span>
                                  )}
                                  {supplement.timing && (
                                    <span className="flex items-center gap-1 text-xs">
                                      <Clock className="w-3 h-3" />
                                      {TIMING_OPTIONS.find(t => t.value === supplement.timing)?.label || supplement.timing}
                                    </span>
                                  )}
                                  {(supplement.price_per_serving || supplement.price) && (
                                    <span className="flex items-center gap-1 text-xs">
                                      <DollarSign className="w-3 h-3" />
                                      {supplement.price_per_serving
                                        ? `$${supplement.price_per_serving.toFixed(2)}/serving`
                                        : `$${supplement.price?.toFixed(2)}`}
                                    </span>
                                  )}
                                </div>

                                {/* Row 3: Reason (Why) */}
                                {supplement.reason && (
                                  <div className="mt-1.5 text-xs text-muted-foreground">
                                    <span className="flex items-start gap-1.5">
                                      <Info className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                                      <span className="line-clamp-2">{supplement.reason}</span>
                                    </span>
                                  </div>
                                )}

                                {/* Row 4: Mechanism (How) */}
                                {supplement.mechanism && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-start gap-1.5">
                                      <Zap className="w-3 h-3 mt-0.5 shrink-0 text-yellow-500" />
                                      <span className="line-clamp-2">{supplement.mechanism}</span>
                                    </span>
                                  </div>
                                )}

                                {/* Row 5: Goals */}
                                {supplement.goal_categories && supplement.goal_categories.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    <Target className="w-3 h-3 text-green-500" />
                                    {supplement.goal_categories.map((goal, i) => (
                                      <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {goal}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Timing reason */}
                                {supplement.timing_reason && (
                                  <div className="mt-1 text-[10px] text-muted-foreground italic">
                                    {supplement.timing_reason}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isDuplicate ? (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                              Duplicate
                            </Badge>
                          ) : (
                            getConfidenceBadge(supplement.confidence)
                          )}
                          {editingIndex !== index && !isDuplicate && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(index, supplement);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                {selectedSupplements.size} of {extractedData.supplements.length} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={selectedSupplements.size === 0 || createSupplementsBulk.isPending}
                >
                  {createSupplementsBulk.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save {selectedSupplements.size} Supplements
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
