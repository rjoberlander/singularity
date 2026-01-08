"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, Dumbbell, Utensils } from "lucide-react";
import { AddExerciseModal } from "./AddExerciseModal";
import { AddMealModal } from "./AddMealModal";

export function AddItemMenu() {
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [mealModalOpen, setMealModalOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setExerciseModalOpen(true)}>
            <Dumbbell className="w-4 h-4 mr-2" />
            Exercise
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMealModalOpen(true)}>
            <Utensils className="w-4 h-4 mr-2" />
            Meal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddExerciseModal
        open={exerciseModalOpen}
        onOpenChange={setExerciseModalOpen}
      />
      <AddMealModal open={mealModalOpen} onOpenChange={setMealModalOpen} />
    </>
  );
}
