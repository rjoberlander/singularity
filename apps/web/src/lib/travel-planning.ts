import type {
  Trip,
  TripSegment,
  TripAccommodation,
  TripDay,
  TripActivity,
  TripFlight,
  TripDriving,
  TripMedia,
  TripPlanningProgress,
  PlanningStepProgress,
} from "@singularity/shared-types";

export type PlanningStepId = "basics" | "segments" | "accommodations" | "activities" | "meals" | "enrichment" | "schedule";

export interface PlanningStepConfig {
  id: PlanningStepId;
  title: string;
  description: string;
  tabHref: string;
}

export const PLANNING_STEPS: PlanningStepConfig[] = [
  {
    id: "basics",
    title: "Trip Basics",
    description: "Set your dates, destination, and transportation type",
    tabHref: "/details",
  },
  {
    id: "segments",
    title: "Segments",
    description: "Organize your trip into regional groupings covering all dates",
    tabHref: "/overview",
  },
  {
    id: "accommodations",
    title: "Accommodations",
    description: "Add hotels or lodging for each segment",
    tabHref: "/lodging",
  },
  {
    id: "activities",
    title: "Activities",
    description: "Review imported activities and verify coverage before meal research",
    tabHref: "/itinerary",
  },
  {
    id: "meals",
    title: "Meal Research",
    description: "Research authentic local restaurants using AI-powered web search",
    tabHref: "/itinerary",
  },
  {
    id: "enrichment",
    title: "Enrichment",
    description: "Fill gaps in activity details, reviews, and generate trip narratives",
    tabHref: "/itinerary",
  },
  {
    id: "schedule",
    title: "Schedule & Timing",
    description: "Compute travel times, assemble daily schedule, and validate",
    tabHref: "/itinerary",
  },
];

export interface TripFullData extends Trip {
  segments?: TripSegment[];
  accommodations?: TripAccommodation[];
  days?: TripDay[];
  activities?: TripActivity[];
  flights?: TripFlight[];
  driving?: TripDriving[];
  media?: TripMedia[];
}

export interface SegmentEnrichmentStats {
  placesEnriched: number;
  placesTotal: number;
  placesSkipped: number;
  placesWithPhotos: number;
  photosActual: number;
  photosExpected: number;
  mealPhotosActual: number;
  mealsNeedReservation: number;
  mealsResearched: number;
  mealsTotal: number;
  genericMealsTotal: number;
  mealsWithRestaurant: number;
  reviewsAnalyzed: number;
  reviewsTotal: number;
  detailsEnriched: number;
  detailsTotal: number;
  // Deep enrichment status
  hasSegmentNarrative: boolean;
  hasSegmentLocationDetail: boolean;
  daysWithNarrative: number;
  daysTotal: number;
  hasSegmentGoogleData: boolean;
  isFullyEnriched: boolean;
}

export interface FlightInfo {
  id: string;
  direction?: string;
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureDatetime?: string;
  arrivalDatetime?: string;
  bookingReference?: string;
  agencyReference?: string;
  cost?: number;
  currency?: string;
  pointsUsed?: number;
  layovers?: Array<{ airport: string; duration: string }>;
  flightSegments?: Array<{
    flight_number?: string;
    departure_airport: string;
    arrival_airport: string;
    departure_datetime?: string;
    arrival_datetime?: string;
    duration_minutes?: number;
  }>;
  seatAssignments?: Array<{ name: string; seat: string }>;
  confirmationFileUrl?: string;
  confirmationFileName?: string;
}

export interface StepCompletionStatus {
  auto_suggested: boolean;
  completed: boolean;
  completed_at?: string;
  summary: string[];
  missingItems: string[];
  warnings: string[];
  // Additional data for table display
  segmentDetails?: SegmentInfo[];
  accommodationDetails?: SegmentAccommodationInfo[];
  dateGaps?: string[];
  flightDetails?: FlightInfo[];
  mealDetails?: MealInfo[];
}

/**
 * Parse a date string as a local date (not UTC) to avoid timezone shift
 * "2026-06-14" -> Date object for June 14 local time, not June 13 in west timezones
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Calculate total trip days from start to end date
 */
