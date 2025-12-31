"use client";

import { useState, useEffect } from "react";
import { Supplement, CreateSupplementRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateSupplement, useUpdateSupplement, useDeleteSupplement } from "@/hooks/useSupplements";
import { Loader2, Trash2, Copy, ExternalLink, Check } from "lucide-react";
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
  { value: "wake_up", label: "Wake Up" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "before_bed", label: "Bed" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "twice_daily", label: "2x/day" },
  { value: "three_times_daily", label: "3x/day" },
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
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "mcg", label: "mcg" },
  { value: "IU", label: "IU" },
  { value: "ml", label: "ml" },
  { value: "CFU", label: "CFU" },
];

// Chip selector component
function ChipSelector({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value === value ? "" : opt.value)}
            className={`px-2 py-1 text-xs rounded-md border transition-colors ${
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

export function SupplementForm({ supplement, open, onOpenChange }: SupplementFormProps) {
  const isEditing = !!supplement;
  const [copied, setCopied] = useState(false);

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
  }, [supplement, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && supplement) {
        await updateSupplement.mutateAsync({ id: supplement.id, data: formData as any });
        toast.success("Supplement updated successfully");
      } else {
        await createSupplement.mutateAsync(formData as any);
        toast.success("Supplement added successfully");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save supplement:", error);
      toast.error("Failed to save supplement. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!supplement) return;

    if (confirm("Are you sure you want to delete this supplement?")) {
      try {
        await deleteSupplement.mutateAsync(supplement.id);
        toast.success("Supplement deleted");
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to delete supplement:", error);
        toast.error("Failed to delete supplement. Please try again.");
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

  const isPending = createSupplement.isPending || updateSupplement.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Supplement" : "Add Supplement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name & Brand row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs text-muted-foreground">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Vitamin D3"
                required
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="brand" className="text-xs text-muted-foreground">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Thorne"
                className="h-8"
              />
            </div>
          </div>

          {/* Form selector */}
          <ChipSelector
            label="Form"
            options={INTAKE_FORM_OPTIONS}
            value={formData.intake_form || ""}
            onChange={(value) => setFormData({ ...formData, intake_form: value })}
          />

          {/* Dosage row - compact */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Qty</Label>
              <Input
                type="number"
                min={1}
                value={formData.intake_quantity || 1}
                onChange={(e) => setFormData({ ...formData, intake_quantity: parseInt(e.target.value, 10) || 1 })}
                className="h-8 w-full"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-muted-foreground">Dose/Serving</Label>
              <Input
                type="number"
                step="any"
                value={formData.dose_per_serving ?? ""}
                onChange={(e) => setFormData({ ...formData, dose_per_serving: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="1000"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              <div className="flex flex-wrap gap-0.5">
                {DOSE_UNIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, dose_unit: opt.value === formData.dose_unit ? "" : opt.value })}
                    className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
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
          </div>

          {/* Timing selector */}
          <ChipSelector
            label="Timing"
            options={TIMING_OPTIONS}
            value={formData.timing || ""}
            onChange={(value) => setFormData({ ...formData, timing: value })}
          />

          {/* Frequency selector */}
          <ChipSelector
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={formData.frequency || ""}
            onChange={(value) => setFormData({ ...formData, frequency: value })}
          />

          {/* Category selector */}
          <ChipSelector
            label="Category"
            options={CATEGORIES}
            value={formData.category || ""}
            onChange={(value) => setFormData({ ...formData, category: value })}
          />

          {/* Price & Servings row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price ?? ""}
                onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Servings</Label>
              <Input
                type="number"
                value={formData.servings_per_container ?? ""}
                onChange={(e) => setFormData({ ...formData, servings_per_container: e.target.value ? parseInt(e.target.value) : undefined })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">$/Serving</Label>
              <div className="h-8 flex items-center text-sm text-muted-foreground">
                {formData.price && formData.servings_per_container
                  ? `$${(formData.price / formData.servings_per_container).toFixed(2)}`
                  : "—"}
              </div>
            </div>
          </div>

          {/* URL row with copy/open buttons */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Purchase URL</Label>
            <div className="flex gap-1">
              <Input
                type="url"
                value={formData.purchase_url}
                onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
                placeholder="https://amazon.com/..."
                className="h-8 flex-1"
              />
              {formData.purchase_url && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={handleCopyUrl}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => window.open(formData.purchase_url, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Notes - collapsible or smaller */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2 pt-2">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteSupplement.isPending}
                >
                  {deleteSupplement.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                {isEditing ? "Update" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
