"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useTripFull,
  formatTripDate,
  getActivityTypeIcon,
  getTimeBlockLabel,
} from "@/lib/api";
import { ActivityDetailContent } from "@/components/travel/ActivityDetailContent";
import { SegmentDetailContent } from "@/components/travel/SegmentDetailContent";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Calendar,
  ChevronDown,
  ChevronRight,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Convert 24h time to 12h AM/PM format
function formatTimeAmPm(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Get time-of-day info based on time string (HH:MM format)
function getTimeOfDayInfo(time: string): {
  icon: React.ReactNode;
  colorClass: string;
  label: string;
} {
  const hours = parseInt(time.split(':')[0], 10);

  if (hours < 8) {
    return {
      icon: <Sunrise className="h-3 w-3" />,
      colorClass: "text-orange-400",
      label: "Early morning",
    };
  } else if (hours < 12) {
    return {
      icon: <Sun className="h-3 w-3" />,
      colorClass: "text-yellow-500",
      label: "Morning",
    };
  } else if (hours < 14) {
    return {
      icon: <Utensils className="h-3 w-3" />,
      colorClass: "text-green-500",
      label: "Lunch",
    };
  } else if (hours < 17) {
    return {
      icon: <Sun className="h-3 w-3" />,
      colorClass: "text-amber-500",
      label: "Afternoon",
    };
  } else if (hours < 20) {
    return {
      icon: <Sunset className="h-3 w-3" />,
      colorClass: "text-orange-500",
      label: "Evening",
    };
  } else {
    return {
      icon: <Moon className="h-3 w-3" />,
      colorClass: "text-indigo-400",
      label: "Night",
    };
  }
}

// Photo gallery grid for activities in a segment
function ActivityPhotoGrid({
  activities,
  mediaByParent,
  onPhotoClick,
}: {
  activities: Array<{ id: string; name: string }>;
  mediaByParent: Record<string, Array<{ id: string; file_url: string; caption?: string | null }>>;
  onPhotoClick: (activityId: string) => void;
}) {
  // Collect photos from activities with their activity reference
  const photosWithActivity = useMemo(() => {
    const result: Array<{ photo: { id: string; file_url: string; caption?: string | null }; activityId: string; activityName: string }> = [];
    for (const activity of activities) {
      const activityMedia = mediaByParent[`activity-${activity.id}`] || [];
      for (const photo of activityMedia) {
        result.push({ photo, activityId: activity.id, activityName: activity.name });
      }
    }
    return result;
  }, [activities, mediaByParent]);

  if (photosWithActivity.length === 0) return null;

  const displayPhotos = photosWithActivity.slice(0, 6);
  const remainingCount = photosWithActivity.length - 6;

  return (
    <div className="grid grid-cols-3 gap-1 mt-2">
      {displayPhotos.map(({ photo, activityId, activityName }, index) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick(activityId)}
          className="relative aspect-square rounded overflow-hidden group/photo"
        >
          <img
            src={photo.file_url}
            alt={photo.caption || activityName}
            className="w-full h-full object-cover transition-transform group-hover/photo:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/30 transition-colors" />
          {index === 5 && remainingCount > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-sm font-medium">+{remainingCount}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);

  // Selection state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  // Find selected items from data
  const selectedActivity = selectedActivityId
    ? trip?.activities?.find((a) => a.id === selectedActivityId) || null
    : null;
  const selectedSegment = selectedSegmentId
    ? trip?.segments?.find((s) => s.id === selectedSegmentId) || null
    : null;

  // Group days by segment
  const daysBySegment = useMemo(() => {
    if (!trip?.days) return {};
    const grouped: Record<string, typeof trip.days> = {};
    const seenDatesPerSegment: Record<string, Set<string>> = {};

    for (const day of trip.days) {
      const segmentId = day.segment_id || "unassigned";
      if (!grouped[segmentId]) {
        grouped[segmentId] = [];
        seenDatesPerSegment[segmentId] = new Set();
      }

      const dateKey = day.date;
      if (seenDatesPerSegment[segmentId].has(dateKey)) continue;
      seenDatesPerSegment[segmentId].add(dateKey);

      grouped[segmentId].push(day);
    }
    for (const segmentId of Object.keys(grouped)) {
      grouped[segmentId].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return grouped;
  }, [trip?.days]);

  // Group activities by day
  const activitiesByDay = useMemo(() => {
    if (!trip?.activities) return {};
    const grouped: Record<string, typeof trip.activities> = {};
    for (const activity of trip.activities) {
      if (activity.is_backup) continue;
      const dayId = activity.day_id || "unassigned";
      if (!grouped[dayId]) grouped[dayId] = [];
      grouped[dayId].push(activity);
    }
    for (const dayId of Object.keys(grouped)) {
      grouped[dayId].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return grouped;
  }, [trip?.activities]);

  // Group media by parent
  const mediaByParent = useMemo(() => {
    if (!trip?.media) return {};
    const grouped: Record<string, typeof trip.media> = {};
    for (const media of trip.media) {
      const key = `${media.parent_type}-${media.parent_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(media);
    }
    return grouped;
  }, [trip?.media]);

  const toggleSegment = (segmentId: string) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segmentId)) {
      newExpanded.delete(segmentId);
    } else {
      newExpanded.add(segmentId);
    }
    setExpandedSegments(newExpanded);
  };

  const handleActivityClick = (activityId: string) => {
    setSelectedActivityId(activityId);
    setSelectedSegmentId(null);
  };

  const handleSegmentClick = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setSelectedActivityId(null);
  };

  // Get all activities for a segment (for photo grid)
  const getSegmentActivities = (segmentId: string) => {
    const segmentDays = daysBySegment[segmentId] || [];
    const activities: Array<{ id: string; name: string }> = [];
    for (const day of segmentDays) {
      const dayActivities = activitiesByDay[day.id] || [];
      activities.push(...dayActivities);
    }
    return activities;
  };

  // Auto-expand first segment on load
  useMemo(() => {
    if (trip?.segments && trip.segments.length > 0 && expandedSegments.size === 0) {
      setExpandedSegments(new Set([trip.segments[0].id]));
    }
  }, [trip?.segments]);

  if (!trip) return null;

  return (
    <div className="flex gap-0 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Left Panel - Itinerary List (40%) */}
      <div className="w-[40%] border-r bg-muted/20">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {trip.segments && trip.segments.length > 0 ? (
              trip.segments.map((segment, index) => {
                const segmentDays = daysBySegment[segment.id] || [];
                const isExpanded = expandedSegments.has(segment.id);
                const segmentActivities = getSegmentActivities(segment.id);
                const totalActivities = segmentActivities.length;

                return (
                  <div key={segment.id} className="space-y-2">
                    {/* Segment Header */}
                    <div
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-colors",
                        selectedSegmentId === segment.id
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-card hover:bg-muted/50 border border-transparent"
                      )}
                      onClick={() => handleSegmentClick(segment.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Segment number */}
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{segment.name}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSegment(segment.id);
                              }}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {segment.location_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {segment.location_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatTripDate(segment.start_date)} - {formatTripDate(segment.end_date)}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {segmentDays.length} days
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {totalActivities} activities
                            </Badge>
                          </div>

                          {/* Activity Photos Grid */}
                          {!isExpanded && (
                            <ActivityPhotoGrid
                              activities={segmentActivities}
                              mediaByParent={mediaByParent}
                              onPhotoClick={handleActivityClick}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Days/Activities */}
                    {isExpanded && segmentDays.length > 0 && (
                      <div className="ml-11 space-y-2">
                        {segmentDays.map((day, dayIndex) => {
                          const dayActivities = activitiesByDay[day.id] || [];
                          return (
                            <div key={day.id} className="space-y-1">
                              {/* Day Header */}
                              <div className="flex items-center gap-2 py-1">
                                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-medium">
                                  {day.day_number || dayIndex + 1}
                                </div>
                                <span className="font-medium text-xs">
                                  {day.title || `Day ${day.day_number || dayIndex + 1}`}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {new Date(day.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>

                              {/* Activities */}
                              {dayActivities.length > 0 ? (
                                <div className="space-y-0.5 ml-7">
                                  {dayActivities.map((activity) => {
                                    const timeInfo = activity.start_time
                                      ? getTimeOfDayInfo(activity.start_time)
                                      : null;
                                    const activityMedia = mediaByParent[`activity-${activity.id}`] || [];
                                    const hasPhotos = activityMedia.length > 0;

                                    return (
                                      <div
                                        key={activity.id}
                                        onClick={() => handleActivityClick(activity.id)}
                                        className={cn(
                                          "flex items-center gap-2 text-xs py-1.5 px-2 rounded cursor-pointer transition-colors",
                                          selectedActivityId === activity.id
                                            ? "bg-primary/10 border border-primary/30"
                                            : "hover:bg-muted/50"
                                        )}
                                      >
                                        <span className="w-4 text-center shrink-0">
                                          {getActivityTypeIcon(activity.activity_type || "activity")}
                                        </span>
                                        <span className="flex-1 truncate">{activity.name}</span>
                                        {hasPhotos && (
                                          <span className="shrink-0 text-muted-foreground flex items-center gap-0.5">
                                            <ImageIcon className="h-3 w-3" />
                                            {activityMedia.length}
                                          </span>
                                        )}
                                        {activity.start_time && timeInfo && (
                                          <span className={cn("shrink-0 flex items-center gap-1", timeInfo.colorClass)}>
                                            {timeInfo.icon}
                                            {formatTimeAmPm(activity.start_time)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic ml-7 py-1">
                                  No activities planned
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No segments yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Detail View (60%) */}
      <div className="w-[60%] bg-background">
        <ScrollArea className="h-full">
          {selectedActivity ? (
            <ActivityDetailContent activity={selectedActivity} tripId={tripId} />
          ) : selectedSegment ? (
            <SegmentDetailContent segment={selectedSegment} tripId={tripId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center p-8">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Select a segment or activity to view details</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
