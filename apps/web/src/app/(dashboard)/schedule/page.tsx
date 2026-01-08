"use client";

import { useState, useMemo, DragEvent } from "react";
import { useRoutines } from "@/hooks/useRoutines";
import { useSupplements, useUpdateSupplement } from "@/hooks/useSupplements";
import { useEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { useScheduleItems, useUpdateScheduleItem } from "@/lib/api";
import { useRoutineChanges } from "@/hooks/useRoutineChanges";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DietHeader, AddItemMenu, ChangesBanner } from "@/components/schedule";
import { Supplement, Equipment, RoutineItem, SupplementTiming, ScheduleItem as ScheduleItemType } from "@/types";
import {
  Pill, Zap, Clock, ListTodo, GripVertical,
  Sunrise, Sun, Utensils, Sunset, Moon, BedDouble,
  Atom, Leaf, Bug, MoreHorizontal, LucideIcon,
  FlaskConical, Droplet, Wind, Candy, Square,
  Flame, Footprints, Bike, Waves, Dumbbell, Flower2, Move, Trophy, Activity, Coffee, Cookie
} from "lucide-react";
import { toast } from "sonner";

// Category icons for supplements
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "vitamin_mineral": Pill,
  "amino_protein": Atom,
  "herb_botanical": Leaf,
  "probiotic": Bug,
  "other": MoreHorizontal,
};

// Category icon stroke colors
const CATEGORY_ICON_COLORS: Record<string, string> = {
  "vitamin_mineral": "rgb(234, 179, 8)",
  "amino_protein": "rgb(139, 92, 246)",
  "herb_botanical": "rgb(34, 197, 94)",
  "probiotic": "rgb(236, 72, 153)",
  "other": "rgb(107, 114, 128)",
};

// Timing icons, colors, and row background colors
// Order: Wake, AM, Lunch, PM, Dinner, Evening, Bed
const TIMING_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string; bgColor: string }> = {
  wake_up: { icon: Sunrise, color: "text-orange-400", label: "Wake", bgColor: "rgba(251, 146, 60, 0.08)" },
  morning: { icon: Sunrise, color: "text-orange-400", label: "Morning", bgColor: "rgba(251, 146, 60, 0.08)" }, // legacy alias
  am: { icon: Sun, color: "text-yellow-400", label: "AM", bgColor: "rgba(250, 204, 21, 0.08)" },
  lunch: { icon: Utensils, color: "text-amber-500", label: "Lunch", bgColor: "rgba(245, 158, 11, 0.08)" },
  pm: { icon: Sunset, color: "text-orange-500", label: "PM", bgColor: "rgba(249, 115, 22, 0.08)" },
  dinner: { icon: Utensils, color: "text-purple-400", label: "Dinner", bgColor: "rgba(192, 132, 252, 0.08)" },
  evening: { icon: Moon, color: "text-purple-400", label: "Evening", bgColor: "rgba(192, 132, 252, 0.08)" },
  bed: { icon: BedDouble, color: "text-indigo-400", label: "Bed", bgColor: "rgba(129, 140, 248, 0.08)" },
};

// Intake form icons and colors
const INTAKE_FORM_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  capsule: { icon: Pill, color: "text-blue-400" },
  capsules: { icon: Pill, color: "text-blue-400" },
  powder: { icon: FlaskConical, color: "text-amber-400" },
  liquid: { icon: Droplet, color: "text-cyan-400" },
  spray: { icon: Wind, color: "text-teal-400" },
  gummy: { icon: Candy, color: "text-pink-400" },
  gummies: { icon: Candy, color: "text-pink-400" },
  patch: { icon: Square, color: "text-purple-400" },
  tablet: { icon: Pill, color: "text-slate-400" },
  tablets: { icon: Pill, color: "text-slate-400" },
  softgel: { icon: Pill, color: "text-blue-300" },
  softgels: { icon: Pill, color: "text-blue-300" },
};

