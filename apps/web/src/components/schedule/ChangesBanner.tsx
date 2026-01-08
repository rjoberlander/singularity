"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { SaveRoutineModal } from "./SaveRoutineModal";
import type { RoutineChanges } from "@singularity/shared-types";

interface ChangesBannerProps {
  hasChanges: boolean;
  changes: RoutineChanges | null;
  onSave: (reason?: string) => Promise<unknown>;
  onDiscard: () => void;
  isSaving: boolean;
}

export function ChangesBanner({
  hasChanges,
  changes,
  onSave,
  onDiscard,
  isSaving,
}: ChangesBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!hasChanges) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            You have unsaved changes to your routine.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Save to Log
          </Button>
        </div>
      </div>

      <SaveRoutineModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        changes={changes}
        onSave={onSave}
        isSaving={isSaving}
      />
    </>
  );
}
