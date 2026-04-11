"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative" data-testid="activity-photos">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="relative shrink-0 grow-0 basis-full pr-1 last:pr-0"
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
      </div>

      {/* Dot indicator + counter */}
      {photos.length > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selectedIndex
                    ? "w-4 bg-foreground"
                    : "w-1.5 bg-muted-foreground/40"
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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex,
    loop: photos.length > 1,
    align: "center",
  });
  const [selectedIndex, setSelectedIndex] = useState(startIndex);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
      if (e.key === "ArrowRight") emblaApi?.scrollNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [emblaApi, onClose]);

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
            <div className="h-full overflow-hidden" ref={emblaRef}>
              <div className="flex h-full">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative h-full shrink-0 grow-0 basis-full"
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
            </div>

            {/* Prev / Next buttons (desktop) */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors hidden md:block"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
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
