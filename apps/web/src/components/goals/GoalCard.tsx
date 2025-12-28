"use client";

import { Goal } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { calculateGoalProgress } from "@/hooks/useGoals";
import { Target, TrendingUp, TrendingDown, Minus, CheckCircle, PauseCircle, PlayCircle } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
  onClick?: (goal: Goal) => void;
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
  const progress = calculateGoalProgress(goal);

  const getDirectionIcon = () => {
    switch (goal.direction) {
      case "increase":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "decrease":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusIcon = () => {
    switch (goal.status) {
      case "achieved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "paused":
        return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (goal.status) {
      case "achieved":
        return "success";
      case "paused":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Card
      className={`cursor-pointer hover:border-primary/50 transition-colors ${
        goal.status === "paused" ? "opacity-60" : ""
      }`}
      onClick={() => onClick?.(goal)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{goal.title}</h3>
              {goal.category && (
                <p className="text-sm text-muted-foreground">{goal.category}</p>
              )}
            </div>
          </div>
          <Badge variant={getStatusColor() as any} className="flex items-center gap-1">
            {getStatusIcon()}
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </Badge>
        </div>

        {goal.target_biomarker && (
          <div className="mb-3">
            <p className="text-sm text-muted-foreground mb-1">Target Biomarker</p>
            <p className="font-medium flex items-center gap-2">
              {goal.target_biomarker}
              {getDirectionIcon()}
            </p>
          </div>
        )}

        {goal.current_value !== undefined && goal.target_value !== undefined && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {goal.current_value} / {goal.target_value}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {goal.interventions && goal.interventions.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Interventions</p>
            <div className="flex flex-wrap gap-1">
              {goal.interventions.slice(0, 3).map((intervention) => (
                <Badge key={intervention.id} variant="secondary" className="text-xs">
                  {intervention.intervention}
                </Badge>
              ))}
              {goal.interventions.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{goal.interventions.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {goal.notes && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {goal.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
