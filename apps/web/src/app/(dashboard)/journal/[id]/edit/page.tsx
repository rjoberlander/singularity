"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useJournalEntry,
  useUpdateJournalEntry,
  getMoodEmoji,
} from "@singularity/shared-api/hooks";
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
  Tag,
  X,
  Plus,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { JournalMood } from "@singularity/shared-types";
import { cn } from "@/lib/utils";

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

      toast.success("Entry updated");
      router.push(`/journal/${id}`);
    } catch (error) {
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
          disabled={updateEntry.isPending || !content.trim()}
        >
          {updateEntry.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
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
    </div>
  );
}
