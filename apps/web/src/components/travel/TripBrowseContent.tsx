"use client";

import React, { useMemo, useState } from "react";
import {
  parseLocalDate,
  getTimeBlockLabel,
} from "@/lib/api";
import type {
  Trip,
  TripActivity,
  TripAccommodation,
  TripDay,
  TripSegment,
  TripMedia,
} from "@singularity/shared-types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Calendar,
  Star,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Phone,
  Utensils,
  Mountain,
  Waves,
  Building2,
  Car,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Baby,
  AlertTriangle,
  Ticket,
  Image as ImageIcon,
  BookOpen,
  Lightbulb,
  History,
  Eye,
  Backpack,
  Columns,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  CheckCircle,
  AlertCircle,
  ArrowLeftRight,
  Link2,
  Timer,
  StickyNote,
  Footprints,
  Plane,
  Coffee,
  BedDouble,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DayRouteMap } from "@/components/travel/DayRouteMap";
import { ActivityPhotoCarousel } from "@/components/travel/ActivityPhotoCarousel";

// ─── Time-of-day color system ────────────────────────────────────────
function getTimeColor(time: string | null | undefined) {
  if (!time) return { bgHex: "#9ca3af", label: "", icon: <Clock className="h-3 w-3" /> };
  const h = parseInt(time.split(":")[0], 10);
  if (h < 7)  return { bgHex: "#3730a3", label: "Early",     icon: <Moon className="h-3 w-3" /> };
  if (h < 9)  return { bgHex: "#d97706", label: "Dawn",      icon: <Sunrise className="h-3 w-3" /> };
  if (h < 12) return { bgHex: "#ca8a04", label: "Morning",   icon: <Sun className="h-3 w-3" /> };
  if (h < 14) return { bgHex: "#ea580c", label: "Midday",    icon: <Sun className="h-3 w-3" /> };
  if (h < 17) return { bgHex: "#d97706", label: "Afternoon", icon: <Sun className="h-3 w-3" /> };
  if (h < 19) return { bgHex: "#c2410c", label: "Sunset",    icon: <Sunset className="h-3 w-3" /> };
  if (h < 21) return { bgHex: "#7e22ce", label: "Evening",   icon: <Sunset className="h-3 w-3" /> };
  return      { bgHex: "#312e81", label: "Night",     icon: <Moon className="h-3 w-3" /> };
}

