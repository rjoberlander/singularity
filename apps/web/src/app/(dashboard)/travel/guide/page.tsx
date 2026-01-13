"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTravelSettings, useUpdateFamilyProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  BookOpen,
  FileJson,
  Download,
  Map,
  Hotel,
  Search,
  Save,
  Loader2,
  Users,
  Calendar,
  CheckCircle2,
  Folder,
  Copy,
  ArrowDown,
  FileText,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateEditorSheet } from "@/components/travel/TemplateEditorSheet";

export default function TravelGuidePage() {
  const { data: settings, isLoading: settingsLoading } = useTravelSettings();
  const updateFamilyProfile = useUpdateFamilyProfile();
  const [familyProfile, setFamilyProfile] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Template editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<{ number: number; name: string } | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");

  // MCP prompt dialog state
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpPromptContent, setMcpPromptContent] = useState("");
  const [mcpPromptPhase, setMcpPromptPhase] = useState("");

  const openTemplateEditor = (phaseNumber: number, phaseName: string, templateKey: string) => {
    setSelectedPhase({ number: phaseNumber, name: phaseName });
    setSelectedTemplateKey(templateKey);
    setEditorOpen(true);
  };

  const openMcpPrompt = (phase: number) => {
    const prompts: Record<number, { content: string; name: string }> = {
      1: { content: getMcpPromptPhase1(), name: "Phase 1: Trip Planning" },
      2: { content: getMcpPromptPhase2(), name: "Phase 2: Hotel Research" },
      3: { content: getMcpPromptPhase3(), name: "Phase 3: Activity Research" },
    };
    const prompt = prompts[phase];
    if (prompt) {
      setMcpPromptContent(prompt.content);
      setMcpPromptPhase(prompt.name);
      setMcpDialogOpen(true);
    }
  };

  const copyMcpPrompt = () => {
    navigator.clipboard.writeText(mcpPromptContent);
    toast.success("MCP prompt copied to clipboard");
  };

  useEffect(() => {
    if (settings?.family_profile) {
      setFamilyProfile(JSON.stringify(settings.family_profile, null, 2));
    } else if (!settingsLoading) {
      setFamilyProfile(getDefaultFamilyProfile());
    }
  }, [settings, settingsLoading]);

  const handleDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSaveFamilyProfile = async () => {
    try {
      const parsed = JSON.parse(familyProfile);
      await updateFamilyProfile.mutateAsync(parsed);
      setProfileDirty(false);
      toast.success("Family profile saved");
      setProfileDialogOpen(false);
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        toast.error("Failed to save family profile");
      }
    }
  };

  return (
    <div className="container max-w-5xl py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/travel">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Travel Planning System
        </h1>
      </div>

      {/* Family Profile Card - Above Phases */}
      <Card className="bg-purple-500/5 border-purple-500/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="font-medium">Family Travel Profile</div>
                <div className="text-xs text-muted-foreground">Shared across all phases - upload to each Claude Project</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(familyProfile, "family-travel-profile.json", "application/json")}
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Family Travel Profile</DialogTitle>
                    <DialogDescription>
                      Edit your family profile. This is used by all Claude Projects.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    value={familyProfile}
                    onChange={(e) => {
                      setFamilyProfile(e.target.value);
                      setProfileDirty(true);
                    }}
                    className="font-mono text-xs min-h-[300px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(familyProfile, "family-travel-profile.json", "application/json")}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download JSON
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveFamilyProfile}
                      disabled={!profileDirty || updateFamilyProfile.isPending}
                    >
                      {updateFamilyProfile.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Save Profile
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Workflow Details - Main Section */}
      <Accordion type="single" collapsible defaultValue="workflow">
        <AccordionItem value="workflow" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium py-3">Phase Workflow Details</AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 text-sm">
              <div className="grid gap-3">
                {/* Phase 1: Trip Planning */}
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-blue-500" />
                      <div className="font-medium text-blue-700 dark:text-blue-400">Phase 1: Trip Planning</div>
                    </div>
                    <div className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">Light research</div>
                  </div>

                  {/* 3-Column Layout */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Column 1: Claude */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Claude Project</div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Folder className="h-6 w-6 text-blue-500" />
                        <span className="text-sm font-semibold">Trip Planner</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Create a new Claude Project with this name</p>
                    </div>

                    {/* Column 2: Files */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Files</div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">Input:</div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(1, "Trip Planning", "instructions")}>
                            <FileText className="h-3 w-3 mr-1" />instructions.md
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Output:</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(1, "Trip Planning", "skeleton-template")}>
                            <FileJson className="h-3 w-3 mr-1" />skeleton-template.json
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: How to Use */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">How to Use</div>
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                          <div className="text-[10px] font-semibold text-blue-600 mb-1">APP:</div>
                          <p className="text-[10px] text-muted-foreground">
                            Import on{" "}
                            <Link href="/travel" className="text-blue-600 underline hover:text-blue-700">Travel page</Link>
                            {" "}→ "Import Trip Planning" button
                          </p>
                        </div>
                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                          <div className="text-[10px] font-semibold text-blue-500 mb-1">Claude Project Instructions:</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[10px] justify-between"
                            onClick={() => openMcpPrompt(1)}
                          >
                            <span>Copy to Claude Project</span>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Paste into Claude Project's Instructions field. Claude will fetch your family profile + templates directly from Supabase via MCP.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase 2: Hotel Research */}
                <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Hotel className="h-4 w-4 text-orange-500" />
                      <div className="font-medium text-orange-700 dark:text-orange-400">Phase 2: Hotel Research</div>
                    </div>
                    <div className="text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded">Medium research</div>
                  </div>

                  {/* 3-Column Layout */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Column 1: Claude */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Claude Project</div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <Folder className="h-6 w-6 text-orange-500" />
                        <span className="text-sm font-semibold">Hotel Research</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">One conversation per segment</p>
                    </div>

                    {/* Column 2: Files */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Files</div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">Input:</div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(2, "Hotel Research", "instructions")}>
                            <FileText className="h-3 w-3 mr-1" />instructions.md
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(2, "Hotel Research", "card-inventory")}>
                            <FileJson className="h-3 w-3 mr-1" />card-inventory.json
                          </Button>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(2, "Hotel Research", "evaluation-framework")}>
                            <FileJson className="h-3 w-3 mr-1" />evaluation-framework.json
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Output:</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(2, "Hotel Research", "output-template")}>
                            <FileJson className="h-3 w-3 mr-1" />output-template.json
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: How to Use */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">How to Use</div>
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                          <div className="text-[10px] font-semibold text-orange-600 mb-1">APP:</div>
                          <p className="text-[10px] text-muted-foreground">
                            Import on trip detail page → "Import Research" → select segment
                          </p>
                        </div>
                        <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                          <div className="text-[10px] font-semibold text-orange-500 mb-1">Claude Project Instructions:</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[10px] justify-between"
                            onClick={() => openMcpPrompt(2)}
                          >
                            <span>Copy to Claude Project</span>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Paste into Claude Project's Instructions field. Claude will fetch trip data + hotel templates directly from Supabase via MCP.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase 3: Segment Research */}
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-green-500" />
                      <div className="font-medium text-green-700 dark:text-green-400">Phase 3: Segment Research</div>
                    </div>
                    <div className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">Heavy research (50+ sources)</div>
                  </div>

                  {/* 3-Column Layout */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Column 1: Claude */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Claude Project</div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <Folder className="h-6 w-6 text-green-500" />
                        <span className="text-sm font-semibold">Research Agent</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">One conversation per segment. 25-30 items with full narratives.</p>
                    </div>

                    {/* Column 2: Files */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Files</div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">Input:</div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(3, "Activity Research", "instructions")}>
                            <FileText className="h-3 w-3 mr-1" />instructions.md
                          </Button>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Output:</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] justify-start px-2" onClick={() => openTemplateEditor(3, "Activity Research", "output-template")}>
                            <FileJson className="h-3 w-3 mr-1" />output-template.json
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: How to Use */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">How to Use</div>
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                          <div className="text-[10px] font-semibold text-green-600 mb-1">APP:</div>
                          <p className="text-[10px] text-muted-foreground">
                            Import on trip detail page → "Import Research" → fills segment
                          </p>
                        </div>
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                          <div className="text-[10px] font-semibold text-red-500 mb-1">Claude Project Instructions:</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[10px] justify-between"
                            onClick={() => openMcpPrompt(3)}
                          >
                            <span>Copy to Claude Project</span>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Paste into Claude Project's Instructions field. Claude will fetch trip + segment data + research templates directly from Supabase via MCP.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase 4: Daily Assembly - AUTOMATED BY APP */}
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <div className="font-medium text-purple-700 dark:text-purple-400">Phase 4: Daily Assembly</div>
                    </div>
                    <div className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded">Automated by App</div>
                  </div>

                  {/* Different layout - App Automated */}
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Unlike Phases 1-3, this phase is <span className="font-semibold text-purple-500">fully automated</span> by the app.
                      No Claude Project needed — the app combines your Phase 2 hotel and Phase 3 research data to generate
                      precise 15-minute schedules with travel times.
                    </p>

                    {/* How it works */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                        <div className="text-2xl mb-1">📥</div>
                        <div className="text-[10px] font-semibold text-purple-600">1. Pull Data</div>
                        <p className="text-[9px] text-muted-foreground mt-1">Reads Phase 2 hotel + Phase 3 activities from database</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                        <div className="text-2xl mb-1">🗺️</div>
                        <div className="text-[10px] font-semibold text-purple-600">2. Calculate Travel</div>
                        <p className="text-[9px] text-muted-foreground mt-1">Google Maps API computes walking/driving times between locations</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                        <div className="text-2xl mb-1">⏱️</div>
                        <div className="text-[10px] font-semibold text-purple-600">3. Build Schedule</div>
                        <p className="text-[9px] text-muted-foreground mt-1">Creates 15-min precision day-by-day itinerary</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                        <div className="text-2xl mb-1">📅</div>
                        <div className="text-[10px] font-semibold text-purple-600">4. Sync Calendar</div>
                        <p className="text-[9px] text-muted-foreground mt-1">Exports all events to Google Calendar with details</p>
                      </div>
                    </div>

                    {/* Action button placeholder */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-purple-500/30 bg-purple-500/5">
                      <div>
                        <div className="text-sm font-medium text-purple-600">Ready to assemble?</div>
                        <p className="text-[10px] text-muted-foreground">Complete Phase 2 (hotel) and Phase 3 (research) first, then click "Assemble Schedule" on your trip page.</p>
                      </div>
                      <Button variant="outline" size="sm" disabled className="text-purple-600 border-purple-500/30">
                        <Calendar className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Architecture Diagram */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="font-semibold mb-3">Centralized MCP Architecture</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Custom MCP server connects Claude (Code, Projects, or API) to centralized Supabase database.
            Eliminates project isolation and enables seamless data flow between phases.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] overflow-x-auto">
            <pre className="whitespace-pre">{`┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE DATABASE                              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ phase_configs   │  │ trips           │  │ segments        │             │
│  │ - instructions  │  │ - skeleton      │  │ - research      │             │
│  │ - input_schema  │  │ - status        │  │ - hotels        │             │
│  │ - output_schema │  │ - family_id     │  │ - agenda        │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                                  │
│  │ families        │  │ workflow_logs   │                                  │
│  │ - profile       │  │ - phase         │                                  │
│  │ - preferences   │  │ - completed     │                                  │
│  └─────────────────┘  └─────────────────┘                                  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   CUSTOM MCP SERVER   │
                    │  get_phase_context()  │
                    │  save_phase_output()  │
                    │  get_workflow_status()│
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    ┌─────▼─────┐        ┌──────▼──────┐       ┌─────▼─────┐
    │  Claude   │        │   Claude    │       │  Claude   │
    │  Code     │        │   Projects  │       │   API     │
    │ (Primary) │        │ (Optional)  │       │  (App)    │
    └───────────┘        └─────────────┘       └───────────┘`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Technical Documentation Accordions */}
      <Accordion type="multiple" className="space-y-2">
        {/* Database Schema */}
        <AccordionItem value="schema" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium py-3">Supabase Schema</AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] overflow-x-auto">
                <div className="font-medium text-xs mb-1 text-foreground">families</div>
                <pre>{`id UUID PRIMARY KEY
name TEXT NOT NULL
profile JSONB NOT NULL  -- adults[], children[], home_base, preferences`}</pre>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] overflow-x-auto">
                <div className="font-medium text-xs mb-1 text-foreground">phase_configs</div>
                <pre>{`phase_id TEXT UNIQUE  -- 'trip_skeleton', 'segment_research', 'hotel_selection', etc.
phase_number INTEGER
instructions TEXT      -- Full instruction markdown
input_schema JSONB
output_schema JSONB
requires_deep_research BOOLEAN
depends_on TEXT[]      -- Array of phase_ids that must complete first`}</pre>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] overflow-x-auto">
                <div className="font-medium text-xs mb-1 text-foreground">trips</div>
                <pre>{`family_id UUID REFERENCES families(id)
name, destination_country, start_date, end_date
skeleton JSONB         -- Trip skeleton output from Phase 1
status TEXT            -- 'planning', 'researching', 'complete'
current_phase TEXT`}</pre>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] overflow-x-auto">
                <div className="font-medium text-xs mb-1 text-foreground">segments</div>
                <pre>{`trip_id UUID REFERENCES trips(id)
segment_number INTEGER, name, region, start_day, end_day

-- Phase 2 output
hotels JSONB, hotels_status TEXT, selected_hotel_id, hotels_completed_at

-- Phase 3 output
research JSONB, research_status TEXT, research_completed_at

-- Phase 4 output
agenda JSONB, agenda_status TEXT, agenda_completed_at`}</pre>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* For Claude Code */}
        <AccordionItem value="claude-code" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium py-3">For Claude Code (System Context)</AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-medium mb-2">Travel Module Database Tables:</p>
                <ul className="text-muted-foreground space-y-1 ml-3">
                  <li>• <code className="bg-muted px-1 rounded">trips</code> - Main trip records with dates, status, skeleton</li>
                  <li>• <code className="bg-muted px-1 rounded">trip_segments</code> - Regions/cities within a trip</li>
                  <li>• <code className="bg-muted px-1 rounded">trip_days</code> - Individual days with schedules</li>
                  <li>• <code className="bg-muted px-1 rounded">trip_activities</code> - Confirmed itinerary items</li>
                  <li>• <code className="bg-muted px-1 rounded">trip_research_items</code> - Research before approval</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Key API Endpoints:</p>
                <ul className="text-muted-foreground space-y-1 ml-3">
                  <li>• <code className="bg-muted px-1 rounded">POST /api/v1/travel/import</code> - Import segment research</li>
                  <li>• <code className="bg-muted px-1 rounded">POST /api/v1/travel/import/hotels</code> - Import hotel research</li>
                  <li>• <code className="bg-muted px-1 rounded">GET /api/v1/travel/trips/:id</code> - Get full trip data</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Import Flow:</p>
                <ul className="text-muted-foreground space-y-1 ml-3">
                  <li>• <strong>Skeleton import:</strong> Creates trip + empty segment shells</li>
                  <li>• <strong>Hotel import:</strong> Adds research_items with item_type='hotel' to segment</li>
                  <li>• <strong>Segment import:</strong> Fills segment with days, activities, research items</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Claude Code Commands:</p>
                <div className="bg-muted/50 rounded p-2 font-mono text-[10px]">
                  <pre>{`"What's the status of the Portugal trip?"  → get_workflow_status()
"Research segment 3 for Portugal"          → get_phase_context() → execute → save_phase_output()
"Create trip skeleton for [destination]"   → Phase 1
"Find hotels for segment [N]"              → Phase 2
"Research segment [N] for [trip]"          → Phase 3
"Build daily agenda for segment [N]"       → Phase 4`}</pre>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Claude Desktop MCP Setup */}
        <AccordionItem value="claude-setup" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium py-3">Claude Desktop MCP Setup</AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm font-medium text-blue-600 mb-2">Supabase MCP uses OAuth authentication</p>
                <p className="text-muted-foreground">
                  Claude Desktop will prompt you to log in to your Supabase account via browser when you first connect.
                </p>
              </div>

              <div>
                <p className="font-medium mb-2">Prerequisites:</p>
                <ul className="text-muted-foreground space-y-1 ml-3">
                  <li>• Claude Desktop app installed</li>
                  <li>• Supabase account (you'll login via browser)</li>
                </ul>
              </div>

              <div>
                <p className="font-medium mb-2">Step 1: Create MCP Config File</p>
                <div className="bg-muted/50 rounded p-2 font-mono text-[10px]">
                  <pre>{`# File location (Mac):
~/Library/Application Support/Claude/claude_desktop_config.json

# File location (Windows):
%APPDATA%\\Claude\\claude_desktop_config.json

# Content (uses mcp-remote proxy for OAuth):
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=fcsiqoebtpfhzreamotp"
      ]
    }
  }
}`}</pre>
                </div>
                <p className="text-muted-foreground mt-2 ml-3">
                  Note: <code className="bg-muted px-1 rounded">fcsiqoebtpfhzreamotp</code> is this project's Supabase ID. The <code className="bg-muted px-1 rounded">mcp-remote</code> package bridges Claude Desktop to Supabase's remote MCP server.
                </p>
              </div>

              <div>
                <p className="font-medium mb-2">Step 2: Restart Claude Desktop</p>
                <p className="text-muted-foreground ml-3">Quit completely (Cmd+Q / Alt+F4) and reopen Claude Desktop</p>
              </div>

              <div>
                <p className="font-medium mb-2">Step 3: Authenticate</p>
                <p className="text-muted-foreground ml-3">
                  When you first ask Claude to use Supabase, a browser window will open for OAuth login. Grant access to your Supabase account.
                </p>
              </div>

              <div>
                <p className="font-medium mb-2">Step 4: Verify Connection</p>
                <p className="text-muted-foreground ml-3">
                  Check the MCP server icon (hammer) in Claude Desktop - "supabase" should appear in the list of connected servers.
                </p>
              </div>

              <div>
                <p className="font-medium mb-2">Step 5: Test MCP Connection</p>
                <div className="bg-muted/50 rounded p-2 font-mono text-[10px]">
                  <pre>{`# In Claude Desktop, try:
"List my Supabase tables"
"Query: SELECT * FROM trips LIMIT 1"`}</pre>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Step 6: Setup Claude Projects</p>
                <p className="text-muted-foreground ml-3">
                  Create 3 Claude Projects (Trip Planner, Hotel Research, Activity Research) and paste the MCP prompts from above into each project's Instructions field.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-600 mb-1">Troubleshooting:</p>
                <ul className="text-muted-foreground space-y-1 ml-3 text-[10px]">
                  <li>• "Could not load app settings" error: Make sure JSON is valid and uses "command" not "type: http"</li>
                  <li>• "Server disconnected": Check that Node.js is installed (needed for npx)</li>
                  <li>• OAuth popup not appearing: Check browser popup blockers</li>
                  <li>• Config path Mac: <code className="bg-muted px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Template Editor Sheet */}
      <TemplateEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        phaseNumber={selectedPhase?.number || 0}
        phaseName={selectedPhase?.name || ""}
        templateKey={selectedTemplateKey}
      />

      {/* MCP Prompt Dialog */}
      <Dialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              MCP Prompt - {mcpPromptPhase}
            </DialogTitle>
            <DialogDescription>
              Copy this prompt to use with the Supabase MCP server in Claude
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto">
              {mcpPromptContent}
            </pre>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setMcpDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={copyMcpPrompt}>
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Template Content Functions ============

function getDefaultFamilyProfile(): string {
  return JSON.stringify({
    family_name: "Your Family",
    adults: [
      { name: "Parent 1", role: "parent" },
      { name: "Parent 2", role: "parent" }
    ],
    children: [
      { name: "Child 1", birth_date: "2018-01-01", age_at_trip: 7, interests: ["animals", "swimming"] }
    ],
    home_base: {
      city: "Los Angeles",
      airport: "LAX",
      timezone: "America/Los_Angeles"
    },
    travel_style: {
      pace: "moderate",
      accommodation_preference: "hotels_with_pools",
      dining: "mix_of_local_and_familiar",
      activities: ["beaches", "nature", "cultural_sites", "kid_friendly"]
    },
    constraints: {
      max_driving_per_day: "3 hours",
      need_rest_days: true,
      rest_day_frequency: "every 4-5 days"
    },
    loyalty_programs: {
      hotels: ["Marriott Bonvoy", "Hilton Honors"],
      airlines: ["United MileagePlus"]
    }
  }, null, 2);
}

function getTripPlannerInstructions(): string {
  return `# Trip Planner - Project Instructions

## Your Role
You are a travel planning assistant helping families plan multi-week trips. Your job is to have a conversation about their trip and output a trip-skeleton.json when finalized.

## Conversation Flow
1. **Discovery** - Ask about dates, must-sees, pace preferences, what they want to avoid
2. **Options** - Present 2-3 different itinerary approaches with trade-offs
3. **Refinement** - Adjust based on feedback
4. **Finalization** - Output trip-skeleton.json

## What You Consider
- Driving distances (max 3 hours/day with kids)
- Rest days every 4-5 days
- Don't front-load or back-load highlights
- Weather patterns by region
- Logistics (car rentals, flights, ferries)
- Don't cluster similar experiences (beach, beach, beach)

## Output Format
When finalized, output \`trip-skeleton.json\` with:
- Trip metadata (name, dates, traveler count, destination)
- Array of segment shells (name, dates, theme, key_experiences)
- Logistics summary
- NO detailed research - just structure

## Important
- Don't research specific restaurants/activities yet - that's Phase 3
- key_experiences are just anchors, not researched items
- Be opinionated but flexible
- Reference the family profile for context
- Think about the WHOLE trip - each segment affects others`;
}

function getHotelResearchInstructions(): string {
  return `# Hotel Research Agent - Project Instructions

## Your Role
Research and score hotel options for a trip segment. Output structured JSON with 2-4 options per segment.

## Scoring Framework (100 points)
- **Luxury/Upgrade Potential** (30pts) - Suite availability, status benefits
- **Points Value** (20pts) - Cents per point, category bonuses
- **Location** (20pts) - Walkability, proximity to activities
- **Amenities** (15pts) - Pool, breakfast, parking, kid-friendly
- **Space** (15pts) - Room size, connecting rooms, kitchen

## What to Research
- Room categories and upgrade paths
- Points vs cash pricing (calculate CPP)
- Location relative to key sites (walking distance matters)
- Family-specific amenities (pool, breakfast, cribs)
- Recent reviews (last 6 months) - especially from families

## Output Format
Output \`segment-N-hotels.json\` with:
- metadata (trip, segment, dates, nights)
- hotels array with detailed scores and booking info
- summary with top recommendation and reasoning

## Pick Types
- BEST_OVERALL - Best balance of all factors
- BEST_VALUE - Best points redemption value
- BEST_LUXURY - Premium experience
- BEST_LOCATION - Ideal positioning`;
}

function getResearchAgentInstructions(): string {
  return `# Travel Research Agent - Project Instructions (v3)

## Your Role
Deep research for ONE segment at a time. Output COMPLETE content - no expansion phase.
The JSON you output will be imported directly into the database and displayed in the app.

**If you output summaries, the app shows summaries. Output full narratives = app shows full narratives.**

## Research Depth
- 50+ sources per segment
- Official sites, TripAdvisor, blogs, AllTrails, local food blogs
- Recent reviews (last 6-12 months)
- Cross-reference multiple sources for accuracy

## What You Output
\`segment-N-research.json\` with COMPLETE content:

### 1. city_info.deep_history (2000-4000 words)
Full narrative history, not bullet points. Written engagingly like a tour guide briefing.
Organized into titled sections, each explaining relevance to what they'll see.

### 2. days array with SPECIFIC times
"9:00-11:00am" not "morning". Include activity notes and tips.

### 3. deep_dive for must_do items (500-1000 words each)
- what_it_is: 1-2 sentence summary
- why_it_matters: 200-400 word narrative on significance
- the_story: 300-600 word origin/history story
- what_youll_see: Detailed highlights with descriptions
- interesting_facts: 5-10 fascinating details

### 4. kid_engagement with ACTUAL SCRIPTS
Real sentences to say to each child by age:
- "Count how many different things you can find carved in stone — ropes, anchors, shells"
- "Look at the ceiling! Does it look like trees growing up and spreading out?"
- "Can you find a stone lion? A stone elephant?"

## Item Types
restaurant, hike, attraction, beach, activity, viewpoint, neighborhood

## Priority Levels
- must_do: Essential, don't miss (8-10 per segment)
- recommended: Great if time allows (10-15 per segment)
- optional: Nice to have (5-8 per segment)`;
}

function getSkeletonTemplate(): string {
  return JSON.stringify({
    trip: {
      name: "Trip Name",
      destination_country: "Country",
      destination_country_code: "XX",
      start_date: "2025-06-01",
      end_date: "2025-06-30",
      total_days: 30,
      total_nights: 29,
      traveler_count: 5,
      status: "planning",
      overview: "Brief trip overview describing the vision and highlights",
      route_description: "Route summary: City A → City B → City C",
      logistics: {
        flights: { outbound: "LAX → LIS", return: "LIS → LAX" },
        car_rental: { pickup: "Lisbon Airport", dropoff: "Lisbon Airport" }
      },
      budget: { estimated_total: "$X,XXX", per_day: "$XXX" },
      pacing_notes: "Notes about trip pacing and rest days"
    },
    segments: [
      {
        segment_number: 1,
        name: "Segment Name",
        region: "Region/Area",
        start_date: "2025-06-01",
        end_date: "2025-06-05",
        nights: 4,
        days: 5,
        theme: "What this segment is about",
        why_here: "Why this place matters for the trip",
        key_experiences: ["Experience 1", "Experience 2", "Experience 3"],
        location: {
          location_name: "City Name",
          country: "Country",
          latitude: 0.0,
          longitude: 0.0,
          timezone: "Europe/Lisbon"
        },
        accommodation: { strategy: "Notes about where to stay" },
        driving: { from_previous: "2.5 hours from previous segment" },
        priority: "high",
        notes: "Any special notes for this segment"
      }
    ]
  }, null, 2);
}

function getHotelOutputTemplate(): string {
  return JSON.stringify({
    metadata: {
      trip_name: "Trip Name",
      segment_number: 1,
      segment_name: "Segment Name",
      dates: { check_in: "2025-06-01", check_out: "2025-06-05" },
      nights: 4,
      generated_at: "2025-01-01T00:00:00Z"
    },
    segment_context: {
      location: "City, Country",
      key_activities: ["Activity 1", "Activity 2"],
      priorities: ["Pool for kids", "Walking distance to old town"]
    },
    hotels: [
      {
        name: "Hotel Name",
        pick_type: "BEST_OVERALL",
        brand: "Brand Name",
        loyalty_program: "Program Name",
        category: "Category Level",
        location: {
          address: "Full address",
          neighborhood: "Neighborhood name",
          lat: 0.0,
          lng: 0.0,
          walking_to_center: "10 min"
        },
        scores: {
          overall_score: 8.5,
          luxury_upgrade: 8,
          points_value: 9,
          location: 8,
          amenities: 8,
          space: 8
        },
        pricing: {
          points_per_night: 50000,
          cash_per_night: 250,
          total_points: 200000,
          total_cash: 1000,
          cpp: 0.5
        },
        room_recommendation: "Room type recommendation",
        upgrade_potential: "Notes about upgrade possibilities",
        family_amenities: ["Pool", "Breakfast included", "Cribs available"],
        why_recommended: "Detailed explanation of why this hotel",
        booking_notes: "Any booking tips or warnings"
      }
    ],
    summary: {
      top_recommendation: {
        hotel_name: "Hotel Name",
        reason: "Why this is the top pick"
      },
      alternatives_summary: "Brief on why you might choose alternatives"
    }
  }, null, 2);
}

function getResearchOutputTemplate(): string {
  return JSON.stringify({
    metadata: {
      trip_name: "Trip Name",
      segment_number: 1,
      segment_name: "Segment Name",
      dates: { start: "2025-06-01", end: "2025-06-05" },
      total_days: 5,
      generated_at: "2025-01-01T00:00:00Z",
      version: "3.0"
    },
    segment: {
      name: "Segment Name",
      city_info: {
        deep_history: {
          sections: [
            { title: "Section Title", content: "2000-4000 words of narrative history...", relevance: "Why this matters for their visit" }
          ]
        },
        culture: { summary: "Cultural context and tips" },
        practical: { best_time_to_visit: "", weather: "", local_tips: [] }
      },
      packing_additions: ["Items specific to this segment"]
    },
    research_items: [
      {
        item_type: "attraction",
        name: "Item Name",
        category: "Category",
        priority: "must_do",
        why_relevant: "Why this matters for this family",
        location: { name: "", address: "", lat: 0, lng: 0, google_maps_url: "" },
        practical: {
          hours: "9am-6pm",
          duration: "2-3 hours",
          cost: "$XX per adult",
          reservation_required: true,
          booking_url: ""
        },
        deep_dive: {
          what_it_is: "1-2 sentence summary",
          why_it_matters: { content: "200-400 word narrative on significance" },
          the_story: { content: "300-600 word origin/history story" },
          what_youll_see: [{ area: "Area name", highlights: ["Highlight 1", "Highlight 2"] }],
          interesting_facts: ["Fact 1", "Fact 2"]
        },
        kid_engagement: {
          parker: { age_at_trip: 7, scripts: ["Script for 7-year-old"] },
          charlotte: { age_at_trip: 5, scripts: ["Script for 5-year-old"] },
          xander: { age_at_trip: 3, scripts: ["Script for 3-year-old"] }
        },
        photo_spots: [{ shot: "Shot description", where: "Location", when: "Best time" }],
        tips: ["Tip 1", "Tip 2"]
      }
    ],
    days: [
      {
        day_number: 1,
        date: "2025-06-01",
        title: "Day Title",
        theme: "Day theme",
        schedule: [
          { time: "9:00-11:00am", activity_name: "Activity Name", location: "Location", notes: "Tips" }
        ],
        meals: {
          breakfast: { recommendation: "", notes: "" },
          lunch: { recommendation: "", notes: "" },
          dinner: { recommendation: "", notes: "" }
        }
      }
    ]
  }, null, 2);
}

function getCardInventoryTemplate(): string {
  return JSON.stringify({
    _file_info: {
      name: "Card Inventory",
      version: "1.0",
      description: "Credit cards, points balances, and elite status for hotel research"
    },
    credit_cards: {
      active: [
        {
          card_name: "Chase Sapphire Reserve",
          issuer: "Chase",
          annual_fee: 550,
          primary_use: "Travel, Dining (3x)",
          hotel_benefits: [
            "Chase Travel Portal at 1.5 cpp",
            "Transfer to Hyatt 1:1",
            "Transfer to Marriott 1:1 (poor value)"
          ],
          notes: "Primary travel card"
        }
      ],
      recommended_to_add: [
        {
          card_name: "Amex Platinum Personal",
          why_recommended: "FHR access, Marriott Gold, Hilton Gold (free breakfast)"
        }
      ]
    },
    points_balances: {
      _note: "UPDATE THESE VALUES before each hotel research session",
      chase_ultimate_rewards: {
        balance: "UPDATE_ME",
        transfer_partners_for_hotels: ["Hyatt 1:1 (best)", "Marriott 1:1 (poor)", "IHG 1:1 (ok)"],
        portal_value: "1.5 cpp via CSR"
      },
      marriott_bonvoy: { balance: "UPDATE_ME" },
      hyatt: { balance: "UPDATE_ME" },
      hilton_honors: { balance: "UPDATE_ME" }
    },
    elite_status: {
      marriott_bonvoy: { current_status: "Base Member" },
      hyatt: { current_status: "Base Member" },
      hilton_honors: { current_status: "Base Member" }
    },
    booking_strategy_summary: {
      priority_order: [
        "1. FHR for luxury properties - breakfast + credit + upgrade",
        "2. Hyatt via Chase UR transfer - best cpp value (1.7-2.0+ cpp)",
        "3. Hilton with Gold status - free breakfast adds significant value",
        "4. Chase Portal at 1.5 cpp - flexible, good for non-chain boutiques",
        "5. Cash - when points don't make sense"
      ]
    }
  }, null, 2);
}

function getHotelEvaluationFramework(): string {
  return JSON.stringify({
    _file_info: {
      name: "Hotel Evaluation Framework",
      version: "1.0",
      description: "Scoring criteria and weights for comparing hotel options",
      key_priorities: [
        "Room upgrades and views are EXTREMELY important",
        "Absolutely do NOT want courtyard-facing rooms",
        "Pool is required but doesn't need to be fancy"
      ]
    },
    evaluation_categories: {
      loyalty_and_value: {
        weight: 0.20,
        description: "Points value, elite benefits, and redemption efficiency",
        scoring: { "10": "2.0+ cpp or FHR with full benefits", "6": "1.3-1.7 cpp", "2": "<1.0 cpp" }
      },
      luxury_and_upgrade_potential: {
        weight: 0.30,
        description: "THIS IS THE MOST IMPORTANT CATEGORY. Property tier and upgrade likelihood.",
        scoring: { "10": "True luxury with high upgrade probability", "6": "Upscale, standard upgrades", "2": "Budget tier, no upgrades" }
      },
      amenities_quality: {
        weight: 0.15,
        description: "Pool (REQUIRED), dining, facilities",
        must_haves: ["Pool (non-negotiable)", "A/C"]
      },
      location: {
        weight: 0.20,
        description: "Proximity to activities, neighborhood quality"
      },
      space_and_comfort: {
        weight: 0.15,
        description: "Room size, sleeping configuration for 5"
      }
    },
    pick_type_labels: [
      { label: "BEST_OVERALL", description: "Highest weighted score" },
      { label: "BEST_VALUE", description: "Best cpp or points efficiency" },
      { label: "BEST_LUXURY", description: "Highest luxury score" },
      { label: "CASH_BACKUP", description: "Best cash option if points don't work" }
    ],
    cpp_reference: {
      hyatt: { poor: "<1.3", average: "1.5-1.7", good: "1.7-2.0", excellent: "2.0+" },
      marriott: { poor: "<0.6", average: "0.7-0.8", good: "0.85-1.0", excellent: "1.0+" },
      hilton: { poor: "<0.4", average: "0.5", good: "0.55-0.65", excellent: "0.7+" }
    }
  }, null, 2);
}

// Phase 4 (Daily Assembly) is automated by the app - no template functions needed

// ============ MCP Prompt Functions ============
// These are detailed prompts for use with Supabase MCP server

function getMcpPromptPhase1(): string {
  return `# Trip Planner - Claude Project Instructions

## Before Starting: Run This ONE Query
\`\`\`sql
SELECT
  (SELECT family_profile FROM travel_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271') as family_profile,
  (SELECT jsonb_object_agg(template_key, default_content) FROM travel_guide_template_definitions WHERE phase_number = 1) as templates
\`\`\`

This returns:
- **family_profile**: Who's traveling, ages, preferences, loyalty programs
- **templates**: instructions + skeleton-template format

## Your Role
Travel planning assistant for multi-week family trips. Conversation → trip skeleton JSON.

## Flow
1. **Discovery** - destination, dates, must-sees, pace
2. **Options** - 2-3 approaches with trade-offs
3. **Refinement** - adjust based on feedback
4. **Output** - skeleton JSON for import at http://localhost:3000/travel

## Constraints (from family_profile)
- Max 3hr driving/day with kids
- Rest days every 4-5 days
- Don't cluster similar experiences`;
}

function getMcpPromptPhase2(): string {
  return `# Hotel Research - Claude Project Instructions

## Getting Trip ID
User will paste a URL like \`http://localhost:3000/travel/[uuid]\` - extract the UUID as Trip ID.

## Before Starting: Run This ONE Query
Replace [TRIP_ID] with the UUID from the URL:
\`\`\`sql
SELECT
  (SELECT family_profile FROM travel_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271') as family_profile,
  (SELECT jsonb_object_agg(template_key, default_content) FROM travel_guide_template_definitions WHERE phase_number = 2) as templates,
  (SELECT jsonb_agg(jsonb_build_object('segment_number', segment_number, 'name', name, 'location', location_name, 'nights', nights, 'dates', start_date || ' to ' || end_date, 'accommodation', accommodation) ORDER BY segment_number) FROM trip_segments WHERE trip_id = '[TRIP_ID]') as segments
\`\`\`

This returns:
- **family_profile**: Loyalty programs, preferences, family size
- **templates**: instructions + evaluation-framework + output-template
- **segments**: All segments with accommodation requirements

## Your Role
Research 2-4 hotel options per segment. Score on: Luxury/Upgrade (30%), Points Value (20%), Location (20%), Amenities (15%), Space (15%).

## Output
For each segment: pick_type (BEST_OVERALL, BEST_VALUE, BEST_LUXURY), scores, pricing, reasoning.`;
}

function getMcpPromptPhase3(): string {
  return `# Activity Research - Claude Project Instructions

## Getting Trip ID
User will paste a URL like \`http://localhost:3000/travel/[uuid]\` - extract the UUID as Trip ID.

## Before Starting: Run This ONE Query
Replace [TRIP_ID] with the UUID from the URL:
\`\`\`sql
SELECT
  (SELECT family_profile FROM travel_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271') as family_profile,
  (SELECT jsonb_object_agg(template_key, default_content) FROM travel_guide_template_definitions WHERE phase_number = 3) as templates,
  (SELECT jsonb_agg(jsonb_build_object(
    'segment_number', segment_number,
    'name', name,
    'location', location_name,
    'nights', nights,
    'dates', start_date || ' to ' || end_date,
    'theme', theme,
    'why_here', why_here,
    'key_experiences', key_experiences,
    'research_status', research_status
  ) ORDER BY segment_number) FROM trip_segments WHERE trip_id = '[TRIP_ID]') as segments
\`\`\`

This returns:
- **family_profile**: Kids' ages, interests, dietary needs
- **templates**: instructions + output-template format
- **segments**: All segments with theme, key_experiences, research_status

## Your Role
Deep research agent for ONE segment at a time. 50+ sources → COMPLETE narratives (no summaries).

## Per Segment Output
- **8-10 must_do** with full deep_dive (500-1000 words each)
- **10-15 recommended** items
- **5-8 optional** items

## Content Requirements (CRITICAL)
Each must_do needs:
- **deep_dive.why_it_matters**: 200-400 word narrative
- **deep_dive.the_story**: 300-600 word history
- **kid_engagement**: ACTUAL SCRIPTS by age ("Look at the ceiling! Does it look like trees?")
- **city_info.deep_history**: 2000-4000 words in sections

## Output
Complete JSON → import at http://localhost:3000/travel/[trip-id] → "Import Research"`;
}
