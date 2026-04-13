"use client";

import type { StoryCard } from "./types";
import { STORY_SEGMENT_COLORS } from "./types";
import { cn } from "@/lib/utils";

interface StoryProgressDotsProps {
  cards: StoryCard[];
  activeIndex: number;
  onDotClick: (index: number) => void;
}

const MAX_VISIBLE_DOTS = 25;

export function StoryProgressDots({
  cards,
  activeIndex,
  onDotClick,
}: StoryProgressDotsProps) {
  if (cards.length <= 1) return null;

  // If too many cards, show a sliding window
  let startIdx = 0;
  let endIdx = cards.length;
  if (cards.length > MAX_VISIBLE_DOTS) {
    const half = Math.floor(MAX_VISIBLE_DOTS / 2);
    startIdx = Math.max(0, activeIndex - half);
    endIdx = Math.min(cards.length, startIdx + MAX_VISIBLE_DOTS);
    if (endIdx === cards.length) {
      startIdx = Math.max(0, endIdx - MAX_VISIBLE_DOTS);
    }
  }

  const visibleCards = cards.slice(startIdx, endIdx);

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5">
      {visibleCards.map((card, i) => {
        const globalIndex = startIdx + i;
        const isActive = globalIndex === activeIndex;
        const isSegmentIntro = card.type === "segment_intro";
        const color =
          STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];

        return (
          <button
            key={card.id}
            onClick={() => onDotClick(globalIndex)}
            className={cn(
              "rounded-full transition-all duration-200",
              isActive
                ? "w-2.5 h-2.5 bg-white shadow-md shadow-white/30"
                : isSegmentIntro
                  ? "w-2 h-2 opacity-80"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
            )}
            style={
              !isActive && isSegmentIntro
                ? { backgroundColor: color.hex }
                : undefined
            }
            aria-label={`Go to card ${globalIndex + 1}`}
          />
        );
      })}
    </div>
  );
}
