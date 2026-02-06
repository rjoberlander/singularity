"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useRVLocationFull,
  useUpdateRVLocation,
  useConvertRVLocationToTrip,
  useCreateRVLocationActivity,
  useUpdateRVLocationActivity,
  useDeleteRVLocationActivity,
  useCreateRVLocationMedia,
  useDeleteRVLocationMedia,
  useToggleRVLocationMediaFavorite,
  useFetchRVLocationGooglePlaces,
  useEnrichRVLocation,
  useGenerateRVLocationShareLink,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Pencil,
  ArrowUpRight,
  Sparkles,
  Share2,
  Check,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  RVLocationCategory,
  RVLocationStatus,
  RVLocation,
  RVLocationActivity,
} from "@singularity/shared-types";
import { useDropzone } from "react-dropzone";
import { createClient } from "@supabase/supabase-js";
import { RVLocationDetailView } from "@/components/rv-locations/RVLocationDetailView";
import { RVLandType } from "@singularity/shared-types";

// Supabase client for file uploads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

const STATUS_OPTIONS: { value: RVLocationStatus; label: string }[] = [
  { value: "researching", label: "Researching" },
  { value: "want_to_visit", label: "Want to Visit" },
  { value: "visited", label: "Visited" },
  { value: "not_interested", label: "Not Interested" },
];

const LAND_TYPE_OPTIONS: { value: RVLandType; label: string }[] = [
  { value: "national_park", label: "National Park" },
  { value: "state_park", label: "State Park" },
  { value: "national_monument", label: "National Monument" },
  { value: "national_forest", label: "National Forest" },
  { value: "blm", label: "BLM" },
  { value: "national_recreation_area", label: "Nat'l Rec Area" },
  { value: "national_wildlife_refuge", label: "Wildlife Refuge" },
  { value: "army_corps", label: "Army Corps" },
  { value: "county_park", label: "County Park" },
  { value: "city_park", label: "City Park" },
  { value: "private_rv_park", label: "Private RV Park" },
  { value: "private_campground", label: "Private Campground" },
  { value: "casino", label: "Casino" },
  { value: "other", label: "Other" },
];

const ACTIVITY_TYPES = [
  "hike", "bike", "swim", "fish", "kayak", "horseback", "wildlife_viewing",
  "stargazing", "photography", "rock_climbing", "camping", "other"
];

