"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useJournalEntry,
  useDeleteJournalEntry,
  useUpdateJournalShare,
  useRevokeJournalShare,
  getMoodEmoji,
  getMoodColor,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  MapPin,
  Cloud,
  Calendar,
  Clock,
  Tag,
  Sparkles,
  Copy,
  ExternalLink,
  Lock,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: entry, isLoading } = useJournalEntry(id);
  const deleteEntry = useDeleteJournalEntry();
  const updateShare = useUpdateJournalShare();
  const revokeShare = useRevokeJournalShare();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [showAuthor, setShowAuthor] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showDate, setShowDate] = useState(true);

  const handleDelete = async () => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success("Entry deleted");
      router.push("/journal");
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const handleTogglePublic = async () => {
    if (!entry) return;

    try {
      if (entry.is_public) {
        await revokeShare.mutateAsync(id);
        toast.success("Entry is now private");
      } else {
        await updateShare.mutateAsync({
          entryId: id,
          settings: {
            is_public: true,
            show_author: showAuthor,
            show_location: showLocation,
            show_date: showDate,
            password: sharePassword || undefined,
          },
        });
        toast.success("Entry is now public");
      }
    } catch (error) {
      toast.error("Failed to update sharing");
    }
  };

  const handleCopyLink = () => {
    if (entry?.public_slug) {
      navigator.clipboard.writeText(
        `${window.location.origin}/journal/public/${entry.public_slug}`
      );
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium mb-2">Entry not found</h2>
        <Link href="/journal">
          <Button variant="outline">Back to Journal</Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(entry.entry_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/journal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {entry.mood && (
                <span
                  className="text-2xl"
                  style={{ color: getMoodColor(entry.mood) }}
                >
                  {getMoodEmoji(entry.mood)}
                </span>
              )}
              <h1 className="text-xl font-bold">
                {entry.title || "Untitled Entry"}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </span>
              {entry.entry_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {entry.entry_time.substring(0, 5)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Link href={`/journal/${id}/edit`}>
            <Button variant="outline" size="icon">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Prompt */}
        {entry.entry_mode === "guided" && entry.prompt_used && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
              <p className="text-sm font-medium">{entry.prompt_used}</p>
            </div>
          </div>
        )}

        {/* Media */}
        {entry.media && entry.media.length > 0 && (
          <div className="mb-6">
            <div
              className={cn(
                "grid gap-2",
                entry.media.length === 1
                  ? "grid-cols-1"
                  : entry.media.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              )}
            >
              {entry.media.map((media) => (
                <div
                  key={media.id}
                  className="rounded-lg overflow-hidden bg-muted aspect-video"
                >
                  {media.media_type === "image" ? (
                    <img
                      src={media.file_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={media.file_url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entry Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
          <p className="whitespace-pre-wrap">{entry.content}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
          {entry.location_name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {entry.location_name}
            </span>
          )}

          {entry.weather_condition && (
            <span className="flex items-center gap-1">
              <Cloud className="w-4 h-4" />
              {entry.weather_temp_f}°F, {entry.weather_condition}
            </span>
          )}

          {entry.is_public && (
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" />
              Public
            </Badge>
          )}

          {entry.is_time_capsule && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/50">
              <Clock className="w-3 h-3" />
              Time Capsule - {new Date(entry.capsule_delivery_date!).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this journal entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Entry
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Public Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Make Public</span>
              </div>
              <Switch
                checked={entry.is_public}
                onCheckedChange={handleTogglePublic}
              />
            </div>

            {entry.is_public && (
              <>
                {/* Public Link */}
                <div className="p-3 rounded-lg bg-muted flex items-center justify-between gap-2">
                  <span className="text-sm truncate">
                    {window.location.origin}/journal/public/{entry.public_slug}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={handleCopyLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <a
                      href={`/journal/public/${entry.public_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Visibility Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Author</span>
                    <Switch
                      checked={showAuthor}
                      onCheckedChange={setShowAuthor}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Location</span>
                    <Switch
                      checked={showLocation}
                      onCheckedChange={setShowLocation}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show Date</span>
                    <Switch checked={showDate} onCheckedChange={setShowDate} />
                  </div>
                </div>

                {/* Password Protection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password (optional)
                  </label>
                  <Input
                    type="password"
                    placeholder="Set a password to protect"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
