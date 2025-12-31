"use client";

import { useState, useMemo } from "react";
import { useRoutines, filterRoutineItemsByDay } from "@/hooks/useRoutines";
import { useSupplements } from "@/hooks/useSupplements";
import { useEquipment } from "@/hooks/useEquipment";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Supplement, Equipment, RoutineItem, Routine } from "@/types";
import { Pill, Zap, Clock, Calendar, ListTodo } from "lucide-react";

// Days of the week
const DAYS = [
  { value: "sun", label: "SUN", fullLabel: "Sunday" },
  { value: "mon", label: "MON", fullLabel: "Monday" },
  { value: "tue", label: "TUE", fullLabel: "Tuesday" },
  { value: "wed", label: "WED", fullLabel: "Wednesday" },
  { value: "thu", label: "THU", fullLabel: "Thursday" },
  { value: "fri", label: "FRI", fullLabel: "Friday" },
  { value: "sat", label: "SAT", fullLabel: "Saturday" },
];

// Time slots
const TIME_SLOTS = [
  { value: "morning", label: "Morning", timeRange: "6 AM - 12 PM" },
  { value: "afternoon", label: "Afternoon", timeRange: "12 PM - 5 PM" },
  { value: "evening", label: "Evening", timeRange: "5 PM - 9 PM" },
  { value: "night", label: "Night", timeRange: "9 PM - 6 AM" },
];

// Map timing values to time of day
const TIMING_TO_TIME_OF_DAY: Record<string, string> = {
  wake_up: "morning",
  am: "morning",
  lunch: "afternoon",
  pm: "afternoon",
  dinner: "evening",
  before_bed: "night",
  all_night: "night",
  specific: "morning",
};

// Smart function to determine time of day from various timing formats
function getTimeOfDay(timing: string): string {
  const lowerTiming = timing.toLowerCase();

  if (TIMING_TO_TIME_OF_DAY[timing]) {
    return TIMING_TO_TIME_OF_DAY[timing];
  }

  if (lowerTiming.includes("wake") || lowerTiming.includes("morning") || lowerTiming.includes("am") || lowerTiming.includes("shower")) {
    return "morning";
  }
  if (lowerTiming.includes("lunch") || lowerTiming.includes("afternoon") || lowerTiming.includes("midday")) {
    return "afternoon";
  }
  if (lowerTiming.includes("evening") || lowerTiming.includes("dinner") || lowerTiming.includes("pm")) {
    return "evening";
  }
  if (lowerTiming.includes("night") || lowerTiming.includes("bed") || lowerTiming.includes("sleep")) {
    return "night";
  }

  return "morning";
}

// Get current day abbreviation
function getCurrentDayAbbrev(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
}

// Get dates for the current week
function getWeekDates(): Date[] {
  const today = new Date();
  const currentDay = today.getDay();
  const dates: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);
    dates.push(date);
  }

  return dates;
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

// Check if item should show on a specific day based on frequency
function shouldShowOnDay(item: ScheduleItem, dayValue: string): boolean {
  // If item has specific days set, use those
  if (item.days && item.days.length > 0) {
    return item.days.includes(dayValue);
  }

  // Handle frequency-based display
  const freq = item.frequency?.toLowerCase() || "";

  if (freq.includes("daily") || freq === "") {
    return true; // Show every day
  }

  if (freq.includes("weekly") || freq.includes("1x")) {
    // Show only on one day (e.g., Sunday)
    return dayValue === "sun";
  }

  if (freq.includes("2x") || freq.includes("twice")) {
    // Show on Sun and Wed
    return dayValue === "sun" || dayValue === "wed";
  }

  if (freq.includes("3x") || freq.includes("3-5x")) {
    // Show on Mon, Wed, Fri
    return dayValue === "mon" || dayValue === "wed" || dayValue === "fri";
  }

  // Default: show every day
  return true;
}

export default function RoutinesPage() {
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: routines, isLoading: routinesLoading, error: routinesError } = useRoutines();
  const { data: supplements, isLoading: supplementsLoading } = useSupplements({ is_active: true });
  const { data: equipment, isLoading: equipmentLoading } = useEquipment({ is_active: true });

  const isLoading = routinesLoading || supplementsLoading || equipmentLoading;
  const error = routinesError;

  const todayAbbrev = getCurrentDayAbbrev();
  const weekDates = useMemo(() => getWeekDates(), []);

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
        timeOfDay: getTimeOfDay(s.timing!),
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
        timeOfDay: getTimeOfDay(e.usage_timing!),
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
          timing: item.time || routine.time_of_day || "morning",
          timeOfDay: routine.time_of_day || "morning",
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

  // Get items for a specific day and time slot
  const getItemsForCell = (dayValue: string, timeSlot: string): ScheduleItem[] => {
    return allScheduleItems.filter(
      (item) => item.timeOfDay === timeSlot && shouldShowOnDay(item, dayValue)
    );
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
        return <Pill className="w-3 h-3" />;
      case "equipment":
        return <Zap className="w-3 h-3" />;
      case "routine":
        return <ListTodo className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
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
          <p className="text-muted-foreground text-sm">Your weekly health protocols</p>
        </div>
      </div>

      {/* Week Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Day Headers */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
          <div className="p-2 border-r bg-muted/30" />
          {DAYS.map((day, index) => {
            const isToday = day.value === todayAbbrev;
            const date = weekDates[index];

            return (
              <div
                key={day.value}
                className={`p-2 text-center border-r last:border-r-0 ${
                  isToday ? "bg-primary/10" : ""
                }`}
              >
                <div className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day.label}
                </div>
                <div
                  className={`text-lg font-bold ${
                    isToday
                      ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                      : ""
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Slots */}
        {TIME_SLOTS.map((slot) => (
          <div key={slot.value} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0 min-h-[120px]">
            {/* Time Label */}
            <div className="p-2 border-r bg-muted/30 text-xs text-muted-foreground">
              <div className="font-medium">{slot.label}</div>
              <div className="text-[10px]">{slot.timeRange}</div>
            </div>

            {/* Day Cells */}
            {DAYS.map((day) => {
              const items = getItemsForCell(day.value, slot.value);
              const isToday = day.value === todayAbbrev;

              return (
                <div
                  key={`${day.value}-${slot.value}`}
                  className={`p-1 border-r last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}
                >
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`w-full text-left p-1.5 rounded border text-xs transition-colors cursor-pointer ${getItemColor(
                          item.type
                        )}`}
                      >
                        <div className="flex items-center gap-1">
                          {getItemIcon(item.type)}
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
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
