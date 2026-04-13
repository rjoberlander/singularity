"use client";

import type { AccommodationStoryCard } from "../types";
import { STORY_SEGMENT_COLORS } from "../types";
import { PhotoBackground } from "./PhotoBackground";
import { GlassPanel } from "./GlassPanel";
import {
  Star, Hotel, Clock, MapPin, Car, Coffee, Wifi, Dumbbell,
  Waves, UtensilsCrossed, Wine, Sparkles, Baby, Footprints,
  MessageSquare, Lightbulb, Navigation,
} from "lucide-react";

interface Props {
  card: AccommodationStoryCard;
  isActive: boolean;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  pool: <Waves className="h-4 w-4" />,
  gym: <Dumbbell className="h-4 w-4" />,
  spa: <Sparkles className="h-4 w-4" />,
  restaurant: <UtensilsCrossed className="h-4 w-4" />,
  bar: <Wine className="h-4 w-4" />,
  wifi: <Wifi className="h-4 w-4" />,
  ac: <Sparkles className="h-4 w-4" />,
  room_service: <Coffee className="h-4 w-4" />,
  concierge: <MessageSquare className="h-4 w-4" />,
  shuttle: <Car className="h-4 w-4" />,
  kitchen: <UtensilsCrossed className="h-4 w-4" />,
  laundry: <Sparkles className="h-4 w-4" />,
  ev: <Car className="h-4 w-4" />,
};

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

