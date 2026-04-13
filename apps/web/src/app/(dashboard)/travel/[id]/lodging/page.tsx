"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTripFull,
  formatTripDate,
  API_URL,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Hotel,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  MapPin,
  Layers,
  CalendarDays,
  Star,
  Clock,
  Phone,
  Globe,
  Image as ImageIcon,
  AlertTriangle,
  Sparkles,
  Camera,
  Loader2,
  Car,
  Coffee,
  Waves,
  Dumbbell,
  Wifi,
  Wind,
  UtensilsCrossed,
  Wine,
  Landmark,
  ShieldCheck,
  Zap,
  PawPrint,
  Building2,
  Ticket,
  CookingPot,
  ArrowUpDown,
  BellRing,
  Plane,
} from "lucide-react";
import { toast } from "sonner";
import type {
  TripMedia,
  TripAccommodation,
  AccommodationAmenities,
} from "@singularity/shared-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMissingFields(
  accommodation: TripAccommodation,
  photos: TripMedia[]
): string[] {
  const missing: string[] = [];
  if (!accommodation.website) missing.push("URL");
  if (!accommodation.booking_reference) missing.push("Confirmation #");
  if (!accommodation.parking) missing.push("Parking info");
  if (!accommodation.breakfast) missing.push("Breakfast info");
  if (photos.length === 0) missing.push("Photos");
  if (!accommodation.enriched_at) missing.push("Not enriched");
  return missing;
}

function formatParking(parking: TripAccommodation["parking"]): string {
  if (!parking) return "";
  if (!parking.available) return "No parking available";
  const parts: string[] = [];
  if (parking.free) {
    parts.push("Free");
  } else if (parking.cost_per_day != null) {
    const cur = parking.currency || "$";
    parts.push(`${cur}${parking.cost_per_day}/day`);
  }
  if (parking.type) {
    const typeLabels: Record<string, string> = {
      on_site: "on-site",
      street: "street",
      garage: "garage",
      valet: "valet",
      none: "",
    };
    const label = typeLabels[parking.type] || parking.type;
    if (label) parts.push(label);
  }
  if (parking.notes) parts.push(`(${parking.notes})`);
  return parts.length > 0 ? parts.join(" ") + " parking" : "Parking available";
}

function formatBreakfast(breakfast: TripAccommodation["breakfast"]): string {
  if (!breakfast) return "";
  if (!breakfast.included) {
    if (breakfast.cost_per_person != null) {
      const cur = breakfast.currency || "$";
      return `Not included (${cur}${breakfast.cost_per_person}/person)`;
    }
    return "Not included";
  }
  const parts: string[] = ["Included"];
  if (breakfast.type && breakfast.type !== "none") {
    parts.push(`(${breakfast.type}`);
    if (breakfast.hours) {
      parts[parts.length - 1] += `, ${breakfast.hours})`;
    } else {
      parts[parts.length - 1] += ")";
    }
  } else if (breakfast.hours) {
    parts.push(`(${breakfast.hours})`);
  }
  return parts.join(" ");
}

function getPoolLabel(
  pool: NonNullable<AccommodationAmenities["pool"]>
): string {
  if (!pool.exists) return "";
  const parts: string[] = [];
  if (pool.type) {
    parts.push(pool.type.charAt(0).toUpperCase() + pool.type.slice(1));
  }
  parts.push("pool");
  const extras: string[] = [];
  if (pool.kid_pool) extras.push("kids pool");
  if (pool.heated) extras.push("heated");
  if (pool.adults_only) extras.push("adults only");
  if (extras.length > 0) {
    return parts.join(" ") + ` (${extras.join(", ")})`;
  }
  return parts.join(" ");
}

