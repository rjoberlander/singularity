"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useHasActiveAIKey, useExtractSupplements } from "@/hooks/useAI";
import { useCreateSupplement } from "@/hooks/useSupplements";
import { CreateSupplementRequest } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Sparkles,
  PenLine,
  Paperclip,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Upload,
  AlertTriangle,
  FileSearch,
  Brain,
  CheckCircle2,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "vitamin_mineral",
  "amino_protein",
  "herb_botanical",
  "probiotic",
  "other",
];

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

const INTAKE_FORM_OPTIONS = [
  { value: "capsule", label: "Capsule" },
  { value: "powder", label: "Powder" },
  { value: "liquid", label: "Liquid" },
  { value: "spray", label: "Spray" },
  { value: "gummy", label: "Gummy" },
  { value: "patch", label: "Patch" },
];

const DOSE_UNIT_OPTIONS = [
  { value: "mg", label: "mg (milligrams)" },
  { value: "g", label: "g (grams)" },
  { value: "mcg", label: "mcg (micrograms)" },
  { value: "IU", label: "IU (International Units)" },
  { value: "ml", label: "ml (milliliters)" },
  { value: "CFU", label: "CFU (Colony Forming Units)" },
  { value: "%", label: "% (percent)" },
];

// ~50K chars is safe for Claude's context
const MAX_TEXT_LENGTH = 50000;
const WARNING_THRESHOLD = 40000;

interface SupplementAddCombinedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onOpenExtractionModal?: (input: { text?: string; file?: File; url?: string }) => void;
}

