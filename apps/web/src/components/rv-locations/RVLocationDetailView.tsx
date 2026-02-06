"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  Star,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Users,
  Car,
  Wifi,
  Plug,
  Phone,
  Globe,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  Pencil,
  Mountain,
  Timer,
  Navigation,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Lightbulb,
  Check,
  Bike,
  Waves,
  Fish,
  Ship,
  TreePine,
  Camera,
  Compass,
  Tent,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getRVLocationCategoryLabel,
  getRVLocationCategoryColor,
  getRVLandTypeLabel,
  getRVLandTypeColor,
} from "@/lib/api";
import { RVReviewsSection } from "@/components/rv-locations/RVReviewsSection";
import { RVActivityDetailSheet } from "@/components/rv-locations/RVActivityDetailSheet";
import { PhotoGallery } from "@/components/rv-locations/PhotoGallery";
import {
  RVKidEngagement,
  RVChildEngagement,
  RVEducationalValue,
  RVLocationActivity,
  RVLocationMedia,
  RVReviewHighlights,
} from "@singularity/shared-types";

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

function VibeStars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-muted-foreground text-sm">-</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function EmptyDataIndicator({ label = "Not researched" }: { label?: string }) {
  return (
    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
      <p className="text-sm text-muted-foreground/70 italic">{label}</p>
    </div>
  );
}

