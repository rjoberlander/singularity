"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Quote,
  MessageSquare,
  Clock,
} from "lucide-react";
import { RVReviewHighlights } from "@singularity/shared-types";
import { format, formatDistanceToNow } from "date-fns";

interface RVReviewsSectionProps {
  locationId: string;
  locationName: string;
  googleRating?: number;
  googleReviewCount?: number;
  reviewsSummary?: string;
  reviewsHighlights?: RVReviewHighlights;
  enrichedAt?: string;
  onEnrich?: () => void;
  isEnriching?: boolean;
}

export function RVReviewsSection({
  locationId,
  locationName,
  googleRating,
  googleReviewCount,
  reviewsSummary,
  reviewsHighlights,
  enrichedAt,
  onEnrich,
  isEnriching,
}: RVReviewsSectionProps) {
  const hasReviewData = reviewsSummary || reviewsHighlights;

  // Format the enriched timestamp
  const enrichedTimeAgo = enrichedAt
    ? formatDistanceToNow(new Date(enrichedAt), { addSuffix: true })
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reviews
          </CardTitle>
          <div className="flex items-center gap-2">
            {googleRating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{googleRating.toFixed(1)}</span>
                {googleReviewCount && (
                  <span className="text-sm text-muted-foreground">
                    ({googleReviewCount.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}
            {onEnrich && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEnrich}
                disabled={isEnriching}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isEnriching ? "animate-spin" : ""}`} />
                {hasReviewData ? "Refresh" : "Fetch Reviews"}
              </Button>
            )}
          </div>
        </div>
        {enrichedTimeAgo && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            Last updated {enrichedTimeAgo}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEnriching ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : hasReviewData ? (
          <>
            {/* AI Summary */}
            {(reviewsSummary || reviewsHighlights?.summary) && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm leading-relaxed">
                  {reviewsSummary || reviewsHighlights?.summary}
                </p>
              </div>
            )}

            {/* Positive Highlights */}
            {reviewsHighlights?.positive && reviewsHighlights.positive.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-green-600">
                  <ThumbsUp className="h-4 w-4" />
                  What people love
                </h4>
                <div className="space-y-2">
                  {reviewsHighlights.positive.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm border-l-2 border-green-200 pl-3"
                    >
                      <Quote className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-muted-foreground italic">
                          &ldquo;{highlight.text}&rdquo;
                        </p>
                        {highlight.author && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            — {highlight.author}
                            {highlight.rating && (
                              <span className="ml-1">
                                ({highlight.rating}/5)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Negative Highlights */}
            {reviewsHighlights?.negative && reviewsHighlights.negative.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-orange-600">
                  <ThumbsDown className="h-4 w-4" />
                  Common concerns
                </h4>
                <div className="space-y-2">
                  {reviewsHighlights.negative.map((highlight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm border-l-2 border-orange-200 pl-3"
                    >
                      <Quote className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-muted-foreground italic">
                          &ldquo;{highlight.text}&rdquo;
                        </p>
                        {highlight.author && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            — {highlight.author}
                            {highlight.rating && (
                              <span className="ml-1">
                                ({highlight.rating}/5)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No review data available</p>
            <p className="text-xs mt-1">
              Click &ldquo;Fetch Reviews&rdquo; to get Google reviews and AI analysis
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
