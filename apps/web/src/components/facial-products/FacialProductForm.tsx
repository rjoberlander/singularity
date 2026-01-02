"use client";

import { useState, useEffect } from "react";
import { FacialProduct, CreateFacialProductRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateFacialProduct, useUpdateFacialProduct, useDeleteFacialProduct } from "@/hooks/useFacialProducts";
import {
  Loader2, Trash2, Copy, ExternalLink, Check, Sparkles,
  Droplet, FlaskConical, Layers, Shield, MoreHorizontal,
  Sunrise, Sun, Utensils, Sunset, Moon, BedDouble, LucideIcon
} from "lucide-react";
import { useExtractFacialProducts, useHasActiveAIKey } from "@/hooks/useAI";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "cleanser", label: "Cleanser", icon: Droplet },
  { value: "toner", label: "Toner", icon: Droplet },
  { value: "serum", label: "Serum", icon: FlaskConical },
  { value: "moisturizer", label: "Moisturizer", icon: Layers },
  { value: "sunscreen", label: "Sunscreen", icon: Shield },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const FORM_OPTIONS = [
  { value: "cream", label: "Cream" },
  { value: "gel", label: "Gel" },
  { value: "liquid", label: "Liquid" },
  { value: "foam", label: "Foam" },
];

const SIZE_UNITS = ["ml", "oz", "g"];
const USAGE_UNITS = ["ml", "pumps", "drops", "pea-sized"];

