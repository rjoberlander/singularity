"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateJournalEntry,
  useRandomJournalPrompt,
  useAddJournalMedia,
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Sparkles,
  Edit3,
  Send,
  Loader2,
  MapPin,
  X,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Calendar,
  Clock,
  Upload,
  Video,
  Locate,
} from "lucide-react";
import { toast } from "sonner";
import { JournalMood, JournalEntryMode } from "@singularity/shared-types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MOOD_OPTIONS: { value: JournalMood; emoji: string; label: string }[] = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "sad", emoji: "😔", label: "Sad" },
  { value: "down", emoji: "😢", label: "Down" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
];

type EditorStep = "mode" | "editor";

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const createEntry = useCreateJournalEntry();
  const addMedia = useAddJournalMedia();
  const { data: randomPrompt, refetch: refetchPrompt, isLoading: isLoadingPrompt } = useRandomJournalPrompt();

  // Steps
  const [step, setStep] = useState<EditorStep>("mode");
  const [mode, setMode] = useState<JournalEntryMode>("freeform");

  // Entry data
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<JournalMood | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [entryTime, setEntryTime] = useState(
    new Date().toTimeString().substring(0, 5)
  );
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);

  // Media state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Location state
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFiles]
  );

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

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

  // Location handlers
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
        { headers: { "User-Agent": "Singularity Journal App" } }
      );
      const data = await response.json();
      if (data.address) {
        const { city, town, village, suburb, neighbourhood, county, state } = data.address;
        const locality = city || town || village || suburb || neighbourhood || county;
        if (locality && state) {
          return `${locality}, ${state}`;
        }
        return locality || state || data.display_name?.split(",").slice(0, 2).join(",");
      }
      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  const handleGetLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationLat(latitude);
        setLocationLng(longitude);

        // Get readable address
        const address = await reverseGeocode(latitude, longitude);
        if (address) {
          setLocationName(address);
        } else {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }

        setIsGettingLocation(false);
        toast.success("Location detected");
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out");
            break;
          default:
            toast.error("Failed to get location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

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

  const handleSelectMode = (selectedMode: JournalEntryMode) => {
    setMode(selectedMode);
    if (selectedMode === "guided" && randomPrompt) {
      setSelectedPrompt(randomPrompt.prompt_text);
    }
    setStep("editor");
  };

  const handleAddTag = useCallback(() => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please write something");
      return;
    }

    try {
      // Create the entry first
      const entry = await createEntry.mutateAsync({
        title: title.trim() || undefined,
        content: content.trim(),
        entry_date: entryDate,
        entry_time: entryTime,
        mood: mood || undefined,
        tags,
        location_name: locationName || undefined,
        location_lat: locationLat || undefined,
        location_lng: locationLng || undefined,
        entry_mode: mode,
        prompt_used: selectedPrompt || undefined,
      });

      // Upload media files if any
      if (mediaFiles.length > 0) {
        setIsUploadingMedia(true);
        const uploadedMedia: { media_type: "image" | "video"; file_url: string; original_filename: string; mime_type: string; file_size_bytes: number }[] = [];

        for (const media of mediaFiles) {
          const result = await uploadMediaToStorage(media.file, entry.id);
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

        // Add all uploaded media to the entry
        if (uploadedMedia.length > 0) {
          await addMedia.mutateAsync({
            entryId: entry.id,
            media: uploadedMedia,
          });
        }

        setIsUploadingMedia(false);

        if (uploadedMedia.length < mediaFiles.length) {
          toast.warning(`Entry saved, but ${mediaFiles.length - uploadedMedia.length} file(s) failed to upload`);
        } else {
          toast.success("Entry saved with media");
        }
      } else {
        toast.success("Entry saved");
      }

      router.push(`/journal/${entry.id}`);
    } catch (error) {
      setIsUploadingMedia(false);
      toast.error("Failed to save entry");
    }
  };

  const handleNewPrompt = () => {
    refetchPrompt();
    if (randomPrompt) {
      setSelectedPrompt(randomPrompt.prompt_text);
    }
  };

  // Mode Selection Step
  if (step === "mode") {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/journal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">New Entry</h1>
        </div>

        {/* Mode Selection */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto">
          <h2 className="text-lg font-medium mb-6 text-center">
            How would you like to write today?
          </h2>

          <div className="grid gap-4 w-full">
            {/* Freeform */}
            <button
              onClick={() => handleSelectMode("freeform")}
              className="group p-6 rounded-xl border-2 border-border hover:border-primary bg-card hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                  <Edit3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Free Write</h3>
                  <p className="text-sm text-muted-foreground">
                    Write freely about anything on your mind. No prompts, no
                    structure.
                  </p>
                </div>
              </div>
            </button>

            {/* Guided */}
            <button
              onClick={() => handleSelectMode("guided")}
              className="group p-6 rounded-xl border-2 border-border hover:border-primary bg-card hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Guided Prompt</h3>
                  <p className="text-sm text-muted-foreground">
                    Get inspired with a thoughtful question to guide your
                    reflection.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Editor Step
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("mode")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium">
            {mode === "guided" ? "Guided Entry" : "Free Write"}
          </h1>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createEntry.isPending || isUploadingMedia || !content.trim()}
        >
          {createEntry.isPending || isUploadingMedia ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {isUploadingMedia ? "Uploading..." : "Save"}
        </Button>
      </div>

      {/* Prompt (if guided mode) */}
      {mode === "guided" && selectedPrompt && (
        <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
              <p className="text-sm font-medium">{selectedPrompt}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNewPrompt}
              disabled={isLoadingPrompt}
            >
              <RefreshCw
                className={cn("w-4 h-4", isLoadingPrompt && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Title (optional) */}
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-medium border-none shadow-none focus-visible:ring-0 px-0"
        />

        {/* Content */}
        <Textarea
          placeholder={
            mode === "guided"
              ? "Start writing your response..."
              : "What's on your mind?"
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[300px] resize-none border-none shadow-none focus-visible:ring-0 px-0 text-base"
          autoFocus
        />

        {/* Media Upload */}
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

          {/* Media previews */}
          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {mediaFiles.map((media, index) => (
                <div
                  key={`${media.file.name}-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                >
                  {media.type === "image" ? (
                    <img
                      src={media.preview}
                      alt={media.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Video className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {media.type === "video" && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                      Video
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drop zone */}
          <div
            ref={dropZoneRef}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            {isDragging ? (
              <>
                <Upload className="w-8 h-8 mb-2 text-primary" />
                <p className="text-sm font-medium text-primary">Drop files here</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <Video className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to add photos/videos
                </p>
                {mediaFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {mediaFiles.length} file{mediaFiles.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mood Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            How are you feeling?
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

        {/* Toggle Metadata */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMetadata(!showMetadata)}
          className="text-muted-foreground"
        >
          {showMetadata ? "Hide" : "Show"} date & location
        </Button>

        {/* Metadata (Date, Time, Location) */}
        {showMetadata && (
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
              <div className="flex gap-2">
                <Input
                  placeholder="Where are you?"
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    // Clear coords if manually editing
                    if (locationLat || locationLng) {
                      setLocationLat(null);
                      setLocationLng(null);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  title="Use my location"
                >
                  {isGettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Locate className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {locationLat && locationLng && (
                <p className="text-xs text-muted-foreground">
                  Coordinates: {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
