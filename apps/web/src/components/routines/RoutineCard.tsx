"use client";

import { useState } from "react";
import { Routine, RoutineItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, ChevronDown, ChevronUp, MoreVertical, Edit, Trash2 } from "lucide-react";

interface RoutineCardProps {
  routine: Routine;
  onEdit?: (routine: Routine) => void;
  onDelete?: (routine: Routine) => void;
}

export function RoutineCard({ routine, onEdit, onDelete }: RoutineCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const toggleItemComplete = (itemId: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedItems(newCompleted);
  };

  const items = routine.items || [];
  const completedCount = items.filter((item) => completedItems.has(item.id)).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const getTimeLabel = (time?: string) => {
    if (!time) return null;
    const labels: Record<string, string> = {
      morning: "Morning",
      afternoon: "Afternoon",
      evening: "Evening",
      night: "Night",
    };
    return labels[time] || time;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{routine.name}</CardTitle>
            {routine.time_of_day && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getTimeLabel(routine.time_of_day)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {completedCount}/{items.length}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit?.(routine)}>
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </CardHeader>

      {expanded && items.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {items
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <RoutineItemRow
                  key={item.id}
                  item={item}
                  completed={completedItems.has(item.id)}
                  onToggle={() => toggleItemComplete(item.id)}
                />
              ))}
          </div>
        </CardContent>
      )}

      {expanded && items.length === 0 && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground text-center py-4">
            No items in this routine yet
          </p>
        </CardContent>
      )}
    </Card>
  );
}

interface RoutineItemRowProps {
  item: RoutineItem;
  completed: boolean;
  onToggle: () => void;
}

function RoutineItemRow({ item, completed, onToggle }: RoutineItemRowProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        completed ? "bg-primary/5" : "bg-secondary/50 hover:bg-secondary"
      }`}
    >
      <Checkbox checked={completed} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>
          {item.title}
        </p>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-1">
          {item.time && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.time}
            </span>
          )}
          {item.duration && (
            <span className="text-xs text-muted-foreground">{item.duration}</span>
          )}
          {item.linked_supplement && (
            <Badge variant="secondary" className="text-xs">
              {item.linked_supplement}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
