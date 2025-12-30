"use client";

import { useState, useEffect } from "react";
import { Goal } from "@/types";
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
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "biomarker", label: "Biomarker Target" },
  { value: "weight", label: "Weight / Body Composition" },
  { value: "fitness", label: "Fitness / Exercise" },
  { value: "nutrition", label: "Nutrition" },
  { value: "sleep", label: "Sleep" },
  { value: "mental", label: "Mental Health" },
  { value: "habit", label: "Habit Formation" },
  { value: "other", label: "Other" },
];

const DIRECTION_OPTIONS = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "maintain", label: "Maintain" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "achieved", label: "Achieved" },
];

interface GoalFormProps {
  goal?: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalForm({ goal, open, onOpenChange }: GoalFormProps) {
  const isEditing = !!goal;

  const [formData, setFormData] = useState<Partial<Goal>>({
    title: "",
    category: "",
    target_biomarker: "",
    current_value: undefined,
    target_value: undefined,
    direction: "increase",
    status: "active",
    priority: 1,
    notes: "",
  });

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title,
        category: goal.category || "",
        target_biomarker: goal.target_biomarker || "",
        current_value: goal.current_value,
        target_value: goal.target_value,
        direction: goal.direction,
        status: goal.status,
        priority: goal.priority,
        notes: goal.notes || "",
      });
    } else {
      setFormData({
        title: "",
        category: "",
        target_biomarker: "",
        current_value: undefined,
        target_value: undefined,
        direction: "increase",
        status: "active",
        priority: 1,
        notes: "",
      });
    }
  }, [goal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && goal) {
        await updateGoal.mutateAsync({ id: goal.id, data: formData });
        toast.success("Goal updated successfully");
      } else {
        await createGoal.mutateAsync(formData);
        toast.success("Goal created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast.error("Failed to save goal. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!goal) return;

    if (confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal.mutateAsync(goal.id);
        toast.success("Goal deleted");
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to delete goal:", error);
        toast.error("Failed to delete goal. Please try again.");
      }
    }
  };

  const isPending = createGoal.isPending || updateGoal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Goal" : "Add Goal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Reduce LDL cholesterol"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <Select
                value={formData.direction}
                onValueChange={(value) => setFormData({ ...formData, direction: value as Goal["direction"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_biomarker">Target Biomarker (optional)</Label>
            <Input
              id="target_biomarker"
              value={formData.target_biomarker}
              onChange={(e) => setFormData({ ...formData, target_biomarker: e.target.value })}
              placeholder="e.g., LDL Cholesterol"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_value">Current Value</Label>
              <Input
                id="current_value"
                type="number"
                step="any"
                value={formData.current_value ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    current_value: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value</Label>
              <Input
                id="target_value"
                type="number"
                step="any"
                value={formData.target_value ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_value: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Goal["status"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formData.priority ?? 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value ? parseInt(e.target.value) : 1,
                  })
                }
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
              placeholder="Any additional notes about this goal..."
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteGoal.isPending}
                  className="w-full sm:w-auto"
                >
                  {deleteGoal.isPending ? (
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
              <Button type="submit" disabled={isPending || !formData.title} className="w-full sm:w-auto">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Update" : "Add"} Goal
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
