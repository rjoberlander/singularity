"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Check, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, Pencil, X, Wand2, Upload, FileUp, Sparkles, ImageIcon, Plane, ExternalLink, Lock, Timer, Plus, Search, Settings, FileText, Star, MapPin, Globe, Copy, Waves, Coffee, UtensilsCrossed, Wine, CookingPot, Car, Wifi, Dumbbell, PawPrint, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUpdateTrip, API_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { PlanningStepId, StepCompletionStatus, PlanningStepConfig, SegmentInfo, SegmentAccommodationInfo, FlightInfo, SegmentEnrichmentStats } from "@/lib/travel-planning";
import type { Trip, ValidationResult, ValidationIssue } from "@singularity/shared-types";
import { AddHotelDialog } from "./AddHotelDialog";

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
  // Per-segment enrichment
  onEnrichSegment?: (segmentId: string) => void;
  enrichingSegmentId?: string | null;
  // Per-segment timing enrichment (phase 2)
  onTimingSegment?: (segmentId: string) => void;
  timingSegmentId?: string | null;
  // Per-segment meal research
  onMealResearch?: (segmentId: string) => void;
  researchingSegmentId?: string | null;
  // Meal preferences + PRD
  onOpenMealPreferences?: () => void;
  onOpenMealPRD?: () => void;
  // Deep enrichment (step 6)
  onDeepEnrich?: () => void;
  isDeepEnriching?: boolean;
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
  onEnrichSegment,
  enrichingSegmentId,
  onTimingSegment,
  timingSegmentId,
  onMealResearch,
  researchingSegmentId,
  onOpenMealPreferences,
  onOpenMealPRD,
  onDeepEnrich,
  isDeepEnriching,
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
  const [addHotelSegment, setAddHotelSegment] = useState<{ segmentId: string; segmentName: string; startDate: string; endDate: string } | null>(null);

  // Inline URL editing state for accommodations
  const [editingUrlAccId, setEditingUrlAccId] = useState<string | null>(null);
  const [editingUrlValue, setEditingUrlValue] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  // Inline confirmation # editing
  const [editingConfAccId, setEditingConfAccId] = useState<string | null>(null);
  const [editingConfValue, setEditingConfValue] = useState("");
  const [savingConf, setSavingConf] = useState(false);

  const handleSaveUrl = async (accommodationId: string) => {
    const url = editingUrlValue.trim();
    if (!url) return;
    // Validate it's a real URL
    try { new URL(url); } catch { toast.error("Invalid URL"); return; }
    setSavingUrl(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const resp = await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ website: url }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      toast.success("URL saved");
      setEditingUrlAccId(null);
      setEditingUrlValue("");
      // Force refresh — the parent query should refetch
      window.location.reload();
    } catch (err) {
      toast.error("Failed to save URL");
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSaveConf = async (accommodationId: string) => {
    const ref = editingConfValue.trim();
    if (!ref) return;
    setSavingConf(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const resp = await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ booking_reference: ref }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      toast.success("Confirmation # saved");
      setEditingConfAccId(null);
      setEditingConfValue("");
      window.location.reload();
    } catch (err) {
      toast.error("Failed to save confirmation #");
    } finally {
      setSavingConf(false);
    }
  };

  // Upload confirmation file
  const [uploadingConfFileAccId, setUploadingConfFileAccId] = useState<string | null>(null);
  const handleUploadConfirmation = async (accommodationId: string, file: File) => {
    setUploadingConfFileAccId(accommodationId);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const resp = await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}/upload-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ file: base64, filename: file.name, mimeType: file.type }),
      });
      if (!resp.ok) throw new Error("Upload failed");
      toast.success("Confirmation uploaded");
      window.location.reload();
    } catch {
      toast.error("Failed to upload");
    } finally {
      setUploadingConfFileAccId(null);
    }
  };

  // Enrich accommodation
  const [enrichingAccId, setEnrichingAccId] = useState<string | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [enrichAllProgress, setEnrichAllProgress] = useState("");

  const handleEnrichAllAccommodations = async () => {
    const accs = status.accommodationDetails?.filter(s => s.hasAccommodation && s.accommodationId) || [];
    if (accs.length === 0) return;
    setEnrichingAll(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const headers = {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        "Authorization": `Bearer ${session.access_token}`,
      };
      let done = 0;
      for (const seg of accs) {
        done++;
        setEnrichAllProgress(`${done}/${accs.length}: ${seg.hotelName?.substring(0, 25) || "..."}`);
        setEnrichingAccId(seg.accommodationId!);
        try {
          const isAirbnb = seg.propertyType === "vacation_rental" || !!(seg.website && /airbnb\.com\/rooms/i.test(seg.website));
          if (isAirbnb && seg.website && /airbnb\.com\/rooms/i.test(seg.website)) {
            // Airbnb: use dedicated Airbnb API for photos + data, then AI for structured amenities
            await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${seg.accommodationId}/enrich-airbnb`, { method: "POST", headers });
            await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${seg.accommodationId}/enrich-ai`, { method: "POST", headers });
          } else if (!isAirbnb) {
            // Hotels: Google Places for photos + data, then AI for structured amenities
            await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${seg.accommodationId}/fetch-google`, { method: "POST", headers });
            await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${seg.accommodationId}/enrich-ai`, { method: "POST", headers });
          } else {
            // Airbnb without listing URL: AI enrichment only
            await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${seg.accommodationId}/enrich-ai`, { method: "POST", headers });
          }
        } catch (e) {
          console.warn(`Failed to enrich ${seg.hotelName}:`, e);
        }
      }
      toast.success(`Enriched ${done} accommodations`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Enrichment failed");
    } finally {
      setEnrichingAll(false);
      setEnrichingAccId(null);
      setEnrichAllProgress("");
    }
  };

  const handleEnrichAccommodation = async (accommodationId: string, isAirbnb?: boolean) => {
    setEnrichingAccId(accommodationId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }
      const headers = {
        "Content-Type": "application/json",
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        "Authorization": `Bearer ${session.access_token}`,
      };
      if (isAirbnb) {
        // Airbnb: use dedicated Airbnb API for photos + data
        const airbnbResp = await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}/enrich-airbnb`, {
          method: "POST", headers,
        });
        if (!airbnbResp.ok) {
          const err = await airbnbResp.json().catch(() => ({}));
          console.warn("Airbnb enrich failed:", err);
        }
      } else {
        // Hotels: Google Places for photos + data
        const googleResp = await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}/fetch-google`, {
          method: "POST", headers,
        });
        if (!googleResp.ok) {
          const err = await googleResp.json().catch(() => ({}));
          console.warn("Google fetch failed:", err);
        }
      }
      const aiResp = await fetch(`${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}/enrich-ai`, {
        method: "POST", headers,
      });
      if (!aiResp.ok) {
        const err = await aiResp.json().catch(() => ({}));
        throw new Error(err.error || "AI enrich failed");
      }
      toast.success("Enriched");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Enrichment failed");
    } finally {
      setEnrichingAccId(null);
    }
  };

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
  const isSegmentsStep = step.id === "segments";
  const isAccommodationsStep = step.id === "accommodations";
  const isActivitiesStep = step.id === "activities";
  const isMealsStep = step.id === "meals";
  const isEnrichmentStep = step.id === "enrichment";
  const isScheduleStep = step.id === "schedule";
  const canEdit = isBasicsStep && !isCompleted;
  const canImport = (isSegmentsStep || isAccommodationsStep || isMealsStep) && onImportResearch;
  const canImportSkeleton = isBasicsStep && onImportSkeleton;

  // Are all accommodations fully enriched?
  const allAccEnriched = isAccommodationsStep && status.accommodationDetails
    ? status.accommodationDetails.every(s => !s.hasAccommodation || (s.hasGoogleEnrichment && s.hasAiEnrichment))
    : false;

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
              <p className="text-xs text-muted-foreground">
                {isAccommodationsStep && status.accommodationDetails
                  ? `${status.accommodationDetails.filter(s => s.isComplete).length} of ${status.accommodationDetails.length} segments have accommodations`
                  : step.description}
              </p>
            </div>
          </div>

          {/* Accommodations: Research instructions + import in header */}
          {isAccommodationsStep && canImport && (
            <div className="flex items-start gap-3 text-[11px] text-muted-foreground border border-border/40 rounded-md px-2.5 py-1.5 bg-muted/30">
              <div className="space-y-0.5 shrink-0">
                <p className="font-medium text-foreground text-xs">Research hotels:</p>
                <ol className="list-decimal list-inside space-y-0">
                  <li>Go to <span className="font-medium text-foreground">Claude Project</span></li>
                  <li>Open <span className="font-medium text-foreground">Hotel Research</span></li>
                  <li>Find hotels &amp; export JSON</li>
                </ol>
              </div>
              <div>
                <input type="file" id={`import-file-${step.id}`} className="hidden" accept=".json" onChange={handleFileSelect} />
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg px-3 py-2 text-center cursor-pointer transition-colors",
                    isDragging ? "border-purple-500 bg-purple-500/10" : "border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5"
                  )}
                  onClick={() => document.getElementById(`import-file-${step.id}`)?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  data-testid={`import-${step.id}-dropzone`}
                >
                  <Sparkles className="h-4 w-4 mx-auto mb-0.5 text-purple-500" />
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    {isDragging ? "Drop JSON" : "Drop or click to import"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status badge + action buttons in header */}
          <div className="flex flex-col items-end gap-1">
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
            {/* Enrich All button for accommodations — right under Done */}
            {isAccommodationsStep && status.accommodationDetails && status.accommodationDetails.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-6 text-xs px-2",
                  allAccEnriched
                    ? "text-muted-foreground border-muted"
                    : "text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                )}
                disabled={allAccEnriched || enrichingAll}
                title={allAccEnriched ? "All accommodations enriched" : "Enrich all accommodations (Google + AI)"}
                onClick={handleEnrichAllAccommodations}
              >
                {enrichingAll ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {enrichAllProgress || "Enriching..."}</>
                ) : allAccEnriched ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> All Enriched</>
                ) : (
                  <><Wand2 className="h-3 w-3 mr-1" /> Enrich All</>
                )}
              </Button>
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
        ) : (isActivitiesStep || isEnrichmentStep || isScheduleStep) ? (
          /* Full-width layout for Activities / Enrichment / Schedule steps */
          <div className="space-y-3">

            {/* Step-specific description */}
            {isActivitiesStep && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <p className="font-medium text-foreground mb-1">Review & Enrich Activities</p>
                <ul className="space-y-0.5">
                  <li>• Verify all segments have imported activities</li>
                  <li>• Google Places enrichment (photos, ratings, hours)</li>
                  <li>• Auto-triggers AI deep content + restaurant review analysis</li>
                  <li className="text-green-600 dark:text-green-400">• Gate check before meal research</li>
                </ul>
              </div>
            )}
            {isEnrichmentStep && (
              <>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                  <p className="font-medium text-foreground mb-1">Gap-Filler & Deep Enrichment</p>
                  <ul className="space-y-0.5">
                    <li>• Fill activity deep_dive + practical_details gaps</li>
                    <li>• Generate trip-level country overview</li>
                    <li>• Synthesize segment narratives (accommodation + activities + meals)</li>
                    <li>• Generate day-level tour guide narratives</li>
                    <li className="text-blue-500 dark:text-blue-400">↳ Catches anything previous steps missed</li>
                  </ul>
                </div>
                {/* Trip-level enrichment status — split into Location Details + Trip Details */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Location details:</span>
                    {status.summary?.some((s: string) => s.includes('Trip overview: ✓')) ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Generated</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Not generated</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">(country history, culture, customs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Trip details:</span>
                    {status.summary?.some((s: string) => s.includes('Trip overview: ✓')) ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Generated</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Not generated</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">(itinerary overview, route, pacing)</span>
                  </div>
                </div>
              </>
            )}
            {isScheduleStep && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <p className="font-medium text-foreground mb-1">Schedule & Validate</p>
                <ul className="space-y-0.5">
                  <li>• Compute drive/walk times between activities</li>
                  <li>• AI creates 15-min precision schedule</li>
                  <li>• Insert meals, check-in/out, buffers</li>
                  <li>• Validate opening hours, bookings, durations</li>
                </ul>
              </div>
            )}

            {/* Enrichment/activity status by segment */}
            {status.segmentDetails && status.segmentDetails.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{isActivitiesStep ? 'Activity status:' : isEnrichmentStep ? 'Enrichment gaps:' : 'Segment status:'}</p>
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
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50">
                        <th className="text-left py-1 pr-2 font-medium">#</th>
                        <th className="text-left py-1 pr-2 font-medium">Segment</th>
                        {!isScheduleStep && <th className="text-left py-1 pr-2 font-medium">Dates</th>}
                        {(isActivitiesStep || isScheduleStep) && <th className="text-center py-1 px-1 font-medium">Places</th>}
                        {isActivitiesStep && <th className="text-center py-1 px-1 font-medium">Photos</th>}
                        {isScheduleStep && <th className="text-center py-1 px-1 font-medium">Meals</th>}
                        {(isActivitiesStep || isEnrichmentStep) && <th className="text-center py-1 px-1 font-medium">Details</th>}
                        {isEnrichmentStep && <th className="text-center py-1 px-1 font-medium" title="Location history & culture (city_info)">Location</th>}
                        {isEnrichmentStep && <th className="text-center py-1 px-1 font-medium" title="Trip narrative synthesis (what you're doing here)">Narrative</th>}
                        {isEnrichmentStep && <th className="text-center py-1 px-1 font-medium" title="Day narratives">Day Stories</th>}
                        {isScheduleStep && <th className="text-center py-1 px-1 font-medium" title="Schedule assembled">Assembled</th>}
                        {isActivitiesStep && <th className="text-center py-1 px-1 font-medium text-muted-foreground/70">Skip</th>}
                        {!isScheduleStep && !isEnrichmentStep && <th className="text-left py-1 pr-2 font-medium">Days</th>}
                        <th className="text-right py-1 font-medium" colSpan={2}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.segmentDetails.map((seg) => {
                        const stats = seg.enrichmentStats;
                        const isEnrichingThis = enrichingSegmentId === seg.segmentId;
                        const isTimingThis = timingSegmentId === seg.segmentId;
                        const enrichmentDone = stats ? (stats.placesTotal === 0 || stats.placesEnriched > 0) : false;
                        const timingLocked = !seg.hasHotel || !enrichmentDone;
                        return (
                          <tr key={seg.segmentId} className="border-b border-border/30 last:border-0">
                            <td className="py-1 pr-2 text-muted-foreground">{seg.segmentNumber || "-"}</td>
                            <td className="py-1 pr-2 font-medium">{seg.segmentName}</td>
                            {!isScheduleStep && (
                              <td className="py-1 pr-2 text-muted-foreground whitespace-nowrap">
                                {formatDateCompact(seg.startDate)} - {formatDateCompact(seg.endDate)}
                              </td>
                            )}
                            {(isActivitiesStep || isScheduleStep) && (
                              <td className="py-1 px-1 text-center">
                                {stats ? (
                                  <span className={cn(
                                    "whitespace-nowrap",
                                    stats.placesTotal === 0 ? "text-muted-foreground" :
                                    stats.placesEnriched === stats.placesTotal ? "text-green-600 dark:text-green-400" :
                                    stats.placesEnriched > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                  )}>
                                    {stats.placesEnriched}/{stats.placesTotal}
                                  </span>
                                ) : "-"}
                              </td>
                            )}
                            {isActivitiesStep && (
                              <td className="py-1 px-1 text-center">
                                {stats ? (
                                  <span className={cn(
                                    "whitespace-nowrap",
                                    stats.placesEnriched === 0 ? "text-muted-foreground" :
                                    stats.placesWithPhotos >= stats.placesEnriched ? "text-green-600 dark:text-green-400" :
                                    stats.placesWithPhotos > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                  )}>
                                    {stats.placesWithPhotos}/{stats.placesEnriched}
                                    <span className="text-muted-foreground/50 ml-0.5 text-[9px]">({stats.photosActual})</span>
                                  </span>
                                ) : "-"}
                              </td>
                            )}
                            {isScheduleStep && (
                              <td className="py-1 px-1 text-center">
                                {stats ? (
                                  <span className={cn(
                                    "whitespace-nowrap",
                                    stats.genericMealsTotal === 0 ? "text-muted-foreground" :
                                    stats.mealsWithRestaurant === stats.genericMealsTotal ? "text-green-600 dark:text-green-400" :
                                    stats.mealsWithRestaurant > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                  )}>
                                    {stats.mealsWithRestaurant}/{stats.genericMealsTotal}
                                  </span>
                                ) : "-"}
                              </td>
                            )}
                            {(isActivitiesStep || isEnrichmentStep) && (
                              <td className="py-1 px-1 text-center">
                                {stats ? (
                                  <span className={cn(
                                    "whitespace-nowrap",
                                    stats.detailsTotal === 0 ? "text-muted-foreground" :
                                    stats.detailsEnriched === stats.detailsTotal ? "text-green-600 dark:text-green-400" :
                                    stats.detailsEnriched > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                  )}>
                                    {stats.detailsEnriched}/{stats.detailsTotal}
                                  </span>
                                ) : "-"}
                              </td>
                            )}
                            {isEnrichmentStep && (
                              <td className="py-1 px-1 text-center">
                                {stats?.hasSegmentLocationDetail ? (
                                  <span className="text-green-600 dark:text-green-400">&#x2713;</span>
                                ) : (
                                  <span className="text-muted-foreground">&#x2717;</span>
                                )}
                              </td>
                            )}
                            {isEnrichmentStep && (
                              <td className="py-1 px-1 text-center">
                                {stats?.hasSegmentNarrative ? (
                                  <span className="text-green-600 dark:text-green-400">&#x2713;</span>
                                ) : (
                                  <span className="text-muted-foreground">&#x2717;</span>
                                )}
                              </td>
                            )}
                            {isEnrichmentStep && (
                              <td className="py-1 px-1 text-center">
                                {stats ? (
                                  <span className={cn(
                                    "whitespace-nowrap",
                                    stats.daysTotal === 0 ? "text-muted-foreground" :
                                    stats.daysWithNarrative === stats.daysTotal ? "text-green-600 dark:text-green-400" :
                                    stats.daysWithNarrative > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                  )}>
                                    {stats.daysWithNarrative}/{stats.daysTotal}
                                  </span>
                                ) : "-"}
                              </td>
                            )}
                            {isScheduleStep && (
                              <td className="py-1 px-1 text-center">
                                {seg.days?.some(d => (d as any).assemblyStatus === 'assembled') ? (
                                  <span className="text-green-600 dark:text-green-400">&#x2713;</span>
                                ) : (
                                  <span className="text-muted-foreground">&#x2717;</span>
                                )}
                              </td>
                            )}
                            {isActivitiesStep && (
                              <td className="py-1 px-1 text-center">
                                {stats && stats.placesSkipped > 0 ? (
                                  <span className="whitespace-nowrap text-muted-foreground/70">
                                    {stats.placesSkipped}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">-</span>
                                )}
                              </td>
                            )}
                            {!isScheduleStep && !isEnrichmentStep && (
                              <td className="py-1 pr-2">
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
                                          isComplete ? "bg-purple-500 text-white"
                                            : isPartial ? "border-2 border-purple-500 text-purple-500"
                                            : hasEnrichable ? "bg-muted text-muted-foreground"
                                            : "bg-muted/50 text-muted-foreground/50"
                                        )}
                                        title={hasEnrichable ? `${day.date}: ${day.enrichedCount || 0}/${day.totalEnrichable} enriched` : `${day.date}: No enrichable activities`}
                                      >
                                        {day.dayOfMonth}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            )}
                            {/* Enrich button — Activities + Enrichment steps */}
                            {(isActivitiesStep || isEnrichmentStep) && (() => {
                              // Gray out when all enrichment is complete for this segment
                              const segFullyEnriched = isEnrichmentStep && stats && (
                                (stats.detailsTotal === 0 || stats.detailsEnriched === stats.detailsTotal) &&
                                stats.hasSegmentNarrative &&
                                stats.hasSegmentLocationDetail &&
                                (stats.daysTotal === 0 || stats.daysWithNarrative === stats.daysTotal)
                              );
                              return (
                              <td className="py-1 text-right" colSpan={2}>
                                {onEnrichSegment && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn("h-6 px-2 text-[10px]", segFullyEnriched && "opacity-40")}
                                    onClick={() => onEnrichSegment(seg.segmentId)}
                                    disabled={!!enrichingSegmentId || !!timingSegmentId}
                                    title={segFullyEnriched ? "All enrichment complete for this segment" : "Run enrichment for this segment"}
                                  >
                                    {isEnrichingThis ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : segFullyEnriched ? (
                                      "Done"
                                    ) : (
                                      "Enrich"
                                    )}
                                  </Button>
                                )}
                              </td>
                              );
                            })()}
                            {/* Timing button — Schedule step */}
                            {isScheduleStep && (
                              <td className="py-1 pl-1 text-right" colSpan={2}>
                                {onTimingSegment && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                      "h-6 px-2 text-[10px]",
                                      !timingLocked && "border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    )}
                                    onClick={() => onTimingSegment(seg.segmentId)}
                                    disabled={timingLocked || !!enrichingSegmentId || !!timingSegmentId}
                                    title={timingLocked ? "Requires: Google enrichment + hotels set" : "Run timing & compute travel times"}
                                  >
                                    {isTimingThis ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : timingLocked ? (
                                      <Lock className="h-3 w-3" />
                                    ) : (
                                      <>
                                        <Timer className="h-3 w-3 mr-0.5" />
                                        Timing
                                      </>
                                    )}
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Deep Enrichment button — Enrichment step only */}
            {isEnrichmentStep && onDeepEnrich && (
              <div className="flex items-center gap-3">
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={onDeepEnrich}
                  disabled={isDeepEnriching}
                >
                  {isDeepEnriching ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
                  {isDeepEnriching ? "Running Deep Enrichment..." : "Run Deep Enrichment"}
                </Button>
              </div>
            )}

            {/* Assemble Schedule — Schedule step only */}
            {isScheduleStep && onAssembleSchedule && (
              <>
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
                    {isAssembling ? "Assembling Schedule..." : "Assemble Schedule"}
                  </Button>
                </div>

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

                <PreValidationIssues status={status} />

                {validationResult && validationResult.issues.length > 0 && (
                  <ValidationResultsDisplay validation={validationResult} />
                )}
              </>
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
                <div>
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/50 text-[10px]">
                        <th className="text-left py-1 pr-1.5 font-medium">#</th>
                        <th className="text-left py-1 pr-1.5 font-medium">Segment</th>
                        <th className="text-left py-1 pr-1.5 font-medium">Hotel</th>
                        <th className="text-center py-1 px-1 font-medium">Photos</th>
                        <th className="text-left py-1 px-1 font-medium">Booking Ref</th>
                        <th className={cn("text-right py-1 pl-1 font-medium", allAccEnriched ? "text-green-600" : "text-purple-600")}>
                          {allAccEnriched ? "All enriched" : "Enrich"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.accommodationDetails.map((seg) => (
                        <tr key={seg.segmentId} className={cn(
                          "border-b border-border/30 last:border-0",
                          !seg.hasAccommodation && "bg-red-500/5"
                        )}>
                          <td className="py-1.5 pr-1.5 text-muted-foreground align-top">{seg.segmentNumber || "-"}</td>
                          <td className="py-1.5 pr-1.5 align-top whitespace-nowrap">
                            <div className="font-medium">{seg.segmentName}</div>
                            <div className="text-[10px] text-muted-foreground">{formatDateCompact(seg.startDate)} – {formatDateCompact(seg.endDate)}</div>
                          </td>
                          <td className="py-1.5 pr-1.5 align-top">
                            {seg.hasAccommodation ? (
                              <div className="space-y-0.5">
                                {/* Line 1: Name + rating + type badge — single row, truncate */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="truncate shrink min-w-0">{seg.hotelName}</span>
                                  {seg.googleRating != null && (() => {
                                    const googleUrl = seg.googlePlaceId
                                      ? `https://www.google.com/maps/place/?q=place_id:${seg.googlePlaceId}`
                                      : null;
                                    const ratingContent = (
                                      <>
                                        <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                        {seg.googleRating}
                                        {seg.googleReviewCount != null && (
                                          <span className="text-muted-foreground">({seg.googleReviewCount.toLocaleString()})</span>
                                        )}
                                      </>
                                    );
                                    return googleUrl ? (
                                      <a
                                        href={googleUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 text-[10px] hover:underline shrink-0"
                                      >
                                        {ratingContent}
                                      </a>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] shrink-0">
                                        {ratingContent}
                                      </span>
                                    );
                                  })()}
                                  {seg.propertyType && (() => {
                                    const isAirbnb = seg.propertyType === "vacation_rental";
                                    const label = isAirbnb ? "Airbnb" : seg.propertyType;
                                    const hasLink = seg.website && seg.hasSpecificUrl;
                                    const badgeClass = cn(
                                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap border cursor-pointer",
                                      hasLink
                                        ? "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400 hover:bg-green-500/20"
                                        : "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400 hover:bg-red-500/20"
                                    );
                                    return hasLink ? (
                                      <a href={seg.website!} target="_blank" rel="noopener noreferrer" className={badgeClass}>
                                        {label} <ExternalLink className="h-2 w-2 ml-0.5" />
                                      </a>
                                    ) : (
                                      <button
                                        className={badgeClass}
                                        onClick={() => {
                                          if (seg.accommodationId) {
                                            setEditingUrlAccId(seg.accommodationId);
                                            setEditingUrlValue(seg.website || "");
                                          }
                                        }}
                                        title="Click to add listing URL"
                                      >
                                        {label} <Plus className="h-2 w-2 ml-0.5" />
                                      </button>
                                    );
                                  })()}
                                  {/* Amenity icons — inline after badge */}
                                  {seg.hasAiEnrichment && (() => {
                                    const icons: { icon: React.ReactNode; tip: string; color: string }[] = [];
                                    if (seg.hasPool) icons.push({ icon: <Waves className="h-2.5 w-2.5" />, tip: `Pool${seg.poolType ? ` (${seg.poolType})` : ''}${seg.hasKidPool ? ' + kid pool' : ''}`, color: 'text-blue-400' });
                                    if (seg.breakfastIncluded) icons.push({ icon: <Coffee className="h-2.5 w-2.5" />, tip: `Breakfast${seg.breakfastType && seg.breakfastType !== 'none' ? `: ${seg.breakfastType}` : ' included'}`, color: 'text-amber-400' });
                                    if (seg.hasRestaurant) icons.push({ icon: <UtensilsCrossed className="h-2.5 w-2.5" />, tip: 'Restaurant on-site', color: 'text-orange-400' });
                                    if (seg.hasBar) icons.push({ icon: <Wine className="h-2.5 w-2.5" />, tip: 'Bar', color: 'text-purple-400' });
                                    if (seg.kitchenType && seg.kitchenType !== 'none') icons.push({ icon: <CookingPot className="h-2.5 w-2.5" />, tip: seg.kitchenType === 'full' ? 'Full kitchen' : 'Kitchenette', color: 'text-green-400' });
                                    if (seg.hasParking) icons.push({
                                      icon: <Car className="h-2.5 w-2.5" />,
                                      tip: seg.parkingFree ? 'Free parking' : seg.parkingCost ? `Parking: ${seg.parkingCurrency || '€'}${seg.parkingCost}/day` : 'Paid parking',
                                      color: seg.parkingFree ? 'text-green-400' : 'text-red-400',
                                    });
                                    if (seg.hasWifi) icons.push({ icon: <Wifi className="h-2.5 w-2.5" />, tip: 'WiFi', color: 'text-sky-400' });
                                    if (seg.hasGym) icons.push({ icon: <Dumbbell className="h-2.5 w-2.5" />, tip: 'Gym', color: 'text-red-400' });
                                    if (seg.hasSpa) icons.push({ icon: <Sparkles className="h-2.5 w-2.5" />, tip: 'Spa', color: 'text-pink-400' });
                                    if (seg.hasAC) icons.push({ icon: <Wind className="h-2.5 w-2.5" />, tip: 'Air conditioning', color: 'text-cyan-400' });
                                    if (seg.hasPetFriendly) icons.push({ icon: <PawPrint className="h-2.5 w-2.5" />, tip: 'Pet friendly', color: 'text-amber-300' });
                                    return icons.length > 0 ? (
                                      <span className="inline-flex items-center gap-1 ml-1 shrink-0">
                                        {icons.map((ic, i) => (
                                          <span key={i} className={ic.color} title={ic.tip}>{ic.icon}</span>
                                        ))}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                                {/* Inline URL editor */}
                                {editingUrlAccId === seg.accommodationId && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Input
                                      value={editingUrlValue}
                                      onChange={(e) => setEditingUrlValue(e.target.value)}
                                      placeholder={seg.propertyType === "vacation_rental" ? "Paste Airbnb listing URL..." : "Paste hotel URL..."}
                                      className="h-6 text-[10px] flex-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveUrl(seg.accommodationId!);
                                        if (e.key === "Escape") setEditingUrlAccId(null);
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-6 px-2 text-[10px]"
                                      disabled={savingUrl || !editingUrlValue.trim()}
                                      onClick={() => handleSaveUrl(seg.accommodationId!)}
                                    >
                                      {savingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                    </Button>
                                    <button
                                      onClick={() => setEditingUrlAccId(null)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                {/* Line 2: Address + copy button */}
                                <div className="flex items-center gap-1 text-[10px]">
                                  {seg.address ? (
                                    <>
                                      <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground">{seg.address}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(seg.address!);
                                          toast.success("Address copied");
                                        }}
                                        className="text-muted-foreground hover:text-foreground shrink-0 ml-0.5"
                                        title="Copy address"
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                                      <MapPin className="h-2.5 w-2.5" />
                                      No address
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddHotelSegment({
                                  segmentId: seg.segmentId,
                                  segmentName: seg.segmentName,
                                  startDate: seg.startDate,
                                  endDate: seg.endDate,
                                })}
                                className="inline-flex items-center gap-0.5 text-purple-500 hover:text-purple-600 font-medium"
                              >
                                <Plus className="h-3 w-3" />
                                Add
                              </button>
                            )}
                          </td>
                          <td className="py-1.5 px-1 text-center align-top">
                            {seg.hasAccommodation && (
                              seg.photoCount > 0
                                ? <span className="text-green-600 font-medium text-[10px]">{seg.photoCount}</span>
                                : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                            )}
                          </td>
                          <td className="py-1.5 px-1 align-top min-w-[100px]">
                            {seg.hasAccommodation && seg.accommodationId && (
                              <div className="space-y-0.5">
                                {/* Booking reference — inline editable */}
                                {editingConfAccId === seg.accommodationId ? (
                                  <div className="flex items-center gap-0.5">
                                    <Input
                                      value={editingConfValue}
                                      onChange={(e) => setEditingConfValue(e.target.value)}
                                      placeholder="e.g. 10216568"
                                      className="h-5 text-[10px] w-[80px] px-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveConf(seg.accommodationId!);
                                        if (e.key === "Escape") setEditingConfAccId(null);
                                      }}
                                      onBlur={() => {
                                        if (editingConfValue.trim()) {
                                          handleSaveConf(seg.accommodationId!);
                                        } else {
                                          setEditingConfAccId(null);
                                        }
                                      }}
                                    />
                                    {savingConf && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingConfAccId(seg.accommodationId!);
                                      setEditingConfValue(seg.bookingReference || "");
                                    }}
                                    className={cn(
                                      "text-[10px] truncate max-w-[100px] block",
                                      seg.bookingReference
                                        ? "text-green-600 dark:text-green-400 hover:underline"
                                        : seg.confirmationFileUrl
                                          ? "text-green-600/60 dark:text-green-400/60 hover:underline"
                                          : "text-muted-foreground/40 hover:text-muted-foreground"
                                    )}
                                    title={seg.bookingReference || (seg.confirmationFileUrl ? "Confirmed — click to add ref #" : "Click to add booking reference")}
                                  >
                                    {seg.bookingReference
                                      ? seg.bookingReference
                                      : seg.confirmationFileUrl
                                        ? "Confirmed"
                                        : <span className="text-red-500/70 font-medium">MISSING</span>
                                    }
                                  </button>
                                )}
                                {/* Confirmation file — upload or view */}
                                {seg.confirmationFileUrl ? (
                                  <a
                                    href={seg.confirmationFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 text-[9px] text-blue-500 hover:underline truncate max-w-[100px]"
                                    title={seg.confirmationFileName}
                                  >
                                    <FileText className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{seg.confirmationFileName}</span>
                                  </a>
                                ) : (
                                  <label className="flex items-center gap-0.5 text-[9px] text-muted-foreground/40 hover:text-muted-foreground cursor-pointer">
                                    {uploadingConfFileAccId === seg.accommodationId ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <>
                                        <Upload className="h-2.5 w-2.5" />
                                        <span>Upload</span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*,.pdf"
                                      disabled={uploadingConfFileAccId === seg.accommodationId}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadConfirmation(seg.accommodationId!, f);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 pl-1 text-right align-top">
                            {seg.hasAccommodation && seg.accommodationId && (() => {
                              const rowEnriched = seg.hasGoogleEnrichment && seg.hasAiEnrichment;
                              return (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-5 px-1.5 text-[10px]",
                                    rowEnriched
                                      ? "text-muted-foreground/40"
                                      : "text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
                                  )}
                                  disabled={rowEnriched || enrichingAccId === seg.accommodationId}
                                  title={rowEnriched ? "Already enriched" : "Enrich (Google + AI)"}
                                  onClick={() => handleEnrichAccommodation(seg.accommodationId!, seg.propertyType === "vacation_rental" || !!(seg.website && /airbnb\.com/i.test(seg.website)))}
                                >
                                  {enrichingAccId === seg.accommodationId ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="h-3 w-3" />
                                  )}
                                </Button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {addHotelSegment && (
                    <AddHotelDialog
                      open={!!addHotelSegment}
                      onOpenChange={(open) => { if (!open) setAddHotelSegment(null); }}
                      tripId={tripId}
                      segment={addHotelSegment}
                    />
                  )}
                </div>
              )}

              {/* Meal Research Table (per-segment, for Meals step) */}
              {isMealsStep && status.segmentDetails && status.segmentDetails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">
                      {status.mealDetails ? `${status.mealDetails.filter(m => !m.needsResearch).length} of ${status.mealDetails.length} meals researched` : 'Meal research status'}
                    </p>
                    <div className="flex items-center gap-1">
                      {onOpenMealPRD && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={onOpenMealPRD}
                          title="View meal research specification"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          PRD
                        </Button>
                      )}
                      {onOpenMealPreferences && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={onOpenMealPreferences}
                          title="Meal research preferences"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Preferences
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/50">
                          <th className="text-left py-1 pr-2 font-medium">#</th>
                          <th className="text-left py-1 pr-2 font-medium">Segment</th>
                          <th className="text-center py-1 px-1 font-medium" title="Days in segment">Days</th>
                          <th className="text-center py-1 px-1 font-medium" title="Restaurants found via Perplexity + Claude web research">Restaurants</th>
                          <th className="text-center py-1 px-1 font-medium" title="Google Places verified (rating, coords, hours)">Google</th>
                          <th className="text-center py-1 px-1 font-medium" title="Restaurant photos from Google Places">Photos</th>
                          <th className="text-center py-1 px-1 font-medium" title="Restaurants with specific dish recommendations">Dishes</th>
                          <th className="text-center py-1 px-1 font-medium" title="Restaurants needing reservation">Rsvp</th>
                          <th className="text-right py-1 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.segmentDetails.map((seg) => {
                          const stats = seg.enrichmentStats;
                          const days = seg.days?.length || 0;
                          const expectedMeals = days * 3;
                          const researched = stats?.mealsWithRestaurant || 0;
                          const placesGrounded = stats?.genericMealsTotal || 0; // repurposed: web_research meals with google_place_id
                          const photosCount = stats?.mealPhotosActual || 0;
                          const dishesCount = stats?.reviewsAnalyzed || 0;
                          const restaurantTotal = stats?.reviewsTotal || 0;
                          const reservations = stats?.mealsNeedReservation || 0;
                          const isResearchingThis = researchingSegmentId === seg.segmentId;

                          const colorFor = (val: number, total: number) =>
                            total === 0 ? "text-muted-foreground" :
                            val >= total ? "text-green-600 dark:text-green-400" :
                            val > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";

                          return (
                            <tr key={seg.segmentId} className="border-b border-border/30 last:border-0">
                              <td className="py-1 pr-2 text-muted-foreground">{seg.segmentNumber || "-"}</td>
                              <td className="py-1 pr-2 font-medium">{seg.segmentName}</td>
                              <td className="py-1 px-1 text-center text-muted-foreground">{days}</td>
                              <td className="py-1 px-1 text-center">
                                <span className={cn("whitespace-nowrap", colorFor(researched, expectedMeals))}>
                                  {researched}/{expectedMeals}
                                </span>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className={cn("whitespace-nowrap", colorFor(placesGrounded, expectedMeals))}>
                                  {placesGrounded}/{expectedMeals}
                                </span>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className={cn("whitespace-nowrap", colorFor(photosCount, researched * 10))}>
                                  {photosCount}/{researched * 10}
                                </span>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className={cn("whitespace-nowrap", colorFor(dishesCount, restaurantTotal))}>
                                  {dishesCount}/{restaurantTotal}
                                </span>
                              </td>
                              <td className="py-1 px-1 text-center">
                                <span className={cn("whitespace-nowrap", reservations > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                                  {reservations > 0 ? reservations : '-'}
                                </span>
                              </td>
                              <td className="py-1 text-right">
                                {onMealResearch && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
                                    onClick={() => {
                                      if (!seg.hasHotel) {
                                        if (!window.confirm(`${seg.segmentName} has no lodging set. Meal research works best with lodging location for proximity. Proceed anyway?`)) return;
                                      }
                                      onMealResearch(seg.segmentId);
                                    }}
                                    disabled={!!researchingSegmentId}
                                    title="Research authentic local restaurants using AI web search"
                                  >
                                    {isResearchingThis ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <Search className="h-3 w-3 mr-0.5" />
                                        Research
                                      </>
                                    )}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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

                        {/* Per-segment breakdown for connecting flights */}
                        {flight.flightSegments && flight.flightSegments.length > 1 ? (
                          <div className="text-[9px] text-muted-foreground mt-0.5 space-y-0.5">
                            {flight.flightSegments.map((seg, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="font-mono">{seg.flight_number || ""}</span>
                                <span>{seg.departure_airport}→{seg.arrival_airport}</span>
                                {seg.duration_minutes != null && (
                                  <span className="text-foreground font-medium">
                                    {Math.floor(seg.duration_minutes / 60)}h{seg.duration_minutes % 60 > 0 ? ` ${seg.duration_minutes % 60}m` : ""}
                                  </span>
                                )}
                              </div>
                            ))}
                            {flight.layovers && flight.layovers.length > 0 && (
                              <div className="text-muted-foreground/70">
                                Layover: {flight.layovers.map(l => `${l.airport} ${l.duration}`).join(", ")}
                              </div>
                            )}
                          </div>
                        ) : flight.layovers && flight.layovers.length > 0 ? (
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            Via: {flight.layovers.map(l => `${l.airport} (${l.duration})`).join(", ")}
                          </div>
                        ) : null}
                        {/* Booking ref + confirmation */}
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5 flex-wrap">
                          {flight.bookingReference && (
                            <span>Ref: {flight.bookingReference}</span>
                          )}
                          {flight.confirmationFileUrl && (
                            <a
                              href={flight.confirmationFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              <FileText className="h-2.5 w-2.5" />
                              PDF
                            </a>
                          )}
                        </div>
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

              {/* Accommodations import is in the CardHeader */}

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
