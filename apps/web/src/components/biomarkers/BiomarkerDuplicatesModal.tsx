"use client";

import { useMemo, useState } from "react";
import { useDeleteBiomarkersBulk } from "@/hooks/useBiomarkers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Trash2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Biomarker } from "@/types";

export interface DuplicateGroup {
  name: string;
  date: string;
  value: number;
  unit: string;
  entries: Biomarker[];
}

interface BiomarkerDuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateGroup[];
  onSuccess?: () => void;
}

export function BiomarkerDuplicatesModal({
  open,
  onOpenChange,
  duplicates,
  onSuccess,
}: BiomarkerDuplicatesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const deleteBulk = useDeleteBiomarkersBulk();

  // Calculate which entries to delete (keep the first, select the rest)
  const duplicateEntriesToDelete = useMemo(() => {
    const toDelete: string[] = [];
    duplicates.forEach((group) => {
      // Skip the first entry (keep it), add the rest
      group.entries.slice(1).forEach((entry) => {
        toDelete.push(entry.id);
      });
    });
    return toDelete;
  }, [duplicates]);

  // Initialize selected with all duplicates to delete
  useMemo(() => {
    if (open && selectedIds.size === 0 && duplicateEntriesToDelete.length > 0) {
      setSelectedIds(new Set(duplicateEntriesToDelete));
    }
  }, [open, duplicateEntriesToDelete]);

  const totalDuplicates = duplicateEntriesToDelete.length;

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(duplicateEntriesToDelete));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("No duplicates selected");
      return;
    }

    try {
      await deleteBulk.mutateAsync(Array.from(selectedIds));
      toast.success(`Deleted ${selectedIds.size} duplicate entries`);
      setSelectedIds(new Set());
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete duplicates:", error);
      toast.error("Failed to delete duplicates");
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-yellow-500" />
            Duplicate Biomarker Entries
          </DialogTitle>
          <DialogDescription>
            Found {totalDuplicates} duplicate entries that have the same biomarker name, date, and value.
            Select which duplicates to remove.
          </DialogDescription>
        </DialogHeader>

        {/* Selection controls */}
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={selectedIds.size === totalDuplicates}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              disabled={selectedIds.size === 0}
            >
              Deselect All
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} of {totalDuplicates} selected
          </span>
        </div>

        {/* Duplicates list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {duplicates.map((group, groupIndex) => (
            <Card key={`${group.name}-${group.date}-${group.value}-${groupIndex}`} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <h3 className="font-medium">{group.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    - {formatDate(group.date)} - {group.value} {group.unit}
                  </span>
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600">
                    {group.entries.length} entries
                  </span>
                </div>

                <div className="space-y-2">
                  {group.entries.map((entry, entryIndex) => {
                    const isFirst = entryIndex === 0;
                    const isSelected = selectedIds.has(entry.id);

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-3 p-2 rounded ${
                          isFirst
                            ? "bg-green-500/10 border border-green-500/20"
                            : isSelected
                            ? "bg-red-500/10 border border-red-500/20"
                            : "bg-muted/50"
                        }`}
                        data-testid="duplicate-entry"
                      >
                        {isFirst ? (
                          <div className="w-5 h-5 flex items-center justify-center">
                            <span className="text-xs text-green-600 font-medium">KEEP</span>
                          </div>
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(entry.id)}
                            data-testid="duplicate-checkbox"
                          />
                        )}
                        <div className="flex-1 text-sm">
                          <span className="text-muted-foreground">ID: </span>
                          <span className="font-mono text-xs">{entry.id.slice(0, 8)}...</span>
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span className="text-muted-foreground">Created: </span>
                          <span>{new Date(entry.created_at).toLocaleString()}</span>
                          {entry.ai_extracted && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600">
                              AI
                            </span>
                          )}
                        </div>
                        {isFirst && (
                          <span className="text-xs text-green-600">Original</span>
                        )}
                        {!isFirst && isSelected && (
                          <span className="text-xs text-red-600">Will delete</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || deleteBulk.isPending}
            data-testid="delete-duplicates-button"
          >
            {deleteBulk.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedIds.size} Duplicate{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Find duplicate biomarker entries within the data.
 * Duplicates are entries with the same name, date_tested, AND value.
 */
export function findDuplicateBiomarkers(biomarkers: Biomarker[]): DuplicateGroup[] {
  const groups = new Map<string, Biomarker[]>();

  biomarkers.forEach((b) => {
    // Key: name (lowercase) + date + value
    const key = `${b.name.toLowerCase()}|${b.date_tested}|${b.value}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(b);
  });

  // Filter to only groups with more than one entry (duplicates)
  const duplicateGroups: DuplicateGroup[] = [];
  groups.forEach((entries, key) => {
    if (entries.length > 1) {
      // Sort by created_at to keep the oldest entry
      entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const [name, date, value] = key.split("|");
      duplicateGroups.push({
        name: entries[0].name, // Use the actual name from first entry
        date,
        value: parseFloat(value),
        unit: entries[0].unit,
        entries,
      });
    }
  });

  // Sort by name for consistent display
  duplicateGroups.sort((a, b) => a.name.localeCompare(b.name));

  return duplicateGroups;
}
