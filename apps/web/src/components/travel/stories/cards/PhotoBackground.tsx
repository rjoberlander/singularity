"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

function getKenBurnsVariant(cardId: string, photoIndex: number): number {
  let hash = 0;
  const key = cardId + photoIndex;
  for (let i = 0; i < key.length; i++) hash += key.charCodeAt(i);
  return hash % 4;
}

const KB_TRANSFORMS = [
  { idle: "scale-100", active: "scale-110 -translate-x-[2%] -translate-y-[1%]" },
  { idle: "scale-110 translate-x-[2%] translate-y-[1%]", active: "scale-100" },
  { idle: "scale-100", active: "scale-[1.08] translate-x-[1%] -translate-y-[2%]" },
  { idle: "scale-[1.08] -translate-x-[1%] translate-y-[2%]", active: "scale-100" },
];

const AUTO_ADVANCE_MS = 3000;
const MOSAIC_CHUNK_SIZE = 3; // photos per mosaic page (3 avoids hidden bottom tiles)

export interface StoryControls {
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
}

interface PhotoBackgroundProps {
  src?: string;
  photos?: string[];
  isActive: boolean;
  cardId: string;
  /** Pass activeSlide + totalSlides + controls to children for content that changes per slide */
  children: React.ReactNode | ((slideIndex: number, totalSlides: number, controls: StoryControls) => React.ReactNode);
  className?: string;
  /** Mosaic mode: every carousel slide is a tile grid, never a single photo */
  mosaic?: boolean;
  /** Extra time (ms) for slide 0 — useful for dense content like map+timeline */
  firstSlideDelayMs?: number;
  /** Override auto-advance duration (ms) for all slides (default 3000) */
  durationMs?: number;
  /** Accent color hex for no-photo fallback gradient */
  accentColor?: string;
  /** When true, slide 0 shows a plain background (no photo); photos start from slide 1 */
  blankFirstSlide?: boolean;
  /** Minimum number of slides — pads with gradient backgrounds when photos run out */
  minSlides?: number;
}

/** Split photos into chunks for mosaic pages */
function chunkPhotos(photos: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < photos.length; i += size) {
    const chunk = photos.slice(i, i + size);
    if (chunk.length > 0) chunks.push(chunk);
  }
  // If only 1 chunk, just return it
  return chunks.length > 0 ? chunks : [photos];
}

export function PhotoBackground({
  src,
  photos,
  isActive,
  cardId,
  children,
  className,
  mosaic,
  firstSlideDelayMs,
  durationMs,
  accentColor,
  blankFirstSlide,
  minSlides,
}: PhotoBackgroundProps) {
  const allPhotos = photos && photos.length > 0 ? photos : src ? [src] : [];
  const hasPhotos = allPhotos.length > 0;

  const mosaicPages = useMemo(
    () => (mosaic ? chunkPhotos(allPhotos, MOSAIC_CHUNK_SIZE) : []),
    [mosaic, allPhotos]
  );
  const blankOffset = blankFirstSlide ? 1 : 0;
  const photoSlideCount = mosaic ? mosaicPages.length : allPhotos.length;
  const rawTotal = photoSlideCount + blankOffset;
  const totalSlides = minSlides ? Math.max(rawTotal, minSlides) : rawTotal;
  const hasMultiple = totalSlides > 1;

  const [activeSlide, setActiveSlide] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isBlankSlide = blankFirstSlide && activeSlide === 0;
  const photoIndex = activeSlide - blankOffset; // index into photos/mosaics
  const variant = KB_TRANSFORMS[getKenBurnsVariant(cardId, activeSlide)];

  // Auto-advance timer (respects pause)
  useEffect(() => {
    if (!isActive || !hasMultiple || paused) {
      if (paused) return; // keep progress where it is
      setProgressPct(0);
      return;
    }

    const baseDelay = durationMs || AUTO_ADVANCE_MS;
    const delay = activeSlide === 0 && firstSlideDelayMs
      ? firstSlideDelayMs
      : baseDelay;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / delay) * 100, 100);
      setProgressPct(pct);
      if (pct >= 100) {
        setActiveSlide((prev) => (prev + 1) % totalSlides);
        setProgressPct(0);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [isActive, hasMultiple, paused, activeSlide, totalSlides, firstSlideDelayMs, durationMs]);

  // Reset when card becomes inactive
  useEffect(() => {
    if (!isActive) {
      setActiveSlide(0);
      setProgressPct(0);
      setPaused(false);
    }
  }, [isActive]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  const goNext = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % totalSlides);
    setProgressPct(0);
    setPaused(false); // resume on manual nav
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    setProgressPct(0);
    setPaused(false); // resume on manual nav
  }, [totalSlides]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || !hasMultiple) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) > 50) {
        if (dx < 0) goNext();
        else goPrev();
      }
    },
    [hasMultiple, goNext, goPrev]
  );

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      onTouchStart={hasMultiple ? handleTouchStart : undefined}
      onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
    >
      {/* Background layer */}
      {isBlankSlide ? (
        // Blank slide: accent color gradient, no photo
        <div
          className="absolute inset-0"
          style={{
            background: accentColor
              ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}15 40%, #111827 100%)`
              : "linear-gradient(135deg, #1f2937 0%, #111827 50%, #000 100%)",
          }}
        />
      ) : mosaic && hasPhotos ? (
        // Mosaic mode: always render a tile grid
        <PhotoMosaic
          key={photoIndex}
          photos={mosaicPages[photoIndex] || allPhotos.slice(0, MOSAIC_CHUNK_SIZE)}
          variant={photoIndex}
        />
      ) : hasPhotos && photoIndex >= 0 && photoIndex < allPhotos.length ? (
        // Carousel mode: single photo
        <img
          key={allPhotos[photoIndex]}
          src={allPhotos[photoIndex]}
          alt=""
          loading="eager"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-transform duration-[20000ms] ease-linear",
            isActive ? variant.active : variant.idle
          )}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: accentColor
              ? `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}15 40%, #111827 100%)`
              : "linear-gradient(135deg, #1f2937 0%, #111827 50%, #000 100%)",
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        className={cn(
          "absolute inset-0",
          mosaic
            ? "bg-gradient-to-t from-black/90 via-black/50 to-black/15"
            : "bg-gradient-to-t from-black/80 via-black/30 to-black/10"
        )}
      />

      {/* IG-style progress bars */}
      {hasMultiple && (
        <div className="absolute top-8 left-4 right-4 z-20 flex gap-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width:
                    i < activeSlide
                      ? "100%"
                      : i === activeSlide
                        ? `${progressPct}%`
                        : "0%",
                  transition: i === activeSlide ? "width 50ms linear" : "none",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Nav arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/25 backdrop-blur-lg flex items-center justify-center text-white hover:bg-white/40 active:bg-white/50 transition-all shadow-xl border border-white/30"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/25 backdrop-blur-lg flex items-center justify-center text-white hover:bg-white/40 active:bg-white/50 transition-all shadow-xl border border-white/30"
            aria-label="Next photo"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      {/* Pause/Play button (bottom-right) */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); togglePause(); }}
          className="absolute bottom-8 right-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all border border-white/15"
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? <Play className="h-4 w-4 ml-0.5" /> : <Pause className="h-4 w-4" />}
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {typeof children === "function" ? children(activeSlide, totalSlides, { paused, setPaused }) : children}
      </div>
    </div>
  );
}

