"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useJournalEntries,
  useJournalTags,
  useJournalOnThisDay,
  useDeleteJournalEntry,
  getMoodEmoji,
  getMoodColor,
  formatJournalDate,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  BookOpen,
  Calendar,
  MapPin,
  Cloud,
  Tag,
  MoreHorizontal,
  Edit,
  Trash2,
  Share2,
  Clock,
  Sparkles,
  Image,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { JournalEntry, JournalMood } from "@singularity/shared-types";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS: { value: JournalMood; label: string; emoji: string }[] = [
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "sad", label: "Sad", emoji: "😔" },
  { value: "down", label: "Down", emoji: "😢" },
  { value: "frustrated", label: "Frustrated", emoji: "😤" },
];

export default function JournalPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  // Fetch data
  const { data: entries, isLoading } = useJournalEntries({
    tag: selectedTag || undefined,
    mood: selectedMood || undefined,
    limit: 50,
  });
  const { data: tags } = useJournalTags();
  const { data: onThisDay } = useJournalOnThisDay();
  const deleteEntry = useDeleteJournalEntry();

  // Filter entries by search
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!search) return entries;

    const searchLower = search.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.title?.toLowerCase().includes(searchLower) ||
        entry.content.toLowerCase().includes(searchLower) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }, [entries, search]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const dateKey = formatJournalDate(entry.entry_date);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const handleDelete = async () => {
    if (!deleteEntryId) return;

    try {
      await deleteEntry.mutateAsync(deleteEntryId);
      toast.success("Entry deleted");
      setDeleteEntryId(null);
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSelectedMood(null);
    setSearch("");
  };

  const hasFilters = selectedTag || selectedMood || search;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" />
            Journal
          </h1>
          <p className="text-muted-foreground mt-1">
            {entries?.length || 0} entries
          </p>
        </div>
        <Link href="/journal/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </Link>
      </div>

      {/* On This Day */}
      {onThisDay && onThisDay.length > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <h2 className="text-sm font-medium text-primary flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" />
            On This Day
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {onThisDay.map((item) => (
              <Link
                key={item.entry.id}
                href={`/journal/${item.entry.id}`}
                className="flex-shrink-0 w-48 p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {item.years_ago} year{item.years_ago > 1 ? "s" : ""} ago
                </div>
                <div className="text-sm font-medium line-clamp-2">
                  {item.entry.title || item.entry.content.substring(0, 50)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tag filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Tag className="w-4 h-4 mr-2" />
              {selectedTag || "All Tags"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedTag(null)}>
              All Tags
            </DropdownMenuItem>
            {tags?.map((tag) => (
              <DropdownMenuItem
                key={tag.tag}
                onClick={() => setSelectedTag(tag.tag)}
              >
                {tag.tag} ({tag.count})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mood filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedMood ? (
                <>
                  {getMoodEmoji(selectedMood)}{" "}
                  {MOOD_OPTIONS.find((m) => m.value === selectedMood)?.label}
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 mr-2" />
                  Mood
                </>
              )}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedMood(null)}>
              All Moods
            </DropdownMenuItem>
            {MOOD_OPTIONS.map((mood) => (
              <DropdownMenuItem
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
              >
                {mood.emoji} {mood.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {hasFilters ? "No matching entries" : "No journal entries yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasFilters
                ? "Try adjusting your filters"
                : "Start capturing your thoughts and memories"}
            </p>
            {!hasFilters && (
              <Link href="/journal/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Write Your First Entry
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                  {date}
                </h3>
                <div className="space-y-3">
                  {dateEntries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={() => router.push(`/journal/${entry.id}/edit`)}
                      onDelete={() => setDeleteEntryId(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteEntryId}
        onOpenChange={(open) => !open && setDeleteEntryId(null)}
      >
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
    </div>
  );
}

// Entry Card Component
function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasMedia = entry.media && entry.media.length > 0;

  return (
    <Link href={`/journal/${entry.id}`}>
      <div className="group relative p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all">
        <div className="flex gap-4">
          {/* Media Preview */}
          {hasMedia && (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
              {entry.media![0].media_type === "image" ? (
                <img
                  src={entry.media![0].file_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {entry.media!.length > 1 && (
                <div className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1.5 rounded">
                  +{entry.media!.length - 1}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {entry.mood && (
                  <span
                    className="text-lg"
                    title={entry.mood}
                    style={{ color: getMoodColor(entry.mood) }}
                  >
                    {getMoodEmoji(entry.mood)}
                  </span>
                )}
                {entry.title && (
                  <h4 className="font-medium truncate">{entry.title}</h4>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit();
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {entry.is_public && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(
                          `${window.location.origin}/journal/public/${entry.public_slug}`
                        );
                        toast.success("Link copied");
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Copy Link
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {entry.content}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {entry.entry_time?.substring(0, 5)}
              </span>

              {entry.location_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {entry.location_name}
                </span>
              )}

              {entry.weather_condition && (
                <span className="flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  {entry.weather_temp_f}°F {entry.weather_condition}
                </span>
              )}

              {entry.entry_mode === "guided" && (
                <Badge variant="outline" className="text-xs h-5">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Prompted
                </Badge>
              )}
            </div>

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {entry.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {entry.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{entry.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