function getTripDays(trip: TripFullData): number {
  if (!trip.start_date || !trip.end_date) return 0;
  const start = parseLocalDate(trip.start_date);
  const end = parseLocalDate(trip.end_date);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

interface StepComputeResult {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
  warnings: string[];
  segmentDetails?: SegmentInfo[];
  accommodationDetails?: SegmentAccommodationInfo[];
  mealDetails?: MealInfo[];
  dateGaps?: string[];
  flightDetails?: FlightInfo[];
}

/**
 * Compute whether a step should be auto-suggested as complete based on trip data
 */
export function computeStepAutoSuggestion(
  stepId: PlanningStepId,
  trip: TripFullData
): StepComputeResult {
  switch (stepId) {
    case "basics": {
      const result = computeBasicsCompletion(trip);
      return {
        shouldSuggest: result.shouldSuggest,
        summary: result.summary,
        missingItems: result.missingItems,
        warnings: result.warnings,
        flightDetails: result.flightDetails,
        segmentDetails: result.segmentDetails,
      };
    }
    case "accommodations": {
      const result = computeAccommodationsCompletion(trip);
      return {
        shouldSuggest: result.shouldSuggest,
        summary: result.summary,
        missingItems: result.missingItems,
        warnings: [],
        accommodationDetails: result.segmentDetails,
      };
    }
    case "segments": {
      const result = computeSegmentsCompletion(trip);
      return {
        shouldSuggest: result.shouldSuggest,
        summary: result.summary,
        missingItems: result.missingItems,
        warnings: [],
        segmentDetails: result.segmentDetails,
        dateGaps: result.dateGaps,
      };
    }
    case "activities": {
      const result = computeActivitiesCompletion(trip);
      const segmentsResult = computeSegmentsCompletion(trip);
      return {
        shouldSuggest: result.shouldSuggest,
        summary: result.summary,
        missingItems: result.missingItems,
        warnings: [],
        segmentDetails: segmentsResult.segmentDetails,
      };
    }
    case "meals": {
      const result = computeMealsCompletion(trip);
      const segmentsResult = computeSegmentsCompletion(trip);
      return {
        shouldSuggest: result.shouldSuggest,
        summary: result.summary,
        missingItems: result.missingItems,
        warnings: [],
        segmentDetails: segmentsResult.segmentDetails,
        mealDetails: result.mealDetails,
      };
    }
    case "enrichment": {
      const result = computeEnrichmentCompletion(trip);
      const segmentsResult = computeSegmentsCompletion(trip);
      return {
        shouldSuggest: result.shouldSuggest,
        summary: result.summary,
        missingItems: result.missingItems,
        warnings: [],
        segmentDetails: segmentsResult.segmentDetails,
      };
    }
    case "schedule": {
      const result = computeDaysActivitiesCompletion(trip);
      const segmentsResult = computeSegmentsCompletion(trip);
      const accommodationsResult = computeAccommodationsCompletion(trip);
      return {
        ...result,
        warnings: [],
        segmentDetails: segmentsResult.segmentDetails,
        accommodationDetails: accommodationsResult.segmentDetails,
      };
    }
    default:
      return { shouldSuggest: false, summary: [], missingItems: [], warnings: [] };
  }
}

function computeBasicsCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
  warnings: string[];
  flightDetails?: FlightInfo[];
  segmentDetails?: SegmentInfo[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];
  const warnings: string[] = [];
  let flightDetails: FlightInfo[] | undefined;
  let segmentDetails: SegmentInfo[] | undefined;

  // Parse trip dates for validation (use parseLocalDate to avoid timezone shift)
  const tripStartDate = trip.start_date ? parseLocalDate(trip.start_date) : null;
  const tripEndDate = trip.end_date ? parseLocalDate(trip.end_date) : null;

  // Check start_date and end_date together
  if (trip.start_date && trip.end_date) {
    const totalDays = getTripDays(trip);
    summary.push(`✓ Dates: ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)} (${totalDays} days)`);
  } else {
    if (!trip.start_date) missingItems.push("Start date");
    if (!trip.end_date) missingItems.push("End date");
  }

  // Check destination
  if (trip.destination) {
    summary.push(`✓ Destination: ${trip.destination}`);
  } else {
    missingItems.push("Destination");
  }

  // Check origin
  if (trip.origin) {
    summary.push(`✓ Origin: ${trip.origin}`);
  }

  // Check transportation_type
  if (trip.transportation_type) {
    summary.push(`✓ Transport: ${formatTransportType(trip.transportation_type)}`);

    // Show flights if booked - build flight details for display
    const flights = trip.flights || [];
    if (flights.length > 0) {
      summary.push(`✓ ${flights.length} flight${flights.length !== 1 ? "s" : ""} booked`);
      // Build confirmation file map from media
      const flightConfirmations = new Map<string, { url: string; name: string }>();
      for (const m of (trip.media || [])) {
        if (m.parent_type === "flight" && m.media_type === "document" && m.parent_id) {
          flightConfirmations.set(m.parent_id, { url: m.file_url, name: m.original_filename || "Confirmation" });
        }
      }

      flightDetails = flights.map(f => {
        const conf = flightConfirmations.get(f.id);
        return {
          id: f.id,
          direction: f.direction,
          airline: f.airline,
          flightNumber: f.flight_number,
          departureAirport: f.departure_airport,
          arrivalAirport: f.arrival_airport,
          departureDatetime: f.departure_datetime,
          arrivalDatetime: f.arrival_datetime,
          bookingReference: f.booking_reference,
          agencyReference: f.agency_reference,
          cost: f.cost,
          currency: f.currency,
          pointsUsed: f.points_used,
          layovers: f.layovers,
          flightSegments: f.flight_segments,
          seatAssignments: f.seat_assignments,
          confirmationFileUrl: conf?.url,
          confirmationFileName: conf?.name,
        };
      });

      // Store flight info for segment validation later
      const outboundFlight = flights.find(f => f.direction === "outbound");
      const returnFlight = flights.find(f => f.direction === "return");

      // Validate outbound flight departure vs trip start
      if (tripStartDate && outboundFlight?.departure_datetime) {
        // Outbound departure should be in origin timezone (e.g., LAX)
        // Use local date from the datetime
        const outboundDepartDate = new Date(outboundFlight.departure_datetime);
        const outboundDepartLocal = outboundDepartDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format
        const tripStartStr = formatDateISO(tripStartDate);
        if (outboundDepartLocal !== tripStartStr) {
          warnings.push(`⚠ Outbound flight departs ${formatDateShort(outboundDepartLocal)} but trip starts ${formatDateShort(tripStartDate)}`);
        }
      }

      // Validate return flight arrival vs trip end
      // Return arrival should be ON or BEFORE trip end (arriving home)
      if (tripEndDate && returnFlight?.arrival_datetime) {
        // Return arrival is in origin timezone (e.g., LAX) - use local date
        const returnArriveDate = new Date(returnFlight.arrival_datetime);
        const returnArriveLocal = returnArriveDate.toLocaleDateString("en-CA");
        const tripEndStr = formatDateISO(tripEndDate);
        if (returnArriveLocal > tripEndStr) {
          warnings.push(`⚠ Return flight arrives ${formatDateShort(returnArriveLocal)} after trip ends ${formatDateShort(tripEndDate)}`);
        }
      }

      // Store outbound arrival for segment validation
      var outboundArrivalDate: Date | null = null;
      if (outboundFlight?.arrival_datetime) {
        outboundArrivalDate = new Date(outboundFlight.arrival_datetime);
      }

      // Store return departure for segment validation
      var returnDepartureDate: Date | null = null;
      if (returnFlight?.departure_datetime) {
        returnDepartureDate = new Date(returnFlight.departure_datetime);
      }
    }

    // Show driving routes if any
    const driving = trip.driving || [];
    if (driving.length > 0) {
      summary.push(`✓ ${driving.length} driving route${driving.length !== 1 ? "s" : ""}`);
    }
  } else {
    missingItems.push("Transportation type");
  }

  // Check traveler count
  if (trip.traveler_count && trip.traveler_count > 0) {
    summary.push(`✓ Travelers: ${trip.traveler_count}`);
  }

  // Build segments summary (from skeleton import)
  const segments = trip.segments || [];
  if (segments.length > 0) {
    // Sort by segment number and build segment details for table display
    const sortedSegments = [...segments].sort((a, b) => (a.segment_number || 0) - (b.segment_number || 0));
    segmentDetails = sortedSegments.map(seg => {
      // Calculate nights from dates
      let nights: number | undefined;
      if (seg.start_date && seg.end_date) {
        const start = parseLocalDate(seg.start_date);
        const end = parseLocalDate(seg.end_date);
        nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        segmentId: seg.id,
        segmentNumber: seg.segment_number,
        segmentName: seg.name || "Unnamed",
        startDate: seg.start_date,
        endDate: seg.end_date,
        nights,
        region: seg.region,
      };
    });

    // Validate segment dates vs flight dates (if available) or trip dates
    // Find earliest segment start and latest segment end
    let earliestSegmentStart: Date | null = null;
    let latestSegmentEnd: Date | null = null;

    for (const seg of segments) {
      if (seg.start_date) {
        const segStart = parseLocalDate(seg.start_date);
        if (!earliestSegmentStart || segStart < earliestSegmentStart) {
          earliestSegmentStart = segStart;
        }
      }
      if (seg.end_date) {
        const segEnd = parseLocalDate(seg.end_date);
        if (!latestSegmentEnd || segEnd > latestSegmentEnd) {
          latestSegmentEnd = segEnd;
        }
      }
    }

    // First segment should start when outbound flight arrives (or on trip start if no flight)
    if (earliestSegmentStart) {
      const segStartStr = formatDateISO(earliestSegmentStart);

      // @ts-ignore - outboundArrivalDate is set above if flights exist
      if (typeof outboundArrivalDate !== 'undefined' && outboundArrivalDate) {
        // Compare with outbound flight arrival (use local date at destination)
        // @ts-ignore
        const arrivalLocal = outboundArrivalDate.toLocaleDateString("en-CA");
        if (segStartStr !== arrivalLocal) {
          warnings.push(`⚠ First segment starts ${formatDateShort(earliestSegmentStart)} but flight arrives ${formatDateShort(arrivalLocal)}`);
        }
      } else if (tripStartDate) {
        // No flight - compare with trip start
        const tripStartStr = formatDateISO(tripStartDate);
        if (segStartStr < tripStartStr) {
          warnings.push(`⚠ First segment starts ${formatDateShort(earliestSegmentStart)} before trip start ${formatDateShort(tripStartDate)}`);
        }
      }
    }

    // Last segment should end when return flight departs (or on trip end if no flight)
    if (latestSegmentEnd) {
      const segEndStr = formatDateISO(latestSegmentEnd);

      // @ts-ignore - returnDepartureDate is set above if flights exist
      if (typeof returnDepartureDate !== 'undefined' && returnDepartureDate) {
        // Compare with return flight departure (use local date at destination)
        // @ts-ignore
        const departLocal = returnDepartureDate.toLocaleDateString("en-CA");
        if (segEndStr !== departLocal) {
          warnings.push(`⚠ Last segment ends ${formatDateShort(latestSegmentEnd)} but return flight departs ${formatDateShort(departLocal)}`);
        }
      } else if (tripEndDate) {
        // No flight - compare with trip end
        const tripEndStr = formatDateISO(tripEndDate);
        if (segEndStr > tripEndStr) {
          warnings.push(`⚠ Last segment ends ${formatDateShort(latestSegmentEnd)} after trip end ${formatDateShort(tripEndDate)}`);
        }
      }
    }
  } else {
    missingItems.push("Import skeleton to create segments");
  }

  // Auto-suggest if core required fields are present AND segments exist
  const shouldSuggest =
    !!trip.start_date &&
    !!trip.end_date &&
    !!trip.destination &&
    !!trip.transportation_type &&
    segments.length > 0;

  return { shouldSuggest, summary, missingItems, warnings, flightDetails, segmentDetails };
}

