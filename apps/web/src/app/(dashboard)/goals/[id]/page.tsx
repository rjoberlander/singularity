"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGoal, useUpdateGoal, useDeleteGoal, calculateGoalProgress } from "@/hooks/useGoals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Loader2,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GoalDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: goal, isLoading, error } = useGoal(id);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const handleStatusChange = async (newStatus: "active" | "achieved" | "paused") => {
    if (!goal) return;
    try {
      await updateGoal.mutateAsync({ id, data: { status: newStatus } });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await deleteGoal.mutateAsync(id);
      router.push("/goals");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "increase":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "decrease":
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[150px]" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Goal not found</h2>
        <Link href="/goals">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Goals
          </Button>
        </Link>
      </div>
    );
  }

  const progress = calculateGoalProgress(goal);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/goals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{goal.title}</h1>
            {goal.category && (
              <p className="text-muted-foreground">{goal.category}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/goals/${goal.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteGoal.isPending}
          >
            {deleteGoal.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Status Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge
                variant={
                  goal.status === "achieved"
                    ? "success"
                    : goal.status === "paused"
                    ? "warning"
                    : "default"
                }
              >
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </Badge>
            </div>
            <div className="flex gap-2">
              {goal.status !== "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("active")}
                  disabled={updateGoal.isPending}
                >
                  <PlayCircle className="w-4 h-4 mr-1" />
                  Activate
                </Button>
              )}
              {goal.status !== "achieved" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("achieved")}
                  disabled={updateGoal.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark Achieved
                </Button>
              )}
              {goal.status !== "paused" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("paused")}
                  disabled={updateGoal.isPending}
                >
                  <PauseCircle className="w-4 h-4 mr-1" />
                  Pause
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {(goal.current_value !== undefined || goal.target_value !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Progress
              {getDirectionIcon(goal.direction)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Current: {goal.current_value ?? "—"}</span>
                <span>Target: {goal.target_value ?? "—"}</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-center text-lg font-semibold">
                {Math.round(progress)}% Complete
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Target Biomarker */}
      {goal.target_biomarker && (
        <Card>
          <CardHeader>
            <CardTitle>Target Biomarker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{goal.target_biomarker}</Badge>
              <span className="text-muted-foreground flex items-center gap-1">
                {getDirectionIcon(goal.direction)}
                {goal.direction}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interventions */}
      {goal.interventions && goal.interventions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interventions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {goal.interventions.map((intervention) => (
                <li
                  key={intervention.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <span>{intervention.intervention}</span>
                  {intervention.type && (
                    <Badge variant="outline">{intervention.type}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {goal.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{goal.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Created: {formatDate(goal.created_at)}</span>
            <span>Updated: {formatDate(goal.updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
