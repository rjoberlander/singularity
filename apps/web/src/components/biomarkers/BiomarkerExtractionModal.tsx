"use client";

import { useState, useCallback, useEffect } from "react";
import { useExtractBiomarkers } from "@/hooks/useAI";
import { useCreateBiomarkersBulk } from "@/hooks/useBiomarkers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

interface ExtractedBiomarker {
  name: string;
  extracted_name?: string;
  value: number;
  unit: string;
  reference_range_low?: number;
  reference_range_high?: number;
  optimal_range_low?: number;
  optimal_range_high?: number;
  category: string;
  confidence: number;
  match_confidence?: number;
  flag?: string;
}

interface ExtractedData {
  biomarkers: ExtractedBiomarker[];
  lab_info: {
    lab_name?: string;
    test_date?: string;
    patient_name?: string;
  };
  extraction_notes?: string;
}

interface BiomarkerExtractionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialInput?: { text?: string; file?: File };
}

export function BiomarkerExtractionModal({
  open,
  onOpenChange,
  onSuccess,
  initialInput,
}: BiomarkerExtractionModalProps) {
  const [step, setStep] = useState<"extracting" | "review">("extracting");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [selectedBiomarkers, setSelectedBiomarkers] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ value?: number; name?: string }>({});
  const [extractionStarted, setExtractionStarted] = useState(false);

  const extractBiomarkers = useExtractBiomarkers();
  const createBiomarkersBulk = useCreateBiomarkersBulk();

  const resetState = useCallback(() => {
    setStep("extracting");
    setAttachedFile(null);
    setInputText(null);
    setExtractedData(null);
    setSelectedBiomarkers(new Set());
    setEditingIndex(null);
    setEditValues({});
    setExtractionStarted(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const processFileForAI = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleExtract = useCallback(async (file?: File | null, text?: string | null) => {
    if (!file && !text) return;

    setStep("extracting");
    setExtractionStarted(true);

    try {
      let result;

      if (file) {
        const base64 = await processFileForAI(file);
        if (!base64) {
          throw new Error("Failed to read file");
        }
        result = await extractBiomarkers.mutateAsync({
          image_base64: base64,
          source_type: "image",
        });
      } else if (text) {
        result = await extractBiomarkers.mutateAsync({
          text_content: text,
          source_type: "text",
        });
      }

      if (result) {
        setExtractedData(result);
        setSelectedBiomarkers(new Set(result.biomarkers.map((_: any, i: number) => i)));
        setStep("review");
        toast.success(`Extracted ${result.biomarkers.length} biomarkers`);
      }
    } catch (error: any) {
      console.error("Extraction failed:", error);
      const errorMessage = error?.response?.data?.error || "Failed to extract biomarkers";
      toast.error(errorMessage);
      handleClose();
    }
  }, [extractBiomarkers, handleClose]);

  // Auto-start extraction when modal opens with initial input
  useEffect(() => {
    if (open && initialInput && !extractionStarted) {
      setAttachedFile(initialInput.file || null);
      setInputText(initialInput.text || null);
      handleExtract(initialInput.file, initialInput.text);
    }
  }, [open, initialInput, extractionStarted, handleExtract]);

  const handleSave = async () => {
    if (!extractedData) return;

    const selectedData = extractedData.biomarkers
      .filter((_: any, i: number) => selectedBiomarkers.has(i))
      .map((b: ExtractedBiomarker) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        date_tested: extractedData.lab_info.test_date || new Date().toISOString().split("T")[0],
        category: b.category,
        reference_range_low: b.reference_range_low,
        reference_range_high: b.reference_range_high,
        optimal_range_low: b.optimal_range_low,
        optimal_range_high: b.optimal_range_high,
        ai_extracted: true,
      }));

    try {
      await createBiomarkersBulk.mutateAsync(selectedData);
      toast.success(`Saved ${selectedData.length} biomarkers`);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save biomarkers:", error);
      toast.error("Failed to save biomarkers");
    }
  };

  const toggleBiomarkerSelection = (index: number) => {
    const newSelected = new Set(selectedBiomarkers);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedBiomarkers(newSelected);
  };

  const startEditing = (index: number, biomarker: ExtractedBiomarker) => {
    setEditingIndex(index);
    setEditValues({ value: biomarker.value, name: biomarker.name });
  };

  const saveEditing = () => {
    if (editingIndex === null || !extractedData) return;

    const updatedBiomarkers = [...extractedData.biomarkers];
    updatedBiomarkers[editingIndex] = {
      ...updatedBiomarkers[editingIndex],
      value: editValues.value ?? updatedBiomarkers[editingIndex].value,
      name: editValues.name ?? updatedBiomarkers[editingIndex].name,
    };

    setExtractedData({
      ...extractedData,
      biomarkers: updatedBiomarkers,
    });

    setEditingIndex(null);
    setEditValues({});
  };

  const getConfidenceBadge = (confidence: number, matchConfidence?: number) => {
    const displayConfidence = Math.round((matchConfidence ?? confidence) * 100);
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    if (displayConfidence >= 90) variant = "default";
    else if (displayConfidence >= 70) variant = "secondary";
    else variant = "outline";

    return (
      <Badge variant={variant} className="text-xs">
        {displayConfidence}% match
      </Badge>
    );
  };

  const getFlagIcon = (flag?: string) => {
    if (!flag) return <Minus className="w-4 h-4 text-green-500" />;
    if (flag === "low" || flag === "critical_low")
      return <ArrowDown className="w-4 h-4 text-red-500" />;
    if (flag === "high" || flag === "critical_high")
      return <ArrowUp className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {step === "extracting" && "Extracting Biomarkers..."}
            {step === "review" && "Review Extracted Biomarkers"}
          </DialogTitle>
          <DialogDescription>
            {step === "extracting" && "AI is analyzing your lab results"}
            {step === "review" && "Review and confirm the extracted values before saving"}
          </DialogDescription>
        </DialogHeader>

        {/* Extracting Step */}
        {step === "extracting" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing lab results...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take up to a minute for large PDFs
            </p>
          </div>
        )}

        {/* Review Step */}
        {step === "review" && extractedData && (
          <>
            {extractedData.lab_info.lab_name && (
              <div className="text-sm text-muted-foreground mb-2">
                Lab: {extractedData.lab_info.lab_name}
                {extractedData.lab_info.test_date &&
                  ` • Date: ${extractedData.lab_info.test_date}`}
              </div>
            )}

            <div className="flex-1 max-h-[400px] overflow-y-auto pr-4">
              <div className="space-y-2">
                {extractedData.biomarkers.map((biomarker, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedBiomarkers.has(index)
                        ? "border-primary bg-primary/5"
                        : "border-muted opacity-60"
                    }`}
                    onClick={() =>
                      editingIndex !== index && toggleBiomarkerSelection(index)
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            selectedBiomarkers.has(index)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedBiomarkers.has(index) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {editingIndex === index ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editValues.name || ""}
                                onChange={(e) =>
                                  setEditValues({ ...editValues, name: e.target.value })
                                }
                                className="h-8"
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="any"
                                  value={editValues.value || ""}
                                  onChange={(e) =>
                                    setEditValues({
                                      ...editValues,
                                      value: parseFloat(e.target.value),
                                    })
                                  }
                                  className="h-8 w-24"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {biomarker.unit}
                                </span>
                                <Button size="sm" onClick={saveEditing}>
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingIndex(null);
                                    setEditValues({});
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{biomarker.name}</span>
                                {biomarker.extracted_name &&
                                  biomarker.extracted_name !== biomarker.name && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      ({biomarker.extracted_name})
                                    </span>
                                  )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold">
                                  {biomarker.value}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {biomarker.unit}
                                </span>
                                {getFlagIcon(biomarker.flag)}
                              </div>
                              {biomarker.reference_range_low !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Ref: {biomarker.reference_range_low} -{" "}
                                  {biomarker.reference_range_high} • Optimal:{" "}
                                  {biomarker.optimal_range_low} -{" "}
                                  {biomarker.optimal_range_high}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getConfidenceBadge(biomarker.confidence, biomarker.match_confidence)}
                        {editingIndex !== index && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(index, biomarker);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                {selectedBiomarkers.size} of {extractedData.biomarkers.length} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={selectedBiomarkers.size === 0 || createBiomarkersBulk.isPending}
                >
                  {createBiomarkersBulk.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save {selectedBiomarkers.size} Biomarkers
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
