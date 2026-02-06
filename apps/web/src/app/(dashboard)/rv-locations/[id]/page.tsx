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
  getRVLocationStatusLabel,
  getRVLocationCategoryLabel,
  getRVLocationCategoryColor,
  getRVLocationStatusColor,
  getRVLandTypeLabel,
  getRVLandTypeColor,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  MapPin,
  Clock,
  Star,
  ExternalLink,
  Save,
  Loader2,
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
  Download,
  Pencil,
  ArrowUpRight,
  Mountain,
  Timer,
  Navigation,
  Sparkles,
  GraduationCap,
  TrendingUp,
  Lightbulb,
  Check,
  AlertCircle,
  Bike,
  Waves,
  Fish,
  Ship,
  TreePine,
  Camera,
  Compass,
  Tent,
  LucideIcon,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  RVLocationCategory,
  RVLocationStatus,
  RVLocation,
  RVLocationActivity,
  RVLocationMedia,
} from "@singularity/shared-types";
import { useDropzone } from "react-dropzone";
import { createClient } from "@supabase/supabase-js";
import { RVReviewsSection } from "@/components/rv-locations/RVReviewsSection";
import { PhotoGallery } from "@/components/rv-locations/PhotoGallery";
import {
  RVKidEngagement,
  RVChildEngagement,
  RVEducationalValue,
  RVLandType,
} from "@singularity/shared-types";

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

// Map activity types to icons
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

// Map activity types to colors (icon color, bg color)
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

// Empty data placeholder component
function EmptyDataIndicator({ label = "Not researched" }: { label?: string }) {
  return (
    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
      <p className="text-sm text-muted-foreground/70 italic">{label}</p>
    </div>
  );
}

// Kid engagement card component
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
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

  const handleFetchGooglePhotos = async () => {
    if (!location?.google_place_id) {
      toast.error("No Google Place ID found");
      return;
    }
    try {
      const result = await fetchGooglePlaces.mutateAsync({ locationId, fetchPhotos: true });
      toast.success(`Added ${result.photos_added} photos from Google`);
      refetch();
    } catch {
      toast.error("Failed to fetch Google photos");
    }
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
  const media = location.media || [];
  const vibe = location.vibe as Record<string, number> | null;
  const logistics = location.rv_logistics as Record<string, any> | null;
  const bestSeason = location.best_season as { best?: string[]; avoid?: string[]; notes?: string } | null;
  const educationalValue = (location as any).educational_value as RVEducationalValue | null;
  const kidEngagement = (location as any).kid_engagement as RVKidEngagement | null;

  // Build Google Maps URL for rating link
  const googleMapsUrl = location.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${location.google_place_id}`
    : location.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
    : null;

  return (
    <div className="container max-w-5xl py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/rv-locations">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
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

        <div className="flex items-center gap-2 shrink-0">
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
        </div>
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
            locationId={locationId}
            locationName={location.name}
            googleRating={location.google_rating}
            googleReviewCount={location.google_review_count}
            reviewsSummary={(location as any).reviews_summary}
            reviewsHighlights={(location as any).reviews_highlights}
            enrichedAt={(location as any).enriched_at}
            onEnrich={handleEnrich}
            isEnriching={enrichLocation.isPending}
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
                  {/* Quick badges for hookups and cell */}
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
                  {/* Additional details */}
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

          {/* Actions */}
          <Card className="p-[1px]">
            <CardContent className="p-2 space-y-1.5">
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
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Activities Section - Full Width */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activities ({activities.length})</CardTitle>
            <div className="flex items-center gap-2">
              {selectedPhotos.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedPhotos.size} selected</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPhotos(new Set())}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowBatchDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <Button size="sm" onClick={handleAddActivity}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <EmptyDataIndicator label="No activities added yet" />
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                // Get photos for this activity
                const activityPhotos = media.filter(m => m.activity_id === activity.id);
                const ActivityIcon = (activity.activity_type && ACTIVITY_ICONS[activity.activity_type]) || MapPin;
                const activityColors = (activity.activity_type && ACTIVITY_COLORS[activity.activity_type]) || { icon: "text-gray-500", bg: "bg-gray-500/10" };
                return (
                  <div
                    key={activity.id}
                    className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Left column: Icon + Type + Difficulty */}
                      <div className="flex flex-col items-center shrink-0 w-14 px-[1px]">
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
                      <div className="flex-1 min-w-0">
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
                              // Color based on engagement level
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
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(activity);
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
                            setDeleteActivityId(activity.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                                    // Find the global index for this photo in the media array
                                    const globalIndex = media.findIndex(m => m.id === photo.id);
                                    setGalleryInitialIndex(globalIndex >= 0 ? globalIndex : 0);
                                    setGalleryOpen(true);
                                    // Scroll to activity section after gallery opens
                                    setTimeout(() => {
                                      const element = document.getElementById(`gallery-section-${activity.id}`);
                                      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }}
                                />
                                {/* Checkbox overlay - top right corner */}
                                <div
                                  className="absolute top-0 right-0 z-10 p-0.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePhotoSelection(photo.id);
                                  }}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    className="h-4 w-4 bg-white/90 border-muted-foreground/50 rounded-sm"
                                  />
                                </div>
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

      {/* Photo Gallery */}
      <PhotoGallery
        media={media}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        initialIndex={galleryInitialIndex}
        onToggleFavorite={(mediaId) => {
          toggleMediaFavorite.mutate({ locationId, mediaId });
        }}
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
