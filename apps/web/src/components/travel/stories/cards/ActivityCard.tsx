"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import type { ActivityStoryCard, RestaurantStoryCard } from "../types";
import { STORY_SEGMENT_COLORS } from "../types";
import { PhotoBackground } from "./PhotoBackground";
import { GlassPanel } from "./GlassPanel";
import {
  Star, Clock, Lightbulb, Baby, Utensils, MapPin, Compass, ChevronDown, Calendar,
  Camera, Navigation, Eye, BookOpen,
} from "lucide-react";

interface Props {
  card: ActivityStoryCard | RestaurantStoryCard;
  isActive: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatTime(time?: string): string | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function formatDuration(mins?: number): string | undefined {
  if (!mins) return undefined;
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function formatDayDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/* ── Sunrise-to-sunset timeline bar ─────────────────────────────── */

function TimelineBar({
  startTime, durationMinutes, accentColor, dayDate,
}: {
  startTime?: string; durationMinutes?: number; accentColor: string; dayDate?: string;
}) {
  if (!startTime) return null;

  const START = 360;  // 6 AM in minutes
  const END = 1320;   // 10 PM
  const RANGE = END - START;

  const [h, m] = startTime.split(":").map(Number);
  const startMins = h * 60 + m;
  const dur = durationMinutes || 60;
  const endMins = startMins + dur;

  const startPct = Math.max(0, Math.min(100, ((startMins - START) / RANGE) * 100));
  const endPct = Math.max(0, Math.min(100, ((endMins - START) / RANGE) * 100));

  return (
    <div className="px-5 mb-3">
      {/* Bar */}
      <div
        className="relative h-1.5 rounded-full"
        style={{
          background: "linear-gradient(to right, #f97316, #fbbf24 20%, #fef9c3 40%, #f59e0b 70%, #ea580c 85%, #6366f1)",
        }}
      >
        {/* Duration segment */}
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(endPct - startPct, 1.5)}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 8px ${accentColor}80`,
          }}
        />
        {/* Start dot */}
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg z-10"
          style={{
            left: `${startPct}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: accentColor,
          }}
        />
      </div>
      {/* Time labels */}
      <div className="flex justify-between text-[9px] text-white/30 mt-1">
        <span>6 AM</span>
        <span>NOON</span>
        <span>10 PM</span>
      </div>
      {/* Date + time range — larger, more readable */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-white/70 mt-1">
        {dayDate && (
          <>
            <Calendar className="h-3 w-3" />
            <span className="font-medium">{formatDayDate(dayDate)}</span>
            <span className="text-white/30">|</span>
          </>
        )}
        <Clock className="h-3 w-3" />
        <span className="font-medium">{formatTime(startTime)}</span>
        {durationMinutes && (
          <span className="text-white/50 font-medium">({formatDuration(durationMinutes)})</span>
        )}
      </div>
    </div>
  );
}

/* ── Shared UI ──────────────────────────────────────────────────── */

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
      {icon}
      {label}
    </div>
  );
}

function PriceLevel({ level }: { level?: number }) {
  if (!level) return null;
  return (
    <span className="text-white/70 text-sm">
      {"$".repeat(level)}<span className="text-white/30">{"$".repeat(4 - level)}</span>
    </span>
  );
}

/* ── Expandable content (half-page max, "More" to expand + pause) ─ */

function ExpandableContent({
  children,
  slideIndex,
  onExpand,
}: {
  children: ReactNode;
  slideIndex: number;
  onExpand: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  // Reset on slide change
  useEffect(() => { setExpanded(false); setOverflows(false); }, [slideIndex]);

  // Detect overflow after render
  useEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 4);
  });

  return (
    <div className="relative">
      <div
        ref={ref}
        className={expanded ? "overflow-y-auto max-h-[55vh]" : "max-h-[28vh] overflow-hidden"}
      >
        {children}
      </div>
      {overflows && !expanded && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); onExpand(); }}
            className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-xs font-medium hover:bg-white/30 transition-colors z-10"
          >
            More <ChevronDown className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

/* ── Split long text into chunks ────────────────────────────────── */

function splitText(text: unknown, maxLen = 200): string[] {
  if (typeof text !== "string" || !text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if (t.length <= maxLen) { chunks.push(t); continue; }
    const parts = t.split(/(?<=[,;:—–])\s+/);
    let cur = "";
    for (const p of parts) {
      if (cur && (cur + " " + p).length > maxLen) { chunks.push(cur.trim()); cur = p; }
      else cur = cur ? cur + " " + p : p;
    }
    if (cur.trim()) chunks.push(cur.trim());
  }
  return chunks.filter(c => c.length > 0);
}

/* ── Build activity sections (1 topic per slide, max variety) ────── */

