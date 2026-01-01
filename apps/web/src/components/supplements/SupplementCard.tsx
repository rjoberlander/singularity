"use client";

import { Supplement } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToggleSupplement } from "@/hooks/useSupplements";
import { Pill, DollarSign, ExternalLink, AlertTriangle, Atom, Leaf, Bug, MoreHorizontal, LucideIcon, Calendar, Package, Sunrise, Sun, Utensils, Sunset, Moon, FlaskConical, Droplet, Wind, Candy, Square } from "lucide-react";
import { toast } from "sonner";

// Category icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "vitamin_mineral": Pill,
  "amino_protein": Atom,
  "herb_botanical": Leaf,
  "probiotic": Bug,
  "other": MoreHorizontal,
  // Legacy categories fallback
  "vitamin": Pill,
  "mineral": Pill,
  "amino_acid": Atom,
  "herb": Leaf,
  "omega": MoreHorizontal,
  "antioxidant": MoreHorizontal,
  "hormone": MoreHorizontal,
  "enzyme": MoreHorizontal,
};

// Category colors for icon backgrounds
const CATEGORY_COLORS: Record<string, string> = {
  "vitamin_mineral": "rgba(234, 179, 8, 0.15)",
  "amino_protein": "rgba(139, 92, 246, 0.15)",
  "herb_botanical": "rgba(34, 197, 94, 0.15)",
  "probiotic": "rgba(236, 72, 153, 0.15)",
  "other": "rgba(107, 114, 128, 0.15)",
  // Legacy categories fallback
  "vitamin": "rgba(234, 179, 8, 0.15)",
  "mineral": "rgba(234, 179, 8, 0.15)",
  "amino_acid": "rgba(139, 92, 246, 0.15)",
  "herb": "rgba(34, 197, 94, 0.15)",
  "omega": "rgba(107, 114, 128, 0.15)",
  "antioxidant": "rgba(107, 114, 128, 0.15)",
  "hormone": "rgba(107, 114, 128, 0.15)",
  "enzyme": "rgba(107, 114, 128, 0.15)",
};

// Category icon stroke colors
const CATEGORY_ICON_COLORS: Record<string, string> = {
  "vitamin_mineral": "rgb(234, 179, 8)",
  "amino_protein": "rgb(139, 92, 246)",
  "herb_botanical": "rgb(34, 197, 94)",
  "probiotic": "rgb(236, 72, 153)",
  "other": "rgb(107, 114, 128)",
  // Legacy categories fallback
  "vitamin": "rgb(234, 179, 8)",
  "mineral": "rgb(234, 179, 8)",
  "amino_acid": "rgb(139, 92, 246)",
  "herb": "rgb(34, 197, 94)",
  "omega": "rgb(107, 114, 128)",
  "antioxidant": "rgb(107, 114, 128)",
  "hormone": "rgb(107, 114, 128)",
  "enzyme": "rgb(107, 114, 128)",
};

