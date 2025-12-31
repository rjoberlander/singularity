"use client";

import { useState, useMemo, DragEvent } from "react";
import { useRoutines } from "@/hooks/useRoutines";
import { useSupplements, useUpdateSupplement } from "@/hooks/useSupplements";
import { useEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Supplement, Equipment, RoutineItem } from "@/types";
import { Pill, Zap, Clock, ListTodo, GripVertical } from "lucide-react";
import { toast } from "sonner";

// Day abbreviations for display
const DAY_ABBREVS: Record<string, string> = {
  sun: "Su",
  mon: "Mo",
  tue: "Tu",
  wed: "We",
  thu: "Th",
  fri: "Fr",
  sat: "Sa",
};

// Time slots - matching the actual timing options used in forms
const TIME_SLOTS = [
  { value: "wake_up", label: "Wake" },
  { value: "am", label: "AM" },
  { value: "lunch", label: "Lunch" },
  { value: "pm", label: "PM" },
  { value: "dinner", label: "Dinner" },
  { value: "before_bed", label: "Before Bed" },
];

// Normalize timing values to canonical form
function normalizeTiming(timing: string): string {
  const lowerTiming = timing.toLowerCase();

  // Direct matches
  if (["wake_up", "am", "lunch", "pm", "dinner", "before_bed"].includes(timing)) {
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
  if (lowerTiming.includes("dinner") || lowerTiming.includes("evening")) {
    return "dinner";
  }
  if (lowerTiming.includes("bed") || lowerTiming.includes("night") || lowerTiming.includes("sleep")) {
    return "before_bed";
  }

  return "am"; // Default
}

// Unified schedule item type
interface ScheduleItem {
  id: string;
  type: "supplement" | "equipment" | "routine";
  name: string;
  brand?: string;
  timing: string;
  timeOfDay: string;
  frequency?: string;
  duration?: string;
  notes?: string;
  days?: string[]; // For filtering by day
  original: Supplement | Equipment | RoutineItem;
  routineName?: string;
}

// Check if item is "daily" (shows every day) vs "special" (specific days only)
function isDaily(item: ScheduleItem): boolean {
  // If item has specific days that aren't all 7, it's special
  if (item.days && item.days.length > 0 && item.days.length < 7) {
    return false;
  }

  // Handle frequency-based display
  const freq = item.frequency?.toLowerCase() || "";

  if (freq.includes("daily") || freq === "") {
    return true;
  }

  // Weekly, 2x, 3x etc are special
  if (freq.includes("weekly") || freq.includes("1x") || freq.includes("2x") || freq.includes("twice") || freq.includes("3x") || freq.includes("3-5x")) {
    return false;
  }

  return true;
}

// Get the days an item shows on for display
function getItemDays(item: ScheduleItem): string[] {
  if (item.days && item.days.length > 0) {
    return item.days;
  }

  const freq = item.frequency?.toLowerCase() || "";

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
  const { data: equipment, isLoading: equipmentLoading } = useEquipment({ is_active: true });

  const updateSupplement = useUpdateSupplement();
  const updateEquipment = useUpdateEquipment();

  const isLoading = routinesLoading || supplementsLoading || equipmentLoading;
  const error = routinesError;

  // Convert supplements to schedule items
  const supplementScheduleItems: ScheduleItem[] = useMemo(() => {
    return (supplements || [])
      .filter((s) => s.timing)
      .map((s) => ({
        id: `supplement-${s.id}`,
        type: "supplement" as const,
        name: s.name,
        brand: s.brand,
        timing: s.timing!,
        timeOfDay: normalizeTiming(s.timing!),
        frequency: s.frequency,
        notes: s.timing_reason || s.reason,
        original: s,
      }));
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

  // Combine all schedule items
  const allScheduleItems = useMemo(() => {
    return [...supplementScheduleItems, ...equipmentScheduleItems, ...routineScheduleItems];
  }, [supplementScheduleItems, equipmentScheduleItems, routineScheduleItems]);

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
      default:
        return "bg-secondary";
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "supplement":
        return <Pill className="w-3 h-3 flex-shrink-0" />;
      case "equipment":
        return <Zap className="w-3 h-3 flex-shrink-0" />;
      case "routine":
        return <ListTodo className="w-3 h-3 flex-shrink-0" />;
      default:
        return null;
    }
  };

  // Format days for display (e.g., "Mo We Fr")
  const formatDaysDisplay = (item: ScheduleItem): string => {
    const days = getItemDays(item);
    return days.map((d) => DAY_ABBREVS[d] || d).join(" ");
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLButtonElement>, item: ScheduleItem) => {
    // Only allow dragging supplements and equipment (not routine items)
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
        await updateSupplement.mutateAsync({
          id: supplement.id,
          data: { timing: newTiming },
        });
        toast.success(`Moved ${draggedItem.name} to ${TIME_SLOTS.find(s => s.value === newTiming)?.label || newTiming}`);
      } else if (draggedItem.type === "equipment") {
        const equipment = draggedItem.original as Equipment;
        await updateEquipment.mutateAsync({
          id: equipment.id,
          data: { usage_timing: newTiming },
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
      </div>

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

          // Show all slots when dragging, otherwise only show slots with items
          if (!hasItems && !draggedItem) return null;

          return (
            <div
              key={slot.value}
              className={`grid grid-cols-[80px_1fr_1fr] border-b last:border-b-0 transition-colors ${
                isDropTarget ? "bg-primary/10" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, slot.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot.value)}
            >
              {/* Time Label */}
              <div className="p-2 border-r bg-muted/30 text-xs text-muted-foreground font-medium">
                {slot.label}
              </div>

              {/* Daily Column - 3 columns */}
              <div className={`p-2 border-r min-h-[40px] ${isDropTarget ? "ring-2 ring-primary/50 ring-inset" : ""}`}>
                <div className="grid grid-cols-3 gap-1">
                  {dailyForSlot.map((item) => (
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
                        {getItemIcon(item.type)}
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Column - 2 columns */}
              <div className={`p-2 min-h-[40px] ${isDropTarget ? "ring-2 ring-primary/50 ring-inset" : ""}`}>
                <div className="grid grid-cols-2 gap-1">
                  {specialForSlot.map((item) => (
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
                        {getItemIcon(item.type)}
                        <span className="truncate font-medium flex-1">{item.name}</span>
                        <span className="text-[9px] opacity-70 flex-shrink-0">{formatDaysDisplay(item)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
      </div>

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getItemIcon(selectedItem.type)}
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