/** Truncate text to ~2 sentences for a slide-friendly length */
function truncate(text: unknown, maxLen = 250): string {
  if (typeof text !== "string" || !text) return "";
  if (text.length <= maxLen) return text;
  // Cut at last sentence boundary before maxLen
  const trimmed = text.slice(0, maxLen);
  const lastDot = Math.max(trimmed.lastIndexOf(". "), trimmed.lastIndexOf("! "), trimmed.lastIndexOf("? "));
  return lastDot > maxLen * 0.4 ? trimmed.slice(0, lastDot + 1) : trimmed + "...";
}

function buildActivitySections(card: ActivityStoryCard): ReactNode[] {
  const sections: ReactNode[] = [];

  // 1. Why Visit
  if (card.whyItsGreat || card.description) {
    sections.push(
      <div key="why">
        <SectionLabel icon={<Star className="h-3 w-3" />} label="Why Visit" />
        <p className="text-sm text-white/85 leading-relaxed">{truncate(card.whyItsGreat || card.description)}</p>
      </div>
    );
  }

  // 2. About This Place
  if (card.deepDiveSnippet) {
    sections.push(
      <div key="about">
        <SectionLabel icon={<BookOpen className="h-3 w-3" />} label="About This Place" />
        <p className="text-sm text-white/85 leading-relaxed">{truncate(card.deepDiveSnippet)}</p>
      </div>
    );
  }

  // 3. The Story
  if (card.deepDiveStory) {
    sections.push(
      <div key="story">
        <SectionLabel icon={<Compass className="h-3 w-3" />} label="The Story" />
        <p className="text-sm text-white/85 leading-relaxed">{truncate(card.deepDiveStory)}</p>
      </div>
    );
  }

  // 4. What You'll See
  if (card.whatYoullSee && card.whatYoullSee.length > 0) {
    sections.push(
      <div key="see">
        <SectionLabel icon={<Eye className="h-3 w-3" />} label="What You'll See" />
        <div className="space-y-1.5">
          {card.whatYoullSee.slice(0, 5).map((item, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-white/90">{item.name}</span>
              {item.description && <span className="text-white/60 ml-1.5">— {item.description}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. Fun Fact
  if (card.funFact) {
    sections.push(
      <div key="fact">
        <GlassPanel className="p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-1">Did you know?</p>
              <p className="text-sm text-white/90 leading-relaxed">{card.funFact}</p>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // 6. Photo Spots
  if (card.photoSpots && card.photoSpots.length > 0) {
    sections.push(
      <div key="photos">
        <SectionLabel icon={<Camera className="h-3 w-3" />} label="Photo Spots" />
        <div className="space-y-1.5">
          {card.photoSpots.map((spot, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-white/90">{spot.name}</span>
              {spot.tip && <span className="text-white/60 ml-1.5">— {spot.tip}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. Practical Tips
  if (card.practicalTips) {
    sections.push(
      <div key="tips">
        <SectionLabel icon={<Navigation className="h-3 w-3" />} label="Practical Tips" />
        <p className="text-sm text-white/85 leading-relaxed">{truncate(card.practicalTips)}</p>
      </div>
    );
  }

  // 8. Per-child kid breakdown (Parker, Charlotte, Xander)
  if (card.kidBreakdown && card.kidBreakdown.length > 0) {
    sections.push(
      <div key="kid-breakdown">
        <SectionLabel icon={<Baby className="h-3 w-3 text-pink-300" />} label="For the Kids" />
        <div className="space-y-3">
          {card.kidBreakdown.map((kid, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-pink-500/80 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                {kid.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/90">{kid.name}</p>
                <p className="text-xs text-white/70 leading-snug">{truncate(kid.script, 120)}</p>
                {kid.activities && kid.activities.length > 0 && (
                  <p className="text-[10px] text-white/50 mt-0.5">{kid.activities.join(" · ")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 9. Description as extra slide (only if whyItsGreat exists AND description is different)
  if (card.description && card.whyItsGreat && card.description !== card.whyItsGreat) {
    sections.push(
      <div key="desc">
        <SectionLabel icon={<Compass className="h-3 w-3" />} label="Good to Know" />
        <p className="text-sm text-white/85 leading-relaxed">{truncate(card.description)}</p>
      </div>
    );
  }

  return sections;
}

/* ── Build restaurant sections (spread across slides) ───────────── */

function buildRestaurantSections(card: RestaurantStoryCard): ReactNode[] {
  const sections: ReactNode[] = [];

  // Ambience
  if (card.ambience) {
    sections.push(
      <div key="vibe">
        <SectionLabel icon={<Utensils className="h-3 w-3" />} label="The Vibe" />
        <p className="text-sm text-white/85 leading-relaxed">{card.ambience}</p>
      </div>
    );
  }

  // Signature dishes — one per slide
  for (const [i, dish] of card.signatureDishes.entries()) {
    sections.push(
      <div key={`dish-${i}`}>
        <GlassPanel className="p-3">
          <p className="text-xs text-white/60 uppercase tracking-wider font-semibold mb-2">
            Must Try{card.signatureDishes.length > 1 ? ` (${i + 1}/${card.signatureDishes.length})` : ""}
          </p>
          <p className="text-sm font-medium text-white">{dish.name}</p>
          {dish.description && <p className="text-xs text-white/60 mt-1">{dish.description}</p>}
        </GlassPanel>
      </div>
    );
  }

  // Local insight — split
  if (card.localInsight) {
    for (const [i, chunk] of splitText(card.localInsight).entries()) {
      sections.push(
        <div key={`insight-${i}`}>
          {i === 0 && <SectionLabel icon={<Lightbulb className="h-3 w-3" />} label="Local Insight" />}
          <p className="text-sm text-white/85 leading-relaxed">{chunk}</p>
        </div>
      );
    }
  }

  // Family tips + kid engagement
  if (card.familyTips) {
    sections.push(
      <div key="family">
        <div className="flex items-start gap-2 text-white/80">
          <Baby className="h-3.5 w-3.5 mt-0.5 shrink-0 text-pink-300" />
          <p className="text-sm leading-relaxed">{card.familyTips}</p>
        </div>
      </div>
    );
  }

  if (card.kidEngagement) {
    const entries = [
      { label: "Age 7+", items: card.kidEngagement.age_7 },
      { label: "Age 5+", items: card.kidEngagement.age_5 },
      { label: "Age 3+", items: card.kidEngagement.age_3 },
      { label: "Kids",   items: card.kidEngagement.general },
    ].filter(e => e.items && e.items.length > 0);
    if (entries.length > 0) {
      sections.push(
        <div key="kids">
          <SectionLabel icon={<Baby className="h-3 w-3 text-pink-300" />} label="For the Kids" />
          <div className="space-y-1.5">
            {entries.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-white/80">
                <Baby className="h-4 w-4 mt-0.5 shrink-0 text-pink-300" />
                <div>
                  <span className="text-xs text-white/50 font-semibold">{e.label}: </span>
                  <span className="text-xs">{e.items![0]}</span>
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

/* ── Main component ─────────────────────────────────────────────── */

export function ActivityCard({ card, isActive }: Props): React.ReactElement {
  const color = STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];
  const isRestaurant = card.type === "restaurant";

  const sections = isRestaurant
    ? buildRestaurantSections(card as RestaurantStoryCard)
    : buildActivitySections(card as ActivityStoryCard);

  // Cap at 10 slides max — enough variety without being overwhelming
  const cappedSections = sections.slice(0, 10);
  const minSlides = Math.max(cappedSections.length, 3);

  return (
    <PhotoBackground
      src={card.photoUrl}
      photos={card.photoUrls}
      isActive={isActive}
      cardId={card.id}
      durationMs={6000}
      accentColor={color.hex}
      minSlides={minSlides}
    >
      {(slideIndex, _totalSlides, controls) => {
        const sectionIdx = Math.min(slideIndex, cappedSections.length - 1);
        const section = sectionIdx >= 0 && sectionIdx < cappedSections.length ? cappedSections[sectionIdx] : null;

        return (
          <div className="flex flex-col h-full pt-24 pb-32">
            {/* Priority badge (top-left) */}
            {card.type === "activity" && (card as ActivityStoryCard).priority === "must_do" && (
              <div className="absolute top-[6.5rem] left-4 z-20">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-white" /> Must Do
                </span>
              </div>
            )}

            {/* Sunrise-to-sunset timeline */}
            <TimelineBar
              startTime={card.startTime}
              durationMinutes={isRestaurant ? 60 : (card as ActivityStoryCard).durationMinutes}
              accentColor={color.hex}
              dayDate={card.dayDate}
            />

            {/* Name + badges at top */}
            <div className="px-5 mb-2">
              {isRestaurant && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white/90 text-xs backdrop-blur-sm">
                    <Utensils className="h-3 w-3" />
                    {(card as RestaurantStoryCard).cuisineType || "Restaurant"}
                  </span>
                  <PriceLevel level={(card as RestaurantStoryCard).priceLevel} />
                  {card.googleRating && (
                    <span className="flex items-center gap-0.5 text-amber-300 text-xs">
                      <Star className="h-3 w-3 fill-amber-300" />
                      {card.googleRating.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
              <h3 className="text-xl font-bold text-white">
                {isRestaurant && <span className="mr-1.5">🍽</span>}
                {card.name}
              </h3>
              {card.googleRating && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-amber-300 text-xs">
                    <Star className="h-3 w-3 fill-amber-300" />
                    {card.googleRating.toFixed(1)}
                  </span>
                  <span className="text-white/40 text-xs">{card.segmentName}</span>
                </div>
              )}
            </div>

            {/* Spacer pushes content to bottom */}
            <div className="flex-1 min-h-2" />

            {/* Rotating content section with expandable wrapper */}
            {section && (
              <div className="px-5">
                <ExpandableContent
                  slideIndex={slideIndex}
                  onExpand={() => controls.setPaused(true)}
                >
                  {section}
                </ExpandableContent>
              </div>
            )}
          </div>
        );
      }}
    </PhotoBackground>
  );
}
