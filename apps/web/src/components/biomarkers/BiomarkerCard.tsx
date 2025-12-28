"use client";

import Link from "next/link";
import { formatDate, getStatusColor, getStatusBgColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Biomarker } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BiomarkerCardProps {
  biomarker: Biomarker;
}

export function BiomarkerCard({ biomarker }: BiomarkerCardProps) {
  const status = biomarker.status || "normal";

  const statusLabels: Record<string, string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    optimal: "Optimal",
  };

  const getVariant = (status: string) => {
    switch (status) {
      case "low":
        return "error";
      case "high":
        return "warning";
      case "optimal":
        return "success";
      default:
        return "success";
    }
  };

  return (
    <Link href={`/biomarkers/${biomarker.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{biomarker.name}</h3>
              {biomarker.category && (
                <p className="text-sm text-muted-foreground">{biomarker.category}</p>
              )}
            </div>
            <Badge variant={getVariant(status) as any}>
              {statusLabels[status]}
            </Badge>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold">{biomarker.value}</span>
            <span className="text-muted-foreground">{biomarker.unit}</span>
          </div>

          {(biomarker.reference_range_low !== undefined ||
            biomarker.reference_range_high !== undefined) && (
            <p className="text-sm text-muted-foreground mb-2">
              Reference: {biomarker.reference_range_low ?? "?"} -{" "}
              {biomarker.reference_range_high ?? "?"}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {formatDate(biomarker.date_tested)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
