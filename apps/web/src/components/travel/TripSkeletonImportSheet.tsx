"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreateTrip, useCreateTripSegment } from "@/lib/api";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileUp,
  Map,
} from "lucide-react";
import { toast } from "sonner";

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
    priority?: string;
    notes?: string;
  }>;
}

interface TripSkeletonImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripSkeletonImportSheet({
  open,
  onOpenChange,
}: TripSkeletonImportSheetProps) {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [skeletonPayload, setSkeletonPayload] = useState<SkeletonPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const createTripMutation = useCreateTrip();
  const createSegmentMutation = useCreateTripSegment();

  const handleParseJson = useCallback((content: string) => {
    try {
      setParseError(null);
      const parsed = JSON.parse(content);

      if (parsed.trip && parsed.segments && Array.isArray(parsed.segments)) {
        setSkeletonPayload(parsed as SkeletonPayload);
        return true;
      } else if (parsed.metadata && parsed.hotels) {
        setParseError("This is hotel research. Import from your trip page instead.");
        setSkeletonPayload(null);
        return false;
      } else if (parsed.metadata && parsed.research_items) {
        setParseError("This is segment research. Import from your trip page instead.");
        setSkeletonPayload(null);
        return false;
      } else {
        setParseError("Unrecognized JSON format. Expected trip skeleton.");
        setSkeletonPayload(null);
        return false;
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
      setSkeletonPayload(null);
      return false;
    }
  }, []);

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

  const handleImportSkeleton = async () => {
    if (!skeletonPayload) {
      toast.error("No valid skeleton to import");
      return;
    }

    setIsImporting(true);
    try {
      const tripData = {
        name: skeletonPayload.trip.name,
        start_date: skeletonPayload.trip.start_date,
        end_date: skeletonPayload.trip.end_date,
        traveler_count: skeletonPayload.trip.traveler_count,
        status: skeletonPayload.trip.status || "planning",
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

      const createdTrip = await createTripMutation.mutateAsync(tripData);
      const tripId = createdTrip.id;

      let segmentsCreated = 0;
      for (const seg of skeletonPayload.segments) {
        const segmentData = {
          name: seg.name,
          start_date: seg.start_date,
          end_date: seg.end_date,
          location_name: seg.location?.location_name,
          latitude: seg.location?.latitude,
          longitude: seg.location?.longitude,
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
          priority: seg.priority,
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

      toast.success(`Created "${skeletonPayload.trip.name}" with ${segmentsCreated} segments`);
      onOpenChange(false);
      router.push(`/travel/${tripId}/details`);
    } catch (error) {
      console.error("Skeleton import error:", error);
      toast.error("Failed to import skeleton");
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setJsonInput("");
    setSkeletonPayload(null);
    setParseError(null);
  };

  return (
    <Sheet open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetState();
      onOpenChange(newOpen);
    }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-4">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-blue-500" />
                Import Trip Planning
              </SheetTitle>
              <SheetDescription>
                Import trip-skeleton.json from Phase 1 to create a new trip
              </SheetDescription>
            </SheetHeader>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("skeleton-upload")?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragging
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <input
                type="file"
                id="skeleton-upload"
                className="hidden"
                accept=".json"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
                  <FileUp className={`h-6 w-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {isDragging ? "Drop your JSON file here" : "Drag & drop or click to browse"}
                  </p>
                </div>
              </div>
            </div>

            {/* Or paste JSON */}
            <div className="space-y-2">
              <Label className="text-sm">Or paste JSON</Label>
              <Textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setParseError(null);
                  setSkeletonPayload(null);
                }}
                className="font-mono text-xs min-h-[120px]"
                placeholder='{"trip": {...}, "segments": [...]}'
              />
              {jsonInput && !skeletonPayload && !parseError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleParseJson(jsonInput)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Validate
                </Button>
              )}
            </div>

            {/* Parse Error */}
            {parseError && (
              <div className="flex items-start gap-2 text-amber-600 text-sm p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Skeleton Summary */}
            {skeletonPayload && (
              <div className="space-y-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Trip Skeleton Valid</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Trip:</span>
                    <p className="font-medium">{skeletonPayload.trip.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Destination:</span>
                    <p className="font-medium">{skeletonPayload.trip.destination_country || "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Dates:</span>
                    <p className="font-medium text-xs">
                      {skeletonPayload.trip.start_date} → {skeletonPayload.trip.end_date}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Segments:</span>
                    <p className="font-medium">{skeletonPayload.segments.length}</p>
                  </div>
                </div>

                {/* Segment List */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Segments to create:</span>
                  <div className="flex flex-wrap gap-1">
                    {skeletonPayload.segments.map((seg) => (
                      <Badge key={seg.segment_number} variant="secondary" className="text-xs">
                        {seg.segment_number}. {seg.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleImportSkeleton}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Create Trip with {skeletonPayload.segments.length} Segments
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
