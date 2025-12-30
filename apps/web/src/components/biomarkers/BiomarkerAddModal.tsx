"use client";

import { useState, useMemo } from "react";
import { useCreateBiomarker } from "@/hooks/useBiomarkers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreateBiomarkerRequest } from "@/types";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { BIOMARKER_REFERENCE } from "@/data/biomarkerReference";
import { cn } from "@/lib/utils";

interface BiomarkerAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BiomarkerAddModal({ open, onOpenChange, onSuccess }: BiomarkerAddModalProps) {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [dateTested, setDateTested] = useState(new Date().toISOString().split("T")[0]);

  const createBiomarker = useCreateBiomarker();

  // Get the reference data for the selected biomarker
  const selectedRef = useMemo(() => {
    return BIOMARKER_REFERENCE.find(ref => ref.name === selectedBiomarker);
  }, [selectedBiomarker]);

  const resetForm = () => {
    setSelectedBiomarker("");
    setValue("");
    setDateTested(new Date().toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBiomarker || !value || !selectedRef) {
      toast.error("Please fill in all fields");
      return;
    }

    const data: CreateBiomarkerRequest = {
      name: selectedBiomarker,
      value: parseFloat(value),
      unit: selectedRef.unit,
      date_tested: dateTested,
      category: selectedRef.category,
    };

    try {
      await createBiomarker.mutateAsync(data);
      toast.success("Biomarker saved successfully");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create biomarker:", error);
      toast.error("Failed to save biomarker. Please try again.");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Biomarker</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Biomarker Selection */}
          <div className="space-y-2">
            <Label>Biomarker</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                  data-testid="biomarker-select"
                >
                  {selectedBiomarker || "Select biomarker..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search biomarkers..." />
                  <CommandList>
                    <CommandEmpty>No biomarker found.</CommandEmpty>
                    <CommandGroup>
                      {BIOMARKER_REFERENCE.map((ref) => (
                        <CommandItem
                          key={ref.name}
                          value={ref.name}
                          onSelect={(currentValue) => {
                            setSelectedBiomarker(currentValue === selectedBiomarker ? "" : ref.name);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedBiomarker === ref.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <span>{ref.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({ref.unit})
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {ref.category}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="modal-value">
              Value
              {selectedRef && (
                <span className="ml-2 text-muted-foreground font-normal">
                  ({selectedRef.unit})
                </span>
              )}
            </Label>
            <Input
              id="modal-value"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={selectedRef ? `Enter value in ${selectedRef.unit}` : "Enter value"}
              required
              data-testid="biomarker-value"
            />
            {selectedRef && (
              <p className="text-xs text-muted-foreground">
                Optimal range: {selectedRef.optimalRange.low} - {selectedRef.optimalRange.high} {selectedRef.unit}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="modal-date">Date Tested</Label>
            <Input
              id="modal-date"
              type="date"
              value={dateTested}
              onChange={(e) => setDateTested(e.target.value)}
              required
              data-testid="biomarker-date"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createBiomarker.isPending || !selectedBiomarker || !value}
              data-testid="biomarker-save"
            >
              {createBiomarker.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
