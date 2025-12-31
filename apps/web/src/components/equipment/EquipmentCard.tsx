"use client";

import { Equipment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToggleEquipment } from "@/hooks/useEquipment";
import { Cpu, Clock, Timer, Zap, Moon, Sparkles, Scissors, Heart, MoreHorizontal, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  lllt: Zap,
  microneedling: Scissors,
  sleep: Moon,
  skincare: Sparkles,
  recovery: Heart,
  other: MoreHorizontal,
};

interface EquipmentCardProps {
  equipment: Equipment;
  isDuplicate?: boolean;
  onClick?: (equipment: Equipment) => void;
}

export function EquipmentCard({ equipment, isDuplicate, onClick }: EquipmentCardProps) {
  const toggleEquipment = useToggleEquipment();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleEquipment.mutateAsync(equipment.id);
      toast.success(equipment.is_active ? "Equipment paused" : "Equipment resumed");
    } catch (error) {
      toast.error("Failed to update equipment");
    }
  };

  const CategoryIcon = equipment.category
    ? CATEGORY_ICONS[equipment.category.toLowerCase()] || Cpu
    : Cpu;

  const formatTiming = (timing?: string) => {
    if (!timing) return null;
    const timingMap: Record<string, string> = {
      wake_up: "Wake Up",
      am: "Morning",
      lunch: "Lunch",
      pm: "Afternoon",
      dinner: "Dinner",
      before_bed: "Before Bed",
    };
    return timingMap[timing] || timing;
  };

  const formatFrequency = (freq?: string) => {
    if (!freq) return null;
    const freqMap: Record<string, string> = {
      daily: "Daily",
      twice_daily: "2x Daily",
      three_times_daily: "3x Daily",
      weekly: "Weekly",
      "2x_weekly": "2x Weekly",
      "3x_weekly": "3x Weekly",
      as_needed: "As Needed",
    };
    return freqMap[freq] || freq;
  };

  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 ${
        !equipment.is_active ? "opacity-60" : ""
      } ${isDuplicate ? "border-amber-500/50" : ""}`}
      onClick={() => onClick?.(equipment)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CategoryIcon className="w-5 h-5 text-primary" />
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
          <Switch
            checked={equipment.is_active}
            onClick={handleToggle}
            disabled={toggleEquipment.isPending}
          />
        </div>

        {equipment.purpose && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{equipment.purpose}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {isDuplicate && (
            <Badge className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
              Duplicate
            </Badge>
          )}
          {equipment.category && (
            <Badge variant="secondary">
              {equipment.category.charAt(0).toUpperCase() + equipment.category.slice(1)}
            </Badge>
          )}
          {equipment.usage_frequency && (
            <Badge variant="outline" className="flex items-center gap-1">
              {formatFrequency(equipment.usage_frequency)}
            </Badge>
          )}
          {equipment.usage_timing && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTiming(equipment.usage_timing)}
            </Badge>
          )}
          {equipment.usage_duration && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {equipment.usage_duration}
            </Badge>
          )}
        </div>

        {equipment.contraindications && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 line-clamp-2">
            {equipment.contraindications}
          </p>
        )}

        <div className="flex items-center justify-end text-sm text-muted-foreground">
          {equipment.purchase_url && (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}
