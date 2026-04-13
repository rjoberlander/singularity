"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type {
  Trip,
  TripSegment,
  TripDay,
  TripActivity,
  TripAccommodation,
  TripMedia,
  TripFlight,
  TripDriving,
  TripSharing,
} from "@singularity/shared-types";
import type { StoryCard, StoryFilter } from "./types";
import { STORY_SEGMENT_COLORS } from "./types";
import { buildStoryCards, filterCards } from "./buildStoryCards";
import { DesktopPhoneFrame } from "./DesktopPhoneFrame";
import { StoryNavOverlay } from "./StoryNavOverlay";
import { StoryProgressDots } from "./StoryProgressDots";
import { TripTitleCard } from "./cards/TripTitleCard";
import { SegmentIntroCard } from "./cards/SegmentIntroCard";
import { DayHeaderCard } from "./cards/DayHeaderCard";
import { ActivityCard } from "./cards/ActivityCard";
import { AccommodationCard } from "./cards/AccommodationCard";

type TripFull = Trip & {
  flights: TripFlight[];
  driving: TripDriving[];
  segments: TripSegment[];
  accommodations: TripAccommodation[];
  days: TripDay[];
  activities: TripActivity[];
  media: TripMedia[];
  sharing: TripSharing[];
};

interface StoryViewerProps {
  trip: TripFull;
  tripId: string;
}

const FILTER_OPTIONS: { value: StoryFilter; label: string }[] = [
  { value: "full", label: "All" },
  { value: "highlights", label: "Highlights" },
  { value: "kids", label: "Kids" },
  { value: "practical", label: "Practical" },
];

function StoryCardRenderer({
  card,
  isActive,
}: {
  card: StoryCard;
  isActive: boolean;
}) {
  switch (card.type) {
    case "trip_title":
      return <TripTitleCard card={card} isActive={isActive} />;
    case "segment_intro":
      return <SegmentIntroCard card={card} isActive={isActive} />;
    case "day_header":
      return <DayHeaderCard card={card} isActive={isActive} />;
    case "accommodation":
      return <AccommodationCard card={card} isActive={isActive} />;
    case "activity":
    case "restaurant":
      return <ActivityCard card={card} isActive={isActive} />;
  }
}

export function StoryViewer({ trip, tripId }: StoryViewerProps) {
  const [filter, setFilter] = useState<StoryFilter>("full");
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const allCards = useMemo(() => buildStoryCards(trip as any), [trip]);
  const cards = useMemo(() => filterCards(allCards, filter), [allCards, filter]);

  // Reset scroll position when filter changes
  useEffect(() => {
    setActiveIndex(0);
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [filter]);

  // Intersection Observer to track active card
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Number(
              entry.target.getAttribute("data-card-index")
            );
            if (!isNaN(index)) setActiveIndex(index);
          }
        }
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cards]);

  const handleDotClick = useCallback((index: number) => {
    cardRefs.current.get(index)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Keyboard navigation: Up/Down for cards
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        const next = Math.min(activeIndex + 1, cards.length - 1);
        cardRefs.current.get(next)?.scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        cardRefs.current.get(prev)?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, cards.length]);

  const activeCard = cards[activeIndex];

  const content = (
    <div className="relative h-[100dvh] w-full bg-black">
      {/* Snap-scroll container */}
      <div
        ref={scrollContainerRef}
        className="h-full w-full overflow-y-auto overscroll-y-contain"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            ref={(el) => {
              if (el) cardRefs.current.set(index, el);
              else cardRefs.current.delete(index);
            }}
            data-card-index={index}
            className="h-[100dvh] w-full"
            style={{ scrollSnapAlign: "start" }}
          >
            <StoryCardRenderer
              card={card}
              isActive={index === activeIndex}
            />
          </div>
        ))}
      </div>

      {/* Nav overlay */}
      <StoryNavOverlay
        card={activeCard}
        cardIndex={activeIndex}
        totalCards={cards.length}
      />

      {/* Progress dots */}
      <StoryProgressDots
        cards={cards}
        activeIndex={activeIndex}
        onDotClick={handleDotClick}
      />

      {/* Filter pills */}
      <div className="absolute top-12 left-4 z-30 flex gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-sm ${
              filter === opt.value
                ? "bg-white/25 text-white border border-white/30"
                : "bg-black/30 text-white/60 border border-white/10 hover:bg-white/15 hover:text-white/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return <DesktopPhoneFrame tripId={tripId}>{content}</DesktopPhoneFrame>;
}