// Exercise type icons
const EXERCISE_ICONS: Record<string, LucideIcon> = {
  hiit: Flame,
  run: Footprints,
  bike: Bike,
  swim: Waves,
  strength: Dumbbell,
  yoga: Flower2,
  walk: Footprints,
  stretch: Move,
  sports: Trophy,
  other: Activity,
};

// Meal type icons
const MEAL_ICONS: Record<string, LucideIcon> = {
  meal: Utensils,
  protein_shake: Coffee,
  snack: Cookie,
};

// Day config with abbreviations and colors
const DAY_CONFIG: Record<string, { abbrev: string; color: string; bg: string }> = {
  sun: { abbrev: "Su", color: "text-red-400", bg: "bg-red-500/20" },
  mon: { abbrev: "Mo", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  tue: { abbrev: "Tu", color: "text-pink-400", bg: "bg-pink-500/20" },
  wed: { abbrev: "We", color: "text-green-400", bg: "bg-green-500/20" },
  thu: { abbrev: "Th", color: "text-orange-400", bg: "bg-orange-500/20" },
  fri: { abbrev: "Fr", color: "text-blue-400", bg: "bg-blue-500/20" },
  sat: { abbrev: "Sa", color: "text-purple-400", bg: "bg-purple-500/20" },
  prn: { abbrev: "PRN", color: "text-gray-400", bg: "bg-gray-500/20" },
};

// Day abbreviations for display (legacy - keep for compatibility)
const DAY_ABBREVS: Record<string, string> = {
  sun: "Su",
  mon: "Mo",
  tue: "Tu",
  wed: "We",
  thu: "Th",
  fri: "Fr",
  sat: "Sa",
  prn: "PRN",
};

// Time slots - matching the actual timing options used in forms
const TIME_SLOTS = [
  { value: "wake_up", label: "Wake" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "evening", label: "Evening" },
  { value: "bed", label: "Bed" },
];

// Normalize timing values to canonical form
function normalizeTiming(timing: string): string {
  const lowerTiming = timing.toLowerCase();

  // Direct matches
  if (["wake_up", "am", "lunch", "pm", "dinner", "evening", "bed"].includes(timing)) {
    return timing;
  }

  // Fuzzy matching
  if (lowerTiming.includes("wake") || lowerTiming.includes("shower")) {
    return "wake_up";
  }
  if (lowerTiming.includes("morning") || lowerTiming === "am") {
    return "am";
  }
  if (lowerTiming.includes("lunch") || lowerTiming.includes("midday") || lowerTiming.includes("noon")) {
    return "lunch";
  }
  if (lowerTiming.includes("afternoon") || lowerTiming === "pm") {
    return "pm";
  }
  if (lowerTiming.includes("dinner")) {
    return "dinner";
  }
  if (lowerTiming.includes("evening")) {
    return "evening";
  }
  if (lowerTiming.includes("bed") || lowerTiming.includes("night") || lowerTiming.includes("sleep")) {
    return "bed";
  }

  return "am"; // Default
}

// Unified schedule item type
interface ScheduleItem {
  id: string;
  type: "supplement" | "equipment" | "routine" | "exercise" | "meal";
  name: string;
  brand?: string;
  timing: string;
  timeOfDay: string;
  frequency?: string;
  duration?: string;
  notes?: string;
  days?: string[]; // For filtering by day
  original: Supplement | Equipment | RoutineItem | ScheduleItemType;
  routineName?: string;
  exerciseType?: string;
  mealType?: string;
  isActive?: boolean;
}

// Check if item is "daily" (shows every day) vs "special" (specific days only)
function isDaily(item: ScheduleItem): boolean {
  // If item has specific days that aren't all 7, it's special
  if (item.days && item.days.length > 0 && item.days.length < 7) {
    return false;
  }

  // Handle frequency-based display
  const freq = item.frequency?.toLowerCase() || "";

  // Daily or no frequency = daily
  if (freq === "daily" || freq === "") {
    return true;
  }

  // Custom, weekly, every_other_day, as_needed, etc are special
  if (freq === "custom" || freq.includes("weekly") || freq.includes("1x") || freq.includes("2x") || freq.includes("twice") || freq.includes("3x") || freq.includes("3-5x") || freq === "every_other_day" || freq === "as_needed") {
    return false;
  }

  return true;
}

// Get the days an item shows on for display
function getItemDays(item: ScheduleItem): string[] {
  // Use actual days if set
  if (item.days && item.days.length > 0) {
    return item.days;
  }

  const freq = item.frequency?.toLowerCase() || "";

  // For every_other_day, show alternating days
  if (freq === "every_other_day") {
    return ["sun", "tue", "thu", "sat"];
  }

  // For as_needed, show "PRN" indicator
  if (freq === "as_needed") {
    return ["prn"]; // PRN = pro re nata (as needed)
  }

  if (freq.includes("weekly") || freq.includes("1x")) {
    return ["sun"];
  }

  if (freq.includes("2x") || freq.includes("twice")) {
    return ["sun", "wed"];
  }

  if (freq.includes("3x") || freq.includes("3-5x")) {
    return ["mon", "wed", "fri"];
  }

  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
}

export default function RoutinesPage() {
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<ScheduleItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const { data: routines, isLoading: routinesLoading, error: routinesError } = useRoutines();
  const { data: supplements, isLoading: supplementsLoading } = useSupplements({ is_active: true });
  const { data: inactiveSupplements } = useSupplements({ is_active: false });
  const { data: equipment, isLoading: equipmentLoading } = useEquipment({ is_active: true });
  const { data: inactiveEquipment } = useEquipment({ is_active: false });
  const { data: scheduleItems, isLoading: scheduleItemsLoading } = useScheduleItems();

  const updateSupplement = useUpdateSupplement();
  const updateEquipment = useUpdateEquipment();
  const updateScheduleItem = useUpdateScheduleItem();

  // Routine changes tracking
  const {
    hasUnsavedChanges,
    changes,
    saveRoutine,
    discardChanges,
    isSaving,
  } = useRoutineChanges();

  const isLoading = routinesLoading || supplementsLoading || equipmentLoading || scheduleItemsLoading;
  const error = routinesError;

  // Convert supplements to schedule items
  // Handle both legacy `timing` field and new `timings` array
  const supplementScheduleItems: ScheduleItem[] = useMemo(() => {
    const items: ScheduleItem[] = [];

    (supplements || []).forEach((s) => {
      // Get timings from new array field or fallback to legacy timing field
      const timings = s.timings && s.timings.length > 0
        ? s.timings
        : (s.timing ? [s.timing] : []);

      if (timings.length === 0) return;

      // Create a schedule item for each timing (supplement can appear in multiple slots)
      timings.forEach((timing, idx) => {
        items.push({
          id: `supplement-${s.id}${timings.length > 1 ? `-${idx}` : ''}`,
          type: "supplement" as const,
          name: s.name,
          brand: s.brand,
          timing: timing,
          timeOfDay: normalizeTiming(timing),
          frequency: s.frequency,
          days: s.frequency_days, // Include selected days for Special column
          notes: s.timing_reason || s.reason,
          original: s,
        });
      });
    });

    return items;
  }, [supplements]);

  // Convert equipment to schedule items
  const equipmentScheduleItems: ScheduleItem[] = useMemo(() => {
    return (equipment || [])
      .filter((e) => e.usage_timing)
      .map((e) => ({
        id: `equipment-${e.id}`,
        type: "equipment" as const,
        name: e.name,
        brand: e.brand,
        timing: e.usage_timing!,
        timeOfDay: normalizeTiming(e.usage_timing!),
        frequency: e.usage_frequency,
        duration: e.usage_duration,
        notes: e.usage_protocol,
        original: e,
      }));
  }, [equipment]);

  // Convert routine items to schedule items
  const routineScheduleItems: ScheduleItem[] = useMemo(() => {
    if (!routines) return [];

    const items: ScheduleItem[] = [];
    routines.forEach((routine) => {
      (routine.items || []).forEach((item) => {
        items.push({
          id: `routine-${item.id}`,
          type: "routine" as const,
          name: item.title,
          timing: item.time || routine.time_of_day || "am",
          timeOfDay: normalizeTiming(routine.time_of_day || "am"),
          duration: item.duration,
          notes: item.description,
          days: item.days,
          original: item,
          routineName: routine.name,
        });
      });
    });
    return items;
  }, [routines]);

  // Convert exercises and meals (schedule_items) to schedule items
  const exerciseMealScheduleItems: ScheduleItem[] = useMemo(() => {
    return (scheduleItems || [])
      .filter((s) => s.is_active && s.timing)
      .map((s) => ({
        id: `schedule_item-${s.id}`,
        type: s.item_type as "exercise" | "meal",
        name: s.name,
        timing: s.timing!,
        timeOfDay: normalizeTiming(s.timing!),
        frequency: s.frequency,
        days: s.frequency_days || undefined,
        duration: s.duration || undefined,
        notes: s.notes || undefined,
        original: s,
        exerciseType: s.exercise_type || undefined,
        mealType: s.meal_type || undefined,
        isActive: s.is_active,
      }));
  }, [scheduleItems]);

  // Items without timing (unscheduled) - includes active items without timing
  const unscheduledItems = useMemo(() => {
    const items: ScheduleItem[] = [];

    // Supplements without timing (check both timings array and legacy timing field)
    (supplements || [])
      .filter((s) => (!s.timings || s.timings.length === 0) && !s.timing)
      .forEach((s) => {
        items.push({
          id: `supplement-${s.id}`,
          type: "supplement" as const,
          name: s.name,
          brand: s.brand,
          timing: "",
          timeOfDay: "",
          frequency: s.frequency,
          notes: s.timing_reason || s.reason,
          original: s,
          isActive: true,
        });
      });

    // Equipment without timing
    (equipment || [])
      .filter((e) => !e.usage_timing)
      .forEach((e) => {
        items.push({
          id: `equipment-${e.id}`,
          type: "equipment" as const,
          name: e.name,
          brand: e.brand,
          timing: "",
          timeOfDay: "",
          frequency: e.usage_frequency,
          duration: e.usage_duration,
          notes: e.usage_protocol,
          original: e,
          isActive: true,
        });
      });

    // Schedule items (exercises/meals) without timing
    (scheduleItems || [])
      .filter((s) => s.is_active && !s.timing)
      .forEach((s) => {
        items.push({
          id: `schedule_item-${s.id}`,
          type: s.item_type as "exercise" | "meal",
          name: s.name,
          timing: "",
          timeOfDay: "",
          frequency: s.frequency,
          duration: s.duration || undefined,
          notes: s.notes || undefined,
          original: s,
          exerciseType: s.exercise_type || undefined,
          mealType: s.meal_type || undefined,
          isActive: true,
        });
      });

    return items;
  }, [supplements, equipment, scheduleItems]);

  // Inactive items - shown greyed out in the unscheduled section
  const inactiveItems = useMemo(() => {
    const items: ScheduleItem[] = [];

    // Inactive supplements
    (inactiveSupplements || []).forEach((s) => {
      items.push({
        id: `supplement-${s.id}`,
        type: "supplement" as const,
        name: s.name,
        brand: s.brand,
        timing: "",
        timeOfDay: "",
        frequency: s.frequency,
        notes: s.timing_reason || s.reason,
        original: s,
        isActive: false,
      });
    });

    // Inactive equipment
    (inactiveEquipment || []).forEach((e) => {
      items.push({
        id: `equipment-${e.id}`,
        type: "equipment" as const,
        name: e.name,
        brand: e.brand,
        timing: "",
        timeOfDay: "",
        frequency: e.usage_frequency,
        duration: e.usage_duration,
        notes: e.usage_protocol,
        original: e,
        isActive: false,
      });
    });

    // Inactive schedule items (exercises/meals)
    (scheduleItems || [])
      .filter((s) => !s.is_active)
      .forEach((s) => {
        items.push({
          id: `schedule_item-${s.id}`,
          type: s.item_type as "exercise" | "meal",
          name: s.name,
          timing: "",
          timeOfDay: "",
          frequency: s.frequency,
          duration: s.duration || undefined,
          notes: s.notes || undefined,
          original: s,
          exerciseType: s.exercise_type || undefined,
          mealType: s.meal_type || undefined,
          isActive: false,
        });
      });

    return items;
  }, [inactiveSupplements, inactiveEquipment, scheduleItems]);

  // Combine all schedule items
  const allScheduleItems = useMemo(() => {
    return [...supplementScheduleItems, ...equipmentScheduleItems, ...routineScheduleItems, ...exerciseMealScheduleItems];
  }, [supplementScheduleItems, equipmentScheduleItems, routineScheduleItems, exerciseMealScheduleItems]);

  // Split items into Daily and Special
  const { dailyItems, specialItems } = useMemo(() => {
    const daily: ScheduleItem[] = [];
    const special: ScheduleItem[] = [];

    allScheduleItems.forEach((item) => {
      if (isDaily(item)) {
        daily.push(item);
      } else {
        special.push(item);
      }
    });

    return { dailyItems: daily, specialItems: special };
  }, [allScheduleItems]);

  // Get items for a specific time slot
  const getDailyItemsForTimeSlot = (timeSlot: string): ScheduleItem[] => {
    return dailyItems.filter((item) => item.timeOfDay === timeSlot);
  };

  const getSpecialItemsForTimeSlot = (timeSlot: string): ScheduleItem[] => {
    return specialItems.filter((item) => item.timeOfDay === timeSlot);
  };

  const handleItemClick = (item: ScheduleItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case "supplement":
        return "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30";
      case "equipment":
        return "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30";
      case "routine":
        return "bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30";
      case "exercise":
        return "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30";
      case "meal":
        return "bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30";
      default:
        return "bg-secondary";
    }
  };

  // Get icon based on type and category for supplements
  const getItemIcon = (item: ScheduleItem) => {
    if (item.type === "supplement") {
      const supplement = item.original as Supplement;
      const category = supplement.category || "other";
      const IconComponent = CATEGORY_ICONS[category] || Pill;
      const iconColor = CATEGORY_ICON_COLORS[category] || CATEGORY_ICON_COLORS.other;
      return <IconComponent className="w-3 h-3 flex-shrink-0" style={{ color: iconColor }} />;
    }
    if (item.type === "equipment") {
      return <Zap className="w-3 h-3 flex-shrink-0 text-amber-400" />;
    }
    if (item.type === "routine") {
      return <ListTodo className="w-3 h-3 flex-shrink-0 text-blue-400" />;
    }
    if (item.type === "exercise") {
      const IconComponent = EXERCISE_ICONS[item.exerciseType || "other"] || Activity;
      return <IconComponent className="w-3 h-3 flex-shrink-0 text-purple-400" />;
    }
    if (item.type === "meal") {
      const IconComponent = MEAL_ICONS[item.mealType || "meal"] || Utensils;
      return <IconComponent className="w-3 h-3 flex-shrink-0 text-orange-400" />;
    }
    return null;
  };

  // Get dose/quantity display for supplements
  const getSupplementDose = (item: ScheduleItem): { text: string; icon: LucideIcon; color: string } | null => {
    if (item.type !== "supplement") return null;
    const supplement = item.original as Supplement;

    if (supplement.intake_form) {
      const qty = supplement.intake_quantity || 1;
      const formConfig = INTAKE_FORM_CONFIG[supplement.intake_form.toLowerCase()] || { icon: Pill, color: "text-muted-foreground" };
      return {
        text: `${qty}`,
        icon: formConfig.icon,
        color: formConfig.color,
      };
    }
    if (supplement.intake_quantity) {
      return {
        text: `${supplement.intake_quantity}`,
        icon: Pill,
        color: "text-muted-foreground",
      };
    }
    return null;
  };

  // Format days for display (e.g., "Mo We Fr")
  const formatDaysDisplay = (item: ScheduleItem): string => {
    const days = getItemDays(item);
    return days.map((d) => DAY_ABBREVS[d] || d).join(" ");
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLButtonElement>, item: ScheduleItem) => {
    // Only allow dragging supplements, equipment, exercises, and meals (not routine items)
    if (item.type === "routine") {
      e.preventDefault();
      return;
    }
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, timeSlot: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget !== timeSlot) {
      setDropTarget(timeSlot);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, newTiming: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedItem) return;

    // Don't update if dropped in same slot
    if (draggedItem.timeOfDay === newTiming) {
      setDraggedItem(null);
      return;
    }

    try {
      if (draggedItem.type === "supplement") {
        const supplement = draggedItem.original as Supplement;
        // Get current timings and update the dragged one
        const currentTimings = supplement.timings && supplement.timings.length > 0
          ? [...supplement.timings]
          : (supplement.timing ? [supplement.timing] : []);

        // Find and replace the timing that was dragged
        const oldTiming = draggedItem.timing;
        const timingIndex = currentTimings.indexOf(oldTiming);

        let newTimings: SupplementTiming[];
        if (timingIndex >= 0) {
          // Replace the specific timing that was dragged
          newTimings = [...currentTimings] as SupplementTiming[];
          newTimings[timingIndex] = newTiming as SupplementTiming;
        } else {
          // Fallback: replace all with new timing
          newTimings = [newTiming as SupplementTiming];
        }

        await updateSupplement.mutateAsync({
          id: supplement.id,
          data: { timings: newTimings, timing: newTiming },
        });
        toast.success(`Moved ${draggedItem.name} to ${TIME_SLOTS.find(s => s.value === newTiming)?.label || newTiming}`);
      } else if (draggedItem.type === "equipment") {
        const equipmentItem = draggedItem.original as Equipment;
        await updateEquipment.mutateAsync({
          id: equipmentItem.id,
          data: { usage_timing: newTiming },
        });
        toast.success(`Moved ${draggedItem.name} to ${TIME_SLOTS.find(s => s.value === newTiming)?.label || newTiming}`);
      } else if (draggedItem.type === "exercise" || draggedItem.type === "meal") {
        const scheduleItem = draggedItem.original as ScheduleItemType;
        await updateScheduleItem.mutateAsync({
          id: scheduleItem.id,
          data: { timing: newTiming },
        });
        toast.success(`Moved ${draggedItem.name} to ${TIME_SLOTS.find(s => s.value === newTiming)?.label || newTiming}`);
      }
    } catch (error) {
      toast.error("Failed to update timing");
    }

    setDraggedItem(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground text-sm">Your health protocols</p>
        </div>
        <AddItemMenu />
      </div>

      {/* Diet Header */}
      <DietHeader />

      {/* Changes Banner */}
      <ChangesBanner
        hasChanges={hasUnsavedChanges}
        changes={changes}
        onSave={saveRoutine}
        onDiscard={discardChanges}
        isSaving={isSaving}
      />

      {/* Two Column Layout: Daily | Special */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Column Headers */}
        <div className="grid grid-cols-[80px_1fr_1fr] border-b bg-muted/30">
          <div className="p-3 border-r" />
          <div className="p-3 border-r text-center font-semibold">Daily</div>
          <div className="p-3 text-center font-semibold">Special</div>
        </div>

        {/* Time Slots */}
        {TIME_SLOTS.map((slot) => {
          const dailyForSlot = getDailyItemsForTimeSlot(slot.value);
          const specialForSlot = getSpecialItemsForTimeSlot(slot.value);
          const hasItems = dailyForSlot.length > 0 || specialForSlot.length > 0;
          const isDropTarget = dropTarget === slot.value;
          const timingConfig = TIMING_CONFIG[slot.value];
          const TimingIcon = timingConfig?.icon || Sun;

          // Always show all time slots so user can see full day structure and drag items anywhere

          return (
            <div
              key={slot.value}
              className={`grid grid-cols-[80px_1fr_1fr] border-b last:border-b-0 transition-colors relative overflow-hidden ${
                isDropTarget ? "bg-primary/10" : ""
              }`}
              style={{ backgroundColor: isDropTarget ? undefined : timingConfig?.bgColor }}
              onDragOver={(e) => handleDragOver(e, slot.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot.value)}
            >
              {/* Time Label with Icon */}
              <div className={`p-2 border-r bg-muted/30 text-xs font-medium flex items-center gap-1.5 ${timingConfig?.color || "text-muted-foreground"}`}>
                <TimingIcon className="w-3.5 h-3.5" />
                {slot.label}
              </div>

              {/* Daily Column - 3 columns */}
              <div className={`p-2 border-r min-h-[40px] ${isDropTarget ? "ring-2 ring-primary/50 ring-inset" : ""}`}>
                <div className="grid grid-cols-3 gap-1">
                  {dailyForSlot.map((item) => {
                    const dose = getSupplementDose(item);
                    const DoseIcon = dose?.icon;
                    return (
                      <button
                        key={item.id}
                        draggable={item.type !== "routine"}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleItemClick(item)}
                        className={`text-left p-1 rounded border text-[11px] transition-colors ${
                          item.type !== "routine" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                        } ${getItemColor(item.type)} ${
                          draggedItem?.id === item.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {getItemIcon(item)}
                          <span className="truncate font-medium flex-1">{item.name}</span>
                          {dose && DoseIcon && (
                            <span className={`flex items-center gap-0.5 text-[10px] ${dose.color}`}>
                              {dose.text}<DoseIcon className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Column - 3 columns like Daily */}
              <div className={`p-2 min-h-[40px] ${isDropTarget ? "ring-2 ring-primary/50 ring-inset" : ""}`}>
                <div className="grid grid-cols-3 gap-1">
                  {specialForSlot.map((item) => {
                    const dose = getSupplementDose(item);
                    const DoseIcon = dose?.icon;
                    const itemDays = getItemDays(item);
                    return (
                      <button
                        key={item.id}
                        draggable={item.type !== "routine"}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleItemClick(item)}
                        className={`text-left p-1 rounded border text-[11px] transition-colors ${
                          item.type !== "routine" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                        } ${getItemColor(item.type)} ${
                          draggedItem?.id === item.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {getItemIcon(item)}
                          <span className="truncate font-medium flex-1">{item.name}</span>
                          {dose && DoseIcon && (
                            <span className={`flex items-center gap-0.5 text-[10px] ${dose.color}`}>
                              {dose.text}<DoseIcon className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        {/* Colored day badges */}
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {itemDays.map((day) => {
                            const dayConfig = DAY_CONFIG[day];
                            return (
                              <span
                                key={day}
                                className={`text-[8px] px-1 rounded ${dayConfig?.bg || "bg-gray-500/20"} ${dayConfig?.color || "text-gray-400"}`}
                              >
                                {dayConfig?.abbrev || day}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Large timing icon as background watermark - bottom right */}
              <div className="absolute -bottom-3 -right-3 opacity-10 pointer-events-none">
                <TimingIcon className={`w-20 h-20 ${timingConfig?.color || "text-muted-foreground"}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled / Inactive Section */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="p-3 bg-muted/30 border-b">
          <h2 className="text-sm font-semibold text-muted-foreground">Unscheduled / Inactive</h2>
        </div>
        <div className="p-3 min-h-[50px]">
          {unscheduledItems.length > 0 || inactiveItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {/* Unscheduled items (active, no timing) */}
              {unscheduledItems.map((item) => {
                const dose = getSupplementDose(item);
                const DoseIcon = dose?.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`text-left px-2 py-1 rounded border text-xs transition-colors cursor-pointer ${getItemColor(item.type)}`}
                  >
                    <div className="flex items-center gap-1">
                      {getItemIcon(item)}
                      <span className="font-medium">{item.name}</span>
                      {dose && DoseIcon && (
                        <span className={`flex items-center gap-0.5 text-[10px] ${dose.color}`}>
                          {dose.text}<DoseIcon className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {/* Inactive items (greyed out) */}
              {inactiveItems.map((item) => {
                const dose = getSupplementDose(item);
                const DoseIcon = dose?.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`text-left px-2 py-1 rounded border text-xs transition-colors cursor-pointer opacity-40 grayscale ${getItemColor(item.type)}`}
                  >
                    <div className="flex items-center gap-1">
                      {getItemIcon(item)}
                      <span className="font-medium">{item.name}</span>
                      {dose && DoseIcon && (
                        <span className={`flex items-center gap-0.5 text-[10px] ${dose.color}`}>
                          {dose.text}<DoseIcon className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">All items have a scheduled time</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
          <span>Supplements</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
          <span>Equipment</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500/50" />
          <span>Routines</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-500/50" />
          <span>Exercise</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50" />
          <span>Meals</span>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getItemIcon(selectedItem)}
              {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.brand && (
                <p className="text-muted-foreground">{selectedItem.brand}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">
                  {selectedItem.type}
                </Badge>
                {selectedItem.timing && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedItem.timing}
                  </Badge>
                )}
                {selectedItem.frequency && (
                  <Badge variant="outline">
                    {selectedItem.frequency}
                  </Badge>
                )}
                {selectedItem.duration && (
                  <Badge variant="outline">
                    {selectedItem.duration}
                  </Badge>
                )}
              </div>

              {selectedItem.routineName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Part of: </span>
                  <span>{selectedItem.routineName}</span>
                </div>
              )}

              {selectedItem.notes && (
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">Notes</div>
                  <p>{selectedItem.notes}</p>
                </div>
              )}

              {/* Show more details based on type */}
              {selectedItem.type === "supplement" && (
                <SupplementDetails supplement={selectedItem.original as Supplement} />
              )}

              {selectedItem.type === "equipment" && (
                <EquipmentDetails equipment={selectedItem.original as Equipment} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Supplement detail section
function SupplementDetails({ supplement }: { supplement: Supplement }) {
  return (
    <div className="space-y-2 text-sm border-t pt-4">
      {supplement.dose_per_serving && supplement.dose_unit && (
        <div>
          <span className="text-muted-foreground">Dose: </span>
          <span>{supplement.dose_per_serving} {supplement.dose_unit}</span>
        </div>
      )}
      {supplement.intake_quantity && supplement.intake_form && (
        <div>
          <span className="text-muted-foreground">Intake: </span>
          <span>{supplement.intake_quantity} {supplement.intake_form}</span>
        </div>
      )}
      {supplement.reason && (
        <div>
          <span className="text-muted-foreground">Reason: </span>
          <span>{supplement.reason}</span>
        </div>
      )}
      {supplement.mechanism && (
        <div>
          <span className="text-muted-foreground">How it works: </span>
          <span>{supplement.mechanism}</span>
        </div>
      )}
    </div>
  );
}

// Equipment detail section
function EquipmentDetails({ equipment }: { equipment: Equipment }) {
  return (
    <div className="space-y-2 text-sm border-t pt-4">
      {equipment.model && (
        <div>
          <span className="text-muted-foreground">Model: </span>
          <span>{equipment.model}</span>
        </div>
      )}
      {equipment.category && (
        <div>
          <span className="text-muted-foreground">Category: </span>
          <span className="capitalize">{equipment.category}</span>
        </div>
      )}
      {equipment.purpose && (
        <div>
          <span className="text-muted-foreground">Purpose: </span>
          <span>{equipment.purpose}</span>
        </div>
      )}
      {equipment.contraindications && (
        <div className="text-amber-500">
          <span className="text-muted-foreground">Contraindications: </span>
          <span>{equipment.contraindications}</span>
        </div>
      )}
    </div>
  );
}