function KidEngagementCard({
  name,
  age,
  engagement,
  colorClass,
}: {
  name: string;
  age: number;
  engagement?: RVChildEngagement;
  colorClass: string;
}) {
  const hasData = engagement && (
    engagement.suitable !== undefined ||
    engagement.engagement_level ||
    (engagement.activities && engagement.activities.length > 0)
  );

  return (
    <div className={`rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">({age})</span>
      </div>
      {!hasData ? (
        <p className="text-sm text-muted-foreground/70 italic">Not researched</p>
      ) : (
        <div className="space-y-2">
          {engagement.suitable !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              {engagement.suitable ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span>{engagement.suitable ? "Suitable" : "Not suitable"}</span>
            </div>
          )}
          {engagement.engagement_level && (() => {
            const level = typeof engagement.engagement_level === 'number'
              ? engagement.engagement_level
              : engagement.engagement_level === 'high' ? 5
              : engagement.engagement_level === 'medium' ? 3
              : 1;
            const barColor = level >= 5 ? 'bg-green-500'
              : level >= 4 ? 'bg-blue-500'
              : level >= 3 ? 'bg-yellow-500'
              : level >= 2 ? 'bg-orange-500'
              : 'bg-red-500';
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Engagement:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${(level / 5) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{level}</span>
                </div>
              </div>
            );
          })()}
          {engagement.activities && engagement.activities.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Activities:</p>
              <ul className="text-sm space-y-0.5">
                {engagement.activities.map((activity, i) => (
                  <li key={i} className="text-muted-foreground">
                    • {activity}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {engagement.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {engagement.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export interface RVLocationData {
  id: string;
  name: string;
  description?: string | null;
  hook?: string | null;
  category?: string | null;
  land_type?: string | null;
  status?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  drive_time_from_la?: string | null;
  cost_per_night?: number | null;
  cost_notes?: string | null;
  reservation_required?: boolean | null;
  reservation_notes?: string | null;
  website?: string | null;
  phone?: string | null;
  notes?: string | null;
  google_place_id?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  tags?: string[] | null;
  pros?: string[] | null;
  cons?: string[] | null;
  vibe?: Record<string, number> | null;
  rv_logistics?: Record<string, any> | null;
  best_season?: { best?: string[]; avoid?: string[]; notes?: string } | null;
  educational_value?: RVEducationalValue | null;
  kid_engagement?: RVKidEngagement | null;
  reviews_summary?: string | null;
  reviews_highlights?: RVReviewHighlights | null;
  enriched_at?: string | null;
  activities?: RVLocationActivity[];
  media?: RVLocationMedia[];
}

export interface RVLocationDetailViewProps {
  location: RVLocationData;
  readOnly?: boolean;
  // Header actions (only used when not readOnly)
  headerActions?: React.ReactNode;
  // Activity callbacks
  onAddActivity?: () => void;
  onEditActivity?: (activity: RVLocationActivity) => void;
  onDeleteActivity?: (activityId: string) => void;
  // Photo callbacks
  onTogglePhotoSelection?: (photoId: string) => void;
  selectedPhotos?: Set<string>;
  onBatchDeletePhotos?: () => void;
  onToggleFavorite?: (mediaId: string) => void;
  // Enrich callback
  onEnrich?: () => void;
  isEnriching?: boolean;
  // Upload area (only used when not readOnly)
  uploadArea?: React.ReactNode;
}

export function RVLocationDetailView({
  location,
  readOnly = false,
  headerActions,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onTogglePhotoSelection,
  selectedPhotos = new Set(),
  onBatchDeletePhotos,
  onToggleFavorite,
  onEnrich,
  isEnriching = false,
  uploadArea,
}: RVLocationDetailViewProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [viewingActivity, setViewingActivity] = useState<RVLocationActivity | null>(null);

  const activities = location.activities || [];
  const media = location.media || [];
  const vibe = location.vibe;
  const logistics = location.rv_logistics;
  const bestSeason = location.best_season;
  const educationalValue = location.educational_value;
  const kidEngagement = location.kid_engagement;

  // Build Google Maps URL for rating link
  const googleMapsUrl = location.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${location.google_place_id}`
    : location.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Title line: Name + Link + Rating + Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{location.name}</h1>
            {location.website && (
              <a href={location.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {location.google_rating && (
              googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-foreground font-medium">{location.google_rating}</span>
                  {location.google_review_count && (
                    <span className="text-muted-foreground text-sm">({location.google_review_count})</span>
                  )}
                </a>
              ) : (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-foreground font-medium">{location.google_rating}</span>
                  {location.google_review_count && (
                    <span className="text-muted-foreground text-sm">({location.google_review_count})</span>
                  )}
                </span>
              )
            )}
            {location.category && (
              <Badge style={{ backgroundColor: getRVLocationCategoryColor(location.category) }}>
                {getRVLocationCategoryLabel(location.category)}
              </Badge>
            )}
            {location.land_type && (
              <Badge style={{ backgroundColor: getRVLandTypeColor(location.land_type) }}>
                {getRVLandTypeLabel(location.land_type)}
              </Badge>
            )}
            {(location.cost_per_night !== undefined && location.cost_per_night !== null) && (
              <Badge variant="outline" className="border-green-500/50 text-green-600">
                {location.cost_per_night === 0 ? "Free" : `$${location.cost_per_night}/night`}
              </Badge>
            )}
          </div>

          {/* Address line: Address + Phone + Drive time + Reservation */}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {(location.address || location.city || location.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {location.address || [location.city, location.state].filter(Boolean).join(", ")}
              </span>
            )}
            {location.phone && (
              <a href={`tel:${location.phone}`} className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-4 w-4" />
                {location.phone}
              </a>
            )}
            {location.drive_time_from_la && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {location.drive_time_from_la} from LA
              </span>
            )}
            {location.reservation_required && (
              <Badge variant="outline" className="border-orange-500/50 text-orange-500 text-xs">
                Reservation Required
              </Badge>
            )}
          </div>
        </div>

        {!readOnly && headerActions && (
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
          </div>
        )}
      </div>

      {/* Cover Image / Media Preview */}
      {media.length > 0 && (
        <div className="grid grid-cols-4 gap-2 h-64">
          <div className="col-span-2 row-span-2 relative rounded-lg overflow-hidden bg-muted cursor-pointer" onClick={() => { setGalleryInitialIndex(0); setGalleryOpen(true); }}>
            <img src={media[0].thumbnail_url || media[0].file_url} alt="" className="w-full h-full object-cover" />
          </div>
          {media.slice(1, 5).map((item, i) => (
            <div key={item.id} className="relative rounded-lg overflow-hidden bg-muted cursor-pointer" onClick={() => { setGalleryInitialIndex(i + 1); setGalleryOpen(true); }}>
              <img src={item.thumbnail_url || item.file_url} alt="" className="w-full h-full object-cover" />
              {i === 3 && media.length > 5 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                  +{media.length - 5} more
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Why Visit (Hook) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Why Visit</CardTitle>
            </CardHeader>
            <CardContent>
              {location.hook ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{location.hook}</p>
              ) : (
                <EmptyDataIndicator label="Hook not researched - why should we visit here?" />
              )}
              {location.description && (
                <p className="text-sm text-muted-foreground/70 mt-3 pt-3 border-t whitespace-pre-wrap">
                  {location.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <RVReviewsSection
            locationId={location.id}
            locationName={location.name}
            googleRating={location.google_rating ?? undefined}
            googleReviewCount={location.google_review_count ?? undefined}
            reviewsSummary={location.reviews_summary ?? undefined}
            reviewsHighlights={location.reviews_highlights ?? undefined}
            enrichedAt={location.enriched_at ?? undefined}
            isEnriching={isEnriching}
          />

          {/* Pros & Cons */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  Pros
                </CardTitle>
              </CardHeader>
              <CardContent>
                {location.pros && location.pros.length > 0 ? (
                  <ul className="space-y-1">
                    {location.pros.map((pro, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-1">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyDataIndicator />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                  Cons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {location.cons && location.cons.length > 0 ? (
                  <ul className="space-y-1">
                    {location.cons.map((con, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-1">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyDataIndicator />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Kid Engagement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Kid Engagement
              </CardTitle>
              <CardDescription>How each child will enjoy this destination</CardDescription>
            </CardHeader>
            <CardContent>
              {kidEngagement && (kidEngagement.parker || kidEngagement.charlotte || kidEngagement.xander) ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  <KidEngagementCard
                    name="Parker"
                    age={8}
                    engagement={kidEngagement.parker}
                    colorClass="bg-blue-500/10 border border-blue-500/20"
                  />
                  <KidEngagementCard
                    name="Charlotte"
                    age={5}
                    engagement={kidEngagement.charlotte}
                    colorClass="bg-pink-500/10 border border-pink-500/20"
                  />
                  <KidEngagementCard
                    name="Xander"
                    age={3}
                    engagement={kidEngagement.xander}
                    colorClass="bg-green-500/10 border border-green-500/20"
                  />
                </div>
              ) : (
                <EmptyDataIndicator label="Kid engagement not researched" />
              )}
            </CardContent>
          </Card>

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
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          {/* RV Logistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" />
                RV Logistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logistics && Object.keys(logistics).length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {logistics.hookups && (
                      <Badge
                        variant="outline"
                        className={
                          logistics.hookups === "full"
                            ? "border-green-500/50 bg-green-500/10 text-green-600"
                            : logistics.hookups === "water_electric"
                            ? "border-blue-500/50 bg-blue-500/10 text-blue-600"
                            : "border-muted-foreground/30"
                        }
                      >
                        <Plug className="h-3 w-3 mr-1" />
                        {logistics.hookups === "full" ? "Full Hookups" :
                         logistics.hookups === "water_electric" ? "W/E" :
                         logistics.hookups === "electric_only" ? "Electric" :
                         logistics.hookups === "dry" ? "Dry Camping" : "No Hookups"}
                      </Badge>
                    )}
                    {logistics.cell_coverage && (
                      <Badge
                        variant="outline"
                        className={
                          logistics.cell_coverage === "excellent" || logistics.cell_coverage === "good"
                            ? "border-green-500/50 bg-green-500/10 text-green-600"
                            : logistics.cell_coverage === "spotty"
                            ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-600"
                            : "border-red-500/50 bg-red-500/10 text-red-600"
                        }
                      >
                        <Wifi className="h-3 w-3 mr-1" />
                        {logistics.cell_coverage === "excellent" ? "Great Signal" :
                         logistics.cell_coverage === "good" ? "Good Signal" :
                         logistics.cell_coverage === "spotty" ? "Spotty" : "No Signal"}
                      </Badge>
                    )}
                    {logistics.starlink_friendly && (
                      <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10 text-purple-600">
                        Starlink OK
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {logistics.max_trailer_length_ft && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Length</span>
                        <span>{logistics.max_trailer_length_ft} ft</span>
                      </div>
                    )}
                    {logistics.fifth_wheel_accessible !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">5th Wheel</span>
                        <span className={logistics.fifth_wheel_accessible ? "text-green-600" : "text-red-500"}>
                          {logistics.fifth_wheel_accessible ? "OK" : "No"}
                        </span>
                      </div>
                    )}
                    {logistics.road_accessibility && (
                      <p className="text-xs text-muted-foreground mt-2">{logistics.road_accessibility}</p>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyDataIndicator />
              )}
            </CardContent>
          </Card>

          {/* The Vibe */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">The Vibe</CardTitle>
            </CardHeader>
            <CardContent>
              {vibe && Object.keys(vibe).length > 0 ? (
                <div className="space-y-2">
                  {[
                    { key: "scenic_beauty", label: "Scenic Beauty" },
                    { key: "solitude_level", label: "Solitude" },
                    { key: "relaxation_factor", label: "Relaxation" },
                    { key: "adventure_level", label: "Adventure" },
                    { key: "family_friendly", label: "Family Friendly" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <VibeStars rating={vibe[key]} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyDataIndicator />
              )}
            </CardContent>
          </Card>

          {/* Educational Value */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Educational Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {educationalValue && (
                educationalValue.visitor_center !== undefined ||
                educationalValue.junior_ranger_program !== undefined ||
                educationalValue.ranger_programs !== undefined ||
                (educationalValue.topics && educationalValue.topics.length > 0)
              ) ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {educationalValue.visitor_center !== undefined && (
                      <Badge
                        variant="outline"
                        className={educationalValue.visitor_center ? "border-green-500/50 text-green-600" : "border-muted-foreground/30 text-muted-foreground"}
                      >
                        {educationalValue.visitor_center ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        Visitor Center
                      </Badge>
                    )}
                    {educationalValue.junior_ranger_program !== undefined && (
                      <Badge
                        variant="outline"
                        className={educationalValue.junior_ranger_program ? "border-green-500/50 text-green-600" : "border-muted-foreground/30 text-muted-foreground"}
                      >
                        {educationalValue.junior_ranger_program ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        Junior Ranger
                      </Badge>
                    )}
                    {educationalValue.ranger_programs !== undefined && (
                      <Badge
                        variant="outline"
                        className={educationalValue.ranger_programs ? "border-green-500/50 text-green-600" : "border-muted-foreground/30 text-muted-foreground"}
                      >
                        {educationalValue.ranger_programs ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        Ranger Programs
                      </Badge>
                    )}
                  </div>
                  {educationalValue.topics && educationalValue.topics.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Learning Topics</p>
                      <div className="flex flex-wrap gap-1">
                        {educationalValue.topics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs capitalize">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyDataIndicator />
              )}
            </CardContent>
          </Card>

          {/* Cost & Reservations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cost & Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(location.cost_per_night !== undefined || location.reservation_required !== undefined || location.reservation_notes) ? (
                <div className="space-y-2 text-sm">
                  {location.cost_per_night !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per Night</span>
                      <span>{location.cost_per_night === 0 ? "Free" : `$${location.cost_per_night}`}</span>
                    </div>
                  )}
                  {location.reservation_required !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reservation</span>
                      <span>{location.reservation_required ? "Required" : "Not Required"}</span>
                    </div>
                  )}
                  {location.cost_notes && (
                    <p className="text-muted-foreground text-xs mt-2">{location.cost_notes}</p>
                  )}
                  {location.reservation_notes && (
                    <p className="text-muted-foreground text-xs">{location.reservation_notes}</p>
                  )}
                </div>
              ) : (
                <EmptyDataIndicator />
              )}
            </CardContent>
          </Card>

          {/* Best Season */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Best Season
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestSeason && (bestSeason.best?.length || bestSeason.avoid?.length) ? (
                <div>
                  {bestSeason.best && bestSeason.best.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Best months</p>
                      <div className="flex flex-wrap gap-1">
                        {bestSeason.best.map((month) => (
                          <Badge key={month} className="text-xs capitalize bg-green-500/20 text-green-600 border-green-500/30">
                            {month.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {bestSeason.avoid && bestSeason.avoid.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Avoid</p>
                      <div className="flex flex-wrap gap-1">
                        {bestSeason.avoid.map((month) => (
                          <Badge key={month} variant="outline" className="text-xs capitalize text-red-500 border-red-500/30">
                            {month.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {bestSeason.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{bestSeason.notes}</p>
                  )}
                </div>
              ) : (
                <EmptyDataIndicator />
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {location.tags && location.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {location.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions (only when not readOnly) */}
          {!readOnly && uploadArea && (
            <Card className="p-[1px]">
              <CardContent className="p-2 space-y-1.5">
                {uploadArea}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Activities Section - Full Width */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activities ({activities.length})</CardTitle>
            {!readOnly && (
              <div className="flex items-center gap-2">
                {selectedPhotos.size > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">{selectedPhotos.size} selected</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTogglePhotoSelection && activities.forEach(a =>
                        media.filter(m => m.activity_id === a.id).forEach(m => {
                          if (selectedPhotos.has(m.id)) onTogglePhotoSelection(m.id);
                        })
                      )}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onBatchDeletePhotos}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
                {onAddActivity && (
                  <Button size="sm" onClick={onAddActivity}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <EmptyDataIndicator label="No activities added yet" />
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const activityPhotos = media.filter(m => m.activity_id === activity.id);
                const ActivityIcon = (activity.activity_type && ACTIVITY_ICONS[activity.activity_type]) || MapPin;
                const activityColors = (activity.activity_type && ACTIVITY_COLORS[activity.activity_type]) || { icon: "text-gray-500", bg: "bg-gray-500/10" };
                return (
                  <div
                    key={activity.id}
                    className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start gap-3" onClick={() => setViewingActivity(activity)}>
                      {/* Left column: Icon + Type + Difficulty */}
                      <div className="flex flex-col items-center shrink-0 w-14 px-[1px] cursor-pointer">
                        <div className={`h-12 w-12 rounded-lg ${activityColors.bg} flex items-center justify-center`}>
                          <ActivityIcon className={`h-7 w-7 ${activityColors.icon}`} />
                        </div>
                        {activity.activity_type && (
                          <span className="text-[10px] text-muted-foreground capitalize mt-1 text-center">
                            {activity.activity_type.replace("_", " ")}
                          </span>
                        )}
                        {activity.difficulty && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 mt-1 capitalize ${
                              activity.difficulty === 'easy' ? 'border-green-500/50 text-green-600' :
                              activity.difficulty === 'moderate' ? 'border-yellow-500/50 text-yellow-600' :
                              activity.difficulty === 'strenuous' || activity.difficulty === 'hard' ? 'border-red-500/50 text-red-600' :
                              ''
                            }`}
                          >
                            {activity.difficulty}
                          </Badge>
                        )}
                      </div>
                      {/* Main content */}
                      <div className="flex-1 min-w-0 cursor-pointer">
                        {/* Title line: Name + Links + Rating */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{activity.name}</span>
                          {activity.google_place_id && (
                            <a
                              href={`https://www.google.com/maps/place/?q=place_id:${activity.google_place_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {activity.alltrails_url && (
                            <a
                              href={activity.alltrails_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Mountain className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {activity.google_rating && (
                            <span className="flex items-center gap-0.5 text-sm">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-muted-foreground">{activity.google_rating}</span>
                            </span>
                          )}
                          {activity.time_of_day && activity.time_of_day !== "any" && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.time_of_day}
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          {activity.duration_text && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {activity.duration_text}
                            </span>
                          )}
                          {activity.distance_miles && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {activity.distance_miles} mi
                            </span>
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
                        {/* Tips preview */}
                        {activity.tips && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                            <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                            <span className="line-clamp-2">{activity.tips}</span>
                          </p>
                        )}
                        {/* Kid engagement details */}
                        {activity.kid_engagement && (activity.kid_engagement.parker || activity.kid_engagement.charlotte || activity.kid_engagement.xander) && (
                          <div className="mt-2 space-y-1">
                            {[
                              { name: 'Parker', age: 8, data: activity.kid_engagement.parker, textColor: 'text-blue-500' },
                              { name: 'Charlotte', age: 5, data: activity.kid_engagement.charlotte, textColor: 'text-pink-500' },
                              { name: 'Xander', age: 3, data: activity.kid_engagement.xander, textColor: 'text-green-500' },
                            ].filter(k => k.data).map(kid => {
                              const engagement = kid.data;
                              const level = typeof (engagement as any)?.engagement_level === 'number'
                                ? (engagement as any).engagement_level
                                : engagement?.engagement_level === 'high' ? 5
                                : engagement?.engagement_level === 'medium' ? 3
                                : engagement?.engagement_level === 'low' ? 1 : 0;
                              const barColor = level >= 5 ? 'bg-green-500'
                                : level >= 4 ? 'bg-blue-500'
                                : level >= 3 ? 'bg-yellow-500'
                                : level >= 2 ? 'bg-orange-500'
                                : 'bg-red-500';
                              return (
                                <div key={kid.name} className="flex items-center gap-2 text-xs">
                                  <span className={`font-medium ${kid.textColor} w-16 shrink-0`}>{kid.name}</span>
                                  {level > 0 && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${(level / 5) * 100}%` }} />
                                      </div>
                                      <span className="text-muted-foreground w-3">{level}</span>
                                    </div>
                                  )}
                                  {!engagement?.suitable && (
                                    <span className="text-red-500/70 text-[10px]">✗</span>
                                  )}
                                  {engagement?.activities && engagement.activities.length > 0 && (
                                    <span className="text-muted-foreground truncate">
                                      {engagement.activities.slice(0, 3).join(' • ')}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditActivity?.(activity);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActivity?.(activity.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Activity Photos */}
                    {activityPhotos.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-muted-foreground/10">
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                          {activityPhotos.map((photo) => {
                            const isSelected = selectedPhotos.has(photo.id);
                            return (
                              <div
                                key={photo.id}
                                className={`relative aspect-square rounded-md overflow-hidden cursor-pointer transition-all ${
                                  isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-muted-foreground/50'
                                }`}
                              >
                                <img
                                  src={photo.thumbnail_url || photo.file_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onClick={() => {
                                    const globalIndex = media.findIndex(m => m.id === photo.id);
                                    setGalleryInitialIndex(globalIndex >= 0 ? globalIndex : 0);
                                    setGalleryOpen(true);
                                  }}
                                />
                                {!readOnly && onTogglePhotoSelection && (
                                  <div
                                    className="absolute top-0 right-0 z-10 p-0.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onTogglePhotoSelection(photo.id);
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      className="h-4 w-4 bg-white/90 border-muted-foreground/50 rounded-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <PhotoGallery
        media={media}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        initialIndex={galleryInitialIndex}
        onToggleFavorite={!readOnly ? onToggleFavorite : undefined}
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
          google_rating: location.google_rating ?? undefined,
          reservation_required: location.reservation_required ?? undefined,
          cost_per_night: location.cost_per_night ?? undefined,
        }}
      />

      {/* Activity Detail Sheet */}
      <RVActivityDetailSheet
        activity={viewingActivity}
        open={!!viewingActivity}
        onOpenChange={(open) => !open && setViewingActivity(null)}
        onEdit={!readOnly ? (activity) => {
          setViewingActivity(null);
          onEditActivity?.(activity);
        } : undefined}
      />
    </div>
  );
}
