"use client";

import { Supplement } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToggleSupplement } from "@/hooks/useSupplements";
import { Pill, Clock, DollarSign, ExternalLink, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Check which important fields are missing
function getMissingFields(supplement: Supplement): string[] {
  const missing: string[] = [];
  if (!supplement.brand) missing.push("brand");
  if (!supplement.price) missing.push("price");
  if (!supplement.dose_per_serving) missing.push("dose");
  if (!supplement.dose_unit) missing.push("unit");
  if (!supplement.category) missing.push("category");
  if (!supplement.timing) missing.push("timing");
  if (!supplement.servings_per_container) missing.push("servings");
  if (!supplement.intake_form) missing.push("form");
  return missing;
}

interface SupplementCardProps {
  supplement: Supplement;
  onEdit?: (supplement: Supplement) => void;
}

export function SupplementCard({ supplement, onEdit }: SupplementCardProps) {
  const toggleSupplement = useToggleSupplement();
  const missingFields = getMissingFields(supplement);

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
      wake_up: "Wake Up",
      am: "AM",
      lunch: "Lunch",
      pm: "PM",
      dinner: "Dinner",
    };
    return timingMap[timing] || timing;
  };

  // Format dosage string
  const formatDosage = () => {
    const parts: string[] = [];

    // Intake: "2 capsules"
    if (supplement.intake_form) {
      const qty = supplement.intake_quantity || 1;
      const form = supplement.intake_form;
      const plural = qty > 1 ? 's' : '';
      parts.push(`${qty} ${form}${plural}`);
    }

    // Dose: "(600mg)"
    if (supplement.dose_per_serving && supplement.dose_unit) {
      parts.push(`(${supplement.dose_per_serving}${supplement.dose_unit})`);
    }

    return parts.length > 0 ? parts.join(' ') : null;
  };

  const dosageText = formatDosage();
  const hasDosage = dosageText !== null;

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

        {/* Dosage - prominently displayed */}
        {hasDosage ? (
          <p className="text-lg font-semibold text-primary mb-2">
            {dosageText}
          </p>
        ) : (
          <p className="text-sm text-orange-500 mb-2 flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Add dosage info
          </p>
        )}

        {/* Category + Timing + Buy link row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
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

          {/* Buy link or Add link icon */}
          {supplement.purchase_url ? (
            <a
              href={supplement.purchase_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              Buy
            </a>
          ) : (
            <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
              <Plus className="w-3 h-3" />
              <ExternalLink className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Price per serving */}
        {supplement.price_per_serving != null && (
          <div className="text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${supplement.price_per_serving.toFixed(2)}/serving
            </span>
          </div>
        )}

        {/* Missing fields indicator */}
        {missingFields.length > 0 && (
          <div className="mt-2 pt-2 border-t border-muted-foreground/10">
            <div className="flex flex-wrap gap-1">
              {missingFields.slice(0, 4).map((field) => (
                <span
                  key={field}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400"
                >
                  +{field}
                </span>
              ))}
              {missingFields.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  +{missingFields.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
