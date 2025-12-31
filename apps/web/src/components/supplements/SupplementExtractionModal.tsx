"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Sparkles,
  FileSearch,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface FieldConfidence {
  [key: string]: number; // -1 = not found, 0-1 = confidence level
}

interface ExtractedSupplement {
  name: string;
  brand?: string;
  intake_quantity?: number;
  intake_form?: string;
  serving_size?: number;
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
  field_confidence?: FieldConfidence;
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

const INTAKE_FORM_OPTIONS = [
  { value: "pill", label: "Pill" },
  { value: "capsule", label: "Capsule" },
  { value: "softgel", label: "Softgel" },
  { value: "tablet", label: "Tablet" },
  { value: "powder", label: "Powder" },
  { value: "scoop", label: "Scoop" },
  { value: "dropper", label: "Dropper" },
  { value: "drop", label: "Drop" },
  { value: "liquid", label: "Liquid" },
  { value: "spray", label: "Spray" },
  { value: "gummy", label: "Gummy" },
  { value: "lozenge", label: "Lozenge" },
  { value: "chewable", label: "Chewable" },
  { value: "patch", label: "Patch" },
  { value: "packet", label: "Packet" },
  { value: "teaspoon", label: "Teaspoon" },
  { value: "tablespoon", label: "Tablespoon" },
];

const DOSE_UNIT_OPTIONS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mcg", label: "mcg" },
  { value: "IU", label: "IU" },
  { value: "ml", label: "ml" },
  { value: "CFU", label: "CFU" },
  { value: "%", label: "%" },
];

// Field definitions for the dense table
type FieldType = 'text' | 'number' | 'select' | 'url';
interface FieldDef {
  key: keyof ExtractedSupplement;
  label: string;
  shortLabel: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  width?: string;
}

const TABLE_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', shortLabel: 'Name', type: 'text', required: true, width: 'min-w-[120px]' },
  { key: 'brand', label: 'Brand', shortLabel: 'Brand', type: 'text', width: 'min-w-[100px]' },
  { key: 'intake_quantity', label: 'Qty', shortLabel: 'Qty', type: 'number', width: 'w-14' },
  { key: 'intake_form', label: 'Form', shortLabel: 'Form', type: 'select', options: INTAKE_FORM_OPTIONS, width: 'min-w-[80px]' },
  { key: 'serving_size', label: 'Srv Size', shortLabel: 'Srv', type: 'number', width: 'w-14' },
  { key: 'dose_per_serving', label: 'Dose/Srv', shortLabel: 'Dose', type: 'number', width: 'w-16' },
  { key: 'dose_unit', label: 'Unit', shortLabel: 'Unit', type: 'select', options: DOSE_UNIT_OPTIONS, width: 'w-14' },
  { key: 'servings_per_container', label: 'Servings', shortLabel: '#Srv', type: 'number', width: 'w-16' },
  { key: 'price', label: 'Price', shortLabel: '$', type: 'number', width: 'w-16' },
  { key: 'category', label: 'Category', shortLabel: 'Cat', type: 'select', options: CATEGORY_OPTIONS.map(c => ({ value: c, label: c })), width: 'min-w-[80px]' },
  { key: 'timing', label: 'Timing', shortLabel: 'Time', type: 'select', options: TIMING_OPTIONS, width: 'min-w-[80px]' },
  { key: 'purchase_url', label: 'URL', shortLabel: 'URL', type: 'url', width: 'min-w-[60px]' },
];

// Get confidence color classes based on confidence level
function getConfidenceColor(confidence: number | undefined): { bg: string; text: string; border: string } {
  if (confidence === undefined || confidence === -1) {
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' };
  }
  if (confidence >= 0.8) {
    return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' };
  }
  if (confidence >= 0.6) {
    return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' };
  }
  return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' };
}

// Get field confidence from supplement
function getFieldConfidence(supplement: ExtractedSupplement, field: string): number {
  if (supplement.field_confidence && field in supplement.field_confidence) {
    return supplement.field_confidence[field];
  }
  // Fall back to overall confidence if field-specific not available
  const value = supplement[field as keyof ExtractedSupplement];
  if (value === undefined || value === null || value === '') {
    return -1; // Not found
  }
  return supplement.confidence;
}

