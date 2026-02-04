"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Check, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, Pencil, X, Wand2, Upload, FileUp, Sparkles, ImageIcon, Plane, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUpdateTrip } from "@/lib/api";
import { toast } from "sonner";
import type { PlanningStepId, StepCompletionStatus, PlanningStepConfig, SegmentInfo, SegmentAccommodationInfo, FlightInfo } from "@/lib/travel-planning";
import type { Trip, ValidationResult, ValidationIssue } from "@singularity/shared-types";

interface PlanStepCardProps {
  tripId: string;
  step: PlanningStepConfig;
  stepIndex: number;
  status: StepCompletionStatus;
  isActive: boolean;
  isLoading?: boolean;
  onMarkComplete: () => void;
  onUnmarkComplete: () => void;
  // Trip data for inline editing (only needed for basics step)
  tripData?: {
    name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    destination?: string | null;
    origin?: string | null;
    transportation_type?: string | null;
    traveler_count?: number | null;
  };
  // Action callbacks
  onAssembleSchedule?: () => void;
  isAssembling?: boolean;
  onImportResearch?: (type: "segment" | "hotel", file?: File) => void;
  onImportSkeleton?: (file?: File) => void;
  onImportFlightImage?: (file: File) => void;
  isExtractingFlight?: boolean;
  hasSegments?: boolean;
  // Validation results (for days_activities step)
  validationResult?: ValidationResult | null;
}

