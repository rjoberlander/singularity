"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MapPin,
  X,
  Filter,
  Tent,
  Star,
  Clock,
  Activity,
  Mountain,
  Bike,
  Waves,
  Fish,
  Ship,
  Compass,
  TreePine,
  Sparkles,
  Camera,
  LucideIcon,
} from "lucide-react";

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

// Activity colors mapping
const ACTIVITY_COLORS: Record<string, string> = {
  hike: "text-emerald-500",
  bike: "text-orange-500",
  swim: "text-blue-500",
  fish: "text-cyan-500",
  kayak: "text-sky-500",
  horseback: "text-amber-600",
  wildlife_viewing: "text-green-600",
  stargazing: "text-purple-500",
  photography: "text-pink-500",
  rock_climbing: "text-stone-500",
  camping: "text-teal-500",
  other: "text-gray-500",
};
import {
  getRVLocationStatusColor,
  getRVLocationStatusLabel,
  getRVLocationCategoryLabel,
  getRVLocationCategoryColor,
} from "@/lib/api";
import {
  RVLocation,
  RVLocationCategory,
  RVLocationStatus,
} from "@singularity/shared-types";

const STATUS_OPTIONS: { value: RVLocationStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "want_to_visit", label: "Want to Visit" },
  { value: "visited", label: "Visited" },
  { value: "not_interested", label: "Not Interested" },
];

const CATEGORY_OPTIONS: { value: RVLocationCategory; label: string }[] = [
  { value: "national_parks", label: "National Parks" },
  { value: "state_parks", label: "State Parks" },
  { value: "harvest_hosts", label: "Harvest Hosts" },
  { value: "hot_springs", label: "Hot Springs" },
  { value: "lake_river", label: "Lake/River" },
  { value: "boondocking", label: "Boondocking" },
  { value: "couples_getaway", label: "Couples Getaway" },
  { value: "other", label: "Other" },
];

export interface RVLocationsListViewProps {
  locations: RVLocation[];
  isLoading?: boolean;
  readOnly?: boolean;
  // Search and filter state (managed externally)
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatus: RVLocationStatus | null;
  onStatusChange: (value: RVLocationStatus | null) => void;
  selectedCategory: RVLocationCategory | null;
  onCategoryChange: (value: RVLocationCategory | null) => void;
  // Action callbacks (only used when not readOnly)
  onDeleteLocation?: (id: string) => void;
  onNavigateToLocation?: (id: string) => void;
  onNavigateToTrip?: (tripId: string) => void;
  // Header actions slot (only used when not readOnly)
  headerActions?: React.ReactNode;
  // Base path for location links
  baseLocationPath?: string;
}

