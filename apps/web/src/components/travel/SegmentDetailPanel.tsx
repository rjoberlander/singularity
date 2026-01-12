"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  MapPin,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  Globe,
  Clock,
  Users,
  Coins,
  Languages,
  Thermometer,
  Building2,
  Car,
  Info,
  BookOpen,
  Lightbulb,
  Utensils,
  ShoppingBag,
  Music,
  Palette,
  History,
} from "lucide-react";
import { TripSegment, TripMedia } from "@singularity/shared-types";
import {
  useFetchGooglePlacesForSegment,
  useTripMedia,
  useApproveTripMedia,
  formatTripDate,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SegmentDetailPanelProps {
  segment: TripSegment | null;
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SegmentDetailPanel({
  segment,
  tripId,
  open,
  onOpenChange,
}: SegmentDetailPanelProps) {
  const fetchGoogle = useFetchGooglePlacesForSegment();
  const approveMedia = useApproveTripMedia();

  // Get media for this segment
  const { data: allMedia } = useTripMedia(tripId, "segment", segment?.id);

  // Filter: user photos first (is_google_sourced=false OR approved=true)
  // Then show pending Google photos (is_google_sourced=true, approved=null)
  const userPhotos =
    allMedia?.filter((m) => !m.is_google_sourced || m.approved === true) || [];
  const pendingGooglePhotos =
    allMedia?.filter((m) => m.is_google_sourced && m.approved === null) || [];

  const handleFetchGoogle = async () => {
    if (!segment) return;
    try {
      const result = await fetchGoogle.mutateAsync({
        tripId,
        segmentId: segment.id,
      });
      toast.success(
        result.message || `Fetched data from Google. ${result.photos_added} photos added.`
      );
    } catch (error) {
      toast.error("Failed to fetch from Google Places");
    }
  };

  const handleApprovePhoto = async (mediaId: string, approved: boolean) => {
    try {
      await approveMedia.mutateAsync({ tripId, mediaId, approved });
      toast.success(approved ? "Photo approved" : "Photo rejected");
    } catch (error) {
      toast.error("Failed to update photo");
    }
  };

  if (!segment) return null;

  // Calculate days in segment
  const startDate = new Date(segment.start_date);
  const endDate = new Date(segment.end_date);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <SheetTitle className="text-left">{segment.name}</SheetTitle>
                  {segment.location_name && (
                    <SheetDescription className="flex items-center gap-1 text-left">
                      {segment.location_name}
                    </SheetDescription>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* Date Range */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatTripDate(segment.start_date)} - {formatTripDate(segment.end_date)}
              </Badge>
              <Badge variant="secondary">
                {dayCount} {dayCount === 1 ? "day" : "days"}
              </Badge>
              {segment.country && (
                <Badge variant="outline">
                  {segment.country_code && `${segment.country_code} `}
                  {segment.country}
                </Badge>
              )}
            </div>

            {/* Google Data Button */}
            <Button
              variant="outline"
              onClick={handleFetchGoogle}
              disabled={fetchGoogle.isPending}
              className="w-full mb-4"
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", fetchGoogle.isPending && "animate-spin")}
              />
              {segment.photos_fetched ? "Refresh from Google" : "Fetch from Google"}
            </Button>

            {/* Photos Section - User photos first */}
            {userPhotos.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Photos</h4>
                <div className="grid grid-cols-2 gap-2">
                  {userPhotos.slice(0, 6).map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-video rounded-lg overflow-hidden group"
                    >
                      <img
                        src={photo.file_url}
                        alt={photo.caption || "Segment photo"}
                        className="w-full h-full object-cover"
                      />
                      {photo.google_attribution_name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                          <span className="text-white text-xs">
                            {photo.google_attribution_name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Google Photos - Need Approval */}
            {pendingGooglePhotos.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Pending Approval ({pendingGooglePhotos.length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {pendingGooglePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-video rounded-lg overflow-hidden group"
                    >
                      <img
                        src={photo.file_url}
                        alt="Google photo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApprovePhoto(photo.id, true)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApprovePhoto(photo.id, false)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      {photo.google_attribution_name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                          <span className="text-white text-xs">
                            {photo.google_attribution_name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Google Rating */}
            {segment.google_rating && (
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{segment.google_rating}</span>
                <span className="text-sm text-muted-foreground">Google rating</span>
              </div>
            )}

            {/* Location Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {segment.region && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="text-sm font-medium">{segment.region}</p>
                  </div>
                </div>
              )}
              {segment.timezone && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Timezone</p>
                    <p className="text-sm font-medium">{segment.timezone}</p>
                  </div>
                </div>
              )}
              {segment.population && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Population</p>
                    <p className="text-sm font-medium">
                      {segment.population.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {segment.local_currency && (
                <div className="flex items-start gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Currency</p>
                    <p className="text-sm font-medium">{segment.local_currency}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Languages */}
            {segment.languages && segment.languages.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Languages
                </h4>
                <div className="flex flex-wrap gap-1">
                  {segment.languages.map((lang, i) => (
                    <Badge key={i} variant="secondary">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {segment.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{segment.description}</p>
              </div>
            )}

            {/* City Info Sections */}
            {segment.city_info?.overview && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Overview
                </h4>
                <p className="text-sm text-muted-foreground">{segment.city_info.overview}</p>
              </div>
            )}

            {segment.city_info?.history && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  History
                </h4>
                <p className="text-sm text-muted-foreground">{segment.city_info.history}</p>
              </div>
            )}

            {segment.city_info?.culture && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Culture
                </h4>
                <p className="text-sm text-muted-foreground">
                  {typeof segment.city_info.culture === 'string'
                    ? segment.city_info.culture
                    : segment.city_info.culture.overview || 'No culture overview available'}
                </p>
              </div>
            )}

            {segment.city_info?.tips && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Tips
                </h4>
                <p className="text-sm text-muted-foreground">{segment.city_info.tips}</p>
              </div>
            )}

            {/* Weather */}
            {segment.weather_summary && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Weather
                </h4>
                <p className="text-sm text-muted-foreground">{segment.weather_summary}</p>
              </div>
            )}

            {/* Best Time to Visit */}
            {segment.best_time_to_visit && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Best Time to Visit
                </h4>
                <p className="text-sm text-muted-foreground">{segment.best_time_to_visit}</p>
              </div>
            )}

            {/* Main Attractions */}
            {segment.main_attractions && segment.main_attractions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Main Attractions
                </h4>
                <div className="space-y-2">
                  {segment.main_attractions.map((attraction, i) => (
                    <div key={i} className="p-2 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{attraction.name}</p>
                      {attraction.description && (
                        <p className="text-xs text-muted-foreground">
                          {attraction.description}
                        </p>
                      )}
                      {attraction.type && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {attraction.type}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Activities Summary */}
            {segment.key_activities_summary && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Key Activities</h4>
                <p className="text-sm text-muted-foreground">
                  {segment.key_activities_summary}
                </p>
              </div>
            )}

            {/* Driving Info */}
            {segment.driving_from_previous && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Getting Here
                </h4>
                <p className="text-sm text-muted-foreground">
                  {segment.driving_from_previous}
                </p>
                {segment.driving_notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {segment.driving_notes}
                  </p>
                )}
              </div>
            )}

            {/* Extended City Info - Deep History */}
            {segment.city_info?.deep_history && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Deep History
                </h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {typeof segment.city_info.deep_history === 'string'
                    ? segment.city_info.deep_history
                    : segment.city_info.deep_history.sections?.map((section, idx) => (
                        <div key={idx} className="mb-3">
                          <strong className="block text-foreground">{section.title}</strong>
                          <span>{section.content}</span>
                        </div>
                      )) || 'No history content available'}
                </div>
              </div>
            )}

            {/* Fado Section */}
            {segment.city_info?.fado && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Fado Music
                </h4>
                <p className="text-sm text-muted-foreground">{segment.city_info.fado}</p>
              </div>
            )}

            {/* Azulejos Section */}
            {segment.city_info?.azulejos && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Azulejos (Tiles)
                </h4>
                <p className="text-sm text-muted-foreground">{segment.city_info.azulejos}</p>
              </div>
            )}

            {/* Local Food */}
            {segment.local_food && segment.local_food.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  What to Eat
                </h4>
                <div className="space-y-2">
                  {segment.local_food.map((food, i) => (
                    <div key={i} className="p-2 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{food.name}</p>
                      <p className="text-xs text-muted-foreground">{food.description}</p>
                      {food.where_to_find && (
                        <p className="text-xs text-primary mt-1">📍 {food.where_to_find}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Packing List */}
            {segment.packing_list && segment.packing_list.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Packing List
                </h4>
                <div className="flex flex-wrap gap-2">
                  {segment.packing_list.map((item, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {item.item}
                      {item.notes && <span className="text-muted-foreground ml-1">({item.notes})</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Priorities */}
            {segment.booking_priorities && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Booking Priorities
                </h4>
                <div className="space-y-2">
                  {segment.booking_priorities.book_now && segment.booking_priorities.book_now.length > 0 && (
                    <div>
                      <Badge variant="destructive" className="mb-1">Book NOW</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {segment.booking_priorities.book_now.map((b, i) => (
                          <li key={i}>
                            {b.item}
                            {b.reason && <span className="text-xs"> — {b.reason}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {segment.booking_priorities.book_week_ahead && segment.booking_priorities.book_week_ahead.length > 0 && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Book 1 week ahead</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {segment.booking_priorities.book_week_ahead.map((b, i) => (
                          <li key={i}>
                            {b.item}
                            {b.reason && <span className="text-xs"> — {b.reason}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
