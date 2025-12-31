"use client";

import { useState, useEffect } from "react";
import { Supplement, CreateSupplementRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateSupplement, useUpdateSupplement, useDeleteSupplement } from "@/hooks/useSupplements";
import { useExtractSupplements } from "@/hooks/useAI";
import { aiApi } from "@/lib/api";
import { Loader2, Trash2, Copy, ExternalLink, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "vitamin", label: "Vitamin" },
  { value: "mineral", label: "Mineral" },
  { value: "amino_acid", label: "Amino" },
  { value: "herb", label: "Herb" },
  { value: "probiotic", label: "Probiotic" },
  { value: "omega", label: "Omega" },
  { value: "antioxidant", label: "Antioxidant" },
  { value: "hormone", label: "Hormone" },
  { value: "enzyme", label: "Enzyme" },
  { value: "other", label: "Other" },
];

const TIMING_OPTIONS = [
  { value: "wake_up", label: "Wake" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "before_bed", label: "Bed" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "2x" },
  { value: "three_times_daily", label: "3x" },
  { value: "weekly", label: "Weekly" },
  { value: "as_needed", label: "PRN" },
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
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mcg", label: "mcg" },
  { value: "IU", label: "IU" },
  { value: "ml", label: "ml" },
  { value: "CFU", label: "CFU" },
];

// AI fill indicator with per-field confidence %
function AIIndicator({ field, aiFields }: { field: string; aiFields: AIFilledFields | null }) {
  if (!aiFields) return null;

  const confidence = aiFields.fieldConfidence[field];

  if (confidence !== undefined && confidence > 0) {
    // Field was found by AI - show confidence %
    return <span className="text-[10px] text-green-500 ml-1 font-medium">{Math.round(confidence * 100)}%</span>;
  }
  if (confidence === -1) {
    // Field was checked but could not be found
    return <span className="text-[10px] text-red-400 ml-1">[N/A]</span>;
  }
  return null;
}

