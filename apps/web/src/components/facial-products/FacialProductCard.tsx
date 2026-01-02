"use client";

import { FacialProduct } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToggleFacialProduct } from "@/hooks/useFacialProducts";
import {
  Droplet, DollarSign, ExternalLink, AlertTriangle, LucideIcon,
  Shield, FlaskConical, MoreHorizontal, Layers, Package, Calendar,
  Sunrise, Sun, Utensils, Sunset, Moon, BedDouble
} from "lucide-react";
import { toast } from "sonner";

// Category icons (simplified)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cleanser: Droplet,
  toner: Droplet,
  serum: FlaskConical,
  moisturizer: Layers,
  sunscreen: Shield,
  other: MoreHorizontal,
};

// Category colors for icon backgrounds
const CATEGORY_COLORS: Record<string, string> = {
  cleanser: "rgba(59, 130, 246, 0.15)",
  toner: "rgba(147, 197, 253, 0.15)",
  serum: "rgba(236, 72, 153, 0.15)",
  moisturizer: "rgba(74, 222, 128, 0.15)",
  sunscreen: "rgba(251, 191, 36, 0.15)",
  other: "rgba(107, 114, 128, 0.15)",
};

// Category icon stroke colors
const CATEGORY_ICON_COLORS: Record<string, string> = {
  cleanser: "rgb(59, 130, 246)",
  toner: "rgb(147, 197, 253)",
  serum: "rgb(236, 72, 153)",
  moisturizer: "rgb(74, 222, 128)",
  sunscreen: "rgb(251, 191, 36)",
  other: "rgb(107, 114, 128)",
};

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  cleanser: "Cleanser",
  toner: "Toner",
  serum: "Serum",
  moisturizer: "Moisturizer",
  sunscreen: "Sunscreen",
  other: "Other",
};

// Form labels
const FORM_LABELS: Record<string, string> = {
  cream: "Cream",
  gel: "Gel",
  liquid: "Liquid",
  foam: "Foam",
};

// Timing config
const TIMING_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  wake_up: { icon: Sunrise, color: "text-orange-400", label: "Wake" },
  am: { icon: Sun, color: "text-yellow-400", label: "AM" },
  lunch: { icon: Utensils, color: "text-amber-500", label: "Lunch" },
  pm: { icon: Sunset, color: "text-orange-500", label: "PM" },
  dinner: { icon: Utensils, color: "text-purple-400", label: "Dinner" },
  evening: { icon: Moon, color: "text-purple-400", label: "Evening" },
  bed: { icon: BedDouble, color: "text-indigo-400", label: "Bed" },
};

// Frequency labels
const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  every_other_day: "Every Other Day",
  as_needed: "As Needed",
  custom: "Custom",
};

// Valid frequencies (custom without days is not valid)
const VALID_FREQUENCIES = ['daily', 'every_other_day', 'as_needed'];

// Valid timings
const VALID_TIMINGS = ['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed'];

// Helper to check empty value
const isEmpty = (val: any) => val === null || val === undefined || val === '' || val === 0;

// Check which important fields are missing
function getMissingFields(product: FacialProduct): {
  frequency: boolean;
  timing: boolean;
  productInfo: boolean;
  productUrl: boolean;
} {
  // Frequency check - must be a valid frequency OR custom with days selected
  const usageFrequency = (product as any).usage_frequency?.toLowerCase() || '';
  const frequencyDays = (product as any).frequency_days || [];
  const hasValidFrequency = VALID_FREQUENCIES.includes(usageFrequency) ||
    (usageFrequency === 'custom' && frequencyDays.length > 0);
  const frequency = !hasValidFrequency;

  // Timing check
  const usageTiming = (product as any).usage_timing?.toLowerCase() || '';
  const timing = !VALID_TIMINGS.includes(usageTiming);

  // Product info: brand, price, category, form, size
  const productInfo = !product.brand || !product.price || !product.category ||
    !product.application_form || !product.size_amount;

  const productUrl = !product.purchase_url;

  return { frequency, timing, productInfo, productUrl };
}

interface FacialProductCardProps {
  product: FacialProduct;
  onEdit?: (product: FacialProduct) => void;
}

