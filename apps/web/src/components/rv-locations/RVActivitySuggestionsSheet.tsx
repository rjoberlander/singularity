"use client";

import { useState } from "react";
import { useSuggestRVActivities, useCreateRVLocationActivity } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Sparkles,
  Plus,
  Check,
  Mountain,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface ActivitySuggestion {
  name: string;
  activity_type: string;
  description: string;
  duration_text?: string;
  difficulty?: string;
  why_recommended: string;
  kid_engagement?: Record<string, unknown>;
}

interface RVActivitySuggestionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
  onActivityAdded?: () => void;
}

export function RVActivitySuggestionsSheet({
  open,
  onOpenChange,
  locationId,
  locationName,
  onActivityAdded,
}: RVActivitySuggestionsSheetProps) {
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const suggestMutation = useSuggestRVActivities();
  const createActivity = useCreateRVLocationActivity();

  const handleFetchSuggestions = async () => {
    try {
      const result = await suggestMutation.mutateAsync(locationId);
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        setAddedIds(new Set());
        if (result.suggestions.length === 0) {
          toast.info("No suggestions found for this location");
        }
      }
    } catch {
      toast.error("Failed to fetch suggestions");
    }
  };

  const handleAddActivity = async (suggestion: ActivitySuggestion, index: number) => {
    try {
      await createActivity.mutateAsync({
        locationId,
        data: {
          name: suggestion.name,
          activity_type: suggestion.activity_type as any,
          description: suggestion.description,
          duration_text: suggestion.duration_text,
          difficulty: suggestion.difficulty,
        },
      });
      setAddedIds((prev) => new Set(prev).add(index));
      toast.success(`Added "${suggestion.name}"`);
      onActivityAdded?.();
    } catch {
      toast.error("Failed to add activity");
    }
  };

  const isLoading = suggestMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Activity Suggestions
          </SheetTitle>
          <SheetDescription>
            AI-powered activity suggestions for {locationName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Generate Button */}
          {suggestions.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                Get AI-powered activity suggestions based on the location type and your family profile.
              </p>
              <Button onClick={handleFetchSuggestions}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Suggestions
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Analyzing location and generating suggestions...
                </span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Suggestions List */}
          {!isLoading && suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {suggestions.length} suggestions found
                </p>
                <Button variant="outline" size="sm" onClick={handleFetchSuggestions}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                  const isAdded = addedIds.has(index);

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-colors ${
                        isAdded ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium">{suggestion.name}</h4>
                            {suggestion.activity_type && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {suggestion.activity_type.replace("_", " ")}
                              </Badge>
                            )}
                            {suggestion.difficulty && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {suggestion.difficulty}
                              </Badge>
                            )}
                          </div>

                          {suggestion.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {suggestion.description}
                            </p>
                          )}

                          {suggestion.duration_text && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {suggestion.duration_text}
                            </p>
                          )}

                          {suggestion.why_recommended && (
                            <p className="text-xs text-primary mt-2 italic">
                              {suggestion.why_recommended}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isAdded ? "ghost" : "default"}
                          disabled={isAdded || createActivity.isPending}
                          onClick={() => handleAddActivity(suggestion, index)}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-4 w-4 mr-1 text-green-500" />
                              Added
                            </>
                          ) : createActivity.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
