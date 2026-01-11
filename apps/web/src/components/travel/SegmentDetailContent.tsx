"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { TripSegment } from "@singularity/shared-types";
import {
  useFetchGooglePlacesForSegment,
  useTripMedia,
  useApproveTripMedia,
  formatTripDate,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SegmentDetailContentProps {
  segment: TripSegment;
  tripId: string;
}

export function SegmentDetailContent({
  segment,
  tripId,
}: SegmentDetailContentProps) {
  const fetchGoogle = useFetchGooglePlacesForSegment();
  const approveMedia = useApproveTripMedia();

  // Get media for this segment
  const { data: allMedia } = useTripMedia(tripId, "segment", segment.id);

  // Filter: user photos first (is_google_sourced=false OR approved=true)
  // Then show pending Google photos (is_google_sourced=true, approved=null)
  const userPhotos =
    allMedia?.filter((m) => !m.is_google_sourced || m.approved === true) || [];
  const pendingGooglePhotos =
    allMedia?.filter((m) => m.is_google_sourced && m.approved === null) || [];

  const handleFetchGoogle = async () => {
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

  // Calculate days in segment
  const startDate = new Date(segment.start_date);
  const endDate = new Date(segment.end_date);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <MapPin className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{segment.name}</h2>
            {segment.location_name && (
              <p className="text-muted-foreground mt-1">
                {segment.location_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-wrap gap-2 mb-6">
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
        className="w-full mb-6"
      >
        <RefreshCw
          className={cn("h-4 w-4 mr-2", fetchGoogle.isPending && "animate-spin")}
        />
        {segment.photos_fetched ? "Refresh from Google" : "Fetch from Google"}
      </Button>

      {/* Photos Section - User photos first */}
      {userPhotos.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">Photos</h4>
          <div className="grid grid-cols-3 gap-2">
            {userPhotos.slice(0, 9).map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden group"
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            Pending Approval ({pendingGooglePhotos.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {pendingGooglePhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden group"
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

      <Separator className="my-6" />

      {/* Google Rating */}
      {segment.google_rating && (
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="text-lg font-medium">{segment.google_rating}</span>
          <span className="text-muted-foreground">Google rating</span>
        </div>
      )}

      {/* Location Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Languages
          </h4>
          <div className="flex flex-wrap gap-2">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.description}</p>
        </div>
      )}

      {/* City Info Sections */}
      {segment.city_info?.overview && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.overview}</p>
        </div>
      )}

      {segment.city_info?.history && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            History
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.history}</p>
        </div>
      )}

      {/* Legacy culture is now handled in V3 Culture section below */}

      {segment.city_info?.tips && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Tips
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.tips}</p>
        </div>
      )}

      {/* Weather */}
      {segment.weather_summary && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Weather
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.weather_summary}</p>
        </div>
      )}

      {/* Best Time to Visit */}
      {segment.best_time_to_visit && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Best Time to Visit
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.best_time_to_visit}</p>
        </div>
      )}

      {/* Main Attractions */}
      {segment.main_attractions && segment.main_attractions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Main Attractions
          </h4>
          <div className="space-y-2">
            {segment.main_attractions.map((attraction, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{attraction.name}</p>
                {attraction.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {attraction.description}
                  </p>
                )}
                {attraction.type && (
                  <Badge variant="outline" className="mt-2 text-xs">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Key Activities</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {segment.key_activities_summary}
          </p>
        </div>
      )}

      {/* Driving Info */}
      {segment.driving_from_previous && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Car className="h-4 w-4" />
            Getting Here
          </h4>
          <p className="text-sm text-muted-foreground">
            {segment.driving_from_previous}
          </p>
          {segment.driving_notes && (
            <p className="text-sm text-muted-foreground mt-2">
              {segment.driving_notes}
            </p>
          )}
        </div>
      )}

      {/* V3 City Info - Intro */}
      {segment.city_info?.intro && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Introduction
          </h4>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {segment.city_info.intro}
          </div>
        </div>
      )}

      {/* V3 Extended City Info - Deep History with Sections */}
      {segment.city_info?.deep_history && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Deep History
          </h4>
          {/* V3 format: sections array */}
          {typeof segment.city_info.deep_history === 'object' && 'sections' in segment.city_info.deep_history ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {(segment.city_info.deep_history as { sections: Array<{ title: string; content: string; relevance?: string }> }).sections.map((section, idx) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">{section.title}</h5>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </div>
                  {section.relevance && (
                    <p className="text-xs text-primary mt-2 italic">
                      🎯 {section.relevance}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Legacy format: string
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
              {segment.city_info.deep_history as string}
            </div>
          )}
        </div>
      )}

      {/* V3 Culture - Traditions */}
      {segment.city_info?.culture && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Culture
          </h4>
          {typeof segment.city_info.culture === 'object' && 'traditions' in segment.city_info.culture ? (
            <div className="space-y-3">
              {segment.city_info.culture.overview && (
                <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.culture.overview}</p>
              )}
              {(segment.city_info.culture as { traditions?: Array<{ name: string; story: string; where_to_experience?: string; kid_friendly?: boolean }> }).traditions?.map((tradition, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-sm">{tradition.name}</p>
                    {tradition.kid_friendly && <Badge variant="secondary" className="text-xs">Kid Friendly</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{tradition.story}</p>
                  {tradition.where_to_experience && (
                    <p className="text-xs text-primary mt-1">📍 {tradition.where_to_experience}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Legacy format: string
            <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.culture as string}</p>
          )}
        </div>
      )}

      {/* V3 Cuisine - Signature Foods */}
      {segment.city_info?.cuisine && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Cuisine
          </h4>
          {typeof segment.city_info.cuisine === 'object' && 'signature_foods' in segment.city_info.cuisine ? (
            <div className="space-y-3">
              {segment.city_info.cuisine.overview && (
                <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.cuisine.overview}</p>
              )}
              {(segment.city_info.cuisine as { signature_foods?: Array<{ name: string; story: string; where_to_try?: string; kid_appeal?: string }> }).signature_foods?.map((food, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm">{food.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{food.story}</p>
                  {food.where_to_try && (
                    <p className="text-xs text-primary mt-1">📍 {food.where_to_try}</p>
                  )}
                  {food.kid_appeal && (
                    <p className="text-xs text-amber-600 mt-1">👶 {food.kid_appeal}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Legacy format: string
            <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.cuisine as string}</p>
          )}
        </div>
      )}

      {/* Fado Section */}
      {segment.city_info?.fado && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Music className="h-4 w-4" />
            Fado Music
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.fado}</p>
        </div>
      )}

      {/* Azulejos Section */}
      {segment.city_info?.azulejos && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Azulejos (Tiles)
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{segment.city_info.azulejos}</p>
        </div>
      )}

      {/* Local Food */}
      {segment.local_food && segment.local_food.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            What to Eat
          </h4>
          <div className="space-y-2">
            {segment.local_food.map((food, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{food.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{food.description}</p>
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Booking Priorities
          </h4>
          <div className="space-y-3">
            {segment.booking_priorities.book_now && segment.booking_priorities.book_now.length > 0 && (
              <div>
                <Badge variant="destructive" className="mb-2">Book NOW</Badge>
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
                <Badge variant="secondary" className="mb-2">Book 1 week ahead</Badge>
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
  );
}
