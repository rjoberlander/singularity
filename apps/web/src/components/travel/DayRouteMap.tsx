"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { TripActivity, TripAccommodation } from "@singularity/shared-types";
import { API_URL } from "@/lib/api";
import { MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Coord resolution (mirrors logic in browse/page.tsx) ─────────────
function getActivityCoords(
  activity: TripActivity,
  accommodation?: TripAccommodation,
): { lat: number; lng: number } | null {
  if (activity.latitude != null && activity.longitude != null) {
    return { lat: activity.latitude, lng: activity.longitude };
  }
  // Hotel-related activities fall back to accommodation coords
  if (accommodation?.latitude != null && accommodation?.longitude != null) {
    const loc = (activity.location_name || "").toLowerCase();
    const name = activity.name.toLowerCase();
    if (/hotel|hyatt|accommodation|resort|pool|check.?in|check.?out/i.test(loc + " " + name)) {
      return { lat: accommodation.latitude, lng: accommodation.longitude };
    }
  }
  return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

type Stop = {
  label: string; // "1", "2", …
  name: string;
  coords: { lat: number; lng: number };
  isTransport: boolean;
};

export function DayRouteMap({
  activities,
  accommodation,
  dayTitle,
}: {
  activities: TripActivity[];
  accommodation?: TripAccommodation;
  dayTitle?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  // Collapse by default on mobile after hydration. Initial render is
  // expanded so SSR matches the first client paint and we don't trip
  // a hydration mismatch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) {
      setExpanded(false);
    }
  }, []);

  const stops = useMemo<Stop[]>(() => {
    const out: Stop[] = [];
    let labelIdx = 0;
    for (const a of activities) {
      if (a.is_backup) continue; // exclude alternates
      const coords = getActivityCoords(a, accommodation);
      if (!coords) continue;
      // Skip consecutive duplicates (same lat/lng within ~20m)
      const prev = out[out.length - 1];
      if (prev) {
        const dupDist = haversineKm(prev.coords, coords);
        if (dupDist < 0.02) continue;
      }
      labelIdx++;
      out.push({
        label: String(labelIdx),
        name: a.name,
        coords,
        isTransport: a.activity_type === "transport",
      });
    }
    return out;
  }, [activities, accommodation]);

  const totalKm = useMemo(() => {
    let sum = 0;
    for (let i = 1; i < stops.length; i++) {
      sum += haversineKm(stops[i - 1].coords, stops[i].coords);
    }
    return sum;
  }, [stops]);

  if (stops.length < 2) return null;

  // ── Build Static Maps URL (via backend proxy) ──────────────────────
  // size 640x280 with scale=2 for crispness
  const width = 640;
  const height = 260;

  const markerParams = stops.map(
    (s) => `color:0x2563eb|label:${s.label}|${s.coords.lat.toFixed(5)},${s.coords.lng.toFixed(5)}`,
  );

  const qs = new URLSearchParams();
  qs.set("size", `${width}x${height}`);
  qs.set("scale", "2");
  qs.set("maptype", "roadmap");
  markerParams.forEach((m) => qs.append("markers", m));

  const mapSrc = `${API_URL}/travel/maps/static?${qs.toString()}`;

  // ── Build Google Maps directions URL (click-through) ──────────────
  // https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...&travelmode=driving
  const origin = `${stops[0].coords.lat},${stops[0].coords.lng}`;
  const destination = `${stops[stops.length - 1].coords.lat},${stops[stops.length - 1].coords.lng}`;
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.coords.lat},${s.coords.lng}`)
    .join("|");
  const dirUrl = new URL("https://www.google.com/maps/dir/");
  dirUrl.searchParams.set("api", "1");
  dirUrl.searchParams.set("origin", origin);
  dirUrl.searchParams.set("destination", destination);
  if (waypoints) dirUrl.searchParams.set("waypoints", waypoints);
  dirUrl.searchParams.set("travelmode", "driving");

  const missingCount = activities.filter(
    (a) => !a.is_backup && !getActivityCoords(a, accommodation),
  ).length;

  return (
    <div
      className="mb-3 border rounded-lg overflow-hidden bg-card"
      data-testid="day-route-map"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium">Day route</span>
          <span className="text-muted-foreground">
            {" · "}
            {stops.length} stops
            {totalKm > 0.2 && (
              <>
                {" · "}~
                {totalKm < 10 ? totalKm.toFixed(1) : Math.round(totalKm)} km
              </>
            )}
            {missingCount > 0 && (
              <>
                {" · "}
                <span className="text-amber-600">{missingCount} no location</span>
              </>
            )}
          </span>
        </div>
        <a
          href={dirUrl.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
          data-testid="day-route-open-maps"
        >
          Open in Maps
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={expanded ? "Collapse route map" : "Expand route map"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Map image — also a link to Google Maps directions */}
          <a
            href={dirUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative group"
            title={dayTitle ? `Route for ${dayTitle}` : "Open route in Google Maps"}
          >
            <img
              src={mapSrc}
              alt={dayTitle ? `Map of ${dayTitle} route` : "Day route map"}
              width={width}
              height={height}
              loading="lazy"
              className="w-full h-auto block bg-muted"
              style={{ aspectRatio: `${width} / ${height}` }}
            />
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
          </a>

          {/* Stop list */}
          <ol className="px-3 py-2 text-xs space-y-1" data-testid="day-route-stops">
            {stops.map((s, i) => (
              <li key={`${s.label}-${i}`} className="flex items-start gap-2">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white shrink-0 mt-0.5",
                    s.isTransport ? "bg-slate-500" : "bg-blue-600",
                  )}
                >
                  {s.label}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${s.coords.lat},${s.coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate hover:underline text-foreground"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
