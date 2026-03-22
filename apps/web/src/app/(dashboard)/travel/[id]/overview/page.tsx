"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  useTripFull,
  useCreateTripSegment,
  useCreateTripMedia,
  useDeleteTripMedia,
  formatTripDate,
  parseLocalDate,
  getActivityTypeIcon,
  getTimeBlockLabel,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  Image as ImageIcon,
  X,
  Upload,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Convert 24h time to 12h AM/PM format
function formatTimeAmPm(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Get time-of-day info based on time string (HH:MM format)
function getTimeOfDayInfo(time: string): {
  icon: React.ReactNode;
  colorClass: string;
  label: string;
} {
  const hours = parseInt(time.split(':')[0], 10);

  if (hours < 8) {
    // Early morning (before 8am) - sunrise
    return {
      icon: <Sunrise className="h-3 w-3" />,
      colorClass: "text-orange-400",
      label: "Early morning",
    };
  } else if (hours < 12) {
    // Morning (8am-12pm) - sun
    return {
      icon: <Sun className="h-3 w-3" />,
      colorClass: "text-yellow-500",
      label: "Morning",
    };
  } else if (hours < 14) {
    // Lunch (12pm-2pm) - utensils
    return {
      icon: <Utensils className="h-3 w-3" />,
      colorClass: "text-green-500",
      label: "Lunch",
    };
  } else if (hours < 17) {
    // Afternoon (2pm-5pm) - sun
    return {
      icon: <Sun className="h-3 w-3" />,
      colorClass: "text-amber-500",
      label: "Afternoon",
    };
  } else if (hours < 20) {
    // Evening (5pm-8pm) - sunset
    return {
      icon: <Sunset className="h-3 w-3" />,
      colorClass: "text-orange-500",
      label: "Evening",
    };
  } else {
    // Night (after 8pm) - moon
    return {
      icon: <Moon className="h-3 w-3" />,
      colorClass: "text-indigo-400",
      label: "Night",
    };
  }
}

// Extract location name from file URL
function extractLocationFromFilename(fileUrl: string): string | null {
  try {
    // Get the filename from URL
    const url = new URL(fileUrl);
    const pathname = url.pathname;
    const filename = pathname.split('/').pop() || '';

    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

    // Remove common prefixes like UUIDs, timestamps, etc.
    // Pattern: remove leading UUID-like strings (8-4-4-4-12 format)
    let cleanName = nameWithoutExt.replace(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[-_]?/i, '');

    // Remove timestamp prefixes (e.g., 1234567890_ or 2024-01-15_)
    cleanName = cleanName.replace(/^\d{10,13}[-_]?/, '');
    cleanName = cleanName.replace(/^\d{4}-\d{2}-\d{2}[-_]?/, '');

    // If nothing left after cleaning, return null
    if (!cleanName || cleanName.length < 3) return null;

    // Replace dashes, underscores with spaces and capitalize
    cleanName = cleanName
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize each word
    const formatted = cleanName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // If it's too long, truncate
    return formatted.length > 25 ? formatted.slice(0, 22) + '...' : formatted;
  } catch {
    return null;
  }
}

// Beautiful mosaic gallery with drag-drop upload and quick delete
function SegmentGallery({
  media,
  segmentName,
  segmentId,
  tripId,
  onUpload,
  onDelete,
}: {
  media: Array<{ id: string; file_url: string; caption?: string | null }>;
  segmentName: string;
  segmentId: string;
  tripId: string;
  onUpload: (files: FileList, segmentId: string) => void;
  onDelete: (mediaId: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const MAX_IMAGES = 12;
  const displayMedia = media.slice(0, MAX_IMAGES);
  const remainingCount = media.length - MAX_IMAGES;
  const hasMore = remainingCount > 0;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files, segmentId);
    }
  }, [onUpload, segmentId]);

  const getMosaicClass = (index: number, total: number): string => {
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
    return mosaicPattern[index] || "col-span-1 row-span-1";
  };

  // Empty state with drop zone
  if (media.length === 0) {
    return (
      <div
        className={cn(
          "relative h-full min-h-[250px] flex items-center justify-center border-2 border-dashed rounded transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/20"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Drop photos here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative h-full min-h-[250px] transition-all",
          isDragging && "ring-2 ring-primary ring-inset"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/20 z-20 flex items-center justify-center">
            <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
              Drop to add photos
            </div>
          </div>
        )}

        <div className="absolute inset-0 grid grid-cols-4 auto-rows-fr gap-0.5 p-0.5">
          {displayMedia.map((item, index) => {
            const locationName = item.caption || extractLocationFromFilename(item.file_url);
            const mosaicClass = getMosaicClass(index, displayMedia.length);
            const isLastCell = index === displayMedia.length - 1 && hasMore;

            return (
              <div key={item.id} className={cn("relative overflow-hidden group/image", mosaicClass)}>
                <img
                  src={item.file_url}
                  alt={item.caption || `${segmentName} photo ${index + 1}`}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    isLastCell ? "blur-sm brightness-50" : "group-hover/image:scale-105"
                  )}
                  loading="lazy"
                />

                {/* Delete button on hover */}
                {!isLastCell && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {!isLastCell && (
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                )}

                {locationName && !isLastCell && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-white text-[9px] font-medium max-w-[95%] truncate drop-shadow-lg">
                    {locationName}
                  </div>
                )}

                {/* Clickable "+N more" on last cell */}
                {isLastCell && (
                  <button
                    onClick={() => setShowAllPhotos(true)}
                    className="absolute inset-0 flex items-center justify-center hover:bg-black/40 transition-colors cursor-pointer"
                  >
                    <span className="px-3 py-1.5 rounded-full bg-black/80 text-white text-sm font-medium">
                      +{remainingCount} more
                    </span>
                  </button>
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

      {/* All Photos Modal */}
      <Dialog open={showAllPhotos} onOpenChange={setShowAllPhotos}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{segmentName} Photos ({media.length})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 p-2">
              {media.map((item) => {
                const locationName = item.caption || extractLocationFromFilename(item.file_url);
                return (
                  <div key={item.id} className="relative aspect-square group/photo">
                    <img
                      src={item.file_url}
                      alt={item.caption || `${segmentName} photo`}
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      onClick={() => onDelete(item.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {locationName && (
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent rounded-b">
                        <span className="text-white text-xs truncate block">{locationName}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TripOverviewPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set()); // Segments showing activity details
  const [newSegment, setNewSegment] = useState({
    name: "",
    location_name: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  const { data: trip } = useTripFull(tripId);
  const createSegment = useCreateTripSegment();
  const createMedia = useCreateTripMedia();
  const deleteMedia = useDeleteTripMedia();

  // Upload photos to segment
  const handleUploadPhotos = useCallback(async (files: FileList, segmentId: string) => {
    const supabase = createClient();
    const uploadPromises = Array.from(files).map(async (file) => {
      if (!file.type.startsWith('image/')) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `travel/${tripId}/${segmentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('singularity-uploads')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('singularity-uploads')
        .getPublicUrl(data.path);

      return {
        file_url: urlData.publicUrl,
        media_type: 'image' as const,
        parent_type: 'segment' as const,
        parent_id: segmentId,
        original_filename: file.name,
      };
    });

    const results = await Promise.all(uploadPromises);
    const validResults = results.filter(Boolean);

    for (const mediaData of validResults) {
      if (mediaData) {
        await createMedia.mutateAsync({ tripId, data: mediaData });
      }
    }

    if (validResults.length > 0) {
      toast.success(`Uploaded ${validResults.length} photo${validResults.length > 1 ? 's' : ''}`);
    }
  }, [tripId, createMedia]);

  // Delete photo immediately (no confirmation)
  const handleDeletePhoto = useCallback(async (mediaId: string) => {
    await deleteMedia.mutateAsync({ tripId, mediaId });
    toast.success('Photo deleted');
  }, [tripId, deleteMedia]);

  // Group days by segment (with deduplication by date within each segment)
  const daysBySegment = useMemo(() => {
    if (!trip?.days) return {};
    const grouped: Record<string, typeof trip.days> = {};
    // Track seen dates per segment to avoid duplicates
    const seenDatesPerSegment: Record<string, Set<string>> = {};

    for (const day of trip.days) {
      const segmentId = day.segment_id || "unassigned";
      if (!grouped[segmentId]) {
        grouped[segmentId] = [];
        seenDatesPerSegment[segmentId] = new Set();
      }

      // Skip if we already have a day for this date in this segment
      const dateKey = day.date;
      if (seenDatesPerSegment[segmentId].has(dateKey)) continue;
      seenDatesPerSegment[segmentId].add(dateKey);

      grouped[segmentId].push(day);
    }
    // Sort days within each segment by date
    for (const segmentId of Object.keys(grouped)) {
      grouped[segmentId].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    }
    return grouped;
  }, [trip?.days]);

  // Group activities by day
  const activitiesByDay = useMemo(() => {
    if (!trip?.activities) return {};
    const grouped: Record<string, typeof trip.activities> = {};
    for (const activity of trip.activities) {
      if (activity.is_backup) continue;
      const dayId = activity.day_id || "unassigned";
      if (!grouped[dayId]) grouped[dayId] = [];
      grouped[dayId].push(activity);
    }
    // Sort activities by sort_order or time
    for (const dayId of Object.keys(grouped)) {
      grouped[dayId].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return grouped;
  }, [trip?.activities]);

  // Group media by parent (segment or activity)
  const mediaByParent = useMemo(() => {
    if (!trip?.media) return {};
    const grouped: Record<string, typeof trip.media> = {};
    for (const media of trip.media) {
      const key = `${media.parent_type}-${media.parent_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(media);
    }
    return grouped;
  }, [trip?.media]);

  const toggleSegment = (segmentId: string) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segmentId)) {
      newExpanded.delete(segmentId);
    } else {
      newExpanded.add(segmentId);
    }
    setExpandedSegments(newExpanded);
  };

  const handleCreateSegment = async () => {
    if (!newSegment.name || !newSegment.start_date || !newSegment.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createSegment.mutateAsync({
        tripId,
        data: newSegment,
      });
      toast.success("Segment created");
      setShowSegmentDialog(false);
      setNewSegment({
        name: "",
        location_name: "",
        start_date: "",
        end_date: "",
        description: "",
      });
    } catch (error) {
      toast.error("Failed to create segment");
    }
  };

  // Get all media for a segment (including activity media within that segment)
  const getSegmentMedia = (segmentId: string) => {
    // Get direct segment media
    const segmentMedia = mediaByParent[`segment-${segmentId}`] || [];

    // Get media from activities within this segment's days
    const segmentDays = daysBySegment[segmentId] || [];
    const activityMedia: typeof segmentMedia = [];

    for (const day of segmentDays) {
      const dayActivities = activitiesByDay[day.id] || [];
      for (const activity of dayActivities) {
        const media = mediaByParent[`activity-${activity.id}`] || [];
        activityMedia.push(...media);
      }
    }

    // Combine and return (segment media first, then activity media)
    return [...segmentMedia, ...activityMedia];
  };

  // Get accommodation for segment
  const getSegmentAccommodation = (segmentId: string) => {
    return trip?.accommodations?.find((a) => a.segment_id === segmentId);
  };

  if (!trip) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trip Segments</h2>
          <p className="text-sm text-muted-foreground">
            Your trip organized by location with nested daily itinerary
          </p>
        </div>
        <Dialog open={showSegmentDialog} onOpenChange={setShowSegmentDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Segment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Segment</DialogTitle>
              <DialogDescription>
                Create a new segment for your trip (e.g., "Lisbon", "Porto")
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., Lisbon"
                  value={newSegment.name}
                  onChange={(e) =>
                    setNewSegment({ ...newSegment, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g., Lisbon, Portugal"
                  value={newSegment.location_name}
                  onChange={(e) =>
                    setNewSegment({ ...newSegment, location_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={newSegment.start_date}
                    onChange={(e) =>
                      setNewSegment({ ...newSegment, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={newSegment.end_date}
                    onChange={(e) =>
                      setNewSegment({ ...newSegment, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this segment..."
                  value={newSegment.description}
                  onChange={(e) =>
                    setNewSegment({ ...newSegment, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSegmentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSegment}>Create Segment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Segments with nested days */}
      {trip.segments && trip.segments.length > 0 ? (
        <div className="space-y-4">
          {trip.segments.map((segment, index) => {
            const segmentDays = daysBySegment[segment.id] || [];
            const segmentMedia = getSegmentMedia(segment.id);
            const accommodation = getSegmentAccommodation(segment.id);
            const isExpanded = expandedSegments.has(segment.id);
            const totalActivities = segmentDays.reduce(
              (sum, day) => sum + (activitiesByDay[day.id]?.length || 0),
              0
            );

            return (
              <Card key={segment.id} className="overflow-hidden">
                {/* 50/50 Layout: Info on left, Photos on right */}
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Left side - Segment Info */}
                  <div className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        {/* Segment number badge */}
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-xl">{segment.name}</CardTitle>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                            {segment.location_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {segment.location_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatTripDate(segment.start_date)} - {formatTripDate(segment.end_date)}
                            </span>
                          </div>
                          {accommodation && (
                            <p className="text-primary font-medium text-sm mt-1">
                              {accommodation.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {segment.description && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {segment.description}
                        </p>
                      )}

                      {/* Summary stats */}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {segmentDays.length} {segmentDays.length === 1 ? "day" : "days"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {totalActivities} {totalActivities === 1 ? "activity" : "activities"}
                        </Badge>
                        <div className="flex-1" />
                        {segmentDays.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => toggleSegment(segment.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-3 w-3 mr-1" />
                                Show Details
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {/* Daily Itinerary - Always visible, activities expand on demand */}
                    {segmentDays.length > 0 && (
                      <CardContent className="pt-0 px-4 pb-4">
                        <div className="space-y-2">
                          {segmentDays.map((day, dayIndex) => {
                            const dayActivities = activitiesByDay[day.id] || [];
                            const daySchedule = (day as any).schedule as Array<{
                              time: string;
                              activity_name: string;
                              activity_type?: string;
                              activity_sub_type?: string;
                              location?: string;
                              notes?: string;
                              is_deep_dive?: boolean;
                            }> | undefined;
                            const hasSchedule = daySchedule && daySchedule.length > 0;
                            const itemCount = dayActivities.length || (hasSchedule ? daySchedule.length : 0);

                            return (
                              <div key={day.id} className="flex items-start gap-2">
                                {/* Day number */}
                                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                                  {day.day_number || dayIndex + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {/* Day title and date */}
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-medium text-sm">
                                      {day.title || `Day ${day.day_number || dayIndex + 1}`}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      {parseLocalDate(day.date).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                    {!isExpanded && itemCount > 0 && (
                                      <span className="text-muted-foreground text-xs">
                                        ({itemCount} {itemCount === 1 ? "item" : "items"})
                                      </span>
                                    )}
                                  </div>

                                  {/* Show day theme if available */}
                                  {isExpanded && (day as any).theme && (
                                    <p className="text-xs text-muted-foreground italic mt-0.5">
                                      {(day as any).theme}
                                    </p>
                                  )}

                                  {/* Activities - only show when expanded */}
                                  {isExpanded && dayActivities.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {dayActivities.map((activity) => {
                                        const timeInfo = activity.start_time
                                          ? getTimeOfDayInfo(activity.start_time)
                                          : null;
                                        return (
                                          <div
                                            key={activity.id}
                                            className="flex items-center gap-2 text-xs py-0.5 text-muted-foreground"
                                          >
                                            <span className="w-4 text-center">
                                              {getActivityTypeIcon(activity.activity_type || "activity", activity.activity_sub_type)}
                                            </span>
                                            <span className="flex-1 truncate">{activity.name}</span>
                                            {activity.start_time && timeInfo && (
                                              <span className={cn("shrink-0 flex items-center gap-1", timeInfo.colorClass)}>
                                                {timeInfo.icon}
                                                {formatTimeAmPm(activity.start_time)}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Schedule items (V3 format) - show when expanded and no activities */}
                                  {isExpanded && dayActivities.length === 0 && hasSchedule && (
                                    <div className="mt-1 space-y-0.5">
                                      {daySchedule.map((item, idx) => {
                                        // Parse time for display
                                        const timeMatch = item.time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
                                        const timeStr = timeMatch ? item.time : null;
                                        const hours = timeMatch ? parseInt(timeMatch[1], 10) + (timeMatch[3]?.toLowerCase() === 'pm' && parseInt(timeMatch[1], 10) !== 12 ? 12 : 0) : 12;
                                        const timeInfo = timeStr ? getTimeOfDayInfo(`${hours.toString().padStart(2, '0')}:00`) : null;

                                        return (
                                          <div
                                            key={idx}
                                            className={cn(
                                              "flex items-center gap-2 text-xs py-0.5",
                                              item.is_deep_dive ? "text-foreground" : "text-muted-foreground"
                                            )}
                                          >
                                            <span className="w-4 text-center">
                                              {getActivityTypeIcon(item.activity_type || "activity", item.activity_sub_type)}
                                            </span>
                                            <span className={cn("flex-1 truncate", item.is_deep_dive && "font-medium")}>
                                              {item.activity_name}
                                              {item.is_deep_dive && <span className="ml-1 text-purple-500">★</span>}
                                            </span>
                                            {timeStr && timeInfo && (
                                              <span className={cn("shrink-0 flex items-center gap-1", timeInfo.colorClass)}>
                                                {timeInfo.icon}
                                                {item.time}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    )}
                  </div>

                  {/* Right side - Photo Mosaic with drag-drop */}
                  <div className="relative bg-muted/20 lg:self-stretch">
                    <SegmentGallery
                      media={segmentMedia}
                      segmentName={segment.name}
                      segmentId={segment.id}
                      tripId={tripId}
                      onUpload={handleUploadPhotos}
                      onDelete={handleDeletePhoto}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold">No segments yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Add segments to organize your trip into different locations
            </p>
            <Button onClick={() => setShowSegmentDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Segment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trip.segments?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Segments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trip.days?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trip.activities?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trip.media?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Photos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
