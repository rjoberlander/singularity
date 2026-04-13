"use client";

import type { StoryCard } from "./types";
import { STORY_SEGMENT_COLORS } from "./types";

interface StoryNavOverlayProps {
  card: StoryCard | undefined;
  cardIndex: number;
  totalCards: number;
}

function formatDayDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function StoryNavOverlay({
  card,
  cardIndex,
  totalCards,
}: StoryNavOverlayProps) {
  if (!card) return null;

  const color = STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];
  const showDay = card.dayNumber !== undefined;

  return (
    <>
      {/* Top bar — skip for title card */}
      {card.type !== "trip_title" && (
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex items-center justify-between px-4 pt-3 pb-8 bg-gradient-to-b from-black/50 to-transparent">
            <span className="text-sm font-medium text-white/90 truncate max-w-[60%]">
              {card.segmentName}
            </span>
            {showDay && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: color.hex + "99" }}
              >
                Day {card.dayNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs">
          {showDay && card.dayDate && (
            <>
              <span className="font-medium">Day {card.dayNumber}</span>
              <span className="text-white/40">&middot;</span>
              <span className="text-white/70">{formatDayDate(card.dayDate)}</span>
              <span className="text-white/40">&middot;</span>
            </>
          )}
          <span className="text-white/60">
            {cardIndex + 1} / {totalCards}
          </span>
        </div>
      </div>
    </>
  );
}
