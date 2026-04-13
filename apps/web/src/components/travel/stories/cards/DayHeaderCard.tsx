"use client";

import type { DayHeaderStoryCard } from "../types";
import { STORY_SEGMENT_COLORS } from "../types";
import { PhotoBackground } from "./PhotoBackground";
import { DayRouteMap } from "@/components/travel/DayRouteMap";
import { GlassPanel } from "./GlassPanel";
import {
  MapPin, Utensils, Calendar, Clock, Car,
  Sun, CloudSun, Camera, Lightbulb, CloudRain, Battery,
} from "lucide-react";

interface Props {
  card: DayHeaderStoryCard;
  isActive: boolean;
}

function formatDayDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

// Colors matching the map pin categories in DayRouteMap
const TIMELINE_COLORS: Record<string, string> = {
  restaurant: "#ea580c", // orange — meals
  dining: "#ea580c",
  cafe: "#ea580c",
  transport: "#64748b", // slate — transport/logistics
  logistics: "#64748b",
  lodging: "#8b5cf6", // purple — accommodation
  activity: "#2563eb", // blue — activities
  no_location: "#6b7280", // gray — no coords
};

function getTimelineCategory(type?: string, name?: string): string {
  if (type === "restaurant" || type === "dining" || type === "cafe") return "restaurant";
  if (type === "transport" || type === "logistics") return "transport";
  if (/hotel|check.?in|check.?out|luggage|settle/i.test(name || "")) return "lodging";
  return "activity";
}

function getTypeIcon(type?: string, name?: string) {
  const cat = getTimelineCategory(type, name);
  const color = TIMELINE_COLORS[cat] || TIMELINE_COLORS.activity;
  switch (cat) {
    case "restaurant": return <Utensils className="h-3 w-3" style={{ color }} />;
    case "transport": return <Car className="h-3 w-3" style={{ color }} />;
    case "lodging": return <MapPin className="h-3 w-3" style={{ color }} />;
    default: return <MapPin className="h-3 w-3" style={{ color }} />;
  }
}

function splitText(text: string, maxSentences = 3): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += maxSentences) {
    chunks.push(sentences.slice(i, i + maxSentences).join("").trim());
  }
  return chunks.filter((c) => c.length > 0);
}

/** Split narrative into short readable chunks (~100-140 chars each) */
function splitNarrative(text: string): string[] {
  const cleaned = text
    .replace(/^#+\s+.*/gm, "")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\n{2,}/g, " ")
    .trim();
  if (!cleaned) return [];

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const chunks: string[] = [];
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if (t.length <= 140) { chunks.push(t); continue; }
    // Split long sentences by clause boundaries
    const parts = t.split(/(?<=[,;:—–])\s+/);
    let cur = "";
    for (const p of parts) {
      if (cur && (cur + " " + p).length > 140) { chunks.push(cur.trim()); cur = p; }
      else cur = cur ? cur + " " + p : p;
    }
    if (cur.trim()) chunks.push(cur.trim());
  }
  return chunks.filter(c => c.length > 0);
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
      {icon}
      {label}
    </div>
  );
}

export function DayHeaderCard({ card, isActive }: Props) {
  const color = STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];
  const hasPhotos = card.photoUrls.length > 0;

  // Build enrichment sections for photo slides (slide 1+)
  // These are DISTINCT from the overview shown on blank slide
  const photoSections = buildPhotoSections(card);

  return (
    <PhotoBackground
      src={card.photoUrl}
      photos={card.photoUrls}
      isActive={isActive}
      cardId={card.id}
      blankFirstSlide={hasPhotos}
      firstSlideDelayMs={10000}
      durationMs={8000}
      accentColor={color.hex}
    >
      {(slideIndex, totalSlides) => {
        const isFirstSlide = slideIndex === 0;

        return (
          <>
            {/* Gradient — skip on blank slide (already has colored bg) */}
            {!(isFirstSlide && hasPhotos) && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/15 pointer-events-none" />
            )}

            <div className="relative flex flex-col h-full pt-24 pb-20">
              {/* No spacer — header sits at top */}

              {/* Header block — fixed position across all slides */}
              <div className="shrink-0 px-6 mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-lg shrink-0"
                    style={{ backgroundColor: color.hex }}
                  >
                    <span className="text-[8px] text-white/70 uppercase tracking-widest font-medium">Day</span>
                    <span className="text-2xl font-black text-white leading-none">{card.dayNumber}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{card.dayTitle}</h3>
                    <div className="flex items-center gap-1.5 text-white/60 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDayDate(card.dayDate)}
                    </div>
                  </div>
                </div>

                {card.dayTheme && (
                  <p className="text-white/70 italic text-sm mt-2">
                    &ldquo;{card.dayTheme}&rdquo;
                  </p>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1 min-h-2" />

              {/* Slide content — at bottom */}
              <div className="shrink-0 px-6">
                {isFirstSlide && hasPhotos ? (
                  // Slide 0 (blank): Overview + Map + Timeline
                  <BlankSlideContent card={card} />
                ) : hasPhotos ? (
                  // Slides 1+: Distinct enrichment content over photos
                  <PhotoSlideContent
                    sections={photoSections}
                    slideIndex={slideIndex - 1}
                  />
                ) : (
                  // No photos — show everything on single slide
                  <BlankSlideContent card={card} />
                )}
              </div>

              {/* Bottom stats + weather */}
              <div className="px-6 mt-3 shrink-0">
                <GlassPanel className="py-2 px-4">
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    {card.activityCount > 0 && (
                      <div className="flex items-center gap-1.5 text-white/80 text-xs">
                        <MapPin className="h-3.5 w-3.5" />
                        {card.activityCount} activit{card.activityCount === 1 ? "y" : "ies"}
                      </div>
                    )}
                    {card.restaurantCount > 0 && (
                      <div className="flex items-center gap-1.5 text-white/80 text-xs">
                        <Utensils className="h-3.5 w-3.5" />
                        {card.restaurantCount} meal{card.restaurantCount === 1 ? "" : "s"}
                      </div>
                    )}
                    {card.weatherHigh != null && (
                      <div className="flex items-center gap-1.5 text-white/80 text-xs">
                        <CloudSun className="h-3.5 w-3.5" />
                        {card.weatherHigh}°/{card.weatherLow}°C
                      </div>
                    )}
                  </div>
                </GlassPanel>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: color.hex }} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">{card.segmentName}</span>
                  <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: color.hex }} />
                </div>
              </div>
            </div>
          </>
        );
      }}
    </PhotoBackground>
  );
}