export default function RVLocationPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.id as string;

  // Data fetching
  const { data: location, isLoading, refetch } = useRVLocationFull(locationId);
  const updateLocation = useUpdateRVLocation();
  const convertToTrip = useConvertRVLocationToTrip();
  const createActivity = useCreateRVLocationActivity();
  const updateActivity = useUpdateRVLocationActivity();
  const deleteActivity = useDeleteRVLocationActivity();
  const createMedia = useCreateRVLocationMedia();
  const deleteMedia = useDeleteRVLocationMedia();
  const toggleMediaFavorite = useToggleRVLocationMediaFavorite();
  const fetchGooglePlaces = useFetchRVLocationGooglePlaces();
  const enrichLocation = useEnrichRVLocation();
  const generateShareLink = useGenerateRVLocationShareLink();

  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<RVLocation>>({});
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<RVLocationActivity | null>(null);
  const [activityFormData, setActivityFormData] = useState<Partial<RVLocationActivity>>({});
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showAddMediaDialog, setShowAddMediaDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Handlers
  const handleShare = async () => {
    try {
      // Get or generate share slug
      let shareSlug = location?.share_slug;
      if (!shareSlug) {
        const result = await generateShareLink.mutateAsync(locationId);
        shareSlug = result.share_slug;
        refetch(); // Refresh to get the share_slug
      }

      // Build the share URL - always use production domain for sharing
      const shareUrl = `https://singularity.boo/rv-locations/share/${shareSlug}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkCopied(true);
      toast.success("Share link copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to generate share link");
    }
  };

  const handleEdit = () => {
    if (location) {
      setEditData({
        name: location.name,
        description: location.description,
        hook: location.hook,
        category: location.category,
        land_type: location.land_type,
        status: location.status,
        city: location.city,
        state: location.state,
        drive_time_from_la: location.drive_time_from_la,
        cost_per_night: location.cost_per_night,
        cost_notes: location.cost_notes,
        reservation_required: location.reservation_required,
        reservation_notes: location.reservation_notes,
        website: location.website,
        phone: location.phone,
        notes: location.notes,
        rv_logistics: location.rv_logistics,
        pros: location.pros,
        cons: location.cons,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      await updateLocation.mutateAsync({ id: locationId, data: editData });
      toast.success("Location updated");
      setIsEditing(false);
      refetch();
    } catch {
      toast.error("Failed to update location");
    }
  };

  const handleConvertToTrip = async () => {
    try {
      const result = await convertToTrip.mutateAsync({ locationId });
      toast.success(`Trip created with ${result.activity_count} activities`);
      setShowConvertDialog(false);
      router.push(`/travel/${result.trip_id}`);
    } catch {
      toast.error("Failed to convert to trip");
    }
  };

  // Activity handlers
  const handleAddActivity = () => {
    setEditingActivity(null);
    setActivityFormData({});
    setShowActivityDialog(true);
  };

  const handleEditActivity = (activity: RVLocationActivity) => {
    setEditingActivity(activity);
    setActivityFormData(activity);
    setShowActivityDialog(true);
  };

  const handleSaveActivity = async () => {
    try {
      if (editingActivity) {
        await updateActivity.mutateAsync({
          locationId,
          activityId: editingActivity.id,
          data: activityFormData,
        });
        toast.success("Activity updated");
      } else {
        await createActivity.mutateAsync({
          locationId,
          data: activityFormData as any,
        });
        toast.success("Activity created");
      }
      setShowActivityDialog(false);
      refetch();
    } catch {
      toast.error("Failed to save activity");
    }
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityId) return;
    try {
      await deleteActivity.mutateAsync({ locationId, activityId: deleteActivityId });
      toast.success("Activity deleted");
      setDeleteActivityId(null);
      refetch();
    } catch {
      toast.error("Failed to delete activity");
    }
  };

  // Media handlers
  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      setUploading(true);
      setUploadProgress(0);
      let uploadedCount = 0;

      for (const file of files) {
        try {
          const ext = file.name.split(".").pop();
          const filename = `rv-locations/${locationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const { error } = await supabase.storage.from("media").upload(filename, file);
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filename);
          await createMedia.mutateAsync({
            locationId,
            data: {
              file_url: publicUrl,
              media_type: file.type.startsWith("video/") ? "video" : "image",
              original_filename: file.name,
              mime_type: file.type,
              file_size_bytes: file.size,
            },
          });
          uploadedCount++;
          setUploadProgress((uploadedCount / files.length) * 100);
        } catch (error) {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      setUploading(false);
      if (uploadedCount > 0) {
        toast.success(`Uploaded ${uploadedCount} file(s)`);
        refetch();
      }
    },
    [locationId, createMedia, refetch]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUploadFiles,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"], "video/*": [".mp4", ".mov", ".webm"] },
    disabled: uploading,
  });

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      await createMedia.mutateAsync({
        locationId,
        data: {
          file_url: urlInput.trim(),
          media_type: urlInput.match(/\.(mp4|mov|webm)$/i) ? "video" : "image",
        },
      });
      toast.success("Media added");
      setUrlInput("");
      setShowAddMediaDialog(false);
      refetch();
    } catch {
      toast.error("Failed to add media");
    }
  };

  const handleDeleteMedia = async () => {
    if (!deleteMediaId) return;
    try {
      await deleteMedia.mutateAsync({ locationId, mediaId: deleteMediaId });
      toast.success("Media deleted");
      setDeleteMediaId(null);
      refetch();
    } catch {
      toast.error("Failed to delete media");
    }
  };

  const handleBatchDeleteMedia = async () => {
    if (selectedPhotos.size === 0) return;
    setBatchDeleting(true);
    try {
      let deleted = 0;
      for (const mediaId of selectedPhotos) {
        await deleteMedia.mutateAsync({ locationId, mediaId });
        deleted++;
      }
      toast.success(`Deleted ${deleted} photo${deleted !== 1 ? 's' : ''}`);
      setSelectedPhotos(new Set());
      setShowBatchDeleteDialog(false);
      refetch();
    } catch {
      toast.error("Failed to delete some photos");
    } finally {
      setBatchDeleting(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleEnrich = async () => {
    try {
      const result = await enrichLocation.mutateAsync({
        locationId,
        options: {
          fetch_reviews: true,
          fetch_photos: true,
          fetch_hours: true,
          enrich_activities: true,
          max_photos: 10,
        },
      });
      if (result.success) {
        toast.success(
          `Enriched: ${result.reviews_fetched} reviews, ${result.photos_added} photos, ${result.activities_enriched} activities`
        );
        refetch();
      } else {
        toast.warning("Enrichment completed with some issues");
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((err) => toast.error(err));
        }
      }
    } catch {
      toast.error("Failed to enrich location");
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="container max-w-5xl py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Location not found</h2>
          <p className="text-muted-foreground mt-2">
            The location you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Link href="/rv-locations">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Locations
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const activities = location.activities || [];

  return (
    <div className="container max-w-5xl py-6">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/rv-locations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
        </Link>
      </div>

      {/* Main content using shared component */}
      <RVLocationDetailView
        location={{
          id: location.id,
          name: location.name,
          description: location.description,
          hook: location.hook,
          category: location.category,
          land_type: location.land_type,
          status: location.status,
          city: location.city,
          state: location.state,
          address: location.address,
          drive_time_from_la: location.drive_time_from_la,
          cost_per_night: location.cost_per_night,
          cost_notes: location.cost_notes,
          reservation_required: location.reservation_required,
          reservation_notes: location.reservation_notes,
          website: location.website,
          phone: location.phone,
          notes: location.notes,
          google_place_id: location.google_place_id,
          google_rating: location.google_rating,
          google_review_count: location.google_review_count,
          tags: location.tags,
          pros: location.pros,
          cons: location.cons,
          vibe: location.vibe as Record<string, number> | null,
          rv_logistics: location.rv_logistics as Record<string, any> | null,
          best_season: location.best_season as { best?: string[]; avoid?: string[]; notes?: string } | null,
          educational_value: (location as any).educational_value,
          kid_engagement: (location as any).kid_engagement,
          reviews_summary: (location as any).reviews_summary,
          reviews_highlights: (location as any).reviews_highlights,
          enriched_at: (location as any).enriched_at,
          activities: location.activities,
          media: location.media,
        }}
        readOnly={false}
        headerActions={
          <>
            <Button variant="outline" size="icon" onClick={handleEdit} aria-label="Edit location">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              disabled={generateShareLink.isPending}
              aria-label="Share location"
              data-testid="share-button"
            >
              {shareLinkCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : generateShareLink.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>
          </>
        }
        onAddActivity={handleAddActivity}
        onEditActivity={handleEditActivity}
        onDeleteActivity={(id) => setDeleteActivityId(id)}
        onTogglePhotoSelection={togglePhotoSelection}
        selectedPhotos={selectedPhotos}
        onBatchDeletePhotos={() => setShowBatchDeleteDialog(true)}
        onToggleFavorite={(mediaId) => toggleMediaFavorite.mutate({ locationId, mediaId })}
        onEnrich={handleEnrich}
        isEnriching={enrichLocation.isPending}
        uploadArea={
          <>
            <div
              {...getRootProps()}
              className={`border border-dashed rounded p-2 text-center transition-colors cursor-pointer ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary"
              } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Upload Photos</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleEnrich} disabled={enrichLocation.isPending}>
              {enrichLocation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Enrich with Google
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => setShowConvertDialog(true)}>
              <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
              Convert to Trip
            </Button>
          </>
        }
      />

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editData.category || ""} onValueChange={(v) => setEditData({ ...editData, category: v as RVLocationCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editData.status || ""} onValueChange={(v) => setEditData({ ...editData, status: v as RVLocationStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Land Type</Label>
                <Select value={editData.land_type || ""} onValueChange={(v) => setEditData({ ...editData, land_type: v as RVLandType })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {LAND_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Drive Time from LA</Label>
                <Input value={editData.drive_time_from_la || ""} onChange={(e) => setEditData({ ...editData, drive_time_from_la: e.target.value })} placeholder="e.g., 3-4 hours" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hook (1-2 sentence reason to visit)</Label>
              <Textarea value={editData.hook || ""} onChange={(e) => setEditData({ ...editData, hook: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editData.description || ""} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateLocation.isPending}>
              {updateLocation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Trip Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Trip</DialogTitle>
            <DialogDescription>
              Create a new trip from this location. This will create a trip with one segment and import all activities.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will create:
            </p>
            <ul className="mt-2 text-sm space-y-1">
              <li>• 1 Trip: {location.name}</li>
              <li>• 1 Segment: {location.city}, {location.state}</li>
              <li>• {activities.length} Activities</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
            <Button onClick={handleConvertToTrip} disabled={convertToTrip.isPending}>
              {convertToTrip.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Edit Activity" : "Add Activity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={activityFormData.name || ""} onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={activityFormData.activity_type || ""} onValueChange={(v) => setActivityFormData({ ...activityFormData, activity_type: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={activityFormData.difficulty || ""} onValueChange={(v) => setActivityFormData({ ...activityFormData, difficulty: v })}>
                  <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="strenuous">Strenuous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={activityFormData.description || ""} onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distance (miles)</Label>
                <Input type="number" step="0.1" value={activityFormData.distance_miles || ""} onChange={(e) => setActivityFormData({ ...activityFormData, distance_miles: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input value={activityFormData.duration_text || ""} onChange={(e) => setActivityFormData({ ...activityFormData, duration_text: e.target.value })} placeholder="e.g., 2-3 hours" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveActivity} disabled={createActivity.isPending || updateActivity.isPending}>
              {(createActivity.isPending || updateActivity.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Activity Confirmation */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this activity? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Media URL Dialog */}
      <Dialog open={showAddMediaDialog} onOpenChange={setShowAddMediaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Media URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image/Video URL</Label>
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMediaDialog(false)}>Cancel</Button>
            <Button onClick={handleAddUrl} disabled={createMedia.isPending}>
              {createMedia.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Media Confirmation */}
      <AlertDialog open={!!deleteMediaId} onOpenChange={() => setDeleteMediaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this media? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedia} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Photos Confirmation */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPhotos.size} selected photo{selectedPhotos.size !== 1 ? 's' : ''}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDeleteMedia}
              disabled={batchDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {batchDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
