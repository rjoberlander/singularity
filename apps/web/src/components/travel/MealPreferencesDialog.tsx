"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MealResearchPreferences } from "@singularity/shared-types";

interface MealPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPreferences?: MealResearchPreferences | null;
  onSave: (preferences: MealResearchPreferences) => Promise<void>;
}

const PRIORITY_OPTIONS = [
  { value: "authenticity", label: "Authenticity" },
  { value: "local_specialties", label: "Local Specialties" },
  { value: "kid_friendly", label: "Kid-Friendly" },
  { value: "proximity", label: "Proximity to Activities" },
  { value: "reviews", label: "Highly Reviewed" },
];

const AVOID_OPTIONS = [
  { value: "tourist_traps", label: "Tourist Traps" },
  { value: "chains", label: "Chain Restaurants" },
  { value: "overly_formal", label: "Overly Formal" },
];

const CUISINE_OPTIONS = [
  { value: "regional_specialties", label: "Regional Specialties" },
  { value: "seafood", label: "Seafood" },
  { value: "street_food", label: "Street Food" },
  { value: "markets", label: "Markets & Food Halls" },
  { value: "wine_bars", label: "Wine Bars" },
  { value: "pastry_cafes", label: "Pastry & Cafes" },
  { value: "grilled_meats", label: "Grilled Meats" },
];

const DEFAULTS: MealResearchPreferences = {
  dining_style: "adventurous",
  priorities: ["authenticity", "local_specialties"],
  avoid: ["tourist_traps"],
  cuisine_interests: ["regional_specialties"],
  budget: "no_limit",
  dietary_restrictions: [],
  family_context: "",
};

function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
        selected
          ? "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300"
          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

export function MealPreferencesDialog({
  open,
  onOpenChange,
  initialPreferences,
  onSave,
}: MealPreferencesDialogProps) {
  const [prefs, setPrefs] = useState<MealResearchPreferences>(
    initialPreferences || DEFAULTS
  );
  const [saving, setSaving] = useState(false);
  const [dietaryText, setDietaryText] = useState("");

  useEffect(() => {
    if (initialPreferences) {
      setPrefs(initialPreferences);
      setDietaryText(initialPreferences.dietary_restrictions?.join(", ") || "");
    } else {
      setPrefs(DEFAULTS);
      setDietaryText("");
    }
  }, [initialPreferences, open]);

  const toggleArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleSave = async () => {
    setSaving(true);
    try {
      const toSave = {
        ...prefs,
        dietary_restrictions: dietaryText
          ? dietaryText.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };
      await onSave(toSave);
      toast.success("Meal preferences saved");
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meal Research Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Dining Style */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Dining Style</Label>
            <div className="flex gap-2">
              {(["adventurous", "balanced", "conservative"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, dining_style: style }))}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    prefs.dining_style === style
                      ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {style === "adventurous" ? "Adventurous" : style === "balanced" ? "Balanced" : "Safe Picks"}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {prefs.dining_style === "adventurous"
                ? "Local holes-in-the-wall, markets, Portuguese-only menus OK"
                : prefs.dining_style === "balanced"
                ? "Mix of local gems and well-reviewed reliable spots"
                : "Well-reviewed, English-friendly restaurants"}
            </p>
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Budget</Label>
            <div className="flex gap-2">
              {(["budget", "moderate", "no_limit"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, budget: b }))}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    prefs.budget === b
                      ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {b === "budget" ? "Budget" : b === "moderate" ? "Moderate" : "No Limit"}
                </button>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Priorities</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <ToggleChip
                  key={opt.value}
                  label={opt.label}
                  selected={prefs.priorities.includes(opt.value)}
                  onClick={() =>
                    setPrefs((p) => ({ ...p, priorities: toggleArray(p.priorities, opt.value) }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Avoid */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Avoid</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVOID_OPTIONS.map((opt) => (
                <ToggleChip
                  key={opt.value}
                  label={opt.label}
                  selected={prefs.avoid.includes(opt.value)}
                  onClick={() =>
                    setPrefs((p) => ({ ...p, avoid: toggleArray(p.avoid, opt.value) }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Cuisine Interests */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cuisine Interests</Label>
            <div className="flex flex-wrap gap-1.5">
              {CUISINE_OPTIONS.map((opt) => (
                <ToggleChip
                  key={opt.value}
                  label={opt.label}
                  selected={prefs.cuisine_interests.includes(opt.value)}
                  onClick={() =>
                    setPrefs((p) => ({
                      ...p,
                      cuisine_interests: toggleArray(p.cuisine_interests, opt.value),
                    }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Dietary Restrictions</Label>
            <Input
              value={dietaryText}
              onChange={(e) => setDietaryText(e.target.value)}
              placeholder="None (or comma-separated: vegetarian, nut allergy)"
              className="h-8 text-xs"
            />
          </div>

          {/* Family Context */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Family Context</Label>
            <Input
              value={prefs.family_context || ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, family_context: e.target.value }))
              }
              placeholder="e.g. 2 adults, 3 kids (ages 7, 5, 3)"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
