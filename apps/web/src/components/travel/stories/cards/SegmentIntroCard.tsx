"use client";

import type { SegmentIntroStoryCard } from "../types";
import { STORY_SEGMENT_COLORS } from "../types";
import { PhotoBackground } from "./PhotoBackground";
import { GlassPanel } from "./GlassPanel";
import {
  MapPin, CloudSun, Car, Globe, Landmark, Backpack, Ticket,
  Navigation, Lightbulb, Compass,
} from "lucide-react";

interface Props {
  card: SegmentIntroStoryCard;
  isActive: boolean;
}

/** Split text into ~3 sentence chunks */
function splitText(text: string, maxSentences = 3): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += maxSentences) {
    chunks.push(sentences.slice(i, i + maxSentences).join("").trim());
  }
  return chunks.filter((c) => c.length > 0);
}

export function SegmentIntroCard({ card, isActive }: Props) {
  const color = STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];
  const useMosaic = card.photoUrls.length >= 2;
  const isCity = card.category === "city";

  const sections = isCity ? buildCitySections(card) : buildTripSections(card);

  return (
    <PhotoBackground
      src={card.photoUrl}
      photos={card.photoUrls}
      isActive={isActive}
      cardId={card.id}
      mosaic={useMosaic}
      durationMs={8000}
    >
      {(slideIndex, totalSlides) => {
        // Each slide gets a unique section — don't repeat
        const sectionIdx = Math.min(slideIndex, sections.length - 1);
        const section = sections[sectionIdx];

        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/15 pointer-events-none" />

            <div className="relative flex flex-col h-full px-6 pt-24 pb-32">
              {/* No spacer — header sits at top */}

              {/* Header block — fixed position across all slides */}
              <div className="shrink-0">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white mb-2"
                  style={{ backgroundColor: color.hex + "cc" }}
                >
                  {isCity ? (
                    <>
                      <Globe className="h-3 w-3" />
                      About {card.locationName}
                    </>
                  ) : (
                    <>
                      <Compass className="h-3 w-3" />
                      Your Trip &middot; {card.locationName}
                    </>
                  )}
                </div>

                <p className="text-xs text-white/50 mt-1">
                  Segment {card.segmentNumber} &middot; {card.dateRange} &middot; {card.dayCount} day{card.dayCount !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Spacer pushes content to bottom */}
              <div className="flex-1 min-h-4" />

              {/* Rotating content section — always at bottom */}
              <div className="shrink-0">{section}</div>

              <div
                className="h-1 w-full rounded-full mt-4 shrink-0"
                style={{ backgroundColor: color.hex }}
              />
            </div>
          </>
        );
      }}
    </PhotoBackground>
  );
}

// ─── City sections ─────────────────────────────────────────────────

