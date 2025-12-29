"use client";

import { useState } from "react";
import { useGoals } from "@/hooks/useGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Goal } from "@/types";
import { Plus, Target } from "lucide-react";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "achieved", label: "Achieved" },
  { value: "paused", label: "Paused" },
];

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: goals, isLoading, error } = useGoals({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Sort by priority
  const sortedGoals = goals?.sort((a, b) => a.priority - b.priority);

  const handleGoalClick = (goal: Goal) => {
    // TODO: Open goal detail/edit modal
    console.log("Goal clicked:", goal);
  };

  // Calculate stats
  const stats = {
    total: goals?.length || 0,
    active: goals?.filter((g) => g.status === "active").length || 0,
    achieved: goals?.filter((g) => g.status === "achieved").length || 0,
    paused: goals?.filter((g) => g.status === "paused").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Track your health objectives</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Stats */}
      {goals && goals.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-secondary/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.achieved}</p>
            <p className="text-sm text-muted-foreground">Achieved</p>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.paused}</p>
            <p className="text-sm text-muted-foreground">Paused</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "secondary"}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load goals</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your connection and try again
          </p>
        </div>
      ) : sortedGoals && sortedGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onClick={handleGoalClick} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
          <p className="text-muted-foreground mb-4">
            Set your first health goal to start tracking your progress
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>
      )}
    </div>
  );
}