// ─── Blank slide: overview + map + timeline (no photo background) ──

function BlankSlideContent({ card }: { card: DayHeaderStoryCard }) {
  return (
    <div className="space-y-3">
      {/* Day overview — shown HERE only, not on photo slides */}
      {card.dayOverview && (
        <div>
          <SectionLabel icon={<Sun className="h-3 w-3" />} label="What to Expect" />
          <p className="text-sm text-white/90 leading-relaxed line-clamp-3">{card.dayOverview}</p>
        </div>
      )}

      {/* Route map — hide stop list sidebar + collapse button, show only map + header */}
      {card.activities.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-white/10 [&_button]:hidden [&_ol]:hidden [&>div]:!border-0 [&>div]:!rounded-none [&>div]:!shadow-none max-h-[220px]">
          <DayRouteMap
            activities={card.activities}
            accommodation={card.accommodation}
            dayTitle={card.dayTitle}
          />
        </div>
      )}

      {/* Timeline */}
      {card.timeline.length > 0 && (
        <div className="space-y-1">
          {card.timeline.map((item, i) => {
            const cat = getTimelineCategory(item.type, item.name);
            const dotColor = TIMELINE_COLORS[cat] || TIMELINE_COLORS.activity;
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-3.5 shrink-0">{getTypeIcon(item.type, item.name)}</span>
                {item.time && (
                  <span className="text-white/50 w-[4.5rem] shrink-0 font-mono whitespace-nowrap">
                    {formatTime(item.time)}
                  </span>
                )}
                <span className="truncate" style={{ color: dotColor + "cc" }}>{item.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Photo slide: enrichment content overlaid on photos ─────────

function PhotoSlideContent({
  sections,
  slideIndex,
}: {
  sections: React.ReactNode[];
  slideIndex: number;
}) {
  // Show each section once — don't wrap/repeat
  if (slideIndex >= sections.length || sections.length === 0) return null;
  return <>{sections[slideIndex]}</>;
}

// ─── Build enrichment sections for photo slides ─────────────────
// These are SEPARATE from dayOverview (which is on the blank slide)

function buildPhotoSections(card: DayHeaderStoryCard): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // Day narrative — split into short, readable chunks (~100 chars each)
  if (card.dayNarrative) {
    const chunks = splitNarrative(card.dayNarrative);
    for (const [i, chunk] of chunks.entries()) {
      sections.push(
        <div key={`narrative-${i}`}>
          <SectionLabel
            icon={<Lightbulb className="h-3 w-3" />}
            label="Day Story"
          />
          <p className="text-sm text-white/90 leading-relaxed">{chunk}</p>
        </div>
      );
    }
  }

  // Weather details
  if (card.weatherConditions) {
    sections.push(
      <div key="weather">
        <SectionLabel icon={<CloudSun className="h-3 w-3" />} label="Weather" />
        <p className="text-sm text-white/90 leading-relaxed">{card.weatherConditions}</p>
        {card.weatherHigh != null && (
          <p className="text-xs text-white/60 mt-1">
            High {card.weatherHigh}°C / Low {card.weatherLow}°C
          </p>
        )}
      </div>
    );
  }

  // Photo opportunities
  if (card.photoOpportunities?.length) {
    sections.push(
      <div key="photos">
        <SectionLabel icon={<Camera className="h-3 w-3" />} label="Photo Spots" />
        <div className="space-y-1.5">
          {card.photoOpportunities.map((p, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-white/90">{p.location}</span>
              <span className="text-white/60 ml-1"> &mdash; {p.description}</span>
              {p.best_time && (
                <span className="text-white/40 text-xs ml-1">({p.best_time})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Backup plans
  if (card.backupPlan) {
    const bp = card.backupPlan;
    const tips = [
      bp.if_rain && { icon: <CloudRain className="h-3 w-3" />, label: "If it rains", text: bp.if_rain },
      bp.if_tired && { icon: <Battery className="h-3 w-3" />, label: "If tired", text: bp.if_tired },
      bp.if_kids_meltdown && { icon: <Battery className="h-3 w-3" />, label: "Kids backup", text: bp.if_kids_meltdown },
    ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; text: string }>;

    if (tips.length > 0) {
      sections.push(
        <div key="backup">
          <SectionLabel icon={<Lightbulb className="h-3 w-3" />} label="Plan B" />
          <div className="space-y-2">
            {tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-white/80">
                <span className="mt-0.5 shrink-0">{t.icon}</span>
                <div>
                  <span className="text-xs text-white/50 font-semibold">{t.label}: </span>
                  <span className="text-sm">{t.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  return sections;
}
