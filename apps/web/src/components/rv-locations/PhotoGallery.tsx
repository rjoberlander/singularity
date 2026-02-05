"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X, ChevronLeft, ChevronRight, Heart, Tent, MapPin, Star, DollarSign, Calendar,
  Mountain, Bike, Waves, Fish, Ship, TreePine, Sparkles, Camera, Compass, LucideIcon
} from "lucide-react";
import { RVLocationMedia, RVLocationActivity } from "@singularity/shared-types";

// Map activity types to icons
const activityIcons: Record<string, LucideIcon> = {
  hike: Mountain,
  bike: Bike,
  swim: Waves,
  fish: Fish,
  kayak: Ship,
  horseback: Compass,
  wildlife_viewing: TreePine,
  stargazing: Sparkles,
  photography: Camera,
  rock_climbing: Mountain,
  camping: Tent,
  other: MapPin,
};

interface ActivityInfo {
  id: string;
  name: string;
  activity_type?: string;
  google_rating?: number;
  cost_estimate?: number;
  cost_notes?: string;
}

interface LocationInfo {
  name: string;
  google_rating?: number;
  reservation_required?: boolean;
  cost_per_night?: number;
}

interface PhotoGalleryProps {
  media: RVLocationMedia[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
  onToggleFavorite?: (mediaId: string) => void;
  activities?: ActivityInfo[];
  location?: LocationInfo;
}

export function PhotoGallery({
  media,
  open,
  onOpenChange,
  initialIndex = 0,
  onToggleFavorite,
  activities = [],
  location,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reset selected index when gallery opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedIndex(null);
    }
  }, [open]);

  // Keyboard navigation for full image view
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "Escape") {
        if (selectedIndex !== null) {
          setSelectedIndex(null);
        } else {
          onOpenChange(false);
        }
      }

      if (selectedIndex !== null) {
        if (e.key === "ArrowLeft" && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1);
        }
        if (e.key === "ArrowRight" && selectedIndex < media.length - 1) {
          setSelectedIndex(selectedIndex + 1);
        }
      }
    },
    [open, onOpenChange, selectedIndex, media.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (media.length === 0) return null;

  // Full image lightbox view
  if (selectedIndex !== null) {
    const currentPhoto = media[selectedIndex];
    const isFavorited = currentPhoto.is_favorite;
    // Derive caption: use stored caption, or derive from activity_id
    const displayCaption = currentPhoto.caption || (currentPhoto.activity_id ? 'Activity' : 'Campground');
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 bg-black border-none [&>button]:hidden overflow-visible">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
            <button
              onClick={() => onToggleFavorite?.(currentPhoto.id)}
              className="p-2 text-white hover:text-red-400 transition-colors"
            >
              <Heart className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <span className="text-white font-medium">
              {selectedIndex + 1} / {media.length}
            </span>
            <button
              onClick={() => setSelectedIndex(null)}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
            >
              <span className="text-sm font-medium">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Full image with navigation */}
          <div className="relative flex items-center justify-center h-full px-4 py-16">
            {/* Navigation arrows */}
            <button
              onClick={() => selectedIndex > 0 && setSelectedIndex(selectedIndex - 1)}
              disabled={selectedIndex === 0}
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-white text-black shadow-2xl border border-gray-200 transition-all ${
                selectedIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'
              }`}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={() => selectedIndex < media.length - 1 && setSelectedIndex(selectedIndex + 1)}
              disabled={selectedIndex === media.length - 1}
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-white text-black shadow-2xl border border-gray-200 transition-all ${
                selectedIndex === media.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-110'
              }`}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
            <img
              src={currentPhoto.file_url}
              alt={displayCaption}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Caption - always show */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-center text-lg">{displayCaption}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Masonry gallery grid view
  // Group photos by activity_id (null = Campground, else activity)
  // Build activity lookup map
  const activityMap = new Map(activities.map(a => [a.id, a]));

  const groupedMedia = media.reduce((acc, item, globalIndex) => {
    const groupKey = item.activity_id || 'campground';
    if (!acc[groupKey]) {
      const activity = item.activity_id ? activityMap.get(item.activity_id) : null;
      const activityName = activity?.name || (item.caption?.replace('Activity: ', '') || 'Activity');
      acc[groupKey] = {
        items: [],
        caption: item.activity_id ? activityName : (location?.name || 'Campground'),
        activityType: activity?.activity_type,
        rating: item.activity_id ? activity?.google_rating : location?.google_rating,
        cost: item.activity_id ? activity?.cost_estimate : location?.cost_per_night,
        costNotes: activity?.cost_notes,
        reservationRequired: !item.activity_id && location?.reservation_required,
        startIndex: globalIndex
      };
    }
    acc[groupKey].items.push({ item, globalIndex });
    return acc;
  }, {} as Record<string, {
    items: { item: typeof media[0]; globalIndex: number }[];
    caption: string;
    activityType?: string;
    rating?: number;
    cost?: number;
    costNotes?: string;
    reservationRequired?: boolean;
    startIndex: number
  }>);

  // Sort entries so campground is always first
  const sortedGroups = Object.entries(groupedMedia).sort(([keyA], [keyB]) => {
    if (keyA === 'campground') return -1;
    if (keyB === 'campground') return 1;
    return 0;
  });

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`gallery-section-${sectionId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] w-[85vw] max-h-[90vh] p-0 gap-0 bg-background border rounded-xl overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <span className="font-medium text-foreground">
              {media.length} photo{media.length !== 1 ? "s" : ""}
            </span>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Quick navigation */}
          {sortedGroups.length > 1 && (
            <div className="flex flex-wrap gap-1.5 px-6 pb-3">
              {sortedGroups.map(([groupKey, group]) => {
                const IconComponent = groupKey === 'campground'
                  ? Tent
                  : (group.activityType && activityIcons[group.activityType]) || MapPin;
                return (
                  <button
                    key={groupKey}
                    onClick={() => scrollToSection(groupKey)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-xs font-medium whitespace-nowrap transition-colors"
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span className="max-w-[120px] truncate">{group.caption}</span>
                    <span className="text-muted-foreground">({group.items.length})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Masonry grid - Grouped by Activity */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-8">
            {sortedGroups.map(([groupKey, group]) => {
              const SectionIcon = groupKey === 'campground'
                ? Tent
                : (group.activityType && activityIcons[group.activityType]) || MapPin;
              return (
                <div key={groupKey} id={`gallery-section-${groupKey}`}>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2 flex-wrap">
                      <SectionIcon className="h-5 w-5 flex-shrink-0" />
                    <span>{group.caption}</span>
                    {group.rating && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-amber-500" />
                        <span className="text-sm">{group.rating.toFixed(1)}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground font-normal">({group.items.length})</span>
                  </h3>
                  {/* Additional details row */}
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {group.cost && (
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        ${group.cost.toFixed(0)}{group.costNotes ? ` ${group.costNotes}` : (groupKey === 'campground' ? '/night' : '')}
                      </span>
                    )}
                    {group.reservationRequired && (
                      <span className="inline-flex items-center gap-1 text-orange-500">
                        <Calendar className="h-3.5 w-3.5" />
                        Reservation Required
                      </span>
                    )}
                  </div>
                </div>
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                  {group.items.map(({ item, globalIndex }) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIndex(globalIndex)}
                      className="block w-full break-inside-avoid group relative overflow-hidden rounded-xl"
                    >
                      <img
                        src={item.thumbnail_url || item.file_url}
                        alt={item.caption || `Photo ${globalIndex + 1}`}
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
