"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { TripActivity } from "@singularity/shared-types";
import {
  useFetchGooglePlacesForActivity,
  useTripMedia,
  useApproveTripMedia,
  getTimeBlockLabel,
} from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActivityDetailContentProps {
  activity: TripActivity;
  tripId: string;
}

// Get activity type icon as a component
function ActivityTypeIcon({ type }: { type: string }) {
  const iconClass = "h-6 w-6";
  switch (type) {
    case "restaurant":
      return <Utensils className={iconClass} />;
    case "hike":
      return <Mountain className={iconClass} />;
    case "beach":
      return <Waves className={iconClass} />;
    case "museum":
      return <Building2 className={iconClass} />;
    case "transport":
      return <Car className={iconClass} />;
    default:
      return <MoreHorizontal className={iconClass} />;
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

export function ActivityDetailContent({
  activity,
  tripId,
}: ActivityDetailContentProps) {
  const fetchGoogle = useFetchGooglePlacesForActivity();
  const approveMedia = useApproveTripMedia();

  // Get media for this activity
  const { data: allMedia } = useTripMedia(tripId, "activity", activity.id);

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <ActivityTypeIcon type={activity.activity_type || "activity"} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{activity.name}</h2>
            {activity.location_name && (
              <p className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                {activity.location_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Time Block and Status */}
      <div className="flex flex-wrap gap-2 mb-6">
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
        {activity.photos_fetched ? "Refresh from Google" : "Fetch from Google"}
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

      {/* Google Rating & Reviews */}
      {activity.google_rating && (
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-medium">{activity.google_rating}</span>
          </div>
          {activity.google_review_count && (
            <span className="text-muted-foreground">
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
        <div className="mb-6">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
        </div>
      )}

      {/* Why It's Great */}
      {activity.why_its_great && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Why It's Great
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{activity.why_its_great}</p>
        </div>
      )}

      {/* Kid Friendliness */}
      {activity.kid_friendliness && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Backpack className="h-4 w-4" />
            What to Bring
          </h4>
          <p className="text-sm text-muted-foreground">{activity.gear_prep}</p>
        </div>
      )}

      {/* Practical Details */}
      {activity.practical_details && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Practical Details
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
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

      {/* V3 Deep Dive Content (structured) */}
      {(activity as any).deep_dive && (
        <div className="mb-6 space-y-4">
          {/* What it is */}
          {(activity as any).deep_dive.what_it_is && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                What It Is
              </h4>
              <p className="text-sm text-muted-foreground">{(activity as any).deep_dive.what_it_is}</p>
            </div>
          )}

          {/* Why it matters */}
          {(activity as any).deep_dive.why_it_matters?.content && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Why It Matters
              </h4>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {(activity as any).deep_dive.why_it_matters.content}
              </div>
            </div>
          )}

          {/* The story */}
          {(activity as any).deep_dive.the_story?.content && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <History className="h-4 w-4" />
                The Story
              </h4>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {(activity as any).deep_dive.the_story.content}
              </div>
            </div>
          )}

          {/* What you'll see */}
          {(activity as any).deep_dive.what_youll_see && (activity as any).deep_dive.what_youll_see.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                What You'll See
              </h4>
              <div className="space-y-3">
                {(activity as any).deep_dive.what_youll_see.map((area: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm mb-2">{area.name}</p>
                    {area.highlights?.map((highlight: any, hIdx: number) => (
                      <div key={hIdx} className="ml-3 mb-2">
                        <p className="text-xs font-medium">{highlight.name}</p>
                        <p className="text-xs text-muted-foreground">{highlight.description}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interesting facts */}
          {(activity as any).deep_dive.interesting_facts && (activity as any).deep_dive.interesting_facts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Interesting Facts</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                {(activity as any).deep_dive.interesting_facts.map((fact: string, idx: number) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Legacy Deep Dive Content (string) */}
      {activity.deep_dive_content && !(activity as any).deep_dive && (
        <div className="mb-6">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{activity.historical_context}</p>
        </div>
      )}

      {/* Architecture Notes */}
      {activity.architecture_notes && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Columns className="h-4 w-4" />
            Architecture
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{activity.architecture_notes}</p>
        </div>
      )}

      {/* What to See */}
      {activity.what_to_see && activity.what_to_see.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            What to See
          </h4>
          <div className="space-y-2">
            {activity.what_to_see.map((item, i) => (
              <div key={i} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                )}
                {item.location_hint && (
                  <p className="text-xs text-primary mt-1">📍 {item.location_hint}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* V3 Kid Engagement by Named Child */}
      {activity.kid_engagement && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Kid Engagement Scripts
          </h4>
          <div className="space-y-3">
            {/* V3 Named Children */}
            {(activity.kid_engagement as any).parker?.scripts && (activity.kid_engagement as any).parker.scripts.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-blue-600">Parker</Badge>
                  {(activity.kid_engagement as any).parker.age_at_trip && (
                    <span className="text-xs text-muted-foreground">Age {(activity.kid_engagement as any).parker.age_at_trip}</span>
                  )}
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {(activity.kid_engagement as any).parker.scripts.map((script: string, i: number) => (
                    <li key={i} className="italic">"{script}"</li>
                  ))}
                </ul>
              </div>
            )}
            {(activity.kid_engagement as any).charlotte?.scripts && (activity.kid_engagement as any).charlotte.scripts.length > 0 && (
              <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-pink-600">Charlotte</Badge>
                  {(activity.kid_engagement as any).charlotte.age_at_trip && (
                    <span className="text-xs text-muted-foreground">Age {(activity.kid_engagement as any).charlotte.age_at_trip}</span>
                  )}
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {(activity.kid_engagement as any).charlotte.scripts.map((script: string, i: number) => (
                    <li key={i} className="italic">"{script}"</li>
                  ))}
                </ul>
              </div>
            )}
            {(activity.kid_engagement as any).xander?.scripts && (activity.kid_engagement as any).xander.scripts.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-green-600">Xander</Badge>
                  {(activity.kid_engagement as any).xander.age_at_trip && (
                    <span className="text-xs text-muted-foreground">Age {(activity.kid_engagement as any).xander.age_at_trip}</span>
                  )}
                </div>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {(activity.kid_engagement as any).xander.scripts.map((script: string, i: number) => (
                    <li key={i} className="italic">"{script}"</li>
                  ))}
                </ul>
                {(activity.kid_engagement as any).xander.attention_span && (
                  <p className="text-xs text-amber-600 mt-2">⏱️ {(activity.kid_engagement as any).xander.attention_span}</p>
                )}
                {(activity.kid_engagement as any).xander.carrier_needed && (
                  <p className="text-xs text-amber-600 mt-1">🎒 Carrier recommended</p>
                )}
              </div>
            )}

            {/* V3 Conversation starters */}
            {(activity.kid_engagement as any).conversation_starters && (activity.kid_engagement as any).conversation_starters.length > 0 && (
              <div>
                <Badge variant="outline" className="mb-2">Conversation Starters</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {(activity.kid_engagement as any).conversation_starters.map((starter: string, i: number) => (
                    <li key={i}>{starter}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* V3 Games */}
            {(activity.kid_engagement as any).games && (activity.kid_engagement as any).games.length > 0 && (
              <div>
                <Badge variant="outline" className="mb-2">Games to Play</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {(activity.kid_engagement as any).games.map((game: string, i: number) => (
                    <li key={i}>{game}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legacy Age-based format */}
            {activity.kid_engagement.age_7 && activity.kid_engagement.age_7.length > 0 && (
              <div>
                <Badge variant="secondary" className="mb-2">Age 7+</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {activity.kid_engagement.age_7.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {activity.kid_engagement.age_5 && activity.kid_engagement.age_5.length > 0 && (
              <div>
                <Badge variant="secondary" className="mb-2">Age 5</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {activity.kid_engagement.age_5.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {activity.kid_engagement.age_3 && activity.kid_engagement.age_3.length > 0 && (
              <div>
                <Badge variant="secondary" className="mb-2">Age 3</Badge>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                  {activity.kid_engagement.age_3.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {activity.kid_engagement.general && activity.kid_engagement.general.length > 0 && (
              <div>
                <Badge variant="outline" className="mb-2">General</Badge>
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Accessibility</h4>
          <div className="flex items-center gap-2 mb-2">
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
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Tips</h4>
          <p className="text-sm text-muted-foreground">{activity.tips}</p>
        </div>
      )}

      {/* Reservation */}
      {activity.reservation_required && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Estimated Cost</h4>
          <p className="text-2xl font-semibold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: activity.cost_currency || "USD",
            }).format(activity.cost_estimate)}
          </p>
        </div>
      )}

      <Separator className="my-6" />

      {/* Contact & Links */}
      <div className="space-y-3">
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
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground">{activity.notes}</p>
        </div>
      )}
    </div>
  );
}
