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
import {
  Mountain,
  Timer,
  Navigation,
  TrendingUp,
  DollarSign,
  Star,
  Lightbulb,
  ExternalLink,
  MapPin,
  Clock,
  Pencil,
  Users,
  Check,
  X,
} from "lucide-react";
import {
  RVLocationActivity,
  RVKidEngagement,
  RVChildEngagement,
} from "@singularity/shared-types";

interface RVActivityDetailSheetProps {
  activity: RVLocationActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (activity: RVLocationActivity) => void;
}

function KidEngagementSection({
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
  if (!engagement) return null;

  const hasData =
    engagement.suitable !== undefined ||
    engagement.engagement_level ||
    (engagement.activities && engagement.activities.length > 0);

  if (!hasData) return null;

  return (
    <div className={`rounded-lg p-3 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-sm">{name}</span>
        <span className="text-xs text-muted-foreground">({age})</span>
      </div>
      <div className="space-y-1">
        {engagement.suitable !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            {engagement.suitable ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-red-500" />
            )}
            <span className="text-muted-foreground">
              {engagement.suitable ? "Suitable" : "Not suitable"}
            </span>
          </div>
        )}
        {engagement.engagement_level && (
          <Badge
            variant="secondary"
            className={`text-xs capitalize ${
              engagement.engagement_level === "high"
                ? "bg-green-500/20 text-green-600"
                : engagement.engagement_level === "medium"
                ? "bg-yellow-500/20 text-yellow-600"
                : "bg-gray-500/20 text-gray-600"
            }`}
          >
            {engagement.engagement_level} engagement
          </Badge>
        )}
        {engagement.activities && engagement.activities.length > 0 && (
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
            {engagement.activities.map((activity, i) => (
              <li key={i}>• {activity}</li>
            ))}
          </ul>
        )}
        {engagement.notes && (
          <p className="text-xs text-muted-foreground italic mt-1">
            {engagement.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export function RVActivityDetailSheet({
  activity,
  open,
  onOpenChange,
  onEdit,
}: RVActivityDetailSheetProps) {
  if (!activity) return null;

  const kidEngagement = activity.kid_engagement as RVKidEngagement | undefined;
  const hasKidEngagement =
    kidEngagement &&
    (kidEngagement.parker || kidEngagement.charlotte || kidEngagement.xander);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mountain className="h-5 w-5" />
            {activity.name}
          </SheetTitle>
          {activity.activity_type && (
            <SheetDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {activity.activity_type.replace("_", " ")}
              </Badge>
              {activity.difficulty && (
                <Badge variant="outline" className="capitalize">
                  {activity.difficulty}
                </Badge>
              )}
              {activity.time_of_day && activity.time_of_day !== "any" && (
                <Badge variant="outline" className="capitalize">
                  {activity.time_of_day}
                </Badge>
              )}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          {activity.description && (
            <div>
              <p className="text-muted-foreground">{activity.description}</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            {activity.duration_text && (
              <div className="flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span>{activity.duration_text}</span>
              </div>
            )}
            {activity.distance_miles && (
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                <span>{activity.distance_miles} miles</span>
              </div>
            )}
            {activity.elevation_gain_ft && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>{activity.elevation_gain_ft} ft elevation</span>
              </div>
            )}
            {activity.cost_estimate !== undefined &&
              activity.cost_estimate !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {activity.cost_estimate === 0
                      ? "Free"
                      : `$${activity.cost_estimate}`}
                  </span>
                </div>
              )}
            {activity.google_rating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{activity.google_rating} Google rating</span>
              </div>
            )}
            {activity.distance_from_campsite && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{activity.distance_from_campsite} from camp</span>
              </div>
            )}
          </div>

          {/* Tips Section */}
          {activity.tips && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">Tips</h4>
                  <p className="text-sm text-muted-foreground">
                    {activity.tips}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Kid Engagement */}
          {hasKidEngagement && (
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Kid Engagement
              </h4>
              <div className="space-y-2">
                <KidEngagementSection
                  name="Parker"
                  age={8}
                  engagement={kidEngagement?.parker}
                  colorClass="bg-blue-500/10 border border-blue-500/20"
                />
                <KidEngagementSection
                  name="Charlotte"
                  age={5}
                  engagement={kidEngagement?.charlotte}
                  colorClass="bg-pink-500/10 border border-pink-500/20"
                />
                <KidEngagementSection
                  name="Xander"
                  age={3}
                  engagement={kidEngagement?.xander}
                  colorClass="bg-green-500/10 border border-green-500/20"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {activity.notes && (
            <div>
              <h4 className="font-medium text-sm mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {activity.notes}
              </p>
            </div>
          )}

          {/* External Links */}
          {(activity.alltrails_url || activity.google_place_id) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {activity.alltrails_url && (
                <a
                  href={activity.alltrails_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Mountain className="h-4 w-4 mr-2 text-green-600" />
                    View on AllTrails
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              )}
              {activity.google_place_id && (
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${activity.google_place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    View on Google Maps
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Edit Button */}
          {onEdit && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => onEdit(activity)}
                variant="outline"
                className="w-full"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Activity
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
