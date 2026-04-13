"use client";

import type { ActivityStoryCard, RestaurantStoryCard } from "../types";
import { STORY_SEGMENT_COLORS } from "../types";
import { PhotoBackground } from "./PhotoBackground";
import { GlassPanel } from "./GlassPanel";
import {
  Star,
  Clock,
  Lightbulb,
  Baby,
  Utensils,
  MapPin,
  Compass,
} from "lucide-react";

interface Props {
  card: ActivityStoryCard | RestaurantStoryCard;
  isActive: boolean;
}

function formatTime(time?: string): string | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function PriceLevel({ level }: { level?: number }) {
  if (!level) return null;
  return (
    <span className="text-white/70 text-sm">
      {"$".repeat(level)}
      <span className="text-white/30">{"$".repeat(4 - level)}</span>
    </span>
  );
}

function KidEngagementSection({
  engagement,
}: {
  engagement: NonNullable<ActivityStoryCard["kidEngagement"]>;
}) {
  const entries = [
    { label: "Age 7+", items: engagement.age_7 },
    { label: "Age 5+", items: engagement.age_5 },
    { label: "Age 3+", items: engagement.age_3 },
    { label: "Kids", items: engagement.general },
  ].filter((e) => e.items && e.items.length > 0);

  if (entries.length === 0) return null;

  return (
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
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
      {icon}
      {label}
    </div>
  );
}

function buildActivitySections(card: ActivityStoryCard): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // Section 1: Main info (always present)
  sections.push(
    <div key="main" className="space-y-2">
      {(card.whyItsGreat || card.description) && (
        <p className="text-sm text-white/85 leading-relaxed">
          {card.whyItsGreat || card.description}
        </p>
      )}
      {card.googleRating && (
        <div className="flex items-center gap-1 text-amber-300 text-xs">
          <Star className="h-3 w-3 fill-amber-300" />
          {card.googleRating.toFixed(1)}
          {card.durationMinutes && (
            <span className="text-white/50 ml-2">
              ~{card.durationMinutes >= 60
                ? `${Math.round(card.durationMinutes / 60)}h${card.durationMinutes % 60 ? ` ${card.durationMinutes % 60}m` : ""}`
                : `${card.durationMinutes}m`}
            </span>
          )}
        </div>
      )}
    </div>
  );

  // Section 2: Deep dive
  if (card.deepDiveSnippet) {
    sections.push(
      <div key="deep-dive">
        <SectionLabel icon={<Compass className="h-3 w-3" />} label="About This Place" />
        <p className="text-sm text-white/85 leading-relaxed">{card.deepDiveSnippet}</p>
      </div>
    );
  }

  // Section 3: Fun fact
  if (card.funFact) {
    sections.push(
      <div key="fun-fact">
        <GlassPanel className="p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-1">
                Did you know?
              </p>
              <p className="text-sm text-white/90 leading-relaxed">
                {card.funFact}
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // Section 4: Kid engagement
  if (card.kidEngagement) {
    sections.push(
      <div key="kids">
        <SectionLabel icon={<Baby className="h-3 w-3 text-pink-300" />} label="For the Kids" />
        <KidEngagementSection engagement={card.kidEngagement} />
      </div>
    );
  }

  return sections;
}

function buildRestaurantSections(card: RestaurantStoryCard): React.ReactNode[] {
  const sections: React.ReactNode[] = [];

  // Section 1: Signature dishes
  if (card.signatureDishes.length > 0) {
    sections.push(
      <div key="dishes">
        <GlassPanel className="p-3">
          <p className="text-xs text-white/60 uppercase tracking-wider font-semibold mb-2">
            Must Try
          </p>
          {card.signatureDishes.map((dish, i) => (
            <div key={i} className="mb-1.5 last:mb-0">
              <span className="text-sm font-medium text-white">
                {dish.name}
              </span>
              {dish.description && (
                <span className="text-xs text-white/60 ml-1.5">
                  — {dish.description}
                </span>
              )}
            </div>
          ))}
        </GlassPanel>
      </div>
    );
  }

  // Section 2: Local insight
  if (card.localInsight) {
    sections.push(
      <div key="insight">
        <SectionLabel icon={<Lightbulb className="h-3 w-3" />} label="Local Insight" />
        <p className="text-sm text-white/85 leading-relaxed">{card.localInsight}</p>
      </div>
    );
  }

  // Section 3: Kid engagement + family tips
  if (card.kidEngagement || card.familyTips) {
    sections.push(
      <div key="family" className="space-y-2">
        {card.familyTips && (
          <div className="flex items-start gap-2 text-white/80">
            <Baby className="h-3.5 w-3.5 mt-0.5 shrink-0 text-pink-300" />
            <p className="text-sm leading-relaxed">{card.familyTips}</p>
          </div>
        )}
        {card.kidEngagement && (
          <KidEngagementSection engagement={card.kidEngagement} />
        )}
      </div>
    );
  }

  return sections;
}

export function ActivityCard(props: Props): React.ReactElement {
  const { card, isActive } = props;
  const color = STORY_SEGMENT_COLORS[card.segmentIndex % STORY_SEGMENT_COLORS.length];
  const isRestaurant = card.type === "restaurant";
  const timeStr = formatTime(card.startTime);

  const sections = isRestaurant
    ? buildRestaurantSections(card as RestaurantStoryCard)
    : buildActivitySections(card as ActivityStoryCard);

  // Use slower timer when there's text content to read
  const hasContent = sections.length > 1;
  const durationMs = hasContent ? 8000 : undefined;

  return (
    <PhotoBackground
      src={card.photoUrl}
      photos={card.photoUrls}
      isActive={isActive}
      cardId={card.id}
      durationMs={durationMs}
      accentColor={color.hex}
    >
      {(slideIndex, totalSlides) => {
        // Each slide gets a unique section — don't repeat
        const sectionIdx = Math.min(slideIndex, sections.length - 1);
        const section = sections[sectionIdx];

        return (
          <div className="flex flex-col justify-end h-full px-5 pt-24 pb-20">
            {/* Priority badge (top-left, activities only) */}
            {card.type === "activity" && card.priority === "must_do" && (
              <div className="absolute top-[6.5rem] left-4 z-20">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-xs font-semibold backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-white" /> Must Do
                </span>
              </div>
            )}

            {/* Time pill (top-right) */}
            {timeStr && (
              <div className="absolute top-[6.5rem] right-4 z-20">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm"
                  style={{ backgroundColor: color.hex + "cc" }}
                >
                  <Clock className="h-3 w-3" /> {timeStr}
                </span>
              </div>
            )}

            {/* Restaurant header badges */}
            {isRestaurant && (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
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

            {/* Name */}
            <h3 className="text-xl font-bold text-white">
              {isRestaurant && <span className="mr-1.5">🍽</span>}
              {card.name}
            </h3>

            {/* Rotating content section */}
            <div className="mt-3">{section}</div>
          </div>
        );
      }}
    </PhotoBackground>
  );
}
