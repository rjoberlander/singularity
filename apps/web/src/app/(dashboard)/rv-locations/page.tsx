"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useRVLocations,
  useDeleteRVLocation,
  useEnrichRVLocation,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  Settings,
  Sparkles,
  Loader2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  RVLocation,
  RVLocationCategory,
  RVLocationStatus,
} from "@singularity/shared-types";
import { RVLocationImportSheet } from "@/components/rv-locations/RVLocationImportSheet";
import { RVResearchSettingsSheet } from "@/components/rv-locations/RVResearchSettingsSheet";
import { RVLocationsListView } from "@/components/rv-locations/RVLocationsListView";

export default function RVLocationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<RVLocationStatus | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RVLocationCategory | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
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

  // Estimate enrichment cost based on actual activity counts
  const estimatedCost = useMemo(() => {
    const costPerLocation = 0.20;
    const costPerActivity = 0.19;

    let total = 0;
    let totalActivities = 0;

    for (const loc of unenrichedLocations) {
      const extLoc = loc as RVLocation & { activity_count?: number };
      const activityCount = extLoc.activity_count || 0;
      total += costPerLocation + (activityCount * costPerActivity);
      totalActivities += activityCount;
    }

    return {
      total: total.toFixed(2),
      locations: unenrichedLocations.length,
      activities: totalActivities
    };
  }, [unenrichedLocations]);

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

  return (
    <div className="container max-w-7xl py-6">
      <RVLocationsListView
        locations={locations || []}
        isLoading={isLoading}
        readOnly={false}
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onDeleteLocation={setDeleteLocationId}
        onNavigateToLocation={(id) => router.push(`/rv-locations/${id}`)}
        onNavigateToTrip={(tripId) => router.push(`/travel/${tripId}`)}
        headerActions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCostModal(true)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Costs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEnrich}
              disabled={isBulkEnriching || unenrichedLocations.length === 0}
              title={unenrichedLocations.length > 0 ? `Estimated cost: ~$${estimatedCost.total} for ${estimatedCost.locations} locations + ${estimatedCost.activities} activities` : undefined}
            >
              {isBulkEnriching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {bulkEnrichProgress.current}/{bulkEnrichProgress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enrich{unenrichedLocations.length > 0 && ` (${unenrichedLocations.length}) ~$${estimatedCost.total}`}
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
          </>
        }
      />

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

      {/* Enrichment Cost Modal */}
      <Dialog open={showCostModal} onOpenChange={setShowCostModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Enrichment Costs
            </DialogTitle>
            <DialogDescription>
              Estimated API costs when enriching locations with Google data and AI analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current batch estimate */}
            {unenrichedLocations.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Ready to enrich</span>
                  <span className="text-lg font-bold">~${estimatedCost.total}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {estimatedCost.locations} locations + {estimatedCost.activities} activities
                </p>
              </div>
            )}

            {/* What does enrichment do */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">What does &quot;Enrich&quot; do?</h4>
              <div className="text-sm text-muted-foreground space-y-1 pl-4">
                <p>• Searches Google Places to find the location</p>
                <p>• Fetches rating, reviews, hours, and address</p>
                <p>• Downloads up to 20 photos from Google</p>
                <p>• Uses Claude AI to analyze reviews</p>
                <p>• Enriches each activity with Google data + photos</p>
              </div>
            </div>

            {/* When is something "enriched" */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">What counts as &quot;enriched&quot;?</h4>
              <p className="text-sm text-muted-foreground">
                A location is marked enriched once we successfully fetch Google Place data.
                The <strong>Enrich ({unenrichedLocations.length})</strong> button only processes
                locations that haven&apos;t been enriched yet &mdash; it won&apos;t re-enrich or duplicate costs
                for already-enriched locations.
              </p>
            </div>

            {/* Cost breakdown */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Cost Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Main Location (~$0.20)</p>
                  <div className="text-muted-foreground space-y-0.5 pl-2 mt-1">
                    <p>Text Search: $0.03</p>
                    <p>Place Details: $0.02</p>
                    <p>Photos (20): $0.14</p>
                    <p>Claude AI: $0.01</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium">Per Activity (~$0.19)</p>
                  <div className="text-muted-foreground space-y-0.5 pl-2 mt-1">
                    <p>Text Search: $0.03</p>
                    <p>Place Details: $0.02</p>
                    <p>Photos (20): $0.14</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                <strong>Note:</strong> Photos are ~70% of the cost. Charges apply to your Google Cloud
                and Anthropic accounts.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
