"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useValidateImport,
  useImportTrip,
  useTripSegments,
  API_URL,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileUp,
  Layers,
  Hotel,
} from "lucide-react";
import { toast } from "sonner";
import {
  TripImportPayload,
  TripImportOptions,
  TripImportValidationResult,
  HotelResearchPayload,
} from "@singularity/shared-types";

type ImportMode = "hotel_research" | "segment_existing";

interface TripSettingsSheetProps {
  tripId: string;
  tripName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Trip Settings Sheet
 *
 * Right-side panel for importing hotel research and segment research
 * into an existing trip. Accessible from the trip detail page Settings dropdown.
 */
export function TripSettingsSheet({
  tripId,
  tripName,
  open,
  onOpenChange,
}: TripSettingsSheetProps) {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("hotel_research");
  const [detectedType, setDetectedType] = useState<"hotel" | "segment" | null>(null);

  // Hotel research payload
  const [hotelPayload, setHotelPayload] = useState<HotelResearchPayload | null>(null);

  // Segment research payload
  const [parsedPayload, setParsedPayload] = useState<TripImportPayload | null>(null);
  const [validationResult, setValidationResult] = useState<TripImportValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Segment selection
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");

  // Import options
  const [importOptions, setImportOptions] = useState<TripImportOptions>({
    create_trip: false,
    create_segment: true,
    create_days: true,
    create_research_items: true,
    import_approved_as_activities: false,
    auto_approve_must_do: true,
    trip_id: tripId,
  });

  const { data: existingSegments } = useTripSegments(tripId);
  const validateMutation = useValidateImport();
  const importMutation = useImportTrip();

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setJsonInput("");
      setDetectedType(null);
      setHotelPayload(null);
      setParsedPayload(null);
      setValidationResult(null);
      setParseError(null);
      setSelectedSegmentId("");
    }
  }, [open]);

  // Update import options when mode changes
  useEffect(() => {
    if (importMode === "hotel_research") {
      setImportOptions((prev) => ({
        ...prev,
        create_trip: false,
        create_segment: false,
        create_days: false,
        create_research_items: true,
        trip_id: tripId,
      }));
    } else if (importMode === "segment_existing") {
      setImportOptions((prev) => ({
        ...prev,
        create_trip: false,
        create_segment: true,
        create_days: true,
        create_research_items: true,
        trip_id: tripId,
      }));
    }
  }, [importMode, tripId]);

  // Detect JSON type and parse
  const handleParseJson = useCallback((content: string) => {
    try {
      setParseError(null);
      const parsed = JSON.parse(content);

      if (parsed.metadata && parsed.hotels && Array.isArray(parsed.hotels)) {
        // Hotel research
        setDetectedType("hotel");
        setHotelPayload(parsed as HotelResearchPayload);
        setParsedPayload(null);
        if (importMode !== "hotel_research") {
          setImportMode("hotel_research");
        }
        return { type: "hotel" as const, payload: parsed };
      } else if (parsed.metadata && parsed.research_items) {
        // Segment research
        setDetectedType("segment");
        setParsedPayload(parsed as TripImportPayload);
        setHotelPayload(null);
        if (importMode !== "segment_existing") {
          setImportMode("segment_existing");
        }
        return { type: "segment" as const, payload: parsed };
      } else if (parsed.trip && parsed.segments) {
        // This is a skeleton - shouldn't be here
        setParseError("Trip skeleton detected. To create a new trip, use the Guide page instead.");
        return null;
      } else {
        setParseError("Unrecognized JSON format. Expected hotel research or segment research.");
        return null;
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
      setParsedPayload(null);
      setHotelPayload(null);
      setDetectedType(null);
      return null;
    }
  }, [importMode]);

  // Validate the payload
  const handleValidate = async () => {
    const result = handleParseJson(jsonInput);
    if (!result) return;

    if (result.type === "hotel") {
      const hotel = result.payload as HotelResearchPayload;
      const issues: string[] = [];

      if (!hotel.metadata?.segment_number) {
        issues.push("Missing metadata.segment_number");
      }
      if (!hotel.hotels || hotel.hotels.length === 0) {
        issues.push("No hotels in the hotels array");
      }
      hotel.hotels?.forEach((h, idx) => {
        if (!h.name) issues.push(`hotels[${idx}]: Missing name`);
        if (!h.pick_type) issues.push(`hotels[${idx}]: Missing pick_type`);
      });

      if (issues.length > 0) {
        setParseError(`Validation issues: ${issues.join(", ")}`);
        toast.warning(`Found ${issues.length} issues`);
      } else {
        toast.success(`Hotel research validated: ${hotel.hotels.length} hotels found`);
      }
      return;
    }

    // Validate segment research
    try {
      const validationRes = await validateMutation.mutateAsync(result.payload as TripImportPayload);
      setValidationResult(validationRes);
      if (validationRes.valid) {
        toast.success("Validation passed");
      } else {
        toast.warning(`Found ${validationRes.issues.length} issues`);
      }
    } catch (error) {
      toast.error("Validation failed");
    }
  };

  // Import hotel research
  const handleImportHotels = async () => {
    if (!hotelPayload) {
      toast.error("Please parse and validate JSON first");
      return;
    }

    if (!selectedSegmentId || selectedSegmentId === "_new") {
      toast.error("Please select a segment to add hotels to");
      return;
    }

    try {
      // Get auth token for API call
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/travel/import/hotels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          payload: hotelPayload,
          trip_id: tripId,
          segment_id: selectedSegmentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import hotels");
      }

      const result = await response.json();

      toast.success(
        `Imported ${result.created?.research_items || hotelPayload.hotels.length} hotel options`
      );
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Hotel import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import hotels");
    }
  };

  // Import segment research
  const handleImportSegment = async () => {
    if (!parsedPayload) {
      toast.error("Please parse and validate JSON first");
      return;
    }

    if (!validationResult?.valid) {
      toast.error("Please fix validation issues before importing");
      return;
    }

    const options: TripImportOptions = {
      ...importOptions,
      trip_id: tripId,
      segment_id: selectedSegmentId && selectedSegmentId !== "_new" ? selectedSegmentId : undefined,
    };

    try {
      const result = await importMutation.mutateAsync({
        payload: parsedPayload,
        options,
      });

      if (result.success) {
        toast.success(
          `Imported: ${result.created.research_items} items, ${result.created.days} days`
        );
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(`Import completed with errors: ${result.errors?.join(", ")}`);
      }
    } catch (error) {
      toast.error("Import failed");
    }
  };

  // Handle file drop
  const handleFileDrop = (file: File) => {
    if (!file.name.endsWith(".json")) {
      toast.error("Please drop a JSON file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      handleParseJson(content);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileDrop(files[0]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileDrop(file);
  };

  const isHotelMode = importMode === "hotel_research";
  const canImportHotels = hotelPayload !== null && selectedSegmentId && selectedSegmentId !== "_new";
  const canImportSegment = validationResult?.valid === true;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle>Import Research Data</SheetTitle>
              <SheetDescription>
                Add hotel or segment research to {tripName}
              </SheetDescription>
            </SheetHeader>

            {/* Import Mode Selection */}
            <div className="space-y-3">
              <Label>What are you importing?</Label>
              <RadioGroup
                value={importMode}
                onValueChange={(value) => setImportMode(value as ImportMode)}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="hotel_research" id="hotel_research" className="mt-1" />
                  <div className="flex-1">
                    <label htmlFor="hotel_research" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Hotel className="h-4 w-4 text-orange-500" />
                      Hotel Research
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add hotel options from segment-N-hotels.json
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="segment_existing" id="segment_existing" className="mt-1" />
                  <div className="flex-1">
                    <label htmlFor="segment_existing" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Layers className="h-4 w-4 text-green-500" />
                      Segment Research
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fill a segment with activities from segment-N-research.json
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Segment Selection */}
            {existingSegments && existingSegments.length > 0 && (
              <div className="space-y-2">
                <Label>
                  {isHotelMode ? "Add hotels to segment" : "Fill segment (optional)"}
                </Label>
                <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a segment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {!isHotelMode && <SelectItem value="_new">Create new segment</SelectItem>}
                    {existingSegments.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>
                        #{seg.segment_number} - {seg.name}
                        {seg.research_status === "not_started" && " (empty)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isHotelMode && !selectedSegmentId && (
                  <p className="text-xs text-amber-600">
                    Select a segment to add hotel options.
                  </p>
                )}
              </div>
            )}

            {(!existingSegments || existingSegments.length === 0) && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600">
                This trip has no segments yet. Import a trip skeleton first from the Guide page.
              </div>
            )}

            {/* Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("sheet-json-upload")?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors duration-200
                ${isDragging
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <input
                type="file"
                id="sheet-json-upload"
                className="hidden"
                accept=".json"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center gap-2">
                <div className={`p-2 rounded-full ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
                  <FileUp className={`h-5 w-5 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragging ? "Drop your JSON file here" : "Drag & drop or click to browse"}
                  </p>
                </div>
              </div>
            </div>

            {/* JSON Input */}
            <div className="space-y-2">
              <Label>Or paste JSON</Label>
              <Textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setParseError(null);
                  setParsedPayload(null);
                  setHotelPayload(null);
                  setValidationResult(null);
                  setDetectedType(null);
                }}
                className="min-h-[120px] font-mono text-xs"
                placeholder='{"metadata": {...}, ...}'
              />
            </div>

            {/* Detected Type Badge */}
            {detectedType && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    detectedType === "hotel"
                      ? "border-orange-500 text-orange-700"
                      : "border-green-500 text-green-700"
                  }
                >
                  Detected: {detectedType === "hotel" ? "Hotel Research" : "Segment Research"}
                </Badge>
              </div>
            )}

            {/* Parse Error */}
            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                <XCircle className="h-4 w-4" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Validate Button */}
            <Button
              onClick={handleValidate}
              disabled={!jsonInput || validateMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Validate JSON
            </Button>

            {/* Hotel Summary */}
            {hotelPayload && isHotelMode && (
              <div className="space-y-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Hotel Research Parsed</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {hotelPayload.hotels?.length || 0} hotel options found
                </div>
                <div className="space-y-1">
                  {hotelPayload.hotels?.slice(0, 4).map((hotel, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {hotel.pick_type}
                      </Badge>
                      <span>{hotel.name}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleImportHotels}
                  disabled={!canImportHotels}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import {hotelPayload.hotels?.length || 0} Hotels
                </Button>
              </div>
            )}

            {/* Segment Research Summary */}
            {validationResult && !isHotelMode && (
              <div
                className={`space-y-3 p-4 rounded-lg ${
                  validationResult.valid
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-destructive/10 border border-destructive/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {validationResult.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Validation Passed</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="font-medium">Validation Failed</span>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Items:</span>
                    <span className="ml-1 font-medium">{validationResult.summary.research_items}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days:</span>
                    <span className="ml-1 font-medium">{validationResult.summary.days}</span>
                  </div>
                </div>

                {validationResult.issues.length > 0 && (
                  <div className="space-y-1 text-sm">
                    {validationResult.issues.slice(0, 3).map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-1 text-destructive">
                        <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="text-xs">{issue}</span>
                      </div>
                    ))}
                  </div>
                )}

                {validationResult.valid && (
                  <>
                    {/* Import Options */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="auto-approve-sheet"
                          checked={importOptions.auto_approve_must_do}
                          onCheckedChange={(checked) =>
                            setImportOptions((prev) => ({
                              ...prev,
                              auto_approve_must_do: checked === true,
                            }))
                          }
                        />
                        <label htmlFor="auto-approve-sheet" className="text-xs">
                          Auto-approve &quot;must_do&quot; items
                        </label>
                      </div>
                    </div>

                    <Button
                      onClick={handleImportSegment}
                      disabled={!canImportSegment || importMutation.isPending}
                      className="w-full"
                    >
                      {importMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Import Segment Research
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
