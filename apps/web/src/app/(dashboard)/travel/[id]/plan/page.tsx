"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTripFull, useUpdateTripPlanningProgress, useTripSegments, useValidateImport, useImportTrip, useCreateTripSegment, useUpdateTripSegment, useDeleteTripSegment, useExtractFlightFromImage, useUpdateTrip, useCreateTripFlight, useSyncSegmentDays, API_URL } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  PLANNING_STEPS,
  getStepCompletionStatus,
  getCurrentStepIndex,
  getDefaultPlanningProgress,
  type PlanningStepId,
  type StepCompletionStatus,
  type TripFullData,
} from "@/lib/travel-planning";
import { PlanStepper } from "@/components/travel/PlanStepper";
import { PlanStepCard } from "@/components/travel/PlanStepCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import type { TripImportPayload, TripImportOptions, HotelResearchPayload, ValidationResult, AssembleScheduleResponse } from "@singularity/shared-types";

export default function TripPlanPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tripId = params.id as string;

  const { data: trip, isLoading } = useTripFull(tripId);
  const { data: existingSegments } = useTripSegments(tripId);
  const updateProgress = useUpdateTripPlanningProgress();
  const validateMutation = useValidateImport();
  const importMutation = useImportTrip();
  const createSegmentMutation = useCreateTripSegment();
  const updateSegmentMutation = useUpdateTripSegment();
  const deleteSegmentMutation = useDeleteTripSegment();
  const syncSegmentDaysMutation = useSyncSegmentDays();
  const extractFlightMutation = useExtractFlightFromImage();
  const updateTripMutation = useUpdateTrip();
  const createFlightMutation = useCreateTripFlight();

  // Active step state (for UI focus, not necessarily the "current" incomplete step)
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Assemble schedule state
  const [showAssembleDialog, setShowAssembleDialog] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);

  // Per-segment enrichment state
  const [enrichingSegmentId, setEnrichingSegmentId] = useState<string | null>(null);
  const [timingSegmentId, setTimingSegmentId] = useState<string | null>(null);

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<"segment" | "hotel">("segment");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  // Skeleton import state
  const [showSkeletonDialog, setShowSkeletonDialog] = useState(false);
  const [skeletonFile, setSkeletonFile] = useState<File | null>(null);
  const [isImportingSkeleton, setIsImportingSkeleton] = useState(false);

  // Flight image extraction state
  const [isExtractingFlight, setIsExtractingFlight] = useState(false);

  // Date mismatch dialog state
  const [showDateMismatchDialog, setShowDateMismatchDialog] = useState(false);
  const [dateMismatchInfo, setDateMismatchInfo] = useState<{
    json_dates: { start: string; end: string };
    segment_dates: { start: string; end: string };
    segment_name: string;
    parsed_payload: TripImportPayload | null;
  } | null>(null);
  const [correctedStartDate, setCorrectedStartDate] = useState<Date | undefined>(undefined);

  // Compute step statuses
  const stepStatuses = useMemo(() => {
    if (!trip) {
      return {} as Record<PlanningStepId, StepCompletionStatus>;
    }

    const tripData = trip as TripFullData;
    const storedProgress = trip.planning_progress || getDefaultPlanningProgress();

    const statuses: Record<PlanningStepId, StepCompletionStatus> = {
      basics: getStepCompletionStatus("basics", tripData, storedProgress),
      accommodations: getStepCompletionStatus("accommodations", tripData, storedProgress),
      segments: getStepCompletionStatus("segments", tripData, storedProgress),
      meals: getStepCompletionStatus("meals", tripData, storedProgress),
      days_activities: getStepCompletionStatus("days_activities", tripData, storedProgress),
    };

    return statuses;
  }, [trip]);

  // Compute current step index based on incomplete steps
  const currentStepIndex = useMemo(() => {
    if (!trip) return 0;
    const tripData = trip as TripFullData;
    const storedProgress = trip.planning_progress || getDefaultPlanningProgress();
    return getCurrentStepIndex(tripData, storedProgress);
  }, [trip]);

  // Use active step if set, otherwise use current step
  const displayStepIndex = activeStepIndex ?? currentStepIndex;

  const handleStepClick = (stepIndex: number) => {
    setActiveStepIndex(stepIndex);
  };

  const handleMarkComplete = async (stepId: PlanningStepId) => {
    try {
      await updateProgress.mutateAsync({
        id: tripId,
        step: stepId,
        completed: true,
      });
      toast.success(`"${PLANNING_STEPS.find(s => s.id === stepId)?.title}" marked as complete`);
    } catch (error) {
      console.error("Failed to update progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const handleUnmarkComplete = async (stepId: PlanningStepId) => {
    try {
      await updateProgress.mutateAsync({
        id: tripId,
        step: stepId,
        completed: false,
      });
      toast.success(`"${PLANNING_STEPS.find(s => s.id === stepId)?.title}" unmarked`);
    } catch (error) {
      console.error("Failed to update progress:", error);
      toast.error("Failed to update progress");
    }
  };

  // Validation result state
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

  // Assemble schedule handler
  const handleAssembleSchedule = async () => {
    setIsAssembling(true);
    setLastValidation(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/travel/trips/${tripId}/assemble-schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assemble schedule");
      }

      const result = await response.json() as AssembleScheduleResponse;
      const validation = result.data?.validation;

      // Store validation result
      if (validation) {
        setLastValidation(validation);
      }

      // Show appropriate toast and redirect based on validation results
      const hasIssues = validation && (validation.summary.errors > 0 || validation.summary.warnings > 0);

      if (validation && validation.summary.errors > 0) {
        toast.warning(`Schedule assembled with ${validation.summary.errors} issue${validation.summary.errors !== 1 ? 's' : ''} to review.`);
      } else if (validation && validation.summary.warnings > 0) {
        toast.success(`Schedule assembled with ${validation.summary.warnings} warning${validation.summary.warnings !== 1 ? 's' : ''}.`);
      } else {
        toast.success("Schedule assembled successfully!");
      }

      setShowAssembleDialog(false);

      // Redirect to Validation tab if issues, otherwise Itinerary
      if (hasIssues) {
        router.push(`/travel/${tripId}/validation`);
      } else {
        router.push(`/travel/${tripId}/itinerary`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assemble schedule");
    } finally {
      setIsAssembling(false);
    }
  };

  // Per-segment enrichment handler
  const handleEnrichSegment = useCallback(async (segmentId: string) => {
    setEnrichingSegmentId(segmentId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/travel/trips/${tripId}/segments/${segmentId}/enrich-activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to enrich segment");
      }

      const result = await response.json();
      const data = result.data;

      // Invalidate trip full query to refresh stats
      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"] });

      toast.success(
        `Enriched ${data.enriched} activities` +
        (data.photosAdded > 0 ? `, ${data.photosAdded} photos added` : '') +
        (data.reviewsAnalyzed > 0 ? `, ${data.reviewsAnalyzed} reviews analyzed` : '')
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enrich segment");
    } finally {
      setEnrichingSegmentId(null);
    }
  }, [tripId, queryClient]);

  const handleTimingSegment = useCallback(async (segmentId: string) => {
    setTimingSegmentId(segmentId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/travel/trips/${tripId}/segments/${segmentId}/timing-enrichment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to run timing enrichment");
      }

      const result = await response.json();
      const data = result.data;

      queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"] });

      toast.success(
        `Timing complete: ${data.meals_suggested} meals suggested` +
        (data.routes_computed > 0 ? `, ${data.routes_computed} routes computed` : '') +
        (data.alternates_created > 0 ? `, ${data.alternates_created} alternates` : '')
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run timing enrichment");
    } finally {
      setTimingSegmentId(null);
    }
  }, [tripId, queryClient]);

  // Import research handler - called from PlanStepCard drag-drop or button
  const handleImportResearch = useCallback(async (type: "segment" | "hotel", file?: File) => {
    setImportType(type);
    setImportFile(file || null);
    setSelectedSegmentId("");
    setShowImportDialog(true);

    // If file was provided, try to auto-select matching segment
    if (file && existingSegments && existingSegments.length > 0) {
      try {
        const content = await file.text();
        const parsed = JSON.parse(content);

        let matchingSegment = null;

        // Priority 1: Match by segment_number (most reliable)
        const fileSegmentNumber = parsed.metadata?.segment_number;
        if (fileSegmentNumber) {
          matchingSegment = existingSegments.find(
            (seg) => seg.segment_number === fileSegmentNumber
          );
        }

        // Priority 2: Match by segment name
        if (!matchingSegment) {
          const fileSegmentName = parsed.metadata?.segment_name || parsed.segment?.name;
          if (fileSegmentName) {
            matchingSegment = existingSegments.find(
              (seg) => seg.name?.toLowerCase() === fileSegmentName.toLowerCase()
            );
          }
        }

        // Priority 3: Match by exact dates (fallback)
        if (!matchingSegment) {
          const fileStartDate = parsed.metadata?.dates?.start;
          const fileEndDate = parsed.metadata?.dates?.end;
          if (fileStartDate && fileEndDate) {
            matchingSegment = existingSegments.find((seg) => {
              const segStart = seg.start_date?.split("T")[0];
              const segEnd = seg.end_date?.split("T")[0];
              return segStart === fileStartDate && segEnd === fileEndDate;
            });
          }
        }

        if (matchingSegment) {
          setSelectedSegmentId(matchingSegment.id);
        }
      } catch (e) {
        // Ignore parse errors, user will manually select
        console.log("Could not auto-detect segment from file");
      }
    }
  }, [existingSegments]);

  // Process import when confirmed
  const handleConfirmImport = async () => {
    if (!importFile) {
      toast.error("No file selected");
      return;
    }

    if (!selectedSegmentId) {
      toast.error("Please select a segment");
      return;
    }

    setIsImporting(true);

    try {
      const content = await importFile.text();
      const parsed = JSON.parse(content);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (importType === "hotel") {
        // Hotel import
        const hotelPayload = parsed as HotelResearchPayload;

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
        toast.success(`Imported ${result.created?.research_items || hotelPayload.hotels?.length || 0} hotel options`);
      } else {
        // Segment research import
        const segmentPayload = parsed as TripImportPayload;

        // Validate first
        const validationResult = await validateMutation.mutateAsync(segmentPayload);

        if (!validationResult.valid) {
          toast.error(`Validation failed: ${validationResult.issues.slice(0, 2).join(", ")}`);
          return;
        }

        // Import
        const options: TripImportOptions = {
          create_trip: false,
          create_segment: selectedSegmentId === "_new",
          create_days: true,
          create_research_items: true,
          import_approved_as_activities: false,
          auto_approve_must_do: true,
          trip_id: tripId,
          segment_id: selectedSegmentId !== "_new" ? selectedSegmentId : undefined,
        };

        // Use direct fetch to handle date mismatch errors
        const response = await fetch(`${API_URL}/travel/import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
          },
          body: JSON.stringify({
            payload: segmentPayload,
            options,
          }),
        });

        const result = await response.json();

        // Check for day count mismatch - cannot import at all
        if (!response.ok && result.day_count_mismatch) {
          const mismatch = result.day_count_mismatch;
          toast.error(
            `Cannot import: JSON has ${mismatch.json_days} days but segment has ${mismatch.segment_days} days. ` +
            `Please regenerate the JSON file with ${mismatch.segment_days} days.`,
            { duration: 8000 }
          );
          setShowImportDialog(false);
          return;
        }

        // Check for date mismatch error (day counts match, dates differ)
        if (!response.ok && result.date_mismatch) {
          // Show date mismatch dialog
          setDateMismatchInfo({
            json_dates: result.date_mismatch.json_dates,
            segment_dates: result.date_mismatch.segment_dates,
            segment_name: result.date_mismatch.segment_name,
            parsed_payload: segmentPayload,
          });
          // Default to segment's start date
          setCorrectedStartDate(parseISO(result.date_mismatch.segment_dates.start));
          setShowImportDialog(false);
          setShowDateMismatchDialog(true);
          return;
        }

        if (!response.ok) {
          throw new Error(result.error || result.message || "Failed to import");
        }

        if (result.success) {
          toast.success(`Imported: ${result.created.research_items} items, ${result.created.days} days`);
        } else {
          toast.error(`Import completed with errors: ${result.errors?.join(", ")}`);
        }
      }

      setShowImportDialog(false);
      // Invalidate queries to refresh the UI - await to ensure refetch completes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "segments"], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"], refetchType: 'all' }),
      ]);
      router.refresh();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import research");
    } finally {
      setIsImporting(false);
    }
  };

  // Handle date mismatch correction - adjust dates and re-import
  const handleConfirmDateCorrection = async () => {
    if (!dateMismatchInfo?.parsed_payload || !correctedStartDate || !selectedSegmentId) {
      toast.error("Missing required data for date correction");
      return;
    }

    setIsImporting(true);

    try {
      const payload = dateMismatchInfo.parsed_payload;
      const originalStartDate = parseISO(dateMismatchInfo.json_dates.start);
      const originalEndDate = parseISO(dateMismatchInfo.json_dates.end);
      const dayCount = differenceInDays(originalEndDate, originalStartDate);
      const newEndDate = addDays(correctedStartDate, dayCount);

      // Adjust metadata dates
      if (payload.metadata?.dates) {
        payload.metadata.dates.start = format(correctedStartDate, "yyyy-MM-dd");
        payload.metadata.dates.end = format(newEndDate, "yyyy-MM-dd");
      }

      // Adjust day dates
      if (payload.days) {
        for (const day of payload.days) {
          if (day.date) {
            const originalDayDate = parseISO(day.date);
            const dayOffset = differenceInDays(originalDayDate, originalStartDate);
            day.date = format(addDays(correctedStartDate, dayOffset), "yyyy-MM-dd");
          }
        }
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const options: TripImportOptions = {
        create_trip: false,
        create_segment: false,
        create_days: true,
        create_research_items: true,
        import_approved_as_activities: false,
        auto_approve_must_do: true,
        trip_id: tripId,
        segment_id: selectedSegmentId,
      };

      const response = await fetch(`${API_URL}/travel/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          payload,
          options,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to import");
      }

      if (result.success) {
        toast.success(`Imported with corrected dates: ${result.created.research_items} items, ${result.created.days} days`);
      } else {
        toast.error(`Import completed with errors: ${result.errors?.join(", ")}`);
      }

      setShowDateMismatchDialog(false);
      setDateMismatchInfo(null);
      // Invalidate queries to refresh the UI - await to ensure refetch completes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "segments"], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"], refetchType: 'all' }),
      ]);
      router.refresh();
    } catch (error) {
      console.error("Date correction import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import with corrected dates");
    } finally {
      setIsImporting(false);
    }
  };

  // Skeleton import handler - called from PlanStepCard
  const handleImportSkeleton = useCallback((file?: File) => {
    if (file) {
      setSkeletonFile(file);
      setShowSkeletonDialog(true);
    }
  }, []);

  // Process skeleton import when confirmed - uses UPSERT logic
  // Matches by segment_number: update if exists, create if not
  const handleConfirmSkeletonImport = async () => {
    if (!skeletonFile) {
      toast.error("No file selected");
      return;
    }

    setIsImportingSkeleton(true);

    try {
      const content = await skeletonFile.text();
      const parsed = JSON.parse(content);

      // Validate skeleton structure
      if (!parsed.segments || !Array.isArray(parsed.segments)) {
        throw new Error("Invalid skeleton: missing segments array");
      }

      // Update trip metadata from skeleton if present (but NOT dates - those are user-controlled)
      if (parsed.trip) {
        const tripUpdates: Record<string, unknown> = {};
        // Do NOT override start_date/end_date - user controls trip dates
        // Skeleton only provides segment-level dates
        if (parsed.trip.traveler_count) tripUpdates.traveler_count = parsed.trip.traveler_count;
        if (parsed.trip.destination_country) tripUpdates.destination = parsed.trip.destination_country;
        if (parsed.trip.overview) tripUpdates.description = parsed.trip.overview?.substring(0, 500);

        if (Object.keys(tripUpdates).length > 0) {
          await updateTripMutation.mutateAsync({ id: tripId, data: tripUpdates });
        }
      }

      // Build a map of existing segments by segment_number for upsert
      const existingByNumber = new Map<number, { id: string; name: string }>();
      if (existingSegments) {
        for (const seg of existingSegments) {
          if (seg.segment_number) {
            existingByNumber.set(seg.segment_number, { id: seg.id, name: seg.name });
          }
        }
      }

      // Track segment numbers in the incoming file (to detect orphans later if needed)
      const incomingSegmentNumbers = new Set<number>();

      // Upsert segments from skeleton
      let segmentsCreated = 0;
      let segmentsUpdated = 0;
      for (const seg of parsed.segments) {
        const segNum = seg.segment_number as number;
        if (segNum) incomingSegmentNumbers.add(segNum);

        const segmentData = {
          name: seg.name,
          start_date: seg.start_date,
          end_date: seg.end_date,
          location_name: seg.location?.location_name,
          latitude: seg.location?.latitude,
          longitude: seg.location?.longitude,
          segment_number: seg.segment_number,
          region: seg.region,
          theme: seg.theme,
          country: seg.location?.country,
          timezone: seg.location?.timezone,
          accommodation: seg.accommodation,
          research_status: "not_started",
        };

        try {
          const existing = segNum ? existingByNumber.get(segNum) : undefined;

          if (existing) {
            // UPDATE existing segment
            await updateSegmentMutation.mutateAsync({
              tripId,
              segmentId: existing.id,
              data: segmentData as any,
            });

            // Sync days to match segment dates (fixes date offsets)
            try {
              await syncSegmentDaysMutation.mutateAsync({
                tripId,
                segmentId: existing.id,
              });
            } catch (syncError) {
              console.warn("Failed to sync days for segment:", seg.name, syncError);
            }

            segmentsUpdated++;
          } else {
            // CREATE new segment
            const newSegment = await createSegmentMutation.mutateAsync({ tripId, data: segmentData as any });

            // Sync days for new segment (creates days if needed)
            if (newSegment?.id) {
              try {
                await syncSegmentDaysMutation.mutateAsync({
                  tripId,
                  segmentId: newSegment.id,
                });
              } catch (syncError) {
                console.warn("Failed to create days for new segment:", seg.name, syncError);
              }
            }

            segmentsCreated++;
          }
        } catch (segError) {
          console.error("Failed to upsert segment:", seg.name, segError);
        }
      }

      // Build success message
      const parts: string[] = [];
      if (parsed.trip?.start_date || parsed.trip?.end_date) parts.push("trip dates updated");
      if (segmentsCreated > 0) parts.push(`${segmentsCreated} segments created`);
      if (segmentsUpdated > 0) parts.push(`${segmentsUpdated} segments updated, days synced`);
      toast.success(parts.length > 0 ? parts.join(", ") : "Skeleton imported");

      setShowSkeletonDialog(false);
      setSkeletonFile(null);
      // Invalidate queries to refresh the UI - await to ensure refetch completes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "segments"], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"], refetchType: 'all' }),
      ]);
      router.refresh();
    } catch (error) {
      console.error("Skeleton import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import skeleton");
    } finally {
      setIsImportingSkeleton(false);
    }
  };

  // Flight image import handler - extract flight info from screenshot/PDF
  const handleImportFlightImage = useCallback(async (file: File) => {
    setIsExtractingFlight(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      const mediaType = file.type || "image/png";

      // Call API to extract flight info
      const result = await extractFlightMutation.mutateAsync({
        tripId,
        image: base64Data,
        mediaType,
      });

      // Update trip with extracted info
      const { tripInfo, flights } = result;

      // Update trip basics if info was extracted
      if (tripInfo) {
        const updates: Record<string, unknown> = {};
        if (tripInfo.travelers) updates.traveler_count = tripInfo.travelers;
        if (tripInfo.origin) updates.origin = tripInfo.origin;
        if (tripInfo.destination) updates.destination = tripInfo.destination;
        if (tripInfo.startDate) updates.start_date = tripInfo.startDate;
        if (tripInfo.endDate) updates.end_date = tripInfo.endDate;
        if (!trip?.transportation_type && flights?.length > 0) updates.transportation_type = "flying";

        if (Object.keys(updates).length > 0) {
          await updateTripMutation.mutateAsync({ id: tripId, data: updates });
        }
      }

      // Create flight records
      if (flights && flights.length > 0) {
        for (const flight of flights) {
          await createFlightMutation.mutateAsync({
            tripId,
            data: {
              direction: flight.direction,
              airline: flight.airline,
              flight_number: flight.flightNumbers?.join(", ") || "",
              departure_airport: flight.departureAirport,
              arrival_airport: flight.arrivalAirport,
              departure_datetime: flight.departureDatetime,
              arrival_datetime: flight.arrivalDatetime,
              booking_reference: flight.bookingReference || undefined,
              layovers: flight.layovers || undefined,
              notes: flight.notes || undefined,
            },
          });
        }
        toast.success(`Extracted ${flights.length} flight(s) from image`);
      } else {
        toast.success("Flight info extracted and trip updated");
      }

      // Invalidate queries to refresh the UI - await to ensure refetch completes
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "segments"], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ["travel", "trips", tripId, "full"], refetchType: 'all' }),
      ]);
      router.refresh();
    } catch (error) {
      console.error("Flight extraction error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract flight info");
    } finally {
      setIsExtractingFlight(false);
    }
  }, [tripId, trip, extractFlightMutation, updateTripMutation, createFlightMutation, router, queryClient]);

  // Check if segments exist
  const hasSegments = (existingSegments?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Trip not found
      </div>
    );
  }

  // Count completed steps
  const completedCount = Object.values(stepStatuses).filter(s => s.completed).length;
  const totalSteps = PLANNING_STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Trip Planning Guide</h2>
        <p className="text-muted-foreground text-sm">
          Follow these steps to plan your trip. You can jump between steps at any time.
        </p>
        {/* Progress indicator */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalSteps} complete
          </span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Stepper Navigation */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <PlanStepper
              steps={PLANNING_STEPS}
              currentStepIndex={displayStepIndex}
              stepStatuses={stepStatuses}
              onStepClick={handleStepClick}
            />
          </div>
        </div>

        {/* Right Side - Step Cards */}
        <div className="lg:col-span-3 space-y-4">
          {PLANNING_STEPS.map((step, index) => (
            <PlanStepCard
              key={step.id}
              tripId={tripId}
              step={step}
              stepIndex={index}
              status={stepStatuses[step.id]}
              isActive={index === displayStepIndex}
              isLoading={updateProgress.isPending}
              onMarkComplete={() => handleMarkComplete(step.id)}
              onUnmarkComplete={() => handleUnmarkComplete(step.id)}
              tripData={step.id === "basics" ? {
                name: trip.name,
                start_date: trip.start_date,
                end_date: trip.end_date,
                destination: trip.destination,
                origin: trip.origin,
                transportation_type: trip.transportation_type,
                traveler_count: trip.traveler_count,
              } : undefined}
              onAssembleSchedule={step.id === "days_activities" ? () => setShowAssembleDialog(true) : undefined}
              isAssembling={step.id === "days_activities" ? isAssembling : undefined}
              onEnrichSegment={step.id === "days_activities" ? handleEnrichSegment : undefined}
              enrichingSegmentId={step.id === "days_activities" ? enrichingSegmentId : undefined}
              onTimingSegment={step.id === "days_activities" ? handleTimingSegment : undefined}
              timingSegmentId={step.id === "days_activities" ? timingSegmentId : undefined}
              onImportResearch={(step.id === "segments" || step.id === "accommodations") ? handleImportResearch : undefined}
              onImportSkeleton={step.id === "basics" ? handleImportSkeleton : undefined}
              onImportFlightImage={step.id === "basics" ? handleImportFlightImage : undefined}
              isExtractingFlight={step.id === "basics" ? isExtractingFlight : undefined}
              hasSegments={step.id === "basics" ? hasSegments : undefined}
              validationResult={step.id === "days_activities" ? lastValidation : undefined}
            />
          ))}
        </div>
      </div>

      {/* Assemble Schedule Confirmation Dialog */}
      <AlertDialog open={showAssembleDialog} onOpenChange={setShowAssembleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-500" />
              Enrich Data & Assemble Schedule
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will enrich your activities with Google Places data (ratings, photos, hours)
                  and create a detailed day-by-day schedule with 15-minute precision.
                </p>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                  <div className="font-medium text-foreground">What happens:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><strong className="text-purple-600">Enrich activities</strong> with Google Places (ratings, photos, hours, tags)</li>
                    <li>Pulls your hotel selection and activities</li>
                    <li>Calculates travel times via Google Maps</li>
                    <li>Creates 15-min precision schedules</li>
                  </ul>
                </div>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  This will replace any existing assembled schedule.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssembling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssembleSchedule}
              disabled={isAssembling}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAssembling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enriching & Assembling...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Enrich & Assemble
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Research Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import {importType === "hotel" ? "Hotel" : "Segment"} Research
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  {importFile
                    ? `Ready to import from: ${importFile.name}`
                    : "Select a segment to import the research data into."}
                </p>

                {existingSegments && existingSegments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select segment</Label>
                    <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a segment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {importType === "segment" && (
                          <SelectItem value="_new">Create new segment</SelectItem>
                        )}
                        {existingSegments.map((seg) => (
                          <SelectItem key={seg.id} value={seg.id}>
                            #{seg.segment_number} - {seg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(!existingSegments || existingSegments.length === 0) && importType === "hotel" && (
                  <p className="text-amber-600 text-sm">
                    No segments found. Create segments first before importing hotel research.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImport}
              disabled={isImporting || !selectedSegmentId || !importFile}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Skeleton Import Dialog */}
      <AlertDialog open={showSkeletonDialog} onOpenChange={setShowSkeletonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Import Trip Skeleton
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  {skeletonFile
                    ? `Ready to import segments from: ${skeletonFile.name}`
                    : "Import a trip skeleton to create segments for this trip."}
                </p>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
                  <div className="font-medium text-foreground">What happens:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Creates segments from the skeleton file</li>
                    <li>Each segment will have dates, location, and theme</li>
                    <li>You can then import research for each segment</li>
                  </ul>
                </div>
                {hasSegments && (
                  <p className="text-amber-600 text-sm">
                    This trip already has segments. Importing will add more segments.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImportingSkeleton}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSkeletonImport}
              disabled={isImportingSkeleton || !skeletonFile}
            >
              {isImportingSkeleton ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Segments...
                </>
              ) : (
                "Import Segments"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Date Mismatch Dialog */}
      <AlertDialog open={showDateMismatchDialog} onOpenChange={setShowDateMismatchDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Date Mismatch Detected
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-foreground">
                  The JSON file has different dates than the segment in your trip plan.
                  The trip plan is the master record and cannot be changed by imports.
                </p>

                {dateMismatchInfo && (
                  <div className="bg-muted p-3 rounded-lg text-sm space-y-3">
                    <div>
                      <div className="font-medium text-foreground mb-1">Segment: {dateMismatchInfo.segment_name}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Trip Plan:</span>
                          <div className="font-mono text-foreground">
                            {dateMismatchInfo.segment_dates.start} to {dateMismatchInfo.segment_dates.end}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">JSON File:</span>
                          <div className="font-mono text-red-500 line-through">
                            {dateMismatchInfo.json_dates.start} to {dateMismatchInfo.json_dates.end}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Correct Starting Date</Label>
                  <p className="text-xs text-muted-foreground">
                    Select the correct start date. All activities will be shifted to match.
                  </p>
                  <Input
                    type="date"
                    value={correctedStartDate ? format(correctedStartDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCorrectedStartDate(parseISO(e.target.value));
                      }
                    }}
                    className="w-full"
                  />
                </div>

                {correctedStartDate && dateMismatchInfo && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded-lg text-sm">
                    <div className="font-medium text-green-700 dark:text-green-300 mb-1">
                      Corrected Dates:
                    </div>
                    <div className="font-mono text-green-600 dark:text-green-400">
                      {format(correctedStartDate, "yyyy-MM-dd")} to{" "}
                      {format(
                        addDays(
                          correctedStartDate,
                          differenceInDays(
                            parseISO(dateMismatchInfo.json_dates.end),
                            parseISO(dateMismatchInfo.json_dates.start)
                          )
                        ),
                        "yyyy-MM-dd"
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ({differenceInDays(
                        parseISO(dateMismatchInfo.json_dates.end),
                        parseISO(dateMismatchInfo.json_dates.start)
                      ) + 1} days, same as original)
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting} onClick={() => {
              setShowDateMismatchDialog(false);
              setDateMismatchInfo(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDateCorrection}
              disabled={isImporting || !correctedStartDate}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import with Corrected Dates"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