// Helper to check if supplement has complete dosage info
function hasDosageInfo(supplement: ExtractedSupplement): boolean {
  // Must have either: (intake_form) OR (dose_per_serving + dose_unit)
  return !!(supplement.intake_form || (supplement.dose_per_serving && supplement.dose_unit));
}

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
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [extractionStarted, setExtractionStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"preparing" | "analyzing" | "extracting">("preparing");
  const [totalInputs, setTotalInputs] = useState(0);
  const [processedInputs, setProcessedInputs] = useState<string[]>([]);
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
    setEditingCell(null);
    setExtractionStarted(false);
    setProgress(0);
    setProgressStage("preparing");
    setTotalInputs(0);
    setProcessedInputs([]);
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

    // Track inputs
    const inputCount = (file ? 1 : 0) + (text ? 1 : 0) + (url ? 1 : 0);
    setTotalInputs(inputCount);
    setProcessedInputs([]);

    try {
      let result;

      if (file) {
        setProcessedInputs(prev => [...prev, file.name]);
        const base64 = await processFileForAI(file);
        if (!base64) {
          throw new Error("Failed to read file");
        }
        result = await extractSupplements.mutateAsync({
          image_base64: base64,
          source_type: "image",
        });
      } else if (url) {
        setProcessedInputs(prev => [...prev, "URL"]);
        // For URL, we send it as text content with a special marker
        result = await extractSupplements.mutateAsync({
          text_content: `[URL]: ${url}`,
          source_type: "text",
        });
      } else if (text) {
        setProcessedInputs(prev => [...prev, "Text input"]);
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

    // Check for missing dosage in selected supplements
    const selectedWithData = extractedData.supplements
      .map((s, i) => ({ supplement: s, index: i }))
      .filter(({ index }) => selectedSupplements.has(index));

    const missingDosage = selectedWithData.filter(
      ({ supplement }) => !hasDosageInfo(supplement)
    );

    if (missingDosage.length > 0) {
      const names = missingDosage.map(({ supplement }) => supplement.name).join(', ');
      toast.error(`Please add dosage info for: ${names}`, {
        description: 'Click the edit button on each supplement to add dosage.',
        duration: 5000,
      });
      return;
    }

    const selectedData = selectedWithData.map(({ supplement: s }) => ({
      name: s.name,
      brand: s.brand,
      intake_quantity: s.intake_quantity || 1,
      intake_form: s.intake_form,
      serving_size: s.serving_size,
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
      product_data_source: 'ai' as const,
      product_updated_at: new Date().toISOString(),
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

  // Update a single cell value
  const updateCellValue = (rowIndex: number, field: string, value: any) => {
    if (!extractedData) return;

    const updatedSupplements = [...extractedData.supplements];
    updatedSupplements[rowIndex] = {
      ...updatedSupplements[rowIndex],
      [field]: value,
    };

    // Update field confidence to 1.0 when user edits
    if (updatedSupplements[rowIndex].field_confidence) {
      updatedSupplements[rowIndex].field_confidence = {
        ...updatedSupplements[rowIndex].field_confidence,
        [field]: 1.0,
      };
    }

    setExtractedData({
      ...extractedData,
      supplements: updatedSupplements,
    });
    setEditingCell(null);
  };

  // Render cell value (display or edit mode)
  const renderCell = (supplement: ExtractedSupplement, rowIndex: number, field: FieldDef) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field.key;
    const value = supplement[field.key as keyof ExtractedSupplement];
    const confidence = getFieldConfidence(supplement, field.key);
    const colors = getConfidenceColor(confidence);
    const isDuplicate = duplicates.has(rowIndex);

    // Display value
    const displayValue = (): React.ReactNode => {
      if (value === undefined || value === null || value === '') {
        return <span className="text-muted-foreground/50">-</span>;
      }
      // Handle objects/arrays - convert to string
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.join(', ') || '-';
        }
        return JSON.stringify(value);
      }
      if (field.key === 'purchase_url') {
        const urlInfo = parseProductUrl(value as string);
        if (urlInfo) {
          return (
            <a
              href={value as string}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300"
            >
              {urlInfo.isAmazon ? (
                <AmazonIcon className="w-3 h-3" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              <span className="truncate max-w-[60px]">{urlInfo.display}</span>
            </a>
          );
        }
      }
      if (field.key === 'price') {
        return `$${value}`;
      }
      if (field.type === 'select' && field.options) {
        const opt = field.options.find(o => o.value === value);
        return opt?.label || String(value);
      }
      return String(value);
    };

    // Edit mode
    if (isEditing && !isDuplicate) {
      if (field.type === 'select' && field.options) {
        return (
          <Select
            defaultValue={value as string || ''}
            onValueChange={(v) => updateCellValue(rowIndex, field.key, v)}
            open={true}
            onOpenChange={(open) => !open && setEditingCell(null)}
          >
            <SelectTrigger className="h-6 text-[10px] p-1 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          autoFocus
          defaultValue={value as string | number || ''}
          type={field.type === 'number' ? 'number' : 'text'}
          className="h-6 text-[10px] p-1 border-0 bg-transparent"
          onBlur={(e) => {
            const newValue = field.type === 'number' ? Number(e.target.value) || undefined : e.target.value;
            updateCellValue(rowIndex, field.key, newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              const newValue = field.type === 'number' ? Number(target.value) || undefined : target.value;
              updateCellValue(rowIndex, field.key, newValue);
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
        />
      );
    }

    // Display mode - clickable to edit
    return (
      <div
        className={`px-1.5 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-primary/50 ${colors.bg} ${
          isDuplicate ? 'opacity-50' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDuplicate) {
            setEditingCell({ row: rowIndex, field: field.key });
          }
        }}
      >
        <span className={`text-[10px] sm:text-xs ${colors.text}`}>
          {displayValue()}
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[80vw] sm:max-w-[85vw] lg:max-w-[80vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {step === "extracting" && "Extracting Supplements..."}
            {step === "review" && "Review Extracted Supplements"}
          </DialogTitle>
          <DialogDescription>
            {step === "extracting" && "AI is analyzing your supplement information"}
            {step === "review" && "Select the supplements you want to save"}
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
                    {processedInputs.length} / {totalInputs || 1}
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={totalInputs > 0 ? (processedInputs.length / totalInputs) * 100 : (progressStage === "preparing" ? 50 : 100)}
                    className="h-3 bg-muted/50"
                  />
                  {/* Input dots overlay */}
                  {totalInputs > 0 && (
                    <div className="absolute inset-0 flex items-center justify-around px-1">
                      {Array.from({ length: totalInputs }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx < processedInputs.length
                              ? "bg-white shadow-sm"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}
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
              {progressStage === "analyzing" && "AI is analyzing supplement information..."}
              {progressStage === "extracting" && "Extracting supplement details..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complete
            </p>

            {/* Input list - show processed inputs */}
            {processedInputs.length > 0 && (
              <div className="mt-4 w-full max-w-md">
                <div className="text-xs text-muted-foreground mb-2">Input:</div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {processedInputs.map((inputName, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{inputName}</span>
                    </div>
                  ))}
                  {processedInputs.length < totalInputs && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Step - Dense Table Layout */}
        {step === "review" && extractedData && (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] mb-2">
              <span className="text-muted-foreground">Confidence:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                <span className="text-green-400">&gt;80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/50" />
                <span className="text-orange-400">60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
                <span className="text-red-400">&lt;60%</span>
              </div>
              <span className="text-muted-foreground ml-2">Click cell to edit</span>
            </div>

            {/* Dense Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-[10px] sm:text-xs border-collapse">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {/* Checkbox column */}
                    <th className="p-1.5 border-b border-r text-left font-medium w-8">
                      <div className="flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    </th>
                    {/* Field columns */}
                    {TABLE_FIELDS.map((field) => (
                      <th
                        key={field.key}
                        className={`p-1.5 border-b border-r text-left font-medium ${field.width || ''}`}
                      >
                        <span className="hidden sm:inline">{field.label}</span>
                        <span className="sm:hidden">{field.shortLabel}</span>
                      </th>
                    ))}
                    {/* Overall confidence column */}
                    <th className="p-1.5 border-b text-left font-medium w-12">
                      <span className="hidden sm:inline">Conf</span>
                      <span className="sm:hidden">%</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.supplements.map((supplement, rowIndex) => {
                    const isDuplicate = duplicates.has(rowIndex);
                    const isSelected = selectedSupplements.has(rowIndex);

                    return (
                      <tr
                        key={rowIndex}
                        className={`border-b last:border-b-0 transition-colors ${
                          isDuplicate
                            ? 'bg-orange-500/5 opacity-60'
                            : isSelected
                            ? 'bg-primary/5'
                            : 'bg-muted/20 opacity-60'
                        } hover:bg-muted/30`}
                      >
                        {/* Checkbox cell */}
                        <td className="p-1 border-r">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer mx-auto ${
                              isDuplicate
                                ? 'border-orange-500 bg-orange-500/20 cursor-not-allowed'
                                : isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/50 hover:border-primary'
                            }`}
                            onClick={() => !isDuplicate && toggleSupplementSelection(rowIndex)}
                          >
                            {isDuplicate ? (
                              <AlertTriangle className="w-2.5 h-2.5 text-orange-500" />
                            ) : isSelected ? (
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            ) : null}
                          </div>
                        </td>
                        {/* Field cells */}
                        {TABLE_FIELDS.map((field) => (
                          <td key={field.key} className={`p-0.5 border-r ${field.width || ''}`}>
                            {renderCell(supplement, rowIndex, field)}
                          </td>
                        ))}
                        {/* Overall confidence cell */}
                        <td className="p-1 text-center">
                          {isDuplicate ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-orange-500 text-orange-500">
                              Dupe
                            </Badge>
                          ) : (
                            <span className={`font-medium ${
                              supplement.confidence >= 0.8 ? 'text-green-400' :
                              supplement.confidence >= 0.6 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              {Math.round(supplement.confidence * 100)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-xs sm:text-sm text-muted-foreground">
                {selectedSupplements.size} of {extractedData.supplements.length} selected
                {duplicates.size > 0 && (
                  <span className="text-orange-500 ml-2">
                    ({duplicates.size} duplicate{duplicates.size > 1 ? 's' : ''})
                  </span>
                )}
                {(() => {
                  const missingCount = extractedData.supplements
                    .filter((_, i) => selectedSupplements.has(i))
                    .filter(s => !hasDosageInfo(s)).length;
                  if (missingCount > 0) {
                    return (
                      <span className="text-orange-500 ml-2">
                        ({missingCount} missing dosage)
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={selectedSupplements.size === 0 || createSupplementsBulk.isPending}
                >
                  {createSupplementsBulk.isPending && (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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
