"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useHasActiveAIKey } from "@/hooks/useAI";
import { useCreateFacialProduct } from "@/hooks/useFacialProducts";
import { CreateFacialProductRequest, FacialProductRoutine } from "@/types";
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
  Sun,
  Moon,
  Droplet,
  FlaskConical,
  Layers,
  Shield,
  Eye,
  Leaf,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "cleanser", label: "Cleanser", icon: Droplet },
  { value: "toner", label: "Toner", icon: Droplet },
  { value: "essence_serum", label: "Essence/Serum", icon: FlaskConical },
  { value: "moisturizer", label: "Moisturizer", icon: Layers },
  { value: "sunscreen", label: "Sunscreen", icon: Shield },
  { value: "eye_care", label: "Eye Care", icon: Eye },
  { value: "treatment", label: "Treatment", icon: Sparkles },
  { value: "mask", label: "Mask", icon: Leaf },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const ROUTINE_OPTIONS: { value: string; label: string; icon: LucideIcon; selectedColor: string }[] = [
  { value: "am", label: "AM", icon: Sun, selectedColor: "bg-yellow-500/30 border-yellow-500/50 text-yellow-400" },
  { value: "pm", label: "PM", icon: Moon, selectedColor: "bg-indigo-500/30 border-indigo-500/50 text-indigo-400" },
];

const FORM_OPTIONS = [
  { value: "cream", label: "Cream" },
  { value: "gel", label: "Gel" },
  { value: "lotion", label: "Lotion" },
  { value: "serum", label: "Serum" },
  { value: "liquid", label: "Liquid" },
  { value: "foam", label: "Foam" },
  { value: "spray", label: "Spray" },
];

const MAX_TEXT_LENGTH = 50000;
const WARNING_THRESHOLD = 40000;

interface FacialProductAddCombinedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onOpenExtractionModal?: (input: { text?: string; file?: File; url?: string }) => void;
}

export function FacialProductAddCombinedModal({
  open,
  onOpenChange,
  onSuccess,
  onOpenExtractionModal,
}: FacialProductAddCombinedModalProps) {
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
  const [formData, setFormData] = useState<CreateFacialProductRequest>({
    name: "",
    brand: "",
    step_order: undefined,
    application_form: "",
    routines: [],
    size_amount: undefined,
    size_unit: "ml",
    price: undefined,
    purchase_url: "",
    category: "",
    purpose: "",
    notes: "",
  });

  // Hooks
  const { hasKey: hasAIKey, isLoading: isCheckingKey } = useHasActiveAIKey();
  const createProduct = useCreateFacialProduct();

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
        step_order: undefined,
        application_form: "",
        routines: [],
        size_amount: undefined,
        size_unit: "ml",
        price: undefined,
        purchase_url: "",
        category: "",
        purpose: "",
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

    // If we have the extraction modal handler, use it
    if (onOpenExtractionModal) {
      onOpenChange(false);
      onOpenExtractionModal({
        text: text.trim() || undefined,
        file: attachedFile || undefined,
      });
      return;
    }

    // Otherwise show a message that full extraction isn't implemented yet
    toast.info("AI extraction coming soon! Use Manual tab for now.");
  }, [text, attachedFile, onOpenExtractionModal, onOpenChange]);

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
      const cleanedData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) {
          continue;
        }
        cleanedData[key] = value;
      }

      await createProduct.mutateAsync(cleanedData as any);
      toast.success("Product added successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Failed to save product. Please try again.");
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
          <DialogTitle>Add Facial Product</DialogTitle>
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
                  {progressStage === "analyzing" && "AI is analyzing skincare products..."}
                  {progressStage === "extracting" && "Extracting product details..."}
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
                        placeholder="Paste your skincare routine, product list, or Amazon URL for AI extraction."
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
                        Extract Products
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
              {/* Name and Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Anua Heartleaf Cleansing Oil"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Anua"
                  />
                </div>
              </div>

              {/* Routine and Step Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Routine</Label>
                  <div className="flex gap-2">
                    {ROUTINE_OPTIONS.map((opt) => {
                      const isSelected = formData.routines?.includes(opt.value as FacialProductRoutine) || false;
                      const RoutineIcon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const currentRoutines = formData.routines || [];
                            const newRoutines = isSelected
                              ? currentRoutines.filter(r => r !== opt.value)
                              : [...currentRoutines, opt.value as FacialProductRoutine];
                            setFormData({ ...formData, routines: newRoutines });
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded border transition-colors ${
                            isSelected
                              ? opt.selectedColor
                              : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <RoutineIcon className="w-4 h-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="step_order">Step Order</Label>
                  <Input
                    id="step_order"
                    type="number"
                    min={1}
                    max={20}
                    value={formData.step_order ?? ""}
                    onChange={(e) => setFormData({ ...formData, step_order: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="e.g., 1"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = formData.category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <div className="space-y-2">
                <Label>Form</Label>
                <div className="flex flex-wrap gap-2">
                  {FORM_OPTIONS.map((form) => {
                    const isSelected = formData.application_form === form.value;
                    return (
                      <button
                        key={form.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, application_form: form.value })}
                        className={`px-2.5 py-1.5 text-sm rounded border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                        }`}
                      >
                        {form.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size and Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size_amount">Size</Label>
                  <Input
                    id="size_amount"
                    type="number"
                    step="0.1"
                    value={formData.size_amount ?? ""}
                    onChange={(e) => setFormData({ ...formData, size_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size_unit">Unit</Label>
                  <div className="flex gap-1">
                    {["ml", "oz", "g"].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setFormData({ ...formData, size_unit: unit })}
                        className={`flex-1 px-2 py-2 text-sm rounded border transition-colors ${
                          formData.size_unit === unit
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price ?? ""}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 24.99"
                  />
                </div>
              </div>

              {/* Purchase URL */}
              <div className="space-y-2">
                <Label htmlFor="purchase_url">Purchase URL</Label>
                <Input
                  id="purchase_url"
                  type="url"
                  value={formData.purchase_url}
                  onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
                  placeholder="https://www.amazon.com/..."
                />
              </div>

              {/* Purpose and Notes */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., First cleanse to remove sunscreen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProduct.isPending}>
                  {createProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Product
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
