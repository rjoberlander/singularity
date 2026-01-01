"use client";

import { useState, useEffect } from "react";
import { Equipment, CreateEquipmentRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from "@/hooks/useEquipment";
import { useExtractEquipment, useHasActiveAIKey } from "@/hooks/useAI";
import {
  Loader2,
  Trash2,
  Sparkles,
  Sunrise,
  Sun,
  Utensils,
  Sunset,
  Moon,
  BedDouble,
  LucideIcon,
  Zap,
  Scissors,
  Heart,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "lllt", label: "LLLT", icon: Zap, color: "text-yellow-400" },
  { value: "microneedling", label: "Microneedling", icon: Scissors, color: "text-red-400" },
  { value: "sleep", label: "Sleep", icon: Moon, color: "text-purple-400" },
  { value: "skincare", label: "Skincare", icon: Sparkles, color: "text-pink-400" },
  { value: "recovery", label: "Recovery", icon: Heart, color: "text-green-400" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-gray-400" },
];

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

interface EquipmentFormProps {
  equipment?: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData extends CreateEquipmentRequest {
  frequency_days?: string[];
  usage_duration_minutes?: number;
}

export function EquipmentForm({ equipment, open, onOpenChange }: EquipmentFormProps) {
  const isEditing = !!equipment;
  const [copied, setCopied] = useState(false);
  const [isAIFetching, setIsAIFetching] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    brand: "",
    model: "",
    category: "",
    purpose: "",
    usage_frequency: "",
    usage_timing: "",
    usage_duration: "",
    usage_duration_minutes: undefined,
    usage_protocol: "",
    contraindications: "",
    purchase_url: "",
    notes: "",
    frequency_days: [],
  });

  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipment = useDeleteEquipment();
  const extractEquipment = useExtractEquipment();
  const { hasKey: hasAIKey } = useHasActiveAIKey();

  // Parse duration string to minutes
  const parseDurationToMinutes = (duration: string): number | undefined => {
    if (!duration) return undefined;
    const match = duration.match(/(\d+)\s*min/i);
    if (match) return parseInt(match[1]);
    const hourMatch = duration.match(/(\d+)\s*hour/i);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    if (duration.toLowerCase().includes('all_night') || duration.toLowerCase().includes('all night')) return 480;
    return undefined;
  };

  // Convert minutes to duration string for storage
  const minutesToDuration = (minutes: number | undefined): string => {
    if (!minutes) return "";
    if (minutes >= 480) return "all_night";
    if (minutes >= 60) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
    return `${minutes} minutes`;
  };

  useEffect(() => {
    if (equipment) {
      const durationMinutes = parseDurationToMinutes(equipment.usage_duration || "");
      setFormData({
        name: equipment.name,
        brand: equipment.brand || "",
        model: equipment.model || "",
        category: equipment.category?.toLowerCase() || "",
        purpose: equipment.purpose || "",
        usage_frequency: equipment.usage_frequency?.toLowerCase() || "",
        usage_timing: equipment.usage_timing?.toLowerCase() || "",
        usage_duration: equipment.usage_duration || "",
        usage_duration_minutes: durationMinutes,
        usage_protocol: equipment.usage_protocol || "",
        contraindications: equipment.contraindications || "",
        purchase_url: equipment.purchase_url || "",
        notes: equipment.notes || "",
        frequency_days: (equipment as any).frequency_days || [],
      });
    } else {
      setFormData({
        name: "",
        brand: "",
        model: "",
        category: "",
        purpose: "",
        usage_frequency: "",
        usage_timing: "",
        usage_duration: "",
        usage_duration_minutes: undefined,
        usage_protocol: "",
        contraindications: "",
        purchase_url: "",
        notes: "",
        frequency_days: [],
      });
    }
    setCopied(false);
  }, [equipment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Clean the form data - convert empty strings to undefined
      // to avoid database CHECK constraint violations
      const cleanedData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (key === "usage_duration_minutes") continue; // Skip helper field
        if (key === "frequency_days" && Array.isArray(value) && value.length === 0) continue;
        if (value === "" || value === null) {
          continue; // Skip empty strings and nulls
        }
        cleanedData[key] = value;
      }

      // Convert minutes to duration string
      if (formData.usage_duration_minutes) {
        cleanedData.usage_duration = minutesToDuration(formData.usage_duration_minutes);
      }

      if (isEditing && equipment) {
        await updateEquipment.mutateAsync({ id: equipment.id, data: cleanedData as any });
        toast.success("Equipment updated");
      } else {
        await createEquipment.mutateAsync(cleanedData as any);
        toast.success("Equipment added");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save equipment:", error);
      toast.error("Failed to save equipment");
    }
  };

  const handleDelete = async () => {
    if (!equipment) return;
    if (confirm("Delete this equipment?")) {
      try {
        await deleteEquipment.mutateAsync(equipment.id);
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

  const handleAIFetch = async () => {
    if (!formData.name) {
      toast.error("Enter a name first");
      return;
    }

    setIsAIFetching(true);
    try {
      const searchQuery = `${formData.name} ${formData.brand || ""} ${formData.model || ""} equipment device.
        Find: brand, model, category (lllt/microneedling/sleep/skincare/recovery/other), purpose,
        usage frequency, timing, duration (in minutes), protocol, contraindications.`;

      const result = await extractEquipment.mutateAsync({ text_content: searchQuery });

      if (result.equipment && result.equipment.length > 0) {
        const e = result.equipment[0];
        setFormData(prev => ({
          ...prev,
          name: e.name || prev.name,
          brand: e.brand || prev.brand,
          model: e.model || prev.model,
          category: e.category?.toLowerCase() || prev.category,
          purpose: e.purpose || prev.purpose,
          usage_frequency: e.usage_frequency || prev.usage_frequency,
          usage_timing: e.usage_timing || prev.usage_timing,
          usage_duration: e.usage_duration || prev.usage_duration,
          usage_duration_minutes: parseDurationToMinutes(e.usage_duration || "") || prev.usage_duration_minutes,
          usage_protocol: e.usage_protocol || prev.usage_protocol,
          contraindications: e.contraindications || prev.contraindications,
        }));
        toast.success("AI populated equipment details");
      } else {
        toast.error("Could not find equipment info");
      }
    } catch (error) {
      console.error("AI fetch error:", error);
      toast.error("Failed to fetch info");
    } finally {
      setIsAIFetching(false);
    }
  };

  const isPending = createEquipment.isPending || updateEquipment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Row 1: Name + Brand + Model - all inline */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="iRestore Elite"
              required
              className="h-7 text-sm flex-1"
            />
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Brand</Label>
            <Input
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="iRestore"
              className="h-7 text-sm w-28"
            />
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Model</Label>
            <Input
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Pro 500"
              className="h-7 text-sm w-24"
            />
          </div>

          {/* Row 2: Category chips */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0 w-14">Category</Label>
            <div className="flex gap-0.5 flex-wrap">
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = formData.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value === formData.category ? "" : cat.value })}
                    className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      isSelected
                        ? `bg-primary/20 border-primary/50 ${cat.color}`
                        : "bg-muted/50 border-muted-foreground/20 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <CatIcon className="w-3 h-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Frequency - presets + day picker (like supplements) */}
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
                      frequency_days: [] // Clear custom days when selecting a preset
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
            {/* Day picker - always visible */}
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

          {/* Row 4: Timing chips (like supplements with icons) */}
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

          {/* Row 5: Duration input + Purpose */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Duration</Label>
            <Input
              type="number"
              min={1}
              value={formData.usage_duration_minutes ?? ""}
              onChange={(e) => setFormData({ ...formData, usage_duration_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="20"
              className="h-7 text-sm w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-muted-foreground">min</span>
            <div className="flex-1 flex items-center gap-1 ml-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Purpose</Label>
              <Input
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Hair regrowth via LLLT"
                className="h-7 text-sm flex-1"
              />
            </div>
          </div>

          {/* Row 6: URL + AI Button */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">URL</Label>
            <Input
              type="url"
              value={formData.purchase_url}
              onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
              placeholder="https://..."
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
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 gap-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50"
              onClick={handleAIFetch}
              disabled={isAIFetching || !formData.name || !hasAIKey}
              data-ai-fill-button
            >
              {isAIFetching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span className="text-xs">Fill by AI</span>
            </Button>
          </div>

          {/* Protocol Section */}
          <div className="pt-2 border-t border-muted">
            <Label className="text-xs font-semibold mb-1 block">Protocol & Warnings</Label>
            <div className="space-y-2">
              <div className="flex items-start gap-1">
                <Label className="text-xs text-muted-foreground shrink-0 pt-1">Protocol</Label>
                <Textarea
                  value={formData.usage_protocol}
                  onChange={(e) => setFormData({ ...formData, usage_protocol: e.target.value })}
                  rows={2}
                  placeholder="Use after showering when scalp is clean and dry..."
                  className="text-sm flex-1 min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground shrink-0">Warnings</Label>
                <Input
                  value={formData.contraindications}
                  onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })}
                  placeholder="Skip minoxidil for 24 hours after use"
                  className="h-7 text-sm flex-1"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground shrink-0">Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="h-7 text-sm flex-1"
            />
          </div>

          <DialogFooter className="flex flex-row items-center pt-2">
            {isEditing && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleteEquipment.isPending} className="mr-auto">
                {deleteEquipment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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
