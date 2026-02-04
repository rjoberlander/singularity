"use client";

import { useState, useEffect } from "react";
import { useRVResearchSettings, useUpdateRVResearchSettings, useUpdateRVClaudeInstructions } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Copy,
  Check,
  Download,
  Settings,
  Truck,
  FileText,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface RVResearchSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// This is a fallback - the full instructions should be loaded from the database
const DEFAULT_INSTRUCTIONS = `# RV Location Research - Claude Project Instructions

## IMPORTANT: Load Full Instructions from Database

Before researching any locations, run this query to get the complete research instructions:

\`\`\`sql
SELECT claude_instructions FROM rv_research_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271';
\`\`\`

This will return the full research instructions including:
- Required fields for each location
- AllTrails requirements for hike activities (REQUIRED: alltrails_url, distance_miles, elevation_gain_ft)
- JSON output format
- Quality bar examples
- Complete checklist

## Also Load Family Profile & Equipment

\`\`\`sql
SELECT
  (SELECT family_profile FROM travel_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271') as family_profile,
  (SELECT jsonb_build_object('equipment', family_profile->'equipment') FROM rv_research_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271') as rv_equipment
\`\`\`

Follow all instructions from the database when researching locations.
`;

export function RVResearchSettingsSheet({ open, onOpenChange }: RVResearchSettingsSheetProps) {
  const { data: settings, isLoading } = useRVResearchSettings();
  const updateSettings = useUpdateRVResearchSettings();
  const updateInstructions = useUpdateRVClaudeInstructions();

  const [copied, setCopied] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [equipment, setEquipment] = useState({
    trailer_model: "",
    trailer_length_ft: 30,
    tow_vehicle: "",
    has_starlink: true,
    has_bikes: true,
    has_kayak: true,
    has_paddleboard: true,
  });

  // Load settings when available
  useEffect(() => {
    if (settings) {
      setInstructions(settings.claude_instructions || DEFAULT_INSTRUCTIONS);
      if (settings.family_profile?.equipment) {
        setEquipment({
          trailer_model: settings.family_profile.equipment.trailer_model || "Reflection 260",
          trailer_length_ft: settings.family_profile.equipment.trailer_length_ft || 30,
          tow_vehicle: settings.family_profile.equipment.tow_vehicle || "Toyota Tundra",
          has_starlink: settings.family_profile.equipment.has_starlink ?? true,
          has_bikes: settings.family_profile.equipment.has_bikes ?? true,
          has_kayak: settings.family_profile.equipment.has_kayak ?? true,
          has_paddleboard: settings.family_profile.equipment.has_paddleboard ?? true,
        });
      }
    } else if (!isLoading) {
      setInstructions(DEFAULT_INSTRUCTIONS);
    }
  }, [settings, isLoading]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      toast.success("Instructions copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([instructions], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rv-research-instructions.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Instructions downloaded");
  };

  const handleSaveInstructions = async () => {
    try {
      await updateInstructions.mutateAsync(instructions);
      setIsDirty(false);
      toast.success("Instructions saved");
    } catch {
      toast.error("Failed to save instructions");
    }
  };

  const handleSaveEquipment = async () => {
    try {
      await updateSettings.mutateAsync({
        family_profile: {
          equipment,
        },
      });
      toast.success("Equipment saved");
    } catch {
      toast.error("Failed to save equipment");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Research Settings
          </SheetTitle>
          <SheetDescription>
            Configure Claude instructions and RV equipment for location research. Family profile is managed in Travel Settings.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="instructions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="instructions" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Instructions</span>
              </TabsTrigger>
              <TabsTrigger value="equipment" className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Equipment</span>
              </TabsTrigger>
            </TabsList>

            {/* Instructions Tab */}
            <TabsContent value="instructions" className="mt-4 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Copy these instructions to your Claude Project for consistent research output format.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download .md
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Claude Instructions</Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => {
                    setInstructions(e.target.value);
                    setIsDirty(true);
                  }}
                  className="font-mono text-xs min-h-[400px]"
                  placeholder="Enter Claude research instructions..."
                />
              </div>

              {isDirty && (
                <Button
                  onClick={handleSaveInstructions}
                  disabled={updateInstructions.isPending}
                  className="w-full"
                >
                  {updateInstructions.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Instructions"
                  )}
                </Button>
              )}
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                RV and gear details for logistics planning.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Trailer Model</Label>
                    <Input
                      value={equipment.trailer_model}
                      onChange={(e) => setEquipment({ ...equipment, trailer_model: e.target.value })}
                      placeholder="e.g., Reflection 260"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trailer Length (ft)</Label>
                    <Input
                      type="number"
                      value={equipment.trailer_length_ft}
                      onChange={(e) => setEquipment({ ...equipment, trailer_length_ft: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tow Vehicle</Label>
                  <Input
                    value={equipment.tow_vehicle}
                    onChange={(e) => setEquipment({ ...equipment, tow_vehicle: e.target.value })}
                    placeholder="e.g., Toyota Tundra"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Gear & Connectivity</Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="starlink"
                      checked={equipment.has_starlink}
                      onCheckedChange={(checked) => setEquipment({ ...equipment, has_starlink: !!checked })}
                    />
                    <Label htmlFor="starlink" className="text-sm font-normal">
                      Starlink for internet
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bikes"
                      checked={equipment.has_bikes}
                      onCheckedChange={(checked) => setEquipment({ ...equipment, has_bikes: !!checked })}
                    />
                    <Label htmlFor="bikes" className="text-sm font-normal">
                      Family bikes
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kayak"
                      checked={equipment.has_kayak}
                      onCheckedChange={(checked) => setEquipment({ ...equipment, has_kayak: !!checked })}
                    />
                    <Label htmlFor="kayak" className="text-sm font-normal">
                      Kayak
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="paddleboard"
                      checked={equipment.has_paddleboard}
                      onCheckedChange={(checked) => setEquipment({ ...equipment, has_paddleboard: !!checked })}
                    />
                    <Label htmlFor="paddleboard" className="text-sm font-normal">
                      Paddleboard
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveEquipment}
                disabled={updateSettings.isPending}
                className="w-full"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Equipment"
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
