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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { ExerciseType, SupplementTiming, DayOfWeek } from "@singularity/shared-types";
import {
  Flame,
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Flower2,
  Move,
  Trophy,
  Activity,
  LucideIcon,
} from "lucide-react";

const EXERCISE_TYPES: { value: ExerciseType; label: string; icon: LucideIcon }[] = [
  { value: "hiit", label: "HIIT", icon: Flame },
  { value: "run", label: "Run", icon: Footprints },
  { value: "bike", label: "Bike", icon: Bike },
  { value: "swim", label: "Swim", icon: Waves },
  { value: "strength", label: "Strength", icon: Dumbbell },
  { value: "yoga", label: "Yoga", icon: Flower2 },
  { value: "walk", label: "Walk", icon: Footprints },
  { value: "stretch", label: "Stretch", icon: Move },
  { value: "sports", label: "Sports", icon: Trophy },
  { value: "other", label: "Other", icon: Activity },
];

const TIME_SLOTS: { value: SupplementTiming; label: string }[] = [
  { value: "wake_up", label: "Wake" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "evening", label: "Evening" },
  { value: "bed", label: "Bed" },
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

interface AddExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExerciseModal({ open, onOpenChange }: AddExerciseModalProps) {
  const [exerciseType, setExerciseType] = useState<ExerciseType>("hiit");
  const [name, setName] = useState("");
  const [timing, setTiming] = useState<SupplementTiming>("am");
  const [frequency, setFrequency] = useState("daily");
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [duration, setDuration] = useState("");

  const createScheduleItem = useCreateScheduleItem();

  const handleSave = async () => {
    const exerciseName =
      name || EXERCISE_TYPES.find((e) => e.value === exerciseType)?.label || "Exercise";

    try {
      await createScheduleItem.mutateAsync({
        item_type: "exercise",
        name: exerciseName,
        exercise_type: exerciseType,
        timing,
        frequency,
        frequency_days: frequency === "custom" ? selectedDays : undefined,
        duration: duration || undefined,
      });
      toast.success(`Added ${exerciseName}`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add exercise");
    }
  };

  const resetForm = () => {
    setExerciseType("hiit");
    setName("");
    setTiming("am");
    setFrequency("daily");
    setSelectedDays([]);
    setDuration("");
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
            <Dumbbell className="w-5 h-5 text-purple-400" />
            Add Exercise
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Exercise Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={exerciseType}
              onValueChange={(v) => setExerciseType(v as ExerciseType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_TYPES.map((type) => {
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
                EXERCISE_TYPES.find((e) => e.value === exerciseType)?.label ||
                "Exercise"
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

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              placeholder="30 min"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createScheduleItem.isPending}>
            {createScheduleItem.isPending ? "Adding..." : "Add Exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
