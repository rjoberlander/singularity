"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRVLocations,
  useDeleteRVLocation,
  useEnrichRVLocation,
  getRVLocationStatusColor,
  getRVLocationStatusLabel,
  getRVLocationCategoryLabel,
  getRVLocationCategoryColor,
} from "@/lib/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Filter,
  Tent,
  Star,
  Clock,
  Upload,
  ArrowUpRight,
  Settings,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  RVLocation,
  RVLocationCategory,
  RVLocationStatus,
} from "@singularity/shared-types";
import { RVLocationImportSheet } from "@/components/rv-locations/RVLocationImportSheet";
import { RVResearchSettingsSheet } from "@/components/rv-locations/RVResearchSettingsSheet";

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

export default function RVLocationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<RVLocationStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RVLocationCategory | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);
  const [bulkEnrichProgress, setBulkEnrichProgress] = useState({ current: 0, total: 0 });

  // Fetch data
  const { data: locations, isLoading } = useRVLocations({
    status: selectedStatus || undefined,
    category: selectedCategory || undefined,
    search: search || undefined,
    limit: 100,
  });
  const deleteLocation = useDeleteRVLocation();
  const enrichLocation = useEnrichRVLocation();

  // Filter and group locations
  const filteredLocations = useMemo(() => {
    if (!locations) return [];
    return locations;
  }, [locations]);

  // Group locations by status
  const groupedLocations = useMemo(() => {
    const groups: Record<string, RVLocation[]> = {
      want_to_visit: [],
      researching: [],
      visited: [],
      not_interested: [],
    };

    filteredLocations.forEach((loc) => {
      const status = loc.status || "researching";
      if (groups[status]) {
        groups[status].push(loc);
      }
    });

    return groups;
  }, [filteredLocations]);

  const handleDeleteLocation = async () => {
    if (!deleteLocationId) return;

    try {
      await deleteLocation.mutateAsync(deleteLocationId);
      toast.success("Location deleted");
      setDeleteLocationId(null);
    } catch {
      toast.error("Failed to delete location");
    }
  };

  // Get locations that need enrichment (no enriched_at timestamp)
  const unenrichedLocations = useMemo(() => {
    if (!locations) return [];
    return locations.filter((loc) => !loc.enriched_at);
  }, [locations]);

  const handleBulkEnrich = async () => {
    if (unenrichedLocations.length === 0) {
      toast.info("All locations are already enriched");
      return;
    }

    setIsBulkEnriching(true);
    setBulkEnrichProgress({ current: 0, total: unenrichedLocations.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < unenrichedLocations.length; i++) {
      const location = unenrichedLocations[i];
      setBulkEnrichProgress({ current: i + 1, total: unenrichedLocations.length });

      try {
        await enrichLocation.mutateAsync({
          locationId: location.id,
          options: {
            fetch_reviews: true,
            fetch_photos: true,
            fetch_hours: true,
            enrich_activities: true,
            max_photos: 10,
          },
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to enrich ${location.name}:`, error);
        errorCount++;
      }
    }

    setIsBulkEnriching(false);
    setBulkEnrichProgress({ current: 0, total: 0 });

    if (errorCount === 0) {
      toast.success(`Enriched ${successCount} locations`);
    } else {
      toast.warning(`Enriched ${successCount} locations, ${errorCount} failed`);
    }
  };

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
      href={`/rv-locations/${location.id}`}
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
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {location.name}
            </h3>
            {(location.city || location.state) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {[location.city, location.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div onClick={(e) => e.preventDefault()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/rv-locations/${location.id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {location.converted_to_trip_id && (
                  <DropdownMenuItem onClick={() => router.push(`/travel/${location.converted_to_trip_id}`)}>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    View Trip
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteLocationId(location.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hook (if exists) */}
        {location.hook && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{location.hook}</p>
        )}

        {/* Drive Time and Rating */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          {location.drive_time_from_la && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {location.drive_time_from_la}
            </span>
          )}
          {location.google_rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {location.google_rating}
            </span>
          )}
          {location.vibe?.scenic_beauty && (
            <span className="flex items-center gap-1 text-muted-foreground">
              Scenic: {renderVibeRating(location.vibe.scenic_beauty)}
            </span>
          )}
        </div>

        {/* Tags */}
        {location.tags && location.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {location.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {location.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{location.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );

  const renderLocationGroup = (status: string, locations: RVLocation[]) => {
    if (locations.length === 0) return null;

    return (
      <div key={status} className="space-y-4">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getRVLocationStatusColor(status) }}
          />
          <h2 className="font-semibold text-lg">{getRVLocationStatusLabel(status)}</h2>
          <Badge variant="secondary">{locations.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(renderLocationCard)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-6 space-y-6">
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
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tent className="h-6 w-6" />
            RV Locations
          </h1>
          <p className="text-muted-foreground">
            Discover and track potential camping destinations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkEnrich}
            disabled={isBulkEnriching || unenrichedLocations.length === 0}
          >
            {isBulkEnriching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {bulkEnrichProgress.current}/{bulkEnrichProgress.total}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Enrich{unenrichedLocations.length > 0 && ` (${unenrichedLocations.length})`}
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettingsSheet(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportSheet(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Link href="/rv-locations/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Location
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch("")}
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
            <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
              All Categories
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {CATEGORY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSelectedCategory(option.value)}
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
            <DropdownMenuItem onClick={() => setSelectedStatus(null)}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
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
      {filteredLocations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Tent className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No locations yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Start building your destination repertoire!
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportSheet(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Locations
            </Button>
            <Link href="/rv-locations/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Location
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Location Groups */}
      <div className="space-y-8">
        {renderLocationGroup("want_to_visit", groupedLocations.want_to_visit)}
        {renderLocationGroup("researching", groupedLocations.researching)}
        {renderLocationGroup("visited", groupedLocations.visited)}
        {renderLocationGroup("not_interested", groupedLocations.not_interested)}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLocationId} onOpenChange={() => setDeleteLocationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this location? This action cannot be undone and will
              remove all associated activities and media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Sheet */}
      <RVLocationImportSheet open={showImportSheet} onOpenChange={setShowImportSheet} />

      {/* Settings Sheet */}
      <RVResearchSettingsSheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet} />
    </div>
  );
}