// Timing icons, colors, and card background colors
const TIMING_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string; bgColor: string; iconBg: string }> = {
  wake_up: { icon: Sunrise, color: "text-orange-400", label: "Wake", bgColor: "rgba(251, 146, 60, 0.08)", iconBg: "rgba(251, 146, 60, 0.15)" },
  morning: { icon: Sunrise, color: "text-orange-400", label: "Morning", bgColor: "rgba(251, 146, 60, 0.08)", iconBg: "rgba(251, 146, 60, 0.15)" },
  am: { icon: Sun, color: "text-yellow-400", label: "AM", bgColor: "rgba(250, 204, 21, 0.08)", iconBg: "rgba(250, 204, 21, 0.15)" },
  lunch: { icon: Utensils, color: "text-amber-500", label: "Lunch", bgColor: "rgba(245, 158, 11, 0.08)", iconBg: "rgba(245, 158, 11, 0.15)" },
  with_meals: { icon: Utensils, color: "text-amber-500", label: "With Meals", bgColor: "rgba(245, 158, 11, 0.08)", iconBg: "rgba(245, 158, 11, 0.15)" },
  afternoon: { icon: Sun, color: "text-amber-400", label: "Afternoon", bgColor: "rgba(251, 191, 36, 0.08)", iconBg: "rgba(251, 191, 36, 0.15)" },
  pm: { icon: Sunset, color: "text-orange-500", label: "PM", bgColor: "rgba(249, 115, 22, 0.08)", iconBg: "rgba(249, 115, 22, 0.15)" },
  evening: { icon: Sunset, color: "text-orange-500", label: "Evening", bgColor: "rgba(249, 115, 22, 0.08)", iconBg: "rgba(249, 115, 22, 0.15)" },
  dinner: { icon: Utensils, color: "text-purple-400", label: "Dinner", bgColor: "rgba(192, 132, 252, 0.08)", iconBg: "rgba(192, 132, 252, 0.15)" },
  before_bed: { icon: Moon, color: "text-indigo-400", label: "Before Bed", bgColor: "rgba(129, 140, 248, 0.08)", iconBg: "rgba(129, 140, 248, 0.15)" },
  bed: { icon: Moon, color: "text-violet-400", label: "Bed", bgColor: "rgba(139, 92, 246, 0.08)", iconBg: "rgba(139, 92, 246, 0.15)" },
  empty_stomach: { icon: Pill, color: "text-gray-400", label: "Empty Stomach", bgColor: "rgba(156, 163, 175, 0.08)", iconBg: "rgba(156, 163, 175, 0.15)" },
};

// Intake form icons and colors
const INTAKE_FORM_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  capsule: { icon: Pill, color: "text-blue-400" },
  powder: { icon: FlaskConical, color: "text-amber-400" },
  liquid: { icon: Droplet, color: "text-cyan-400" },
  spray: { icon: Wind, color: "text-teal-400" },
  gummy: { icon: Candy, color: "text-pink-400" },
  patch: { icon: Square, color: "text-purple-400" },
  tablet: { icon: Pill, color: "text-blue-400" },
  softgel: { icon: Pill, color: "text-blue-400" },
};

// Check which important fields are missing, grouped by category
function getMissingFieldsGrouped(supplement: Supplement): {
  frequencyTiming: boolean;
  productInfo: boolean;
  productUrl: boolean;
  inaccurateCost: boolean;
} {
  // Check frequency & timing
  const hasTimings = (supplement.timings && supplement.timings.length > 0) || supplement.timing;
  const frequencyTiming = !supplement.frequency || !hasTimings;

  // Check product info (AI can fill these)
  const productInfo = !supplement.brand || !supplement.price || !supplement.dose_per_serving ||
    !supplement.dose_unit || !supplement.category || !supplement.servings_per_container || !supplement.intake_form;

  // Check product URL
  const productUrl = !supplement.purchase_url;

  // Check if cost calculation is inaccurate (missing price, servings, or dose)
  const inaccurateCost = supplement.is_active && (!supplement.price || !supplement.servings_per_container || !supplement.dose_per_serving);

  return { frequencyTiming, productInfo, productUrl, inaccurateCost };
}

interface SupplementCardProps {
  supplement: Supplement;
  onEdit?: (supplement: Supplement) => void;
}

