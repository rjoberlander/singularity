"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useValidateImport,
  useImportTrip,
  useTrips,
  useTripSegments,
  useCreateTrip,
  useCreateTripSegment,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  ArrowLeft,
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings,
  BookOpen,
  FileUp,
  Map,
  Layers,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  TripImportPayload,
  TripImportOptions,
  TripImportValidationResult,
} from "@singularity/shared-types";

type ImportMode = "skeleton" | "segment_new" | "segment_existing";

interface SkeletonPayload {
  trip: {
    name: string;
    destination_country?: string;
    destination_country_code?: string;
    start_date: string;
    end_date: string;
    total_days?: number;
    total_nights?: number;
    traveler_count?: number;
    status?: string;
    overview?: string;
    route_description?: string;
    logistics?: Record<string, unknown>;
    budget?: Record<string, unknown>;
    pacing_notes?: string;
    exclusions?: string;
    risks_and_mitigations?: Array<{ risk: string; mitigation: string }>;
  };
  segments: Array<{
    segment_number: number;
    name: string;
    region?: string;
    start_date: string;
    end_date: string;
    nights?: number;
    days?: number;
    theme?: string;
    why_here?: string;
    key_experiences?: string[];
    location?: {
      location_name?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };
    accommodation?: Record<string, unknown>;
    driving?: Record<string, unknown>;
    day_trips?: Array<Record<string, unknown>>;
    priority?: string;
    flexibility?: string;
    weather_considerations?: string;
    booking_urgency?: Array<Record<string, unknown>>;
    notes?: string;
  }>;
  decision_log?: {
    decisions?: Array<{
      topic: string;
      decision: string;
      reasoning?: string;
      alternatives_considered?: string[];
    }>;
  };
}

/**
 * Trip Import Page
 *
 * Supports 3 import modes:
 * 1. Skeleton Import (Phase 1) - Creates trip + empty segment shells from Trip Planner
 * 2. Segment Research → New Trip (Phase 2) - Creates trip + filled segment + days + items
 * 3. Segment Research → Existing Trip (Phase 2) - Adds to existing trip
 *
 * Part of the 2-phase trip planning workflow.
 */
