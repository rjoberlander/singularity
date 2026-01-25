"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  useTripFull,
  formatTripDate,
  parseLocalDate,
  getActivityTypeIcon,
  getTimeBlockLabel,
} from "@/lib/api";
import { ActivityDetailContent } from "@/components/travel/ActivityDetailContent";
import { SegmentDetailContent } from "@/components/travel/SegmentDetailContent";
import type { TripActivity } from "@singularity/shared-types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  ArrowLeftRight,
  Car,
  GitBranch,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Slugify a name for URL-friendly format
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    <div className="grid grid-cols-3 gap-0.5 mt-1">
      {displayPhotos.map(({ photo, activityId, activityName }, index) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick(activityId)}
          className="relative aspect-square rounded-sm overflow-hidden group/photo"
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { data: trip } = useTripFull(tripId);

  // Selection state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [urlProcessed, setUrlProcessed] = useState(false);
  const [hideLogistics, setHideLogistics] = useState(false);

  // Activity types to hide when "Activities Only" is toggled on
  const logisticsTypes = new Set(["transport", "other", undefined, ""]);
  const isLogisticsActivity = (activity: TripActivity) => {
    const type = activity.activity_type?.toLowerCase() || "";
    // Hide transport and generic "other" activities
    if (type === "transport") return true;
    // Also hide activities with logistics-related names
    const name = activity.name.toLowerCase();
    const logisticsKeywords = ["wake up", "kids to bed", "check-in", "check in", "check out", "check-out", "pack", "load car", "depart for", "arrive at", "drive to", "pick up rental", "return rental"];
    return logisticsKeywords.some(keyword => name.includes(keyword));
  };

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
      grouped[segmentId].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
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

  // Map activities that have alternatives pointing to them
  const activitiesWithAlternatives = useMemo(() => {
    if (!trip?.activities) return new Set<string>();
    const mainActivityIds = new Set<string>();
    for (const activity of trip.activities) {
      if (activity.alternate_to_activity_id) {
        mainActivityIds.add(activity.alternate_to_activity_id);
      }
    }
    return mainActivityIds;
  }, [trip?.activities]);

  // Get alternatives for a specific activity
  const getAlternativesForActivity = (activityId: string) => {
    if (!trip?.activities) return [];
    return trip.activities.filter((a) => a.alternate_to_activity_id === activityId);
  };

  // Get all alternative activities for a segment (both linked and general)
  const getSegmentAlternatives = (segmentId: string) => {
    if (!trip?.activities) return { linked: {} as Record<string, TripActivity[]>, general: [] as TripActivity[] };

    const segmentDays = daysBySegment[segmentId] || [];
    const segmentDayIds = new Set(segmentDays.map((d) => d.id));

    // Get all backup activities for this segment
    const backupActivities = trip.activities.filter(
      (a) => a.is_backup && (a.segment_id === segmentId || (a.day_id && segmentDayIds.has(a.day_id)))
    );

    // Group by what they replace
    const linked: Record<string, typeof trip.activities> = {};
    const general: typeof trip.activities = [];

    for (const backup of backupActivities) {
      if (backup.alternate_to_activity_id) {
        const mainActivity = trip.activities.find((a) => a.id === backup.alternate_to_activity_id);
        const key = mainActivity?.name || backup.alternate_to_activity_id;
        if (!linked[key]) linked[key] = [];
        linked[key].push(backup);
      } else {
        general.push(backup);
      }
    }

    return { linked, general };
  };

  // Global sorted days list for day1, day2, etc. URLs
  const allDaysSorted = useMemo(() => {
    if (!trip?.days) return [];
    const uniqueDays = new Map<string, typeof trip.days[0]>();
    for (const day of trip.days) {
      if (!uniqueDays.has(day.date)) {
        uniqueDays.set(day.date, day);
      }
    }
    return Array.from(uniqueDays.values()).sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );
  }, [trip?.days]);

  // Map day ID to global day number (1-indexed)
  const dayToGlobalNumber = useMemo(() => {
    const map: Record<string, number> = {};
    allDaysSorted.forEach((day, index) => {
      map[day.id] = index + 1;
    });
    return map;
  }, [allDaysSorted]);

  // Update URL when activity is selected
  const updateUrlForActivity = (activityId: string) => {
    const activity = trip?.activities?.find((a) => a.id === activityId);
    if (!activity) return;

    const dayNumber = activity.day_id ? dayToGlobalNumber[activity.day_id] : null;
    const activitySlug = slugify(activity.name);

    const params = new URLSearchParams();
    if (dayNumber) params.set("day", `day${dayNumber}`);
    params.set("activity", activitySlug);

    router.replace(`/travel/${tripId}/details?${params.toString()}`, { scroll: false });
  };

  // Process URL params on initial load
  useEffect(() => {
    if (!trip || urlProcessed) return;

    const dayParam = searchParams.get("day");
    const activityParam = searchParams.get("activity");

    if (activityParam) {
      // Find activity by slug
      const activity = trip.activities?.find(
        (a) => slugify(a.name) === activityParam
      );

      if (activity) {
        // Find which segment contains this activity's day
        const day = trip.days?.find((d) => d.id === activity.day_id);
        if (day?.segment_id) {
          setExpandedSegments(new Set([day.segment_id]));
        }
        setSelectedActivityId(activity.id);
        setSelectedSegmentId(null);
      }
    } else if (dayParam) {
      // Parse day number from "day1", "day2", etc.
      const dayNumber = parseInt(dayParam.replace("day", ""), 10);
      if (!isNaN(dayNumber) && dayNumber > 0 && dayNumber <= allDaysSorted.length) {
        const day = allDaysSorted[dayNumber - 1];
        if (day?.segment_id) {
          setExpandedSegments(new Set([day.segment_id]));
        }
      }
    }

    setUrlProcessed(true);
  }, [trip, searchParams, urlProcessed, allDaysSorted, tripId]);

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
    updateUrlForActivity(activityId);
  };

  const handleSegmentClick = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setSelectedActivityId(null);
    // Clear activity from URL when selecting segment
    router.replace(`/travel/${tripId}/details`, { scroll: false });
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

  // Auto-expand segments that have activities
  useMemo(() => {
    if (trip?.segments && trip.segments.length > 0 && expandedSegments.size === 0) {
      const segmentsWithActivities = trip.segments.filter(segment => {
        const segmentDays = daysBySegment[segment.id] || [];
        return segmentDays.some(day => {
          const dayActs = activitiesByDay[day.id] || [];
          return dayActs.length > 0;
        });
      });
      if (segmentsWithActivities.length > 0) {
        setExpandedSegments(new Set(segmentsWithActivities.map(s => s.id)));
      } else {
        // Fallback to first segment if none have activities
        setExpandedSegments(new Set([trip.segments[0].id]));
      }
    }
  }, [trip?.segments, daysBySegment, activitiesByDay]);

  if (!trip) return null;

  return (
    <div className="flex gap-0 h-[calc(100vh-180px)] min-h-[500px]">
      {/* Left Panel - Itinerary List */}
      <div className="w-fit min-w-[280px] max-w-[400px] shrink-0 border-r bg-muted/20">
        <ScrollArea className="h-full">
          {/* Activities Only Toggle */}
          <div className="px-2 py-2 border-b bg-muted/30 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Switch
                id="hide-logistics"
                checked={hideLogistics}
                onCheckedChange={setHideLogistics}
                className="scale-75"
              />
              <Label htmlFor="hide-logistics" className="text-xs cursor-pointer">
                Activities Only
              </Label>
            </div>
          </div>
          <div className="px-0 py-1 space-y-1">
            {trip.segments && trip.segments.length > 0 ? (
              trip.segments.map((segment, index) => {
                const segmentDays = daysBySegment[segment.id] || [];
                const isExpanded = expandedSegments.has(segment.id);
                const segmentActivities = getSegmentActivities(segment.id);
                const totalActivities = segmentActivities.length;

                const segmentColors = [
                  { bg: "bg-emerald-600", bgLight: "bg-emerald-600/20" },
                  { bg: "bg-blue-600", bgLight: "bg-blue-600/20" },
                  { bg: "bg-amber-600", bgLight: "bg-amber-600/20" },
                  { bg: "bg-purple-600", bgLight: "bg-purple-600/20" },
                  { bg: "bg-rose-600", bgLight: "bg-rose-600/20" },
                  { bg: "bg-cyan-600", bgLight: "bg-cyan-600/20" },
                  { bg: "bg-orange-600", bgLight: "bg-orange-600/20" },
                  { bg: "bg-indigo-600", bgLight: "bg-indigo-600/20" },
                ];
                const segmentColor = segmentColors[index % segmentColors.length];

                return (
                  <div key={segment.id} className="space-y-0.5">
                    {/* Segment Header */}
                    <div
                      className={cn(
                        "px-2 py-1 rounded cursor-pointer transition-colors",
                        segmentColor.bgLight,
                        selectedSegmentId === segment.id
                          ? "border border-primary/30"
                          : "border border-transparent hover:brightness-110"
                      )}
                      onClick={() => handleSegmentClick(segment.id)}
                      onDoubleClick={() => toggleSegment(segment.id)}
                    >
                      <div className="flex items-start gap-2">
                        {/* Segment number */}
                        <div className={cn("w-6 h-6 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5", segmentColor.bg)}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{segment.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {segmentDays.length} days
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {totalActivities} activities
                            </Badge>
                          </div>
                          <div className="flex items-center gap-x-2 text-xs text-muted-foreground">
                            {segment.location_name && (
                              <span className="flex items-center gap-0.5" title={segment.location_name}>
                                <MapPin className="h-3 w-3" />
                                {segment.location_name.length > 12
                                  ? segment.location_name.slice(0, 12) + "…"
                                  : segment.location_name}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3 w-3" />
                              {parseLocalDate(segment.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} - {parseLocalDate(segment.end_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSegment(segment.id);
                              }}
                              className="p-0.5 hover:bg-muted rounded ml-auto"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
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

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="ml-2">
                        {/* Days/Activities */}
                        {segmentDays.map((day, dayIndex) => {
                          const allDayActivities = activitiesByDay[day.id] || [];
                          const dayActivities = hideLogistics
                            ? allDayActivities.filter(a => !isLogisticsActivity(a))
                            : allDayActivities;
                          const localDate = parseLocalDate(day.date);
                          const dayOfWeek = localDate.getDay();
                          const weekdayColors: Record<number, string> = {
                            0: "bg-rose-600",    // Sun
                            1: "bg-blue-600",    // Mon
                            2: "bg-emerald-600", // Tue
                            3: "bg-amber-600",   // Wed
                            4: "bg-purple-600",  // Thu
                            5: "bg-cyan-600",    // Fri
                            6: "bg-orange-600",  // Sat
                          };
                          const weekdayShort = localDate.toLocaleDateString("en-US", { weekday: "short" });
                          return (
                            <div key={day.id}>
                              {/* Day Header */}
                              <div className="flex items-center gap-1 py-px">
                                <div className={cn("px-1 py-px rounded text-[10px] font-medium text-white", weekdayColors[dayOfWeek])}>
                                  {weekdayShort}
                                </div>
                                <span className="font-medium text-xs">
                                  {day.title || `Day ${day.day_number || dayIndex + 1}`}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {localDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>

                              {/* Activities */}
                              {dayActivities.length > 0 ? (
                                <div className="ml-5">
                                  {dayActivities.map((activity) => {
                                    const timeInfo = activity.start_time
                                      ? getTimeOfDayInfo(activity.start_time)
                                      : null;
                                    const activityMedia = mediaByParent[`activity-${activity.id}`] || [];
                                    const hasPhotos = activityMedia.length > 0;

                                    const hasAlternatives = activitiesWithAlternatives.has(activity.id);

                                    // Check if this is a transport activity that should show route stops
                                    const isTransportActivity = activity.activity_type === 'transport';
                                    const activityNameLower = activity.name.toLowerCase();

                                    // Match route stops to this activity based on destination
                                    let routeStopsForActivity: typeof segment.route_stops = [];
                                    if (isTransportActivity && segment.route_stops) {
                                      // Known route hierarchy: Lagos → Sagres → Cabo de São Vicente
                                      // Drives to Cabo should also show Sagres-area stops
                                      const isDriveOrDepart = activityNameLower.includes('drive') ||
                                                              activityNameLower.includes('depart') ||
                                                              activityNameLower.includes('head to');

                                      if (isDriveOrDepart) {
                                        routeStopsForActivity = segment.route_stops.filter(stop => {
                                          const stopTo = stop.between?.to?.toLowerCase() || '';

                                          // "Drive to Cabo" → show Lagos→Sagres AND Sagres→Cabo stops (full route)
                                          if (activityNameLower.includes('cabo')) {
                                            return stopTo.includes('sagres') || stopTo.includes('cabo');
                                          }

                                          // "Drive to Sagres" → show Lagos→Sagres stops
                                          if (activityNameLower.includes('sagres')) {
                                            return stopTo.includes('sagres');
                                          }

                                          // "Depart for Douro" - only show Douro stops if activity mentions Douro
                                          if (activityNameLower.includes('douro') && stopTo.includes('douro')) {
                                            return true;
                                          }

                                          return false;
                                        });
                                      }
                                    }

                                    return (
                                      <div key={activity.id}>
                                        <div
                                          onClick={() => handleActivityClick(activity.id)}
                                          className={cn(
                                            "flex items-center gap-1 text-xs py-px px-1 rounded cursor-pointer transition-colors",
                                            selectedActivityId === activity.id
                                              ? "bg-primary/10 border border-primary/30"
                                              : "hover:bg-muted/50"
                                          )}
                                        >
                                          <span className="w-4 text-center shrink-0">
                                            {getActivityTypeIcon(activity.activity_type || "activity")}
                                          </span>
                                          <span className="truncate max-w-[240px]">{activity.name}</span>
                                          {/* Status icons - right after name */}
                                          {hasAlternatives && (
                                            <span className="shrink-0 text-blue-500" title="Has alternatives">
                                              <ArrowLeftRight className="h-3 w-3" />
                                            </span>
                                          )}
                                          {activity.address && (
                                            <span className="shrink-0 text-green-500" title={activity.address}>
                                              <MapPin className="h-3 w-3" />
                                            </span>
                                          )}
                                          {activity.google_rating && (
                                            <span className="shrink-0 text-yellow-500 flex items-center gap-0.5" title={`${activity.google_rating} rating`}>
                                              <Star className="h-3 w-3 fill-yellow-500" />
                                              <span className="text-[10px]">{activity.google_rating}</span>
                                            </span>
                                          )}
                                          {hasPhotos && (
                                            <span className="shrink-0 text-purple-500 flex items-center gap-0.5">
                                              <ImageIcon className="h-3 w-3" />
                                              {activityMedia.length}
                                            </span>
                                          )}
                                          {/* Spacer to push time to the right */}
                                          <span className="flex-1" />
                                          {activity.start_time && timeInfo && (
                                            <span className={cn("shrink-0 flex items-center gap-0.5", timeInfo.colorClass)}>
                                              {timeInfo.icon}
                                              {formatTimeAmPm(activity.start_time)}
                                            </span>
                                          )}
                                        </div>
                                        {/* Route stops nested under transport activity */}
                                        {routeStopsForActivity.length > 0 && (
                                          <div className="ml-5 border-l-2 border-blue-500/30 pl-2 my-0.5">
                                            {routeStopsForActivity.map((stop) => (
                                              <div
                                                key={stop.id}
                                                className="flex items-center gap-1 text-xs py-px px-1 rounded hover:bg-muted/50 cursor-pointer text-muted-foreground"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedSegmentId(segment.id);
                                                  setSelectedActivityId(null);
                                                }}
                                              >
                                                <GitBranch className="h-3 w-3 text-blue-500 shrink-0" />
                                                <span className="truncate">{stop.name}</span>
                                                {stop.detour_time && (
                                                  <span className="text-muted-foreground/70 shrink-0 text-[10px]">
                                                    +{stop.detour_time}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {/* Alternatives nested under the activity they replace */}
                                        {hasAlternatives && (() => {
                                          const { linked } = getSegmentAlternatives(segment.id);
                                          const activityAlternatives = linked[activity.name] || [];
                                          if (activityAlternatives.length === 0) return null;
                                          return (
                                            <div className="ml-5 border-l-2 border-orange-500/30 pl-2 my-0.5">
                                              {activityAlternatives.map((alt) => (
                                                <div
                                                  key={alt.id}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleActivityClick(alt.id);
                                                  }}
                                                  className={cn(
                                                    "flex items-center gap-1 text-xs py-px px-1 rounded cursor-pointer transition-colors",
                                                    selectedActivityId === alt.id
                                                      ? "bg-primary/10 border border-primary/30"
                                                      : "hover:bg-muted/50 text-muted-foreground"
                                                  )}
                                                >
                                                  <ArrowLeftRight className="h-3 w-3 text-orange-500 shrink-0" />
                                                  <span className="truncate">{alt.name}</span>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="ml-5">
                                  <p className="text-xs text-muted-foreground italic py-px">
                                    No activities planned
                                  </p>
                                  {/* Show route stops for departure days based on day title */}
                                  {(() => {
                                    const dayTitleLower = (day.title || '').toLowerCase();
                                    if (segment.route_stops && dayTitleLower.includes('douro')) {
                                      const douroStops = segment.route_stops.filter(stop =>
                                        stop.between?.to?.toLowerCase().includes('douro')
                                      );
                                      if (douroStops.length > 0) {
                                        return (
                                          <div className="border-l-2 border-blue-500/30 pl-2 my-0.5">
                                            {douroStops.map((stop) => (
                                              <div
                                                key={stop.id}
                                                className="flex items-center gap-1 text-xs py-px px-1 rounded hover:bg-muted/50 cursor-pointer text-muted-foreground"
                                                onClick={() => {
                                                  setSelectedSegmentId(segment.id);
                                                  setSelectedActivityId(null);
                                                }}
                                              >
                                                <GitBranch className="h-3 w-3 text-blue-500 shrink-0" />
                                                <span className="truncate">{stop.name}</span>
                                                {stop.detour_time && (
                                                  <span className="text-muted-foreground/70 shrink-0 text-[10px]">
                                                    +{stop.detour_time}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* General Backup Options Section (not linked to specific activities) */}
                        {(() => {
                          const { general } = getSegmentAlternatives(segment.id);
                          const segmentAlts = segment.segment_alternatives || [];
                          const hasGeneral = general.length > 0 || segmentAlts.length > 0;

                          if (!hasGeneral) return null;

                          const totalGeneralAlternatives = general.length + segmentAlts.length;

                          return (
                            <div className="mt-2">
                              {/* Day-like header for General Backup Options */}
                              <div className="flex items-center gap-1 py-px">
                                <div className="px-1 py-px rounded text-[10px] font-medium text-white bg-orange-500">
                                  ALT
                                </div>
                                <span className="font-medium text-xs">
                                  Other Backup Options
                                </span>
                                <Badge variant="secondary" className="text-[10px] h-4">
                                  {totalGeneralAlternatives}
                                </Badge>
                              </div>

                              {/* General backup options - same indentation as activities */}
                              <div className="ml-5">
                                {(general.length > 0 || segmentAlts.length > 0) && (
                                  <>
                                    {general.map((alt) => (
                                      <div
                                        key={alt.id}
                                        onClick={() => handleActivityClick(alt.id)}
                                        className={cn(
                                          "flex items-center gap-1 text-xs py-px px-1 rounded cursor-pointer transition-colors",
                                          selectedActivityId === alt.id
                                            ? "bg-primary/10 border border-primary/30"
                                            : "hover:bg-muted/50"
                                        )}
                                      >
                                        <span className="w-4 text-center shrink-0">
                                          <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                                        </span>
                                        <span className="truncate max-w-[240px]">{alt.name}</span>
                                      </div>
                                    ))}
                                    {segmentAlts.map((alt) => (
                                      <div
                                        key={alt.id}
                                        className={cn(
                                          "flex items-center gap-1 text-xs py-px px-1 rounded cursor-pointer transition-colors hover:bg-muted/50"
                                        )}
                                        onClick={() => {
                                          setSelectedSegmentId(segment.id);
                                          setSelectedActivityId(null);
                                        }}
                                      >
                                        <span className="w-4 text-center shrink-0">
                                          <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                                        </span>
                                        <span className="truncate max-w-[240px]">{alt.name}</span>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No segments yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Detail View */}
      <div className="flex-1 bg-background">
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
