"use client";

import { useState } from "react";
import { useChangeLog } from "@/hooks/useChangeLog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  History,
  Plus,
  Minus,
  Edit3,
  Activity,
  Pill,
  Target,
  Clock,
  ArrowRight,
} from "lucide-react";

const CHANGE_TYPES = [
  { value: "all", label: "All" },
  { value: "started", label: "Started" },
  { value: "stopped", label: "Stopped" },
  { value: "modified", label: "Modified" },
];

const ITEM_TYPES = [
  { value: "all", label: "All" },
  { value: "supplement", label: "Supplements" },
  { value: "biomarker", label: "Biomarkers" },
  { value: "goal", label: "Goals" },
  { value: "routine", label: "Routines" },
];

export default function ChangeLogPage() {
  const [changeTypeFilter, setChangeTypeFilter] = useState("all");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");

  const { data: entries, isLoading, error } = useChangeLog({
    change_type: changeTypeFilter === "all" ? undefined : changeTypeFilter,
    item_type: itemTypeFilter === "all" ? undefined : itemTypeFilter,
  });

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "started":
        return <Plus className="w-4 h-4 text-green-500" />;
      case "stopped":
        return <Minus className="w-4 h-4 text-red-500" />;
      case "modified":
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getItemIcon = (itemType?: string) => {
    switch (itemType) {
      case "supplement":
        return <Pill className="w-4 h-4" />;
      case "biomarker":
        return <Activity className="w-4 h-4" />;
      case "goal":
        return <Target className="w-4 h-4" />;
      case "routine":
        return <Clock className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getChangeBadgeColor = (changeType: string) => {
    switch (changeType) {
      case "started":
        return "bg-green-500/10 text-green-500";
      case "stopped":
        return "bg-red-500/10 text-red-500";
      case "modified":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6" />
          Change Log
        </h1>
        <p className="text-muted-foreground">
          Track all changes to your health protocol
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Change Type</p>
          <div className="flex flex-wrap gap-2">
            {CHANGE_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={changeTypeFilter === type.value ? "default" : "secondary"}
                size="sm"
                onClick={() => setChangeTypeFilter(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Item Type</p>
          <div className="flex flex-wrap gap-2">
            {ITEM_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={itemTypeFilter === type.value ? "default" : "secondary"}
                size="sm"
                onClick={() => setItemTypeFilter(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load change log</p>
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-card border rounded-full">
                  {getChangeIcon(entry.change_type)}
                </div>

                {/* Content */}
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getItemIcon(entry.item_type)}
                        <span className="font-medium">{entry.item_name}</span>
                        {entry.item_type && (
                          <Badge variant="outline" className="text-xs">
                            {entry.item_type}
                          </Badge>
                        )}
                      </div>
                      <Badge className={`${getChangeBadgeColor(entry.change_type)} border-0`}>
                        {entry.change_type.charAt(0).toUpperCase() + entry.change_type.slice(1)}
                      </Badge>
                    </div>

                    {(entry.previous_value || entry.new_value) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        {entry.previous_value && (
                          <span className="line-through">{entry.previous_value}</span>
                        )}
                        {entry.previous_value && entry.new_value && (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        {entry.new_value && (
                          <span className="text-foreground">{entry.new_value}</span>
                        )}
                      </div>
                    )}

                    {entry.reason && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Reason: {entry.reason}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.date)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No changes recorded</h3>
          <p className="text-muted-foreground">
            Changes to your supplements, biomarkers, and goals will appear here
          </p>
        </div>
      )}
    </div>
  );
}
