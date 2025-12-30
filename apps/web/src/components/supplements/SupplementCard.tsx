"use client";

import { Supplement } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToggleSupplement } from "@/hooks/useSupplements";
import { Pill, Clock, DollarSign, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SupplementCardProps {
  supplement: Supplement;
  onEdit?: (supplement: Supplement) => void;
}

export function SupplementCard({ supplement, onEdit }: SupplementCardProps) {
  const toggleSupplement = useToggleSupplement();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleSupplement.mutateAsync(supplement.id);
      toast.success(supplement.is_active ? "Supplement paused" : "Supplement resumed");
    } catch (error) {
      toast.error("Failed to update supplement");
    }
  };

  const formatTiming = (timing?: string) => {
    if (!timing) return null;
    const timingMap: Record<string, string> = {
      morning: "Morning",
      afternoon: "Afternoon",
      evening: "Evening",
      with_meals: "With Meals",
      empty_stomach: "Empty Stomach",
      before_bed: "Before Bed",
    };
    return timingMap[timing] || timing;
  };

  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 ${
        !supplement.is_active ? "opacity-60" : ""
      }`}
      onClick={() => onEdit?.(supplement)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{supplement.name}</h3>
              {supplement.brand && (
                <p className="text-sm text-muted-foreground">{supplement.brand}</p>
              )}
            </div>
          </div>
          <Switch
            checked={supplement.is_active}
            onClick={handleToggle}
            disabled={toggleSupplement.isPending}
          />
        </div>

        {supplement.intake_form && (
          <p className="text-lg font-medium mb-2">
            {supplement.intake_quantity || 1} {supplement.intake_form}{(supplement.intake_quantity || 1) > 1 ? 's' : ''}
            {supplement.dose_per_serving && supplement.dose_unit && (
              <span className="text-sm text-muted-foreground ml-2">
                ({supplement.dose_per_serving} {supplement.dose_unit})
              </span>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {supplement.category && (
            <Badge variant="secondary">{supplement.category}</Badge>
          )}
          {supplement.timing && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTiming(supplement.timing)}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {supplement.price_per_serving != null && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${supplement.price_per_serving.toFixed(2)}/serving
            </span>
          )}
          {supplement.purchase_url && (
            <a
              href={supplement.purchase_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-primary"
            >
              <ExternalLink className="w-3 h-3" />
              Buy
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
