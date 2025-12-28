"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateGoal } from "@/hooks/useGoals";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const CATEGORIES = [
  "fitness",
  "nutrition",
  "sleep",
  "stress",
  "biomarker",
  "supplement",
  "other",
];

const DIRECTIONS = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "maintain", label: "Maintain" },
];

export default function AddGoalPage() {
  const router = useRouter();
  const createGoal = useCreateGoal();
  const { data: biomarkers } = useBiomarkers();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    target_biomarker: "",
    current_value: undefined as number | undefined,
    target_value: undefined as number | undefined,
    direction: "increase" as "increase" | "decrease" | "maintain",
    priority: 1,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGoal.mutateAsync({
        ...formData,
        status: "active",
      });
      router.push("/goals");
    } catch (error) {
      console.error("Failed to create goal:", error);
    }
  };

  // Get unique biomarker names for dropdown
  const biomarkerNames = [...new Set(biomarkers?.map((b) => b.name) || [])];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/goals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Goal</h1>
          <p className="text-muted-foreground">Create a new health goal</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Optimize Vitamin D levels"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (1-5)</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  max={5}
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_biomarker">Target Biomarker (optional)</Label>
              <Select
                value={formData.target_biomarker}
                onValueChange={(value) => setFormData({ ...formData, target_biomarker: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a biomarker to track" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {biomarkerNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_value">Current Value</Label>
                <Input
                  id="current_value"
                  type="number"
                  step="any"
                  value={formData.current_value ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      current_value: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_value">Target Value</Label>
                <Input
                  id="target_value"
                  type="number"
                  step="any"
                  value={formData.target_value ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_value: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(value: "increase" | "decrease" | "maintain") =>
                    setFormData({ ...formData, direction: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((dir) => (
                      <SelectItem key={dir.value} value={dir.value}>
                        {dir.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this goal..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/goals">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createGoal.isPending}>
                {createGoal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Goal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
