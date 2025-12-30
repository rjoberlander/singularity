"use client";

import { useState } from "react";
import { useGoals, useCreateGoal } from "@/hooks/useGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm } from "@/components/goals/GoalForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Goal } from "@/types";
import { Plus, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

const GOAL_CATEGORIES = [
  { value: "biomarker", label: "Biomarker Target" },
  { value: "weight", label: "Weight / Body Composition" },
  { value: "fitness", label: "Fitness / Exercise" },
  { value: "nutrition", label: "Nutrition" },
  { value: "sleep", label: "Sleep" },
  { value: "mental", label: "Mental Health" },
  { value: "habit", label: "Habit Formation" },
  { value: "other", label: "Other" },
];

const DIRECTION_OPTIONS = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "maintain", label: "Maintain" },
];

function InlineGoalForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [direction, setDirection] = useState<"increase" | "decrease" | "maintain">("increase");
  const [targetValue, setTargetValue] = useState("");
  const [notes, setNotes] = useState("");

  const createGoal = useCreateGoal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    try {
      await createGoal.mutateAsync({
        title: title.trim(),
        category: category || undefined,
        direction,
        target_value: targetValue ? parseFloat(targetValue) : undefined,
        notes: notes.trim() || undefined,
        status: "active",
        priority: 1,
      });
      toast.success("Goal created successfully");
      setTitle("");
      setCategory("");
      setDirection("increase");
      setTargetValue("");
      setNotes("");
      onSuccess();
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast.error("Failed to create goal");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inline-title">Goal Title *</Label>
        <Input
          id="inline-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Reduce LDL cholesterol to 100"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="inline-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {GOAL_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inline-direction">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select direction" />
            </SelectTrigger>
            <SelectContent>
              {DIRECTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inline-target">Target Value (optional)</Label>
        <Input
          id="inline-target"
          type="number"
          step="any"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder="e.g., 100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inline-notes">Notes (optional)</Label>
        <Textarea
          id="inline-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={createGoal.isPending || !title.trim()}>
        {createGoal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Create Goal
      </Button>
    </form>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "achieved", label: "Achieved" },
  { value: "paused", label: "Paused" },
];

export default function GoalsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading, error } = useGoals({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Sort by priority
  const sortedGoals = goals?.sort((a, b) => a.priority - b.priority);

  const handleGoalClick = (goal: Goal) => {
    setEditingGoal(goal);
    setFormOpen(true);
  };

  const handleAddGoal = () => {
    setEditingGoal(null);
    setFormOpen(true);
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
        <Button onClick={handleAddGoal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Stats */}
      {goals && goals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="flex flex-wrap gap-2">
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
        <div className="max-w-lg mx-auto py-8">
          <div className="text-center mb-6">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground">
              Set your first health goal to start tracking your progress
            </p>
          </div>

          {/* Inline Goal Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Your First Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineGoalForm onSuccess={() => {}} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goal Form Modal */}
      <GoalForm
        goal={editingGoal}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
