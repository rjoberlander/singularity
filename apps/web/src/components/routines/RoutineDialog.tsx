"use client";

import { useState, useEffect } from "react";
import { Routine, RoutineItem } from "@/types";
import { useCreateRoutine, useUpdateRoutine, useDeleteRoutine } from "@/hooks/useRoutines";
import { useSupplements } from "@/hooks/useSupplements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const TIME_OF_DAY_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const DAYS_OF_WEEK = [
  { value: "sun", label: "S" },
  { value: "mon", label: "M" },
  { value: "tue", label: "T" },
  { value: "wed", label: "W" },
  { value: "thu", label: "T" },
  { value: "fri", label: "F" },
  { value: "sat", label: "S" },
];

interface RoutineFormItem {
  id?: string;
  title: string;
  description: string;
  time: string;
  duration: string;
  days: string[];
  linked_supplement: string;
  sort_order: number;
}

interface RoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: Routine | null;
  onSuccess?: () => void;
}

export function RoutineDialog({
  open,
  onOpenChange,
  routine,
  onSuccess,
}: RoutineDialogProps) {
  const isEdit = !!routine;
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();
  const { data: supplements } = useSupplements();

  const [name, setName] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [items, setItems] = useState<RoutineFormItem[]>([]);

  useEffect(() => {
    if (routine) {
      setName(routine.name);
      setTimeOfDay(routine.time_of_day || "");
      setItems(
        routine.items?.map((item, index) => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          time: item.time || "",
          duration: item.duration || "",
          days: item.days || [],
          linked_supplement: item.linked_supplement || "",
          sort_order: item.sort_order ?? index,
        })) || []
      );
    } else {
      resetForm();
    }
  }, [routine, open]);

  const resetForm = () => {
    setName("");
    setTimeOfDay("");
    setItems([]);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        title: "",
        description: "",
        time: "",
        duration: "",
        days: [],
        linked_supplement: "",
        sort_order: items.length,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof RoutineFormItem,
    value: string | string[] | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const toggleDay = (itemIndex: number, day: string) => {
    const item = items[itemIndex];
    const newDays = item.days.includes(day)
      ? item.days.filter((d) => d !== day)
      : [...item.days, day];
    handleItemChange(itemIndex, "days", newDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build routine data - API will handle routine_id and created_at for items
    const routineData: Partial<Routine> = {
      name,
      time_of_day: timeOfDay || undefined,
    };

    // Add items as a separate field that the API expects
    const payload = {
      ...routineData,
      items: items.map((item, index) => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        time: item.time || undefined,
        duration: item.duration || undefined,
        days: item.days,
        linked_supplement: item.linked_supplement || undefined,
        sort_order: index,
      })),
    };

    try {
      if (isEdit && routine) {
        await updateRoutine.mutateAsync({ id: routine.id, data: payload as Partial<Routine> });
        toast.success("Routine updated successfully");
      } else {
        await createRoutine.mutateAsync(payload as Partial<Routine>);
        toast.success("Routine created successfully");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save routine:", error);
      toast.error("Failed to save routine. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!routine || !confirm("Are you sure you want to delete this routine?")) {
      return;
    }

    try {
      await deleteRoutine.mutateAsync(routine.id);
      toast.success("Routine deleted");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete routine:", error);
      toast.error("Failed to delete routine. Please try again.");
    }
  };

  const isPending =
    createRoutine.isPending || updateRoutine.isPending || deleteRoutine.isPending;

  const activeSupplements = supplements?.filter((s) => s.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Routine" : "Add Routine"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your routine and its items"
              : "Create a new routine with items to track"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Routine Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Routine Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Protocol"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeOfDay">Time of Day</Label>
              <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OF_DAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Routine Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Routine Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">
                  No items yet. Click &quot;Add Item&quot; to add your first routine item.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3 bg-secondary/20"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground mt-2 cursor-grab" />
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              handleItemChange(index, "title", e.target.value)
                            }
                            placeholder="Item title"
                            className="flex-1"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        <Textarea
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(index, "description", e.target.value)
                          }
                          placeholder="Description (optional)"
                          rows={2}
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            value={item.time}
                            onChange={(e) =>
                              handleItemChange(index, "time", e.target.value)
                            }
                            placeholder="Time (e.g., 7:00 AM)"
                          />
                          <Input
                            value={item.duration}
                            onChange={(e) =>
                              handleItemChange(index, "duration", e.target.value)
                            }
                            placeholder="Duration (e.g., 30 min)"
                          />
                          <Select
                            value={item.linked_supplement}
                            onValueChange={(value) =>
                              handleItemChange(index, "linked_supplement", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Link supplement" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {activeSupplements.map((supp) => (
                                <SelectItem key={supp.id} value={supp.name}>
                                  {supp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Days of Week</Label>
                          <div className="flex gap-1">
                            {DAYS_OF_WEEK.map((day) => (
                              <Button
                                key={day.value}
                                type="button"
                                variant={
                                  item.days.includes(day.value)
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => toggleDay(index, day.value)}
                              >
                                {day.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="sm:mr-auto"
              >
                {deleteRoutine.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Delete Routine
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {(createRoutine.isPending || updateRoutine.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEdit ? "Save Changes" : "Create Routine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