export function FacialProductCard({ product, onEdit }: FacialProductCardProps) {
  const toggleProduct = useToggleFacialProduct();
  const missingFields = getMissingFields(product);
  const hasMissingFields = missingFields.frequency || missingFields.timing || missingFields.productInfo || missingFields.productUrl;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleProduct.mutateAsync(product.id);
      toast.success(product.is_active ? "Product paused" : "Product resumed");
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  // Get category-specific icon and colors
  const category = product.category || "other";
  const IconComponent = CATEGORY_ICONS[category] || Droplet;
  const iconBgColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const iconColor = CATEGORY_ICON_COLORS[category] || CATEGORY_ICON_COLORS.other;

  // Calculate daily applications based on frequency and timing
  const calculateDailyApplications = (): number | null => {
    const usageFrequency = (product as any).usage_frequency?.toLowerCase() || '';
    const usageTiming = (product as any).usage_timing?.toLowerCase() || '';

    // Count applications per day based on timing
    // Assuming each timing is 1 application
    const timingsPerDay = usageTiming && VALID_TIMINGS.includes(usageTiming) ? 1 : 0;
    if (timingsPerDay === 0) return null;

    // Frequency multiplier
    let freqMultiplier = 1;
    if (usageFrequency === 'every_other_day') freqMultiplier = 0.5;
    else if (usageFrequency === 'as_needed') freqMultiplier = 0.5; // estimate
    else if (!VALID_FREQUENCIES.includes(usageFrequency)) return null;

    return timingsPerDay * freqMultiplier;
  };

  const dailyApplications = calculateDailyApplications();

  // Unit conversion constants
  const ML_PER_OZ = 29.5735;
  const ML_PER_PUMP = 0.5;
  const ML_PER_DROP = 0.05;
  const ML_PER_PEA_SIZED = 0.5;

  // Calculate cost per month
  const calculateMonthlyCost = (): number | null => {
    if (!product.price || !product.size_amount || !product.usage_amount || !dailyApplications) return null;

    const sizeUnit = product.size_unit?.toLowerCase() || '';
    const usageUnit = product.usage_unit?.toLowerCase() || '';

    // Convert size to ml
    let sizeInMl: number;
    if (sizeUnit === 'ml') {
      sizeInMl = product.size_amount;
    } else if (sizeUnit === 'oz') {
      sizeInMl = product.size_amount * ML_PER_OZ;
    } else if (sizeUnit === 'g') {
      sizeInMl = product.size_amount; // 1g ≈ 1ml for skincare
    } else {
      return null;
    }

    // Convert usage to ml
    let usageInMl: number;
    if (usageUnit === 'ml') {
      usageInMl = product.usage_amount;
    } else if (usageUnit === 'pumps') {
      usageInMl = product.usage_amount * ML_PER_PUMP;
    } else if (usageUnit === 'drops') {
      usageInMl = product.usage_amount * ML_PER_DROP;
    } else if (usageUnit === 'pea-sized') {
      usageInMl = product.usage_amount * ML_PER_PEA_SIZED;
    } else {
      return null;
    }

    const mlPerDay = usageInMl * dailyApplications;
    const daysPerContainer = sizeInMl / (mlPerDay || 1);
    return (product.price / daysPerContainer) * 30;
  };

  const monthlyCost = calculateMonthlyCost();

  // Calculate how long the product lasts
  const calculateProductDuration = (): { value: number; unit: string } | null => {
    if (!product.size_amount || !product.usage_amount || !dailyApplications) return null;

    const sizeUnit = product.size_unit?.toLowerCase() || '';
    const usageUnit = product.usage_unit?.toLowerCase() || '';

    // Convert size to ml
    let sizeInMl: number;
    if (sizeUnit === 'ml') {
      sizeInMl = product.size_amount;
    } else if (sizeUnit === 'oz') {
      sizeInMl = product.size_amount * ML_PER_OZ;
    } else if (sizeUnit === 'g') {
      sizeInMl = product.size_amount;
    } else {
      return null;
    }

    // Convert usage to ml
    let usageInMl: number;
    if (usageUnit === 'ml') {
      usageInMl = product.usage_amount;
    } else if (usageUnit === 'pumps') {
      usageInMl = product.usage_amount * ML_PER_PUMP;
    } else if (usageUnit === 'drops') {
      usageInMl = product.usage_amount * ML_PER_DROP;
    } else if (usageUnit === 'pea-sized') {
      usageInMl = product.usage_amount * ML_PER_PEA_SIZED;
    } else {
      return null;
    }

    const mlPerDay = usageInMl * dailyApplications;
    const days = sizeInMl / mlPerDay;

    if (days >= 60) {
      return { value: Math.round(days / 30), unit: "months" };
    } else if (days >= 14) {
      return { value: Math.round(days / 7), unit: "weeks" };
    }
    return { value: Math.round(days), unit: "days" };
  };

  const productDuration = calculateProductDuration();

  return (
    <Card
      className={`transition-all cursor-pointer hover:border-primary/50 relative overflow-hidden ${
        !product.is_active ? "opacity-60" : ""
      }`}
      onClick={() => onEdit?.(product)}
    >
      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: iconBgColor }}>
              <IconComponent className="w-5 h-5" style={{ color: iconColor }} />
            </div>
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <div className="flex items-center gap-2">
                {product.brand && (
                  <span className="text-sm text-muted-foreground">{product.brand}</span>
                )}
                {product.purchase_url && (
                  <a
                    href={product.purchase_url}
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
              checked={product.is_active}
              onClick={handleToggle}
              disabled={toggleProduct.isPending}
            />
          </div>
        </div>

        {/* Product info row: Category + Form */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Category */}
          <div className="flex items-center gap-1.5">
            <IconComponent className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
            {product.category ? (
              <span className="text-sm font-medium truncate">{CATEGORY_LABELS[product.category] || product.category}</span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">Missing</span>
            )}
          </div>

          {/* Form */}
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
            {product.application_form ? (
              <span className="text-sm font-medium truncate">{FORM_LABELS[product.application_form] || product.application_form}</span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 font-medium">Missing</span>
            )}
          </div>
        </div>

        {/* Frequency + Timing row */}
        {((product as any).usage_frequency || (product as any).usage_timing) && (
          <div className="flex items-center gap-3 mb-3">
            {/* Frequency */}
            {(product as any).usage_frequency && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{FREQUENCY_LABELS[(product as any).usage_frequency] || (product as any).usage_frequency}</span>
              </div>
            )}
            {/* Timing */}
            {(product as any).usage_timing && (() => {
              const timing = (product as any).usage_timing?.toLowerCase();
              const config = TIMING_CONFIG[timing];
              if (config) {
                const TimingIcon = config.icon;
                return (
                  <div className={`flex items-center gap-1 ${config.color}`}>
                    <TimingIcon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Price + Size + Cost */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {product.price != null && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              ${product.price.toFixed(2)}
            </span>
          )}
          {product.size_amount && product.size_unit && (
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {product.size_amount} {product.size_unit}
            </span>
          )}
          {product.spf_rating && (
            <span className="flex items-center gap-1 text-amber-400">
              <Shield className="w-3.5 h-3.5" />
              SPF {product.spf_rating}
            </span>
          )}
        </div>

        {/* Cost calculations - show missing usage indicator if usage_amount not set */}
        {(monthlyCost || productDuration || product.usage_amount || (product.is_active && product.price && product.size_amount && !product.usage_amount)) && (
          <div className="flex items-center gap-3 mt-2 text-sm">
            {product.usage_amount && product.usage_unit ? (
              <span className="text-muted-foreground">
                {product.usage_amount} {product.usage_unit}/use
              </span>
            ) : product.is_active && product.price && product.size_amount ? (
              <span className="text-red-400 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Missing usage
              </span>
            ) : null}
            {monthlyCost != null && (
              <span className="text-green-400 font-medium">
                ${monthlyCost.toFixed(2)}/mo
              </span>
            )}
            {productDuration && (
              <span className="text-blue-400">
                ~{productDuration.value} {productDuration.unit}
              </span>
            )}
          </div>
        )}

        {/* Key ingredients preview */}
        {product.key_ingredients && product.key_ingredients.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.key_ingredients.slice(0, 3).map((ingredient) => (
              <span
                key={ingredient}
                className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400"
              >
                {ingredient}
              </span>
            ))}
            {product.key_ingredients.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                +{product.key_ingredients.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Missing fields indicator */}
        {hasMissingFields && (
          <div className="mt-2 pt-2 border-t border-muted-foreground/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-yellow-500 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Missing:
              </span>
              {missingFields.frequency && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  Frequency
                </span>
              )}
              {missingFields.timing && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                  When
                </span>
              )}
              {missingFields.productInfo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  Product Info
                </span>
              )}
              {missingFields.productUrl && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  Product URL
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
