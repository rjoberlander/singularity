"use client";

import { useParams } from "next/navigation";
import { usePublicRVLocation } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoGallery } from "@/components/rv-locations/PhotoGallery";
import { useState } from "react";
import {
  MapPin,
  Star,
  Clock,
  DollarSign,
  Calendar,
  ExternalLink,
  Mountain,
  Bike,
  Waves,
  Fish,
  Ship,
  TreePine,
  Sparkles,
  Camera,
  Compass,
  Tent,
  Globe,
  Phone,
  TrendingUp,
  Lightbulb,
  LucideIcon,
} from "lucide-react";
import {
  getRVLocationCategoryLabel,
  getRVLandTypeLabel,
} from "@/lib/api";

// Activity icons mapping
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
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

const ACTIVITY_COLORS: Record<string, { icon: string; bg: string }> = {
  hike: { icon: "text-emerald-500", bg: "bg-emerald-500/10" },
  bike: { icon: "text-orange-500", bg: "bg-orange-500/10" },
  swim: { icon: "text-blue-500", bg: "bg-blue-500/10" },
  fish: { icon: "text-cyan-500", bg: "bg-cyan-500/10" },
  kayak: { icon: "text-sky-500", bg: "bg-sky-500/10" },
  horseback: { icon: "text-amber-600", bg: "bg-amber-600/10" },
  wildlife_viewing: { icon: "text-green-600", bg: "bg-green-600/10" },
  stargazing: { icon: "text-purple-500", bg: "bg-purple-500/10" },
  photography: { icon: "text-pink-500", bg: "bg-pink-500/10" },
  rock_climbing: { icon: "text-stone-500", bg: "bg-stone-500/10" },
  camping: { icon: "text-teal-500", bg: "bg-teal-500/10" },
  other: { icon: "text-gray-500", bg: "bg-gray-500/10" },
};

export default function PublicRVLocationPage() {
  const params = useParams();
  const token = params.token as string;
  const { data: location, isLoading, error } = usePublicRVLocation(token);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Link Not Found</h1>
            <p className="text-muted-foreground">
              This share link is invalid or has been revoked.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const media = location.media || [];
  const activities = location.activities || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with cover photos */}
      {media.length > 0 && (
        <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
          <div className="grid grid-cols-4 grid-rows-2 gap-1 h-full">
            <div
              className="col-span-2 row-span-2 relative cursor-pointer"
              onClick={() => { setGalleryInitialIndex(0); setGalleryOpen(true); }}
            >
              <img
                src={media[0].thumbnail_url || media[0].file_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            {media.slice(1, 5).map((item, i) => (
              <div
                key={item.id}
                className="relative cursor-pointer"
                onClick={() => { setGalleryInitialIndex(i + 1); setGalleryOpen(true); }}
              >
                <img
                  src={item.thumbnail_url || item.file_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {i === 3 && media.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">+{media.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Title and basic info */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {location.category && (
              <Badge variant="secondary">{getRVLocationCategoryLabel(location.category)}</Badge>
            )}
            {location.land_type && (
              <Badge variant="outline">{getRVLandTypeLabel(location.land_type)}</Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold">{location.name}</h1>
          {location.location_name && (
            <p className="text-lg text-muted-foreground mt-1">{location.location_name}</p>
          )}
          {(location.city || location.state) && (
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {[location.city, location.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4">
          {location.google_rating && (
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{location.google_rating}</span>
              {location.google_review_count && (
                <span className="text-muted-foreground">({location.google_review_count} reviews)</span>
              )}
            </div>
          )}
          {location.drive_time_from_la && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {location.drive_time_from_la} from LA
            </div>
          )}
          {location.cost_per_night !== undefined && location.cost_per_night !== null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              {location.cost_per_night === 0 ? "Free" : `$${location.cost_per_night}/night`}
            </div>
          )}
          {location.reservation_required && (
            <div className="flex items-center gap-1 text-orange-500">
              <Calendar className="h-4 w-4" />
              Reservation Required
            </div>
          )}
        </div>

        {/* Hook/Summary */}
        {location.hook && (
          <p className="text-lg">{location.hook}</p>
        )}

        {/* Description */}
        {location.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{location.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Links */}
        {(location.website || location.phone || location.reservation_url) && (
          <div className="flex flex-wrap gap-3">
            {location.website && (
              <a
                href={location.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                Website
              </a>
            )}
            {location.phone && (
              <a
                href={`tel:${location.phone}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {location.phone}
              </a>
            )}
            {location.reservation_url && (
              <a
                href={location.reservation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Calendar className="h-4 w-4" />
                Book Reservation
              </a>
            )}
          </div>
        )}

        {/* Activities */}
        {activities.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Activities ({activities.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => {
                  const ActivityIcon = (activity.activity_type && ACTIVITY_ICONS[activity.activity_type]) || MapPin;
                  const activityColors = (activity.activity_type && ACTIVITY_COLORS[activity.activity_type]) || { icon: "text-gray-500", bg: "bg-gray-500/10" };
                  return (
                    <div key={activity.id} className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg ${activityColors.bg} flex items-center justify-center shrink-0`}>
                          <ActivityIcon className={`h-5 w-5 ${activityColors.icon}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{activity.name}</span>
                            {activity.google_rating && (
                              <span className="flex items-center gap-0.5 text-sm">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-muted-foreground">{activity.google_rating}</span>
                              </span>
                            )}
                            {activity.difficulty && (
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${
                                  activity.difficulty === 'easy' ? 'border-green-500/50 text-green-600' :
                                  activity.difficulty === 'moderate' ? 'border-yellow-500/50 text-yellow-600' :
                                  'border-red-500/50 text-red-600'
                                }`}
                              >
                                {activity.difficulty}
                              </Badge>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                            {activity.duration_text && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {activity.duration_text}
                              </span>
                            )}
                            {activity.distance_miles && (
                              <span>{activity.distance_miles} mi</span>
                            )}
                            {activity.elevation_gain_ft && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {activity.elevation_gain_ft} ft
                              </span>
                            )}
                            {activity.cost_estimate !== undefined && activity.cost_estimate !== null && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {activity.cost_estimate === 0 ? "Free" : `$${activity.cost_estimate}`}
                              </span>
                            )}
                          </div>
                          {activity.tips && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                              <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                              <span>{activity.tips}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pros and Cons */}
        {(location.pros?.length || location.cons?.length) && (
          <div className="grid md:grid-cols-2 gap-4">
            {location.pros?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-600">Pros</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {location.pros.map((pro, i) => (
                      <li key={i} className="text-sm">• {pro}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {location.cons?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-red-600">Cons</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {location.cons.map((con, i) => (
                      <li key={i} className="text-sm">• {con}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Notes */}
        {location.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{location.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>Shared via Singularity</p>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery
        media={media}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        initialIndex={galleryInitialIndex}
        activities={activities.map(a => ({
          id: a.id,
          name: a.name,
          activity_type: a.activity_type,
          google_rating: a.google_rating,
          cost_estimate: a.cost_estimate,
          cost_notes: a.cost_notes,
        }))}
        location={{
          name: location.name,
          google_rating: location.google_rating,
          reservation_required: location.reservation_required,
          cost_per_night: location.cost_per_night,
        }}
      />
    </div>
  );
}
