"use client";

import { Equipment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToggleEquipment } from "@/hooks/useEquipment";
import {
  Cpu,
  Timer,
  Zap,
  Moon,
  Sparkles,
  Scissors,
  Heart,
  MoreHorizontal,
  ExternalLink,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  LucideIcon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// Helper to check if a value is empty
const isEmpty = (val: string | null | undefined): boolean => !val || val.trim() === '';

// Valid frequency options (must match form options)
const VALID_FREQUENCIES = ['daily', 'every_other_day', 'as_needed', 'custom'];

// Valid timing options (must match form options)
const VALID_TIMINGS = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed'];

// Valid categories
const VALID_CATEGORIES = ['lllt', 'microneedling', 'sleep', 'skincare', 'recovery', 'other'];

// Check which important fields are missing or invalid
function getMissingFields(equipment: Equipment): {
  schedule: boolean;
  details: boolean;
  protocol: boolean;
} {
  // Schedule: frequency + timing + duration (must be valid options, not just non-empty)
  const hasValidFrequency = !isEmpty(equipment.usage_frequency) &&
    VALID_FREQUENCIES.includes(equipment.usage_frequency?.toLowerCase() || '');
  const hasValidTiming = !isEmpty(equipment.usage_timing) &&
    VALID_TIMINGS.includes(equipment.usage_timing?.toLowerCase() || '');
  const hasDuration = !isEmpty(equipment.usage_duration);
  const schedule = !hasValidFrequency || !hasValidTiming || !hasDuration;

  // Details: brand, category (must be valid), purpose
  const hasValidCategory = !isEmpty(equipment.category) &&
    VALID_CATEGORIES.includes(equipment.category?.toLowerCase() || '');
  const details = isEmpty(equipment.brand) || !hasValidCategory || isEmpty(equipment.purpose);

  // Protocol: duration + usage_protocol
  const protocol = isEmpty(equipment.usage_duration) || isEmpty(equipment.usage_protocol);

  return { schedule, details, protocol };
}

// Category config with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  lllt: { icon: Zap, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  microneedling: { icon: Scissors, color: "text-red-400", bgColor: "bg-red-500/20" },
  sleep: { icon: Moon, color: "text-purple-400", bgColor: "bg-purple-500/20" },
  skincare: { icon: Sparkles, color: "text-pink-400", bgColor: "bg-pink-500/20" },
  recovery: { icon: Heart, color: "text-green-400", bgColor: "bg-green-500/20" },
  other: { icon: MoreHorizontal, color: "text-gray-400", bgColor: "bg-gray-500/20" },
};

// Timing config with icons, colors, and card background colors (matching supplements)
const TIMING_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string; cardBgColor: string }> = {
  wake_up: { icon: Sunrise, label: "Wake", color: "text-orange-400", cardBgColor: "rgba(251, 146, 60, 0.08)" },
  am: { icon: Sun, label: "AM", color: "text-yellow-400", cardBgColor: "rgba(250, 204, 21, 0.08)" },
  morning: { icon: Sun, label: "AM", color: "text-yellow-400", cardBgColor: "rgba(250, 204, 21, 0.08)" }, // legacy
  lunch: { icon: Utensils, label: "Lunch", color: "text-amber-500", cardBgColor: "rgba(245, 158, 11, 0.08)" },
  pm: { icon: Sunset, label: "PM", color: "text-orange-500", cardBgColor: "rgba(249, 115, 22, 0.08)" },
  afternoon: { icon: Sunset, label: "PM", color: "text-orange-500", cardBgColor: "rgba(249, 115, 22, 0.08)" }, // legacy
  dinner: { icon: Utensils, label: "Dinner", color: "text-purple-400", cardBgColor: "rgba(192, 132, 252, 0.08)" },
  before_bed: { icon: Moon, label: "Bed", color: "text-indigo-400", cardBgColor: "rgba(129, 140, 248, 0.08)" },
  evening: { icon: Moon, label: "Evening", color: "text-indigo-400", cardBgColor: "rgba(129, 140, 248, 0.08)" }, // legacy
  all_night: { icon: Moon, label: "All night", color: "text-indigo-400", cardBgColor: "rgba(129, 140, 248, 0.08)" },
};

// Frequency display mapping
const FREQUENCY_MAP: Record<string, string> = {
  daily: "Daily",
  every_other_day: "Every Other",
  twice_daily: "2x Daily",
  three_times_daily: "3x Daily",
  weekly: "Weekly",
  "2x_weekly": "2x Week",
  "3x_weekly": "3x Week",
  as_needed: "As Needed",
  custom: "Custom",
};

interface EquipmentCardProps {
  equipment: Equipment;
  isDuplicate?: boolean;
  onClick?: (equipment: Equipment) => void;
  onAIFill?: (equipment: Equipment) => void;
}

