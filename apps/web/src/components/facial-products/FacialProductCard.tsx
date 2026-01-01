"use client";

import { FacialProduct } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToggleFacialProduct } from "@/hooks/useFacialProducts";
import {
  Droplet, DollarSign, ExternalLink, AlertTriangle, LucideIcon,
  Shield, FlaskConical, MoreHorizontal, Layers, Package
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
  oil: "Oil",
  liquid: "Liquid",
  foam: "Foam",
};

// Check which important fields are missing
function getMissingFieldsGrouped(product: FacialProduct): {
  productInfo: boolean;
  productUrl: boolean;
} {
  // Product info: brand, price, category, form, size
  const productInfo = !product.brand || !product.price || !product.category ||
    !product.application_form || !product.size_amount;

  const productUrl = !product.purchase_url;

  return { productInfo, productUrl };
}

interface FacialProductCardProps {
  product: FacialProduct;
  onEdit?: (product: FacialProduct) => void;
}

export function FacialProductCard({ product, onEdit }: FacialProductCardProps) {
  const toggleProduct = useToggleFacialProduct();
  const missingGroups = getMissingFieldsGrouped(product);
  const hasMissingFields = missingGroups.productInfo || missingGroups.productUrl;

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

        {/* Price + Size */}
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
