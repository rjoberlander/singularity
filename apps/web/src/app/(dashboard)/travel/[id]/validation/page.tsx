"use client";

import { useParams } from "next/navigation";
import { useTripFull, useTripSchedule, API_URL } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Clock,
  MapPin,
  Utensils,
  Hotel,
  Ticket,
  Calendar,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ValidationResult, ValidationIssue, AssembleScheduleResponse } from "@singularity/shared-types";

export default function ValidationPage() {
  const params = useParams();
  const tripId = params.id as string;

  const { data: trip, isLoading: tripLoading } = useTripFull(tripId);
  const { data: scheduleItems, isLoading: scheduleLoading, refetch: refetchSchedule } = useTripSchedule(tripId);

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  // Extract validation issues from schedule items on load
  useEffect(() => {
    if (scheduleItems && scheduleItems.length > 0) {
      // Aggregate all validation issues from schedule items
      const allIssues: ValidationIssue[] = [];
      let hasValidation = false;

      for (const item of scheduleItems) {
        if (item.validation_issues && Array.isArray(item.validation_issues)) {
          hasValidation = true;
          allIssues.push(...item.validation_issues);
        }
      }

      if (hasValidation) {
        const summary = {
          errors: allIssues.filter(i => i.severity === 'error').length,
          warnings: allIssues.filter(i => i.severity === 'warning').length,
          suggestions: allIssues.filter(i => i.severity === 'suggestion').length,
        };

        setValidationResult({
          valid: summary.errors === 0 && summary.warnings === 0,
          canProceed: true,
          issues: allIssues,
          summary,
        });
      }
    }
  }, [scheduleItems]);

  const handleRevalidate = async () => {
    setIsValidating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${API_URL}/travel/trips/${tripId}/assemble-schedule?validate_only=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to validate schedule");
      }

      const result = await response.json() as AssembleScheduleResponse;

      if (result.data?.validation) {
        setValidationResult(result.data.validation);
        setLastValidatedAt(new Date().toISOString());
        toast.success("Validation complete");
      }

      // Refetch schedule items to get updated validation status
      refetchSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to validate");
    } finally {
      setIsValidating(false);
    }
  };

  if (tripLoading || scheduleLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trip) {
    return <div className="text-muted-foreground">Trip not found</div>;
  }

  const hasSchedule = scheduleItems && scheduleItems.length > 0;
  const totalItems = scheduleItems?.length || 0;
  const itemsWithIssues = scheduleItems?.filter(i => i.validation_status === 'warning' || i.validation_status === 'error').length || 0;

  // Group issues by category
  const issuesByCategory = validationResult?.issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, ValidationIssue[]>) || {};

  const categoryConfig: Record<string, { icon: typeof AlertCircle; label: string; color: string }> = {
    opening_hours: { icon: Clock, label: "Opening Hours", color: "text-orange-500" },
    travel_time: { icon: MapPin, label: "Travel Time", color: "text-blue-500" },
    meal_gap: { icon: Utensils, label: "Meal Gaps", color: "text-yellow-500" },
    amenity_mismatch: { icon: Hotel, label: "Hotel Amenities", color: "text-purple-500" },
    booking: { icon: Ticket, label: "Bookings Required", color: "text-pink-500" },
    duration: { icon: Calendar, label: "Duration", color: "text-cyan-500" },
    google_data: { icon: Info, label: "Google Data", color: "text-gray-500" },
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {validationResult && validationResult.summary.errors === 0 && validationResult.summary.warnings === 0 ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                )}
                Schedule Validation
              </CardTitle>
              <CardDescription>
                Review validation results and issues for your assembled schedule
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevalidate}
              disabled={isValidating || !hasSchedule}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Re-validate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasSchedule ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No schedule assembled yet</p>
              <p className="text-sm">Go to the Plan tab and click "Assemble Schedule" first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{totalItems}</div>
                  <div className="text-xs text-muted-foreground">Schedule Items</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {totalItems - itemsWithIssues}
                  </div>
                  <div className="text-xs text-muted-foreground">Valid Items</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {validationResult?.summary.errors || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {validationResult?.summary.warnings || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {validationResult?.summary.suggestions || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Suggestions</div>
                </div>
              </div>

              {/* Last validated timestamp */}
              {lastValidatedAt && (
                <p className="text-xs text-muted-foreground">
                  Last validated: {new Date(lastValidatedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues by Category */}
      {hasSchedule && validationResult && validationResult.issues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Issues by Category</h2>

          {Object.entries(issuesByCategory).map(([category, issues]) => {
            const config = categoryConfig[category] || { icon: AlertCircle, label: category, color: "text-gray-500" };
            const Icon = config.icon;

            return (
              <Card key={category}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    {config.label}
                    <Badge variant="secondary" className="ml-auto">
                      {issues.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {issues.map((issue, idx) => (
                      <IssueRow key={`${category}-${idx}`} issue={issue} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* All Clear */}
      {hasSchedule && validationResult && validationResult.issues.length === 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-green-700 dark:text-green-400">All validations passed!</p>
            <p className="text-sm text-muted-foreground">Your schedule looks good.</p>
          </CardContent>
        </Card>
      )}

      {/* What We Check Section */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">What We Validate</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <span className="font-medium">Opening Hours</span>
                <p className="text-xs text-muted-foreground">Activities scheduled when places are open</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <span className="font-medium">Travel Time</span>
                <p className="text-xs text-muted-foreground">Enough time between locations</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Utensils className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <span className="font-medium">Meal Gaps</span>
                <p className="text-xs text-muted-foreground">Lunch (11am-3pm) and dinner (6pm-9pm) scheduled</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hotel className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <span className="font-medium">Hotel Amenities</span>
                <p className="text-xs text-muted-foreground">Pool time, breakfast match hotel features</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Ticket className="h-4 w-4 text-pink-500 mt-0.5" />
              <div>
                <span className="font-medium">Booking Requirements</span>
                <p className="text-xs text-muted-foreground">Activities needing reservations flagged</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-cyan-500 mt-0.5" />
              <div>
                <span className="font-medium">Duration Realism</span>
                <p className="text-xs text-muted-foreground">Museums 90min+, castles 60min+, etc.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const severityConfig = {
    error: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", badge: "destructive" as const },
    warning: { icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", badge: "outline" as const },
    suggestion: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", badge: "secondary" as const },
  };

  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <div className={cn("p-3 rounded-lg flex items-start gap-3", config.bg)}>
      <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("font-medium text-sm", config.color)}>{issue.message}</span>
          {issue.activityName && (
            <Badge variant={config.badge} className="text-[10px]">
              {issue.activityName}
            </Badge>
          )}
        </div>
        {issue.details && (
          <p className="text-xs text-muted-foreground mt-0.5">{issue.details}</p>
        )}
        {issue.date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(issue.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {issue.time && ` at ${issue.time}`}
          </p>
        )}
      </div>
    </div>
  );
}