export function SupplementCard({ supplement, onEdit }: SupplementCardProps) {
  const toggleSupplement = useToggleSupplement();
  const missingGroups = getMissingFieldsGrouped(supplement);
  const hasMissingFields = missingGroups.frequencyTiming || missingGroups.productInfo || missingGroups.productUrl || missingGroups.inaccurateCost;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleSupplement.mutateAsync(supplement.id);
      toast.success(supplement.is_active ? "Supplement paused" : "Supplement resumed");
    } catch (error) {
      toast.error("Failed to update supplement");
    }
  };

  const timingMap: Record<string, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    with_meals: "With Meals",
    empty_stomach: "Empty Stomach",
    before_bed: "Bed",
    wake_up: "Wake",
    am: "AM",
    lunch: "Lunch",
    pm: "PM",
    dinner: "Dinner",
  };

  const formatTiming = (timing?: string) => {
    if (!timing) return null;
    return timingMap[timing] || timing;
  };

  // Get raw timings from either timings array or legacy timing field
  const getRawTimings = (): string[] => {
    if (supplement.timings && supplement.timings.length > 0) {
      return supplement.timings;
    }
    if (supplement.timing) {
      return [supplement.timing];
    }
    return [];
  };

  // Get display timings from either timings array or legacy timing field
  const getDisplayTimings = (): string[] => {
    if (supplement.timings && supplement.timings.length > 0) {
      return supplement.timings.map(t => timingMap[t] || t);
    }
    if (supplement.timing) {
      return [formatTiming(supplement.timing) || supplement.timing];
    }
    return [];
  };

  const displayTimings = getDisplayTimings();

  // Calculate daily servings used based on intake quantity, timings, and frequency
  const calculateDailyServings = (): number | null => {
    const intakeQty = supplement.intake_quantity || 1;
    const timingsCount = supplement.timings?.length || (supplement.timing ? 1 : 0);
    if (timingsCount === 0) return null;

    // Frequency multiplier
    let freqMultiplier = 1;
    if (supplement.frequency === "every_other_day") freqMultiplier = 0.5;
    else if (supplement.frequency === "as_needed") freqMultiplier = 0.5; // estimate

    return intakeQty * timingsCount * freqMultiplier;
  };

  const dailyServings = calculateDailyServings();

  // Calculate cost per month
  const calculateMonthlyCost = (): number | null => {
    if (!supplement.price || !supplement.servings_per_container || !dailyServings) return null;
    const costPerServing = supplement.price / supplement.servings_per_container;
    return costPerServing * dailyServings * 30;
  };

  const monthlyCost = calculateMonthlyCost();

  // Calculate how long the bottle lasts
  const calculateBottleDuration = (): { value: number; unit: string } | null => {
    if (!supplement.servings_per_container || !dailyServings) return null;
    const days = supplement.servings_per_container / dailyServings;
    if (days >= 60) {
      return { value: Math.round(days / 30), unit: "months" };
    } else if (days >= 14) {
      return { value: Math.round(days / 7), unit: "weeks" };
    }
    return { value: Math.round(days), unit: "days" };
  };

  const bottleDuration = calculateBottleDuration();

  // Format frequency display
  const formatFrequency = (): string | null => {
    if (!supplement.frequency) return null;
    const freqMap: Record<string, string> = {
      daily: "Daily",
      every_other_day: "Every other day",
      as_needed: "As needed",
    };
    return freqMap[supplement.frequency] || supplement.frequency;
  };

  // Format intake display (e.g., "2 capsules" or quantity with unknown form)
  const formatIntake = (): { text: string; hasUnknownForm: boolean } | null => {
    // First try intake_form (e.g., "2 capsules")
    if (supplement.intake_form) {
      const qty = supplement.intake_quantity || 1;
      const form = supplement.intake_form;
      const plural = qty > 1 ? "s" : "";
      return { text: `${qty} ${form}${plural}`, hasUnknownForm: false };
    }
    // Fall back to quantity with unknown form indicator
    if (supplement.intake_quantity) {
      return { text: `${supplement.intake_quantity}`, hasUnknownForm: true };
    }
    return null;
  };

  // Get category-specific icon and colors
  const category = supplement.category || "other";
  const IconComponent = CATEGORY_ICONS[category] || Pill;
  const iconBgColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const iconColor = CATEGORY_ICON_COLORS[category] || CATEGORY_ICON_COLORS.other;

  // Get primary timing for card background and large icon
  const rawTimings = getRawTimings();
  const primaryTiming = rawTimings[0];
  const primaryTimingConfig = primaryTiming ? TIMING_CONFIG[primaryTiming] : null;
  const PrimaryTimingIcon = primaryTimingConfig?.icon || Sun;
  const cardBgColor = primaryTimingConfig?.bgColor || "transparent";
  const timingIconBg = primaryTimingConfig?.iconBg || "rgba(156, 163, 175, 0.1)";
  const timingIconColor = primaryTimingConfig?.color || "text-muted-foreground";

  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden ${
        !supplement.is_active ? "opacity-60" : ""
      }`}
      style={{ backgroundColor: cardBgColor }}
      onClick={() => onEdit?.(supplement)}
    >
      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: iconBgColor }}>
              <IconComponent className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <div>
              <h3 className="font-semibold">{supplement.name}</h3>
              <div className="flex items-center gap-2">
                {supplement.brand && (
                  <span className="text-sm text-muted-foreground">{supplement.brand}</span>
                )}
                {supplement.purchase_url && (
                  <a
                    href={supplement.purchase_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buy
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMissingFields && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <Switch
              checked={supplement.is_active}
              onClick={handleToggle}
              disabled={toggleSupplement.isPending}
            />
          </div>
        </div>

        {/* Schedule: Quantity, Timing, Frequency - 3 equal columns */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Quantity */}
          {(() => {
            const formConfig = supplement.intake_form ? INTAKE_FORM_CONFIG[supplement.intake_form] : null;
            const FormIcon = formConfig?.icon || Pill;
            const formColor = formConfig?.color || "text-muted-foreground";
            const intake = formatIntake();
            return (
              <div className="flex items-center gap-1.5">
                <FormIcon className={`w-4 h-4 shrink-0 ${formColor}`} />
                {intake ? (
                  <span className="text-sm font-medium truncate">
                    {intake.text}
                    {intake.hasUnknownForm && <span className="text-blue-400 ml-1">?</span>}
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">Missing</span>
                )}
              </div>
            );
          })()}
          {/* Timing */}
          <div className="flex items-center gap-1">
            {getRawTimings().length > 0 ? (
              getRawTimings().map((timing, idx) => {
                const config = TIMING_CONFIG[timing] || { icon: Sun, color: "text-muted-foreground", label: timing };
                const TimingIcon = config.icon;
                return (
                  <span key={timing} className={`flex items-center gap-1 ${config.color}`}>
                    <TimingIcon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{config.label}</span>
                    {idx < getRawTimings().length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                  </span>
                );
              })
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">Missing</span>
            )}
          </div>
          {/* Frequency */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            {formatFrequency() ? (
              <span className="text-sm font-medium truncate">{formatFrequency()}</span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">Missing</span>
            )}
          </div>
        </div>

        {/* Cost per month + Bottle duration */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {monthlyCost != null && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              ${monthlyCost.toFixed(2)}/mo
            </span>
          )}
          {bottleDuration && (
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {bottleDuration.value} {bottleDuration.unit}
            </span>
          )}
        </div>

        {/* Missing fields indicator - grouped by category */}
        {hasMissingFields && (
          <div className="mt-2 pt-2 border-t border-muted-foreground/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-yellow-500 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Missing:
              </span>
              {missingGroups.frequencyTiming && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  Frequency & Timing
                </span>
              )}
              {missingGroups.productInfo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  Product Info
                </span>
              )}
              {missingGroups.productUrl && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  Product URL
                </span>
              )}
              {missingGroups.inaccurateCost && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                  Inaccurate Cost
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Large timing icon as background watermark - partially cut off */}
      {primaryTiming && (
        <div className="absolute -bottom-4 -right-4 opacity-15 pointer-events-none">
          <PrimaryTimingIcon className={`w-24 h-24 ${timingIconColor}`} />
        </div>
      )}
    </Card>
  );
}
