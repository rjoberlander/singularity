"use client";

import { useRoutineVersions } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  History,
  Plus,
  Minus,
  RefreshCw,
  UtensilsCrossed,
  Pill,
  Zap,
  Dumbbell,
  Utensils,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import type { RoutineVersion, RoutineSnapshotItem } from "@singularity/shared-types";

// Get icon for item source
function getSourceIcon(source: string) {
  switch (source) {
    case "supplement":
      return <Pill className="w-3 h-3 text-emerald-400" />;
    case "equipment":
      return <Zap className="w-3 h-3 text-amber-400" />;
    case "schedule_item":
      return <Dumbbell className="w-3 h-3 text-purple-400" />;
    case "routine":
      return <ListTodo className="w-3 h-3 text-blue-400" />;
    default:
      return <History className="w-3 h-3 text-muted-foreground" />;
  }
}

// Format item for display
function formatItem(item: RoutineSnapshotItem): string {
  let str = item.name;
  if (item.timing) {
    str += ` (${item.timing}`;
    if (item.frequency && item.frequency !== "daily") {
      str += `, ${item.frequency}`;
    }
    str += ")";
  }
  return str;
}

export default function ChangeLogPage() {
  const { data: versions, isLoading, error } = useRoutineVersions({ limit: 50 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6" />
          Change Log
        </h1>
        <p className="text-muted-foreground">
          Track all changes to your health routine
        </p>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load change log</p>
        </div>
      ) : versions && versions.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {versions.map((version: RoutineVersion) => {
              const totalChanges =
                version.changes.started.length +
                version.changes.stopped.length +
                version.changes.modified.length +
                (version.changes.diet_changed ? 1 : 0) +
                (version.changes.macros_changed
                  ? Object.keys(version.changes.macros_changed).length
                  : 0);

              return (
                <div key={version.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-card border rounded-full">
                    <span className="text-sm font-medium text-muted-foreground">
                      v{version.version_number}
                    </span>
                  </div>

                  {/* Content */}
                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-semibold">
                            Routine Version {version.version_number}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(version.created_at)}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {totalChanges} change{totalChanges !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      {/* Changes */}
                      <div className="space-y-1.5 text-sm">
                        {/* Diet change */}
                        {version.changes.diet_changed && (
                          <div className="flex items-center gap-2 text-blue-400">
                            <UtensilsCrossed className="w-3 h-3" />
                            <span>
                              Diet: {version.changes.diet_changed.from} →{" "}
                              {version.changes.diet_changed.to}
                            </span>
                          </div>
                        )}

                        {/* Macros changes */}
                        {version.changes.macros_changed &&
                          Object.entries(version.changes.macros_changed).map(
                            ([field, change]) => (
                              <div
                                key={field}
                                className="flex items-center gap-2 text-blue-400"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>
                                  {field.replace("_g", "")}: {change.from || 0}g →{" "}
                                  {change.to || 0}g
                                </span>
                              </div>
                            )
                          )}

                        {/* Started items */}
                        {version.changes.started.map((item: RoutineSnapshotItem) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-emerald-400"
                          >
                            <Plus className="w-3 h-3" />
                            {getSourceIcon(item.source)}
                            <span>Started: {formatItem(item)}</span>
                          </div>
                        ))}

                        {/* Stopped items */}
                        {version.changes.stopped.map((item: RoutineSnapshotItem) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-red-400"
                          >
                            <Minus className="w-3 h-3" />
                            {getSourceIcon(item.source)}
                            <span>Stopped: {item.name}</span>
                          </div>
                        ))}

                        {/* Modified items */}
                        {version.changes.modified.map((mod) => (
                          <div
                            key={mod.item.id}
                            className="flex items-center gap-2 text-amber-400"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {getSourceIcon(mod.item.source)}
                            <span>
                              {mod.item.name}:{" "}
                              {mod.changes
                                .map(
                                  (c) =>
                                    `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`
                                )
                                .join(", ")}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Reason */}
                      {version.reason && (
                        <div className="mt-3 pt-3 border-t flex items-start gap-2 text-sm text-muted-foreground">
                          <MessageSquare className="w-4 h-4 mt-0.5" />
                          <p className="italic">"{version.reason}"</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No routine versions saved</h3>
          <p className="text-muted-foreground">
            When you save changes to your routine from the Schedule page, they'll appear here.
          </p>
        </div>
      )}
    </div>
  );
}
