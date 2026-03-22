"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  useTripFull,
  formatTripDate,
} from "@/lib/api";
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
} from "lucide-react";
import type { TripMedia } from "@singularity/shared-types";

export default function TripLodgingPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);

  const segmentMap = useMemo(() => {
    if (!trip?.segments) return new Map<string, string>();
    return new Map(trip.segments.map(s => [s.id, s.name]));
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
    return trip.days.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= checkInDate && dayDate < checkOutDate;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (!trip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Accommodations</h2>
          <p className="text-sm text-muted-foreground">
            Hotels, rentals, and places to stay
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Accommodation
        </Button>
      </div>

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
                                displayPhotos.length === 2 ? "row-span-1" :
                                displayPhotos.length === 3 && i === 0 ? "row-span-2" : ""
                              }`}
                            >
                              <img
                                src={photo.file_url}
                                alt={accommodation.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {i === displayPhotos.length - 1 && extraCount > 0 && (
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
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-base">{accommodation.name}</h3>
                        {accommodation.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[300px]">{accommodation.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {accommodation.google_rating && (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                              {accommodation.google_rating}
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {accommodation.website && (
                            <DropdownMenuItem asChild>
                              <a href={accommodation.website} target="_blank" rel="noopener noreferrer">
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

                    {/* Date & stay info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatTripDate(accommodation.check_in_date)} — {formatTripDate(accommodation.check_out_date)}
                      </span>
                      {accommodation.nights && (
                        <span>{accommodation.nights} night{accommodation.nights !== 1 ? "s" : ""}</span>
                      )}
                      {coveredDays.length > 0 && (
                        <span>
                          Day{coveredDays.length > 1 ? "s" : ""} {coveredDays[0].day_number || 1}
                          {coveredDays.length > 1 ? `-${coveredDays[coveredDays.length - 1].day_number || coveredDays.length}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Check-in/out times, phone, website */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
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
                      {accommodation.website && (
                        <a
                          href={accommodation.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <Globe className="h-3 w-3" />
                          {new URL(accommodation.website).hostname}
                        </a>
                      )}
                    </div>

                    {/* Amenities */}
                    {accommodation.amenities && accommodation.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {accommodation.amenities.slice(0, 8).map((a) => (
                          <span key={a} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
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

                    {/* Cost & booking */}
                    <div className="flex items-center gap-4 mt-3">
                      {accommodation.cost ? (
                        <span className="font-semibold text-sm">
                          {accommodation.currency || "$"}{accommodation.cost.toLocaleString()}
                        </span>
                      ) : null}
                      {accommodation.booking_reference && (
                        <span className="text-xs text-muted-foreground">
                          Ref: {accommodation.booking_reference}
                        </span>
                      )}
                      {accommodation.room_type && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {accommodation.room_type}
                        </Badge>
                      )}
                    </div>

                    {accommodation.notes && (
                      <p className="text-xs text-muted-foreground italic mt-2">
                        {accommodation.notes}
                      </p>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}

          {/* Summary footer */}
          {trip.accommodations.length > 1 && (
            <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border rounded-lg bg-muted/30">
              <span>{trip.accommodations.length} accommodations</span>
              <span>
                {trip.accommodations.reduce((sum, a) => sum + (a.nights || 0), 0)} nights total
                {trip.accommodations.some(a => a.cost) && (
                  <> &middot; ${trip.accommodations.reduce((sum, a) => sum + (a.cost || 0), 0).toLocaleString()}</>
                )}
              </span>
            </div>
          )}
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