// AI Extraction Progress Display
function ExtractionProgress({ step }: { step: ExtractionStep }) {
  if (step.type === 'idle') return null;

  return (
    <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-muted text-sm space-y-2">
      {/* Progress message */}
      <div className="flex items-center gap-2">
        {(step.type === 'searching' || step.type === 'scraping' || step.type === 'analyzing' || step.type === 'web_search') && (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        )}
        {step.type === 'complete' && (
          <Check className="w-4 h-4 text-green-500" />
        )}
        {step.type === 'error' && (
          <span className="w-4 h-4 text-red-500">✗</span>
        )}
        <span className="text-muted-foreground">
          {step.type === 'searching' && step.message}
          {step.type === 'scraping' && step.message}
          {step.type === 'analyzing' && step.message}
          {step.type === 'web_search' && step.message}
          {step.type === 'complete' && `Found ${step.fieldsFound.length} fields`}
          {step.type === 'error' && step.message}
        </span>
      </div>

      {/* Field checklist */}
      {(step.type === 'analyzing' || step.type === 'complete') && (
        <div className="grid grid-cols-4 gap-1 text-xs">
          {PRODUCT_FIELDS.map(f => {
            const found = step.type === 'analyzing'
              ? step.fieldsFound.includes(f.key)
              : step.fieldsFound.includes(f.key);
            const missing = step.type === 'complete' && step.fieldsMissing.includes(f.key);
            return (
              <div key={f.key} className={`flex items-center gap-1 ${found ? 'text-green-500' : missing ? 'text-red-400' : 'text-muted-foreground/50'}`}>
                {found ? '✓' : missing ? '✗' : '○'} {f.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline chip selector - all on one line
function InlineChips({
  options,
  value,
  onChange,
  label,
  field,
  aiFields,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  field?: string;
  aiFields?: AIFilledFields | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground shrink-0 w-16 flex items-center">
        {label}
        {field && <AIIndicator field={field} aiFields={aiFields || null} />}
      </Label>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value === value ? "" : opt.value)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SupplementFormProps {
  supplement?: Supplement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Track per-field AI confidence
interface AIFilledFields {
  overallConfidence: number;
  fieldConfidence: Record<string, number>; // -1 = cannot find, 0 = not checked, >0 = confidence %
}

// AI extraction progress steps
type ExtractionStep =
  | { type: 'idle' }
  | { type: 'searching'; message: string }
  | { type: 'scraping'; message: string }
  | { type: 'analyzing'; message: string; fieldsFound: string[] }
  | { type: 'web_search'; message: string }
  | { type: 'complete'; fieldsFound: string[]; fieldsMissing: string[] }
  | { type: 'error'; message: string };

const PRODUCT_FIELDS = [
  { key: 'brand', label: 'Brand' },
  { key: 'price', label: 'Price' },
  { key: 'servings_per_container', label: 'Servings' },
  { key: 'serving_size', label: 'Srv Size' },
  { key: 'intake_form', label: 'Form' },
  { key: 'dose_per_serving', label: 'Dose' },
  { key: 'dose_unit', label: 'Unit' },
  { key: 'category', label: 'Category' },
];

export function SupplementForm({ supplement, open, onOpenChange }: SupplementFormProps) {
  const isEditing = !!supplement;
  const [copied, setCopied] = useState(false);
  const [isAIFetching, setIsAIFetching] = useState(false);
  const [aiFields, setAiFields] = useState<AIFilledFields | null>(null);
  const [extractionStep, setExtractionStep] = useState<ExtractionStep>({ type: 'idle' });

  const extractSupplements = useExtractSupplements();

  const [formData, setFormData] = useState<CreateSupplementRequest>({
    name: "",
    brand: "",
    intake_quantity: 1,
    intake_form: "",
    serving_size: 1,
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

  const createSupplement = useCreateSupplement();
  const updateSupplement = useUpdateSupplement();
  const deleteSupplement = useDeleteSupplement();

  useEffect(() => {
    if (supplement) {
      setFormData({
        name: supplement.name,
        brand: supplement.brand || "",
        intake_quantity: supplement.intake_quantity || 1,
        intake_form: supplement.intake_form || "",
        serving_size: supplement.serving_size || 1,
        dose_per_serving: supplement.dose_per_serving,
        dose_unit: supplement.dose_unit || "",
        servings_per_container: supplement.servings_per_container,
        price: supplement.price,
        purchase_url: supplement.purchase_url || "",
        category: supplement.category || "",
        timing: supplement.timing || "",
        frequency: supplement.frequency || "",
        notes: supplement.notes || "",
      });
    } else {
      setFormData({
        name: "",
        brand: "",
        intake_quantity: 1,
        intake_form: "",
        serving_size: 1,
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
    }
    setCopied(false);
    setAiFields(null);
    setExtractionStep({ type: 'idle' });
  }, [supplement, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && supplement) {
        await updateSupplement.mutateAsync({ id: supplement.id, data: formData as any });
        toast.success("Supplement updated");
      } else {
        await createSupplement.mutateAsync(formData as any);
        toast.success("Supplement added");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save supplement:", error);
      toast.error("Failed to save supplement");
    }
  };

  const handleDelete = async () => {
    if (!supplement) return;
    if (confirm("Delete this supplement?")) {
      try {
        await deleteSupplement.mutateAsync(supplement.id);
        toast.success("Deleted");
        onOpenChange(false);
      } catch (error) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleCopyUrl = async () => {
    if (formData.purchase_url) {
      await navigator.clipboard.writeText(formData.purchase_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAIFetch = async () => {
    if (!formData.name) {
      toast.error("Enter a supplement name first");
      return;
    }

    setIsAIFetching(true);
    setAiFields(null);
    const fieldsToFind = PRODUCT_FIELDS.map(f => f.key);
    const foundFields: string[] = [];
    const fieldConfidence: Record<string, number> = {};

    // Initialize all fields as pending
    fieldsToFind.forEach(f => { fieldConfidence[f] = 0; });

    // Build search query
    const searchQuery = `${formData.name} ${formData.brand || ""} supplement. Find: brand, price, servings, form, dose, unit, category.`;

    // Track result from streaming
    let result: any = null;
    let streamError: string | null = null;

    // Use streaming API with proper auth
    await aiApi.extractSupplementsStream(
      {
        text_content: searchQuery,
        source_type: "text",
        product_url: formData.purchase_url || undefined,
      },
      // onProgress callback
      (event) => {
        console.log('Stream event:', event);
        switch (event.step) {
          case 'scraping':
            setExtractionStep({ type: 'searching', message: event.message });
            break;
          case 'scraping_done':
            setExtractionStep({ type: 'scraping', message: `✓ ${event.message}` });
            break;
          case 'analyzing':
            setExtractionStep({
              type: 'analyzing',
              message: event.message,
              fieldsFound: []
            });
            break;
          case 'first_pass_done':
            const found = event.fields?.filter((f: any) => f.status === 'found').map((f: any) => f.key) || [];
            event.fields?.forEach((f: any) => {
              fieldConfidence[f.key] = f.confidence || (f.status === 'found' ? 0.7 : 0);
            });
            setExtractionStep({
              type: 'analyzing',
              message: event.message,
              fieldsFound: found
            });
            break;
          case 'web_search':
            setExtractionStep({
              type: 'web_search',
              message: event.message
            });
            break;
          case 'field_found':
            fieldConfidence[event.field] = event.confidence;
            if (!foundFields.includes(event.field)) {
              foundFields.push(event.field);
            }
            setExtractionStep({
              type: 'analyzing',
              message: `✓ Found ${PRODUCT_FIELDS.find(p => p.key === event.field)?.label}: ${event.value}`,
              fieldsFound: [...foundFields]
            });
            break;
          case 'field_not_found':
            fieldConfidence[event.field] = -1;
            break;
        }
      },
      // onComplete callback
      (data) => {
        result = data;
      },
      // onError callback
      (error) => {
        streamError = error;
      }
    );

    // Handle streaming error - fallback to non-streaming
    if (streamError || !result) {
      console.log('Streaming failed, using fallback:', streamError);
      try {
        const fallbackResult = await extractSupplements.mutateAsync({
          text_content: searchQuery,
          source_type: "text",
          product_url: formData.purchase_url || undefined,
        });
        result = fallbackResult;
      } catch (e: any) {
        toast.error(e.message || "AI fetch failed");
        setIsAIFetching(false);
        setExtractionStep({ type: 'error', message: e.message || 'Failed' });
        return;
      }
    }

    try {

      if (result.supplements && result.supplements.length > 0) {
        const s = result.supplements[0];
        console.log("AI response:", s);

        // Normalize values
        const normalizeValue = (val: string | undefined) => val?.toLowerCase().replace(/\s+/g, '_');

        // Use field_confidence from API (already populated by streaming) or calculate
        const apiFieldConfidence = s.field_confidence || {};
        fieldsToFind.forEach(field => {
          // Only update if not already set by streaming
          if (fieldConfidence[field] === 0 || fieldConfidence[field] === undefined) {
            const val = s[field as keyof typeof s];
            if (apiFieldConfidence[field] !== undefined) {
              fieldConfidence[field] = apiFieldConfidence[field];
              if (apiFieldConfidence[field] > 0 && !foundFields.includes(field)) {
                foundFields.push(field);
              }
            } else if (val !== undefined && val !== null && val !== '' && val !== 0) {
              fieldConfidence[field] = s.confidence || 0.7;
              if (!foundFields.includes(field)) foundFields.push(field);
            } else {
              fieldConfidence[field] = -1;
            }
          }
        });

        const missingFields = fieldsToFind.filter(f => fieldConfidence[f] <= 0);

        // Show completion
        setExtractionStep({
          type: 'complete',
          fieldsFound: foundFields,
          fieldsMissing: missingFields
        });

        // Update form with found values
        setFormData(prev => ({
          ...prev,
          name: s.name || prev.name,
          brand: s.brand && fieldConfidence.brand > 0 ? s.brand : (fieldConfidence.brand === -1 ? "[Cannot Find]" : prev.brand),
          intake_quantity: s.intake_quantity || prev.intake_quantity,
          intake_form: normalizeValue(s.intake_form) || "",
          serving_size: s.serving_size ?? prev.serving_size ?? 1,
          dose_per_serving: s.dose_per_serving ?? undefined,
          dose_unit: s.dose_unit || "",
          servings_per_container: s.servings_per_container ?? undefined,
          price: s.price ?? undefined,
          category: normalizeValue(s.category) || "",
        }));

        // Calculate overall confidence as average of found fields
        const foundConfidences = Object.values(fieldConfidence).filter(c => c > 0);
        const avgConfidence = foundConfidences.length > 0
          ? foundConfidences.reduce((a, b) => a + b, 0) / foundConfidences.length
          : 0;

        // Store AI result with per-field confidence
        setAiFields({
          overallConfidence: avgConfidence,
          fieldConfidence,
        });

        toast.success(`AI found ${foundFields.length}/${fieldsToFind.length} fields`);
      } else {
        // No results - mark all as cannot find
        const fieldConfidence: Record<string, number> = {};
        fieldsToFind.forEach(field => {
          fieldConfidence[field] = -1;
        });
        setAiFields({
          overallConfidence: 0,
          fieldConfidence,
        });
        setExtractionStep({ type: 'error', message: 'No supplement data found' });
        toast.error("Could not find supplement info");
      }
    } catch (error) {
      console.error("AI fetch error:", error);
      setExtractionStep({ type: 'error', message: 'Failed to fetch data' });
      toast.error("Failed to fetch info");
    } finally {
      setIsAIFetching(false);
      // Auto-close progress after delay
      setTimeout(() => {
        if (extractionStep.type === 'complete' || extractionStep.type === 'error') {
          setExtractionStep({ type: 'idle' });
        }
      }, 3000);
    }
  };

  const isPending = createSupplement.isPending || updateSupplement.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Supplement" : "Add Supplement"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Row 1: Name + Quantity to Take - all inline */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Vitamin D3"
              required
              className="h-7 text-sm flex-1"
            />
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Qty:</Label>
            <Input
              type="number"
              min={1}
              value={formData.intake_quantity || 1}
              onChange={(e) => setFormData({ ...formData, intake_quantity: parseInt(e.target.value, 10) || 1 })}
              className="h-7 text-sm text-center px-1 w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-blue-400 whitespace-nowrap">
              ({formData.intake_form ? INTAKE_FORM_OPTIONS.find(f => f.value === formData.intake_form)?.label : 'Unit'}
              {formData.dose_per_serving && formData.serving_size && formData.serving_size > 0 && formData.dose_unit && (
                <span className="ml-1">
                  [{(formData.dose_per_serving / formData.serving_size).toFixed((formData.dose_per_serving / formData.serving_size) % 1 === 0 ? 0 : 1)}{formData.dose_unit}/{formData.intake_form ? INTAKE_FORM_OPTIONS.find(f => f.value === formData.intake_form)?.label : 'Unit'}]
                </span>
              )})
            </span>
          </div>

          {/* Row 2: When & Freq */}
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground shrink-0">When</Label>
              <div className="flex gap-0.5">
                {TIMING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, timing: opt.value === formData.timing ? "" : opt.value })}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      formData.timing === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground shrink-0">Freq</Label>
              <div className="flex gap-0.5">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: opt.value === formData.frequency ? "" : opt.value })}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      formData.frequency === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* URL row */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">URL</Label>
            <Input
              type="url"
              value={formData.purchase_url}
              onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
              placeholder="https://..."
              className="h-7 text-sm w-52 min-w-0"
            />
            {formData.purchase_url && (
              <>
                <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleCopyUrl}>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(formData.purchase_url, "_blank")}>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 gap-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
              onClick={handleAIFetch}
              disabled={isAIFetching || !formData.name}
            >
              {isAIFetching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span className="text-xs">Populate by AI</span>
            </Button>
          </div>

          {/* Notes - under URL */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes..."
              className="h-7 text-sm flex-1"
            />
          </div>

          {/* Product Section */}
          <div className="pt-2 border-t border-muted">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Product</Label>
                {aiFields && aiFields.overallConfidence > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500">
                    {Math.round(aiFields.overallConfidence * 100)}% confidence
                  </span>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                className="h-6 px-3 gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
                onClick={handleAIFetch}
                disabled={isAIFetching || !formData.name}
              >
                {isAIFetching ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span className="text-xs">Populate by AI</span>
              </Button>
            </div>

            {/* AI Extraction Progress */}
            <ExtractionProgress step={extractionStep} />

            {/* Price, Form, Brand - stacked labels with inputs below */}
            <div className="flex items-start gap-4 mt-2">
              <div className="flex flex-col gap-0.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Price<AIIndicator field="price" aiFields={aiFields} /></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price ?? ""}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="h-7 text-sm w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Form<AIIndicator field="intake_form" aiFields={aiFields} /></Label>
                <div className="flex gap-0.5">
                  {INTAKE_FORM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, intake_form: opt.value === formData.intake_form ? "" : opt.value })}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                        formData.intake_form === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Brand<AIIndicator field="brand" aiFields={aiFields} /></Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Thorne"
                  className="h-7 text-sm flex-1 min-w-0"
                />
              </div>
            </div>

            {/* Servings box */}
            <div className="flex items-center gap-1 px-2 py-1.5 mt-2 rounded border border-muted-foreground/20 bg-muted/30">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Servings:<AIIndicator field="servings_per_container" aiFields={aiFields} /></Label>
              <Input
                type="number"
                value={formData.servings_per_container ?? ""}
                onChange={(e) => setFormData({ ...formData, servings_per_container: e.target.value ? parseInt(e.target.value) : undefined })}
                className="h-7 text-sm w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-muted-foreground">@</span>
              <Input
                type="number"
                min={1}
                value={formData.serving_size ?? 1}
                onChange={(e) => setFormData({ ...formData, serving_size: e.target.value ? parseInt(e.target.value) : 1 })}
                className="h-7 text-sm w-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs whitespace-nowrap">
                <AIIndicator field="serving_size" aiFields={aiFields} />
                <span className="text-blue-400 ml-1">{formData.intake_form ? `${INTAKE_FORM_OPTIONS.find(f => f.value === formData.intake_form)?.label.toLowerCase()}s` : ''}</span>
                <span className="text-muted-foreground"> per Serving</span>
              </span>
            </div>
          </div>

          {/* Dose & Unit - all inline, boxed */}
          <div className="flex items-center gap-3 px-2 py-1 rounded border border-muted-foreground/20 bg-muted/30">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Dosage / Serving<AIIndicator field="dose_per_serving" aiFields={aiFields} /></Label>
              <Input
                type="number"
                step="any"
                value={formData.dose_per_serving ?? ""}
                onChange={(e) => setFormData({ ...formData, dose_per_serving: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="1000"
                className="h-7 text-sm w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Unit<AIIndicator field="dose_unit" aiFields={aiFields} /></Label>
              <div className="flex gap-0.5 items-center">
                {DOSE_UNIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, dose_unit: opt.value === formData.dose_unit ? "" : opt.value })}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      formData.dose_unit === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Calculated Dose per Unit (read-only) */}
            {formData.dose_per_serving && formData.serving_size && formData.serving_size > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Dose/Unit:</span>
                <span className="font-medium text-blue-400">
                  {(formData.dose_per_serving / formData.serving_size).toFixed(formData.dose_per_serving / formData.serving_size % 1 === 0 ? 0 : 1)}
                  {formData.dose_unit || ''}
                </span>
              </div>
            )}
          </div>

          {/* Category chips - two rows */}
          <div className="space-y-1">
            <div className="flex items-center gap-0.5">
              <Label className="text-xs text-muted-foreground shrink-0 flex items-center mr-1">Category<AIIndicator field="category" aiFields={aiFields} /></Label>
              {CATEGORIES.slice(0, 5).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: opt.value === formData.category ? "" : opt.value })}
                  className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                    formData.category === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-0.5 pl-[60px]">
              {CATEGORIES.slice(5).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: opt.value === formData.category ? "" : opt.value })}
                  className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                    formData.category === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center pt-2">
            {isEditing && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleteSupplement.isPending} className="mr-auto">
                {deleteSupplement.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {isEditing ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
