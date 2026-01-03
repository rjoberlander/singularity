"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateJournalEntry,
  useRandomJournalPrompt,
  getMoodEmoji,
  getMoodColor,
} from "@singularity/shared-api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Edit3,
  Send,
  Loader2,
  MapPin,
  Cloud,
  Tag,
  X,
  Plus,
  RefreshCw,
  Image,
  Calendar,
  Clock,
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

export default function NewJournalEntryPage() {
  const router = useRouter();
  const createEntry = useCreateJournalEntry();
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
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [entryTime, setEntryTime] = useState(
    new Date().toTimeString().substring(0, 5)
  );
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);

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
      const entry = await createEntry.mutateAsync({
        title: title.trim() || undefined,
        content: content.trim(),
        entry_date: entryDate,
        entry_time: entryTime,
        mood: mood || undefined,
        tags,
        location_name: locationName || undefined,
        entry_mode: mode,
        prompt_used: selectedPrompt || undefined,
      });

      toast.success("Entry saved");
      router.push(`/journal/${entry.id}`);
    } catch (error) {
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
          disabled={createEntry.isPending || !content.trim()}
        >
          {createEntry.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Save
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
              <Input
                placeholder="Where are you?"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