function renderStars(rating: number, max = 5) {
  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= max; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i <= rating
            ? "text-amber-500 fill-amber-500"
            : "text-muted-foreground/30"
        }`}
      />
    );
  }
  return stars;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MissingFieldBadges({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {fields.map((field) => (
        <Badge
          key={field}
          variant="outline"
          className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-700 gap-1"
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          Missing: {field}
        </Badge>
      ))}
    </div>
  );
}

function AmenityChip({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function StructuredAmenities({
  amenities,
}: {
  amenities: AccommodationAmenities;
}) {
  const chips: { icon: React.ElementType; label: string }[] = [];

  if (amenities.pool?.exists) {
    chips.push({ icon: Waves, label: getPoolLabel(amenities.pool) });
  }
  if (amenities.gym) chips.push({ icon: Dumbbell, label: "Gym" });
  if (amenities.spa) chips.push({ icon: Sparkles, label: "Spa" });
  if (amenities.restaurant_on_site)
    chips.push({ icon: UtensilsCrossed, label: "Restaurant" });
  if (amenities.bar) chips.push({ icon: Wine, label: "Bar" });
  if (amenities.kitchen) {
    const kitchenLabel =
      amenities.kitchen.type === "full"
        ? "Full kitchen"
        : amenities.kitchen.type === "kitchenette"
        ? "Kitchenette"
        : "Kitchen";
    chips.push({ icon: CookingPot, label: kitchenLabel });
  }
  if (amenities.wifi) chips.push({ icon: Wifi, label: "WiFi" });
  if (amenities.air_conditioning) chips.push({ icon: Wind, label: "A/C" });
  if (amenities.elevator) chips.push({ icon: ArrowUpDown, label: "Elevator" });
  if (amenities.concierge) chips.push({ icon: BellRing, label: "Concierge" });
  if (amenities.room_service)
    chips.push({ icon: UtensilsCrossed, label: "Room service" });
  if (amenities.airport_shuttle)
    chips.push({ icon: Plane, label: "Airport shuttle" });
  if (amenities.laundry) chips.push({ icon: Building2, label: "Laundry" });
  if (amenities.ev_charging) chips.push({ icon: Zap, label: "EV charging" });
  if (amenities.pet_friendly)
    chips.push({ icon: PawPrint, label: "Pet friendly" });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <AmenityChip key={c.label} icon={c.icon} label={c.label} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TripLodgingPage() {
  const params = useParams();
  const tripId = params.id as string;
  const queryClient = useQueryClient();

  const { data: trip } = useTripFull(tripId);

  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [enrichAllProgress, setEnrichAllProgress] = useState("");
  const [fetchingPhotoIds, setFetchingPhotoIds] = useState<Set<string>>(
    new Set()
  );

  const segmentMap = useMemo(() => {
    if (!trip?.segments) return new Map<string, string>();
    return new Map(trip.segments.map((s) => [s.id, s.name]));
  }, [trip?.segments]);

  // Group media by accommodation
  const mediaByAccommodation = useMemo(() => {
    if (!trip?.media) return {} as Record<string, TripMedia[]>;
    const grouped: Record<string, TripMedia[]> = {};
    for (const m of trip.media) {
      if (m.parent_type !== "accommodation") continue;
      const id = m.parent_id;
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push(m);
    }
    return grouped;
  }, [trip?.media]);

  const getDaysForAccommodation = (checkIn: string, checkOut: string) => {
    if (!trip?.days) return [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    return trip.days
      .filter((day) => {
        const dayDate = new Date(day.date);
        return dayDate >= checkInDate && dayDate < checkOutDate;
      })
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  };

  // ------ API actions ------

  const handleEnrich = async (accommodationId: string) => {
    setEnrichingIds((prev) => new Set(prev).add(accommodationId));
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}/enrich-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to enrich accommodation");
      }

      await queryClient.invalidateQueries({
        queryKey: ["travel", "trips", tripId, "full"],
      });
      toast.success("Accommodation enriched successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enrichment failed"
      );
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(accommodationId);
        return next;
      });
    }
  };

  const handleFetchPhotos = async (accommodationId: string) => {
    setFetchingPhotoIds((prev) => new Set(prev).add(accommodationId));
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${API_URL}/travel/trips/${tripId}/accommodations/${accommodationId}/fetch-google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch photos");
      }

      await queryClient.invalidateQueries({
        queryKey: ["travel", "trips", tripId, "full"],
      });
      toast.success("Photos fetched successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Photo fetch failed"
      );
    } finally {
      setFetchingPhotoIds((prev) => {
        const next = new Set(prev);
        next.delete(accommodationId);
        return next;
      });
    }
  };

  // Determine if an accommodation has enough info to enrich (name + address, or a real website)
  const isEnrichable = (acc: TripAccommodation) => {
    // Always enrichable if it has a name — the AI can search for it
    if (acc.name && acc.name.length > 3) return true;
    return false;
  };

  // Skip Airbnb generic "trips" links — they're not real property URLs
  const hasRealUrl = (acc: TripAccommodation) => {
    if (!acc.website) return false;
    // Generic Airbnb trip dashboard isn't useful for enrichment
    if (/airbnb\.com\/trips/i.test(acc.website)) return false;
    return true;
  };

  const handleEnrichAll = async () => {
    if (!trip?.accommodations) return;
    setEnrichingAll(true);

    const supabaseClient = createClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    };

    // Sort: unenriched first, then those with missing fields
    const toEnrich = trip.accommodations.filter((acc) => {
      // Must have enough info to search
      if (!isEnrichable(acc)) return false;
      // Skip if it's a generic Airbnb without a real listing URL and no address
      if (!hasRealUrl(acc) && !acc.address && !acc.google_place_id) return false;
      return true;
    });

    let enriched = 0;
    let skipped = 0;
    let failed = 0;

    for (const acc of toEnrich) {
      setEnrichAllProgress(`Enriching ${enriched + 1}/${toEnrich.length}: ${acc.name}`);
      setEnrichingIds((prev) => new Set(prev).add(acc.id));

      try {
        const resp = await fetch(
          `${API_URL}/travel/trips/${tripId}/accommodations/${acc.id}/enrich-ai`,
          { method: "POST", headers },
        );
        if (resp.ok) {
          enriched++;
        } else {
          const err = await resp.json().catch(() => ({}));
          console.warn(`Enrich failed for ${acc.name}:`, err);
          failed++;
        }
      } catch (e) {
        console.error(`Enrich error for ${acc.name}:`, e);
        failed++;
      } finally {
        setEnrichingIds((prev) => {
          const next = new Set(prev);
          next.delete(acc.id);
          return next;
        });
      }

      // Brief delay between calls to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    skipped = trip.accommodations.length - toEnrich.length;

    await queryClient.invalidateQueries({
      queryKey: ["travel", "trips", tripId, "full"],
    });

    setEnrichAllProgress("");
    setEnrichingAll(false);

    const parts: string[] = [];
    if (enriched > 0) parts.push(`${enriched} enriched`);
    if (skipped > 0) parts.push(`${skipped} skipped (no info)`);
    if (failed > 0) parts.push(`${failed} failed`);
    toast.success(parts.join(", "));
  };

  // ------ Derived stats ------

  const totalMissingFields = useMemo(() => {
    if (!trip?.accommodations) return 0;
    return trip.accommodations.reduce((sum, acc) => {
      const photos = mediaByAccommodation[acc.id] || [];
      return sum + getMissingFields(acc, photos).length;
    }, 0);
  }, [trip?.accommodations, mediaByAccommodation]);

  if (!trip) return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Accommodations</h2>
          <p className="text-sm text-muted-foreground">
            Hotels, rentals, and places to stay
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trip.accommodations && trip.accommodations.length > 0 && (
            <Button
              variant="default"
              disabled={enrichingAll}
              onClick={handleEnrichAll}
              data-testid="enrich-all-button"
            >
              {enrichingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {enrichingAll ? "Enriching..." : "Enrich All"}
            </Button>
          )}
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Accommodation
          </Button>
        </div>
      </div>

      {/* Enrich All progress bar */}
      {enrichingAll && enrichAllProgress && (
        <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          {enrichAllProgress}
        </div>
      )}

      {trip.accommodations && trip.accommodations.length > 0 ? (
        <div className="grid gap-4">
          {trip.accommodations.map((accommodation) => {
            const segmentName = accommodation.segment_id
              ? segmentMap.get(accommodation.segment_id)
              : null;
            const coveredDays = getDaysForAccommodation(
              accommodation.check_in_date,
              accommodation.check_out_date
            );
            const photos = mediaByAccommodation[accommodation.id] || [];
            const displayPhotos = photos.slice(0, 4);
            const extraCount = photos.length - 4;
            const missingFields = getMissingFields(accommodation, photos);
            const isEnriching = enrichingIds.has(accommodation.id);
            const isFetchingPhotos = fetchingPhotoIds.has(accommodation.id);

            return (
              <Card key={accommodation.id} className="overflow-hidden">
                <div className="flex">
                  {/* Photo gallery column */}
                  {photos.length > 0 ? (
                    <div className="w-64 shrink-0 bg-muted">
                      {displayPhotos.length === 1 ? (
                        <div className="relative h-full min-h-[180px]">
                          <img
                            src={displayPhotos[0].file_url}
                            alt={accommodation.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-0.5 h-full min-h-[180px]">
                          {displayPhotos.map((photo, i) => (
                            <div
                              key={photo.id}
                              className={`relative overflow-hidden ${
                                displayPhotos.length === 2
                                  ? "row-span-1"
                                  : displayPhotos.length === 3 && i === 0
                                  ? "row-span-2"
                                  : ""
                              }`}
                            >
                              <img
                                src={photo.file_url}
                                alt={accommodation.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {i === displayPhotos.length - 1 &&
                                extraCount > 0 && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      +{extraCount} more
                                    </span>
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-48 shrink-0 bg-muted/50 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Details column */}
                  <CardContent className="flex-1 p-4 space-y-3">
                    {/* ---- A. Header area ---- */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base">
                            {accommodation.name}
                          </h3>
                          {accommodation.property_type && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              {accommodation.property_type}
                            </Badge>
                          )}
                          {segmentName && (
                            <Badge
                              variant="outline"
                              className="font-normal text-xs"
                            >
                              <Layers className="h-3 w-3 mr-1" />
                              {segmentName}
                            </Badge>
                          )}
                        </div>

                        {/* Star rating */}
                        {accommodation.star_rating != null &&
                          accommodation.star_rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              {renderStars(accommodation.star_rating)}
                            </div>
                          )}

                        {/* Google rating + review count */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {accommodation.google_rating != null && (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              {accommodation.google_rating}
                              {accommodation.google_review_count != null && (
                                <span className="text-muted-foreground text-xs">
                                  ({accommodation.google_review_count.toLocaleString()}{" "}
                                  reviews)
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {accommodation.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[400px]">
                              {accommodation.address}
                            </span>
                          </div>
                        )}

                        {/* Website link (prominent) */}
                        {accommodation.website && (
                          <a
                            href={accommodation.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                            {(() => {
                              try {
                                return new URL(accommodation.website).hostname;
                              } catch {
                                return "Website";
                              }
                            })()}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {/* Dropdown menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {accommodation.website && (
                            <DropdownMenuItem asChild>
                              <a
                                href={accommodation.website}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* ---- B. Missing field warnings ---- */}
                    <MissingFieldBadges fields={missingFields} />

                    {/* ---- Date & stay info ---- */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatTripDate(accommodation.check_in_date)} —{" "}
                        {formatTripDate(accommodation.check_out_date)}
                      </span>
                      {accommodation.nights != null && (
                        <span>
                          {accommodation.nights} night
                          {accommodation.nights !== 1 ? "s" : ""}
                        </span>
                      )}
                      {coveredDays.length > 0 && (
                        <span>
                          Day{coveredDays.length > 1 ? "s" : ""}{" "}
                          {coveredDays[0].day_number || 1}
                          {coveredDays.length > 1
                            ? `-${
                                coveredDays[coveredDays.length - 1]
                                  .day_number || coveredDays.length
                              }`
                            : ""}
                        </span>
                      )}
                    </div>

                    {/* Check-in/out times & phone */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {accommodation.check_in_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          In: {accommodation.check_in_time}
                        </span>
                      )}
                      {accommodation.check_out_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Out: {accommodation.check_out_time}
                        </span>
                      )}
                      {accommodation.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {accommodation.phone}
                        </span>
                      )}
                    </div>

                    {/* ---- C. Parking & Breakfast ---- */}
                    {(accommodation.parking || accommodation.breakfast) && (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                        {accommodation.parking && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Car className="h-3.5 w-3.5" />
                            {formatParking(accommodation.parking)}
                          </span>
                        )}
                        {accommodation.breakfast && (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Coffee className="h-3.5 w-3.5" />
                            {formatBreakfast(accommodation.breakfast)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ---- D. Structured amenities ---- */}
                    {accommodation.amenities_structured && (
                      <StructuredAmenities
                        amenities={accommodation.amenities_structured}
                      />
                    )}

                    {/* Fallback: legacy string amenities */}
                    {!accommodation.amenities_structured &&
                      accommodation.amenities &&
                      accommodation.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {accommodation.amenities.slice(0, 8).map((a) => (
                            <span
                              key={a}
                              className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                            >
                              {a}
                            </span>
                          ))}
                          {accommodation.amenities.length > 8 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{accommodation.amenities.length - 8} more
                            </span>
                          )}
                        </div>
                      )}

                    {/* ---- E. Location context ---- */}
                    {(accommodation.neighborhood ||
                      (accommodation.nearby_landmarks &&
                        accommodation.nearby_landmarks.length > 0)) && (
                      <div className="space-y-1">
                        {accommodation.neighborhood && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            <Landmark className="h-2.5 w-2.5 mr-1" />
                            {accommodation.neighborhood}
                          </Badge>
                        )}
                        {accommodation.nearby_landmarks &&
                          accommodation.nearby_landmarks.length > 0 && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {accommodation.nearby_landmarks
                                .map((l) => {
                                  let s = l.name;
                                  if (l.distance) s += ` ${l.distance}`;
                                  else if (l.walk_minutes)
                                    s += ` ${l.walk_minutes}min walk`;
                                  return s;
                                })
                                .join(" \u00B7 ")}
                            </p>
                          )}
                      </div>
                    )}

                    {/* ---- F. Booking & cost ---- */}
                    <div className="flex flex-wrap items-center gap-3">
                      {accommodation.cost != null && accommodation.cost > 0 && (
                        <span className="font-semibold text-sm">
                          {accommodation.currency || "$"}
                          {accommodation.cost.toLocaleString()}
                        </span>
                      )}
                      {accommodation.booking_reference && (
                        <Badge
                          variant="secondary"
                          className="text-xs font-mono"
                        >
                          <Ticket className="h-3 w-3 mr-1" />
                          {accommodation.booking_reference}
                        </Badge>
                      )}
                      {accommodation.loyalty_program && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                          {accommodation.loyalty_program}
                        </Badge>
                      )}
                      {accommodation.room_type && (
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {accommodation.room_type}
                        </Badge>
                      )}
                    </div>

                    {/* ---- G. Notes ---- */}
                    {accommodation.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {accommodation.notes}
                      </p>
                    )}

                    {/* ---- H. Google editorial summary ---- */}
                    {accommodation.google_editorial_summary && (
                      <blockquote className="text-xs text-muted-foreground italic border-l-2 border-muted-foreground/20 pl-3">
                        {accommodation.google_editorial_summary}
                      </blockquote>
                    )}

                    {/* ---- I. Action buttons ---- */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        disabled={isEnriching}
                        onClick={() => handleEnrich(accommodation.id)}
                      >
                        {isEnriching ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {isEnriching ? "Enriching..." : "Enrich"}
                      </Button>
                      {!accommodation.photos_fetched && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={isFetchingPhotos}
                          onClick={() => handleFetchPhotos(accommodation.id)}
                        >
                          {isFetchingPhotos ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Camera className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {isFetchingPhotos
                            ? "Fetching..."
                            : "Fetch Photos"}
                        </Button>
                      )}
                      {accommodation.enriched_at && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Enriched{" "}
                          {new Date(
                            accommodation.enriched_at
                          ).toLocaleDateString()}
                          {accommodation.enrichment_source &&
                            ` via ${accommodation.enrichment_source}`}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}

          {/* ---- J. Summary footer ---- */}
          <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border rounded-lg bg-muted/30">
            <span>
              {trip.accommodations.length} accommodation
              {trip.accommodations.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-3">
              <span>
                {trip.accommodations.reduce(
                  (sum, a) => sum + (a.nights || 0),
                  0
                )}{" "}
                nights total
                {trip.accommodations.some((a) => a.cost) && (
                  <>
                    {" "}
                    &middot; $
                    {trip.accommodations
                      .reduce((sum, a) => sum + (a.cost || 0), 0)
                      .toLocaleString()}
                  </>
                )}
              </span>
              {totalMissingFields > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-700 gap-1"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {totalMissingFields} missing field
                  {totalMissingFields !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Hotel className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No accommodations yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Add hotels, rentals, or other places to stay
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add First Accommodation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
