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
  Clock,
  MapPin,
  Phone,
  Globe,
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Calendar,
  AlertCircle,
  Utensils,
  Mountain,
  Waves,
  Building2,
  Car,
  MoreHorizontal,
  Ticket,
  Users,
  Backpack,
  Lightbulb,
  BookOpen,
  Eye,
  AlertTriangle,
  Baby,
  Timer,
  History,
  Columns,
  Footprints,
  Plane,
  Coffee,
  BedDouble,
  Moon,
  ClipboardList,
} from "lucide-react";
import { TripActivity, TripMedia } from "@singularity/shared-types";
import {
  useFetchGooglePlacesForActivity,
  useTripMedia,
  useApproveTripMedia,
  getActivityTypeIcon,
  getTimeBlockLabel,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActivityDetailPanelProps {
  activity: TripActivity | null;
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get activity type icon as a component
function ActivityTypeIcon({ type, subType }: { type: string; subType?: string }) {
  const iconClass = "h-5 w-5";
  // Sub-type specific icons
  if (subType) {
    switch (subType) {
      case "hike": return <Mountain className={iconClass} />;
      case "beach": return <Waves className={iconClass} />;
      case "museum": return <Building2 className={iconClass} />;
      case "viewpoint": return <Eye className={iconClass} />;
      case "tour": return <Ticket className={iconClass} />;
      case "walking": return <Footprints className={iconClass} />;
      case "long_haul": return <Car className={iconClass} />;
      case "flight": return <Plane className={iconClass} />;
      case "coffee": return <Coffee className={iconClass} />;
      case "pool": return <Waves className={iconClass} />;
      case "check_in": case "check_out": return <BedDouble className={iconClass} />;
      case "packing": return <Backpack className={iconClass} />;
    }
  }
  // Category-level icons
  switch (type) {
    case "restaurant": return <Utensils className={iconClass} />;
    case "activity": return <Star className={iconClass} />;
    case "transport": return <Car className={iconClass} />;
    case "downtime": return <Moon className={iconClass} />;
    case "logistics": return <ClipboardList className={iconClass} />;
    // Legacy
    case "hike": return <Mountain className={iconClass} />;
    case "beach": return <Waves className={iconClass} />;
    case "museum": return <Building2 className={iconClass} />;
    default: return <MoreHorizontal className={iconClass} />;
  }
}

// Price level display
function PriceLevel({ level }: { level: number }) {
  return (
    <div className="flex items-center">
      {Array.from({ length: 4 }).map((_, i) => (
        <DollarSign
          key={i}
          className={cn(
            "h-3 w-3",
            i < level ? "text-green-600" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export function ActivityDetailPanel({
  activity,
  tripId,
  open,
  onOpenChange,
}: ActivityDetailPanelProps) {
  const fetchGoogle = useFetchGooglePlacesForActivity();
  const approveMedia = useApproveTripMedia();

  // Get media for this activity
  const { data: allMedia } = useTripMedia(tripId, "activity", activity?.id);

  // Filter: user photos first (is_google_sourced=false OR approved=true)
  // Then show pending Google photos (is_google_sourced=true, approved=null)
  const userPhotos =
    allMedia?.filter((m) => !m.is_google_sourced || m.approved === true) || [];
  const pendingGooglePhotos =
    allMedia?.filter((m) => m.is_google_sourced && m.approved === null) || [];

  const handleFetchGoogle = async () => {
    if (!activity) return;
    try {
      const result = await fetchGoogle.mutateAsync({
        tripId,
        activityId: activity.id,
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

  const handleApproveAllPhotos = async () => {
    try {
      await Promise.all(
        pendingGooglePhotos.map((photo) =>
          approveMedia.mutateAsync({ tripId, mediaId: photo.id, approved: true })
        )
      );
      toast.success(`Approved ${pendingGooglePhotos.length} photos`);
    } catch (error) {
      toast.error("Failed to approve some photos");
    }
  };

  if (!activity) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ActivityTypeIcon type={activity.activity_type || "activity"} subType={activity.activity_sub_type} />
                </div>
                <div>
                  <SheetTitle className="text-left">{activity.name}</SheetTitle>
                  {activity.location_name && (
                    <SheetDescription className="flex items-center gap-1 text-left">
                      <MapPin className="h-3 w-3" />
                      {activity.location_name}
                    </SheetDescription>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* Time Block and Status */}
            <div className="flex flex-wrap gap-2 mb-4">
              {activity.time_block && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {getTimeBlockLabel(activity.time_block)}
                </Badge>
              )}
              {activity.start_time && (
                <Badge variant="outline">
                  {activity.start_time}
                  {activity.end_time && ` - ${activity.end_time}`}
                </Badge>
              )}
              {activity.priority && (
                <Badge
                  variant={activity.priority === "must_do" ? "default" : "outline"}
                >
                  {activity.priority.replace("_", " ")}
                </Badge>
              )}
              {activity.confirmation_status === "confirmed" && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmed
                </Badge>
              )}
            </div>

            {/* Data Status Badges */}
            <div className="flex flex-wrap gap-1.5 mb-4 p-2 bg-muted/50 rounded-lg">
              {/* Debug - always show */}
              <span className="text-xs text-muted-foreground">Status:</span>

              {/* Google Data Badge */}
              {activity.google_place_id ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Google
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  No Google Data
                </Badge>
              )}

              {/* Photos Badge */}
              {userPhotos.length > 0 && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <Eye className="h-3 w-3 mr-1" />
                  {userPhotos.length} Photos
                </Badge>
              )}

              {/* Google Maps Link */}
              {activity.google_maps_url && (
                <a href={activity.google_maps_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 cursor-pointer hover:bg-blue-500/20">
                    <MapPin className="h-3 w-3 mr-1" />
                    Maps
                    <ExternalLink className="h-2.5 w-2.5 ml-1" />
                  </Badge>
                </a>
              )}

              {/* Ticket Required Badge */}
              {activity.reservation_required && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Ticket className="h-3 w-3 mr-1" />
                  Tickets Required
                </Badge>
              )}

              {/* Urgent Ticket Badge - if reservation required and not confirmed */}
              {activity.reservation_required && activity.confirmation_status !== "confirmed" && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Book Now!
                </Badge>
              )}

              {/* Rating Badge */}
              {activity.google_rating && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                  {activity.google_rating}
                  {activity.google_review_count && (
                    <span className="text-xs ml-1 opacity-70">({activity.google_review_count.toLocaleString()})</span>
                  )}
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
              {activity.photos_fetched ? "Refresh from Google" : "Fetch from Google"}
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
                        alt={photo.caption || "Activity photo"}
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
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    Pending Approval ({pendingGooglePhotos.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApproveAllPhotos}
                    className="text-xs h-7"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve All
                  </Button>
                </div>
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

            {/* Google Rating & Reviews */}
            {activity.google_rating && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{activity.google_rating}</span>
                </div>
                {activity.google_review_count && (
                  <span className="text-sm text-muted-foreground">
                    ({activity.google_review_count.toLocaleString()} reviews)
                  </span>
                )}
                {activity.google_price_level && (
                  <PriceLevel level={activity.google_price_level} />
                )}
              </div>
            )}

            {/* Opening Hours */}
            {activity.opening_hours?.weekday_text && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours
                  {activity.opening_hours.open_now !== undefined && (
                    <Badge
                      variant={activity.opening_hours.open_now ? "default" : "secondary"}
                      className={cn(
                        activity.opening_hours.open_now && "bg-green-600"
                      )}
                    >
                      {activity.opening_hours.open_now ? "Open" : "Closed"}
                    </Badge>
                  )}
                </h4>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {activity.opening_hours.weekday_text.map((day, i) => (
                    <div key={i}>{day}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {activity.description && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              </div>
            )}

            {/* Why It's Great */}
            {activity.why_its_great && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Why It's Great
                </h4>
                <p className="text-sm text-muted-foreground">{activity.why_its_great}</p>
              </div>
            )}

            {/* Kid Friendliness */}
            {activity.kid_friendliness && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Kid Friendliness
                  {activity.kid_rating && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            i < activity.kid_rating!
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </h4>
                <p className="text-sm text-muted-foreground">{activity.kid_friendliness}</p>
              </div>
            )}

            {/* Gear/Prep */}
            {activity.gear_prep && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Backpack className="h-4 w-4" />
                  What to Bring
                </h4>
                <p className="text-sm text-muted-foreground">{activity.gear_prep}</p>
              </div>
            )}

            {/* Practical Details */}
            {activity.practical_details && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Practical Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {activity.practical_details.hours && (
                    <div>
                      <span className="text-muted-foreground">Hours:</span>
                      <p className="font-medium">{activity.practical_details.hours}</p>
                    </div>
                  )}
                  {activity.practical_details.time_needed && (
                    <div>
                      <span className="text-muted-foreground">Time needed:</span>
                      <p className="font-medium">{activity.practical_details.time_needed}</p>
                    </div>
                  )}
                  {activity.practical_details.cost_breakdown && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Cost:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {activity.practical_details.cost_breakdown.adults && (
                          <Badge variant="outline">Adults: {activity.practical_details.cost_breakdown.adults}</Badge>
                        )}
                        {activity.practical_details.cost_breakdown.seniors && (
                          <Badge variant="outline">Seniors: {activity.practical_details.cost_breakdown.seniors}</Badge>
                        )}
                        {activity.practical_details.cost_breakdown.kids && (
                          <Badge variant="outline">Kids: {activity.practical_details.cost_breakdown.kids}</Badge>
                        )}
                        {activity.practical_details.cost_breakdown.under_x_free && (
                          <Badge variant="secondary">{activity.practical_details.cost_breakdown.under_x_free}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {activity.practical_details.avoid_times && activity.practical_details.avoid_times.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Avoid:</span>
                      <p className="font-medium text-amber-600">{activity.practical_details.avoid_times.join(", ")}</p>
                    </div>
                  )}
                  {activity.practical_details.getting_there && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Getting there:</span>
                      <p className="font-medium">{activity.practical_details.getting_there}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Deep Dive Content - V3 JSONB format */}
            {activity.deep_dive && typeof activity.deep_dive === 'object' && (
              <div className="mb-4 space-y-4">
                {(activity.deep_dive as any).what_it_is && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      What It Is
                    </h4>
                    <p className="text-sm text-muted-foreground">{(activity.deep_dive as any).what_it_is}</p>
                  </div>
                )}
                {(activity.deep_dive as any).why_it_matters && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Why It Matters
                    </h4>
                    <p className="text-sm text-muted-foreground">{(activity.deep_dive as any).why_it_matters}</p>
                  </div>
                )}
                {(activity.deep_dive as any).the_story && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      The Story
                    </h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {(activity.deep_dive as any).the_story}
                    </div>
                  </div>
                )}
                {(activity.deep_dive as any).what_youll_see && (activity.deep_dive as any).what_youll_see.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      What You'll See
                    </h4>
                    <div className="space-y-2">
                      {(activity.deep_dive as any).what_youll_see.map((item: any, i: number) => (
                        <div key={i} className="p-2 bg-muted rounded-lg">
                          <p className="font-medium text-sm">{item.name || item}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          {item.look_for && (
                            <p className="text-xs text-primary mt-0.5">👀 {item.look_for}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(activity.deep_dive as any).interesting_facts && (activity.deep_dive as any).interesting_facts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Interesting Facts</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {(activity.deep_dive as any).interesting_facts.map((fact: string, i: number) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Deep Dive Content - Legacy TEXT format */}
            {activity.deep_dive_content && !activity.deep_dive && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Why It Matters
                </h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {activity.deep_dive_content}
                </div>
              </div>
            )}

            {/* Historical Context */}
            {activity.historical_context && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </h4>
                <p className="text-sm text-muted-foreground">{activity.historical_context}</p>
              </div>
            )}

            {/* Architecture Notes */}
            {activity.architecture_notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Columns className="h-4 w-4" />
                  Architecture
                </h4>
                <p className="text-sm text-muted-foreground">{activity.architecture_notes}</p>
              </div>
            )}

            {/* What to See */}
            {activity.what_to_see && activity.what_to_see.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  What to See
                </h4>
                <div className="space-y-2">
                  {activity.what_to_see.map((item, i) => (
                    <div key={i} className="p-2 bg-muted rounded-lg">
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                      {item.location_hint && (
                        <p className="text-xs text-primary mt-0.5">📍 {item.location_hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kid Engagement - V3 format with named children */}
            {activity.kid_engagement && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Kid Engagement Tips
                </h4>
                <div className="space-y-3">
                  {/* V3 format: named children (parker, charlotte, xander) */}
                  {(activity.kid_engagement as any).parker && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Parker (8)</Badge>
                      <p className="text-sm text-muted-foreground italic">"{(activity.kid_engagement as any).parker}"</p>
                    </div>
                  )}
                  {(activity.kid_engagement as any).charlotte && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Charlotte (5)</Badge>
                      <p className="text-sm text-muted-foreground italic">"{(activity.kid_engagement as any).charlotte}"</p>
                    </div>
                  )}
                  {(activity.kid_engagement as any).xander && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Xander (3)</Badge>
                      <p className="text-sm text-muted-foreground italic">"{(activity.kid_engagement as any).xander}"</p>
                    </div>
                  )}
                  {(activity.kid_engagement as any).conversation_starters && (activity.kid_engagement as any).conversation_starters.length > 0 && (
                    <div>
                      <Badge variant="outline" className="mb-1">Conversation Starters</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {(activity.kid_engagement as any).conversation_starters.map((tip: string, i: number) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(activity.kid_engagement as any).games && (activity.kid_engagement as any).games.length > 0 && (
                    <div>
                      <Badge variant="outline" className="mb-1">Games & Activities</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {(activity.kid_engagement as any).games.map((game: string, i: number) => (
                          <li key={i}>{game}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Legacy format: age_7, age_5, age_3 */}
                  {activity.kid_engagement.age_7 && activity.kid_engagement.age_7.length > 0 && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Age 7+</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {activity.kid_engagement.age_7.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activity.kid_engagement.age_5 && activity.kid_engagement.age_5.length > 0 && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Age 5</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {activity.kid_engagement.age_5.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activity.kid_engagement.age_3 && activity.kid_engagement.age_3.length > 0 && (
                    <div>
                      <Badge variant="secondary" className="mb-1">Age 3</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {activity.kid_engagement.age_3.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {activity.kid_engagement.general && activity.kid_engagement.general.length > 0 && (
                    <div>
                      <Badge variant="outline" className="mb-1">General</Badge>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                        {activity.kid_engagement.general.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Accessibility Info */}
            {activity.accessibility_info && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Accessibility</h4>
                <div className="flex items-center gap-2 mb-1">
                  {activity.accessibility_info.stroller_friendly !== undefined && (
                    <Badge variant={activity.accessibility_info.stroller_friendly ? "default" : "secondary"}>
                      {activity.accessibility_info.stroller_friendly ? "Stroller Friendly" : "Strollers Difficult"}
                    </Badge>
                  )}
                </div>
                {activity.accessibility_info.notes && (
                  <p className="text-sm text-muted-foreground">{activity.accessibility_info.notes}</p>
                )}
                {activity.accessibility_info.alternatives && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Alternative:</span> {activity.accessibility_info.alternatives}
                  </p>
                )}
              </div>
            )}

            {/* Warnings */}
            {activity.warnings && activity.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Important Warnings
                </h4>
                <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-300 space-y-0.5">
                  {activity.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {activity.tips && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Tips</h4>
                <p className="text-sm text-muted-foreground">{activity.tips}</p>
              </div>
            )}

            {/* Reservation */}
            {activity.reservation_required && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Ticket className="h-4 w-4" />
                  Reservation Required
                </h4>
                {activity.reservation_details && (
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    {activity.reservation_details}
                  </p>
                )}
                {activity.confirmation_number && (
                  <p className="text-sm font-mono mt-1">
                    Confirmation: {activity.confirmation_number}
                  </p>
                )}
              </div>
            )}

            {/* Cost */}
            {activity.cost_estimate && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Estimated Cost</h4>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: activity.cost_currency || "USD",
                  }).format(activity.cost_estimate)}
                </p>
              </div>
            )}

            <Separator className="my-4" />

            {/* Contact & Links */}
            <div className="space-y-2">
              {activity.website && (
                <a
                  href={activity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {activity.booking_url && (
                <a
                  href={activity.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Calendar className="h-4 w-4" />
                  Book Now
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {activity.phone && (
                <a
                  href={`tel:${activity.phone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {activity.phone}
                </a>
              )}
              {activity.google_maps_url && (
                <a
                  href={activity.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  View on Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {activity.alltrails_url && (
                <a
                  href={activity.alltrails_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Mountain className="h-4 w-4" />
                  AllTrails
                  {activity.alltrails_rating && (
                    <span className="text-muted-foreground">
                      ({activity.alltrails_rating})
                    </span>
                  )}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Notes */}
            {activity.notes && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{activity.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
