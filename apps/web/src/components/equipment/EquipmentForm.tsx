"use client";

import { useState, useEffect } from "react";
import { Equipment, CreateEquipmentRequest } from "@/types";
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
import { useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from "@/hooks/useEquipment";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "lllt", label: "LLLT" },
  { value: "microneedling", label: "Microneedling" },
  { value: "sleep", label: "Sleep" },
  { value: "skincare", label: "Skincare" },
  { value: "recovery", label: "Recovery" },
  { value: "other", label: "Other" },
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
  { value: "2x_weekly", label: "2x Weekly" },
  { value: "3x_weekly", label: "3x Weekly" },
  { value: "as_needed", label: "As Needed" },
];

const DURATION_OPTIONS = [
  { value: "5 minutes", label: "5 minutes" },
  { value: "10 minutes", label: "10 minutes" },
  { value: "15 minutes", label: "15 minutes" },
  { value: "20 minutes", label: "20 minutes" },
  { value: "25 minutes", label: "25 minutes" },
  { value: "30 minutes", label: "30 minutes" },
  { value: "45 minutes", label: "45 minutes" },
  { value: "1 hour", label: "1 hour" },
  { value: "all_night", label: "All night" },
];

interface EquipmentFormProps {
  equipment?: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentForm({ equipment, open, onOpenChange }: EquipmentFormProps) {
  const isEditing = !!equipment;

  const [formData, setFormData] = useState<CreateEquipmentRequest>({
    name: "",
    brand: "",
    model: "",
    category: "",
    purpose: "",
    usage_frequency: "",
    usage_timing: "",
    usage_duration: "",
    usage_protocol: "",
    contraindications: "",
    purchase_url: "",
    notes: "",
  });

  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        brand: equipment.brand || "",
        model: equipment.model || "",
        category: equipment.category || "",
        purpose: equipment.purpose || "",
        usage_frequency: equipment.usage_frequency || "",
        usage_timing: equipment.usage_timing || "",
        usage_duration: equipment.usage_duration || "",
        usage_protocol: equipment.usage_protocol || "",
        contraindications: equipment.contraindications || "",
        purchase_url: equipment.purchase_url || "",
        notes: equipment.notes || "",
      });
    } else {
      setFormData({
        name: "",
        brand: "",
        model: "",
        category: "",
        purpose: "",
        usage_frequency: "",
        usage_timing: "",
        usage_duration: "",
        usage_protocol: "",
        contraindications: "",
        purchase_url: "",
        notes: "",
      });
    }
  }, [equipment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && equipment) {
        await updateEquipment.mutateAsync({ id: equipment.id, data: formData as any });
        toast.success("Equipment updated successfully");
      } else {
        await createEquipment.mutateAsync(formData as any);
        toast.success("Equipment added successfully");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save equipment:", error);
      toast.error("Failed to save equipment. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!equipment) return;

    if (confirm("Are you sure you want to delete this equipment?")) {
      try {
        await deleteEquipment.mutateAsync(equipment.id);
        toast.success("Equipment deleted");
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to delete equipment:", error);
        toast.error("Failed to delete equipment. Please try again.");
      }
    }
  };

  const isPending = createEquipment.isPending || updateEquipment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Equipment" : "Add Equipment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., iRestore Elite"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., iRestore"
              />
            </div>
          </div>

          {/* Model & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Professional 500"
              />
            </div>
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
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g., Hair regrowth via low-level light therapy"
            />
          </div>

          {/* Frequency, Timing, Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usage_frequency">Frequency</Label>
              <Select
                value={formData.usage_frequency}
                onValueChange={(value) => setFormData({ ...formData, usage_frequency: value })}
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
              <Label htmlFor="usage_timing">Timing</Label>
              <Select
                value={formData.usage_timing}
                onValueChange={(value) => setFormData({ ...formData, usage_timing: value })}
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
            <div className="space-y-2">
              <Label htmlFor="usage_duration">Duration</Label>
              <Select
                value={formData.usage_duration}
                onValueChange={(value) => setFormData({ ...formData, usage_duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Protocol Notes */}
          <div className="space-y-2">
            <Label htmlFor="usage_protocol">Protocol Notes</Label>
            <Textarea
              id="usage_protocol"
              value={formData.usage_protocol}
              onChange={(e) => setFormData({ ...formData, usage_protocol: e.target.value })}
              rows={2}
              placeholder="e.g., Use after showering when scalp is clean and dry"
            />
          </div>

          {/* Contraindications */}
          <div className="space-y-2">
            <Label htmlFor="contraindications">Contraindications / Warnings</Label>
            <Input
              id="contraindications"
              value={formData.contraindications}
              onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })}
              placeholder="e.g., Skip minoxidil for 24 hours after use"
            />
          </div>

          {/* Purchase URL */}
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

          {/* Notes */}
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

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEquipment.isPending}
                  className="w-full sm:w-auto"
                >
                  {deleteEquipment.isPending ? (
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
                {isEditing ? "Update" : "Add"} Equipment
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
