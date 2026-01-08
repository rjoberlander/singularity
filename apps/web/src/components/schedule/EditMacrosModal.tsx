"use client";

import { useState, useEffect } from "react";
import { useUpdateUserDiet } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { UserDiet } from "@singularity/shared-types";

interface EditMacrosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDiet: UserDiet | undefined;
}

export function EditMacrosModal({
  open,
  onOpenChange,
  currentDiet,
}: EditMacrosModalProps) {
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fat, setFat] = useState<string>("");

  const updateDiet = useUpdateUserDiet();

  useEffect(() => {
    if (open && currentDiet) {
      setProtein(currentDiet.target_protein_g?.toString() || "");
      setCarbs(currentDiet.target_carbs_g?.toString() || "");
      setFat(currentDiet.target_fat_g?.toString() || "");
    }
  }, [open, currentDiet]);

  const handleSave = async () => {
    try {
      await updateDiet.mutateAsync({
        target_protein_g: protein ? parseInt(protein) : null,
        target_carbs_g: carbs ? parseInt(carbs) : null,
        target_fat_g: fat ? parseInt(fat) : null,
      });
      toast.success("Macros updated");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update macros");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Daily Macros</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="protein">Protein (g)</Label>
            <Input
              id="protein"
              type="number"
              placeholder="150"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carbs">Carbs (g)</Label>
            <Input
              id="carbs"
              type="number"
              placeholder="20"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fat">Fat (g)</Label>
            <Input
              id="fat"
              type="number"
              placeholder="150"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateDiet.isPending}>
            {updateDiet.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
