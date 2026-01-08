"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Minus, RefreshCw, UtensilsCrossed } from "lucide-react";
import type { RoutineChanges } from "@singularity/shared-types";

interface SaveRoutineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: RoutineChanges | null;
  onSave: (reason?: string) => Promise<void>;
  isSaving: boolean;
}

export function SaveRoutineModal({
  open,
  onOpenChange,
  changes,
  onSave,
  isSaving,
}: SaveRoutineModalProps) {
  const [reason, setReason] = useState("");

  const handleSave = async () => {
    try {
      await onSave(reason || undefined);
      toast.success("Routine saved to change log");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save routine");
    }
  };

  if (!changes) return null;

  const totalChanges =
    changes.started.length +
    changes.stopped.length +
    changes.modified.length +
    (changes.diet_changed ? 1 : 0) +
    (changes.macros_changed ? Object.keys(changes.macros_changed).length : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Routine Changes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Changes Summary */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Changes to save ({totalChanges}):
            </Label>
            <div className="max-h-[200px] overflow-y-auto space-y-1 text-sm">
              {/* Diet Change */}
              {changes.diet_changed && (
                <div className="flex items-center gap-2 text-blue-400">
                  <UtensilsCrossed className="w-3 h-3" />
                  <span>
                    Diet: {changes.diet_changed.from} → {changes.diet_changed.to}
                  </span>
                </div>
              )}

              {/* Macros Changes */}
              {changes.macros_changed &&
                Object.entries(changes.macros_changed).map(([field, change]) => (
                  <div key={field} className="flex items-center gap-2 text-blue-400">
                    <RefreshCw className="w-3 h-3" />
                    <span>
                      {field.replace("_g", "")}: {change.from || 0}g → {change.to || 0}g
                    </span>
                  </div>
                ))}

              {/* Started Items */}
              {changes.started.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-emerald-400"
                >
                  <Plus className="w-3 h-3" />
                  <span>
                    Started: {item.name}
                    {item.timing && ` (${item.timing}, ${item.frequency})`}
                  </span>
                </div>
              ))}

              {/* Stopped Items */}
              {changes.stopped.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-red-400">
                  <Minus className="w-3 h-3" />
                  <span>Stopped: {item.name}</span>
                </div>
              ))}

              {/* Modified Items */}
              {changes.modified.map((mod) => (
                <div
                  key={mod.item.id}
                  className="flex items-center gap-2 text-amber-400"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {mod.item.name}:{" "}
                    {mod.changes
                      .map((c) => `${c.field}: ${c.from} → ${c.to}`)
                      .join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason (optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Trying carnivore for 30 days based on blood work"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