function buildCitySections(card: SegmentIntroStoryCard): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // City intro (split into chunks)
  if (card.cityIntro) {
    for (const [i, chunk] of splitText(card.cityIntro, 3).entries()) {
      sections.push(
        <div key={`intro-${i}`}>
          {i === 0 && <SectionLabel icon={<Globe className="h-3 w-3" />} label="Overview" />}
          <p className="text-sm text-white/90 leading-relaxed">{chunk}</p>
        </div>
      );
    }
  }

  // Deep history sections
  if (card.deepHistorySections?.length) {
    for (const [i, s] of card.deepHistorySections.entries()) {
      const preview = splitText(s.content, 3)[0] || s.content;
      sections.push(
        <div key={`hist-${i}`}>
          <SectionLabel icon={<Landmark className="h-3 w-3" />} label={s.title} />
          <p className="text-sm text-white/90 leading-relaxed">{preview}</p>
          {s.relevance && (
            <p className="text-xs text-white/60 italic mt-1">{s.relevance}</p>
          )}
        </div>
      );
    }
  }

  // Culture
  if (card.cultureOverview || card.cultureTraditions?.length) {
    if (card.cultureOverview) {
      for (const [i, chunk] of splitText(card.cultureOverview, 3).entries()) {
        sections.push(
          <div key={`cult-${i}`}>
            {i === 0 && <SectionLabel icon={<Lightbulb className="h-3 w-3" />} label="Culture" />}
            <p className="text-sm text-white/90 leading-relaxed">{chunk}</p>
          </div>
        );
      }
    }
    if (card.cultureTraditions?.length) {
      for (const t of card.cultureTraditions) {
        const preview = splitText(t.story, 3)[0] || t.story;
        sections.push(
          <div key={`trad-${t.name}`}>
            <SectionLabel icon={<Lightbulb className="h-3 w-3" />} label={t.name} />
            <p className="text-sm text-white/90 leading-relaxed">{preview}</p>
          </div>
        );
      }
    }
  }

  // Cuisine
  if (card.cuisineOverview || card.cuisineHighlights?.length) {
    if (card.cuisineOverview) {
      sections.push(
        <div key="cuisine-overview">
          <SectionLabel icon={<MapPin className="h-3 w-3" />} label="Food & Drink" />
          <p className="text-sm text-white/90 leading-relaxed">
            {splitText(card.cuisineOverview, 3)[0]}
          </p>
        </div>
      );
    }
    if (card.cuisineHighlights?.length) {
      sections.push(
        <div key="cuisine-dishes">
          <SectionLabel icon={<MapPin className="h-3 w-3" />} label="Must-Try Dishes" />
          <div className="space-y-1.5">
            {card.cuisineHighlights.map((f, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-white/90">{f.name}</span>
                <span className="text-white/60 ml-1"> &mdash; {splitText(f.story, 2)[0]}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Weather + practical
  if (card.weatherSummary || card.mainAttractions?.length) {
    sections.push(
      <div key="practical" className="space-y-2">
        {card.weatherSummary && (
          <div className="flex items-start gap-2 text-white/80">
            <CloudSun className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{card.weatherSummary}</p>
          </div>
        )}
        {card.languages && (
          <p className="text-xs text-white/60">Languages: {card.languages.join(", ")}</p>
        )}
        {card.localCurrency && (
          <p className="text-xs text-white/60">Currency: {card.localCurrency}</p>
        )}
      </div>
    );
  }

  if (card.mainAttractions?.length) {
    sections.push(
      <div key="attractions">
        <SectionLabel icon={<Landmark className="h-3 w-3" />} label="Top Attractions" />
        <div className="space-y-1">
          {card.mainAttractions.map((a, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-white/90">{a.name}</span>
              {a.description && <span className="text-white/60 ml-1"> &mdash; {a.description}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return sections.length > 0 ? sections : [<p key="e" className="text-sm text-white/60 italic">Exploring {card.locationName}...</p>];
}

// ─── Trip sections ─────────────────────────────────────────────────

function buildTripSections(card: SegmentIntroStoryCard): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // Theme
  if (card.theme) {
    sections.push(
      <div key="theme">
        <SectionLabel icon={<Compass className="h-3 w-3" />} label="The Plan" />
        <GlassPanel className="py-3 px-4">
          <p className="text-white/90 italic leading-relaxed text-sm">
            &ldquo;{card.theme}&rdquo;
          </p>
        </GlassPanel>
      </div>
    );
  }

  // Key activities (split)
  if (card.keyActivities) {
    for (const [i, chunk] of splitText(card.keyActivities, 3).entries()) {
      sections.push(
        <div key={`act-${i}`}>
          {i === 0 && <SectionLabel icon={<MapPin className="h-3 w-3" />} label="Highlights" />}
          <p className="text-sm text-white/90 leading-relaxed">{chunk}</p>
        </div>
      );
    }
  }

  // Segment narrative
  if (card.segmentNarrative) {
    const sn = card.segmentNarrative;
    if (sn.summary) {
      for (const [i, chunk] of splitText(sn.summary, 3).entries()) {
        sections.push(
          <div key={`sn-${i}`}>
            {i === 0 && <SectionLabel icon={<Compass className="h-3 w-3" />} label="What to Expect" />}
            <p className="text-sm text-white/90 leading-relaxed">{chunk}</p>
          </div>
        );
      }
    }
    if (sn.activityHighlights?.length) {
      sections.push(
        <div key="sn-highlights">
          <SectionLabel icon={<MapPin className="h-3 w-3" />} label="Activity Highlights" />
          <ul className="space-y-1">
            {sn.activityHighlights.map((h, i) => (
              <li key={i} className="text-sm text-white/85 flex gap-2">
                <span className="text-white/40">•</span> {h}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (sn.localTips?.length) {
      sections.push(
        <div key="sn-tips">
          <SectionLabel icon={<Lightbulb className="h-3 w-3" />} label="Local Tips" />
          <ul className="space-y-1">
            {sn.localTips.map((t, i) => (
              <li key={i} className="text-sm text-white/85 flex gap-2">
                <span className="text-white/40">•</span> {t}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (sn.gettingAround) {
      sections.push(
        <div key="sn-getting-around">
          <SectionLabel icon={<Navigation className="h-3 w-3" />} label="Getting Around" />
          <p className="text-sm text-white/90 leading-relaxed">{sn.gettingAround}</p>
        </div>
      );
    }
  }

  // Driving
  if (card.drivingFromPrevious || card.drivingNotes) {
    sections.push(
      <div key="driving" className="space-y-2">
        {card.drivingFromPrevious && (
          <div className="flex items-start gap-2 text-white/80">
            <Car className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{card.drivingFromPrevious}</p>
          </div>
        )}
        {card.drivingNotes && (
          <div className="flex items-start gap-2 text-white/80">
            <Car className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{card.drivingNotes}</p>
          </div>
        )}
      </div>
    );
  }

  // Packing
  if (card.packingItems?.length) {
    sections.push(
      <div key="packing">
        <SectionLabel icon={<Backpack className="h-3 w-3" />} label="Pack for This Segment" />
        <div className="space-y-1">
          {card.packingItems.map((p, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-white/90">{p.item}</span>
              {p.why && <span className="text-white/60 ml-1"> &mdash; {p.why}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Booking priorities
  if (card.bookingPriorities?.length) {
    sections.push(
      <div key="booking">
        <SectionLabel icon={<Ticket className="h-3 w-3" />} label="Book Now" />
        <div className="space-y-1">
          {card.bookingPriorities.map((b, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-white/90">{b.item}</span>
              {b.reason && <span className="text-white/60 ml-1"> &mdash; {b.reason}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return sections.length > 0 ? sections : [<p key="e" className="text-sm text-white/60 italic">Your adventure in {card.locationName}...</p>];
}

// ─── Shared label ──────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
      {icon}
      {label}
    </div>
  );
}
