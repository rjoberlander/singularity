"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityPhoto = {
  id: string;
  file_url: string;
  caption?: string | null;
  google_attribution_name?: string | null;
};

/**
 * Photo display optimised for travel content. On mobile (and inside the
 * mobile column of activity cards), photos render as a swipeable carousel
 * with a 4:3 aspect ratio and dot indicators. On desktop (used inside
 * the right-hand photo column of an activity card), they render as a
 * 2-column square grid. Tapping any photo opens a fullscreen lightbox
 * with swipe + arrow nav.
 *
 * The swipe behaviour uses native CSS scroll-snap instead of a JS
 * carousel library, so there's no runtime dependency to install.
 */
export function ActivityPhotoCarousel({
  photos,
  activityName,
  variant = "auto",
}: {
  photos: ActivityPhoto[];
  activityName: string;
  /**
   * `auto` (default): mobile carousel + desktop grid switch.
   * `carousel`: always render as a swipe carousel (used in narrow contexts).
   * `grid`: always render as a 2-col grid.
   */
  variant?: "auto" | "carousel" | "grid";
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const showCarousel = variant === "carousel";
  const showGrid = variant === "grid";
  const showAuto = variant === "auto";

  return (
    <>
      {/* Mobile / always-carousel layout */}
      {(showCarousel || showAuto) && (
        <div className={showAuto ? "md:hidden" : undefined}>
          <CarouselView
            photos={photos}
            activityName={activityName}
            onOpenLightbox={openLightbox}
          />
        </div>
      )}

      {/* Desktop / always-grid layout */}
      {(showGrid || showAuto) && (
        <div className={showAuto ? "hidden md:block" : undefined}>
          <GridView
            photos={photos}
            activityName={activityName}
            onOpenLightbox={openLightbox}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          activityName={activityName}
          startIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

// ─── Scroll-snap carousel hook ──────────────────────────────────────
// Tracks which slide is currently centered inside a CSS scroll-snap
// container and exposes scrollTo / scrollPrev / scrollNext imperatively.
// Selection tracking uses IntersectionObserver against the container root
// (cheap and works for touch swipe, mouse wheel, and programmatic scroll).
function useScrollSnapCarousel(slideCount: number, startIndex = 0) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(startIndex);

  // Observe each slide to determine which is most-visible (= "selected").
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const slides = Array.from(
      container.querySelectorAll<HTMLElement>("[data-carousel-slide]"),
    );
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best = { idx: -1, ratio: 0 };
        for (const entry of entries) {
          if (entry.intersectionRatio > best.ratio) {
            const idx = slides.indexOf(entry.target as HTMLElement);
            if (idx >= 0) best = { idx, ratio: entry.intersectionRatio };
          }
        }
        if (best.idx >= 0 && best.ratio > 0.5) setSelectedIndex(best.idx);
      },
      { root: container, threshold: [0.5, 0.75, 1] },
    );
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [slideCount]);

  const scrollTo = useCallback((index: number, smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    const slides = container.querySelectorAll<HTMLElement>(
      "[data-carousel-slide]",
    );
    const target = slides[index];
    if (!target) return;
    target.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      inline: "center",
      block: "nearest",
    });
  }, []);

  const scrollPrev = useCallback(() => {
    scrollTo(Math.max(0, selectedIndex - 1));
  }, [selectedIndex, scrollTo]);

  const scrollNext = useCallback(() => {
    scrollTo(Math.min(slideCount - 1, selectedIndex + 1));
  }, [selectedIndex, slideCount, scrollTo]);

  // Jump to startIndex on mount without animation.
  useEffect(() => {
    if (startIndex > 0) {
      const id = requestAnimationFrame(() => scrollTo(startIndex, false));
      return () => cancelAnimationFrame(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, selectedIndex, scrollTo, scrollPrev, scrollNext };
}

// Shared scrollbar-hiding styles for the scroll-snap container.
// Using inline style for firefox + a style tag for webkit, since
// there is no Tailwind utility for this in the project.
const HIDE_SCROLLBAR_STYLE: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
};

function ScrollbarHideStyle() {
  return (
    <style>{`
      [data-carousel-scroll]::-webkit-scrollbar { display: none; }
    `}</style>
  );
}

// ─── Carousel view (mobile) ─────────────────────────────────────────
function CarouselView({
  photos,
  activityName,
  onOpenLightbox,
}: {
  photos: ActivityPhoto[];
  activityName: string;
  onOpenLightbox: (index: number) => void;
}) {
  const { containerRef, selectedIndex, scrollTo } = useScrollSnapCarousel(
    photos.length,
  );

  return (
    <div className="relative" data-testid="activity-photos">
      <ScrollbarHideStyle />
      <div
        ref={containerRef}
        data-carousel-scroll
        style={HIDE_SCROLLBAR_STYLE}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg"
      >
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            data-carousel-slide
            className="relative shrink-0 grow-0 basis-full snap-center pr-1 last:pr-0"
          >
            <button
              type="button"
              onClick={() => onOpenLightbox(i)}
              className="block w-full"
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                <img
                  src={photo.file_url}
                  alt={photo.caption || activityName}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Dot indicator + counter */}
      {photos.length > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selectedIndex
                    ? "w-4 bg-foreground"
                    : "w-1.5 bg-muted-foreground/40",
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {selectedIndex + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Grid view (desktop right column) ───────────────────────────────
function GridView({
  photos,
  activityName,
  onOpenLightbox,
}: {
  photos: ActivityPhoto[];
  activityName: string;
  onOpenLightbox: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1" data-testid="activity-photos">
      {photos.map((photo, i) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onOpenLightbox(i)}
          className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
          aria-label={`Open photo ${i + 1} of ${photos.length}`}
        >
          <img
            src={photo.file_url}
            alt={photo.caption || activityName}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

// ─── Lightbox ───────────────────────────────────────────────────────
function PhotoLightbox({
  photos,
  activityName,
  startIndex,
  onClose,
}: {
  photos: ActivityPhoto[];
  activityName: string;
  startIndex: number;
  onClose: () => void;
}) {
  const { containerRef, selectedIndex, scrollPrev, scrollNext } =
    useScrollSnapCarousel(photos.length, startIndex);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") scrollPrev();
      if (e.key === "ArrowRight") scrollNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, scrollPrev, scrollNext]);

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-label={`${activityName} photos`}
        >
          <DialogPrimitive.Title className="sr-only">
            {activityName} photos
          </DialogPrimitive.Title>

          <ScrollbarHideStyle />

          {/* Top bar */}
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm font-medium">
              {selectedIndex + 1} / {photos.length}
            </span>
            <DialogPrimitive.Close
              className="rounded-full p-2 hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Carousel */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={containerRef}
              data-carousel-scroll
              style={HIDE_SCROLLBAR_STYLE}
              className="h-full flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
            >
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  data-carousel-slide
                  className="relative h-full shrink-0 grow-0 basis-full snap-center"
                >
                  <div className="flex h-full items-center justify-center p-2">
                    <img
                      src={photo.file_url}
                      alt={photo.caption || activityName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Prev / Next buttons (desktop) */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors hidden md:block"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors hidden md:block"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Caption + attribution */}
          {(photos[selectedIndex]?.caption ||
            photos[selectedIndex]?.google_attribution_name) && (
            <div className="px-4 py-3 text-center text-xs text-white/80">
              {photos[selectedIndex]?.caption && (
                <p>{photos[selectedIndex].caption}</p>
              )}
              {photos[selectedIndex]?.google_attribution_name && (
                <p className="mt-1 opacity-60">
                  Photo: {photos[selectedIndex].google_attribution_name}
                </p>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
