"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MapPin,
  Calendar,
  Globe,
  Clock,
  Users,
  Coins,
  Languages,
  Thermometer,
  Building2,
  Car,
  Info,
  BookOpen,
  Lightbulb,
  Utensils,
  ShoppingBag,
  Music,
  Palette,
  History,
  GitBranch,
  ExternalLink,
  ArrowLeftRight,
} from "lucide-react";
import { TripSegment, TripDay, TripActivity, TripMedia } from "@singularity/shared-types";
import {
  useTripFull,
  formatTripDate,
  parseLocalDate,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// Extract google_place_id from media file_url (format: .../google_places_PLACE_ID_photos...)
function extractGooglePlaceId(fileUrl: string): string | null {
  const match = fileUrl.match(/google_places_(.+?)_photos_/);
  return match ? match[1] : null;
}

// Parse caption format: "Day X · Date | Place Name" or just "Place Name"
function parseCaption(caption: string | null | undefined): { dayInfo: string | null; placeName: string | null } {
  if (!caption) return { dayInfo: null, placeName: null };

  // Check for "Day X · Date | Place Name" format
  const match = caption.match(/^(Day \d+ · .+?) \| (.+)$/);
  if (match) {
    return { dayInfo: match[1], placeName: match[2] };
  }

  // No day info, just place name
  return { dayInfo: null, placeName: caption };
}

// Photo with overlay info
interface PhotoWithInfo {
  photo: TripMedia;
  activityName: string;
  dayDate: string;
  dayNumber: number | null;
  location: string;
  isAlternative: boolean;
  captionDayInfo?: string | null; // Pre-formatted day info from caption
}

// Photo card component with overlay
function PhotoCard({ photoInfo }: { photoInfo: PhotoWithInfo }) {
  const localDate = photoInfo.dayDate ? parseLocalDate(photoInfo.dayDate) : null;
  const dateStr = localDate
    ? localDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : '';

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden group">
      <img
        src={photoInfo.photo.file_url}
        alt={photoInfo.photo.caption || photoInfo.activityName}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
      {/* Only show overlay if we have a real activity name (not "Unknown Location") */}
      {photoInfo.activityName !== 'Unknown Location' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-left">
            {/* Day info above location - prefer caption day info, fallback to computed */}
            {photoInfo.captionDayInfo ? (
              <p className="text-[10px] text-white/80">{photoInfo.captionDayInfo}</p>
            ) : photoInfo.dayNumber && dateStr ? (
              <p className="text-[10px] text-white/80">
                Day {photoInfo.dayNumber} · {dateStr}
              </p>
            ) : null}
            {/* Location name */}
            <p className="text-xs font-medium truncate">{photoInfo.activityName}</p>
            {photoInfo.isAlternative && (
              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-orange-500/80 text-[9px] font-medium rounded">
                ALT
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface SegmentDetailContentProps {
  segment: TripSegment;
  tripId: string;
}

export function SegmentDetailContent({
  segment,
  tripId,
}: SegmentDetailContentProps) {
  // Get full trip data
  const { data: trip } = useTripFull(tripId);

  // Get days for this segment
  const segmentDays = useMemo(() => {
    if (!trip?.days) return [];
    return trip.days
      .filter(d => d.segment_id === segment.id)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  }, [trip?.days, segment.id]);

  // Build a map of day_id to day number (global across all trip days)
  const dayToGlobalNumber = useMemo(() => {
    if (!trip?.days) return {};
    const uniqueDays = new Map<string, typeof trip.days[0]>();
    for (const day of trip.days) {
      if (!uniqueDays.has(day.date)) {
        uniqueDays.set(day.date, day);
      }
    }
    const sortedDays = Array.from(uniqueDays.values()).sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );
    const map: Record<string, number> = {};
    sortedDays.forEach((day, index) => {
      map[day.id] = index + 1;
    });
    return map;
  }, [trip?.days]);

  // Get activities for this segment
  const segmentActivities = useMemo(() => {
    if (!trip?.activities) return [];
    const dayIds = new Set(segmentDays.map(d => d.id));
    return trip.activities.filter(a => a.day_id && dayIds.has(a.day_id));
  }, [trip?.activities, segmentDays]);

  // Build activity lookup by ID
  const activityMap = useMemo(() => {
    return new Map((trip?.activities || []).map(a => [a.id, a]));
  }, [trip?.activities]);

  // Build activity lookup by google_place_id (for matching orphaned media)
  const activityByPlaceId = useMemo(() => {
    const map = new Map<string, TripActivity>();
    for (const activity of trip?.activities || []) {
      if (activity.google_place_id) {
        map.set(activity.google_place_id, activity);
      }
    }
    return map;
  }, [trip?.activities]);

  // Build activity lookup by name (for matching by caption/place name)
  const activityByName = useMemo(() => {
    const map = new Map<string, TripActivity>();
    for (const activity of trip?.activities || []) {
      const name = activity.name.toLowerCase();
      if (!map.has(name)) {
        map.set(name, activity);
      }
    }
    return map;
  }, [trip?.activities]);

  // Collect photos - show all activity media, matching to activities when possible
  // Limit to 2 photos per unique place, max 30 total
  const photosWithInfo: PhotoWithInfo[] = useMemo(() => {
    if (!trip?.media) return [];

    // Get all activity media grouped by place name (from caption) to avoid duplicates
    const activityMedia = trip.media.filter(m => m.parent_type === 'activity');

    // First, dedupe by file_url to ensure same image never appears twice
    const seenUrls = new Set<string>();
    const uniqueMedia = activityMedia.filter(m => {
      if (seenUrls.has(m.file_url)) return false;
      seenUrls.add(m.file_url);
      return true;
    });

    const mediaByPlace: Record<string, TripMedia[]> = {};
    for (const media of uniqueMedia) {
      const { placeName } = parseCaption(media.caption);
      // Use place name as key (normalized), fallback to caption, then parent_id
      const groupKey = (placeName || media.caption || media.parent_id).toLowerCase();
      if (!mediaByPlace[groupKey]) mediaByPlace[groupKey] = [];
      mediaByPlace[groupKey].push(media);
    }

    const result: PhotoWithInfo[] = [];
    const dayMap = new Map(segmentDays.map(d => [d.id, d]));
    const PHOTOS_PER_PLACE = 2;
    const MAX_PHOTOS = 30;

    for (const [placeKey, photos] of Object.entries(mediaByPlace)) {
      const photosToTake = photos.slice(0, PHOTOS_PER_PLACE);
      const firstPhoto = photos[0];

      // Try to find activity by parent_id first, then by google_place_id, then by name/caption
      let activity = activityMap.get(firstPhoto.parent_id);
      if (!activity && firstPhoto?.file_url) {
        const placeId = extractGooglePlaceId(firstPhoto.file_url);
        if (placeId) {
          activity = activityByPlaceId.get(placeId);
        }
      }
      // Try to match by caption (place name) to activity name
      if (!activity && firstPhoto?.caption) {
        const { placeName } = parseCaption(firstPhoto.caption);
        if (placeName) {
          activity = activityByName.get(placeName.toLowerCase());
        }
      }

      for (const photo of photosToTake) {
        if (result.length >= MAX_PHOTOS) break;

        // Parse caption for day info and place name
        const { dayInfo, placeName } = parseCaption(photo.caption);

        // Use parsed place name, fallback to activity name
        let activityName = placeName || activity?.name || 'Unknown Location';
        let dayDate = segment.start_date;
        let dayNumber: number | null = null;
        let isAlternative = false;
        let captionDayInfo = dayInfo; // Day info from caption takes priority

        if (activity) {
          isAlternative = activity.is_backup || false;
          const day = activity.day_id ? dayMap.get(activity.day_id) : null;
          if (day && !captionDayInfo) {
            dayDate = day.date;
            dayNumber = dayToGlobalNumber[activity.day_id!] || null;
          }
        }

        result.push({
          photo,
          activityName,
          dayDate,
          dayNumber,
          location: activity?.address || segment.location_name || segment.name,
          isAlternative,
          captionDayInfo,
        });
      }
      if (result.length >= MAX_PHOTOS) break;
    }
    return result;
  }, [trip?.media, activityMap, activityByPlaceId, activityByName, segmentDays, dayToGlobalNumber, segment]);

  // Calculate days in segment
  const startDate = new Date(segment.start_date);
  const endDate = new Date(segment.end_date);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <MapPin className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{segment.name}</h2>
            {segment.location_name && (
              <p className="text-muted-foreground mt-1">
                {segment.location_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatTripDate(segment.start_date)} - {formatTripDate(segment.end_date)}
        </Badge>
        <Badge variant="secondary">
          {dayCount} {dayCount === 1 ? "day" : "days"}
        </Badge>
        {segment.country && (
          <Badge variant="outline">
            {segment.country_code && `${segment.country_code} `}
            {segment.country}
          </Badge>
        )}
      </div>

      {/* Activity Photos Section */}
      {photosWithInfo.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">
            Photos from Activities ({photosWithInfo.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {photosWithInfo.slice(0, 12).map((photoInfo, index) => (
              <PhotoCard key={photoInfo.photo.id} photoInfo={photoInfo} />
            ))}
          </div>
          {photosWithInfo.length > 12 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              +{photosWithInfo.length - 12} more photos
            </p>
          )}
        </div>
      )}

      <Separator className="my-6" />

      {/* Google Rating */}
      {segment.google_rating && (
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="text-lg font-medium">{segment.google_rating}</span>
          <span className="text-muted-foreground">Google rating</span>
        </div>
      )}

      {/* Location Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {segment.region && (
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Region</p>
              <p className="text-sm font-medium">{segment.region}</p>
            </div>
          </div>
        )}
        {segment.timezone && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Timezone</p>
              <p className="text-sm font-medium">{segment.timezone}</p>
            </div>
          </div>
        )}
        {segment.population && (
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Population</p>
              <p className="text-sm font-medium">
                {segment.population.toLocaleString()}
              </p>
            </div>
          </div>
        )}
        {segment.local_currency && (
          <div className="flex items-start gap-2">
            <Coins className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="text-sm font-medium">{segment.local_currency}</p>
            </div>
          </div>
        )}
      </div>

      {/* Languages */}
      {segment.languages && segment.languages.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Languages
          </h4>
          <div className="flex flex-wrap gap-2">
            {segment.languages.map((lang, i) => (
              <Badge key={i} variant="secondary">
                {lang}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {segment.description && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.description}</p>
        </div>
      )}

      {/* City Info Sections */}
      {segment.city_info?.overview && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.overview}</p>
        </div>
      )}

      {segment.city_info?.history && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            History
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.history}</p>
        </div>
      )}

      {/* Legacy culture is now handled in V3 Culture section below */}

      {segment.city_info?.tips && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Tips
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.tips}</p>
        </div>
      )}

      {/* Weather */}
      {segment.weather_summary && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Weather
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.weather_summary}</p>
        </div>
      )}

      {/* Best Time to Visit */}
      {segment.best_time_to_visit && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Best Time to Visit
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.best_time_to_visit}</p>
        </div>
      )}

      {/* Main Attractions */}
      {segment.main_attractions && segment.main_attractions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Main Attractions
          </h4>
          <div className="space-y-2">
            {segment.main_attractions.map((attraction, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{attraction.name}</p>
                {attraction.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {attraction.description}
                  </p>
                )}
                {attraction.type && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {attraction.type}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Activities Summary */}
      {segment.key_activities_summary && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Key Activities</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {segment.key_activities_summary}
          </p>
        </div>
      )}

      {/* Driving Info */}
      {segment.driving_from_previous && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Car className="h-4 w-4" />
            Getting Here
          </h4>
          <p className="text-sm text-muted-foreground">
            {segment.driving_from_previous}
          </p>
          {segment.driving_notes && (
            <p className="text-sm text-muted-foreground mt-2">
              {segment.driving_notes}
            </p>
          )}
        </div>
      )}

      {/* Route Stops */}
      {segment.route_stops && segment.route_stops.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-500" />
            Possible Stops Along the Way ({segment.route_stops.length})
          </h4>
          <div className="space-y-3">
            {segment.route_stops.map((stop) => (
              <div key={stop.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{stop.name}</p>
                    {stop.between && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Between {stop.between.from} → {stop.between.to}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stop.detour_time && (
                      <Badge variant="outline" className="text-xs">
                        +{stop.detour_time}
                      </Badge>
                    )}
                    {stop.visit_duration && (
                      <Badge variant="secondary" className="text-xs">
                        {stop.visit_duration}
                      </Badge>
                    )}
                  </div>
                </div>

                {stop.reason && (
                  <p className="text-sm text-muted-foreground mt-2">{stop.reason}</p>
                )}

                {stop.best_for && stop.best_for.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stop.best_for.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-white dark:bg-gray-800">
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}

                {stop.skip_if && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Skip if: {stop.skip_if}
                  </p>
                )}

                {stop.tips && stop.tips.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-muted-foreground mt-2 space-y-0.5">
                    {stop.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                )}

                {stop.location?.google_maps_url && (
                  <a
                    href={stop.location.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <MapPin className="h-3 w-3" />
                    View on Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* V3 City Info - Intro */}
      {segment.city_info?.intro && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Introduction
          </h4>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {segment.city_info.intro}
          </div>
        </div>
      )}

      {/* V3 Extended City Info - Deep History with Sections */}
      {segment.city_info?.deep_history && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Deep History
          </h4>
          {/* V3 format: sections array */}
          {typeof segment.city_info.deep_history === 'object' && 'sections' in segment.city_info.deep_history ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {(segment.city_info.deep_history as { sections: Array<{ title: string; content: string; relevance?: string }> }).sections.map((section, idx) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">{section.title}</h5>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </div>
                  {section.relevance && (
                    <p className="text-xs text-primary mt-2 italic">
                      🎯 {section.relevance}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Legacy format: string
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {segment.city_info.deep_history as string}
            </div>
          )}
        </div>
      )}

      {/* V3 Culture - Traditions */}
      {segment.city_info?.culture && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Culture
          </h4>
          {typeof segment.city_info.culture === 'object' && 'traditions' in segment.city_info.culture ? (
            <div className="space-y-3">
              {segment.city_info.culture.overview && (
                <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.culture.overview}</p>
              )}
              {(segment.city_info.culture as { traditions?: Array<{ name: string; story: string; where_to_experience?: string; kid_friendly?: boolean }> }).traditions?.map((tradition, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-sm">{tradition.name}</p>
                    {tradition.kid_friendly && <Badge variant="secondary" className="text-xs">Kid Friendly</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{tradition.story}</p>
                  {tradition.where_to_experience && (
                    <p className="text-xs text-primary mt-1">📍 {tradition.where_to_experience}</p>
                  )}
                </div>
              ))}
            </div>
          ) : typeof segment.city_info.culture === 'object' && 'summary' in segment.city_info.culture ? (
            // V3 format with just summary
            <p className="text-sm text-muted-foreground leading-relaxed">
              {(segment.city_info.culture as { summary: string }).summary}
            </p>
          ) : (
            // Legacy format: string
            <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.culture as string}</p>
          )}
        </div>
      )}

      {/* V3 Cuisine - Signature Foods */}
      {segment.city_info?.cuisine && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Cuisine
          </h4>
          {typeof segment.city_info.cuisine === 'object' && 'signature_foods' in segment.city_info.cuisine ? (
            <div className="space-y-3">
              {segment.city_info.cuisine.overview && (
                <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.cuisine.overview}</p>
              )}
              {(segment.city_info.cuisine as { signature_foods?: Array<{ name: string; story: string; where_to_try?: string; kid_appeal?: string }> }).signature_foods?.map((food, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{food.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{food.story}</p>
                  {food.where_to_try && (
                    <p className="text-xs text-primary mt-1">📍 {food.where_to_try}</p>
                  )}
                  {food.kid_appeal && (
                    <p className="text-xs text-amber-600 mt-1">👶 {food.kid_appeal}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Legacy format: string
            <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.cuisine as string}</p>
          )}
        </div>
      )}

      {/* Fado Section */}
      {segment.city_info?.fado && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Music className="h-4 w-4" />
            Fado Music
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.fado}</p>
        </div>
      )}

      {/* Azulejos Section */}
      {segment.city_info?.azulejos && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Azulejos (Tiles)
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.azulejos}</p>
        </div>
      )}

      {/* Local Food */}
      {segment.local_food && segment.local_food.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            What to Eat
          </h4>
          <div className="space-y-2">
            {segment.local_food.map((food, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{food.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{food.description}</p>
                {food.where_to_find && (
                  <p className="text-xs text-primary mt-1">📍 {food.where_to_find}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packing List */}
      {segment.packing_list && segment.packing_list.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Packing List
          </h4>
          <div className="flex flex-wrap gap-2">
            {segment.packing_list.map((item, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {item.item}
                {item.notes && <span className="text-muted-foreground ml-1">({item.notes})</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Booking Priorities */}
      {segment.booking_priorities && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Booking Priorities
          </h4>
          <div className="space-y-3">
            {segment.booking_priorities.book_now && segment.booking_priorities.book_now.length > 0 && (
              <div>
                <Badge variant="destructive" className="mb-2">Book NOW</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {segment.booking_priorities.book_now.map((b, i) => (
                    <li key={i}>
                      {b.item}
                      {b.reason && <span className="text-xs"> — {b.reason}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {segment.booking_priorities.book_week_ahead && segment.booking_priorities.book_week_ahead.length > 0 && (
              <div>
                <Badge variant="secondary" className="mb-2">Book 1 week ahead</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {segment.booking_priorities.book_week_ahead.map((b, i) => (
                    <li key={i}>
                      {b.item}
                      {b.reason && <span className="text-xs"> — {b.reason}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Segment Alternatives / Backup Options */}
      {segment.segment_alternatives && segment.segment_alternatives.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
            Backup Options for This Area ({segment.segment_alternatives.length})
          </h4>
          <div className="space-y-3">
            {segment.segment_alternatives.map((alt) => (
              <div key={alt.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{alt.name}</p>
                  {alt.priority && (
                    <Badge
                      variant={alt.priority === 'must_do' ? 'default' : 'outline'}
                      className="text-xs shrink-0"
                    >
                      {alt.priority.replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                {alt.trigger && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Use when: {alt.trigger}
                  </p>
                )}

                {alt.why_not_scheduled && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {alt.why_not_scheduled}
                  </p>
                )}

                {alt.deep_dive?.what_it_is && (
                  <p className="text-sm text-muted-foreground mt-2">{alt.deep_dive.what_it_is}</p>
                )}

                {alt.practical?.time_needed && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    {alt.practical.time_needed}
                  </Badge>
                )}

                {alt.location?.google_maps_url && (
                  <a
                    href={alt.location.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <MapPin className="h-3 w-3" />
                    View on Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
