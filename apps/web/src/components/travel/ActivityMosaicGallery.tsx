"use client";

import { useState } from "react";
import { Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ActivityPhoto } from "@/components/travel/ActivityPhotoCarousel";

// ─── 4-col mosaic: EXACT COPY from Overview page.tsx (lines 202-223) ─────
function getMosaicClass4(index: number, total: number): string {
  if (total <= 3) {
    if (total === 1) return "col-span-4 row-span-4";
    if (total === 2) return "col-span-2 row-span-4";
    return index === 0 ? "col-span-2 row-span-4" : "col-span-2 row-span-2";
  }
  if (total <= 6) {
    const patterns: Record<number, string[]> = {
      4: ["col-span-2 row-span-2", "col-span-2 row-span-2", "col-span-2 row-span-2", "col-span-2 row-span-2"],
      5: ["col-span-2 row-span-2", "col-span-2 row-span-2", "col-span-2 row-span-2", "col-span-1 row-span-2", "col-span-1 row-span-2"],
      6: ["col-span-2 row-span-2", "col-span-1 row-span-2", "col-span-1 row-span-2", "col-span-2 row-span-2", "col-span-1 row-span-2", "col-span-1 row-span-2"],
    };
    return patterns[total]?.[index] || "col-span-1 row-span-2";
  }
  const mosaicPattern = [
    "col-span-2 row-span-2", "col-span-1 row-span-1", "col-span-1 row-span-1",
    "col-span-1 row-span-2", "col-span-1 row-span-1", "col-span-2 row-span-1",
    "col-span-1 row-span-1", "col-span-1 row-span-1", "col-span-1 row-span-1",
    "col-span-1 row-span-1", "col-span-1 row-span-1", "col-span-1 row-span-1",
  ];
  return mosaicPattern[index % mosaicPattern.length] || "col-span-1 row-span-1";
}

// ─── 2-col mosaic: adapted from Overview pattern for narrow containers ───
// First photo is hero (full width, double height), then alternating sizes
function getMosaicClass2(index: number, total: number): string {
  if (total === 1) return "col-span-2 row-span-3";
  if (total === 2) return index === 0 ? "col-span-2 row-span-2" : "col-span-2 row-span-2";
  if (total === 3) return index === 0 ? "col-span-2 row-span-2" : "col-span-1 row-span-2";
  // 4+ photos: hero first, then pairs, with some variety
  const pattern = [
    "col-span-2 row-span-2",  // hero
    "col-span-1 row-span-1",  // pair
    "col-span-1 row-span-1",
    "col-span-1 row-span-2",  // tall left
    "col-span-1 row-span-1",  // small right top
    "col-span-1 row-span-1",  // small right bottom
    "col-span-2 row-span-1",  // wide
    "col-span-1 row-span-1",  // pair
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",  // pair
    "col-span-1 row-span-1",
    "col-span-2 row-span-2",  // hero again
  ];
  return pattern[index % pattern.length] || "col-span-1 row-span-1";
}

/**
 * Mosaic photo gallery — shows ALL photos, no hiding.
 *
 * - `wide` mode (segment overview, ~400-500px): 4-col mosaic, exact Overview pattern
 * - narrow mode (activity right column, ~280-340px): 2-col mosaic with hero + varied sizes
 */
export function ActivityMosaicGallery({
  media,
  activityName,
  wide,
}: {
  media: ActivityPhoto[];
  activityName: string;
  /** Use 4-column mosaic for wide containers (segment overview) */
  wide?: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const gridCols = wide ? "grid-cols-4" : "grid-cols-2";
  const rowHeight = wide
    ? (media.length <= 6 ? "auto-rows-[120px]" : "auto-rows-[100px]")
    : (media.length <= 4 ? "auto-rows-[120px]" : "auto-rows-[100px]");
  const getMosaicClass = wide ? getMosaicClass4 : getMosaicClass2;

  return (
    <>
      <div className="relative">
        <div className={cn("grid gap-0.5 p-0.5", gridCols, rowHeight)}>
          {media.map((item, index) => {
            const mosaicClass = getMosaicClass(index, media.length);
            return (
              <div
                key={item.id}
                className={cn("relative overflow-hidden group/image cursor-pointer", mosaicClass)}
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={item.file_url}
                  alt={item.caption || `${activityName} photo ${index + 1}`}
                  className="w-full h-full object-cover transition-all duration-300 group-hover/image:scale-105"
                  loading={index < 2 ? "eager" : "lazy"}
                />
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                {item.caption && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-white text-[9px] font-medium max-w-[95%] truncate drop-shadow-lg">
                    {item.caption}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-xs flex items-center gap-1 z-10">
          <ImageIcon className="h-3 w-3" />
          {media.length}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={media}
          initialIndex={lightboxIndex}
          activityName={activityName}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function PhotoLightbox({
  photos,
  initialIndex,
  activityName,
  onClose,
}: {
  photos: ActivityPhoto[];
  initialIndex: number;
  activityName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  const next = () => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") prev();
            if (e.key === "ArrowRight") next();
            if (e.key === "Escape") onClose();
          }}
        >
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
            <span className="text-white text-sm">{index + 1} / {photos.length}</span>
            <DialogPrimitive.Close className="text-white hover:text-gray-300 transition-colors">
              <X className="h-6 w-6" />
            </DialogPrimitive.Close>
          </div>
          <img
            src={photo.file_url}
            alt={photo.caption || `${activityName} photo ${index + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
          {(photo.caption || photo.google_attribution_name) && (
            <div className="absolute bottom-4 left-0 right-0 text-center">
              {photo.caption && <p className="text-white text-sm">{photo.caption}</p>}
              {photo.google_attribution_name && <p className="text-white/60 text-xs mt-0.5">{photo.google_attribution_name}</p>}
            </div>
          )}
          {photos.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors hidden md:block">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors hidden md:block">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