export function RVLocationsListView({
  locations,
  isLoading = false,
  readOnly = false,
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  onDeleteLocation,
  onNavigateToLocation,
  onNavigateToTrip,
  headerActions,
  baseLocationPath = "/rv-locations",
}: RVLocationsListViewProps) {
  // Group locations by status
  const groupedLocations = useMemo(() => {
    const groups: Record<string, RVLocation[]> = {
      want_to_visit: [],
      researching: [],
      visited: [],
      not_interested: [],
    };

    locations.forEach((loc) => {
      const status = loc.status || "researching";
      if (groups[status]) {
        groups[status].push(loc);
      }
    });

    return groups;
  }, [locations]);

  const renderVibeRating = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  const renderLocationCard = (location: RVLocation) => (
    <Link
      key={location.id}
      href={`${baseLocationPath}/${readOnly ? `share/${location.share_slug}` : location.id}`}
      className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow block"
    >
      {/* Cover Image Grid */}
      <div className="relative h-40 bg-muted">
        {location.cover_image_url ? (
          <img
            src={location.cover_image_url}
            alt={location.name}
            className="w-full h-full object-cover"
          />
        ) : (location as RVLocation & { preview_photos?: string[] }).preview_photos?.length ? (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
            {(location as RVLocation & { preview_photos?: string[] }).preview_photos!.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-muted-foreground/5">
            <Tent className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Category Badge */}
        {location.category && (
          <Badge
            className="absolute top-3 left-3"
            style={{
              backgroundColor: getRVLocationCategoryColor(location.category),
              color: "white",
            }}
          >
            {getRVLocationCategoryLabel(location.category)}
          </Badge>
        )}

        {/* Status Indicator */}
        <div
          className="absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: getRVLocationStatusColor(location.status || "researching") }}
          title={getRVLocationStatusLabel(location.status || "researching")}
        />
      </div>

      {/* Content */}
      <div className="p-2">
        <h3 className="font-semibold group-hover:text-primary transition-colors flex items-center gap-2">
          <span className="truncate">{location.name}</span>
          {location.google_rating && (
            <span className="flex items-center gap-1 text-sm font-normal shrink-0">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {location.google_rating}
            </span>
          )}
        </h3>
        {(location.city || location.state || location.drive_time_from_la || location.vibe?.scenic_beauty) && (
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {(location.city || location.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[location.city, location.state].filter(Boolean).join(", ")}
              </span>
            )}
            {location.drive_time_from_la && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {location.drive_time_from_la}
              </span>
            )}
            {location.vibe?.scenic_beauty && (
              <span className="flex items-center gap-1">
                Scenic: {renderVibeRating(location.vibe.scenic_beauty)}
              </span>
            )}
          </div>
        )}

        {/* Hook (if exists) */}
        {location.hook && (
          <p className="text-sm text-muted-foreground mt-2">{location.hook}</p>
        )}

        {/* Activities */}
        {(() => {
          const extLoc = location as RVLocation & {
            activities?: Array<{ id: string; name: string; activity_type?: string }>;
            activity_count?: number;
            parker_engagement?: number;
            charlotte_engagement?: number;
            xander_engagement?: number;
          };
          if (!extLoc.activities || extLoc.activities.length === 0) return null;
          const hasKidEngagement = location.category !== 'couples_getaway' &&
            (extLoc.parker_engagement != null || extLoc.charlotte_engagement != null || extLoc.xander_engagement != null);
          // Compute unique activity icons
          const activityTypes = extLoc.activities?.map(a => a.activity_type || 'other') || [];
          const seenIcons = new Set<LucideIcon>();
          const uniqueIcons: { icon: LucideIcon; type: string }[] = [];
          for (const type of activityTypes) {
            const icon = ACTIVITY_ICONS[type] || MapPin;
            if (!seenIcons.has(icon)) {
              seenIcons.add(icon);
              uniqueIcons.push({ icon, type });
            }
          }

          return (
            <div className="mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Activity className="h-3 w-3" />
                <span>{extLoc.activity_count} {extLoc.activity_count === 1 ? 'activity' : 'activities'}</span>
                {/* Activity type icons inline */}
                {uniqueIcons.length > 0 && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    {uniqueIcons.map(({ icon: Icon, type }) => (
                      <span key={type} title={type.replace('_', ' ')}>
                        <Icon className={`h-3.5 w-3.5 ${ACTIVITY_COLORS[type] || 'text-gray-500'}`} />
                      </span>
                    ))}
                  </span>
                )}
                {/* Kid engagement - hide for couples getaway */}
                {hasKidEngagement && (
                  <>
                    {[
                      { label: 'P', value: extLoc.parker_engagement },
                      { label: 'C', value: extLoc.charlotte_engagement },
                      { label: 'X', value: extLoc.xander_engagement },
                    ].filter(k => k.value != null).map(({ label, value }) => {
                      // Color based on engagement score
                      const color = value! >= 4.5 ? 'text-blue-400 bg-blue-400'
                        : value! >= 3.5 ? 'text-green-400 bg-green-400'
                        : value! >= 2.5 ? 'text-amber-400 bg-amber-400'
                        : 'text-red-400 bg-red-400';
                      const [textColor, bgColor] = color.split(' ');
                      return (
                        <span key={label} className="inline-flex items-center gap-0.5 ml-1">
                          <span className={`font-medium ${textColor}`}>{label}</span>
                          <span className="w-6 h-1.5 bg-muted rounded-full overflow-hidden">
                            <span className={`block h-full ${bgColor} rounded-full`} style={{ width: `${(value! / 5) * 100}%` }} />
                          </span>
                          <span className={textColor}>{value}</span>
                        </span>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {extLoc.activities.map((act) => (
                  <Badge key={act.id} variant="secondary" className="text-xs py-0 px-1">
                    {act.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tags */}
        {location.tags && location.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {location.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );

  const renderLocationGroup = (status: string, locs: RVLocation[]) => {
    if (locs.length === 0) return null;

    return (
      <div key={status} className="space-y-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getRVLocationStatusColor(status) }}
          />
          <h2 className="font-semibold text-lg">{getRVLocationStatusLabel(status)}</h2>
          <Badge variant="secondary">{locs.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locs.map(renderLocationCard)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tent className="h-6 w-6" />
            RV Locations
          </h1>
          <p className="text-muted-foreground">
            {readOnly ? "Explore potential camping destinations" : "Discover and track potential camping destinations"}
          </p>
        </div>
        {!readOnly && headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {selectedCategory ? getRVLocationCategoryLabel(selectedCategory) : "All Categories"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onCategoryChange(null)}>
              All Categories
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {CATEGORY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onCategoryChange(option.value)}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: getRVLocationCategoryColor(option.value) }}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {selectedStatus ? getRVLocationStatusLabel(selectedStatus) : "All Status"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onStatusChange(null)}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusChange(option.value)}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: getRVLocationStatusColor(option.value) }}
                />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Empty State */}
      {locations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Tent className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No locations found</h3>
          <p className="text-muted-foreground mt-1">
            {search || selectedCategory || selectedStatus
              ? "Try adjusting your filters"
              : "No camping destinations yet"}
          </p>
        </div>
      )}

      {/* Location Groups */}
      <div className="space-y-8">
        {renderLocationGroup("want_to_visit", groupedLocations.want_to_visit)}
        {renderLocationGroup("researching", groupedLocations.researching)}
        {renderLocationGroup("visited", groupedLocations.visited)}
        {renderLocationGroup("not_interested", groupedLocations.not_interested)}
      </div>
    </div>
  );
}
