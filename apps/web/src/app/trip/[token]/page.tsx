"use client";

import { use, useState } from "react";
import {
  usePublicTrip,
  formatTripDateRange,
  formatTripDate,
} from "@/lib/api";
import { TripBrowseContent } from "@/components/travel/TripBrowseContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  Users,
  BookOpen,
  Hotel,
  Star,
  Phone,
  Globe,
  Clock,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TripMedia } from "@singularity/shared-types";
import Link from "next/link";

type Tab = "browse" | "lodging";

export default function PublicTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data: trip, isLoading, error } = usePublicTrip(token);
  const [tab, setTab] = useState<Tab>("browse");

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Trip Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This trip link may be invalid, expired, or no longer publicly shared.
          </p>
          <Button asChild>
            <Link href="/">Back to Singularity</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Minimal hero ───────────────────────────────────────────── */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold">{trip.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatTripDateRange(trip.start_date, trip.end_date)}
            </span>
            {trip.destination && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination}
              </span>
            )}
            {trip.traveler_count && trip.traveler_count > 1 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {trip.traveler_count} travelers
              </span>
            )}
          </div>

          {/* Tabs: Browse (primary) + Lodging (secondary) */}
          <div className="flex gap-1 mt-4 border-b -mb-4">
            <button
              type="button"
              onClick={() => setTab("browse")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "browse"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid="public-tab-browse"
            >
              <BookOpen className="h-4 w-4" />
              Browse
            </button>
            <button
              type="button"
              onClick={() => setTab("lodging")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "lodging"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              data-testid="public-tab-lodging"
            >
              <Hotel className="h-4 w-4" />
              Lodging
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <main className="pb-12">
        {tab === "browse" && (
          <TripBrowseContent
            trip={trip}
            tripId={trip.id}
            // In the public view, hotel references inside the browse content
            // shouldn't deep-link to the dashboard lodging tab — let users
            // switch tabs at the top instead. Empty string disables links.
            lodgingHref=""
          />
        )}

        {tab === "lodging" && <PublicLodgingView trip={trip} />}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Made with{" "}
        <Link href="/" className="font-medium hover:text-foreground hover:underline">
          Singularity
        </Link>
      </footer>
    </div>
  );
}

// ─── Lodging view (read-only) ──────────────────────────────────────
function PublicLodgingView({
  trip,
}: {
  trip: ReturnType<typeof usePublicTrip>["data"];
}) {
  if (!trip) return null;
  const accommodations = trip.accommodations || [];
  const segments = trip.segments || [];
  const media = trip.media || [];
  const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

  const mediaByAccommodation: Record<string, TripMedia[]> = {};
  for (const m of media) {
    if (m.parent_type !== "accommodation") continue;
    if (!mediaByAccommodation[m.parent_id]) mediaByAccommodation[m.parent_id] = [];
    mediaByAccommodation[m.parent_id].push(m);
  }

  if (accommodations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">
        <Hotel className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No accommodations on this trip.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-lg font-semibold">Where you'll stay</h2>
      <div className="grid gap-4">
        {accommodations.map((acc) => {
          const photos = mediaByAccommodation[acc.id] || [];
          const segmentName = acc.segment_id ? segmentMap.get(acc.segment_id) : null;
          return (
            <Card key={acc.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Photos */}
                {photos.length > 0 ? (
                  <div className="md:w-64 shrink-0 bg-muted">
                    <div className="grid grid-cols-2 gap-0.5 h-full min-h-[180px] aspect-[4/3] md:aspect-auto">
                      {photos.slice(0, 4).map((p, i) => (
                        <div key={p.id} className="relative overflow-hidden">
                          <img
                            src={p.file_url}
                            alt={acc.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {i === 3 && photos.length > 4 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                +{photos.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="md:w-48 h-32 md:h-auto shrink-0 bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Details */}
                <CardContent className="flex-1 p-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base">{acc.name}</h3>
                    {acc.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{acc.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {acc.google_rating && (
                        <span className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          {acc.google_rating}
                        </span>
                      )}
                      {segmentName && (
                        <Badge variant="outline" className="font-normal text-xs">
                          <Layers className="h-3 w-3 mr-1" />
                          {segmentName}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatTripDate(acc.check_in_date)} — {formatTripDate(acc.check_out_date)}
                    </span>
                    {acc.nights ? (
                      <span>
                        {acc.nights} night{acc.nights !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {acc.check_in_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Check-in: {acc.check_in_time}
                      </span>
                    )}
                    {acc.check_out_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Check-out: {acc.check_out_time}
                      </span>
                    )}
                    {acc.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {acc.phone}
                      </span>
                    )}
                    {acc.website && (
                      <a
                        href={acc.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <Globe className="h-3 w-3" />
                        {(() => {
                          try {
                            return new URL(acc.website).hostname;
                          } catch {
                            return "website";
                          }
                        })()}
                      </a>
                    )}
                  </div>

                  {acc.amenities && acc.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {acc.amenities.slice(0, 8).map((a: string) => (
                        <span
                          key={a}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                        >
                          {a}
                        </span>
                      ))}
                      {acc.amenities.length > 8 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{acc.amenities.length - 8} more
                        </span>
                      )}
                    </div>
                  )}

                  {acc.room_type && (
                    <div className="mt-3">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {acc.room_type}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