// ─── Mosaic sub-component (7 layout variants for 3 photos) ──────────
// All layouts keep the hero/wide image at top so text overlay at the
// bottom doesn't obscure photo content.

function Tile({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      className={cn("w-full h-full object-cover", className)}
      loading="eager"
    />
  );
}

function PhotoMosaic({ photos, variant = 0 }: { photos: string[]; variant?: number }) {
  const count = photos.length;
  const p = photos;
  const g = "gap-[2px]";

  if (count <= 1) {
    return (
      <div className="absolute inset-0">
        {p[0] && <Tile src={p[0]} />}
      </div>
    );
  }

  if (count === 2) {
    // Hero top, smaller bottom (keeps bottom clear for text)
    return variant % 2 === 0 ? (
      <div className={cn("absolute inset-0 grid grid-rows-[3fr_1fr]", g)}>
        <Tile src={p[0]} /><Tile src={p[1]} />
      </div>
    ) : (
      <div className={cn("absolute inset-0 grid grid-cols-[2fr_1fr]", g)}>
        <Tile src={p[0]} /><Tile src={p[1]} />
      </div>
    );
  }

  // 3+ photos: 7 layout templates, all top-heavy
  const v = variant % 7;

  // 0: Wide hero top (60%), two side-by-side bottom (40%)
  if (v === 0) {
    return (
      <div className={cn("absolute inset-0 grid grid-rows-[3fr_2fr]", g)}>
        <Tile src={p[0]} />
        <div className={cn("grid grid-cols-2", g)}>
          <Tile src={p[1]} /><Tile src={p[2]} />
        </div>
      </div>
    );
  }

  // 1: Big left (full height), two stacked right
  if (v === 1) {
    return (
      <div className={cn("absolute inset-0 grid grid-cols-[3fr_2fr] grid-rows-2", g)}>
        <Tile src={p[0]} className="row-span-2" />
        <Tile src={p[1]} /><Tile src={p[2]} />
      </div>
    );
  }

  // 2: Two stacked left, big right (full height)
  if (v === 2) {
    return (
      <div className={cn("absolute inset-0 grid grid-cols-[2fr_3fr] grid-rows-2", g)}>
        <Tile src={p[1]} /><Tile src={p[0]} className="row-span-2" />
        <Tile src={p[2]} />
      </div>
    );
  }

  // 3: Wide hero top (70%), two unequal bottom
  if (v === 3) {
    return (
      <div className={cn("absolute inset-0 grid grid-rows-[7fr_3fr]", g)}>
        <Tile src={p[0]} />
        <div className={cn("grid grid-cols-[2fr_1fr]", g)}>
          <Tile src={p[1]} /><Tile src={p[2]} />
        </div>
      </div>
    );
  }

  // 4: Wide hero top (70%), two unequal bottom (flipped)
  if (v === 4) {
    return (
      <div className={cn("absolute inset-0 grid grid-rows-[7fr_3fr]", g)}>
        <Tile src={p[0]} />
        <div className={cn("grid grid-cols-[1fr_2fr]", g)}>
          <Tile src={p[1]} /><Tile src={p[2]} />
        </div>
      </div>
    );
  }

  // 5: Big left (wide), narrow right column split in two
  if (v === 5) {
    return (
      <div className={cn("absolute inset-0 grid grid-cols-[5fr_2fr] grid-rows-2", g)}>
        <Tile src={p[0]} className="row-span-2" />
        <Tile src={p[1]} /><Tile src={p[2]} />
      </div>
    );
  }

  // 6: Top two side-by-side (small), big hero bottom
  // (hero at bottom works here since it's the largest and gradient fades into it)
  return (
    <div className={cn("absolute inset-0 grid grid-rows-[2fr_3fr]", g)}>
      <div className={cn("grid grid-cols-2", g)}>
        <Tile src={p[1]} /><Tile src={p[2]} />
      </div>
      <Tile src={p[0]} />
    </div>
  );
}