export function AccommodationCard({ card, isActive }: Props) {
  const color = STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];
  const sections = buildAccomSections(card);

  return (
    <PhotoBackground
      src={card.photoUrl}
      photos={card.photoUrls}
      isActive={isActive}
      cardId={card.id}
      durationMs={8000}
    >
      {(slideIndex, totalSlides) => {
        // Each slide gets a unique section — don't repeat
        const sectionIdx = Math.min(slideIndex, sections.length - 1);

        return (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15 pointer-events-none" />

            <div className="relative flex flex-col h-full px-6 pt-24 pb-32">
              {/* No spacer — header sits at top */}

              {/* Header block — fixed position across all slides */}
              <div className="shrink-0">
                {/* Hotel badge */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white mb-2"
                  style={{ backgroundColor: color.hex + "cc" }}
                >
                  <Hotel className="h-3 w-3" />
                  Your Stay
                </div>

                {/* Name + rating */}
                <h3 className="text-2xl font-bold text-white">{card.name}</h3>
                <div className="flex items-center gap-3 mt-1 text-white/70 text-sm">
                  {card.starRating && (
                    <span>{"★".repeat(card.starRating)}</span>
                  )}
                  {card.googleRating && (
                    <span className="flex items-center gap-0.5 text-amber-300">
                      <Star className="h-3 w-3 fill-amber-300" />
                      {card.googleRating.toFixed(1)}
                      {card.reviewCount && (
                        <span className="text-white/40 ml-0.5">({card.reviewCount})</span>
                      )}
                    </span>
                  )}
                  {card.neighborhood && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {card.neighborhood}
                    </span>
                  )}
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 mt-2 text-white/60 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatDate(card.checkInDate)} → {formatDate(card.checkOutDate)}
                  {card.nights && <span>&middot; {card.nights} night{card.nights !== 1 ? "s" : ""}</span>}
                  {card.checkInTime && <span>&middot; Check-in {card.checkInTime}</span>}
                </div>
              </div>

              {/* Spacer pushes content to bottom */}
              <div className="flex-1 min-h-4" />

              {/* Rotating content — always at bottom */}
              <div className="shrink-0">{sections[sectionIdx]}</div>

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

function buildAccomSections(card: AccommodationStoryCard): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // Section 1: Editorial summary + amenities
  if (card.editorialSummary || card.amenities.length > 0) {
    sections.push(
      <div key="overview" className="space-y-3">
        {card.editorialSummary && (
          <p className="text-sm text-white/90 leading-relaxed">{card.editorialSummary}</p>
        )}
        {card.amenities.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {card.amenities.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 text-white/80 text-xs">
                {AMENITY_ICONS[a.icon] || <Sparkles className="h-3.5 w-3.5" />}
                <span>{a.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Section 2: What guests love + best features
  const gi = card.guestInsights;
  if (gi?.whatGuestsLove || gi?.bestFeatures?.length) {
    sections.push(
      <div key="love" className="space-y-2">
        {gi.whatGuestsLove && (
          <>
            <Label icon={<Star className="h-3 w-3" />} text="What Guests Love" />
            <p className="text-sm text-white/90 leading-relaxed">{gi.whatGuestsLove}</p>
          </>
        )}
        {gi.bestFeatures && gi.bestFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {gi.bestFeatures.map((f, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-xs border border-white/10">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Section 3: Check-in tips + room tips
  if (gi?.checkInTips || gi?.roomTips) {
    sections.push(
      <div key="tips" className="space-y-2">
        {gi.checkInTips && (
          <>
            <Label icon={<Lightbulb className="h-3 w-3" />} text="Check-in Tips" />
            <p className="text-sm text-white/90 leading-relaxed">{gi.checkInTips}</p>
          </>
        )}
        {gi.roomTips && (
          <>
            <Label icon={<Lightbulb className="h-3 w-3" />} text="Room Tips" />
            <p className="text-sm text-white/90 leading-relaxed">{gi.roomTips}</p>
          </>
        )}
      </div>
    );
  }

  // Section 4: Family tips + things to know
  if (gi?.familyTips || gi?.thingsToKnow) {
    sections.push(
      <div key="family" className="space-y-2">
        {gi.familyTips && (
          <>
            <Label icon={<Baby className="h-3 w-3" />} text="Family Tips" />
            <p className="text-sm text-white/90 leading-relaxed">{gi.familyTips}</p>
          </>
        )}
        {gi.thingsToKnow && (
          <>
            <Label icon={<Lightbulb className="h-3 w-3" />} text="Things to Know" />
            <p className="text-sm text-white/90 leading-relaxed">{gi.thingsToKnow}</p>
          </>
        )}
      </div>
    );
  }

  // Section 5: Nearby landmarks
  if (card.nearbyLandmarks?.length) {
    sections.push(
      <div key="nearby">
        <Label icon={<Footprints className="h-3 w-3" />} text="Nearby" />
        <div className="space-y-1.5">
          {card.nearbyLandmarks.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-white/90">{l.name}</span>
              <span className="text-white/50 text-xs">
                {l.walkMinutes ? `${l.walkMinutes} min walk` : l.distance}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Section 6: Parking + breakfast
  if (card.parkingInfo || card.breakfastInfo) {
    sections.push(
      <div key="logistics" className="space-y-2">
        {card.parkingInfo && (
          <div className="flex items-start gap-2 text-white/80">
            <Car className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs uppercase tracking-wider text-white/50 font-semibold">Parking</span>
              <p className="text-sm leading-relaxed">{card.parkingInfo}</p>
            </div>
          </div>
        )}
        {card.breakfastInfo && (
          <div className="flex items-start gap-2 text-white/80">
            <Coffee className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs uppercase tracking-wider text-white/50 font-semibold">Breakfast</span>
              <p className="text-sm leading-relaxed">{card.breakfastInfo}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Review highlights
  if (gi?.reviewHighlights?.length) {
    sections.push(
      <div key="reviews">
        <Label icon={<MessageSquare className="h-3 w-3" />} text="Guest Reviews" />
        <div className="space-y-1.5">
          {gi.reviewHighlights.map((r, i) => (
            <p key={i} className="text-sm text-white/80 italic">&ldquo;{r}&rdquo;</p>
          ))}
        </div>
      </div>
    );
  }

  return sections.length > 0 ? sections : [<p key="e" className="text-sm text-white/60">Your accommodation for this segment.</p>];
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/60 text-xs uppercase tracking-wider font-semibold mb-1.5">
      {icon} {text}
    </div>
  );
}