function formatTimeAmPm(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// ─── Hotel reference resolution ──────────────────────────────────────
function resolveHotelReference(text: string, accommodationName?: string): { text: string; hasHotelRef: boolean } {
  if (!accommodationName) return { text, hasHotelRef: false };
  const regex = /\bhotel\b/gi;
  if (!regex.test(text)) return { text, hasHotelRef: false };
  return { text: text.replace(/\bhotel\b/gi, accommodationName), hasHotelRef: true };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}

// ─── Travel hint helpers ────────────────────────────────────────────
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getActivityCoords(
  activity: TripActivity,
  accommodation?: TripAccommodation,
): { lat: number; lng: number } | null {
  if (activity.latitude && activity.longitude) return { lat: activity.latitude, lng: activity.longitude };
  // Fallback: hotel-related activities use accommodation coordinates
  if (accommodation?.latitude && accommodation?.longitude) {
    const loc = (activity.location_name || "").toLowerCase();
    const name = activity.name.toLowerCase();
    if (/hotel|hyatt|accommodation|resort|pool|check.?in|check.?out/i.test(loc + " " + name)) {
      return { lat: accommodation.latitude, lng: accommodation.longitude };
    }
  }
  return null;
}

function estimateTravel(
  from: TripActivity, to: TripActivity,
  accommodation?: TripAccommodation,
): { mode: "walk" | "drive"; distanceKm: number; minutes: number } | null {
  const fromCoords = getActivityCoords(from, accommodation);
  const toCoords = getActivityCoords(to, accommodation);
  if (!fromCoords || !toCoords) return null;
  const dist = haversineDistanceKm(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
  if (dist < 0.1) return null; // Same location (~100m)
  if (dist > 50) return null; // Too far for a local travel hint (>50km)
  const mode = dist < 1.5 ? "walk" as const : "drive" as const;
  const speedKmh = mode === "walk" ? 5 : 40;
  const minutes = Math.max(Math.round((dist / speedKmh) * 60), 1);
  return { mode, distanceKm: dist, minutes };
}

function TravelHint({ estimate }: { estimate: { mode: "walk" | "drive"; distanceKm: number; minutes: number } }) {
  const icon = estimate.mode === "walk" ? "\u{1F6B6}" : "\u{1F697}";
  const label = estimate.mode === "walk" ? "walk" : "drive";
  return (
    <div className="flex items-center justify-center py-1 text-xs text-muted-foreground" data-testid="travel-hint">
      <span className="opacity-40">&middot; &middot; &middot;</span>
      <span className="mx-2">{icon} {estimate.minutes} min {label}</span>
      <span className="opacity-40">&middot; &middot; &middot;</span>
    </div>
  );
}

// ─── Time gap helper — infer duration from gap to next activity ─────
function inferEndTimeFromNext(activity: TripActivity, nextActivity?: TripActivity): string | null {
  if (!activity.start_time || !nextActivity?.start_time) return null;
  if (activity.end_time || activity.duration_minutes) return null; // Already has explicit timing
  return nextActivity.start_time;
}

function getTransportColor(subType?: string): { bg: string; text: string; border: string } {
  switch (subType) {
    case "walking":
      return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-300 dark:border-emerald-700" };
    case "flight":
      return { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-800 dark:text-sky-200", border: "border-sky-300 dark:border-sky-700" };
    case "ferry":
      return { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-800 dark:text-cyan-200", border: "border-cyan-300 dark:border-cyan-700" };
    case "train":
      return { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-800 dark:text-purple-200", border: "border-purple-300 dark:border-purple-700" };
    default: // local, long_haul, etc.
      return { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-700 dark:text-slate-200", border: "border-slate-300 dark:border-slate-600" };
  }
}

const SEGMENT_COLORS = [
  { bg: "bg-emerald-600", bgLight: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  { bg: "bg-blue-600", bgLight: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400" },
  { bg: "bg-amber-600", bgLight: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400" },
  { bg: "bg-purple-600", bgLight: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400" },
  { bg: "bg-rose-600", bgLight: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400" },
  { bg: "bg-cyan-600", bgLight: "bg-cyan-50 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-400" },
  { bg: "bg-orange-600", bgLight: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400" },
  { bg: "bg-indigo-600", bgLight: "bg-indigo-50 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-400" },
];

function ActivityTypeIcon({ type, subType, className }: { type: string; subType?: string; className?: string }) {
  const c = className || "h-5 w-5";
  // Sub-type specific icons
  if (subType) {
    switch (subType) {
      case "hike": return <Mountain className={c} />;
      case "beach": return <Waves className={c} />;
      case "museum": return <Building2 className={c} />;
      case "viewpoint": return <Eye className={c} />;
      case "tour": return <Ticket className={c} />;
      case "walking": return <Footprints className={c} />;
      case "long_haul": return <Car className={c} />;
      case "flight": return <Plane className={c} />;
      case "coffee": return <Coffee className={c} />;
      case "pool": return <Waves className={c} />;
      case "check_in": case "check_out": return <BedDouble className={c} />;
      case "packing": return <Backpack className={c} />;
    }
  }
  // Category-level icons
  switch (type) {
    case "restaurant": return <Utensils className={c} />;
    case "activity":   return <Star className={c} />;
    case "transport":  return <Car className={c} />;
    case "downtime":   return <Moon className={c} />;
    case "logistics":  return <ClipboardList className={c} />;
    // Legacy
    case "hike":       return <Mountain className={c} />;
    case "beach":      return <Waves className={c} />;
    case "museum":     return <Building2 className={c} />;
    default:           return <MoreHorizontal className={c} />;
  }
}

function PriceLevel({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center">
      {Array.from({ length: 4 }).map((_, i) => (
        <DollarSign key={i} className={cn("h-3 w-3", i < level ? "text-green-600" : "text-muted-foreground/30")} />
      ))}
    </span>
  );
}

// All-photos gallery (right column on desktop, inline on mobile).
// Backed by ActivityPhotoCarousel which renders the right shape
// for the surrounding context.

// ─── Transport bar — compact colored bar for travel activities ────────
function TransportBar({
  activity,
  previousActivity,
  accommodation,
  segmentLocationName,
  lodgingHref,
}: {
  activity: TripActivity;
  previousActivity?: TripActivity;
  accommodation?: TripAccommodation;
  segmentLocationName?: string;
  lodgingHref?: string;
}) {
  const tc = getTimeColor(activity.start_time);
  const transportColors = getTransportColor(activity.activity_sub_type);

  // Determine from/to
  const fromRaw = previousActivity?.location_name || accommodation?.name || segmentLocationName || "";
  const toRaw = activity.location_name || "";
  const fromResolved = accommodation ? resolveHotelReference(fromRaw, accommodation.name) : { text: fromRaw, hasHotelRef: false };
  const toResolved = accommodation ? resolveHotelReference(toRaw, accommodation.name) : { text: toRaw, hasHotelRef: false };

  // Duration display
  const durationText = activity.duration_minutes ? formatDuration(activity.duration_minutes) : null;

  // Time display
  const timeStr = activity.start_time ? formatTimeAmPm(activity.start_time) : null;
  const endTimeStr = activity.end_time
    ? formatTimeAmPm(activity.end_time)
    : activity.start_time && activity.duration_minutes
      ? formatTimeAmPm(computeEndTime(activity.start_time, activity.duration_minutes))
      : null;

  const fromDisplay = fromResolved.text;
  const toDisplay = toResolved.text;

  return (
    <div className="flex gap-0" data-testid="transport-bar">
      {/* Timeline spacer for desktop alignment */}
      <div className="hidden md:flex flex-col items-center w-3 shrink-0">
        <div className="flex-1 w-1 rounded-full bg-muted-foreground/20" />
      </div>

      <div className={cn(
        "flex-1 min-w-0 rounded-lg px-3 py-2 border",
        transportColors.bg, transportColors.border
      )}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Transport icon */}
          <div className={cn("shrink-0", transportColors.text)}>
            <ActivityTypeIcon type="transport" subType={activity.activity_sub_type} className="h-4 w-4" />
          </div>

          {/* From → To */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {fromDisplay && (
              <>
                <span className={cn("text-sm font-medium truncate max-w-[200px]", transportColors.text)}>
                  {fromResolved.hasHotelRef && lodgingHref ? (
                    <a href={lodgingHref} className="hover:underline">{fromDisplay}</a>
                  ) : fromDisplay}
                </span>
                <ArrowRight className={cn("h-3 w-3 shrink-0", transportColors.text)} />
              </>
            )}
            <span className={cn("text-sm font-medium truncate max-w-[200px]", transportColors.text)}>
              {toResolved.hasHotelRef && lodgingHref ? (
                <a href={lodgingHref} className="hover:underline">{toDisplay}</a>
              ) : toDisplay}
            </span>
          </div>

          {/* Duration + Time */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {durationText && (
              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/20", transportColors.text)}>
                {durationText}
              </span>
            )}
            {timeStr && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: tc.bgHex }}>
                {tc.icon}
                {timeStr}{endTimeStr && ` – ${endTimeStr}`}
              </span>
            )}
          </div>
        </div>

        {/* Description subtitle */}
        {activity.description && (
          <p className={cn("text-xs mt-1 opacity-80", transportColors.text)}>{activity.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Activity card — desktop: text left / photos right ───────────────
function BrowseActivityCard({
  activity,
  media,
  alternatives,
  allActivities,
  previousActivity,
  nextActivity,
  accommodation,
  lodgingHref,
  segmentLocationName,
  isFirstHotelRef,
}: {
  activity: TripActivity;
  media: Array<{ id: string; file_url: string; caption?: string | null; is_google_sourced?: boolean; approved?: boolean | null; google_attribution_name?: string | null }>;
  alternatives: TripActivity[];
  allActivities: TripActivity[];
  previousActivity?: TripActivity;
  nextActivity?: TripActivity;
  accommodation?: TripAccommodation;
  lodgingHref?: string;
  segmentLocationName?: string;
  isFirstHotelRef?: boolean;
}) {
  const isTransport = activity.activity_type === "transport";

  // Transport activities render as compact bars
  if (isTransport) {
    return (
      <TransportBar
        activity={activity}
        previousActivity={previousActivity}
        accommodation={accommodation}
        segmentLocationName={segmentLocationName}
        lodgingHref={lodgingHref}
      />
    );
  }

  const approvedPhotos = media.filter(m => !m.is_google_sourced || m.approved === true);
  const photos = approvedPhotos.length > 0 ? approvedPhotos : media.filter(m => !m.is_google_sourced || m.approved !== false);
  const tc = getTimeColor(activity.start_time);

  // Resolve hotel references in name and location
  const nameResolved = accommodation ? resolveHotelReference(activity.name, accommodation.name) : { text: activity.name, hasHotelRef: false };
  const locationResolved = accommodation ? resolveHotelReference(activity.location_name || "", accommodation.name) : { text: activity.location_name || "", hasHotelRef: false };
  const hasAnyHotelRef = nameResolved.hasHotelRef || locationResolved.hasHotelRef;

  // For generic meals with a specific venue, promote the venue name to the title
  const isGenericMeal = /^(breakfast|lunch|dinner)$/i.test(activity.name.trim());
  const hasSpecificVenue = locationResolved.text && !/^(hotel|accommodation|resort)\b/i.test(locationResolved.text.trim());
  const displayName = isGenericMeal && hasSpecificVenue ? locationResolved.text : nameResolved.text;
  const mealTypeBadge = isGenericMeal && hasSpecificVenue ? activity.name : null;
  const displayLocation = locationResolved.text;

  // Compute end time for time range display (explicit > duration-based > inferred from next)
  const explicitEndTimeStr = activity.end_time
    ? formatTimeAmPm(activity.end_time)
    : activity.start_time && activity.duration_minutes
      ? formatTimeAmPm(computeEndTime(activity.start_time, activity.duration_minutes))
      : null;
  const inferredEnd = inferEndTimeFromNext(activity, nextActivity);
  const endTimeStr = explicitEndTimeStr || (inferredEnd ? formatTimeAmPm(inferredEnd) : null);

  // Compute duration text to show inline with the time pill
  const effectiveDurationMinutes = activity.duration_minutes
    || (!explicitEndTimeStr && inferredEnd && activity.start_time
      ? (() => {
          const [sh, sm] = activity.start_time!.split(":").map(Number);
          const [eh, em] = inferredEnd.split(":").map(Number);
          return (eh * 60 + em) - (sh * 60 + sm);
        })()
      : activity.end_time && activity.start_time
        ? (() => {
            const [sh, sm] = activity.start_time!.split(":").map(Number);
            const [eh, em] = activity.end_time!.split(":").map(Number);
            return (eh * 60 + em) - (sh * 60 + sm);
          })()
        : null);
  const durationText = effectiveDurationMinutes && effectiveDurationMinutes > 0
    ? formatDuration(effectiveDurationMinutes) : null;

  // Find parent activity if this is an alternative
  const parentActivity = activity.alternate_to_activity_id
    ? allActivities.find(a => a.id === activity.alternate_to_activity_id)
    : null;

  return (
    <div className="flex gap-0" data-testid="browse-activity-card">
      {/* ── Left timeline color bar (desktop only) ── */}
      <div className="hidden md:flex flex-col items-center w-3 shrink-0" data-testid="timeline-strip">
        <div className="flex-1 w-2 rounded-full" style={{ backgroundColor: tc.bgHex, opacity: 0.6 }} />
      </div>

      {/* ── Card ── */}
      <div className="flex-1 min-w-0 border rounded-lg overflow-hidden bg-card">
        {/* Mobile time bar */}
        <div className="md:hidden flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: tc.bgHex }} data-testid="mobile-time-bar">
          {tc.icon}
          {activity.start_time ? formatTimeAmPm(activity.start_time) : ""}
          <span className="opacity-80 font-normal ml-1">{tc.label}</span>
          <span className="ml-auto opacity-80">
            <ActivityTypeIcon type={activity.activity_type || "activity"} subType={activity.activity_sub_type} className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Alternative banner */}
        {activity.is_backup && (
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <ArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">Alternative Activity</p>
                {parentActivity && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    <Link2 className="h-3 w-3 inline mr-1" />Replaces: <span className="font-medium">{parentActivity.name}</span>
                  </p>
                )}
                {activity.alternative_trigger && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Use when: {activity.alternative_trigger}</p>
                )}
                {activity.why_not_scheduled && (
                  <p className="text-xs text-muted-foreground mt-0.5">Why not scheduled: {activity.why_not_scheduled}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Desktop: two-column layout (text left, photos right) ── */}
        <div className="md:flex">
          {/* Left: all text content */}
          <div className="flex-1 min-w-0 p-3 md:p-4 space-y-2">
            {/* Header */}
            <div className="flex items-start gap-2">
              <div className="p-1.5 rounded-lg shrink-0 bg-primary/10">
                <ActivityTypeIcon type={activity.activity_type || "activity"} subType={activity.activity_sub_type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {activity.website ? (
                    <a href={activity.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors">
                      <h3 className="text-base md:text-lg font-semibold">{displayName}</h3>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ) : hasAnyHotelRef && lodgingHref ? (
                    <a href={lodgingHref} className="flex items-center gap-1 hover:text-primary transition-colors">
                      <h3 className="text-base md:text-lg font-semibold">{displayName}</h3>
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ) : (
                    <h3 className="text-base md:text-lg font-semibold">{displayName}</h3>
                  )}
                  {mealTypeBadge && (
                    <Badge variant="secondary" className="text-xs">
                      <Utensils className="h-3 w-3 mr-0.5" />{mealTypeBadge}
                    </Badge>
                  )}
                  {/* Google rating — hide on logistics/downtime/transport activities
                      (wake up, kids to bed, nap, rest, pool time, packing, transfers)
                      since those should never inherit a real place's rating */}
                  {activity.google_rating && !["logistics", "downtime", "transport"].includes(activity.activity_type || "") && (
                    activity.google_maps_url ? (
                      <a href={activity.google_maps_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{activity.google_rating}</span>
                        {activity.google_review_count && <span className="text-xs text-muted-foreground">({activity.google_review_count.toLocaleString()})</span>}
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{activity.google_rating}</span>
                        {activity.google_review_count && <span className="text-xs text-muted-foreground">({activity.google_review_count.toLocaleString()})</span>}
                      </span>
                    )
                  )}
                  {activity.google_price_level && <PriceLevel level={activity.google_price_level} />}
                  {activity.start_time && (
                    activity.opening_hours?.weekday_text ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white transition-opacity hover:opacity-80 cursor-pointer"
                            style={{ backgroundColor: tc.bgHex }} data-testid="activity-time-range">
                            {tc.icon}
                            {formatTimeAmPm(activity.start_time)}{endTimeStr && ` – ${endTimeStr}`}
                            {durationText && <>&nbsp;<span className="opacity-80 font-normal">· {durationText}</span></>}
                            {activity.opening_hours.open_now !== undefined && (
                              <span className={cn("ml-0.5 w-1.5 h-1.5 rounded-full", activity.opening_hours.open_now ? "bg-green-400" : "bg-red-400")} />
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Hours of Operation</span>
                              {activity.opening_hours.open_now !== undefined && (
                                <Badge variant={activity.opening_hours.open_now ? "default" : "secondary"} className={cn("text-xs", activity.opening_hours.open_now && "bg-green-600")}>
                                  {activity.opening_hours.open_now ? "Open" : "Closed"}
                                </Badge>
                              )}
                            </div>
                            {activity.opening_hours.weekday_text.map((line, i) => (
                              <p key={i} className="text-xs text-muted-foreground">{line}</p>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: tc.bgHex }} data-testid="activity-time-range">
                        {tc.icon}
                        {formatTimeAmPm(activity.start_time)}{endTimeStr && ` – ${endTimeStr}`}
                        {durationText && <>&nbsp;<span className="opacity-80 font-normal">· {durationText}</span></>}
                      </span>
                    )
                  )}
                  {activity.booking_url && (
                    <a href={activity.booking_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline">
                      <Ticket className="h-3.5 w-3.5" />Book<ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                {/* Address + Phone */}
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {(activity.address || displayLocation) && (
                    <a href={activity.google_maps_url || `https://maps.google.com/maps?q=${encodeURIComponent(activity.address || displayLocation || '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <MapPin className="h-3 w-3" />
                      <span className="hover:underline">
                        {activity.address || (!mealTypeBadge ? displayLocation : "")}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {activity.phone && (
                    <a href={`tel:${activity.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <Phone className="h-3 w-3" />{activity.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Status badges row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activity.priority && (
                <Badge variant={activity.priority === "must_do" ? "default" : "outline"} className="text-xs">
                  {activity.priority.replace("_", " ")}
                </Badge>
              )}
              {activity.cost_estimate && (
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  {activity.cost_estimate}{activity.cost_currency && ` ${activity.cost_currency}`}
                </Badge>
              )}
              {/* Duration is now shown inline in the time pill */}
              {activity.reservation_required && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                  <Ticket className="h-3 w-3 mr-0.5" />Reservation
                </Badge>
              )}
              {activity.confirmation_status === "confirmed" && (
                <Badge className="text-xs bg-green-600"><CheckCircle className="h-3 w-3 mr-0.5" />Confirmed</Badge>
              )}
              {activity.reservation_required && activity.confirmation_status !== "confirmed" && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />Book Now!
                </Badge>
              )}
              {activity.alltrails_url && (
                <a href={activity.alltrails_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Mountain className="h-3 w-3" />AllTrails<ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {/* Restaurant attribute badges — only for actual restaurant activities, so
                  sleep/wake/pool/transit activities at hotels don't inherit hotel-restaurant chips */}
              {activity.activity_type === "restaurant" && (
                <>
                  {activity.outdoor_seating && <Badge variant="outline" className="text-xs">Outdoor Seating</Badge>}
                  {activity.good_for_children && <Badge variant="outline" className="text-xs">Kid-Friendly</Badge>}
                  {activity.good_for_groups && <Badge variant="outline" className="text-xs">Good for Groups</Badge>}
                  {activity.serves_vegetarian && <Badge variant="outline" className="text-xs">Vegetarian Options</Badge>}
                  {activity.serves_wine && <Badge variant="outline" className="text-xs">Wine</Badge>}
                  {activity.serves_cocktails && <Badge variant="outline" className="text-xs">Cocktails</Badge>}
                  {activity.reservable && !activity.reservation_required && <Badge variant="outline" className="text-xs">Reservable</Badge>}
                </>
              )}
            </div>

            {/* Hotel info card — shown only on first hotel reference per segment */}
            {isFirstHotelRef && accommodation && (
              <div className="text-sm p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Building2 className="h-4 w-4" /> {accommodation.name}
                  {accommodation.google_rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {accommodation.google_rating}
                    </span>
                  )}
                </div>
                {accommodation.address && (
                  <a href={`https://maps.google.com/maps?q=${encodeURIComponent(accommodation.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    <MapPin className="h-3 w-3" />{accommodation.address}<ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {accommodation.check_in_time && <span>Check-in: {accommodation.check_in_time}</span>}
                  {accommodation.check_out_time && <span>Check-out: {accommodation.check_out_time}</span>}
                  {accommodation.nights && <span>{accommodation.nights} nights</span>}
                </div>
                {accommodation.room_type && <div className="text-xs">Room: {accommodation.room_type}</div>}
                {(accommodation.loyalty_program || accommodation.points_used) && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {accommodation.loyalty_program && <Badge variant="outline" className="text-xs">{accommodation.loyalty_program}</Badge>}
                    {accommodation.points_used && <span className="text-muted-foreground">{accommodation.points_used.toLocaleString()} pts</span>}
                  </div>
                )}
                {accommodation.amenities && accommodation.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {accommodation.amenities.map((a: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  {accommodation.website && (
                    <a href={accommodation.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Globe className="h-3 w-3" />Website<ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {accommodation.phone && (
                    <a href={`tel:${accommodation.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <Phone className="h-3 w-3" />{accommodation.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Editorial summary from Google */}
            {activity.google_editorial_summary && (
              <p className="text-sm text-muted-foreground italic">{activity.google_editorial_summary}</p>
            )}

            <Separator />

            {/* Description */}
            {activity.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
            )}

            {/* Why It's Great */}
            {activity.why_its_great && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-0.5"><Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Why It's Great</div>
                <p className="text-muted-foreground">{activity.why_its_great}</p>
              </div>
            )}

            {/* Deep-dive educational content (What It Is / Why It Matters / The Story /
                Interesting Facts / What You'll See) — suppress for transit/logistics/
                downtime activities. A 5-minute transit walk or a nap should not carry a
                historical deep-dive (those are leaked from nearby POIs during import). */}
            {!["transport", "logistics", "downtime"].includes(activity.activity_type || "") && (
              <>
                {/* Deep Dive - What It Is */}
                {(activity as any).deep_dive?.what_it_is && (
                  <div className="text-sm">
                    <div className="flex items-center gap-1.5 font-medium mb-0.5"><BookOpen className="h-3.5 w-3.5" /> What It Is</div>
                    <p className="text-muted-foreground">{(activity as any).deep_dive.what_it_is}</p>
                  </div>
                )}

                {/* Deep Dive - Why It Matters */}
                {((activity as any).deep_dive?.why_it_matters?.content || (typeof (activity as any).deep_dive?.why_it_matters === 'string' && (activity as any).deep_dive?.why_it_matters)) && (
                  <div className="text-sm">
                    <div className="flex items-center gap-1.5 font-medium mb-0.5"><Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Why It Matters</div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {typeof (activity as any).deep_dive.why_it_matters === 'string' ? (activity as any).deep_dive.why_it_matters : (activity as any).deep_dive.why_it_matters.content}
                    </div>
                  </div>
                )}

                {/* Deep Dive - The Story */}
                {((activity as any).deep_dive?.the_story?.content || (typeof (activity as any).deep_dive?.the_story === 'string' && (activity as any).deep_dive?.the_story)) && (
                  <div className="text-sm">
                    <div className="flex items-center gap-1.5 font-medium mb-0.5"><History className="h-3.5 w-3.5" /> The Story</div>
                    <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {typeof (activity as any).deep_dive.the_story === 'string' ? (activity as any).deep_dive.the_story : (activity as any).deep_dive.the_story.content}
                    </div>
                  </div>
                )}

                {/* Deep Dive - Interesting Facts */}
                {(activity as any).deep_dive?.interesting_facts && (activity as any).deep_dive.interesting_facts.length > 0 && (
                  <div className="text-sm">
                    <div className="font-medium mb-0.5">Interesting Facts</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      {(activity as any).deep_dive.interesting_facts.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}

                {/* Deep Dive - What You'll See — also require that at least one area has
                    a name or non-empty highlights, so we don't render an empty header */}
                {(() => {
                  const wys = (activity as any).deep_dive?.what_youll_see;
                  const hasContent = Array.isArray(wys) && wys.some((a: any) =>
                    (a?.name && String(a.name).trim().length > 0) ||
                    (Array.isArray(a?.highlights) && a.highlights.length > 0)
                  );
                  if (!hasContent) return null;
                  return (
                    <div className="text-sm">
                      <div className="flex items-center gap-1.5 font-medium mb-0.5"><Eye className="h-3.5 w-3.5" /> What You'll See</div>
                      <div className="space-y-1.5">
                        {wys.map((area: any, idx: number) => {
                          if (!area?.name && !(area?.highlights?.length)) return null;
                          return (
                            <div key={idx} className="p-2 bg-muted/50 rounded">
                              {area.name && <p className="font-medium text-sm">{area.name}</p>}
                              {area.highlights?.map((h: any, hIdx: number) => (
                                <div key={hIdx} className="ml-3 mt-0.5">
                                  {h.name && <p className="text-xs font-medium">{h.name}</p>}
                                  {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Photo spots */}
            {(activity as any).deep_dive?.photo_spots && (activity as any).deep_dive.photo_spots.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-0.5">Photo Spots</div>
                {(activity as any).deep_dive.photo_spots.map((spot: any, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 text-muted-foreground text-xs">
                    <ImageIcon className="h-3 w-3 shrink-0 mt-0.5 text-purple-500" />
                    {spot.name}{spot.tip && ` — ${spot.tip}`}
                  </div>
                ))}
              </div>
            )}

            {/* Legacy deep dive content */}
            {activity.deep_dive_content && !(activity as any).deep_dive && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-0.5"><BookOpen className="h-3.5 w-3.5" /> Background</div>
                <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{activity.deep_dive_content}</div>
              </div>
            )}

            {/* Historical Context */}
            {activity.historical_context && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-0.5"><History className="h-3.5 w-3.5" /> History</div>
                <p className="text-muted-foreground leading-relaxed">{activity.historical_context}</p>
              </div>
            )}

            {/* Architecture Notes */}
            {activity.architecture_notes && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-0.5"><Columns className="h-3.5 w-3.5" /> Architecture</div>
                <p className="text-muted-foreground leading-relaxed">{activity.architecture_notes}</p>
              </div>
            )}

            {/* What to See */}
            {activity.what_to_see && activity.what_to_see.length > 0 && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-0.5"><Eye className="h-3.5 w-3.5" /> What to See</div>
                <div className="space-y-1">
                  {activity.what_to_see.map((item, i) => (
                    <div key={i} className="p-2 bg-muted/50 rounded">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      {item.location_hint && <p className="text-xs text-primary mt-0.5">Location: {item.location_hint}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kid friendliness (string) + rating */}
            {activity.kid_friendliness && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-0.5">
                  <Baby className="h-3.5 w-3.5 text-pink-500" /> Kid Friendliness
                  {activity.kid_rating && (
                    <span className="flex items-center gap-0.5 ml-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < activity.kid_rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                      ))}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground">{activity.kid_friendliness}</p>
              </div>
            )}

            {/* Kid Engagement - 3 columns on desktop for named children */}
            {activity.kid_engagement && (
              <div className="text-sm">
                <div className="flex items-center gap-1.5 font-medium mb-1"><Baby className="h-3.5 w-3.5" /> Kid Engagement</div>
                {/* Named children in 3-col grid on desktop */}
                {((activity.kid_engagement as any).parker?.scripts?.length > 0 ||
                  (activity.kid_engagement as any).charlotte?.scripts?.length > 0 ||
                  (activity.kid_engagement as any).xander?.scripts?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    {(activity.kid_engagement as any).parker?.scripts?.length > 0 && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge className="bg-blue-600 text-xs">Parker</Badge>
                          {(activity.kid_engagement as any).parker.age_at_trip && (
                            <span className="text-xs text-muted-foreground">Age {(activity.kid_engagement as any).parker.age_at_trip}</span>
                          )}
                        </div>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {(activity.kid_engagement as any).parker.scripts.map((s: string, i: number) => (
                            <li key={i} className="italic text-xs">"{s}"</li>
                          ))}
                        </ul>
                        {(activity.kid_engagement as any).parker.activities && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {(activity.kid_engagement as any).parker.activities.map((a: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(activity.kid_engagement as any).charlotte?.scripts?.length > 0 && (
                      <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge className="bg-pink-600 text-xs">Charlotte</Badge>
                          {(activity.kid_engagement as any).charlotte.age_at_trip && (
                            <span className="text-xs text-muted-foreground">Age {(activity.kid_engagement as any).charlotte.age_at_trip}</span>
                          )}
                        </div>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {(activity.kid_engagement as any).charlotte.scripts.map((s: string, i: number) => (
                            <li key={i} className="italic text-xs">"{s}"</li>
                          ))}
                        </ul>
                        {(activity.kid_engagement as any).charlotte.activities && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {(activity.kid_engagement as any).charlotte.activities.map((a: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {(activity.kid_engagement as any).xander?.scripts?.length > 0 && (
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge className="bg-green-600 text-xs">Xander</Badge>
                          {(activity.kid_engagement as any).xander.age_at_trip && (
                            <span className="text-xs text-muted-foreground">Age {(activity.kid_engagement as any).xander.age_at_trip}</span>
                          )}
                          {(activity.kid_engagement as any).xander.carrier_needed && (
                            <span className="text-xs text-amber-600">Carrier</span>
                          )}
                        </div>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {(activity.kid_engagement as any).xander.scripts.map((s: string, i: number) => (
                            <li key={i} className="italic text-xs">"{s}"</li>
                          ))}
                        </ul>
                        {(activity.kid_engagement as any).xander.attention_span && (
                          <p className="text-xs text-amber-600 mt-1">{(activity.kid_engagement as any).xander.attention_span}</p>
                        )}
                        {(activity.kid_engagement as any).xander.activities && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {(activity.kid_engagement as any).xander.activities.map((a: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Conversation starters + Games */}
                {(activity.kid_engagement as any).conversation_starters?.length > 0 && (
                  <div className="mb-1"><Badge variant="outline" className="text-xs mb-0.5">Conversation Starters</Badge>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">{(activity.kid_engagement as any).conversation_starters.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {(activity.kid_engagement as any).games?.length > 0 && (
                  <div className="mb-1"><Badge variant="outline" className="text-xs mb-0.5">Games</Badge>
                    <ul className="list-disc list-inside text-xs text-muted-foreground">{(activity.kid_engagement as any).games.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
                  </div>
                )}
                {/* Legacy age-based */}
                {activity.kid_engagement.age_7?.length ? <div><Badge variant="secondary" className="text-xs mb-0.5">Age 7+</Badge><ul className="list-disc list-inside text-xs text-muted-foreground">{activity.kid_engagement.age_7.map((t, i) => <li key={i}>{t}</li>)}</ul></div> : null}
                {activity.kid_engagement.age_5?.length ? <div><Badge variant="secondary" className="text-xs mb-0.5">Age 5</Badge><ul className="list-disc list-inside text-xs text-muted-foreground">{activity.kid_engagement.age_5.map((t, i) => <li key={i}>{t}</li>)}</ul></div> : null}
                {activity.kid_engagement.age_3?.length ? <div><Badge variant="secondary" className="text-xs mb-0.5">Age 3</Badge><ul className="list-disc list-inside text-xs text-muted-foreground">{activity.kid_engagement.age_3.map((t, i) => <li key={i}>{t}</li>)}</ul></div> : null}
                {activity.kid_engagement.general?.length ? <div><Badge variant="outline" className="text-xs mb-0.5">General</Badge><ul className="list-disc list-inside text-xs text-muted-foreground">{activity.kid_engagement.general.map((t, i) => <li key={i}>{t}</li>)}</ul></div> : null}
              </div>
            )}

            {/* Restaurant details — only on restaurant activities */}
            {activity.activity_type === "restaurant" && activity.restaurant_details && (
              <div className="text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 font-medium text-orange-800 dark:text-orange-300"><Utensils className="h-3.5 w-3.5" /> {activity.restaurant_details.cuisine_type || 'Restaurant'}</div>
                {/* Existing badges */}
                <div className="flex gap-1.5 flex-wrap">
                  {activity.restaurant_details.highchair && <Badge variant="secondary" className="text-[10px]">Highchair</Badge>}
                  {activity.restaurant_details.kids_menu && <Badge variant="secondary" className="text-[10px]">Kids Menu</Badge>}
                  {activity.restaurant_details.seating && <Badge variant="secondary" className="text-[10px]">{activity.restaurant_details.seating === 'both' ? 'Indoor & Outdoor' : activity.restaurant_details.seating === 'outdoor' ? 'Outdoor Seating' : 'Indoor'}</Badge>}
                  {activity.restaurant_details.dietary_options && activity.restaurant_details.dietary_options.length > 0 && activity.restaurant_details.dietary_options.map((opt, i) => <Badge key={i} variant="outline" className="text-[10px]">{opt}</Badge>)}
                </div>
                {/* Must-Try Dishes */}
                {activity.restaurant_details.signature_dishes && activity.restaurant_details.signature_dishes.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-medium text-xs text-orange-800 dark:text-orange-300">Must-Try Dishes</div>
                    {activity.restaurant_details.signature_dishes.map((dish, i) => (
                      <div key={i} className="p-1.5 bg-white dark:bg-gray-800 rounded ml-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-xs">{i + 1}. {dish.name}</span>
                          {dish.is_local_specialty && <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300">Local Specialty</Badge>}
                          {dish.kid_friendly && <Badge variant="secondary" className="text-[10px]">Kid-Friendly</Badge>}
                        </div>
                        {dish.description && <p className="text-xs text-muted-foreground mt-0.5 ml-3">{dish.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {/* Ambience */}
                {activity.restaurant_details.ambience && <div className="text-xs"><span className="font-medium">Vibe: </span><span className="text-muted-foreground">{activity.restaurant_details.ambience}</span></div>}
                {/* Local Insight */}
                {activity.restaurant_details.local_insight && (
                  <div className="text-xs p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded"><span className="font-medium text-amber-800 dark:text-amber-300">Local Insight: </span><span className="text-muted-foreground">{activity.restaurant_details.local_insight}</span></div>
                )}
                {/* Things to Know */}
                {activity.restaurant_details.things_to_know && (
                  <div className="text-xs"><span className="font-medium">Things to Know: </span><span className="text-muted-foreground">{activity.restaurant_details.things_to_know}</span></div>
                )}
                {/* Family Tips */}
                {activity.restaurant_details.family_tips && (
                  <div className="text-xs"><span className="font-medium">Family Tips: </span><span className="text-muted-foreground">{activity.restaurant_details.family_tips}</span></div>
                )}
                {/* Timing Tips */}
                {activity.restaurant_details.timing_tips && (
                  <div className="text-xs"><span className="font-medium">Timing: </span><span className="text-muted-foreground">{activity.restaurant_details.timing_tips}</span></div>
                )}
                {/* Reservation Tips */}
                {activity.restaurant_details.reservation_tips && (
                  <div className="text-xs"><span className="font-medium">Reservations: </span><span className="text-muted-foreground">{activity.restaurant_details.reservation_tips}</span></div>
                )}
              </div>
            )}

            {/* Practical details */}
            {activity.practical_details && (
              <div className="text-sm p-2 bg-muted/50 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 font-medium"><Timer className="h-3.5 w-3.5" /> Practical Details</div>
                <div className="grid grid-cols-2 gap-1">
                  {activity.practical_details.hours && <div><span className="text-muted-foreground">Hours:</span><p className="font-medium">{activity.practical_details.hours}</p></div>}
                  {activity.practical_details.time_needed && <div><span className="text-muted-foreground">Time needed:</span><p className="font-medium">{activity.practical_details.time_needed}</p></div>}
                </div>
                {activity.practical_details.cost_breakdown && (
                  <div className="flex flex-wrap gap-1">
                    {activity.practical_details.cost_breakdown.adults && <Badge variant="outline" className="text-xs">Adults: {activity.practical_details.cost_breakdown.adults}</Badge>}
                    {activity.practical_details.cost_breakdown.seniors && <Badge variant="outline" className="text-xs">Seniors: {activity.practical_details.cost_breakdown.seniors}</Badge>}
                    {activity.practical_details.cost_breakdown.kids && <Badge variant="outline" className="text-xs">Kids: {activity.practical_details.cost_breakdown.kids}</Badge>}
                    {activity.practical_details.cost_breakdown.under_x_free && <Badge variant="secondary" className="text-xs">{activity.practical_details.cost_breakdown.under_x_free}</Badge>}
                  </div>
                )}
                {(activity.practical_details as any).ticket_price && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 w-full"><Ticket className="h-3 w-3" />Ticket Prices:</span>
                    {(activity.practical_details as any).ticket_price.adult && <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30">Adult: {(activity.practical_details as any).ticket_price.adult}</Badge>}
                    {(activity.practical_details as any).ticket_price.child && <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">Child: {(activity.practical_details as any).ticket_price.child}</Badge>}
                    {(activity.practical_details as any).ticket_price.senior && <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30">Senior: {(activity.practical_details as any).ticket_price.senior}</Badge>}
                    {(activity.practical_details as any).ticket_price.family && <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30">Family: {(activity.practical_details as any).ticket_price.family}</Badge>}
                    {(activity.practical_details as any).ticket_price.free_under_age && <Badge variant="secondary" className="text-xs">Free under {(activity.practical_details as any).ticket_price.free_under_age}</Badge>}
                    {(activity.practical_details as any).ticket_price.source && <span className="text-[10px] text-muted-foreground w-full">Source: {(activity.practical_details as any).ticket_price.source}</span>}
                  </div>
                )}
                {activity.practical_details.best_times && activity.practical_details.best_times.length > 0 && (
                  <div><span className="text-muted-foreground">Best times: </span><span className="font-medium">{activity.practical_details.best_times.join(", ")}</span></div>
                )}
                {activity.practical_details.avoid_times && activity.practical_details.avoid_times.length > 0 && (
                  <div><span className="text-muted-foreground">Avoid: </span><span className="font-medium text-amber-600">{activity.practical_details.avoid_times.join(", ")}</span></div>
                )}
                {activity.practical_details.getting_there && (
                  <div><span className="text-muted-foreground">Getting there: </span><span className="font-medium">{activity.practical_details.getting_there}</span></div>
                )}
                {activity.practical_details.combo_tickets && (
                  <div><span className="text-muted-foreground">Combo: </span><span className="font-medium">{activity.practical_details.combo_tickets}</span></div>
                )}
              </div>
            )}

            {/* Accessibility */}
            {activity.accessibility_info && (
              <div className="text-sm flex items-start gap-2 flex-wrap">
                {activity.accessibility_info.stroller_friendly !== undefined && (
                  <Badge variant={activity.accessibility_info.stroller_friendly ? "default" : "secondary"} className="text-xs">
                    {activity.accessibility_info.stroller_friendly ? "Stroller Friendly" : "Strollers Difficult"}
                  </Badge>
                )}
                {activity.accessibility_info.notes && <span className="text-muted-foreground text-xs">{activity.accessibility_info.notes}</span>}
                {activity.accessibility_info.alternatives && <span className="text-xs text-muted-foreground"><span className="font-medium">Alt: </span>{activity.accessibility_info.alternatives}</span>}
              </div>
            )}

            {/* Gear */}
            {activity.gear_prep && (
              <div className="text-sm flex items-start gap-1.5">
                <Backpack className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div><span className="font-medium">What to Bring: </span><span className="text-muted-foreground">{activity.gear_prep}</span></div>
              </div>
            )}

            {/* Warnings */}
            {activity.warnings && activity.warnings.length > 0 && (
              <div className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400 mb-0.5"><AlertTriangle className="h-3.5 w-3.5" /> Warnings</div>
                <ul className="list-disc list-inside text-red-600 dark:text-red-300 text-xs space-y-0.5">{activity.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}

            {/* Reservation */}
            {activity.reservation_required && (
              <div className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400"><Ticket className="h-3.5 w-3.5" /> Reservation Required</div>
                {activity.reservation_details && <p className="text-muted-foreground text-xs mt-0.5">{activity.reservation_details}</p>}
                {activity.confirmation_number && (
                  <p className="text-xs mt-1"><span className="font-medium">Confirmation: </span><code className="bg-muted px-1 rounded">{activity.confirmation_number}</code></p>
                )}
              </div>
            )}

            {/* Tips */}
            {activity.tips && (
              <div className="text-sm"><span className="font-medium">Tips: </span><span className="text-muted-foreground">{activity.tips}</span></div>
            )}

            {/* Notes */}
            {activity.notes && (
              <div className="text-sm p-2 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-1.5 font-medium mb-0.5"><StickyNote className="h-3.5 w-3.5" /> Notes</div>
                <p className="text-muted-foreground text-xs">{activity.notes}</p>
              </div>
            )}

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <div className="text-sm border-t pt-2">
                <div className="flex items-center gap-1.5 font-medium mb-1"><ArrowLeftRight className="h-3.5 w-3.5 text-orange-500" /> Alternatives ({alternatives.length})</div>
                <div className="space-y-1.5">
                  {alternatives.map(alt => (
                    <div key={alt.id} className="p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                      <p className="font-medium text-xs">{alt.name}</p>
                      {alt.description && <p className="text-xs text-muted-foreground mt-0.5">{alt.description}</p>}
                      {alt.alternative_trigger && <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">When: {alt.alternative_trigger}</p>}
                      {alt.why_not_scheduled && <p className="text-xs text-muted-foreground mt-0.5">{alt.why_not_scheduled}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: photos (desktop only — 2-col grid) */}
          {photos.length > 0 && (
            <div className="hidden md:block w-[280px] lg:w-[340px] shrink-0 p-2 border-l">
              <ActivityPhotoCarousel
                photos={photos}
                activityName={activity.name}
                variant="grid"
              />
            </div>
          )}
        </div>

        {/* Mobile photos (below content) — swipe carousel */}
        {photos.length > 0 && (
          <div className="md:hidden p-2 border-t">
            <ActivityPhotoCarousel
              photos={photos}
              activityName={activity.name}
              variant="carousel"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main content component ──────────────────────────────────────────
type TripBrowseTrip = Trip & {
  segments: TripSegment[];
  accommodations: TripAccommodation[];
  days: TripDay[];
  activities: TripActivity[];
  media: TripMedia[];
};

export function TripBrowseContent({
  trip,
  tripId,
  lodgingHref,
}: {
  trip: TripBrowseTrip;
  tripId: string;
  /**
   * Where the in-card "hotel" / accommodation links should point.
   * Defaults to the dashboard lodging tab. Public share view passes
   * its own value (e.g. "" to disable, or "#lodging" for in-page tab).
   */
  lodgingHref?: string;
}) {
  const resolvedLodgingHref = lodgingHref ?? `/travel/${tripId}/lodging`;
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const daysBySegment = useMemo(() => {
    if (!trip?.days) return {};
    const grouped: Record<string, typeof trip.days> = {};
    const seen: Record<string, Set<string>> = {};
    for (const day of trip.days) {
      const sid = day.segment_id || "unassigned";
      if (!grouped[sid]) { grouped[sid] = []; seen[sid] = new Set(); }
      if (seen[sid].has(day.date)) continue;
      seen[sid].add(day.date);
      grouped[sid].push(day);
    }
    for (const sid of Object.keys(grouped))
      grouped[sid].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    return grouped;
  }, [trip?.days]);

  const activitiesByDay = useMemo(() => {
    if (!trip?.activities) return {};
    const grouped: Record<string, typeof trip.activities> = {};
    for (const a of trip.activities) {
      if (a.is_backup) continue;
      const did = a.day_id || "unassigned";
      if (!grouped[did]) grouped[did] = [];
      grouped[did].push(a);
    }
    for (const did of Object.keys(grouped))
      grouped[did].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return grouped;
  }, [trip?.activities]);

  const mediaByActivity = useMemo(() => {
    if (!trip?.media) return {};
    const grouped: Record<string, typeof trip.media> = {};
    for (const m of trip.media) {
      if (m.parent_type !== "activity") continue;
      if (!grouped[m.parent_id]) grouped[m.parent_id] = [];
      grouped[m.parent_id].push(m);
    }
    return grouped;
  }, [trip?.media]);

  // Build alternatives lookup: activityId -> alternatives[]
  const alternativesByActivity = useMemo(() => {
    if (!trip?.activities) return {};
    const map: Record<string, TripActivity[]> = {};
    for (const a of trip.activities) {
      if (a.alternate_to_activity_id) {
        if (!map[a.alternate_to_activity_id]) map[a.alternate_to_activity_id] = [];
        map[a.alternate_to_activity_id].push(a);
      }
    }
    return map;
  }, [trip?.activities]);

  const mediaByAccommodation = useMemo(() => {
    if (!trip?.media) return {};
    const grouped: Record<string, typeof trip.media> = {};
    for (const m of trip.media) {
      if (m.parent_type !== "accommodation") continue;
      if (!grouped[m.parent_id]) grouped[m.parent_id] = [];
      grouped[m.parent_id].push(m);
    }
    return grouped;
  }, [trip?.media]);

  const dayToGlobalNumber = useMemo(() => {
    if (!trip?.days) return {};
    const uniq = new Map<string, (typeof trip.days)[0]>();
    for (const d of trip.days) { if (!uniq.has(d.date)) uniq.set(d.date, d); }
    const sorted = Array.from(uniq.values()).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    const map: Record<string, number> = {};
    sorted.forEach((d, i) => { map[d.id] = i + 1; });
    return map;
  }, [trip?.days]);

  const segments = trip.segments || [];
  const activeSegment = segments[activeSegmentIndex];

  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground" data-testid="browse-empty">
        <div className="text-center"><MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" /><p className="text-lg">No segments yet</p></div>
      </div>
    );
  }

  const segmentDays = activeSegment ? daysBySegment[activeSegment.id] || [] : [];
  const colorSet = SEGMENT_COLORS[activeSegmentIndex % SEGMENT_COLORS.length];

  return (
    <div className="pb-8" data-testid="browse-page">
      {/* Segment tabs */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-hide" data-testid="segment-tabs">
          {segments.map((segment, index) => {
            const sc = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
            const isActive = index === activeSegmentIndex;
            const segDays = daysBySegment[segment.id] || [];
            return (
              <button key={segment.id} onClick={() => setActiveSegmentIndex(index)} data-testid={`segment-tab-${index}`}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0",
                  isActive ? `${sc.bg} text-white shadow-sm` : "bg-muted/50 text-muted-foreground hover:bg-muted")}>
                <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0", isActive ? "bg-white/20 text-white" : `${sc.bg} text-white`)}>{index + 1}</span>
                <span className="hidden sm:inline">{segment.name}</span>
                <span className="sm:hidden">{segment.name.length > 12 ? segment.name.slice(0, 12) + "..." : segment.name}</span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20" : "bg-muted")}>{segDays.length}d</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Segment header */}
      {activeSegment && (
        <div className={cn("px-4 py-3 border-b", colorSet.bgLight)} data-testid="segment-header">
          <div className="max-w-7xl mx-auto">
            <h2 className={cn("text-xl font-bold", colorSet.text)}>{activeSegment.name}</h2>
            <div className="flex items-center gap-3 flex-wrap mt-1 text-sm text-muted-foreground">
              {activeSegment.location_name && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeSegment.location_name}</span>}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {parseLocalDate(activeSegment.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {" - "}
                {parseLocalDate(activeSegment.end_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            {activeSegment.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{activeSegment.description}</p>}
            {(() => {
              const acc = trip?.accommodations?.find(a => a.segment_id === activeSegment.id);
              return acc ? (
                resolvedLodgingHref ? (
                  <a href={resolvedLodgingHref} className="inline-flex items-center gap-1.5 text-sm mt-1.5 text-primary hover:underline">
                    <Building2 className="h-3.5 w-3.5" />
                    {acc.name}
                    {acc.google_rating ? <span className="text-muted-foreground text-xs">({acc.google_rating})</span> : null}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm mt-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {acc.name}
                    {acc.google_rating ? <span className="text-xs">({acc.google_rating})</span> : null}
                  </span>
                )
              ) : null;
            })()}
            {activeSegment.theme && <p className="text-sm mt-1"><span className="font-medium">Theme: </span><span className="text-muted-foreground">{activeSegment.theme}</span></p>}
            {activeSegment.main_attractions && activeSegment.main_attractions.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {activeSegment.main_attractions.map((a: { name: string }, i: number) => <Badge key={i} variant="secondary" className="text-xs">{a.name}</Badge>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Days and activities */}
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-4 space-y-8">
        {(() => {
          const segmentAccommodation = trip?.accommodations?.find(a => a.segment_id === activeSegment?.id);
          // Track which accommodations have shown their full photos (first reference only)
          const shownAccommPhotos = new Set<string>();
          return segmentDays.map((day) => {
            const dayActivities = activitiesByDay[day.id] || [];
            const localDate = parseLocalDate(day.date);
            const globalDayNum = dayToGlobalNumber[day.id];

            // Day-level time range
            const dayTimes = dayActivities
              .filter(a => a.start_time)
              .map(a => {
                const endTime = a.end_time || (a.start_time && a.duration_minutes ? computeEndTime(a.start_time!, a.duration_minutes) : a.start_time);
                return { start: a.start_time!, end: endTime! };
              });
            const earliestTime = dayTimes.length > 0 ? dayTimes.reduce((min, t) => t.start < min ? t.start : min, dayTimes[0].start) : null;
            const latestTime = dayTimes.length > 0 ? dayTimes.reduce((max, t) => t.end > max ? t.end : max, dayTimes[0].end) : null;

            return (
              <div key={day.id} data-testid="browse-day">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-full flex flex-col items-center justify-center text-white shrink-0", colorSet.bg)}>
                    <span className="text-[10px] md:text-xs font-medium leading-none">{localDate.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="text-lg md:text-xl font-bold leading-none">{localDate.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">{day.title || `Day ${globalDayNum || day.day_number || ""}`}</h3>
                    <p className="text-sm text-muted-foreground">
                      {localDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      {day.theme && ` \u2014 ${day.theme}`}
                      {earliestTime && latestTime && earliestTime !== latestTime && (
                        <span className="ml-1" data-testid="day-time-range"> · {formatTimeAmPm(earliestTime)} – {formatTimeAmPm(latestTime)}</span>
                      )}
                    </p>
                  </div>
                </div>
                {day.overview && <p className="text-sm text-muted-foreground mb-3 ml-0 md:ml-[72px]">{day.overview}</p>}
                <div className="ml-0 md:ml-[72px]">
                  <DayRouteMap
                    activities={dayActivities}
                    accommodation={segmentAccommodation}
                    dayTitle={day.title || `Day ${globalDayNum || day.day_number || ""}`}
                  />
                </div>
                <div className="space-y-3 ml-0 md:ml-[72px]">
                  {dayActivities.length > 0 ? dayActivities.map((activity, idx) => {
                    // Hotel photo logic: only show full photos on first hotel reference per segment
                    const activityMedia = mediaByActivity[activity.id] || [];
                    const locAndName = ((activity.location_name || "") + " " + activity.name).toLowerCase();
                    const accommName = segmentAccommodation?.name?.toLowerCase() || "";
                    const isTransport = activity.activity_type === "transport";
                    const isHotelActivity = !isTransport && (
                      /\bhotel\b/i.test(locAndName)
                      || activity.activity_sub_type === "pool"
                      || activity.activity_sub_type === "check_in"
                      || activity.activity_sub_type === "check_out"
                      || /check.?in|check.?out|luggage/i.test(activity.name)
                      || (accommName && locAndName.includes(accommName))
                    );
                    const isPoolActivity = activity.activity_sub_type === "pool" || /\bpool\b/i.test(activity.name);
                    const isFirstHotelRef = isHotelActivity && segmentAccommodation
                      && !shownAccommPhotos.has(segmentAccommodation.id);

                    let effectiveMedia: typeof activityMedia;
                    if (activityMedia.length > 0) {
                      // Activity has its own photos — always use them
                      effectiveMedia = activityMedia;
                    } else if (isFirstHotelRef && segmentAccommodation) {
                      // First hotel reference — show full accommodation photos
                      effectiveMedia = mediaByAccommodation[segmentAccommodation.id] || [];
                      shownAccommPhotos.add(segmentAccommodation.id);
                    } else if (isPoolActivity && segmentAccommodation) {
                      // Pool activities — show max 2 accommodation photos
                      effectiveMedia = (mediaByAccommodation[segmentAccommodation.id] || []).slice(0, 2);
                    } else {
                      // Subsequent hotel references — no photos
                      effectiveMedia = [];
                    }

                    // Travel hint between non-transport activities at different locations
                    const prev = idx > 0 ? dayActivities[idx - 1] : null;
                    const showTravelHint = prev
                      && prev.activity_type !== "transport"
                      && activity.activity_type !== "transport";
                    const travelEstimate = showTravelHint && prev ? estimateTravel(prev, activity, segmentAccommodation) : null;

                    const next = idx < dayActivities.length - 1 ? dayActivities[idx + 1] : undefined;

                    return (
                      <React.Fragment key={activity.id}>
                        {travelEstimate && <TravelHint estimate={travelEstimate} />}
                        <BrowseActivityCard
                          activity={activity}
                          media={effectiveMedia}
                          alternatives={alternativesByActivity[activity.id] || []}
                          allActivities={trip.activities || []}
                          previousActivity={idx > 0 ? dayActivities[idx - 1] : undefined}
                          nextActivity={next}
                          accommodation={segmentAccommodation}
                          lodgingHref={resolvedLodgingHref}
                          segmentLocationName={activeSegment?.location_name}
                          isFirstHotelRef={!!isFirstHotelRef}
                        />
                      </React.Fragment>
                    );
                  }) : <p className="text-sm text-muted-foreground italic py-2">No activities planned</p>}
                </div>
              </div>
            );
          });
        })()}
        {segmentDays.length === 0 && <div className="text-center py-8 text-muted-foreground">No days planned for this segment yet</div>}
      </div>

      {/* Nav */}
      {segments.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between border-t mt-4">
          <Button variant="outline" disabled={activeSegmentIndex === 0}
            onClick={() => { setActiveSegmentIndex(activeSegmentIndex - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{activeSegmentIndex > 0 ? segments[activeSegmentIndex - 1].name : "Previous"}</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <span className="text-sm text-muted-foreground">{activeSegmentIndex + 1} / {segments.length}</span>
          <Button variant="outline" disabled={activeSegmentIndex === segments.length - 1}
            onClick={() => { setActiveSegmentIndex(activeSegmentIndex + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-2">
            <span className="hidden sm:inline">{activeSegmentIndex < segments.length - 1 ? segments[activeSegmentIndex + 1].name : "Next"}</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
