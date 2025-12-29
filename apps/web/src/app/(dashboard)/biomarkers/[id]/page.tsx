"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBiomarker, useBiomarkerHistory, useDeleteBiomarker } from "@/hooks/useBiomarkers";
import { BiomarkerChart } from "@/components/biomarkers/BiomarkerChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit, Trash2, Activity, Calendar, Beaker, Target, Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BiomarkerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: biomarker, isLoading, error } = useBiomarker(id);
  const { data: history } = useBiomarkerHistory(biomarker?.name || "");
  const deleteBiomarker = useDeleteBiomarker();

  const handleDelete = async () => {
    if (!biomarker) return;
    if (!confirm(`Are you sure you want to delete "${biomarker.name}"?`)) return;

    try {
      await deleteBiomarker.mutateAsync(biomarker.id);
      router.push("/biomarkers");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "low":
        return "text-red-500";
      case "high":
        return "text-yellow-500";
      case "optimal":
        return "text-green-500";
      default:
        return "text-green-500";
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case "low":
        return "bg-red-500/10";
      case "high":
        return "bg-yellow-500/10";
      case "optimal":
        return "bg-green-500/10";
      default:
        return "bg-green-500/10";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (error || !biomarker) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Biomarker not found</h2>
        <p className="text-muted-foreground mb-4">
          The biomarker you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/biomarkers">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Biomarkers
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/biomarkers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{biomarker.name}</h1>
            {biomarker.category && (
              <p className="text-muted-foreground">{biomarker.category}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-14 sm:ml-0">
          <Link href={`/biomarkers/${biomarker.id}/edit`}>
            <Button variant="outline" size="sm" className="sm:size-default">
              <Edit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            className="sm:size-default"
            onClick={handleDelete}
            disabled={deleteBiomarker.isPending}
          >
            {deleteBiomarker.isPending ? (
              <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Current Value Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Value</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold">{biomarker.value}</span>
                <span className="text-lg sm:text-xl text-muted-foreground">{biomarker.unit}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Tested on {formatDate(biomarker.date_tested)}
                </span>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:text-right">
              {biomarker.status && (
                <Badge
                  className={`${getStatusBgColor(biomarker.status)} ${getStatusColor(biomarker.status)} border-0`}
                >
                  {biomarker.status.charAt(0).toUpperCase() + biomarker.status.slice(1)}
                </Badge>
              )}
              {biomarker.ai_extracted && (
                <p className="text-xs text-muted-foreground">AI Extracted</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reference Ranges */}
      {(biomarker.reference_range_low !== undefined || biomarker.reference_range_high !== undefined ||
        biomarker.optimal_range_low !== undefined || biomarker.optimal_range_high !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(biomarker.reference_range_low !== undefined || biomarker.reference_range_high !== undefined) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Beaker className="w-4 h-4" />
                  Reference Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {biomarker.reference_range_low ?? "?"} - {biomarker.reference_range_high ?? "?"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{biomarker.unit}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {(biomarker.optimal_range_low !== undefined || biomarker.optimal_range_high !== undefined) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Optimal Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-500">
                  {biomarker.optimal_range_low ?? "?"} - {biomarker.optimal_range_high ?? "?"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{biomarker.unit}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Historical Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <BiomarkerChart
            data={history || [biomarker]}
            referenceRangeLow={biomarker.reference_range_low}
            referenceRangeHigh={biomarker.reference_range_high}
            optimalRangeLow={biomarker.optimal_range_low}
            optimalRangeHigh={biomarker.optimal_range_high}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {biomarker.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{biomarker.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Lab Source */}
      {biomarker.lab_source && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Source</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{biomarker.lab_source}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
