"use client";

import type { TripTitleStoryCard } from "../types";
import { PhotoBackground } from "./PhotoBackground";
import { GlassPanel } from "./GlassPanel";

interface Props {
  card: TripTitleStoryCard;
  isActive: boolean;
}

export function TripTitleCard({ card, isActive }: Props) {
  const useMosaic = card.photoUrls.length >= 3;

  return (
    <PhotoBackground
      src={card.photoUrl}
      photos={card.photoUrls}
      isActive={isActive}
      cardId={card.id}
      mosaic={useMosaic}
    >
      {/* pt-24 clears progress bars + filter pills, pb-20 clears bottom pill */}
      <div className="flex flex-col justify-end h-full px-6 pt-24 pb-20">
        <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
          {card.tripName}
        </h1>
        {card.destination && (
          <p className="text-lg text-white/80 mt-1">{card.destination}</p>
        )}
        <p className="text-sm text-white/60 mt-1">{card.dateRange}</p>

        <GlassPanel className="mt-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{card.totalDays}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider">Days</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{card.segmentCount}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider">Cities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{card.activityCount}</div>
              <div className="text-xs text-white/60 uppercase tracking-wider">Activities</div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </PhotoBackground>
  );
}
