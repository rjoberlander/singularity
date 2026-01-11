"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useJournalEntry,
  useUpdateJournalEntry,
  useAddJournalMedia,
  useDeleteJournalMedia,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  X,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  Image as ImageIcon,
  Video,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { JournalMood, JournalMedia } from "@singularity/shared-types";
import { cn } from "@/lib/utils";

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

const MOOD_OPTIONS: { value: JournalMood; emoji: string; label: string }[] = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "sad", emoji: "😔", label: "Sad" },
  { value: "down", emoji: "😢", label: "Down" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
];

export default function EditJournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: entry, isLoading } = useJournalEntry(id);
  const updateEntry = useUpdateJournalEntry();
  const addMedia = useAddJournalMedia();
  const deleteMedia = useDeleteJournalMedia();

  // Media state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [deletingMediaIds, setDeletingMediaIds] = useState<Set<string>>(new Set());
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<JournalMood | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [locationName, setLocationName] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("");

  // Load entry data
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || "");
      setContent(entry.content);
      setMood((entry.mood as JournalMood) || null);
      setTags(entry.tags);
      setLocationName(entry.location_name || "");
      setEntryDate(entry.entry_date);
      setEntryTime(entry.entry_time?.substring(0, 5) || "");
    }
  }, [entry]);

  const handleAddTag = useCallback(() => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Cleanup media previews on unmount
  useEffect(() => {
    return () => {
      mediaFiles.forEach((media) => URL.revokeObjectURL(media.preview));
    };
  }, [mediaFiles]);

  // Media handlers
  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (validFiles.length === 0) {
      toast.error("Please select image or video files");
      return;
    }

    const newMediaFiles: MediaFile[] = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("image/") ? "image" : "video",
    }));

    setMediaFiles((prev) => [...prev, ...newMediaFiles]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFiles]
  );

  const handleRemoveNewMedia = useCallback((index: number) => {
    setMediaFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDeleteExistingMedia = async (mediaId: string) => {
    setDeletingMediaIds((prev) => new Set(prev).add(mediaId));
    try {
      await deleteMedia.mutateAsync({ entryId: id, mediaId });
      toast.success("Media deleted");
    } catch (error) {
      toast.error("Failed to delete media");
    } finally {
      setDeletingMediaIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mediaId);
        return newSet;
      });
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  // Upload media to Supabase Storage
  const uploadMediaToStorage = async (
    file: File,
    entryId: string
  ): Promise<{ url: string; type: "image" | "video" } | null> => {
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${entryId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("singularity-uploads")
        .upload(`journal/${fileName}`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("singularity-uploads")
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        type: file.type.startsWith("image/") ? "image" : "video",
      };
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }

    try {
      await updateEntry.mutateAsync({
        id,
        data: {
          title: title.trim() || undefined,
          content: content.trim(),
          entry_date: entryDate,
          entry_time: entryTime || undefined,
          mood: mood || undefined,
          tags,
          location_name: locationName || undefined,
        },
      });

      // Upload new media files if any
      if (mediaFiles.length > 0) {
        setIsUploadingMedia(true);
        const uploadedMedia: { media_type: "image" | "video"; file_url: string; original_filename: string; mime_type: string; file_size_bytes: number }[] = [];

        for (const media of mediaFiles) {
          const result = await uploadMediaToStorage(media.file, id);
          if (result) {
            uploadedMedia.push({
              media_type: result.type,
              file_url: result.url,
              original_filename: media.file.name,
              mime_type: media.file.type,
              file_size_bytes: media.file.size,
            });
          }
        }

        if (uploadedMedia.length > 0) {
          await addMedia.mutateAsync({
            entryId: id,
            media: uploadedMedia,
          });
        }

        setIsUploadingMedia(false);

        if (uploadedMedia.length < mediaFiles.length) {
          toast.warning(`Entry updated, but ${mediaFiles.length - uploadedMedia.length} file(s) failed to upload`);
        } else {
          toast.success("Entry updated with new media");
        }
      } else {
        toast.success("Entry updated");
      }

      router.push(`/journal/${id}`);
    } catch (error) {
      setIsUploadingMedia(false);
      toast.error("Failed to update entry");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/journal/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-medium">Edit Entry</h1>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={updateEntry.isPending || isUploadingMedia || !content.trim()}
        >
          {updateEntry.isPending || isUploadingMedia ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isUploadingMedia ? "Uploading..." : "Save"}
        </Button>
      </div>

      {/* Prompt (if guided) */}
      {entry.entry_mode === "guided" && entry.prompt_used && (
        <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
            <p className="text-sm font-medium">{entry.prompt_used}</p>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Title */}
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-medium border-none shadow-none focus-visible:ring-0 px-0"
        />

        {/* Content */}
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[300px] resize-none border-none shadow-none focus-visible:ring-0 px-0 text-base"
        />

        {/* Media Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Photos & Videos
          </label>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Existing media from entry - Instagram style small thumbnails */}
          {entry.media && entry.media.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Current media ({entry.media.length})</p>
              <div className="flex flex-wrap gap-2">
                {entry.media.map((media: JournalMedia) => (
                  <div
                    key={media.id}
                    className="relative w-16 h-16 rounded-md overflow-hidden bg-muted group flex-shrink-0"
                  >
                    {media.media_type === "image" ? (
                      <img
                        src={media.file_url}
                        alt={media.original_filename || "Journal media"}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxMedia({ url: media.file_url, type: "image" })}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setLightboxMedia({ url: media.file_url, type: "video" })}
                      >
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExistingMedia(media.id);
                      }}
                      disabled={deletingMediaIds.has(media.id)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingMediaIds.has(media.id) ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New media previews - Instagram style small thumbnails */}
          {mediaFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">New media ({mediaFiles.length})</p>
              <div className="flex flex-wrap gap-2">
                {mediaFiles.map((media, index) => (
                  <div
                    key={`${media.file.name}-${index}`}
                    className="relative w-16 h-16 rounded-md overflow-hidden bg-muted group flex-shrink-0 ring-2 ring-primary/50"
                  >
                    {media.type === "image" ? (
                      <img
                        src={media.preview}
                        alt={media.file.name}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxMedia({ url: media.preview, type: "image" })}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => setLightboxMedia({ url: media.preview, type: "video" })}
                      >
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNewMedia(index);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop zone - compact */}
          <div
            ref={dropZoneRef}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "flex items-center justify-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {isDragging ? (
              <>
                <Upload className="w-5 h-5 text-primary" />
                <p className="text-sm font-medium text-primary">Drop files here</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <Video className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Add photos/videos
                </p>
              </>
            )}
          </div>
        </div>

        {/* Mood Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Mood
          </label>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setMood(mood === option.value ? null : option.value)
                }
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                  mood === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-lg">{option.emoji}</span>
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="h-7 w-28 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleAddTag}
                disabled={!newTag}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Date, Time, Location */}
        <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-lg border bg-muted/30">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </label>
            <Input
              type="time"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <Input
              placeholder="Where are you?"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxMedia(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {lightboxMedia.type === "image" ? (
            <img
              src={lightboxMedia.url}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={lightboxMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