export function PlanStepCard({
  tripId,
  step,
  stepIndex,
  status,
  isActive,
  isLoading,
  onMarkComplete,
  onUnmarkComplete,
  tripData,
  onAssembleSchedule,
  isAssembling,
  onImportResearch,
  onImportSkeleton,
  onImportFlightImage,
  isExtractingFlight,
  hasSegments,
  validationResult,
}: PlanStepCardProps) {
  const hasMissingItems = status.missingItems.length > 0;
  const isCompleted = status.completed;
  const isAutoSuggested = status.auto_suggested;

  // Inline editing state (only for basics step)
  const [isEditing, setIsEditing] = useState(false);
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [transportationType, setTransportationType] = useState("");
  const [travelerCount, setTravelerCount] = useState(1);

  // Sync state with tripData when it loads or changes
  useEffect(() => {
    if (tripData) {
      setTripName(tripData.name || "");
      // Extract just the date portion (YYYY-MM-DD) to avoid timezone shifts
      setStartDate(tripData.start_date ? tripData.start_date.split("T")[0] : "");
      setEndDate(tripData.end_date ? tripData.end_date.split("T")[0] : "");
      setDestination(tripData.destination || "");
      setOrigin(tripData.origin || "");
      setTransportationType(tripData.transportation_type || "");
      setTravelerCount(tripData.traveler_count || 1);
    }
  }, [tripData]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const updateTrip = useUpdateTrip();

  const handleSaveBasics = async () => {
    try {
      await updateTrip.mutateAsync({
        id: tripId,
        data: {
          name: tripName || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          destination: destination || undefined,
          origin: origin || undefined,
          transportation_type: transportationType as Trip["transportation_type"] || undefined,
          traveler_count: travelerCount || 1,
        },
      });
      toast.success("Trip basics updated");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update trip:", error);
      toast.error("Failed to update trip basics");
    }
  };

  const handleCancelEdit = () => {
    setTripName(tripData?.name || "");
    // Extract just the date portion (YYYY-MM-DD) to avoid timezone shifts
    setStartDate(tripData?.start_date ? tripData.start_date.split("T")[0] : "");
    setEndDate(tripData?.end_date ? tripData.end_date.split("T")[0] : "");
    setDestination(tripData?.destination || "");
    setOrigin(tripData?.origin || "");
    setTransportationType(tripData?.transportation_type || "");
    setTravelerCount(tripData?.traveler_count || 1);
    setIsEditing(false);
  };

  const isBasicsStep = step.id === "basics";
  const isDaysActivitiesStep = step.id === "days_activities";
  const isSegmentsStep = step.id === "segments";
  const isMealsStep = step.id === "meals";
  const isAccommodationsStep = step.id === "accommodations";
  const canEdit = isBasicsStep && !isCompleted;
  const canImport = (isSegmentsStep || isAccommodationsStep || isMealsStep) && onImportResearch;
  const canImportSkeleton = isBasicsStep && onImportSkeleton;

  // Determine if any drag-drop is enabled
  const canDrop = canImport || canImportSkeleton;

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canDrop) setIsDragging(true);
  }, [canDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canDrop) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".json")) {
        if (canImportSkeleton) {
          onImportSkeleton?.(file);
        } else if (canImport) {
          const importType = isAccommodationsStep ? "hotel" : "segment";
          onImportResearch?.(importType, file);
        }
      } else {
        toast.error("Please drop a JSON file");
      }
    }
  }, [canDrop, canImportSkeleton, canImport, isAccommodationsStep, onImportResearch, onImportSkeleton]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".json")) {
        const importType = isAccommodationsStep ? "hotel" : "segment";
        onImportResearch?.(importType, file);
      } else {
        toast.error("Please select a JSON file");
      }
    }
    // Reset input
    e.target.value = "";
  }, [isAccommodationsStep, onImportResearch]);

  const handleSkeletonFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".json")) {
        onImportSkeleton?.(file);
      } else {
        toast.error("Please select a JSON file");
      }
    }
    // Reset input
    e.target.value = "";
  }, [onImportSkeleton]);

  // Image/PDF drop handlers for flight extraction
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  const handleImageDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  }, []);

  const handleImageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingImage(false);
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      if (isImage || isPDF) {
        onImportFlightImage?.(file);
      } else {
        toast.error("Please drop an image or PDF file");
      }
    }
  }, [onImportFlightImage]);

  const handleFlightImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFlightImage?.(file);
    }
    e.target.value = "";
  }, [onImportFlightImage]);

  // Paste handler for images
  useEffect(() => {
    if (!isBasicsStep || !onImportFlightImage) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            onImportFlightImage(file);
            break;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isBasicsStep, onImportFlightImage]);

  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-primary",
        isCompleted && "bg-green-500/5 border-green-500/30",
        isDragging && "ring-2 ring-blue-500 bg-blue-500/5"
      )}
      onDragEnter={canDrop ? handleDragEnter : undefined}
      onDragLeave={canDrop ? handleDragLeave : undefined}
      onDragOver={canDrop ? handleDragOver : undefined}
      onDrop={canDrop ? handleDrop : undefined}
    >
      <CardHeader className="py-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Step number */}
            <div
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                isCompleted
                  ? "bg-green-500 text-white"
                  : isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                <span>{stepIndex + 1}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <CardTitle className="text-base">{step.title}</CardTitle>
                {canEdit && !isCompleted && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setIsEditing(true)} data-testid="edit-basics-button">
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {/* Status badge + action buttons in header */}
          <div className="flex items-center gap-1">
            {isCompleted ? (
              <>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onUnmarkComplete} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Undo
                </Button>
              </>
            ) : (
              <>
                {isAutoSuggested ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Validated
                  </Badge>
                ) : hasMissingItems ? (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Incomplete
                  </Badge>
                ) : null}
                <Button
                  variant={isAutoSuggested ? "default" : "outline"}
                  size="sm"
                  className={cn("h-6 text-xs px-2", isAutoSuggested && "bg-green-600 hover:bg-green-700 text-white")}
                  onClick={onMarkComplete}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-2 px-3">
        {/* Inline editing form for Trip Basics */}
        {isBasicsStep && isEditing ? (
          <div className="p-2 bg-muted/50 rounded border text-xs space-y-2">
            {/* Row 1: Trip name + dates */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input className="h-7 text-xs flex-1 min-w-[200px]" placeholder="Trip name" value={tripName} onChange={(e) => setTripName(e.target.value)} data-testid="trip-name-input" />
              <Input type="date" className="h-7 text-xs w-[130px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="start-date-input" />
              <span className="text-muted-foreground text-[10px]">to</span>
              <Input type="date" className="h-7 text-xs w-[130px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="end-date-input" />
            </div>
            {/* Row 2: Origin → Dest, Travelers, Transport, Save/Cancel */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input className="h-7 text-xs w-24" placeholder="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} data-testid="origin-input" />
              <span className="text-muted-foreground text-[10px]">→</span>
              <Input className="h-7 text-xs w-24" placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} data-testid="destination-input" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-[10px]">Travelers:</span>
                <Input type="number" min={1} className="h-7 text-xs w-12 text-center" value={travelerCount} onChange={(e) => setTravelerCount(parseInt(e.target.value) || 1)} data-testid="travelers-input" />
              </div>
              <label className="flex items-center gap-1 cursor-pointer" data-testid="transportation-flying">
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    (transportationType === "flying" || transportationType === "both")
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  )}
                  onClick={() => {
                    if (transportationType === "both") setTransportationType("driving");
                    else if (transportationType === "flying") setTransportationType("");
                    else if (transportationType === "driving") setTransportationType("both");
                    else setTransportationType("flying");
                  }}
                >
                  {(transportationType === "flying" || transportationType === "both") && <Check className="h-3 w-3" />}
                </div>
                <span className="text-xs">Fly</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer" data-testid="transportation-driving">
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    (transportationType === "driving" || transportationType === "both")
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary/50"
                  )}
                  onClick={() => {
                    if (transportationType === "both") setTransportationType("flying");
                    else if (transportationType === "driving") setTransportationType("");
                    else if (transportationType === "flying") setTransportationType("both");
                    else setTransportationType("driving");
                  }}
                >
                  {(transportationType === "driving" || transportationType === "both") && <Check className="h-3 w-3" />}
                </div>
                <span className="text-xs">Drive</span>
              </label>
              <div className="flex-1" />
              <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveBasics} disabled={updateTrip.isPending} data-testid="save-basics-button">
                {updateTrip.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-1 text-xs" onClick={handleCancelEdit} disabled={updateTrip.isPending}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : isDaysActivitiesStep && onAssembleSchedule ? (
          /* Full-width layout for Days & Activities step */
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Build itinerary:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="font-medium text-foreground mb-1">1. Enrich Data</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Fetch Google opening hours</li>
                    <li>• Get ratings, reviews & photos</li>
                    <li className="text-xs opacity-80 ml-2">↳ 20 photos (primary), 10 (alternates)</li>
                    <li>• Restaurant: Top 3-5 dishes from reviews</li>
                    <li>• Attraction: Ticket prices if available</li>
                    <li className="text-green-600 dark:text-green-400">• Skip already enriched</li>
                  </ul>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="font-medium text-foreground mb-1">2. Generate Schedule</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• AI creates 15-min precision times</li>
                    <li>• Add travel time between locations</li>
                    <li>• Insert meals, check-in/out, buffers</li>
                  </ul>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="font-medium text-foreground mb-1">3. Validate</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• Check opening hours conflicts</li>
                    <li>• Verify hotel amenities</li>
                    <li>• Flag bookings & duration issues</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Enrichment status by segment */}
            {status.segmentDetails && status.segmentDetails.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Enrichment status:</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-purple-500" />
                      Complete
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm border-2 border-purple-500" />
                      Partial
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-muted" />
                      None
                    </span>
                  </div>
                </div>
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50">
                      <th className="text-left py-1 pr-2 font-medium">#</th>
                      <th className="text-left py-1 pr-2 font-medium">Segment</th>
                      <th className="text-left py-1 pr-2 font-medium">Dates</th>
                      <th className="text-left py-1 pr-2 font-medium">Enrichment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.segmentDetails.map((seg) => (
                      <tr key={seg.segmentId} className="border-b border-border/30 last:border-0">
                        <td className="py-0.5 pr-2 text-muted-foreground">{seg.segmentNumber || "-"}</td>
                        <td className="py-0.5 pr-2">{seg.segmentName}</td>
                        <td className="py-0.5 pr-2 text-muted-foreground whitespace-nowrap">
                          {formatDateCompact(seg.startDate)} - {formatDateCompact(seg.endDate)}
                        </td>
                        <td className="py-0.5 pr-2">
                          <div className="flex items-center gap-0.5">
                            {seg.days?.map((day) => {
                              const hasEnrichable = (day.totalEnrichable || 0) > 0;
                              const isComplete = day.enrichmentStatus === 'complete';
                              const isPartial = day.enrichmentStatus === 'partial';

                              return (
                                <div
                                  key={`enrich-${day.date}`}
                                  className={cn(
                                    "w-4 h-4 rounded-sm text-[9px] flex items-center justify-center font-medium",
                                    isComplete
                                      ? "bg-purple-500 text-white"
                                      : isPartial
                                      ? "border-2 border-purple-500 text-purple-500"
                                      : hasEnrichable
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-muted/50 text-muted-foreground/50"
                                  )}
                                  title={
                                    hasEnrichable
                                      ? `${day.date}: ${day.enrichedCount || 0}/${day.totalEnrichable} enriched`
                                      : `${day.date}: No enrichable activities`
                                  }
                                >
                                  {day.dayOfMonth}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="lg"
                className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white"
                onClick={onAssembleSchedule}
                disabled={isAssembling}
                data-testid="assemble-schedule-button"
              >
                {isAssembling ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
                {isAssembling ? "Enriching & Assembling..." : "Enrich Data & Assemble Schedule"}
              </Button>
            </div>

            {/* Links to results */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Results:</span>
              <Link
                href={`/travel/${tripId}/itinerary`}
                className="text-purple-500 hover:text-purple-600 underline inline-flex items-center gap-1"
              >
                Itinerary
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href={`/travel/${tripId}/validation`}
                className="text-purple-500 hover:text-purple-600 underline inline-flex items-center gap-1"
              >
                Validation Report
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Pre-validation Issues */}
            <PreValidationIssues status={status} />

            {/* Validation Results (if any) */}
            {validationResult && validationResult.issues.length > 0 && (
              <ValidationResultsDisplay validation={validationResult} />
            )}
          </div>
        ) : (
          /* Multi-column layout for other steps */
          <div className="flex gap-4">
            {/* Left column - Summary */}
            <div className={cn("space-y-1", isBasicsStep && status.flightDetails?.length ? "flex-1" : "flex-1")}>
              {/* Segments Table (for Segments step) */}
              {isSegmentsStep && status.segmentDetails && status.segmentDetails.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">{status.segmentDetails.length} segment{status.segmentDetails.length !== 1 ? "s" : ""} created</p>
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-1 pr-2 font-medium">#</th>
                        <th className="text-left py-1 pr-2 font-medium">Segment</th>
                        <th className="text-left py-1 pr-2 font-medium">Dates</th>
                        <th className="text-left py-1 pr-2 font-medium">Days</th>
                        <th className="text-center py-1 font-medium">Research</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.segmentDetails.map((seg) => (
                        <tr key={seg.segmentId} className="border-b border-border/30 last:border-0">
                          <td className="py-0.5 pr-2 text-muted-foreground">{seg.segmentNumber || "-"}</td>
                          <td className="py-0.5 pr-2">{seg.segmentName}</td>
                          <td className="py-0.5 pr-2 text-muted-foreground whitespace-nowrap">
                            {formatDateCompact(seg.startDate)} - {formatDateCompact(seg.endDate)}
                          </td>
                          <td className="py-0.5 pr-2">
                            <div className="flex items-center gap-0.5">
                              {seg.days?.map((day) => (
                                <div
                                  key={day.date}
                                  className={cn(
                                    "w-4 h-4 rounded-sm text-[9px] flex items-center justify-center font-medium",
                                    day.hasActivity
                                      ? "bg-green-500 text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                  title={`${day.date}: ${day.hasActivity ? "Has activities" : "No activities"}`}
                                >
                                  {day.dayOfMonth}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-0.5 text-center">
                            {seg.days?.some(d => d.hasActivity) ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Date gaps warning */}
                  {status.dateGaps && status.dateGaps.length > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        Date gaps in coverage:
                      </div>
                      <ul className="ml-4">
                        {status.dateGaps.map((gap, idx) => (
                          <li key={idx}>- {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Accommodations Table (for Accommodations step) */}
              {isAccommodationsStep && status.accommodationDetails && status.accommodationDetails.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">
                    {status.accommodationDetails.filter(s => s.hasAccommodation).length} of {status.accommodationDetails.length} segments have accommodations
                  </p>
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-1 pr-2 font-medium">#</th>
                        <th className="text-left py-1 pr-2 font-medium">Segment</th>
                        <th className="text-left py-1 pr-2 font-medium">Dates</th>
                        <th className="text-left py-1 pr-2 font-medium">Hotel</th>
                        <th className="text-center py-1 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.accommodationDetails.map((seg) => (
                        <tr key={seg.segmentId} className="border-b border-border/30 last:border-0">
                          <td className="py-0.5 pr-2 text-muted-foreground">{seg.segmentNumber || "-"}</td>
                          <td className="py-0.5 pr-2">{seg.segmentName}</td>
                          <td className="py-0.5 pr-2 text-muted-foreground">
                            {formatDateCompact(seg.startDate)} - {formatDateCompact(seg.endDate)}
                          </td>
                          <td className="py-0.5 pr-2">
                            {seg.hotelName || <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="py-0.5 text-center">
                            {seg.hasAccommodation ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Meals Table (for Meals step) */}
              {isMealsStep && status.mealDetails && status.mealDetails.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">
                    {status.mealDetails.filter(m => !m.needsResearch).length} of {status.mealDetails.length} meals researched
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="text-xs w-full">
                      <thead className="sticky top-0 bg-card">
                        <tr className="text-muted-foreground border-b border-border/50">
                          <th className="text-left py-1 pr-2 font-medium">Date</th>
                          <th className="text-left py-1 pr-2 font-medium">Meal</th>
                          <th className="text-center py-1 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.mealDetails.map((meal) => (
                          <tr key={meal.activityId} className="border-b border-border/30 last:border-0">
                            <td className="py-0.5 pr-2 text-muted-foreground whitespace-nowrap">
                              {meal.date ? formatDateCompact(meal.date) : "-"}
                            </td>
                            <td className="py-0.5 pr-2 max-w-[200px] truncate" title={meal.name}>
                              {meal.name}
                            </td>
                            <td className="py-0.5 text-center">
                              {meal.needsResearch ? (
                                <span title="Needs research">
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                                </span>
                              ) : (
                                <span title="Researched">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Default Summary for non-table steps (basics, days_activities) */}
              {!isSegmentsStep && !isAccommodationsStep && !isMealsStep && status.summary.length > 0 && (
                <ul className="text-xs space-y-0">
                  {status.summary.map((item, idx) => (
                    <li key={idx} className="text-foreground">{item}</li>
                  ))}
                </ul>
              )}

              {/* Segments Table in Basics step */}
              {isBasicsStep && status.segmentDetails && status.segmentDetails.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium">{status.segmentDetails.length} segment{status.segmentDetails.length !== 1 ? "s" : ""} defined</p>
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-1 pr-2 font-medium">#</th>
                        <th className="text-left py-1 pr-2 font-medium">Segment</th>
                        <th className="text-left py-1 pr-2 font-medium">Dates</th>
                        <th className="text-right py-1 font-medium">Nights</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.segmentDetails.map((seg) => (
                        <tr key={seg.segmentId} className="border-b border-border/30 last:border-0">
                          <td className="py-0.5 pr-2 text-muted-foreground">{seg.segmentNumber || "-"}</td>
                          <td className="py-0.5 pr-2">{seg.segmentName}</td>
                          <td className="py-0.5 pr-2 text-muted-foreground">
                            {formatDateCompact(seg.startDate)} - {formatDateCompact(seg.endDate)}
                          </td>
                          <td className="py-0.5 text-right text-muted-foreground">{seg.nights || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Missing items */}
              {hasMissingItems && !isCompleted && (
                <ul className="text-xs space-y-0 mt-1">
                  {status.missingItems.map((item, idx) => (
                    <li key={idx} className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {/* Warnings */}
              {status.warnings && status.warnings.length > 0 && (
                <ul className="text-xs space-y-0 mt-1">
                  {status.warnings.map((warning, idx) => (
                    <li key={idx} className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      {warning}
                    </li>
                  ))}
                </ul>
              )}

              {/* Completed at timestamp */}
              {isCompleted && status.completed_at && (
                <p className="text-xs text-muted-foreground">
                  Completed {formatCompletedAt(status.completed_at)}
                </p>
              )}
            </div>

            {/* Middle column - Flight Details (only for basics step) */}
            {isBasicsStep && status.flightDetails && status.flightDetails.length > 0 && (
              <div className="w-52 shrink-0 space-y-1 border-l border-r border-border/30 px-2">
                <p className="text-xs font-medium">Booked Flights:</p>
                <div className="space-y-1.5">
                  {status.flightDetails.map((flight) => {
                    const depAirport = flight.departureAirport || "";
                    const arrAirport = flight.arrivalAirport || "";
                    const depTime = flight.departureDatetime ? formatFlightTime(flight.departureDatetime, depAirport) : null;
                    const arrTime = flight.arrivalDatetime ? formatFlightTime(flight.arrivalDatetime, arrAirport) : null;

                    return (
                      <div key={flight.id} className="text-[11px] bg-muted/50 rounded p-1.5">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "px-1 py-0.5 rounded text-[9px] font-medium",
                            flight.direction === "outbound"
                              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-green-500/20 text-green-600 dark:text-green-400"
                          )}>
                            {flight.direction === "outbound" ? "OUT" : "RET"}
                          </span>
                          <span className="font-medium">{depAirport}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{arrAirport}</span>
                        </div>
                        <div className="text-muted-foreground text-[10px] truncate">
                          {flight.airline} {flight.flightNumber && `• ${flight.flightNumber}`}
                        </div>

                        {/* Flight times with timezone colors - compact */}
                        <div className="mt-1 text-[10px] leading-tight">
                          {depTime && (
                            <div className="flex items-baseline gap-0.5 flex-wrap">
                              <span className="text-muted-foreground">{depTime.date}</span>
                              <span className="font-medium">{depTime.time}</span>
                              <span className="text-blue-500 dark:text-blue-400 font-medium">{depTime.tzLabel}</span>
                            </div>
                          )}
                          {depTime && arrTime && <span className="text-muted-foreground/50 mx-0.5">→</span>}
                          {arrTime && (
                            <div className="flex items-baseline gap-0.5 flex-wrap">
                              <span className="text-muted-foreground">{arrTime.date}</span>
                              <span className="font-medium text-amber-600 dark:text-amber-400">{arrTime.time}</span>
                              <span className="text-amber-500 dark:text-amber-400 font-medium">{arrTime.tzLabel}</span>
                            </div>
                          )}
                        </div>

                        {flight.layovers && flight.layovers.length > 0 && (
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            Via: {flight.layovers.map(l => `${l.airport} (${l.duration})`).join(", ")}
                          </div>
                        )}
                        {flight.bookingReference && (
                          <div className="text-[9px] text-muted-foreground">
                            Ref: {flight.bookingReference}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right column - Instructions + Action area */}
            <div className="w-56 space-y-2">
              {/* Trip Basics - Skeleton import + Flight image */}
              {isBasicsStep && (
                <>
                  {/* Skeleton import */}
                  {canImportSkeleton && (
                    <>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">Create trip skeleton:</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                          <li>Go to <span className="font-medium text-foreground">Claude Project</span></li>
                          <li>Open <span className="font-medium text-foreground">Trip Planner</span></li>
                          <li>Research &amp; export skeleton</li>
                        </ol>
                      </div>
                      <input type="file" id="import-skeleton-file" className="hidden" accept=".json" onChange={handleSkeletonFileSelect} />
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors",
                          isDragging ? "border-purple-500 bg-purple-500/10" : "border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5"
                        )}
                        onClick={() => document.getElementById("import-skeleton-file")?.click()}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        data-testid="import-skeleton-dropzone"
                      >
                        <Sparkles className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                        <p className="text-[11px] text-purple-600 dark:text-purple-400">
                          {isDragging ? "Drop skeleton JSON" : "Drop or click to import"}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Flight confirmation image import */}
                  {onImportFlightImage && (
                    <>
                      <div className="text-xs text-muted-foreground space-y-1 mt-3">
                        <p className="font-medium text-foreground">Import flight confirmation:</p>
                        <p className="text-[11px]">Drop/paste screenshot or PDF</p>
                      </div>
                      <input type="file" id="import-flight-image" className="hidden" accept="image/*,.pdf" onChange={handleFlightImageSelect} />
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors",
                          isDraggingImage ? "border-orange-500 bg-orange-500/10" : "border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5",
                          isExtractingFlight && "opacity-50 pointer-events-none"
                        )}
                        onClick={() => !isExtractingFlight && document.getElementById("import-flight-image")?.click()}
                        onDragEnter={handleImageDragEnter}
                        onDragLeave={handleImageDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleImageDrop}
                        data-testid="import-flight-image-dropzone"
                      >
                        {isExtractingFlight ? (
                          <>
                            <Loader2 className="h-4 w-4 mx-auto mb-1 text-orange-500 animate-spin" />
                            <p className="text-[11px] text-orange-600 dark:text-orange-400">Extracting flight info...</p>
                          </>
                        ) : (
                          <>
                            <Plane className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                            <p className="text-[11px] text-orange-600 dark:text-orange-400">
                              {isDraggingImage ? "Drop image/PDF" : "Drop, click or paste (⌘V)"}
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Accommodations - Hotel research import */}
              {isAccommodationsStep && canImport && (
                <>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Research hotels:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                      <li>Go to <span className="font-medium text-foreground">Claude Project</span></li>
                      <li>Open <span className="font-medium text-foreground">Hotel Research</span></li>
                      <li>Find hotels &amp; export JSON</li>
                    </ol>
                  </div>
                  <input type="file" id={`import-file-${step.id}`} className="hidden" accept=".json" onChange={handleFileSelect} />
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors",
                      isDragging ? "border-purple-500 bg-purple-500/10" : "border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5"
                    )}
                    onClick={() => document.getElementById(`import-file-${step.id}`)?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-testid={`import-${step.id}-dropzone`}
                  >
                    <Sparkles className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-[11px] text-purple-600 dark:text-purple-400">
                      {isDragging ? "Drop hotel JSON" : "Drop or click to import"}
                    </p>
                  </div>
                </>
              )}

              {/* Segments - Segment research import */}
              {isSegmentsStep && canImport && (
                <>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Research segments:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                      <li>Go to <span className="font-medium text-foreground">Claude Project</span></li>
                      <li>Open <span className="font-medium text-foreground">Segment Research</span></li>
                      <li>Research &amp; export JSON</li>
                    </ol>
                  </div>
                  <input type="file" id={`import-file-${step.id}`} className="hidden" accept=".json" onChange={handleFileSelect} />
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors",
                      isDragging ? "border-purple-500 bg-purple-500/10" : "border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5"
                    )}
                    onClick={() => document.getElementById(`import-file-${step.id}`)?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-testid={`import-${step.id}-dropzone`}
                  >
                    <Sparkles className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-[11px] text-purple-600 dark:text-purple-400">
                      {isDragging ? "Drop segment JSON" : "Drop or click to import"}
                    </p>
                  </div>
                </>
              )}

              {/* Meals - Meal research import */}
              {isMealsStep && canImport && (
                <>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Research meals:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                      <li>Go to <span className="font-medium text-foreground">Claude Project</span></li>
                      <li>Open <span className="font-medium text-foreground">Meal Research</span></li>
                      <li>Research &amp; export JSON</li>
                    </ol>
                  </div>
                  <input type="file" id={`import-file-${step.id}`} className="hidden" accept=".json" onChange={handleFileSelect} />
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-colors",
                      isDragging ? "border-purple-500 bg-purple-500/10" : "border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5"
                    )}
                    onClick={() => document.getElementById(`import-file-${step.id}`)?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-testid={`import-${step.id}-dropzone`}
                  >
                    <Sparkles className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <p className="text-[11px] text-purple-600 dark:text-purple-400">
                      {isDragging ? "Drop meals JSON" : "Drop or click to import"}
                    </p>
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreValidationIssues({ status }: { status: StepCompletionStatus }) {
  if (!status.segmentDetails || status.segmentDetails.length === 0) {
    return null;
  }

  // Collect specific days without activities
  const daysWithoutActivities: string[] = [];
  // Collect unenriched activities with details: "Jun 26: Easy first dinner (no Google Place match)"
  const unenrichedDetails: string[] = [];
  // Track dates we've already added to avoid duplicates from overlapping segments
  const seenDates = new Set<string>();

  for (const seg of status.segmentDetails) {
    if (!seg.days) continue;

    for (const day of seg.days) {
      if (seenDates.has(day.date)) continue;
      seenDates.add(day.date);

      // Format date nicely: "Jun 26"
      const date = new Date(day.date + 'T12:00:00');
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!day.hasActivity) {
        daysWithoutActivities.push(formatted);
      }

      // Collect unenriched activities
      if (day.unenrichedActivities && day.unenrichedActivities.length > 0) {
        for (const activity of day.unenrichedActivities) {
          unenrichedDetails.push(`${formatted}: ${activity.name} (${activity.reason})`);
        }
      }
    }
  }

  // Collect missing hotels
  const segmentsWithoutHotels: string[] = [];
  if (status.accommodationDetails) {
    for (const s of status.accommodationDetails) {
      if (!s.hasAccommodation) {
        segmentsWithoutHotels.push(s.segmentName);
      }
    }
  }

  // If no issues, don't render
  if (segmentsWithoutHotels.length === 0 && daysWithoutActivities.length === 0 && unenrichedDetails.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        <span>Issues</span>
      </div>
      <div className="space-y-1">
        {segmentsWithoutHotels.length > 0 && (
          <div className="text-[11px] flex items-start gap-1.5 text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>No hotel: {segmentsWithoutHotels.join(', ')}</span>
          </div>
        )}
        {daysWithoutActivities.length > 0 && (
          <div className="text-[11px] flex items-start gap-1.5 text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>Missing activities: {daysWithoutActivities.join(', ')}</span>
          </div>
        )}
        {unenrichedDetails.length > 0 && (
          <div className="text-[11px] flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <div>
              <span>Not enriched:</span>
              <ul className="mt-0.5 ml-1">
                {unenrichedDetails.map((detail, idx) => (
                  <li key={idx}>• {detail}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ValidationResultsDisplay({ validation }: { validation: ValidationResult }) {
  const { summary, issues } = validation;

  // Group issues by severity
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const suggestions = issues.filter(i => i.severity === 'suggestion');

  return (
    <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
      <div className="flex items-center gap-2 text-xs font-medium">
        <span>Validation Results:</span>
        {summary.errors > 0 && (
          <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            {summary.errors}
          </span>
        )}
        {summary.warnings > 0 && (
          <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {summary.warnings}
          </span>
        )}
        {summary.suggestions > 0 && (
          <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
            <Info className="h-3 w-3" />
            {summary.suggestions}
          </span>
        )}
      </div>

      {/* Show first few issues */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {errors.slice(0, 3).map((issue, idx) => (
          <ValidationIssueRow key={`error-${idx}`} issue={issue} />
        ))}
        {warnings.slice(0, 3).map((issue, idx) => (
          <ValidationIssueRow key={`warning-${idx}`} issue={issue} />
        ))}
        {suggestions.slice(0, 2).map((issue, idx) => (
          <ValidationIssueRow key={`suggestion-${idx}`} issue={issue} />
        ))}
        {issues.length > 8 && (
          <p className="text-[10px] text-muted-foreground">
            ... and {issues.length - 8} more issues
          </p>
        )}
      </div>
    </div>
  );
}

function ValidationIssueRow({ issue }: { issue: ValidationIssue }) {
  const severityConfig = {
    error: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
    warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    suggestion: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  };

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={cn("text-[11px] p-1.5 rounded flex items-start gap-1.5", config.bg)}>
      <Icon className={cn("h-3 w-3 flex-shrink-0 mt-0.5", config.color)} />
      <div>
        <span className={cn("font-medium", config.color)}>{issue.message}</span>
        {issue.details && (
          <p className="text-muted-foreground text-[10px]">{issue.details}</p>
        )}
      </div>
    </div>
  );
}

function formatCompletedAt(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateCompact(dateStr: string): string {
  try {
    // Parse as local date to avoid timezone shift
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Airport to timezone mapping for common airports
const AIRPORT_TIMEZONES: Record<string, { tz: string; label: string }> = {
  // US West Coast
  LAX: { tz: "America/Los_Angeles", label: "PT" },
  SFO: { tz: "America/Los_Angeles", label: "PT" },
  SAN: { tz: "America/Los_Angeles", label: "PT" },
  SEA: { tz: "America/Los_Angeles", label: "PT" },
  PDX: { tz: "America/Los_Angeles", label: "PT" },
  // US Mountain
  DEN: { tz: "America/Denver", label: "MT" },
  PHX: { tz: "America/Phoenix", label: "AZ" },
  // US Central
  ORD: { tz: "America/Chicago", label: "CT" },
  DFW: { tz: "America/Chicago", label: "CT" },
  IAH: { tz: "America/Chicago", label: "CT" },
  // US East Coast
  JFK: { tz: "America/New_York", label: "ET" },
  EWR: { tz: "America/New_York", label: "ET" },
  BOS: { tz: "America/New_York", label: "ET" },
  MIA: { tz: "America/New_York", label: "ET" },
  ATL: { tz: "America/New_York", label: "ET" },
  // Canada
  YYZ: { tz: "America/Toronto", label: "ET" },
  YVR: { tz: "America/Vancouver", label: "PT" },
  YUL: { tz: "America/Montreal", label: "ET" },
  // Portugal
  LIS: { tz: "Europe/Lisbon", label: "WET" },
  OPO: { tz: "Europe/Lisbon", label: "WET" },
  FAO: { tz: "Europe/Lisbon", label: "WET" },
  // Spain
  MAD: { tz: "Europe/Madrid", label: "CET" },
  BCN: { tz: "Europe/Madrid", label: "CET" },
  // UK
  LHR: { tz: "Europe/London", label: "GMT" },
  LGW: { tz: "Europe/London", label: "GMT" },
  // France
  CDG: { tz: "Europe/Paris", label: "CET" },
  ORY: { tz: "Europe/Paris", label: "CET" },
  // Germany
  FRA: { tz: "Europe/Berlin", label: "CET" },
  MUC: { tz: "Europe/Berlin", label: "CET" },
  // Italy
  FCO: { tz: "Europe/Rome", label: "CET" },
  MXP: { tz: "Europe/Rome", label: "CET" },
  // Default fallback
};

function getAirportTimezone(airportCode: string): { tz: string; label: string } {
  return AIRPORT_TIMEZONES[airportCode] || { tz: "UTC", label: "UTC" };
}

function formatFlightDatetime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatFlightTime(dateStr: string, airportCode: string): { date: string; time: string; tzLabel: string } {
  try {
    const date = new Date(dateStr);
    const { tz, label } = getAirportTimezone(airportCode);

    const dateFormatted = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz,
    });

    const timeFormatted = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    });

    return { date: dateFormatted, time: timeFormatted, tzLabel: label };
  } catch {
    return { date: dateStr, time: "", tzLabel: "" };
  }
}
