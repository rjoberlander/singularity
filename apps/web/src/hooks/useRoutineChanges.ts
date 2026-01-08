"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useLatestRoutineVersion,
  useCurrentRoutineSnapshot,
  useSaveRoutineVersion,
} from "@/lib/api";
import type {
  RoutineSnapshot,
  RoutineSnapshotItem,
  RoutineChanges,
} from "@singularity/shared-types";

/**
 * Compute changes between two snapshots
 */
function computeChanges(
  previous: RoutineSnapshot | null,
  current: RoutineSnapshot | null
): RoutineChanges {
  const changes: RoutineChanges = {
    diet_changed: null,
    macros_changed: null,
    started: [],
    stopped: [],
    modified: [],
  };

  if (!current) return changes;

  // If no previous, everything is "started"
  if (!previous) {
    changes.started = current.items;
    if (current.diet.type !== "untracked") {
      changes.diet_changed = { from: "untracked", to: current.diet.type };
    }
    return changes;
  }

  // Diet change
  if (previous.diet.type !== current.diet.type) {
    changes.diet_changed = {
      from: previous.diet.type,
      to: current.diet.type,
    };
  }

  // Macros changes
  const macroFields = ["protein_g", "carbs_g", "fat_g"] as const;
  for (const field of macroFields) {
    const prevVal = previous.diet.macros[field];
    const currVal = current.diet.macros[field];
    if (prevVal !== currVal) {
      if (!changes.macros_changed) changes.macros_changed = {};
      changes.macros_changed[field] = { from: prevVal, to: currVal };
    }
  }

  // Items
  const prevMap = new Map(previous.items.map((i) => [i.id, i]));
  const currMap = new Map(current.items.map((i) => [i.id, i]));

  // Started (in current, not in previous)
  for (const [id, item] of currMap) {
    if (!prevMap.has(id)) {
      changes.started.push(item);
    }
  }

  // Stopped (in previous, not in current)
  for (const [id, item] of prevMap) {
    if (!currMap.has(id)) {
      changes.stopped.push(item);
    }
  }

  // Modified (in both, but different)
  for (const [id, currItem] of currMap) {
    const prevItem = prevMap.get(id);
    if (prevItem) {
      const fieldChanges = getFieldChanges(prevItem, currItem);
      if (fieldChanges.length > 0) {
        changes.modified.push({
          item: currItem,
          changes: fieldChanges,
        });
      }
    }
  }

  return changes;
}

function getFieldChanges(
  prev: RoutineSnapshotItem,
  curr: RoutineSnapshotItem
): Array<{ field: string; from: unknown; to: unknown }> {
  const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
  const fieldsToCompare = [
    "timing",
    "timings",
    "frequency",
    "frequency_days",
    "duration",
  ];

  for (const field of fieldsToCompare) {
    const prevVal = JSON.stringify(prev[field as keyof RoutineSnapshotItem]);
    const currVal = JSON.stringify(curr[field as keyof RoutineSnapshotItem]);
    if (prevVal !== currVal) {
      changes.push({
        field,
        from: prev[field as keyof RoutineSnapshotItem],
        to: curr[field as keyof RoutineSnapshotItem],
      });
    }
  }

  return changes;
}

/**
 * Hook to track unsaved routine changes
 */
export function useRoutineChanges() {
  const [lastSavedSnapshot, setLastSavedSnapshot] =
    useState<RoutineSnapshot | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: latestVersion, isLoading: isLoadingLatest } =
    useLatestRoutineVersion();
  const { data: currentSnapshot, isLoading: isLoadingCurrent } =
    useCurrentRoutineSnapshot();

  const saveRoutineMutation = useSaveRoutineVersion();

  // Initialize last saved snapshot from latest version
  useEffect(() => {
    if (!isInitialized && !isLoadingLatest) {
      if (latestVersion?.snapshot) {
        setLastSavedSnapshot(latestVersion.snapshot as RoutineSnapshot);
      }
      setIsInitialized(true);
    }
  }, [latestVersion, isLoadingLatest, isInitialized]);

  // Compute changes between last saved and current
  const changes = useMemo(() => {
    if (!isInitialized || !currentSnapshot) return null;
    return computeChanges(lastSavedSnapshot, currentSnapshot);
  }, [lastSavedSnapshot, currentSnapshot, isInitialized]);

  // Check if there are meaningful changes
  const hasUnsavedChanges = useMemo(() => {
    if (!changes) return false;
    return (
      changes.diet_changed !== null ||
      changes.macros_changed !== null ||
      changes.started.length > 0 ||
      changes.stopped.length > 0 ||
      changes.modified.length > 0
    );
  }, [changes]);

  // Save routine
  const saveRoutine = useCallback(
    async (reason?: string) => {
      const result = await saveRoutineMutation.mutateAsync({ reason });
      if (result?.snapshot) {
        setLastSavedSnapshot(result.snapshot as RoutineSnapshot);
      }
      return result;
    },
    [saveRoutineMutation]
  );

  // Discard changes (refresh page to reset)
  const discardChanges = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    hasUnsavedChanges,
    changes,
    saveRoutine,
    discardChanges,
    isSaving: saveRoutineMutation.isPending,
    isLoading: isLoadingLatest || isLoadingCurrent || !isInitialized,
  };
}
