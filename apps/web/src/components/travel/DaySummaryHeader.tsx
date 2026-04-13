"use client";

import React from "react";
import type { TripActivity, TripDay, TripSegment, TripMedia, TripAccommodation } from "@singularity/shared-types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
  Star,
  Car,
  ClipboardList,
  Mountain,
  Waves,
  Building2,
  Eye,
  Ticket,
  Footprints,
  Plane,
  Coffee,
  BedDouble,
  Backpack,
  MoreHorizontal,
  MapPin,
  Calendar,
  Image as ImageIcon,
  ArrowLeftRight,
  GitBranch,
} from "lucide-react";
import {
  parseLocalDate,
  getActivityTypeIcon,
} from "@/lib/api";

// ─── EXACT COPY of formatTimeAmPm from details/page.tsx (lines 48-53) ────
function formatTimeAmPm(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ─── EXACT COPY of getTimeOfDayInfo from details/page.tsx (lines 56-99) ────
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

// ─── EXACT COPY of weekdayColors from details/page.tsx (lines 807-815) ────
const weekdayColors: Record<number, string> = {
  0: "bg-rose-600",    // Sun
  1: "bg-blue-600",    // Mon
  2: "bg-emerald-600", // Tue
  3: "bg-amber-600",   // Wed
  4: "bg-purple-600",  // Thu
  5: "bg-cyan-600",    // Fri
  6: "bg-orange-600",  // Sat
};

/**
 * Day section header — EXACT COPY of the Details left panel day rendering
 * (details/page.tsx lines 818-991) but always expanded, no click-to-select.
 * Shows: weekday badge, day title, date, then all activity rows with
 * enrichment indicators, route stops nested under drives, alternatives nested.
 */
export function DaySummaryHeader({
  day,
  activities,
  globalDayNum,
  segment,
  mediaByParent,
  alternativesByActivity,
  children,
}: {
  day: TripDay;
  activities: TripActivity[];
  globalDayNum?: number;
  segment: TripSegment;
  mediaByParent: Record<string, TripMedia[]>;
  alternativesByActivity: Record<string, TripActivity[]>;
  children?: React.ReactNode;
}) {
  const localDate = parseLocalDate(day.date);
  const dayOfWeek = localDate.getDay();
  const weekdayShort = localDate.toLocaleDateString("en-US", { weekday: "short" });

  // Group activities by time period for the 3-column header
  const morning: TripActivity[] = [];
  const afternoonEvening: TripActivity[] = [];
  for (const a of activities) {
    const h = a.start_time ? parseInt(a.start_time.split(":")[0], 10) : -1;
    if (h < 0 || h < 12) morning.push(a);
    else afternoonEvening.push(a);
  }

  return (
    <div className="rounded-lg border overflow-hidden mb-4">
      {/* ─── 3-column day summary header ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b">
        {/* Col 1: Day overview */}
        <div className="p-2.5 md:border-r bg-muted/30">
          <div className="flex items-center gap-2">
            <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium text-white", weekdayColors[dayOfWeek])}>
              {weekdayShort}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm">{day.title || `Day ${globalDayNum || day.day_number || ""}`}</span>
              <span className="text-muted-foreground text-xs ml-1.5">
                {localDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
          {day.theme && <p className="text-xs text-muted-foreground mt-1 italic">{day.theme}</p>}
          {day.overview && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{day.overview}</p>}
        </div>

        {/* Col 2: Morning */}
        <div className="md:border-r border-t md:border-t-0">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b bg-amber-50 dark:bg-amber-950/30">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Morning</span>
            {morning.length > 0 && <span className="text-[10px] text-muted-foreground ml-auto">{morning.length}</span>}
          </div>
          <div className="px-1 py-0.5">
            {morning.map(a => <MiniActivityRow key={a.id} activity={a} mediaByParent={mediaByParent} alternativesByActivity={alternativesByActivity} segment={segment} />)}
            {morning.length === 0 && <p className="text-[10px] text-muted-foreground/50 px-1 py-0.5">—</p>}
          </div>
        </div>

        {/* Col 3: Afternoon & Evening */}
        <div className="border-t md:border-t-0">
          <div className="flex items-center gap-1.5 px-2 py-1 border-b bg-orange-50 dark:bg-orange-950/30">
            <Sunset className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Afternoon & Evening</span>
            {afternoonEvening.length > 0 && <span className="text-[10px] text-muted-foreground ml-auto">{afternoonEvening.length}</span>}
          </div>
          <div className="px-1 py-0.5">
            {afternoonEvening.map(a => <MiniActivityRow key={a.id} activity={a} mediaByParent={mediaByParent} alternativesByActivity={alternativesByActivity} segment={segment} />)}
            {afternoonEvening.length === 0 && <p className="text-[10px] text-muted-foreground/50 px-1 py-0.5">—</p>}
          </div>
        </div>
      </div>

      {/* ─── Details-style compact list with enrichment indicators ─── */}
      <div className="px-2 py-1">
        {activities.length > 0 ? (
          <div className="ml-2">
            {activities.map((activity) => {
              const timeInfo = activity.start_time
                ? getTimeOfDayInfo(activity.start_time)
                : null;
              const activityMedia = mediaByParent[`activity-${activity.id}`] || [];
              const hasPhotos = activityMedia.length > 0;
              const hasAlternatives = !!alternativesByActivity[activity.id]?.length;

              // Route stops matching — EXACT COPY from details/page.tsx (lines 848-889)
              const isTransportActivity = activity.activity_type === 'transport';
              const activityNameLower = activity.name.toLowerCase();
              let routeStopsForActivity: typeof segment.route_stops = [];
              if (segment.route_stops) {
                const isDriveOrDepart = activityNameLower.includes('drive') ||
                                        activityNameLower.includes('depart') ||
                                        activityNameLower.includes('head to') ||
                                        isTransportActivity;
                if (isDriveOrDepart) {
                  routeStopsForActivity = segment.route_stops.filter(stop => {
                    if (stop.for_travel_segment?.scheduled_activity_name) {
                      const scheduledName = stop.for_travel_segment.scheduled_activity_name.toLowerCase();
                      return activityNameLower.includes(scheduledName.split(' ').slice(-2).join(' ')) ||
                             scheduledName.includes(activityNameLower.split(' ').slice(-2).join(' '));
                    }
                    const stopTo = stop.between?.to?.toLowerCase() || '';
                    if (!stopTo) return false;
                    if (activityNameLower.includes('cabo')) {
                      return stopTo.includes('sagres') || stopTo.includes('cabo');
                    }
                    if (activityNameLower.includes('sagres')) {
                      return stopTo.includes('sagres');
                    }
                    if (activityNameLower.includes('douro') && stopTo.includes('douro')) {
                      return true;
                    }
                    return false;
                  });
                }
              }

              return (
                <div key={activity.id}>
                  {/* ─── EXACT COPY of activity row from details/page.tsx (lines 893-937) ─── */}
                  <div className="flex items-center gap-1 text-xs py-px px-1 rounded hover:bg-muted/50 transition-colors">
                    <span className="w-4 text-center shrink-0">
                      {getActivityTypeIcon(activity.activity_type || "activity", activity.activity_sub_type)}
                    </span>
                    <span className="truncate max-w-[240px]">{activity.name}</span>
                    {/* Status icons — EXACT COPY (lines 907-928) */}
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
                    {/* Spacer */}
                    <span className="flex-1" />
                    {activity.start_time && timeInfo && (
                      <span className={cn("shrink-0 flex items-center gap-0.5", timeInfo.colorClass)}>
                        {timeInfo.icon}
                        {formatTimeAmPm(activity.start_time)}
                      </span>
                    )}
                  </div>

                  {/* ─── EXACT COPY of route stops from details/page.tsx (lines 939-961) ─── */}
                  {routeStopsForActivity && routeStopsForActivity.length > 0 && (
                    <div className="ml-5 border-l-2 border-blue-500/30 pl-2 my-0.5">
                      {routeStopsForActivity.map((stop) => (
                        <div
                          key={stop.id}
                          className="flex items-center gap-1 text-xs py-px px-1 rounded hover:bg-muted/50 text-muted-foreground"
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

                  {/* ─── EXACT COPY of alternatives from details/page.tsx (lines 963-989) ─── */}
                  {hasAlternatives && (
                    <div className="ml-5 border-l-2 border-orange-500/30 pl-2 my-0.5">
                      {(alternativesByActivity[activity.id] || []).map((alt) => (
                        <div
                          key={alt.id}
                          className="flex items-center gap-1 text-xs py-px px-1 rounded hover:bg-muted/50 text-muted-foreground"
                        >
                          <ArrowLeftRight className="h-3 w-3 text-orange-500 shrink-0" />
                          <span className="truncate">{alt.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic py-px ml-2">No activities planned</p>
        )}
      </div>

      {/* Route map rendered inside the same box */}
      {children && (
        <div className="border-t">
          {children}
        </div>
      )}
    </div>
  );
}

/** Compact activity row for the 4-column summary grid — same enrichment indicators + route stops + alternatives as Details */
function MiniActivityRow({ activity, mediaByParent, alternativesByActivity, segment }: {
  activity: TripActivity;
  mediaByParent: Record<string, TripMedia[]>;
  alternativesByActivity: Record<string, TripActivity[]>;
  segment: TripSegment;
}) {
  const timeInfo = activity.start_time ? getTimeOfDayInfo(activity.start_time) : null;
  const activityMedia = mediaByParent[`activity-${activity.id}`] || [];
  const hasPhotos = activityMedia.length > 0;
  const hasAlternatives = !!alternativesByActivity[activity.id]?.length;

  // Route stops — EXACT COPY from details/page.tsx (lines 848-889)
  const isTransportActivity = activity.activity_type === 'transport';
  const activityNameLower = activity.name.toLowerCase();
  let routeStopsForActivity: typeof segment.route_stops = [];
  if (segment.route_stops) {
    const isDriveOrDepart = activityNameLower.includes('drive') ||
                            activityNameLower.includes('depart') ||
                            activityNameLower.includes('head to') ||
                            isTransportActivity;
    if (isDriveOrDepart) {
      routeStopsForActivity = segment.route_stops.filter(stop => {
        if (stop.for_travel_segment?.scheduled_activity_name) {
          const scheduledName = stop.for_travel_segment.scheduled_activity_name.toLowerCase();
          return activityNameLower.includes(scheduledName.split(' ').slice(-2).join(' ')) ||
                 scheduledName.includes(activityNameLower.split(' ').slice(-2).join(' '));
        }
        const stopTo = stop.between?.to?.toLowerCase() || '';
        if (!stopTo) return false;
        if (activityNameLower.includes('cabo')) return stopTo.includes('sagres') || stopTo.includes('cabo');
        if (activityNameLower.includes('sagres')) return stopTo.includes('sagres');
        if (activityNameLower.includes('douro') && stopTo.includes('douro')) return true;
        return false;
      });
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1 text-xs py-px px-1">
        <span className="w-3.5 text-center shrink-0">
          {getActivityTypeIcon(activity.activity_type || "activity", activity.activity_sub_type)}
        </span>
        <span className="truncate">{activity.name}</span>
        {hasAlternatives && (
          <span className="shrink-0 text-blue-500"><ArrowLeftRight className="h-2.5 w-2.5" /></span>
        )}
        {activity.address && (
          <span className="shrink-0 text-green-500"><MapPin className="h-2.5 w-2.5" /></span>
        )}
        {activity.google_rating && (
          <span className="shrink-0 text-yellow-500 flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-yellow-500" />
            <span className="text-[10px]">{activity.google_rating}</span>
          </span>
        )}
        {hasPhotos && (
          <span className="shrink-0 text-purple-500 flex items-center gap-0.5">
            <ImageIcon className="h-2.5 w-2.5" /><span className="text-[10px]">{activityMedia.length}</span>
          </span>
        )}
        <span className="flex-1" />
        {activity.start_time && timeInfo && (
          <span className={cn("shrink-0 flex items-center gap-0.5 text-[10px]", timeInfo.colorClass)}>
            {timeInfo.icon}
            {formatTimeAmPm(activity.start_time)}
          </span>
        )}
      </div>

      {/* Route stops nested under transport — EXACT COPY from details/page.tsx (lines 939-961) */}
      {routeStopsForActivity && routeStopsForActivity.length > 0 && (
        <div className="ml-4 border-l-2 border-blue-500/30 pl-1.5 my-0.5">
          {routeStopsForActivity.map((stop) => (
            <div key={stop.id} className="flex items-center gap-1 text-[10px] py-px text-muted-foreground">
              <GitBranch className="h-2.5 w-2.5 text-blue-500 shrink-0" />
              <span className="truncate">{stop.name}</span>
              {stop.detour_time && (
                <span className="text-muted-foreground/70 shrink-0">+{stop.detour_time}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alternatives nested — EXACT COPY from details/page.tsx (lines 963-989) */}
      {hasAlternatives && (
        <div className="ml-4 border-l-2 border-orange-500/30 pl-1.5 my-0.5">
          {(alternativesByActivity[activity.id] || []).map((alt) => (
            <div key={alt.id} className="flex items-center gap-1 text-[10px] py-px text-muted-foreground">
              <ArrowLeftRight className="h-2.5 w-2.5 text-orange-500 shrink-0" />
              <span className="truncate">{alt.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