export function EquipmentCard({ equipment, isDuplicate, onClick, onAIFill }: EquipmentCardProps) {
  const toggleEquipment = useToggleEquipment();
  const missingFields = getMissingFields(equipment);
  const hasMissingFields = missingFields.schedule || missingFields.details || missingFields.protocol;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleEquipment.mutateAsync(equipment.id);
      toast.success(equipment.is_active ? "Equipment paused" : "Equipment resumed");
    } catch (error) {
      toast.error("Failed to update equipment");
    }
  };

  const handleAIFill = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAIFill?.(equipment);
  };

  // Get category config
  const categoryKey = equipment.category?.toLowerCase() || "other";
  const categoryConfig = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.other;
  const CategoryIcon = categoryConfig.icon;

  // Get timing config
  const timingKey = equipment.usage_timing?.toLowerCase().replace(/\s+/g, '_') || "";
  const timingConfig = TIMING_CONFIG[timingKey];

  // Parse duration to show clean minutes
  const parseDuration = (duration?: string): string | null => {
    if (!duration) return null;
    // Handle "all_night" or "all night"
    if (duration.toLowerCase().includes('all_night') || duration.toLowerCase().includes('all night')) {
      return "All night";
    }
    // Extract first number from ranges like "10-15 minutes" -> "10 min"
    const match = duration.match(/(\d+)/);
    if (match) {
      const mins = parseInt(match[1]);
      if (mins >= 60) {
        return `${Math.floor(mins / 60)}h`;
      }
      return `${mins} min`;
    }
    return duration;
  };

  const formattedDuration = parseDuration(equipment.usage_duration);
  const formattedFrequency = equipment.usage_frequency ? (FREQUENCY_MAP[equipment.usage_frequency] || equipment.usage_frequency) : null;

  // Get card background color from timing
  const cardBgColor = timingConfig?.cardBgColor || "transparent";
  const TimingIcon = timingConfig?.icon || Sun;

  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden ${
        !equipment.is_active ? "opacity-60" : ""
      } ${isDuplicate ? "border-amber-500/50" : ""}`}
      style={{ backgroundColor: cardBgColor }}
      onClick={() => onClick?.(equipment)}
    >
      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
              <CategoryIcon className={`w-5 h-5 ${categoryConfig.color}`} />
            </div>
            <div>
              <h3 className="font-semibold">{equipment.name}</h3>
              {(equipment.brand || equipment.model) && (
                <p className="text-sm text-muted-foreground">
                  {equipment.brand}{equipment.brand && equipment.model ? " " : ""}{equipment.model}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMissingFields && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <Switch
              checked={equipment.is_active}
              onClick={handleToggle}
              disabled={toggleEquipment.isPending}
            />
          </div>
        </div>

        {equipment.purpose && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{equipment.purpose}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {isDuplicate && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Duplicate
            </span>
          )}
          {/* Category badge with color */}
          {equipment.category && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md ${categoryConfig.bgColor} ${categoryConfig.color} border border-current/20`}>
              <CategoryIcon className="w-3 h-3" />
              {equipment.category.charAt(0).toUpperCase() + equipment.category.slice(1)}
            </span>
          )}
          {/* Frequency */}
          {formattedFrequency && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
              {formattedFrequency}
            </span>
          )}
          {/* Timing with colored icon - matching supplements style */}
          {timingConfig && (
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${timingConfig.color}`}>
              <TimingIcon className="w-4 h-4" />
              {timingConfig.label}
            </span>
          )}
          {/* Duration */}
          {formattedDuration && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
              <Timer className="w-3 h-3" />
              {formattedDuration}
            </span>
          )}
        </div>

        {equipment.contraindications && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 line-clamp-2">
            {equipment.contraindications}
          </p>
        )}

        {equipment.purchase_url && (
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            <a
              href={equipment.purchase_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-primary"
            >
              <ExternalLink className="w-3 h-3" />
              Buy
            </a>
          </div>
        )}

        {/* Missing fields indicator at bottom - like supplements */}
        {hasMissingFields && (
          <div className="mt-2 pt-2 border-t border-muted-foreground/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-yellow-500 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Missing:
              </span>
              {missingFields.schedule && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  Frequency & Timing
                </span>
              )}
              {missingFields.details && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  Product Info
                </span>
              )}
              {missingFields.protocol && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  Protocol
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Large timing icon as background watermark - like supplements */}
      {timingConfig && (
        <div className="absolute -bottom-4 -right-4 opacity-15 pointer-events-none">
          <TimingIcon className={`w-24 h-24 ${timingConfig.color}`} />
        </div>
      )}
    </Card>
  );
}
