"use client";

import { useState } from "react";
import { useRoutines, getCurrentDayAbbrev, filterRoutineItemsByDay } from "@/hooks/useRoutines";
import { RoutineCard } from "@/components/routines/RoutineCard";
import { RoutineDialog } from "@/components/routines/RoutineDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Routine } from "@/types";
import { Plus, Calendar, Clock } from "lucide-react";

const DAYS = [
  { value: "sun", label: "Sun" },
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
];

const TIME_OF_DAY_ORDER = ["morning", "afternoon", "evening", "night"];

export default function RoutinesPage() {
  const [selectedDay, setSelectedDay] = useState(getCurrentDayAbbrev());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const { data: routines, isLoading, error } = useRoutines();

  // Sort routines by time of day
  const sortedRoutines = routines?.sort((a, b) => {
    const aIndex = TIME_OF_DAY_ORDER.indexOf(a.time_of_day || "");
    const bIndex = TIME_OF_DAY_ORDER.indexOf(b.time_of_day || "");
    if (aIndex === -1 && bIndex === -1) return a.sort_order - b.sort_order;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Filter routine items by selected day
  const filteredRoutines = sortedRoutines?.map((routine) => ({
    ...routine,
    items: filterRoutineItemsByDay(routine.items || [], selectedDay),
  }));

  const handleAddRoutine = () => {
    setEditingRoutine(null);
    setDialogOpen(true);
  };

  const handleEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingRoutine(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Routines</h1>
          <p className="text-muted-foreground">Your daily health protocols</p>
        </div>
        <Button onClick={handleAddRoutine}>
          <Plus className="w-4 h-4 mr-2" />
          Add Routine
        </Button>
      </div>

      {/* Routine Dialog */}
      <RoutineDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        routine={editingRoutine}
      />

      {/* Day Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1">
          {DAYS.map((day) => (
            <Button
              key={day.value}
              variant={selectedDay === day.value ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedDay(day.value)}
              className="w-10 shrink-0"
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load routines</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again
          </p>
        </div>
      ) : filteredRoutines && filteredRoutines.length > 0 ? (
        <div className="space-y-4">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={handleEditRoutine}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No routines yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first routine to start building healthy habits
          </p>
          <Button onClick={handleAddRoutine}>
            <Plus className="w-4 h-4 mr-2" />
            Add Routine
          </Button>
        </div>
      )}
    </div>
  );
}
