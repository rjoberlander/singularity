"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBiomarker, useUpdateBiomarker, useDeleteBiomarker } from "@/hooks/useBiomarkers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

const CATEGORIES = [
  "blood",
  "metabolic",
  "hormone",
  "vitamin",
  "mineral",
  "lipid",
  "thyroid",
  "liver",
  "kidney",
  "other",
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditBiomarkerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: biomarker, isLoading } = useBiomarker(id);
  const updateBiomarker = useUpdateBiomarker();
  const deleteBiomarker = useDeleteBiomarker();

  const [formData, setFormData] = useState({
    name: "",
    value: 0,
    unit: "",
    date_tested: "",
    category: "",
    reference_range_low: undefined as number | undefined,
    reference_range_high: undefined as number | undefined,
    optimal_range_low: undefined as number | undefined,
    optimal_range_high: undefined as number | undefined,
    notes: "",
    lab_source: "",
  });

  useEffect(() => {
    if (biomarker) {
      setFormData({
        name: biomarker.name,
        value: biomarker.value,
        unit: biomarker.unit,
        date_tested: biomarker.date_tested.split("T")[0],
        category: biomarker.category || "",
        reference_range_low: biomarker.reference_range_low,
        reference_range_high: biomarker.reference_range_high,
        optimal_range_low: biomarker.optimal_range_low,
        optimal_range_high: biomarker.optimal_range_high,
        notes: biomarker.notes || "",
        lab_source: biomarker.lab_source || "",
      });
    }
  }, [biomarker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBiomarker.mutateAsync({ id, data: formData });
      router.push(`/biomarkers/${id}`);
    } catch (error) {
      console.error("Failed to update:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this biomarker?")) return;
    try {
      await deleteBiomarker.mutateAsync(id);
      router.push("/biomarkers");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (!biomarker) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Biomarker not found</p>
        <Link href="/biomarkers">
          <Button className="mt-4">Back to Biomarkers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/biomarkers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Biomarker</h1>
          <p className="text-muted-foreground">{biomarker.name}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Biomarker Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="any"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date Tested</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date_tested}
                  onChange={(e) => setFormData({ ...formData, date_tested: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref_low">Reference Range Low</Label>
                <Input
                  id="ref_low"
                  type="number"
                  step="any"
                  value={formData.reference_range_low ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reference_range_low: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref_high">Reference Range High</Label>
                <Input
                  id="ref_high"
                  type="number"
                  step="any"
                  value={formData.reference_range_high ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reference_range_high: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opt_low">Optimal Range Low</Label>
                <Input
                  id="opt_low"
                  type="number"
                  step="any"
                  value={formData.optimal_range_low ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      optimal_range_low: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opt_high">Optimal Range High</Label>
                <Input
                  id="opt_high"
                  type="number"
                  step="any"
                  value={formData.optimal_range_high ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      optimal_range_high: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab_source">Lab Source</Label>
              <Input
                id="lab_source"
                value={formData.lab_source}
                onChange={(e) => setFormData({ ...formData, lab_source: e.target.value })}
                placeholder="e.g., Quest Diagnostics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteBiomarker.isPending}
              >
                {deleteBiomarker.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
              <div className="flex gap-2">
                <Link href={`/biomarkers/${id}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={updateBiomarker.isPending}>
                  {updateBiomarker.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
