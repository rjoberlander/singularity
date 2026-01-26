"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTripFull, useDeleteTripMedia } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  Images,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  Route,
} from "lucide-react";
import type { TripMedia, TripActivity, TripDay, TripSegment } from "@singularity/shared-types";

interface EnrichedMedia extends TripMedia {
  segmentName?: string;
  segmentNumber?: number;
  dayNumber?: number;
  dayDate?: string;
  activityName?: string;
  activityLocation?: string;
  activityTime?: string;
  isAlternate?: boolean;
  sortDate?: string;
  sortTime?: string;
}

function enrichMediaWithContext(
  media: TripMedia[],
  segments: TripSegment[],
  days: TripDay[],
  activities: TripActivity[]
): EnrichedMedia[] {
  // Create lookup maps for efficient access
  const segmentMap = new Map(segments.map(s => [s.id, s]));
  const dayMap = new Map(days.map(d => [d.id, d]));
  const activityMap = new Map(activities.map(a => [a.id, a]));

  return media.map(m => {
    const enriched: EnrichedMedia = { ...m };

    if (m.parent_type === "activity" && m.parent_id) {
      const activity = activityMap.get(m.parent_id);
      if (activity) {
        enriched.activityName = activity.name;
        enriched.activityLocation = activity.location_name;
        enriched.activityTime = activity.start_time;
        enriched.isAlternate = activity.is_backup || !!activity.alternate_to_activity_id;
        enriched.sortDate = activity.date;
        enriched.sortTime = activity.start_time;

        // Get day info
        if (activity.day_id) {
          const day = dayMap.get(activity.day_id);
          if (day) {
            enriched.dayNumber = day.day_number;
            enriched.dayDate = day.date;
            if (!enriched.sortDate) enriched.sortDate = day.date;
          }
        } else if (activity.date) {
          // Find day by date
          const day = days.find(d => d.date === activity.date);
          if (day) {
            enriched.dayNumber = day.day_number;
            enriched.dayDate = day.date;
          }
        }

        // Get segment info
        if (activity.segment_id) {
          const segment = segmentMap.get(activity.segment_id);
          if (segment) {
            enriched.segmentName = segment.name;
            enriched.segmentNumber = segment.segment_number;
          }
        }
      }
    } else if (m.parent_type === "day" && m.parent_id) {
      const day = dayMap.get(m.parent_id);
      if (day) {
        enriched.dayNumber = day.day_number;
        enriched.dayDate = day.date;
        enriched.sortDate = day.date;

        if (day.segment_id) {
          const segment = segmentMap.get(day.segment_id);
          if (segment) {
            enriched.segmentName = segment.name;
            enriched.segmentNumber = segment.segment_number;
          }
        }
      }
    } else if (m.parent_type === "segment" && m.parent_id) {
      const segment = segmentMap.get(m.parent_id);
      if (segment) {
        enriched.segmentName = segment.name;
        enriched.segmentNumber = segment.segment_number;
        enriched.sortDate = segment.start_date;
      }
    }

    return enriched;
  });
}

function sortMediaByTimeline(media: EnrichedMedia[]): EnrichedMedia[] {
  return [...media].sort((a, b) => {
    // Sort by date first
    const dateA = a.sortDate || "9999-99-99";
    const dateB = b.sortDate || "9999-99-99";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    // Then by time
    const timeA = a.sortTime || "99:99";
    const timeB = b.sortTime || "99:99";
    return timeA.localeCompare(timeB);
  });
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function TripMediaPage() {
  const params = useParams();
  const tripId = params.id as string;
  const [deleteTarget, setDeleteTarget] = useState<EnrichedMedia | null>(null);

  const { data: trip } = useTripFull(tripId);
  const { mutate: deleteMedia, isPending: isDeleting } = useDeleteTripMedia();

  const enrichedMedia = useMemo(() => {
    if (!trip?.media) return [];
    const enriched = enrichMediaWithContext(
      trip.media,
      trip.segments || [],
      trip.days || [],
      trip.activities || []
    );
    return sortMediaByTimeline(enriched);
  }, [trip]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMedia(
      { tripId, mediaId: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) }
    );
  };

  if (!trip) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Photos & Media</h2>
          <p className="text-sm text-muted-foreground">
            Trip photos and documents ({enrichedMedia.length} items)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Upload Media
        </Button>
      </div>

      {enrichedMedia.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {enrichedMedia.map((media) => (
            <div
              key={media.id}
              className="group rounded-lg overflow-hidden bg-muted border"
            >
              {/* Image container */}
              <div className="relative aspect-square">
                {media.media_type === "image" ? (
                  <img
                    src={media.thumbnail_url || media.file_url}
                    alt={media.caption || "Trip photo"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Images className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Delete button overlay */}
                <button
                  onClick={() => setDeleteTarget(media)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Alternate badge */}
                {media.isAlternate && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded">
                    Alternate
                  </span>
                )}
              </div>

              {/* Metadata */}
              <div className="p-3 space-y-1.5 text-sm bg-card">
                {media.activityName && (
                  <p className="font-medium text-foreground truncate" title={media.activityName}>
                    {media.activityName}
                  </p>
                )}

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {media.segmentName && (
                    <span className="flex items-center gap-1" title="Segment">
                      <Route className="h-3 w-3" />
                      {media.segmentName}
                    </span>
                  )}

                  {media.dayNumber && (
                    <span className="flex items-center gap-1" title="Day">
                      <Calendar className="h-3 w-3" />
                      Day {media.dayNumber}
                    </span>
                  )}

                  {media.activityLocation && (
                    <span className="flex items-center gap-1" title="Location">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{media.activityLocation}</span>
                    </span>
                  )}

                  {media.activityTime && (
                    <span className="flex items-center gap-1" title="Time">
                      <Clock className="h-3 w-3" />
                      {formatTime(media.activityTime)}
                    </span>
                  )}
                </div>

                {!media.segmentName && !media.dayNumber && !media.activityLocation && (
                  <p className="text-xs text-muted-foreground">
                    {media.parent_type === "trip" ? "Trip photo" : `${media.parent_type} photo`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Images className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No media yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Upload photos and documents for your trip
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload First Photo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
              {deleteTarget?.activityName && (
                <span className="block mt-2 text-foreground">
                  Photo from: {deleteTarget.activityName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
