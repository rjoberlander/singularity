"use client";

import { useState } from "react";
import { GoalIntervention } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const INTERVENTION_TYPES = [
  { value: "supplement", label: "Supplement" },
  { value: "diet", label: "Diet Change" },
  { value: "exercise", label: "Exercise" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "medication", label: "Medication" },
  { value: "test", label: "Testing" },
  { value: "other", label: "Other" },
];

interface InterventionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { intervention: string; type?: string }) => Promise<void>;
  intervention?: GoalIntervention | null;
  isPending?: boolean;
}

export function InterventionDialog({
  open,
  onOpenChange,
  onSubmit,
  intervention,
  isPending = false,
}: InterventionDialogProps) {
  const isEdit = !!intervention;
  const [name, setName] = useState(intervention?.intervention || "");
  const [type, setType] = useState(intervention?.type || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      intervention: name,
      type: type || undefined,
    });
    setName("");
    setType("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("");
      setType("");
    } else if (intervention) {
      setName(intervention.intervention);
      setType(intervention.type || "");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Intervention" : "Add Intervention"}
          </DialogTitle>
          <DialogDescription>
            Add an action you&apos;re taking to achieve this goal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="intervention">Intervention</Label>
            <Input
              id="intervention"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Taking 5000 IU Vitamin D daily"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type (optional)</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {INTERVENTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Update" : "Add"} Intervention
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