// Order: Wake, AM, Lunch, PM, Dinner, Evening, Bed
const TIMING_OPTIONS: { value: string; label: string; icon: LucideIcon; selectedColor: string }[] = [
  { value: "wake_up", label: "Wake", icon: Sunrise, selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-400" },
  { value: "am", label: "AM", icon: Sun, selectedColor: "bg-yellow-500/30 border-yellow-500/50 text-yellow-400" },
  { value: "lunch", label: "Lunch", icon: Utensils, selectedColor: "bg-amber-500/30 border-amber-500/50 text-amber-500" },
  { value: "pm", label: "PM", icon: Sunset, selectedColor: "bg-orange-500/30 border-orange-500/50 text-orange-500" },
  { value: "dinner", label: "Dinner", icon: Utensils, selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400" },
  { value: "evening", label: "Evening", icon: Moon, selectedColor: "bg-purple-500/30 border-purple-500/50 text-purple-400" },
  { value: "bed", label: "Bed", icon: BedDouble, selectedColor: "bg-indigo-500/30 border-indigo-500/50 text-indigo-400" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "every_other_day", label: "Every Other Day" },
  { value: "as_needed", label: "As Needed" },
];

const DAY_OPTIONS = [
  { value: "sun", label: "S" },
  { value: "mon", label: "M" },
  { value: "tue", label: "T" },
  { value: "wed", label: "W" },
  { value: "thu", label: "T" },
  { value: "fri", label: "F" },
  { value: "sat", label: "S" },
];

interface FacialProductFormProps {
  product?: FacialProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacialProductForm({ product, open, onOpenChange }: FacialProductFormProps) {
  const isEditing = !!product;
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<CreateFacialProductRequest & { product_data_source?: string; product_updated_at?: string; usage_frequency?: string; usage_timing?: string; frequency_days?: string[] }>({
    name: "",
    brand: "",
    application_form: "",
    size_amount: undefined,
    size_unit: "ml",
    price: undefined,
    purchase_url: "",
    category: "",
    key_ingredients: [],
    spf_rating: undefined,
    purpose: "",
    notes: "",
    usage_frequency: "",
    usage_timing: "",
    frequency_days: [],
    usage_amount: undefined,
    usage_unit: "ml",
  });
  const [isAILoading, setIsAILoading] = useState(false);
  const { hasKey: hasAIKey } = useHasActiveAIKey();
  const extractFacialProducts = useExtractFacialProducts();

  const [ingredientInput, setIngredientInput] = useState("");

  const createProduct = useCreateFacialProduct();
  const updateProduct = useUpdateFacialProduct();
  const deleteProduct = useDeleteFacialProduct();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand || "",
        application_form: product.application_form || "",
        size_amount: product.size_amount,
        size_unit: product.size_unit || "ml",
        price: product.price,
        purchase_url: product.purchase_url || "",
        category: product.category?.toLowerCase() || "",
        key_ingredients: product.key_ingredients || [],
        spf_rating: product.spf_rating,
        purpose: product.purpose || "",
        notes: product.notes || "",
        product_data_source: (product as any).product_data_source,
        product_updated_at: (product as any).product_updated_at,
        usage_frequency: (product as any).usage_frequency?.toLowerCase() || "",
        usage_timing: (product as any).usage_timing?.toLowerCase() || "",
        frequency_days: (product as any).frequency_days || [],
        usage_amount: product.usage_amount,
        usage_unit: product.usage_unit || "ml",
      });
    } else {
      setFormData({
        name: "",
        brand: "",
        application_form: "",
        size_amount: undefined,
        size_unit: "ml",
        price: undefined,
        purchase_url: "",
        category: "",
        key_ingredients: [],
        spf_rating: undefined,
        purpose: "",
        notes: "",
        usage_frequency: "",
        usage_timing: "",
        frequency_days: [],
        usage_amount: undefined,
        usage_unit: "ml",
      });
    }
    setCopied(false);
    setIngredientInput("");
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, data: formData as any });
        toast.success("Product updated");
      } else {
        await createProduct.mutateAsync(formData as any);
        toast.success("Product added");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (confirm("Delete this product?")) {
      try {
        await deleteProduct.mutateAsync(product.id);
        toast.success("Deleted");
        onOpenChange(false);
      } catch (error) {
        toast.error("Failed to delete");
      }
    }
  };

  const handleCopyUrl = async () => {
    if (formData.purchase_url) {
      await navigator.clipboard.writeText(formData.purchase_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData({
        ...formData,
        key_ingredients: [...(formData.key_ingredients || []), ingredientInput.trim()],
      });
      setIngredientInput("");
    }
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...(formData.key_ingredients || [])];
    newIngredients.splice(index, 1);
    setFormData({ ...formData, key_ingredients: newIngredients });
  };

  const handleAIFill = async () => {
    if (!formData.purchase_url && !formData.name) {
      toast.error("Enter a URL or product name first");
      return;
    }
    setIsAILoading(true);
    try {
      const searchQuery = `${formData.name} ${formData.brand || ""} skincare product. Find: brand, price, size, form (cream/gel/liquid/foam), category (cleanser/toner/serum/moisturizer/sunscreen/other).`;
      const result = await extractFacialProducts.mutateAsync({
        text_content: searchQuery,
        source_type: "text",
        product_url: formData.purchase_url || undefined,
      });
      if (result.products && result.products.length > 0) {
        const p = result.products[0];
        setFormData(prev => ({
          ...prev,
          name: p.name || prev.name,
          brand: p.brand || prev.brand,
          application_form: p.application_form?.toLowerCase() || prev.application_form,
          size_amount: p.size_amount ?? prev.size_amount,
          size_unit: p.size_unit || prev.size_unit,
          price: p.price ?? prev.price,
          category: p.category?.toLowerCase() || prev.category,
          key_ingredients: p.key_ingredients || prev.key_ingredients,
          spf_rating: p.spf_rating ?? prev.spf_rating,
          purpose: p.purpose || prev.purpose,
        }));
        toast.success("AI filled product details");
      } else {
        toast.error("Could not find product info");
      }
    } catch (error) {
      console.error("AI fetch error:", error);
      toast.error("Failed to fetch info");
    } finally {
      setIsAILoading(false);
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Facial Product" : "Add Facial Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Name + Brand */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Anua Heartleaf Pore Control Cleansing Oil"
              required
              className="h-7 text-sm flex-1"
            />
            <Label className="text-xs text-muted-foreground whitespace-nowrap ml-2">Brand</Label>
            <Input
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Anua"
              className="h-7 text-sm w-32"
            />
          </div>

          {/* Row 2: Freq - presets + day picker */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0 w-14">Freq</Label>
            <div className="flex gap-0.5">
              {FREQUENCY_OPTIONS.map((opt) => {
                const isCustom = formData.usage_frequency === "custom" || (formData.frequency_days && formData.frequency_days.length > 0);
                const isSelected = formData.usage_frequency === opt.value && !isCustom;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      usage_frequency: opt.value === formData.usage_frequency ? "" : opt.value,
                      frequency_days: []
                    })}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-0.5 ml-1 pl-1 border-l border-muted-foreground/20">
              {DAY_OPTIONS.map((day) => {
                const isSelected = formData.frequency_days?.includes(day.value) || false;
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => {
                      const currentDays = formData.frequency_days || [];
                      const newDays = isSelected
                        ? currentDays.filter(d => d !== day.value)
                        : [...currentDays, day.value];
                      setFormData({
                        ...formData,
                        usage_frequency: newDays.length > 0 ? "custom" : "",
                        frequency_days: newDays
                      });
                    }}
                    className={`w-5 h-5 text-[10px] rounded border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: When (timing) */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0 w-14">When</Label>
            <div className="flex gap-0.5 flex-wrap">
              {TIMING_OPTIONS.map((opt) => {
                const isSelected = formData.usage_timing === opt.value;
                const TimingIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, usage_timing: opt.value === formData.usage_timing ? "" : opt.value })}
                    className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      isSelected
                        ? opt.selectedColor
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <TimingIcon className="w-3 h-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: URL */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">URL</Label>
            <Input
              type="url"
              value={formData.purchase_url}
              onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
              placeholder="https://www.amazon.com/..."
              className="h-7 text-sm flex-1 min-w-0"
            />
            {formData.purchase_url && (
              <>
                <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleCopyUrl}>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(formData.purchase_url, "_blank")}>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          {/* Row 5: Notes */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="h-7 text-sm flex-1"
            />
          </div>

          {/* Product Section */}
          <div className="pt-2 border-t border-muted">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm font-semibold">Product</Label>
              {hasAIKey && (
                <Button
                  type="button"
                  size="sm"
                  className="h-6 px-3 gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50"
                  onClick={handleAIFill}
                  disabled={isAILoading}
                >
                  {isAILoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span className="text-xs">Populate by AI</span>
                </Button>
              )}
            </div>

            {/* Category row */}
            <div className="flex items-center gap-1 mb-2">
              <Label className="text-xs text-muted-foreground shrink-0 w-14">Category</Label>
              <div className="flex gap-0.5 flex-wrap">
                {CATEGORIES.map((cat) => {
                  const isSelected = formData.category === cat.value;
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value === formData.category ? "" : cat.value })}
                      className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                      }`}
                    >
                      <CatIcon className="w-3 h-3" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form row */}
            <div className="flex items-center gap-1 mb-2">
              <Label className="text-xs text-muted-foreground shrink-0 w-14">Form</Label>
              <div className="flex gap-0.5">
                {FORM_OPTIONS.map((opt) => {
                  const isSelected = formData.application_form === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, application_form: opt.value === formData.application_form ? "" : opt.value })}
                      className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size + Price row */}
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Size</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.size_amount ?? ""}
                onChange={(e) => setFormData({ ...formData, size_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="200"
                className="h-7 text-sm w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex gap-0.5">
                {SIZE_UNITS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setFormData({ ...formData, size_unit: unit })}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      formData.size_unit === unit
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>

              <Label className="text-xs text-muted-foreground whitespace-nowrap ml-4">Price $</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price ?? ""}
                onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="24.99"
                className="h-7 text-sm w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              {formData.category === "sunscreen" && (
                <>
                  <Label className="text-xs text-muted-foreground whitespace-nowrap ml-4">SPF</Label>
                  <Input
                    type="number"
                    value={formData.spf_rating ?? ""}
                    onChange={(e) => setFormData({ ...formData, spf_rating: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="50"
                    className="h-7 text-sm w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </>
              )}
            </div>

            {/* Usage Amount row - for cost calculations */}
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Usage</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.usage_amount ?? ""}
                onChange={(e) => setFormData({ ...formData, usage_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="1"
                className="h-7 text-sm w-16 placeholder:text-red-400/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex gap-0.5">
                {USAGE_UNITS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setFormData({ ...formData, usage_unit: unit })}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      formData.usage_unit === unit
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">per application</span>
            </div>
          </div>

          {/* Key Ingredients */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground shrink-0">Ingredients</Label>
              <Input
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIngredient();
                  }
                }}
                placeholder="Add ingredient and press Enter"
                className="h-7 text-sm flex-1"
              />
              <Button type="button" variant="outline" size="sm" className="h-7" onClick={addIngredient}>
                Add
              </Button>
            </div>
            {formData.key_ingredients && formData.key_ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.key_ingredients.map((ingredient, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400"
                  >
                    {ingredient}
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="hover:text-pink-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Purpose */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">Purpose</Label>
            <Input
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="First cleanse - dissolves sunscreen"
              className="h-7 text-sm flex-1"
            />
          </div>

          <DialogFooter className="flex flex-row items-center pt-2">
            {isEditing && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleteProduct.isPending} className="mr-auto">
                {deleteProduct.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {isEditing ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
