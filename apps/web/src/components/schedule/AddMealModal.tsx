"use client";

import { useState } from "react";
import { useCreateScheduleItem } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { MealType, SupplementTiming, DayOfWeek } from "@singularity/shared-types";
import { Utensils, Coffee, Cookie, LucideIcon } from "lucide-react";

const MEAL_TYPES: { value: MealType; label: string; icon: LucideIcon }[] = [
  { value: "meal", label: "Meal", icon: Utensils },
  { value: "protein_shake", label: "Protein Shake", icon: Coffee },
  { value: "snack", label: "Snack", icon: Cookie },
];

const TIME_SLOTS: { value: SupplementTiming; label: string }[] = [
  { value: "wake_up", label: "Wake" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "before_bed", label: "Before Bed" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_other_day", label: "Every Other Day" },
  { value: "custom", label: "Custom Days" },
  { value: "as_needed", label: "As Needed" },
];

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "sun", label: "Su" },
  { value: "mon", label: "Mo" },
  { value: "tue", label: "Tu" },
  { value: "wed", label: "We" },
  { value: "thu", label: "Th" },
  { value: "fri", label: "Fr" },
  { value: "sat", label: "Sa" },
];

interface AddMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMealModal({ open, onOpenChange }: AddMealModalProps) {
  const [mealType, setMealType] = useState<MealType>("meal");
  const [name, setName] = useState("");
  const [timing, setTiming] = useState<SupplementTiming>("lunch");
  const [frequency, setFrequency] = useState("daily");
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);

  const createScheduleItem = useCreateScheduleItem();

  const handleSave = async () => {
    const mealName =
      name || MEAL_TYPES.find((m) => m.value === mealType)?.label || "Meal";

    try {
      await createScheduleItem.mutateAsync({
        item_type: "meal",
        name: mealName,
        meal_type: mealType,
        timing,
        frequency,
        frequency_days: frequency === "custom" ? selectedDays : undefined,
      });
      toast.success(`Added ${mealName}`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add meal");
    }
  };

  const resetForm = () => {
    setMealType("meal");
    setName("");
    setTiming("lunch");
    setFrequency("daily");
    setSelectedDays([]);
  };

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-400" />
            Add Meal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Meal Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={mealType}
              onValueChange={(v) => setMealType(v as MealType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder={
                MEAL_TYPES.find((m) => m.value === mealType)?.label || "Meal"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Timing */}
          <div className="space-y-2">
            <Label>Time of Day</Label>
            <Select
              value={timing}
              onValueChange={(v) => setTiming(v as SupplementTiming)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
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

          {/* Custom Days */}
          {frequency === "custom" && (
            <div className="space-y-2">
              <Label>Days</Label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    className="w-9 h-9 p-0"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createScheduleItem.isPending}>
            {createScheduleItem.isPending ? "Adding..." : "Add Meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