export interface SegmentAccommodationInfo {
  segmentId: string;
  segmentNumber?: number;
  segmentName: string;
  startDate: string;
  endDate: string;
  hotelName?: string;
  hasAccommodation: boolean;
  isComplete: boolean;  // false for vacation_rentals without a listing URL
  accommodationId?: string;
  missingFields?: string[];
  // Rich detail fields for plan page display
  propertyType?: string;
  address?: string;
  website?: string;
  hasSpecificUrl: boolean;
  googleRating?: number;
  googleReviewCount?: number;
  googlePlaceId?: string;
  bookingReference?: string;  // only set if real (not "Airbnb booking" etc.)
  photoCount: number;
  hasGoogleEnrichment: boolean;
  hasAiEnrichment: boolean;
  // Confirmation document
  confirmationFileUrl?: string;
  confirmationFileName?: string;
  // Amenity data from AI enrichment
  hasPool?: boolean;
  poolType?: string;
  hasKidPool?: boolean;
  hasRestaurant?: boolean;
  hasBar?: boolean;
  kitchenType?: string;
  hasWifi?: boolean;
  hasAC?: boolean;
  hasGym?: boolean;
  hasSpa?: boolean;
  hasParking?: boolean;
  parkingFree?: boolean;
  parkingCost?: number;
  parkingCurrency?: string;
  breakfastIncluded?: boolean;
  breakfastType?: string;
  hasPetFriendly?: boolean;
  hasLaundry?: boolean;
  neighborhood?: string;
}

function computeAccommodationsCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
  segmentDetails?: SegmentAccommodationInfo[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];

  const accommodations = trip.accommodations || [];
  const segments = trip.segments || [];
  const media = trip.media || [];

  if (segments.length === 0) {
    missingItems.push("Create segments first (Step 2)");
    return { shouldSuggest: false, summary, missingItems };
  }

  // Build photos-per-accommodation map + confirmation file map
  const photosByAccommodation = new Map<string, number>();
  const confirmationByAccommodation = new Map<string, { url: string; name: string }>();
  for (const m of media) {
    if (m.parent_type === "accommodation" && m.parent_id) {
      if ((m.media_type as string) === "document") {
        confirmationByAccommodation.set(m.parent_id, {
          url: m.file_url,
          name: m.original_filename || "Confirmation",
        });
      } else {
        photosByAccommodation.set(
          m.parent_id,
          (photosByAccommodation.get(m.parent_id) || 0) + 1
        );
      }
    }
  }

  // Helper: detect if a URL is a specific property listing vs just a generic domain
  function isSpecificUrl(url: string): boolean {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/+$/, "");
      if (path.length <= 1) return false; // just "/"
      const host = u.hostname.replace("www.", "");
      // Booking platforms need a real listing path
      if (host.startsWith("airbnb") && !path.match(/\/rooms\/\d+/)) return false;
      if (host === "vrbo.com" && !path.match(/\/\d+/)) return false;
      if (host === "booking.com" && !path.match(/\/hotel\//)) return false;
      return true;
    } catch {
      return false;
    }
  }

  // Helper: detect if booking reference is generic/placeholder
  function isRealBookingRef(ref: string | undefined): boolean {
    if (!ref) return false;
    const lower = ref.toLowerCase().trim();
    // Generic placeholders like "Airbnb booking", "booking", "TBD", "N/A"
    if (/^(airbnb|booking|vrbo|tbd|n\/?a|pending|none)\b/i.test(lower)) return false;
    if (lower.length < 4) return false;
    return true;
  }

  // Build a map of segment_id -> full accommodation detail
  interface AccDetail {
    id: string;
    name: string;
    missingFields: string[];
    propertyType?: string;
    address?: string;
    website?: string;
    hasSpecificUrl: boolean;
    googleRating?: number;
    googleReviewCount?: number;
    googlePlaceId?: string;
    bookingReference?: string;
    photoCount: number;
    hasGoogleEnrichment: boolean;
    hasAiEnrichment: boolean;
    confirmationFileUrl?: string;
    confirmationFileName?: string;
    // Amenity data
    hasPool?: boolean;
    poolType?: string;
    hasKidPool?: boolean;
    hasRestaurant?: boolean;
    hasBar?: boolean;
    kitchenType?: string;
    hasWifi?: boolean;
    hasAC?: boolean;
    hasGym?: boolean;
    hasSpa?: boolean;
    hasParking?: boolean;
    parkingFree?: boolean;
    parkingCost?: number;
    parkingCurrency?: string;
    breakfastIncluded?: boolean;
    breakfastType?: string;
    hasPetFriendly?: boolean;
    hasLaundry?: boolean;
    neighborhood?: string;
  }
  const accommodationsBySegment = new Map<string, AccDetail>();
  for (const acc of accommodations) {
    if (acc.segment_id) {
      const missing: string[] = [];
      if (!acc.address) missing.push("Address");
      const urlSpecific = acc.website ? isSpecificUrl(acc.website) : false;
      if (!acc.website) {
        missing.push("Listing URL");
      } else if (!urlSpecific) {
        missing.push("Specific listing URL (only has generic domain)");
      }
      if (!acc.enriched_at) missing.push("Not enriched");
      const hasConfirmationFile = confirmationByAccommodation.has(acc.id);
      if (!isRealBookingRef(acc.booking_reference) && !hasConfirmationFile) missing.push("Confirmation #");
      const accPhotos = photosByAccommodation.get(acc.id) || 0;
      if (accPhotos === 0) missing.push("Photos");

      // For vacation_rentals (Airbnb), Google Places finds a random nearby
      // property — not the actual listing — so ALL Google-sourced data is
      // unreliable: rating, address, place_id, and any AI enrichment based
      // on that Google data. Only trust data if we have the actual listing URL.
      const isVacationRental = acc.property_type === "vacation_rental";
      const airbnbWithoutListing = isVacationRental && !urlSpecific;

      // Determine enrichment types present
      // For Airbnbs without a listing URL, Google/AI enrichment is bogus
      const hasGoogle = airbnbWithoutListing ? false : !!(acc.google_place_id || acc.google_rating);
      const hasAi = airbnbWithoutListing ? false : !!(acc.parking || acc.breakfast || acc.amenities_structured || acc.neighborhood);

      // Extract amenity data (only if AI enrichment is trustworthy)
      const am = hasAi ? acc.amenities_structured : undefined;
      const pk = hasAi ? acc.parking : undefined;
      const bf = hasAi ? acc.breakfast : undefined;

      accommodationsBySegment.set(acc.segment_id, {
        id: acc.id,
        name: acc.name || "Hotel",
        missingFields: missing,
        propertyType: acc.property_type,
        address: airbnbWithoutListing ? undefined : acc.address,
        website: acc.website,
        hasSpecificUrl: urlSpecific,
        googleRating: isVacationRental ? undefined : (acc.google_rating ?? undefined),
        googleReviewCount: isVacationRental ? undefined : (acc.google_review_count ?? undefined),
        googlePlaceId: isVacationRental ? undefined : (acc.google_place_id ?? undefined),
        bookingReference: isRealBookingRef(acc.booking_reference) ? acc.booking_reference : undefined,
        photoCount: accPhotos,
        hasGoogleEnrichment: hasGoogle,
        hasAiEnrichment: hasAi,
        confirmationFileUrl: confirmationByAccommodation.get(acc.id)?.url,
        confirmationFileName: confirmationByAccommodation.get(acc.id)?.name,
        hasPool: am?.pool?.exists ?? undefined,
        poolType: am?.pool?.type ?? undefined,
        hasKidPool: am?.pool?.kid_pool ?? undefined,
        hasRestaurant: am?.restaurant_on_site ?? undefined,
        hasBar: am?.bar ?? undefined,
        kitchenType: am?.kitchen?.type ?? undefined,
        hasWifi: am?.wifi ?? undefined,
        hasAC: am?.air_conditioning ?? undefined,
        hasGym: am?.gym ?? undefined,
        hasSpa: am?.spa ?? undefined,
        hasParking: pk?.available ?? undefined,
        parkingFree: pk?.free ?? undefined,
        parkingCost: pk?.cost_per_day ?? undefined,
        parkingCurrency: pk?.currency ?? undefined,
        breakfastIncluded: bf?.included ?? undefined,
        breakfastType: bf?.type ?? undefined,
        hasPetFriendly: am?.pet_friendly ?? undefined,
        hasLaundry: am?.laundry ?? undefined,
        neighborhood: hasAi ? (acc as any).neighborhood : undefined,
      });
    }
  }

  const segmentsNeedingAccommodation = segments.filter(s => {
    // Airport segments or very short segments might not need accommodation
    const isAirportSegment = s.name?.toLowerCase().includes("airport");
    return !isAirportSegment;
  });

  // Sort by segment_number
  const sortedSegments = [...segmentsNeedingAccommodation].sort(
    (a, b) => (a.segment_number || 0) - (b.segment_number || 0)
  );

  // Build detailed segment info for table display
  const segmentDetails: SegmentAccommodationInfo[] = sortedSegments.map(seg => {
    const acc = accommodationsBySegment.get(seg.id);
    return {
      segmentId: seg.id,
      segmentNumber: seg.segment_number,
      segmentName: seg.name || "Unnamed",
      startDate: seg.start_date,
      endDate: seg.end_date,
      hotelName: acc?.name,
      hasAccommodation: !!acc,
      // Vacation rentals without a specific listing URL don't count as complete
      isComplete: acc ? !(acc.propertyType === "vacation_rental" && !acc.hasSpecificUrl) : false,
      accommodationId: acc?.id,
      missingFields: acc?.missingFields,
      propertyType: acc?.propertyType,
      address: acc?.address,
      website: acc?.website,
      hasSpecificUrl: acc?.hasSpecificUrl ?? false,
      googleRating: acc?.googleRating,
      googleReviewCount: acc?.googleReviewCount,
      googlePlaceId: acc?.googlePlaceId,
      bookingReference: acc?.bookingReference,
      photoCount: acc?.photoCount ?? 0,
      hasGoogleEnrichment: acc?.hasGoogleEnrichment ?? false,
      hasAiEnrichment: acc?.hasAiEnrichment ?? false,
      confirmationFileUrl: acc?.confirmationFileUrl,
      confirmationFileName: acc?.confirmationFileName,
      hasPool: acc?.hasPool,
      poolType: acc?.poolType,
      hasKidPool: acc?.hasKidPool,
      hasRestaurant: acc?.hasRestaurant,
      hasBar: acc?.hasBar,
      kitchenType: acc?.kitchenType,
      hasWifi: acc?.hasWifi,
      hasAC: acc?.hasAC,
      hasGym: acc?.hasGym,
      hasSpa: acc?.hasSpa,
      hasParking: acc?.hasParking,
      parkingFree: acc?.parkingFree,
      parkingCost: acc?.parkingCost,
      parkingCurrency: acc?.parkingCurrency,
      breakfastIncluded: acc?.breakfastIncluded,
      breakfastType: acc?.breakfastType,
      hasPetFriendly: acc?.hasPetFriendly,
      hasLaundry: acc?.hasLaundry,
      neighborhood: acc?.neighborhood,
    };
  });

  const totalNeeded = segmentsNeedingAccommodation.length;
  // Use isComplete for counting — vacation_rentals without listing URL don't count
  const totalCovered = segmentDetails.filter(s => s.isComplete).length;

  summary.push(`${totalCovered} of ${totalNeeded} segments have accommodations`);

  // List segments missing accommodations (no record at all or incomplete vacation_rental)
  const missingSegments = segmentDetails.filter(s => !s.isComplete);

  if (missingSegments.length > 0) {
    missingItems.push(`${missingSegments.length} segments need accommodations`);
  }

  // Check for accommodations with missing critical fields
  const incompleteAccommodations = segmentDetails.filter(
    s => s.isComplete && s.missingFields && s.missingFields.length > 0
  );
  if (incompleteAccommodations.length > 0) {
    missingItems.push(
      `${incompleteAccommodations.length} accommodation${incompleteAccommodations.length > 1 ? "s" : ""} missing data (${incompleteAccommodations.map(a => a.segmentName).join(", ")})`
    );
  }

  // Auto-suggest only if all segments are complete AND all are fully enriched
  const allFullyEnriched = segmentDetails.every(
    s => s.isComplete && (!s.missingFields || s.missingFields.length === 0)
  );
  const shouldSuggest = totalNeeded > 0 && totalCovered === totalNeeded && allFullyEnriched;

  return { shouldSuggest, summary, missingItems, segmentDetails };
}