export function SupplementAddCombinedModal({
  open,
  onOpenChange,
  onSuccess,
  onOpenExtractionModal,
}: SupplementAddCombinedModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");

  // AI tab state
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"preparing" | "analyzing" | "extracting">("preparing");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Manual form state
  const [formData, setFormData] = useState<CreateSupplementRequest>({
    name: "",
    brand: "",
    intake_quantity: 1,
    intake_form: "",
    dose_per_serving: undefined,
    dose_unit: "",
    servings_per_container: undefined,
    price: undefined,
    purchase_url: "",
    category: "",
    timing: "",
    frequency: "",
    notes: "",
  });

  // Hooks
  const { hasKey: hasAIKey, isLoading: isCheckingKey } = useHasActiveAIKey();
  const createSupplement = useCreateSupplement();
  const extractSupplements = useExtractSupplements();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setText("");
      setAttachedFile(null);
      setIsExtracting(false);
      setProgress(0);
      setProgressStage("preparing");
      setFormData({
        name: "",
        brand: "",
        intake_quantity: 1,
        intake_form: "",
        dose_per_serving: undefined,
        dose_unit: "",
        servings_per_container: undefined,
        price: undefined,
        purchase_url: "",
        category: "",
        timing: "",
        frequency: "",
        notes: "",
      });
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [open]);

  // Progress animation during extraction
  useEffect(() => {
    if (isExtracting) {
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
  }, [isExtracting]);

  // AI extraction handler
  const handleAISubmit = useCallback(async () => {
    if (!text.trim() && !attachedFile) return;

    // If we have the extraction modal handler, use it for full extraction flow
    if (onOpenExtractionModal) {
      onOpenChange(false);
      onOpenExtractionModal({
        text: text.trim() || undefined,
        file: attachedFile || undefined,
      });
      return;
    }

    // Otherwise do inline extraction (fallback)
    setIsExtracting(true);

    try {
      let result;

      if (attachedFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(attachedFile);
        });
        result = await extractSupplements.mutateAsync({
          image_base64: base64,
          source_type: "image",
        });
      } else if (text.trim()) {
        result = await extractSupplements.mutateAsync({
          text_content: text.trim(),
          source_type: "text",
        });
      }

      if (result && result.supplements?.length > 0) {
        toast.success(`Extracted ${result.supplements.length} supplements`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("No supplements found in the input");
      }
    } catch (error: any) {
      console.error("Extraction failed:", error);
      toast.error(error?.response?.data?.error || "Failed to extract supplements");
    } finally {
      setIsExtracting(false);
      setProgress(0);
    }
  }, [text, attachedFile, onOpenExtractionModal, onOpenChange, extractSupplements, onSuccess]);

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setAttachedFile(file);
          return;
        }
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        setAttachedFile(file);
      }
    }
  };

  // Manual form submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Clean the form data - convert empty strings to undefined
      // to avoid database CHECK constraint violations
      const cleanedData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value === "" || value === null) {
          // Skip empty strings and nulls - don't send them
          continue;
        }
        cleanedData[key] = value;
      }

      await createSupplement.mutateAsync(cleanedData as any);
      toast.success("Supplement added successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save supplement:", error);
      toast.error("Failed to save supplement. Please try again.");
    }
  };

  const getFileIcon = () => {
    if (!attachedFile) return null;
    if (attachedFile.type.startsWith("image/")) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Supplement</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ai" | "manual")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Extract
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* AI Tab */}
          <TabsContent value="ai" className="flex-1 overflow-auto mt-4">
            {isExtracting ? (
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

                <div className="w-full max-w-md mb-4">
                  <Progress value={progress} className="h-2" />
                </div>

                <p className="text-sm text-muted-foreground">
                  {progressStage === "preparing" && "Reading input..."}
                  {progressStage === "analyzing" && "AI is analyzing supplement information..."}
                  {progressStage === "extracting" && "Extracting supplement details..."}
                </p>
              </div>
            ) : (
              <div
                ref={dropZoneRef}
                className={`border rounded-lg bg-card p-4 transition-colors ${
                  isDragging ? "border-primary border-2 bg-primary/5" : ""
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {isDragging ? (
                  <div className="flex flex-col items-center justify-center py-12 text-primary">
                    <Upload className="w-12 h-12 mb-3" />
                    <p className="text-base font-medium">Drop file here</p>
                    <p className="text-sm text-muted-foreground mt-1">Image or PDF</p>
                  </div>
                ) : (
                  <>
                    {/* API Key Warning */}
                    {!isCheckingKey && !hasAIKey && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          No API key configured.{" "}
                          <Link href="/settings" className="underline font-medium hover:no-underline">
                            Add API Key
                          </Link>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Attached file preview */}
                    {attachedFile && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-muted rounded">
                        {getFileIcon()}
                        <span className="truncate flex-1 text-sm">{attachedFile.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setAttachedFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                        onPaste={handlePaste}
                        placeholder="Drag & drop file or copy/paste text or URL for AI extraction."
                        className="min-h-[120px] resize-none"
                        rows={5}
                      />
                      {text.length > 0 && (
                        <div className={`text-xs text-right ${
                          text.length > MAX_TEXT_LENGTH ? "text-destructive font-medium" :
                          text.length > WARNING_THRESHOLD ? "text-amber-500" :
                          "text-muted-foreground"
                        }`}>
                          {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach Image/PDF
                      </Button>

                      <Button
                        className="w-full"
                        onClick={handleAISubmit}
                        disabled={(!text.trim() && !attachedFile) || !hasAIKey || text.length > MAX_TEXT_LENGTH}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Extract Supplements
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Manual Tab */}
          <TabsContent value="manual" className="flex-1 overflow-auto mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Vitamin D3"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Thorne"
                  />
                </div>
              </div>

              {/* Intake Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intake_quantity">Intake</Label>
                  <Select
                    value={(formData.intake_quantity || 1).toString()}
                    onValueChange={(value) => setFormData({ ...formData, intake_quantity: parseInt(value, 10) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Qty" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intake_form">Form</Label>
                  <Select
                    value={formData.intake_form || ""}
                    onValueChange={(value) => setFormData({ ...formData, intake_form: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTAKE_FORM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dose_per_serving">Per Serving</Label>
                  <Input
                    id="dose_per_serving"
                    type="number"
                    step="any"
                    value={formData.dose_per_serving ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dose_per_serving: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dose_unit">Unit</Label>
                  <Select
                    value={formData.dose_unit}
                    onValueChange={(value) => setFormData({ ...formData, dose_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSE_UNIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timing">Timing</Label>
                  <Select
                    value={formData.timing}
                    onValueChange={(value) => setFormData({ ...formData, timing: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timing" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
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
                <div className="space-y-2">
                  <Label htmlFor="servings_per_container">Servings Per Container</Label>
                  <Input
                    id="servings_per_container"
                    type="number"
                    value={formData.servings_per_container ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        servings_per_container: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_url">Purchase URL</Label>
                  <Input
                    id="purchase_url"
                    type="url"
                    value={formData.purchase_url}
                    onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSupplement.isPending}>
                  {createSupplement.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Supplement
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
