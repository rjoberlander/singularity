"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useExtractFacialProducts, ExtractedFacialProductData } from "@/hooks/useAI";
import { useCreateFacialProductsBulk, useFacialProducts } from "@/hooks/useFacialProducts";
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

interface ExtractedProduct {
  name: string;
  brand?: string;
  step_order?: number;
  application_form?: string;
  routines?: ('am' | 'pm')[];
  size_amount?: number;
  size_unit?: string;
  price?: number;
  purchase_url?: string;
  category?: string;
  subcategory?: string;
  purpose?: string;
  key_ingredients?: string[];
  spf_rating?: number;
  confidence: number;
  field_confidence?: Record<string, number>;
}

interface FacialProductExtractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialInput?: { text?: string; file?: File; url?: string };
}

const CATEGORY_OPTIONS = [
  { value: "cleanser", label: "Cleanser" },
  { value: "toner", label: "Toner" },
  { value: "serum", label: "Serum" },
  { value: "moisturizer", label: "Moisturizer" },
  { value: "sunscreen", label: "Sunscreen" },
  { value: "other", label: "Other" },
];

const FORM_OPTIONS = [
  { value: "cream", label: "Cream" },
  { value: "gel", label: "Gel" },
  { value: "oil", label: "Oil" },
  { value: "liquid", label: "Liquid" },
  { value: "foam", label: "Foam" },
];

const SIZE_UNIT_OPTIONS = [
  { value: "ml", label: "ml" },
  { value: "oz", label: "oz" },
  { value: "g", label: "g" },
];

// Field definitions for the dense table
type FieldType = 'text' | 'number' | 'select' | 'url';
interface FieldDef {
  key: keyof ExtractedProduct;
  label: string;
  shortLabel: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  width?: string;
}

const TABLE_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Product Name', shortLabel: 'Name', type: 'text', width: 'min-w-[180px]' },
  { key: 'brand', label: 'Brand', shortLabel: 'Brand', type: 'text', width: 'min-w-[100px]' },
  { key: 'category', label: 'Category', shortLabel: 'Cat', type: 'select', options: CATEGORY_OPTIONS, width: 'min-w-[90px]' },
  { key: 'application_form', label: 'Form', shortLabel: 'Form', type: 'select', options: FORM_OPTIONS, width: 'min-w-[70px]' },
  { key: 'size_amount', label: 'Size', shortLabel: 'Size', type: 'number', width: 'w-16' },
  { key: 'size_unit', label: 'Unit', shortLabel: 'Unit', type: 'select', options: SIZE_UNIT_OPTIONS, width: 'w-14' },
  { key: 'price', label: 'Price', shortLabel: '$', type: 'number', width: 'w-16' },
  { key: 'purchase_url', label: 'URL', shortLabel: 'URL', type: 'url', width: 'min-w-[80px]' },
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

// Get field confidence from product
function getFieldConfidence(product: ExtractedProduct, field: string): number {
  if (product.field_confidence && field in product.field_confidence) {
    return product.field_confidence[field];
  }
  const value = product[field as keyof ExtractedProduct];
  if (value === undefined || value === null || value === '') {
    return -1;
  }
  return product.confidence;
}

// Helper to parse and display URLs smartly
function parseProductUrl(url: string | undefined): { display: string; isAmazon: boolean } | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('amazon.')) {
      const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
      const asin = dpMatch?.[1];
      return { display: asin || 'Amazon', isAmazon: true };
    }
    const hostname = urlObj.hostname.replace('www.', '');
    return { display: hostname, isAmazon: false };
  } catch {
    return { display: url.substring(0, 30) + '...', isAmazon: false };
  }
}