export interface UnenrichedActivity {
  name: string;
  type: string;
  reason: string;
}

export interface DayActivityStatus {
  date: string;      // YYYY-MM-DD
  dayOfMonth: number; // e.g., 15
  hasActivity: boolean;
  // Enrichment status
  enrichmentStatus?: 'not_started' | 'partial' | 'complete';
  enrichedCount?: number;  // Number of activities with enrichment
  totalEnrichable?: number; // Total activities that can be enriched
  unenrichedActivities?: UnenrichedActivity[]; // Activities that need enrichment
  enrichmentErrors?: string[]; // Any enrichment errors for this day
  // Validation status
  validationErrors?: string[]; // Validation issues for this day
  hasValidationErrors?: boolean;
}

export interface SegmentInfo {
  segmentId: string;
  segmentNumber?: number;
  segmentName: string;
  startDate: string;
  endDate: string;
  nights?: number;
  region?: string;
  days?: DayActivityStatus[]; // Activity status for each day in this segment
  researchStatus?: string; // "not_started" | "in_progress" | "completed"
  researchItemCount?: number; // Number of research items for this segment
  hasHotel?: boolean; // Whether segment has accommodation
  hotelName?: string; // Name of the hotel if exists
  enrichmentStats?: SegmentEnrichmentStats; // Per-segment enrichment tracking
}

function computeSegmentsCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
  segmentDetails?: SegmentInfo[];
  dateGaps?: string[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];

  const segments = trip.segments || [];
  const totalTripDays = getTripDays(trip);

  if (segments.length === 0) {
    missingItems.push("Create segments to organize your trip");
    if (totalTripDays > 0) {
      missingItems.push(`${totalTripDays} days need to be covered`);
    }
    return { shouldSuggest: false, summary, missingItems };
  }

  // Sort segments by segment_number
  const sortedSegments = [...segments].sort(
    (a, b) => (a.segment_number || 0) - (b.segment_number || 0)
  );

  // Build a set of dates that have activities
  // Activities can have either a direct 'date' field OR be linked via 'day_id'
  const activities = trip.activities || [];
  const days = trip.days || [];
  const datesWithActivities = new Set<string>();

  for (const activity of activities) {
    if (activity.date) {
      // Activity has direct date field - normalize to YYYY-MM-DD
      const dateStr = activity.date.split('T')[0];
      datesWithActivities.add(dateStr);
    } else if (activity.day_id) {
      // Activity is linked to a day via day_id - look up the day's date
      const day = days.find(d => d.id === activity.day_id);
      if (day?.date) {
        const dateStr = day.date.split('T')[0];
        datesWithActivities.add(dateStr);
      }
    }
  }

  // Build a map of date -> activities for enrichment calculation
  // Exclude backup/alternate activities so they don't inflate day-level enrichment status
  const activitiesByDate = new Map<string, TripActivity[]>();
  for (const activity of activities) {
    if (activity.is_backup) continue;
    let dateStr: string | undefined;
    if (activity.date) {
      dateStr = activity.date.split('T')[0];
    } else if (activity.day_id) {
      const day = days.find(d => d.id === activity.day_id);
      if (day?.date) {
        dateStr = day.date.split('T')[0];
      }
    }
    if (dateStr) {
      const existing = activitiesByDate.get(dateStr) || [];
      existing.push(activity);
      activitiesByDate.set(dateStr, existing);
    }
  }

  // Activity types that can/should be enriched with Google Places data
  const enrichableTypes = new Set([
    'activity', 'dining', 'snack', 'coffee', 'sightseeing', 'attraction',
    'restaurant', 'cafe', 'museum', 'hike', 'beach', 'shopping'
  ]);

  // Meal activity types that should have a location
  const mealTypes = new Set([
    'dining', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'coffee', 'restaurant', 'cafe'
  ]);

  // Non-enrichable activity types (categories, not sub-types)
  const nonEnrichableTypes = new Set(['transport', 'downtime', 'logistics', 'sleep', 'rest', 'custom']);

  // Activities that don't need a location/enrichment (based on name patterns)
  const noLocationNeededPatterns = [
    /wake\s*up/i, /sleep/i, /bed/i, /pack/i, /rest\b/i, /pool\s*(time|and|day)/i,
    /check\s*-?\s*(in|out)/i, /checkout/i, /checkin/i,
    /luggage/i, /nap/i, /relax/i, /free\s*time/i,
    /kids?\s*to\s*bed/i, /early\s*night/i,
    /siesta/i, /settle\s+in/i, /wind\s+down/i,
    /\bfinal\b.*\bmoments?\b/i, /\bflexible\s+(afternoon|morning|evening|day|time)\b/i,
    /^pick\s+up\s+(rental\s+)?car\b/i,
  ];

  // Transit name patterns — activities that are travel TO a destination, not the destination
  const transitNamePatterns = [
    /^uber\b/i, /^taxi\b/i, /^bus\b/i, /^train\b/i, /^tram\b/i,
    /^drive\s+(to|from|back)\b/i,
    /^walk\s+(to|from|back|down\s+to)\b/i,
    /^travel\s+to\b/i, /^head\s+to\b/i, /^ride\s+to\b/i,
    /^transfer\b/i, /^drop[\s-]*off\b/i,
    /^park\s+at\b/i,
    /\b(back\s+to|to\s+the)\s+(hotel|airport|car|station|accommodation)\b/i,
  ];

  // Check if activity name suggests it doesn't need enrichment
  function activityNeedsEnrichment(name: string, type: string): boolean {
    // Non-enrichable activity types
    if (nonEnrichableTypes.has(type)) return false;
    // Not in enrichable types
    if (!enrichableTypes.has(type)) return false;
    const lowerName = name.toLowerCase();
    // Check if name matches any "no location needed" pattern
    for (const pattern of noLocationNeededPatterns) {
      if (pattern.test(lowerName)) {
        return false;
      }
    }
    // Transit name patterns (e.g. "Uber to X", "Walk to X", "Park at X")
    for (const pattern of transitNamePatterns) {
      if (pattern.test(name)) {
        return false;
      }
    }
    // Meals at hotel/accommodation don't need separate enrichment
    if (mealTypes.has(type) && (
      lowerName.includes('at hotel') ||
      lowerName.includes('at accommodation') ||
      lowerName.includes('hotel breakfast') ||
      lowerName.includes('room service')
    )) {
      return false;
    }
    return true;
  }

  // Build accommodation map by segment_id
  const accommodations = trip.accommodations || [];
  const accommodationsBySegment = new Map<string, { name: string }>();
  for (const acc of accommodations) {
    if (acc.segment_id) {
      accommodationsBySegment.set(acc.segment_id, { name: acc.name || "Hotel" });
    }
  }

  // Pre-compute media count per activity for photo stats
  const mediaCountByActivity = new Map<string, number>();
  for (const m of (trip.media || [])) {
    if (m.parent_type === 'activity') {
      mediaCountByActivity.set(m.parent_id, (mediaCountByActivity.get(m.parent_id) || 0) + 1);
    }
  }

  // Pre-compute which google_place_ids have photos (across ANY activity, including backups)
  // This handles cases where multiple activities share a place and photos are linked to just one
  const placeHasPhotos = new Set<string>();
  for (const activity of activities) {
    const placeId = activity.google_place_id;
    if (placeId && (mediaCountByActivity.get(activity.id) || 0) > 0) {
      placeHasPhotos.add(placeId);
    }
  }

  // Build a map of segment_id -> activities for enrichment stats (exclude backups)
  const activitiesBySegment = new Map<string, TripActivity[]>();
  for (const activity of activities) {
    const segId = activity.segment_id;
    if (segId && !activity.is_backup) {
      const list = activitiesBySegment.get(segId) || [];
      list.push(activity);
      activitiesBySegment.set(segId, list);
    }
  }

  // Build detailed segment info for table display
  const segmentDetails: SegmentInfo[] = sortedSegments.map(seg => {
    // Calculate nights from dates
    let nights: number | undefined;
    const segDays: DayActivityStatus[] = [];

    // Check for hotel
    const segAccommodation = accommodationsBySegment.get(seg.id);
    const hasHotel = !!segAccommodation;
    const hotelName = segAccommodation?.name;

    if (seg.start_date && seg.end_date) {
      const start = parseLocalDate(seg.start_date);
      const end = parseLocalDate(seg.end_date);
      nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Build day-by-day activity and enrichment status
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayActivities = activitiesByDate.get(dateStr) || [];

        // Calculate enrichment status for this day
        const enrichableActivities = dayActivities.filter(a =>
          enrichableTypes.has(a.activity_type || '')
        );

        let enrichmentStatus: 'not_started' | 'partial' | 'complete' = 'not_started';
        let enrichedCount = 0;
        const enrichmentErrors: string[] = [];
        const validationErrors: string[] = [];

        const unenrichedActivities: UnenrichedActivity[] = [];

        if (enrichableActivities.length > 0) {
          // Filter to activities that actually need enrichment (exclude "wake up", "kids to bed", etc.)
          const activitiesNeedingEnrichment = enrichableActivities.filter(a =>
            activityNeedsEnrichment(a.name || '', a.activity_type || '')
          );

          for (const activity of activitiesNeedingEnrichment) {
            // An activity is considered enriched if it has google_place_id AND
            // at least one of: google_rating, opening_hours, or actual photos stored
            // Note: Supabase returns null (not undefined) for missing values
            const activityPhotos = mediaCountByActivity.get(activity.id) || 0;
            const placePhotosExist = activity.google_place_id ? placeHasPhotos.has(activity.google_place_id) : false;
            const hasGoogleData = activity.google_place_id && (
              (activity.google_rating !== undefined && activity.google_rating !== null) ||
              (activity.opening_hours !== undefined && activity.opening_hours !== null) ||
              (activity.photos_fetched === true && (activityPhotos > 0 || placePhotosExist))
            );
            if (hasGoogleData) {
              enrichedCount++;
            } else {
              // Track why this activity isn't enriched - this is a research gap
              let reason = 'needs research';
              if (activity.google_place_id) {
                reason = activity.photos_fetched && activityPhotos === 0 && !placePhotosExist
                  ? 'enriched but missing photos'
                  : 'missing Google data';
              }
              unenrichedActivities.push({
                name: activity.name || 'Unnamed',
                type: activity.activity_type || 'unknown',
                reason,
              });
            }
          }

          // Status based on activities that actually need enrichment
          if (activitiesNeedingEnrichment.length === 0) {
            enrichmentStatus = 'complete'; // No activities need enrichment
          } else if (enrichedCount === activitiesNeedingEnrichment.length) {
            enrichmentStatus = 'complete';
          } else if (enrichedCount > 0) {
            enrichmentStatus = 'partial';
          }
        }

        // Validation checks
        // 1. Check if meals have locations
        const mealsWithoutLocation = dayActivities.filter(a =>
          mealTypes.has(a.activity_type || '') &&
          !a.location_name &&
          !a.address &&
          !a.latitude
        );
        if (mealsWithoutLocation.length > 0) {
          validationErrors.push(`${mealsWithoutLocation.length} meal(s) missing location`);
        }

        segDays.push({
          date: dateStr,
          dayOfMonth: currentDate.getDate(),
          hasActivity: datesWithActivities.has(dateStr),
          enrichmentStatus,
          enrichedCount,
          totalEnrichable: enrichableActivities.length,
          unenrichedActivities: unenrichedActivities.length > 0 ? unenrichedActivities : undefined,
          enrichmentErrors: enrichmentErrors.length > 0 ? enrichmentErrors : undefined,
          validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
          hasValidationErrors: validationErrors.length > 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Compute per-segment enrichment stats
    const segActivities = activitiesBySegment.get(seg.id) || [];
    let placesEnriched = 0;
    let placesTotal = 0;
    let placesSkipped = 0;
    let placesWithPhotos = 0;
    let photosActual = 0;
    let mealPhotosActual = 0;
    let mealsNeedReservation = 0;
    let mealsResearched = 0;
    let mealsTotal = 0;
    let genericMealsTotal = 0;
    let mealsWithRestaurant = 0;
    let reviewsAnalyzed = 0;
    let reviewsTotal = 0;
    let detailsEnriched = 0;
    let detailsTotal = 0;

    for (const a of segActivities) {
      const aType = a.activity_type || '';
      const aName = a.name || '';
      if (!activityNeedsEnrichment(aName, aType)) {
        // Count skipped activities that have an enrichable type but are excluded by name/pattern
        if (enrichableTypes.has(aType)) placesSkipped++;
        continue;
      }

      // Details: activities with Google data that should have deep_dive content
      if (enrichableTypes.has(aType) && a.google_place_id) {
        detailsTotal++;
        const dd = (a as any).deep_dive;
        if (dd && typeof dd === 'object' && Object.keys(dd).length > 2) {
          detailsEnriched++;
        }
      }

      // Places: enrichable activities with Google data
      if (enrichableTypes.has(aType)) {
        placesTotal++;
        const activityPhotos = mediaCountByActivity.get(a.id) || 0;
        // Check if this place has photos under ANY activity (handles shared google_place_ids)
        const placePhotosExist = a.google_place_id ? placeHasPhotos.has(a.google_place_id) : false;
        const hasGoogleData = a.google_place_id && (
          (a.google_rating !== undefined && a.google_rating !== null) ||
          (a.opening_hours !== undefined && a.opening_hours !== null) ||
          (a.photos_fetched === true && (activityPhotos > 0 || placePhotosExist))
        );
        if (hasGoogleData) placesEnriched++;
        if (activityPhotos > 0 || placePhotosExist) placesWithPhotos++;
        photosActual += activityPhotos;
      }

      // Meals: non-generic meal names
      if (mealTypes.has(aType)) {
        mealsTotal++;
        if (!isGenericMealName(aName)) mealsResearched++;
      }

      // Meal research stats: ONLY count web_research sourced restaurants
      // All columns (Restaurants, Places, Photos, Dishes) use the same base set
      if (['dining', 'restaurant', 'cafe'].includes(aType)) {
        const isWebResearched = (a as any).restaurant_suggestion_source === 'web_research';
        if (isWebResearched) {
          // Count as researched restaurant
          mealsWithRestaurant++;
          // Count if grounded with Google Places
          if (a.google_place_id) genericMealsTotal++; // reusing as "placesGrounded" for meals
          // Count meal-specific photos
          mealPhotosActual += mediaCountByActivity.get(a.id) || 0;
          // Count reservations needed
          const rdRes = a.restaurant_details as { reservation_tips?: string } | undefined;
          if (rdRes?.reservation_tips && /reserv(ation|e)\s*(required|recommended|needed|ahead)/i.test(rdRes.reservation_tips)) {
            mealsNeedReservation++;
          }
          // Count if has dish recommendations
          reviewsTotal++;
          const rd = a.restaurant_details as { signature_dishes?: unknown[] } | undefined;
          if (rd?.signature_dishes && rd.signature_dishes.length > 0) {
            reviewsAnalyzed++;
          }
        }
      }
    }

    // Photos: count how many enriched places have at least 1 photo
    // (total photo count is photosActual, shown as a simple number)
    const photosExpected = placesEnriched; // denominator = enriched places that SHOULD have photos
    const placesOk = placesTotal === 0 || placesEnriched === placesTotal;
    const photosOk = placesEnriched === 0 || placesWithPhotos >= placesEnriched;
    const mealsOk = mealsTotal === 0 || mealsResearched === mealsTotal;
    const reviewsOk = reviewsTotal === 0 || reviewsAnalyzed === reviewsTotal;

    const detailsOk = detailsTotal === 0 || detailsEnriched >= detailsTotal * 0.8; // 80% threshold

    // Deep enrichment: segment narrative + day narratives
    const hasSegmentNarrative = !!(seg as any).segment_narrative;
    const hasSegmentLocationDetail = !!(seg.city_info && (seg.city_info as any).deep_history);
    const hasSegmentGoogleData = !!(seg.google_place_id || seg.google_rating);
    const segDaysList = days.filter(d => d.segment_id === seg.id);
    const segDaysTotal = segDaysList.length;
    const segDaysWithNarrative = segDaysList.filter(d => !!(d as any).day_narrative).length;

    const enrichmentStats: SegmentEnrichmentStats = {
      placesEnriched, placesTotal, placesSkipped, placesWithPhotos,
      photosActual, photosExpected,
      mealPhotosActual, mealsNeedReservation,
      mealsResearched, mealsTotal,
      genericMealsTotal, mealsWithRestaurant,
      reviewsAnalyzed, reviewsTotal,
      detailsEnriched, detailsTotal,
      hasSegmentNarrative,
      hasSegmentLocationDetail,
      daysWithNarrative: segDaysWithNarrative,
      daysTotal: segDaysTotal,
      hasSegmentGoogleData,
      isFullyEnriched: placesOk && photosOk && mealsOk && reviewsOk && detailsOk,
    };

    return {
      segmentId: seg.id,
      segmentNumber: seg.segment_number,
      segmentName: seg.name || "Unnamed",
      startDate: seg.start_date,
      endDate: seg.end_date,
      nights,
      region: seg.region,
      days: segDays,
      researchStatus: seg.research_status,
      hasHotel,
      hotelName,
      enrichmentStats,
    };
  });

  summary.push(`${segments.length} segment${segments.length !== 1 ? "s" : ""} created`);

  // Check date coverage
  const dateGaps: string[] = [];
  if (trip.start_date && trip.end_date) {
    const tripStart = parseLocalDate(trip.start_date);
    const tripEnd = parseLocalDate(trip.end_date);

    // Determine the coverage period based on flights (if available)
    // Segments should cover from outbound arrival to return departure
    const flights = trip.flights || [];
    const outboundFlight = flights.find(f => f.direction === "outbound");
    const returnFlight = flights.find(f => f.direction === "return");

    // Get the coverage start date: outbound arrival or trip start
    let coverageStartDate = tripStart;
    if (outboundFlight?.arrival_datetime) {
      // Use the local date at destination when outbound flight arrives
      const arrivalDate = new Date(outboundFlight.arrival_datetime);
      const arrivalLocal = arrivalDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
      coverageStartDate = parseLocalDate(arrivalLocal);
    }

    // Get the coverage end date: return departure or trip end
    let coverageEndDate = tripEnd;
    if (returnFlight?.departure_datetime) {
      // Use the local date at destination when return flight departs
      const departDate = new Date(returnFlight.departure_datetime);
      const departLocal = departDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
      coverageEndDate = parseLocalDate(departLocal);
    }

    // Sort segments by start date for gap checking
    const dateOrderedSegments = [...segments].sort((a, b) =>
      parseLocalDate(a.start_date).getTime() - parseLocalDate(b.start_date).getTime()
    );

    // Check for coverage gaps (using flight-based or trip-based dates)
    let currentCoveredDate = coverageStartDate;

    for (const segment of dateOrderedSegments) {
      const segStart = parseLocalDate(segment.start_date);
      const segEnd = parseLocalDate(segment.end_date);

      // Check if there's a gap before this segment
      if (segStart > currentCoveredDate) {
        const gapDays = Math.ceil((segStart.getTime() - currentCoveredDate.getTime()) / (1000 * 60 * 60 * 24));
        if (gapDays > 0) {
          dateGaps.push(`${formatDateShort(currentCoveredDate)} - ${formatDateShort(segStart)} (${gapDays} days)`);
        }
      }

      // Update covered date (use >= because if segment ends on the same day as currentCoveredDate, it covers that day)
      if (segEnd >= currentCoveredDate) {
        currentCoveredDate = new Date(segEnd);
        currentCoveredDate.setDate(currentCoveredDate.getDate() + 1); // Next day after segment ends
      }
    }

    // Check for gap at the end (against coverage end date, not trip end)
    if (currentCoveredDate <= coverageEndDate) {
      const gapDays = Math.ceil((coverageEndDate.getTime() - currentCoveredDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (gapDays > 0) {
        dateGaps.push(`${formatDateShort(currentCoveredDate)} - ${formatDateShort(coverageEndDate)} (${gapDays} days)`);
      }
    }

    // Calculate total covered days and expected coverage days
    let coveredDays = 0;
    for (const segment of segments) {
      const segStart = parseLocalDate(segment.start_date);
      const segEnd = parseLocalDate(segment.end_date);
      coveredDays += Math.ceil((segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Calculate expected coverage days (from flight arrival to flight departure)
    const expectedCoverageDays = Math.ceil((coverageEndDate.getTime() - coverageStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (dateGaps.length === 0) {
      summary.push(`Full date coverage: ${formatDateShort(coverageStartDate)} - ${formatDateShort(coverageEndDate)}`);
    } else {
      summary.push(`${coveredDays} of ${expectedCoverageDays} days covered (${formatDateShort(coverageStartDate)} - ${formatDateShort(coverageEndDate)})`);
      // Note: dateGaps are displayed separately in UI, don't add to missingItems
    }

    // Auto-suggest if no gaps
    const shouldSuggest = dateGaps.length === 0;
    return { shouldSuggest, summary, missingItems, segmentDetails, dateGaps };
  }

  // If no trip dates, just check segments exist
  const shouldSuggest = segments.length > 0;
  return { shouldSuggest, summary, missingItems, segmentDetails };
}

// Generic meal names that indicate research is needed
const genericMealPatterns = [
  /^breakfast$/i, /^lunch$/i, /^dinner$/i,
  /^early breakfast$/i, /^quick breakfast$/i, /^light lunch$/i, /^easy dinner$/i,
  /^hotel breakfast$/i, /^breakfast at hotel$/i, /^breakfast at accommodation$/i,
  /breakfast \(.*\)$/i, /lunch \(.*\)$/i, /dinner \(.*\)$/i,
  /^meal$/i, /^snack$/i, /^coffee$/i,
];

function isGenericMealName(name: string): boolean {
  const lowerName = name.toLowerCase().trim();
  // Check if it matches any generic pattern
  for (const pattern of genericMealPatterns) {
    if (pattern.test(name)) {
      return true;
    }
  }
  // Also check for very short generic names
  if (['breakfast', 'lunch', 'dinner', 'meal', 'snack'].includes(lowerName)) {
    return true;
  }
  return false;
}

export interface MealInfo {
  date: string;
  name: string;
  type: string;
  needsResearch: boolean;
  activityId: string;
}

function computeMealsCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
  mealDetails?: MealInfo[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];
  const mealDetails: MealInfo[] = [];

  const activities = trip.activities || [];
  const days = trip.days || [];

  // Meal activity types
  const mealTypes = new Set([
    'restaurant', 'dining', 'meal', 'breakfast', 'lunch', 'dinner',
    'snack', 'coffee', 'cafe'
  ]);

  // Find all meal activities
  const mealActivities = activities.filter(a =>
    mealTypes.has(a.activity_type || '') ||
    // Also check name patterns for activities that might be meals
    /breakfast|lunch|dinner|meal|snack/i.test(a.name || '')
  );

  let researchedCount = 0;
  let needsResearchCount = 0;

  for (const meal of mealActivities) {
    const needsResearch = isGenericMealName(meal.name || '');

    // Get date from activity or its day
    let date = meal.date || '';
    if (!date && meal.day_id) {
      const day = days.find(d => d.id === meal.day_id);
      if (day) date = day.date;
    }

    mealDetails.push({
      date,
      name: meal.name || 'Unnamed',
      type: meal.activity_type || 'unknown',
      needsResearch,
      activityId: meal.id,
    });

    if (needsResearch) {
      needsResearchCount++;
    } else {
      researchedCount++;
    }
  }

  const totalMeals = mealActivities.length;
  if (totalMeals > 0) {
    summary.push(`${totalMeals} meals planned`);
    summary.push(`${researchedCount} researched, ${needsResearchCount} need research`);
  } else {
    missingItems.push('No meals found in activities');
  }

  if (needsResearchCount > 0) {
    missingItems.push(`${needsResearchCount} meal${needsResearchCount !== 1 ? 's' : ''} need restaurant research`);
  }

  // Suggest completion only if all meals are researched
  const shouldSuggest = totalMeals > 0 && needsResearchCount === 0;

  return { shouldSuggest, summary, missingItems, mealDetails };
}

function computeActivitiesCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];
  const segments = trip.segments || [];
  const activities = trip.activities || [];

  if (segments.length === 0) {
    missingItems.push("Create segments first (Step 2)");
    return { shouldSuggest: false, summary, missingItems };
  }

  // Count activities per segment
  const activitiesBySegment = new Map<string, number>();
  const withPlaceIdBySegment = new Map<string, number>();
  for (const a of activities) {
    if (a.is_backup) continue;
    const segId = (a as any).segment_id;
    if (!segId) continue;
    activitiesBySegment.set(segId, (activitiesBySegment.get(segId) || 0) + 1);
    if (a.google_place_id) {
      withPlaceIdBySegment.set(segId, (withPlaceIdBySegment.get(segId) || 0) + 1);
    }
  }

  let allHaveActivities = true;
  for (const seg of segments) {
    const count = activitiesBySegment.get(seg.id) || 0;
    const withPlace = withPlaceIdBySegment.get(seg.id) || 0;
    if (count === 0) {
      allHaveActivities = false;
      missingItems.push(`${seg.name}: No activities imported`);
    }
  }

  const totalActivities = activities.filter(a => !a.is_backup).length;
  const totalWithPlace = activities.filter(a => !a.is_backup && a.google_place_id).length;

  if (totalActivities > 0) {
    summary.push(`${totalActivities} activities across ${segments.length} segments`);
    summary.push(`${totalWithPlace} with Google Place IDs`);
  }

  return { shouldSuggest: allHaveActivities && totalActivities > 0, summary, missingItems };
}

function computeEnrichmentCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];
  const activities = trip.activities || [];
  const segments = trip.segments || [];
  const days = trip.days || [];

  // Activity deep_dive coverage
  const skipTypes = new Set(['transport', 'logistics', 'downtime']);
  const enrichable = activities.filter(a =>
    !skipTypes.has(a.activity_type || '') && a.google_place_id && !a.is_backup
  );
  const withDeepDive = enrichable.filter(a => {
    const dd = (a as any).deep_dive;
    return dd && typeof dd === 'object' && Object.keys(dd).length > 2;
  });
  const detailsPct = enrichable.length > 0 ? Math.round(100 * withDeepDive.length / enrichable.length) : 100;
  summary.push(`Activity details: ${withDeepDive.length}/${enrichable.length} (${detailsPct}%)`);
  if (detailsPct < 80) missingItems.push(`${enrichable.length - withDeepDive.length} activities need deep content`);

  // Restaurant review coverage
  const restaurants = activities.filter(a =>
    a.activity_type === 'restaurant' || ['breakfast', 'lunch', 'dinner', 'snack', 'coffee'].includes((a as any).activity_sub_type || '')
  );
  const withDishes = restaurants.filter(a => {
    const rd = a.restaurant_details as any;
    return rd?.signature_dishes?.length > 0;
  });
  if (restaurants.length > 0) {
    summary.push(`Restaurant reviews: ${withDishes.length}/${restaurants.length}`);
    if (withDishes.length < restaurants.length) {
      missingItems.push(`${restaurants.length - withDishes.length} restaurants need review analysis`);
    }
  }

  // Trip overview
  const hasOverview = !!(trip as any).deep_overview;
  summary.push(`Trip overview: ${hasOverview ? '✓' : 'Not generated'}`);
  if (!hasOverview) missingItems.push('Trip deep overview not generated');

  // Segment narratives
  const segWithNarrative = segments.filter(s => !!(s as any).segment_narrative).length;
  summary.push(`Segment narratives: ${segWithNarrative}/${segments.length}`);
  if (segWithNarrative < segments.length) missingItems.push(`${segments.length - segWithNarrative} segments need narrative`);

  // Day narratives
  const daysWithNarrative = days.filter(d => !!(d as any).day_narrative).length;
  summary.push(`Day narratives: ${daysWithNarrative}/${days.length}`);
  if (daysWithNarrative < days.length) missingItems.push(`${days.length - daysWithNarrative} days need narrative`);

  const shouldSuggest = detailsPct >= 80 && hasOverview && segWithNarrative >= segments.length && daysWithNarrative >= days.length * 0.8;
  return { shouldSuggest, summary, missingItems };
}

function computeDaysActivitiesCompletion(trip: TripFullData): {
  shouldSuggest: boolean;
  summary: string[];
  missingItems: string[];
} {
  const summary: string[] = [];
  const missingItems: string[] = [];

  const days = trip.days || [];
  const activities = trip.activities || [];
  const totalTripDays = getTripDays(trip);

  // Count unique days that have entries
  const daysWithEntries = new Set(days.map(d => d.date));
  const daysWithActivities = new Set<string>();

  for (const activity of activities) {
    if (activity.date) {
      daysWithActivities.add(activity.date);
    } else if (activity.day_id) {
      const day = days.find(d => d.id === activity.day_id);
      if (day) {
        daysWithActivities.add(day.date);
      }
    }
  }

  if (totalTripDays > 0) {
    summary.push(`${daysWithEntries.size} of ${totalTripDays} days have itinerary`);

    if (activities.length > 0) {
      summary.push(`${activities.length} activit${activities.length !== 1 ? "ies" : "y"} planned`);
      summary.push(`${daysWithActivities.size} days have activities`);
    }

    const missingDaysCount = totalTripDays - daysWithEntries.size;
    if (missingDaysCount > 0) {
      missingItems.push(`${missingDaysCount} day${missingDaysCount !== 1 ? "s" : ""} need itinerary`);
    }

    const daysWithoutActivities = daysWithEntries.size - daysWithActivities.size;
    if (daysWithoutActivities > 0) {
      missingItems.push(`${daysWithoutActivities} day${daysWithoutActivities !== 1 ? "s" : ""} have no activities`);
    }

    if (activities.length === 0) {
      missingItems.push("No activities planned yet");
    }
  } else {
    if (days.length > 0) {
      summary.push(`${days.length} day${days.length !== 1 ? "s" : ""} planned`);
    } else {
      missingItems.push("Day entries needed");
    }

    if (activities.length > 0) {
      summary.push(`${activities.length} activit${activities.length !== 1 ? "ies" : "y"} scheduled`);
    } else {
      missingItems.push("Activities needed");
    }
  }

  // Auto-suggest if at least half the days have activities
  const coverageThreshold = totalTripDays > 0 ? totalTripDays * 0.5 : 1;
  const shouldSuggest = daysWithActivities.size >= coverageThreshold && activities.length > 0;

  return { shouldSuggest, summary, missingItems };
}

/**
 * Get the full completion status for a step, combining stored progress with computed status
 */
export function getStepCompletionStatus(
  stepId: PlanningStepId,
  trip: TripFullData,
  storedProgress?: TripPlanningProgress
): StepCompletionStatus {
  const computed = computeStepAutoSuggestion(stepId, trip);
  const stored = storedProgress?.[stepId] || {
    auto_suggested: false,
    completed: false,
  };

  return {
    auto_suggested: computed.shouldSuggest,
    completed: stored.completed,
    completed_at: stored.completed_at,
    summary: computed.summary,
    missingItems: computed.missingItems,
    warnings: computed.warnings,
    segmentDetails: computed.segmentDetails,
    accommodationDetails: computed.accommodationDetails,
    dateGaps: computed.dateGaps,
    flightDetails: computed.flightDetails,
  };
}

/**
 * Get the current step index (0-based) for the trip
 * Returns the first incomplete step, or the last step if all are complete
 */
export function getCurrentStepIndex(
  trip: TripFullData,
  storedProgress?: TripPlanningProgress
): number {
  for (let i = 0; i < PLANNING_STEPS.length; i++) {
    const status = getStepCompletionStatus(
      PLANNING_STEPS[i].id,
      trip,
      storedProgress
    );
    if (!status.completed) {
      return i;
    }
  }
  return PLANNING_STEPS.length - 1;
}

/**
 * Get the default planning progress object
 */
export function getDefaultPlanningProgress(): TripPlanningProgress {
  return {
    basics: { auto_suggested: false, completed: false },
    segments: { auto_suggested: false, completed: false },
    accommodations: { auto_suggested: false, completed: false },
    activities: { auto_suggested: false, completed: false },
    meals: { auto_suggested: false, completed: false },
    enrichment: { auto_suggested: false, completed: false },
    schedule: { auto_suggested: false, completed: false },
  };
}

/** Migrate old 5-key planning progress to new 7-key format */
export function migratePlanningProgress(stored: Record<string, any>): TripPlanningProgress {
  const defaults = getDefaultPlanningProgress();
  const result = { ...defaults };
  // Copy over any existing step progress
  for (const key of Object.keys(defaults) as PlanningStepId[]) {
    if (stored[key]) {
      result[key] = stored[key];
    }
  }
  // Map old days_activities → schedule if schedule not set
  if (stored.days_activities?.completed && !stored.schedule?.completed) {
    result.schedule = stored.days_activities;
  }
  return result;
}

// Helper functions
function formatDate(dateStr: string): string {
  try {
    // Parse date string as local date to avoid timezone shift
    // "2026-06-14" should display as Jun 14, not Jun 13
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(date: Date | string): string {
  // If string, parse as local date to avoid timezone shift
  if (typeof date === "string") {
    // Handle YYYY-MM-DD format
    if (date.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = date.split("T")[0].split("-").map(Number);
      date = new Date(year, month - 1, day);
    } else {
      // Already formatted or other format, return as is
      return date;
    }
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) for comparison
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTransportType(type: string): string {
  switch (type) {
    case "flying":
      return "Flying";
    case "driving":
      return "Driving";
    case "both":
      return "Flying + Driving";
    default:
      return type;
  }
}
