"use client";

import { useState, useEffect } from "react";
import { Supplement, CreateSupplementRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateSupplement, useUpdateSupplement, useDeleteSupplement } from "@/hooks/useSupplements";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
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
  { value: "pill", label: "Pill" },
  { value: "capsule", label: "Capsule" },
  { value: "softgel", label: "Softgel" },
  { value: "tablet", label: "Tablet" },
  { value: "scoop", label: "Scoop" },
  { value: "dropper", label: "Dropper" },
  { value: "drop", label: "Drop" },
  { value: "spray", label: "Spray" },
  { value: "gummy", label: "Gummy" },
  { value: "lozenge", label: "Lozenge" },
  { value: "packet", label: "Packet" },
  { value: "teaspoon", label: "Teaspoon" },
  { value: "tablespoon", label: "Tablespoon" },
  { value: "chewable", label: "Chewable" },
  { value: "patch", label: "Patch" },
  { value: "powder", label: "Powder (serving)" },
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

interface SupplementFormProps {
  supplement?: Supplement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplementForm({ supplement, open, onOpenChange }: SupplementFormProps) {
  const isEditing = !!supplement;

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

  const isPending = createSupplement.isPending || updateSupplement.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Supplement" : "Add Supplement"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteSupplement.isPending}
                  className="w-full sm:w-auto"
                >
                  {deleteSupplement.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Update" : "Add"} Supplement
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
