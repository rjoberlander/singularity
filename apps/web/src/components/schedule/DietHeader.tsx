"use client";

import { useState } from "react";
import { useUserDiet, useUpdateUserDiet } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EditMacrosModal } from "./EditMacrosModal";
import type { DietType } from "@singularity/shared-types";

const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: "untracked", label: "Untracked" },
  { value: "standard", label: "Standard" },
  { value: "keto", label: "Keto" },
  { value: "carnivore", label: "Carnivore" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "paleo", label: "Paleo" },
  { value: "low_fodmap", label: "Low FODMAP" },
  { value: "other", label: "Other" },
];

export function DietHeader() {
  const { data: diet, isLoading } = useUserDiet();
  const updateDiet = useUpdateUserDiet();
  const [macrosModalOpen, setMacrosModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-3 bg-card border rounded-lg">
        <span className="text-sm text-muted-foreground">Loading diet...</span>
      </div>
    );
  }

  const hasMacros =
    diet?.target_protein_g || diet?.target_carbs_g || diet?.target_fat_g;

  const handleDietChange = async (value: DietType) => {
    await updateDiet.mutateAsync({ diet_type: value });
  };

  return (
    <>
      <div className="flex items-center gap-4 p-3 bg-card border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Diet:</span>
          <Select
            value={diet?.diet_type || "untracked"}
            onValueChange={handleDietChange}
            disabled={updateDiet.isPending}
          >
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {diet?.diet_type !== "untracked" && (
          <div className="flex items-center gap-3 text-sm">
            {hasMacros ? (
              <>
                <span className="text-muted-foreground">
                  P:{" "}
                  <span className="text-foreground font-medium">
                    {diet?.target_protein_g || 0}g
                  </span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  C:{" "}
                  <span className="text-foreground font-medium">
                    {diet?.target_carbs_g || 0}g
                  </span>
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  F:{" "}
                  <span className="text-foreground font-medium">
                    {diet?.target_fat_g || 0}g
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setMacrosModalOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMacrosModalOpen(true)}
              >
                + Add Macros
              </Button>
            )}
          </div>
        )}
      </div>

      <EditMacrosModal
        open={macrosModalOpen}
        onOpenChange={setMacrosModalOpen}
        currentDiet={diet}
      />
    </>
  );
}