export function FacialProductExtractionModal({
  open,
  onOpenChange,
  onSuccess,
  initialInput,
}: FacialProductExtractionModalProps) {
  const [step, setStep] = useState<"extracting" | "review">("extracting");
  const [extractedData, setExtractedData] = useState<ExtractedFacialProductData | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [extractionStarted, setExtractionStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<"preparing" | "analyzing" | "extracting">("preparing");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const extractFacialProducts = useExtractFacialProducts();
  const createProductsBulk = useCreateFacialProductsBulk();
  const { data: existingProducts } = useFacialProducts({});

  // Detect duplicates - same name + same brand
  const duplicates = useMemo(() => {
    if (!extractedData || !existingProducts) return new Set<number>();

    const dupes = new Set<number>();
    extractedData.products.forEach((extracted, index) => {
      const isDuplicate = existingProducts.some((existing) => {
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
  }, [extractedData, existingProducts]);

  // Auto-deselect duplicates when detected
  useEffect(() => {
    if (duplicates.size > 0 && extractedData) {
      setSelectedProducts((prev) => {
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
    setExtractedData(null);
    setSelectedProducts(new Set());
    setEditingCell(null);
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
        result = await extractFacialProducts.mutateAsync({
          image_base64: base64,
          source_type: "image",
        });
      } else if (url) {
        result = await extractFacialProducts.mutateAsync({
          text_content: `[URL]: ${url}`,
          source_type: "text",
          product_url: url,
        });
      } else if (text) {
        result = await extractFacialProducts.mutateAsync({
          text_content: text,
          source_type: "text",
        });
      }

      if (result) {
        // Add URL to all products if provided
        if (url && result.products) {
          result.products = result.products.map((p) => ({
            ...p,
            purchase_url: p.purchase_url || url,
          }));
        }
        setExtractedData(result);
        setSelectedProducts(new Set(result.products.map((_, i) => i)));
        setStep("review");
        toast.success(`Extracted ${result.products.length} products`);
      }
    } catch (error: any) {
      console.error("Extraction failed:", error);
      const errorMessage = error?.response?.data?.error || "Failed to extract products";
      toast.error(errorMessage);
      handleClose();
    }
  }, [extractFacialProducts, handleClose]);

  // Auto-start extraction when modal opens with initial input
  useEffect(() => {
    if (open && initialInput && !extractionStarted) {
      handleExtract(initialInput.file, initialInput.text, initialInput.url);
    }
  }, [open, initialInput, extractionStarted, handleExtract]);

  const handleSave = async () => {
    if (!extractedData) return;

    const selectedData = extractedData.products
      .map((p, i) => ({ product: p, index: i }))
      .filter(({ index }) => selectedProducts.has(index))
      .map(({ product: p }) => ({
        name: p.name,
        brand: p.brand,
        step_order: p.step_order,
        application_form: p.application_form,
        routines: p.routines,
        size_amount: p.size_amount,
        size_unit: p.size_unit,
        price: p.price,
        purchase_url: p.purchase_url,
        category: p.category,
        subcategory: p.subcategory,
        purpose: p.purpose,
        key_ingredients: p.key_ingredients,
        spf_rating: p.spf_rating,
      }));

    try {
      await createProductsBulk.mutateAsync(selectedData as any);
      toast.success(`Saved ${selectedData.length} products`);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save products:", error);
      toast.error("Failed to save products");
    }
  };

  const toggleProductSelection = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  // Update a single cell value
  const updateCellValue = (rowIndex: number, field: string, value: any) => {
    if (!extractedData) return;

    const updatedProducts = [...extractedData.products];
    updatedProducts[rowIndex] = {
      ...updatedProducts[rowIndex],
      [field]: value,
    };

    if (updatedProducts[rowIndex].field_confidence) {
      updatedProducts[rowIndex].field_confidence = {
        ...updatedProducts[rowIndex].field_confidence,
        [field]: 1.0,
      };
    }

    setExtractedData({
      ...extractedData,
      products: updatedProducts,
    });
    setEditingCell(null);
  };

  // Render cell value (display or edit mode)
  const renderCell = (product: ExtractedProduct, rowIndex: number, field: FieldDef) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field.key;
    const value = product[field.key as keyof ExtractedProduct];
    const confidence = getFieldConfidence(product, field.key);
    const colors = getConfidenceColor(confidence);
    const isDuplicate = duplicates.has(rowIndex);

    // Display value
    const displayValue = (): React.ReactNode => {
      if (value === undefined || value === null || value === '') {
        return <span className="text-muted-foreground/50">-</span>;
      }
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
              <ExternalLink className="w-3 h-3" />
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
      <DialogContent className="w-[95vw] max-w-[85vw] sm:max-w-[90vw] lg:max-w-[85vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {step === "extracting" && "Extracting Skincare Products..."}
            {step === "review" && "Review Extracted Products"}
          </DialogTitle>
          <DialogDescription>
            {step === "extracting" && "AI is analyzing your skincare routine"}
            {step === "review" && "Select the products you want to save"}
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
              {progressStage === "analyzing" && "AI is analyzing skincare products..."}
              {progressStage === "extracting" && "Extracting product details..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complete
            </p>
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
                  {extractedData.products.map((product, rowIndex) => {
                    const isDuplicate = duplicates.has(rowIndex);
                    const isSelected = selectedProducts.has(rowIndex);

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
                            onClick={() => !isDuplicate && toggleProductSelection(rowIndex)}
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
                            {renderCell(product, rowIndex, field)}
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
                              product.confidence >= 0.8 ? 'text-green-400' :
                              product.confidence >= 0.6 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              {Math.round(product.confidence * 100)}%
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
                {selectedProducts.size} of {extractedData.products.length} selected
                {duplicates.size > 0 && (
                  <span className="text-orange-500 ml-2">
                    ({duplicates.size} duplicate{duplicates.size > 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={selectedProducts.size === 0 || createProductsBulk.isPending}
                >
                  {createProductsBulk.isPending && (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  )}
                  Save {selectedProducts.size} Products
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
