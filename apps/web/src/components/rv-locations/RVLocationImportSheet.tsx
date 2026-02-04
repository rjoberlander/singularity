"use client";

import { useState, useRef, useCallback } from "react";
import { useImportRVLocations, useValidateRVImport } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle2, AlertCircle, AlertTriangle, Info, FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { RVLocationImportPayload, RVImportValidationResult } from "@singularity/shared-types";
import { cn } from "@/lib/utils";

interface RVLocationImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RVLocationImportSheet({ open, onOpenChange }: RVLocationImportSheetProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<RVImportValidationResult | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    created: { locations: number; activities: number };
    errors?: string[];
    location_ids?: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportRVLocations();
  const validateMutation = useValidateRVImport();

  // Parse JSON and return payload or null
  const parseJson = useCallback((): RVLocationImportPayload | null => {
    setParseError(null);

    if (!jsonInput.trim()) {
      setParseError("Please paste JSON data or upload a file.");
      return null;
    }

    try {
      const payload = JSON.parse(jsonInput);
      if (!payload.locations || !Array.isArray(payload.locations)) {
        setParseError('JSON must have a "locations" array.');
        return null;
      }
      if (payload.locations.length === 0) {
        setParseError("No locations found in the JSON.");
        return null;
      }
      return payload;
    } catch {
      setParseError("Invalid JSON format. Please check your input.");
      return null;
    }
  }, [jsonInput]);

  // Validate without importing
  const handleValidate = async () => {
    const payload = parseJson();
    if (!payload) return;

    setValidationResult(null);
    try {
      const result = await validateMutation.mutateAsync(payload);
      setValidationResult(result);
      if (result.valid && result.errors.length === 0) {
        toast.success(`Validation passed: ${result.location_count} locations, ${result.activity_count} activities`);
      } else if (result.warnings.length > 0 && result.errors.length === 0) {
        toast.info(`Validation passed with ${result.warnings.length} warning(s)`);
      } else {
        toast.warning(`Validation failed with ${result.errors.length} error(s)`);
      }
    } catch (error) {
      toast.error("Validation failed");
      setParseError("Failed to validate. Please try again.");
    }
  };

  // Import locations
  const handleImport = async () => {
    const payload = parseJson();
    if (!payload) return;

    setImportResult(null);
    try {
      const result = await importMutation.mutateAsync(payload);
      setImportResult(result);

      if (result.success) {
        toast.success(
          `Imported ${result.created.locations} locations with ${result.created.activities} activities`
        );
      } else {
        toast.warning("Import completed with some errors");
      }
    } catch (error) {
      toast.error("Failed to import locations");
      setParseError("Import failed. Please try again.");
    }
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error("Please upload a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      setParseError(null);
      setValidationResult(null);
      setImportResult(null);
      toast.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClose = () => {
    setJsonInput("");
    setParseError(null);
    setValidationResult(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const exampleJson = `{
  "locations": [
    {
      "name": "Death Valley National Park",
      "hook": "The hottest, driest, lowest point in North America",
      "category": "national_parks",
      "city": "Death Valley",
      "state": "CA",
      "drive_time_from_la": "4-5 hours",
      "rv_logistics": {
        "max_trailer_length_ft": 100,
        "hookups": "full",
        "cell_coverage": "good"
      },
      "vibe": {
        "scenic_beauty": 5,
        "solitude_level": 4,
        "relaxation_factor": 3,
        "adventure_level": 4,
        "family_friendly": 4
      },
      "best_season": {
        "best": ["october", "november", "march"],
        "avoid": ["june", "july", "august"]
      },
      "reservation_required": true,
      "kid_engagement": {
        "parker": { "suitable": true, "engagement_level": 5, "activities": ["hiking"] },
        "charlotte": { "suitable": true, "engagement_level": 4, "activities": ["sand play"] },
        "xander": { "suitable": true, "engagement_level": 3, "activities": ["pool"] }
      },
      "activities": [
        {
          "name": "Mesquite Flat Sand Dunes",
          "activity_type": "hike",
          "description": "Easy walk through stunning sand dunes",
          "duration_text": "1-2 hours"
        }
      ]
    }
  ]
}`;

  const isProcessing = validateMutation.isPending || importMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import RV Locations</SheetTitle>
          <SheetDescription>
            Paste JSON from Claude research or upload a file to bulk import RV camping destinations.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Use the &quot;Validate&quot; button to preview what will be imported before committing.
              Warnings can be imported; errors must be fixed first.
            </AlertDescription>
          </Alert>

          {/* File Upload / Drag-Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop a JSON file here or <span className="text-primary underline">click to browse</span>
            </p>
          </div>

          {/* JSON Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">JSON Data</label>
              {jsonInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setJsonInput("");
                    setValidationResult(null);
                    setImportResult(null);
                    setParseError(null);
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <Textarea
              placeholder={exampleJson}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setParseError(null);
                setValidationResult(null);
                setImportResult(null);
              }}
              className="font-mono text-xs min-h-[200px]"
            />
          </div>

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Validation Result */}
          {validationResult && !importResult && (
            <div className="space-y-3">
              <Alert variant={validationResult.valid ? "default" : "destructive"}>
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {validationResult.valid ? "Validation Passed" : "Validation Failed"}
                </AlertTitle>
                <AlertDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{validationResult.location_count} locations</Badge>
                    <Badge variant="secondary">{validationResult.activity_count} activities</Badge>
                    {validationResult.warnings.length > 0 && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        {validationResult.warnings.length} warnings
                      </Badge>
                    )}
                    {validationResult.errors.length > 0 && (
                      <Badge variant="destructive">{validationResult.errors.length} errors</Badge>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div className="border border-destructive/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-destructive flex items-center gap-1 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors (must fix)
                  </h4>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {validationResult.errors.map((err, i) => (
                      <li key={i} className="text-destructive">
                        {err.location_name && <span className="font-medium">[{err.location_name}]</span>}{" "}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div className="border border-yellow-500/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-yellow-600 flex items-center gap-1 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings (can import)
                  </h4>
                  <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i} className="text-yellow-700 dark:text-yellow-500">
                        {warn.location_name && <span className="font-medium">[{warn.location_name}]</span>}{" "}
                        {warn.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.success ? "default" : "destructive"}>
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.success ? "Import Successful!" : "Import Completed with Errors"}
              </AlertTitle>
              <AlertDescription>
                <p className="text-sm mt-1">
                  Created {importResult.created.locations} locations with{" "}
                  {importResult.created.activities} activities.
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="text-sm mt-2 list-disc list-inside">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-destructive">
                        {err}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>...and {importResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {importResult?.success ? "Done" : "Cancel"}
            </Button>
            {!importResult?.success && (
              <>
                <Button
                  variant="outline"
                  onClick={handleValidate}
                  disabled={!jsonInput.trim() || isProcessing}
                  className="flex-1"
                >
                  {validateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Validate
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!jsonInput.trim() || isProcessing || (validationResult !== null && !validationResult.valid)}
                  className="flex-1"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
