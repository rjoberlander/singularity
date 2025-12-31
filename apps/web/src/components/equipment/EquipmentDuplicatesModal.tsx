"use client";

import { useMemo, useState } from "react";
import { useDeleteEquipment } from "@/hooks/useEquipment";
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

export interface EquipmentDuplicateGroup {
  items: Array<{
    id: string;
    name: string;
    brand?: string;
    confidence: number;
  }>;
}

interface EquipmentDuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateGroups: EquipmentDuplicateGroup[];
  onSuccess?: () => void;
}

export function EquipmentDuplicatesModal({
  open,
  onOpenChange,
  duplicateGroups,
  onSuccess,
}: EquipmentDuplicatesModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = useDeleteEquipment();

  // Calculate which entries to delete (keep the first, select the rest)
  const duplicateEntriesToDelete = useMemo(() => {
    const toDelete: string[] = [];
    duplicateGroups.forEach((group) => {
      // Skip the first entry (keep it), add the rest
      group.items.slice(1).forEach((item) => {
        toDelete.push(item.id);
      });
    });
    return toDelete;
  }, [duplicateGroups]);

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

    setIsDeleting(true);
    try {
      // Delete each selected item
      const idsToDelete = Array.from(selectedIds);
      for (const id of idsToDelete) {
        await deleteMutation.mutateAsync(id);
      }
      toast.success(`Deleted ${selectedIds.size} duplicate equipment`);
      setSelectedIds(new Set());
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete duplicates:", error);
      toast.error("Failed to delete duplicates");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-yellow-500" />
            Duplicate Equipment
          </DialogTitle>
          <DialogDescription>
            Found {totalDuplicates} duplicate equipment entries with similar names.
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
          {duplicateGroups.map((group, groupIndex) => (
            <Card key={`group-${groupIndex}`} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <h3 className="font-medium">{group.items[0]?.name}</h3>
                  {group.items[0]?.brand && (
                    <span className="text-sm text-muted-foreground">
                      ({group.items[0].brand})
                    </span>
                  )}
                  <span className="ml-auto text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600">
                    {group.items.length} entries
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map((item, itemIndex) => {
                    const isFirst = itemIndex === 0;
                    const isSelected = selectedIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 rounded ${
                          isFirst
                            ? "bg-green-500/10 border border-green-500/20"
                            : isSelected
                            ? "bg-red-500/10 border border-red-500/20"
                            : "bg-muted/50"
                        }`}
                      >
                        {isFirst ? (
                          <div className="w-5 h-5 flex items-center justify-center">
                            <span className="text-xs text-green-600 font-medium">KEEP</span>
                          </div>
                        ) : (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(item.id)}
                          />
                        )}
                        <div className="flex-1 text-sm">
                          <span className="font-medium">{item.name}</span>
                          {item.brand && (
                            <span className="text-muted-foreground ml-2">
                              {item.brand}
                            </span>
                          )}
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span className="text-muted-foreground">Match: </span>
                          <span className={item.confidence === 1 ? "text-yellow-600" : "text-orange-500"}>
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                        {isFirst && (
                          <span className="text-xs text-green-600">Keep this one</span>
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
            disabled={selectedIds.size === 0 || isDeleting}
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedIds.size} Duplicate{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
