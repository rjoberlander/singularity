import type {
  Trip,
  TripSegment,
  TripDay,
  TripActivity,
  TripAccommodation,
  TripMedia,
} from "@singularity/shared-types";
import type { StoryCard, StoryFilter } from "./types";
import { STORY_SEGMENT_COLORS } from "./types";

// ─── Trip type with populated relations (same as useTripFull returns) ──

type TripFull = Trip & {
  segments: TripSegment[];
  days: TripDay[];
  activities: TripActivity[];
  accommodations: TripAccommodation[];
  media: TripMedia[];
};

// ─── Helpers ──────────────────────────────────────────────────────

/** Safely coerce DB values to string — JSON columns may return objects/numbers */
function asString(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

// ─── Kid engagement normalizer ────────────────────────────────────
// DB stores kid_engagement in two formats:
//   1. Age-based: { age_7: string[], age_5: string[], age_3: string[], general: string[] }
//   2. Child-name-based: { parker: { scripts: string[] }, xander: { scripts: string[] }, ... }
// Normalize to the age-based format the card components expect.

type KidEngagement = { age_7?: string[]; age_5?: string[]; age_3?: string[]; general?: string[] };

function normalizeKidEngagement(ke: unknown): KidEngagement | undefined {
  if (!ke || typeof ke !== "object") return undefined;
  const obj = ke as Record<string, unknown>;

  // Already in expected format
  if (obj.age_7 || obj.age_5 || obj.age_3 || obj.general) return obj as KidEngagement;

  // Child-name format: extract first script from each child
  const items: string[] = [];
  for (const [name, data] of Object.entries(obj)) {
    if (data && typeof data === "object" && "scripts" in data) {
      const scripts = (data as { scripts?: string[] }).scripts;
      if (Array.isArray(scripts) && scripts.length > 0) {
        // Capitalize child name and prepend
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        items.push(`${displayName}: ${scripts[0]}`);
      }
    }
  }
  return items.length > 0 ? { general: items } : undefined;
}

// ─── Photo helpers ─────────────────────────────────────────────────

/** Filter media to usable images (exclude documents + rejected google photos) */
function filterPhotos(media: TripMedia[] | undefined): TripMedia[] {
  if (!media || media.length === 0) return [];
  return media
    .filter(
      (m) =>
        m.media_type !== "document" &&
        !(m.is_google_sourced && m.approved === false)
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Get all usable photo URLs from a media array */
function getPhotoUrls(media: TripMedia[] | undefined, max = 32): string[] {
  return filterPhotos(media)
    .slice(0, max)
    .map((m) => m.file_url);
}

/** Get thumbnail URLs for mosaic tiles (smaller/faster loading) */
function getThumbnailUrls(media: TripMedia[] | undefined, max = 32): string[] {
  return filterPhotos(media)
    .slice(0, max)
    .map((m) => m.thumbnail_url || m.file_url);
}

/** Get the single best photo URL */
function pickBestPhoto(
  media: TripMedia[] | undefined,
  fallbackUrl?: string
): string | undefined {
  const photos = filterPhotos(media);
  return photos.length > 0 ? photos[0].file_url : fallbackUrl;
}

// ─── Date formatting ───────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  const year = s.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()}\u2013${e.getDate()}, ${year}`;
  }
  return `${sMonth} ${s.getDate()} \u2013 ${eMonth} ${e.getDate()}, ${year}`;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

// ─── Build story cards ─────────────────────────────────────────────

export function buildStoryCards(trip: TripFull): StoryCard[] {
  const cards: StoryCard[] = [];

  // Build lookup maps
  const mediaByActivity: Record<string, TripMedia[]> = {};
  const mediaByAccommodation: Record<string, TripMedia[]> = {};
  const mediaBySegment: Record<string, TripMedia[]> = {};
  const mediaTripLevel: TripMedia[] = [];

  for (const m of trip.media || []) {
    if (m.parent_type === "activity") {
      (mediaByActivity[m.parent_id] ||= []).push(m);
    } else if (m.parent_type === "accommodation") {
      (mediaByAccommodation[m.parent_id] ||= []).push(m);
    } else if (m.parent_type === "segment") {
      (mediaBySegment[m.parent_id] ||= []).push(m);
    } else if (m.parent_type === "trip") {
      mediaTripLevel.push(m);
    }
  }

  // Fallback: activities sharing a google_place_id inherit photos from siblings
  const photosByPlaceId: Record<string, TripMedia[]> = {};
  for (const a of trip.activities || []) {
    if (a.google_place_id && mediaByActivity[a.id]?.length > 0) {
      if (!photosByPlaceId[a.google_place_id]) {
        photosByPlaceId[a.google_place_id] = mediaByActivity[a.id];
      }
    }
  }
  for (const a of trip.activities || []) {
    if (a.google_place_id && (!mediaByActivity[a.id] || mediaByActivity[a.id].length === 0)) {
      const shared = photosByPlaceId[a.google_place_id];
      if (shared) mediaByActivity[a.id] = shared;
    }
  }

  // Group days by segment
  const daysBySegment: Record<string, TripDay[]> = {};
  for (const day of trip.days || []) {
    const sid = day.segment_id || "unassigned";
    (daysBySegment[sid] ||= []).push(day);
  }
  for (const days of Object.values(daysBySegment)) {
    days.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Group activities by day
  const activitiesByDay: Record<string, TripActivity[]> = {};
  for (const a of trip.activities || []) {
    if (a.is_backup) continue;
    const did = a.day_id || "unassigned";
    (activitiesByDay[did] ||= []).push(a);
  }
  for (const acts of Object.values(activitiesByDay)) {
    acts.sort((a, b) => a.sort_order - b.sort_order);
  }

  // Build global day numbering
  const allDaysSorted = [...(trip.days || [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const dayToGlobalNum: Record<string, number> = {};
  allDaysSorted.forEach((d, i) => {
    dayToGlobalNum[d.id] = i + 1;
  });

  // Sort segments
  const segments = [...(trip.segments || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const totalDays = daysBetween(trip.start_date, trip.end_date);
  const totalActivities = (trip.activities || []).filter(
    (a) =>
      !a.is_backup &&
      a.activity_type !== "transport" &&
      a.activity_type !== "logistics"
  ).length;

  /** Deduplicate photo URLs */
  function dedup(urls: string[]): string[] {
    return [...new Set(urls)];
  }

  // ─── Helper: collect thumbnail photos across a segment's activities ──
  // Spreads across ALL activities (1 per activity first, then extras)
  // so the mosaic represents the whole segment, not just the first few stops.
  function getSegmentActivityThumbnails(segmentId: string, max = 32): string[] {
    const segDays = daysBySegment[segmentId] || [];
    // Collect all activity photo sets
    const photoSets: string[][] = [];
    for (const day of segDays) {
      for (const act of activitiesByDay[day.id] || []) {
        const photos = filterPhotos(mediaByActivity[act.id]);
        if (photos.length > 0) {
          photoSets.push(photos.map(p => p.thumbnail_url || p.file_url));
        }
      }
    }
    // Pass 1: pick 1 photo from each activity (spread across segment)
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const set of photoSets) {
      if (urls.length >= max) break;
      const url = set[0];
      if (url && !seen.has(url)) { urls.push(url); seen.add(url); }
    }
    // Pass 2+: fill remaining slots with additional photos from each activity
    for (let pass = 1; pass < 4 && urls.length < max; pass++) {
      for (const set of photoSets) {
        if (urls.length >= max) break;
        if (set[pass] && !seen.has(set[pass])) {
          urls.push(set[pass]); seen.add(set[pass]);
        }
      }
    }
    return urls;
  }

  // ─── Trip Title Card ──────────────────────────────────────────
  // Collect photos from ALL sources — trip, segment, accommodation, activity
  const titlePhotos: string[] = [];
  titlePhotos.push(...getThumbnailUrls(mediaTripLevel, 8));
  for (const seg of segments) {
    titlePhotos.push(...getThumbnailUrls(mediaBySegment[seg.id], 4));
  }
  // Always include activity photos (not just as fallback) — these are the most reliable
  for (const seg of segments) {
    titlePhotos.push(...getSegmentActivityThumbnails(seg.id, 8));
  }

  cards.push({
    id: "title",
    type: "trip_title",
    segmentIndex: 0,
    segmentName: segments[0]?.name || trip.destination || "",
    tripName: trip.name,
    destination: trip.destination || "",
    dateRange: formatDateRange(trip.start_date, trip.end_date),
    totalDays,
    segmentCount: segments.length,
    activityCount: totalActivities,
    photoUrl: trip.cover_image_url || titlePhotos[0],
    photoUrls: dedup(titlePhotos.length > 0 ? titlePhotos : trip.cover_image_url ? [trip.cover_image_url] : []),
  });

  // ─── Per-segment cards ────────────────────────────────────────
  for (let si = 0; si < segments.length; si++) {
    const segment = segments[si];
    const segDays = daysBySegment[segment.id] || [];
    const segAccom = (trip.accommodations || []).find(
      (a) => a.segment_id === segment.id
    );

    // Collect segment intro photos: activity photos only (no hotels)
    const segPhotos: string[] = [];
    segPhotos.push(...getSegmentActivityThumbnails(segment.id, 32));
    if (segPhotos.length === 0) {
      // Fallback to segment-level media (city photos etc)
      segPhotos.push(...getThumbnailUrls(mediaBySegment[segment.id], 8));
    }
    if (segPhotos.length === 0 && segment.cover_image_url) {
      segPhotos.push(segment.cover_image_url);
    }

    const dedupedSegPhotos = dedup(segPhotos);

    // Split photos between city card and trip card — no duplicates
    const half = Math.ceil(dedupedSegPhotos.length / 2);
    const cityPhotos = dedupedSegPhotos.slice(0, half);
    const tripPhotos = dedupedSegPhotos.slice(half);
    // If one set is empty, give it the cover image as fallback
    const coverFallback = segment.cover_image_url ? [segment.cover_image_url] : [];

    const segBaseCity = {
      segmentIndex: si,
      segmentName: segment.name,
      photoUrl: cityPhotos[0] || coverFallback[0],
      photoUrls: cityPhotos.length > 0 ? cityPhotos : coverFallback,
    };
    const segBaseTrip = {
      segmentIndex: si,
      segmentName: segment.name,
      photoUrl: tripPhotos[0] || coverFallback[0],
      photoUrls: tripPhotos.length > 0 ? tripPhotos : coverFallback,
    };

    // ── Card A: About the City ──
    const ci = segment.city_info;
    cards.push({
      ...segBaseCity,
      id: `seg-city-${segment.id}`,
      type: "segment_intro" as const,
      category: "city" as const,
      segmentNumber: si + 1,
      locationName: segment.location_name || segment.name,
      dateRange: formatDateRange(segment.start_date, segment.end_date),
      dayCount: segDays.length,
      cityIntro: ci?.intro || ci?.overview,
      deepHistorySections: (ci?.deep_history as any)?.sections?.map((s: any) => ({
        title: s.title, content: s.content, relevance: s.relevance,
      })),
      cultureOverview: (ci?.culture as any)?.overview,
      cultureTraditions: (ci?.culture as any)?.traditions?.slice(0, 4)?.map((t: any) => ({
        name: t.name, story: t.story, whereTo: t.where_to_experience,
      })),
      cuisineOverview: (ci?.cuisine as any)?.overview,
      cuisineHighlights: (ci?.cuisine as any)?.signature_foods?.slice(0, 5)?.map((f: any) => ({
        name: f.name, story: f.story, whereTo: f.where_to_try,
      })),
      weatherSummary: segment.weather_summary,
      languages: segment.languages,
      population: segment.population,
      localCurrency: segment.local_currency,
      mainAttractions: segment.main_attractions?.slice(0, 6),
    });

    // ── Card B: Your Trip ──
    const sn = (segment as any).segment_narrative;
    cards.push({
      ...segBaseTrip,
      id: `seg-trip-${segment.id}`,
      type: "segment_intro" as const,
      category: "trip" as const,
      segmentNumber: si + 1,
      locationName: segment.location_name || segment.name,
      dateRange: formatDateRange(segment.start_date, segment.end_date),
      dayCount: segDays.length,
      theme: segment.theme,
      keyActivities: segment.key_activities_summary,
      segmentNarrative: sn ? {
        summary: sn.summary,
        activityHighlights: sn.activity_highlights,
        localTips: sn.local_tips,
        gettingAround: sn.getting_around,
      } : undefined,
      drivingFromPrevious: segment.driving_from_previous,
      drivingNotes: segment.driving_notes,
      packingItems: segment.packing_list?.slice(0, 6)?.map((p) => ({
        item: p.item, why: p.why || p.notes,
      })),
      bookingPriorities: segment.booking_priorities?.book_now?.slice(0, 4)?.map((b) => ({
        item: b.item, reason: b.reason,
      })),
    });

    // ── Card C: Accommodation ──
    if (segAccom) {
      const as2 = segAccom.amenities_structured;
      const amenities: Array<{ icon: string; label: string; detail?: string }> = [];
      if (as2?.pool?.exists) amenities.push({ icon: "pool", label: "Pool", detail: as2.pool.type || undefined });
      if (as2?.gym) amenities.push({ icon: "gym", label: "Gym" });
      if (as2?.spa) amenities.push({ icon: "spa", label: "Spa" });
      if (as2?.restaurant_on_site) amenities.push({ icon: "restaurant", label: "Restaurant" });
      if (as2?.bar) amenities.push({ icon: "bar", label: "Bar" });
      if (as2?.wifi) amenities.push({ icon: "wifi", label: "WiFi" });
      if (as2?.air_conditioning) amenities.push({ icon: "ac", label: "A/C" });
      if (as2?.room_service) amenities.push({ icon: "room_service", label: "Room Service" });
      if (as2?.concierge) amenities.push({ icon: "concierge", label: "Concierge" });
      if (as2?.airport_shuttle) amenities.push({ icon: "shuttle", label: "Airport Shuttle" });
      if (as2?.ev_charging) amenities.push({ icon: "ev", label: "EV Charging" });
      if (as2?.kitchen?.type && as2.kitchen.type !== "none") amenities.push({ icon: "kitchen", label: as2.kitchen.type === "full" ? "Full Kitchen" : "Kitchenette" });
      if (as2?.laundry) amenities.push({ icon: "laundry", label: "Laundry" });

      const accomPhotos = getPhotoUrls(mediaByAccommodation[segAccom.id], 10);
      const pk = segAccom.parking;
      const bk = segAccom.breakfast;

      cards.push({
        id: `accom-${segAccom.id}`,
        type: "accommodation",
        segmentIndex: si,
        segmentName: segment.name,
        photoUrl: accomPhotos[0],
        photoUrls: accomPhotos,
        name: segAccom.name,
        propertyType: segAccom.property_type,
        starRating: segAccom.star_rating,
        googleRating: segAccom.google_rating,
        reviewCount: segAccom.google_review_count,
        checkInDate: segAccom.check_in_date,
        checkOutDate: segAccom.check_out_date,
        checkInTime: segAccom.check_in_time,
        checkOutTime: segAccom.check_out_time,
        nights: segAccom.nights,
        neighborhood: segAccom.neighborhood,
        editorialSummary: segAccom.google_editorial_summary,
        amenities,
        guestInsights: segAccom.guest_insights ? {
          whatGuestsLove: segAccom.guest_insights.what_guests_love,
          checkInTips: segAccom.guest_insights.check_in_tips,
          roomTips: segAccom.guest_insights.room_tips,
          thingsToKnow: segAccom.guest_insights.things_to_know,
          familyTips: segAccom.guest_insights.family_tips,
          bestFeatures: segAccom.guest_insights.best_features,
          reviewHighlights: segAccom.guest_insights.review_highlights,
        } : undefined,
        nearbyLandmarks: segAccom.nearby_landmarks?.map((l) => ({
          name: l.name, distance: l.distance, walkMinutes: l.walk_minutes,
        })),
        parkingInfo: pk ? (pk.available ? `${pk.type || "Available"}${pk.free ? " (free)" : pk.cost_per_day ? ` €${pk.cost_per_day}/day` : ""}${pk.notes ? ` — ${pk.notes}` : ""}` : "No parking") : undefined,
        breakfastInfo: bk ? (bk.included ? `${bk.type || "Included"}${bk.hours ? ` · ${bk.hours}` : ""}${bk.notes ? ` — ${bk.notes}` : ""}` : bk.cost_per_person ? `€${bk.cost_per_person}/person${bk.type ? ` · ${bk.type}` : ""}` : undefined) : undefined,
      });
    }

    // Days within segment
    for (const day of segDays) {
      const dayActivities = activitiesByDay[day.id] || [];
      const visibleActivities = dayActivities.filter((a) => {
        if (a.activity_type === "transport" || a.activity_type === "logistics")
          return false;
        // Also filter out transport-like activities by name
        if (/\b(rental car|pick.?up|drop.?off|drive to|flight|airport|transfer|check.?in|check.?out|luggage|pack up|settle in)\b/i.test(a.name))
          return false;
        return true;
      });
      const globalDayNum = dayToGlobalNum[day.id];

      // Collect day photos (one per activity, for mosaic)
      // Collect thumbnail photos from the day's activities (for mosaic pages)
      const dayPhotoUrls: string[] = [];
      for (const act of visibleActivities) {
        const p = filterPhotos(mediaByActivity[act.id]);
        for (const photo of p) {
          dayPhotoUrls.push(photo.thumbnail_url || photo.file_url);
          if (dayPhotoUrls.length >= 32) break;
        }
        if (dayPhotoUrls.length >= 32) break;
      }

      // Build condensed timeline from ALL day activities (including transport)
      const timeline = dayActivities
        .filter((a) => !a.is_backup)
        .map((a) => ({
          name: a.name,
          time: a.start_time,
          type: a.activity_type,
        }));

      // Day Header
      const bp = day.backup_plan;
      cards.push({
        id: `day-${day.id}`,
        type: "day_header",
        segmentIndex: si,
        segmentName: segment.name,
        dayNumber: globalDayNum,
        dayDate: day.date,
        dayTitle: day.title || `Day ${globalDayNum}`,
        dayTheme: day.theme,
        dayOverview: day.overview,
        dayNarrative: day.day_narrative,
        activityCount: visibleActivities.filter(
          (a) => a.activity_type !== "restaurant"
        ).length,
        restaurantCount: visibleActivities.filter(
          (a) => a.activity_type === "restaurant"
        ).length,
        activities: dayActivities,
        accommodation: segAccom,
        timeline,
        weatherHigh: day.weather_high_c,
        weatherLow: day.weather_low_c,
        weatherConditions: day.weather_conditions,
        photoOpportunities: day.photo_opportunities,
        backupPlan: bp ? {
          if_rain: (bp as any).if_rain,
          if_tired: (bp as any).if_tired,
          if_kids_meltdown: (bp as any).if_kids_meltdown,
        } : undefined,
        accentColor: STORY_SEGMENT_COLORS[si % STORY_SEGMENT_COLORS.length].hex,
        photoUrl: dayPhotoUrls[0],
        photoUrls: dedup(dayPhotoUrls),
      });

      // Activity/Restaurant cards
      let funFactUsedThisDay = false;
      for (const activity of visibleActivities) {
        const actMedia = mediaByActivity[activity.id];

        // Collect photos — no fallback to accommodation photos
        const actPhotos = getPhotoUrls(actMedia, 10);
        const photoUrl = actPhotos[0];

        // Pick a fun fact (max 1 per day)
        let funFact: string | undefined;
        if (
          !funFactUsedThisDay &&
          activity.deep_dive?.interesting_facts?.length
        ) {
          funFact = activity.deep_dive.interesting_facts[0];
          funFactUsedThisDay = true;
        }

        if (activity.activity_type === "restaurant") {
          const rd = activity.restaurant_details;
          cards.push({
            id: `act-${activity.id}`,
            type: "restaurant",
            segmentIndex: si,
            segmentName: segment.name,
            dayNumber: globalDayNum,
            dayDate: day.date,
            name: activity.name,
            startTime: activity.start_time,
            cuisineType: rd?.cuisine_type,
            priceLevel: activity.google_price_level,
            googleRating: activity.google_rating,
            signatureDishes: (rd?.signature_dishes || []).slice(0, 3),
            localInsight: rd?.local_insight,
            familyTips: rd?.family_tips,
            ambience: rd?.ambience,
            kidEngagement: normalizeKidEngagement(activity.kid_engagement),
            photoUrl,
            photoUrls: actPhotos,
          });
        } else {
          // Build practical tips string from practical_details
          const pd = activity.practical_details;
          const practicalParts: string[] = [];
          if (pd?.best_times?.length) practicalParts.push(`Best time: ${pd.best_times.join(", ")}`);
          if (pd?.getting_there) practicalParts.push(`Getting there: ${pd.getting_there}`);
          if (pd?.time_needed) practicalParts.push(`Time needed: ${pd.time_needed}`);
          if (pd?.combo_tickets) practicalParts.push(pd.combo_tickets);
          if (pd?.avoid_times?.length) practicalParts.push(`Avoid: ${pd.avoid_times.join(", ")}`);

          cards.push({
            id: `act-${activity.id}`,
            type: "activity",
            segmentIndex: si,
            segmentName: segment.name,
            dayNumber: globalDayNum,
            dayDate: day.date,
            name: activity.name,
            startTime: activity.start_time,
            durationMinutes:
              activity.duration_minutes || activity.estimated_duration_minutes,
            priority: activity.priority,
            description: activity.description,
            whyItsGreat: activity.why_its_great,
            kidFriendliness: activity.kid_friendliness,
            // Use full deep_dive.what_it_is (no truncation), fall back to deep_dive_content
            deepDiveSnippet: asString(activity.deep_dive?.what_it_is)
              || asString(activity.deep_dive_content)
              || asString(activity.historical_context)
              || undefined,
            deepDiveStory: asString(activity.deep_dive?.the_story),
            whatYoullSee: activity.deep_dive?.what_youll_see?.map(w => ({
              name: w.name, description: w.description,
            })),
            photoSpots: activity.deep_dive?.photo_spots?.map(p => ({
              name: p.name, tip: p.tip,
            })),
            practicalTips: practicalParts.length > 0 ? practicalParts.join(". ") : undefined,
            googleRating: activity.google_rating,
            funFact,
            kidEngagement: normalizeKidEngagement(activity.kid_engagement),
            photoUrl,
            photoUrls: actPhotos,
          });
        }
      }
    }
  }

  return cards;
}

// ─── Filter cards ──────────────────────────────────────────────────

export function filterCards(
  cards: StoryCard[],
  filter: StoryFilter
): StoryCard[] {
  if (filter === "full") return cards;

  return cards.filter((card) => {
    if (card.type === "trip_title") return true;
    if (card.type === "segment_intro") return true;
    if (card.type === "accommodation") return true;

    switch (filter) {
      case "highlights":
        return (
          (card.type === "activity" && card.priority === "must_do") ||
          card.type === "restaurant"
        );

      case "kids":
        return (
          card.type === "day_header" ||
          (card.type === "activity" &&
            (!!card.kidEngagement ||
              !!card.funFact ||
              !!card.kidFriendliness)) ||
          (card.type === "restaurant" && !!card.kidEngagement)
        );

      case "practical":
        return (
          card.type === "day_header" ||
          card.type === "activity" ||
          card.type === "restaurant"
        );
    }
  });
}