export default function TravelImportPage() {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("skeleton");
  const [detectedType, setDetectedType] = useState<"skeleton" | "segment" | null>(null);

  // Skeleton payload
  const [skeletonPayload, setSkeletonPayload] = useState<SkeletonPayload | null>(null);

  // Segment research payload
  const [parsedPayload, setParsedPayload] = useState<TripImportPayload | null>(null);
  const [validationResult, setValidationResult] = useState<TripImportValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // For segment mode - select existing trip/segment
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");

  // Import options
  const [importOptions, setImportOptions] = useState<TripImportOptions>({
    create_trip: true,
    create_segment: true,
    create_days: true,
    create_research_items: true,
    import_approved_as_activities: false,
    auto_approve_must_do: true,
    trip_id: undefined,
  });

  const { data: existingTrips } = useTrips({ limit: 50 });
  const { data: existingSegments } = useTripSegments(selectedTripId || "");
  const validateMutation = useValidateImport();
  const importMutation = useImportTrip();
  const createTripMutation = useCreateTrip();
  const createSegmentMutation = useCreateTripSegment();

  // Update import options when mode changes
  useEffect(() => {
    if (importMode === "skeleton") {
      setImportOptions((prev) => ({
        ...prev,
        create_trip: true,
        create_segment: true,
        create_days: false,
        create_research_items: false,
      }));
    } else if (importMode === "segment_new") {
      setImportOptions((prev) => ({
        ...prev,
        create_trip: true,
        create_segment: true,
        create_days: true,
        create_research_items: true,
        trip_id: undefined,
      }));
    } else if (importMode === "segment_existing") {
      setImportOptions((prev) => ({
        ...prev,
        create_trip: false,
        create_segment: true,
        create_days: true,
        create_research_items: true,
        trip_id: selectedTripId || undefined,
      }));
    }
  }, [importMode, selectedTripId]);

  // Detect JSON type and parse
  const handleParseJson = useCallback(() => {
    try {
      setParseError(null);
      const parsed = JSON.parse(jsonInput);

      // Detect if it's a skeleton (has trip.name and segments array) or segment research (has metadata and research_items)
      if (parsed.trip && parsed.segments && Array.isArray(parsed.segments)) {
        // This is a skeleton
        setDetectedType("skeleton");
        setSkeletonPayload(parsed as SkeletonPayload);
        setParsedPayload(null);
        if (importMode !== "skeleton") {
          setImportMode("skeleton");
        }
        return { type: "skeleton" as const, payload: parsed };
      } else if (parsed.metadata && parsed.research_items) {
        // This is segment research
        setDetectedType("segment");
        setParsedPayload(parsed as TripImportPayload);
        setSkeletonPayload(null);
        if (importMode === "skeleton") {
          setImportMode("segment_new");
        }
        return { type: "segment" as const, payload: parsed };
      } else {
        // Unknown format
        setParseError("Unrecognized JSON format. Expected trip skeleton or segment research.");
        return null;
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
      setParsedPayload(null);
      setSkeletonPayload(null);
      setDetectedType(null);
      return null;
    }
  }, [jsonInput, importMode]);

  // Validate the segment research payload
  const handleValidate = async () => {
    const result = handleParseJson();
    if (!result) return;

    if (result.type === "skeleton") {
      // For skeleton, just mark as valid if it has required fields
      const skeleton = result.payload as SkeletonPayload;
      if (skeleton.trip?.name && skeleton.trip?.start_date && skeleton.trip?.end_date) {
        toast.success("Skeleton validated successfully");
      } else {
        setParseError("Skeleton missing required fields: trip.name, trip.start_date, trip.end_date");
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

  // Import skeleton
  const handleImportSkeleton = async () => {
    if (!skeletonPayload) {
      toast.error("Please parse and validate JSON first");
      return;
    }

    try {
      // Convert skeleton to import format - use any to pass extra v3 fields
      const tripData = {
        name: skeletonPayload.trip.name,
        start_date: skeletonPayload.trip.start_date,
        end_date: skeletonPayload.trip.end_date,
        traveler_count: skeletonPayload.trip.traveler_count,
        status: skeletonPayload.trip.status || "planning",
        // V3 skeleton fields passed as additional properties
        destination_country: skeletonPayload.trip.destination_country,
        destination_country_code: skeletonPayload.trip.destination_country_code,
        total_days: skeletonPayload.trip.total_days,
        total_nights: skeletonPayload.trip.total_nights,
        overview: skeletonPayload.trip.overview,
        route_description: skeletonPayload.trip.route_description,
        logistics: skeletonPayload.trip.logistics,
        budget: skeletonPayload.trip.budget,
        pacing_notes: skeletonPayload.trip.pacing_notes,
      } as any;

      // Create trip first using the mutation
      const createdTrip = await createTripMutation.mutateAsync(tripData);
      const tripId = createdTrip.id;

      // Create segment shells
      let segmentsCreated = 0;
      for (const seg of skeletonPayload.segments) {
        const segmentData = {
          name: seg.name,
          start_date: seg.start_date,
          end_date: seg.end_date,
          location_name: seg.location?.location_name,
          latitude: seg.location?.latitude,
          longitude: seg.location?.longitude,
          // V3 skeleton fields
          segment_number: seg.segment_number,
          region: seg.region,
          nights: seg.nights,
          days: seg.days,
          theme: seg.theme,
          why_here: seg.why_here,
          key_experiences: seg.key_experiences,
          country: seg.location?.country,
          timezone: seg.location?.timezone,
          accommodation: seg.accommodation,
          driving: seg.driving,
          day_trips: seg.day_trips,
          priority: seg.priority,
          flexibility: seg.flexibility,
          weather_considerations: seg.weather_considerations,
          booking_urgency: seg.booking_urgency,
          notes: seg.notes,
          research_status: "not_started",
        } as any;

        try {
          await createSegmentMutation.mutateAsync({ tripId, data: segmentData });
          segmentsCreated++;
        } catch (segError) {
          console.error("Failed to create segment:", seg.name, segError);
        }
      }

      toast.success(
        `Created trip "${skeletonPayload.trip.name}" with ${segmentsCreated} segment shells`
      );
      router.push(`/travel/${tripId}`);
    } catch (error) {
      console.error("Skeleton import error:", error);
      toast.error("Failed to import skeleton");
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
      trip_id: importMode === "segment_existing" ? selectedTripId : undefined,
      segment_id: importMode === "segment_existing" && selectedSegmentId && selectedSegmentId !== "_new" ? selectedSegmentId : undefined,
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
        router.push(`/travel/${result.trip_id}`);
      } else {
        toast.error(`Import completed with errors: ${result.errors?.join(", ")}`);
      }
    } catch (error) {
      toast.error("Import failed");
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      setParseError(null);
      setParsedPayload(null);
      setSkeletonPayload(null);
      setValidationResult(null);
      setDetectedType(null);
    };
    reader.readAsText(file);
  };

  // Handle file from drop
  const handleFileDrop = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Please drop a JSON file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
      setParseError(null);
      setParsedPayload(null);
      setSkeletonPayload(null);
      setValidationResult(null);
      setDetectedType(null);
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
    // Only set to false if we're leaving the drop zone entirely
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

  const isSkeletonMode = importMode === "skeleton";
  const canImport = isSkeletonMode
    ? skeletonPayload !== null
    : validationResult?.valid === true;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/travel">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Import Trip Data
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Upload JSON from Claude to create trips and research items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/travel/guide">
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Guide
            </Button>
          </Link>
          <Link href="/travel/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Import Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>What are you importing?</CardTitle>
          <CardDescription>
            Choose the type of import based on which phase of planning you&apos;re in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={importMode}
            onValueChange={(value) => setImportMode(value as ImportMode)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="skeleton" id="skeleton" className="mt-1" />
              <div className="flex-1">
                <label htmlFor="skeleton" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Map className="h-4 w-4 text-blue-500" />
                  Trip Skeleton (Phase 1)
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Creates a new trip with segment shells. Use this when you&apos;ve finished trip planning
                  and have a trip-skeleton.json file.
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Phase 1
              </Badge>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="segment_new" id="segment_new" className="mt-1" />
              <div className="flex-1">
                <label htmlFor="segment_new" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Plus className="h-4 w-4 text-green-500" />
                  Segment Research → New Trip (Phase 2)
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Creates a new trip from segment research. Use this if you skipped Phase 1 and went
                  straight to researching a segment.
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Phase 2
              </Badge>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="segment_existing" id="segment_existing" className="mt-1" />
              <div className="flex-1">
                <label htmlFor="segment_existing" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Layers className="h-4 w-4 text-green-500" />
                  Segment Research → Existing Trip (Phase 2)
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Adds segment research to an existing trip. Use this for subsequent segments after
                  your trip skeleton is already imported.
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Phase 2
              </Badge>
            </div>
          </RadioGroup>

          {/* Trip/Segment Selection for existing trip mode */}
          {importMode === "segment_existing" && (
            <div className="mt-4 space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label>Select Trip</Label>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a trip..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingTrips?.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTripId && existingSegments && existingSegments.length > 0 && (
                <div className="space-y-2">
                  <Label>Fill Existing Segment (Optional)</Label>
                  <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Create new segment or choose existing..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_new">Create new segment</SelectItem>
                      {existingSegments.map((seg) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          #{seg.segment_number} - {seg.name}
                          {seg.research_status === "not_started" && " (empty)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select an empty segment shell to fill it with research, or leave blank to create a new segment.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Upload JSON
          </CardTitle>
          <CardDescription>
            {isSkeletonMode
              ? "Paste the trip-skeleton.json from Phase 1 (Trip Planner)"
              : "Paste the segment-N-research.json from Phase 2 (Research Agent)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById("json-upload")?.click()}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragging
                ? 'border-primary bg-primary/10'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <input
              type="file"
              id="json-upload"
              className="hidden"
              accept=".json"
              onChange={handleFileUpload}
            />
            <div className="flex flex-col items-center gap-2">
              <div className={`p-3 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-muted'}`}>
                <FileUp className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium">
                  {isDragging ? 'Drop your JSON file here' : 'Drag & drop your JSON file here'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or paste JSON</span>
            </div>
          </div>

          {/* JSON Input */}
          <Textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setParseError(null);
              setParsedPayload(null);
              setSkeletonPayload(null);
              setValidationResult(null);
              setDetectedType(null);
            }}
            className="min-h-[200px] font-mono text-xs"
            placeholder={
              isSkeletonMode
                ? '{"trip": {"name": "...", "start_date": "...", ...}, "segments": [...]}'
                : '{"metadata": {...}, "segment": {...}, "research_items": [...], "days": [...]}'
            }
          />

          {/* Detected Type Badge */}
          {detectedType && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={detectedType === "skeleton" ? "border-blue-500 text-blue-700" : "border-green-500 text-green-700"}>
                Detected: {detectedType === "skeleton" ? "Trip Skeleton" : "Segment Research"}
              </Badge>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              <span>Error: {parseError}</span>
            </div>
          )}

          {/* Validate Button */}
          <Button
            onClick={handleValidate}
            disabled={!jsonInput || validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Validate JSON
          </Button>
        </CardContent>
      </Card>

      {/* Skeleton Summary */}
      {skeletonPayload && isSkeletonMode && (
        <Card className="border-blue-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              Trip Skeleton Parsed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Trip Name:</span>
                <p className="font-medium">{skeletonPayload.trip.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Destination:</span>
                <p className="font-medium">
                  {skeletonPayload.trip.destination_country || "Not specified"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Dates:</span>
                <p className="font-medium">
                  {skeletonPayload.trip.start_date} to {skeletonPayload.trip.end_date}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Segments:</span>
                <p className="font-medium">{skeletonPayload.segments.length} segment shells</p>
              </div>
            </div>

            {/* Segment List */}
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">Segments to create:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {skeletonPayload.segments.map((seg) => (
                  <Badge key={seg.segment_number} variant="outline">
                    #{seg.segment_number} {seg.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Import Button */}
            <Button onClick={handleImportSkeleton} className="w-full mt-6">
              <Upload className="h-4 w-4 mr-2" />
              Import Trip Skeleton
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Segment Research Summary */}
      {parsedPayload && !isSkeletonMode && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Trip:</span>
                <p className="font-medium">{parsedPayload.metadata?.trip_name || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Segment:</span>
                <p className="font-medium">
                  #{parsedPayload.metadata?.segment_number} -{" "}
                  {parsedPayload.segment?.name || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Research Items:</span>
                <p className="font-medium">{parsedPayload.research_items?.length || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Days:</span>
                <p className="font-medium">{parsedPayload.days?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && !isSkeletonMode && (
        <Card
          className={validationResult.valid ? "border-green-500/50" : "border-destructive/50"}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.valid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Validation Passed
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Validation Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Research Items:</span>
                <p className="font-medium">{validationResult.summary.research_items}</p>
              </div>
              <div>
                <span className="text-muted-foreground">With Source URL:</span>
                <p className="font-medium">{validationResult.summary.items_with_source}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Days:</span>
                <p className="font-medium">{validationResult.summary.days}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Items by Priority:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(validationResult.summary.items_by_priority || {}).map(
                    ([priority, count]) => (
                      <Badge key={priority} variant="secondary" className="text-xs">
                        {priority}: {count}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Items by Type */}
            <div>
              <span className="text-sm text-muted-foreground">Items by Type:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(validationResult.summary.items_by_type || {}).map(
                  ([type, count]) => (
                    <Badge key={type} variant="outline">
                      {type}: {count}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Issues */}
            {validationResult.issues.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-destructive">Issues:</span>
                <ul className="text-sm space-y-1">
                  {validationResult.issues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-destructive">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-amber-600">Warnings:</span>
                <ul className="text-sm space-y-1">
                  {validationResult.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Options for Segment Research */}
      {validationResult?.valid && !isSkeletonMode && (
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
            <CardDescription>Configure what gets created during import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What to Create */}
            <div className="space-y-3">
              <Label>What to Create</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-segment"
                    checked={importOptions.create_segment}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        create_segment: checked === true,
                      }))
                    }
                  />
                  <label htmlFor="create-segment" className="text-sm">
                    Create/update segment with city info, packing list, etc.
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-days"
                    checked={importOptions.create_days}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        create_days: checked === true,
                      }))
                    }
                  />
                  <label htmlFor="create-days" className="text-sm">
                    Create days with titles, themes, weather
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-items"
                    checked={importOptions.create_research_items}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        create_research_items: checked === true,
                      }))
                    }
                  />
                  <label htmlFor="create-items" className="text-sm">
                    Create research items (for review before adding to itinerary)
                  </label>
                </div>
              </div>
            </div>

            {/* Auto-approve Options */}
            <div className="space-y-3">
              <Label>Auto-Processing</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-approve"
                    checked={importOptions.auto_approve_must_do}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        auto_approve_must_do: checked === true,
                      }))
                    }
                  />
                  <label htmlFor="auto-approve" className="text-sm">
                    Auto-approve &quot;must_do&quot; priority items
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="import-activities"
                    checked={importOptions.import_approved_as_activities}
                    onCheckedChange={(checked) =>
                      setImportOptions((prev) => ({
                        ...prev,
                        import_approved_as_activities: checked === true,
                      }))
                    }
                  />
                  <label htmlFor="import-activities" className="text-sm">
                    Immediately convert approved items to activities (skip review)
                  </label>
                </div>
              </div>
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImportSegment}
              disabled={importMutation.isPending || (importMode === "segment_existing" && !selectedTripId)}
              className="w-full"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import to{" "}
              {importMode === "segment_new"
                ? parsedPayload?.metadata?.trip_name || "New Trip"
                : existingTrips?.find((t) => t.id === selectedTripId)?.name || "Selected Trip"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
