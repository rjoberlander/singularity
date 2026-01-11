"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  useTravelSettings,
  useUpdateTravelSettings,
  useUpdateClaudeInstructions,
  useUpdateFamilyProfile,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Settings,
  Save,
  Download,
  Upload,
  Users,
  FileCode,
  FileJson,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Map,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Travel Settings Page - 2-Phase Workflow (v3)
 *
 * Manages files for TWO Claude Projects:
 *
 * Project 1: "Trip Planner" (Phase 1)
 *   - TRIP-PLANNER-PROJECT-INSTRUCTIONS.md
 *   - family-travel-profile.json (shared)
 *   - trip-skeleton-template.json
 *
 * Project 2: "Travel Research Agent" (Phase 2)
 *   - RESEARCH-AGENT-INSTRUCTIONS-V3.md
 *   - family-travel-profile.json (shared)
 *   - research-output-template-v3-complete.json
 *
 * Phase 2 outputs COMPLETE content (full narratives, kid scripts, deep-dives). No Phase 3 needed.
 */
export default function TravelSettingsPage() {
  const { data: settings, isLoading } = useTravelSettings();
  const updateClaudeInstructions = useUpdateClaudeInstructions();
  const updateFamilyProfile = useUpdateFamilyProfile();

  const [familyProfile, setFamilyProfile] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState({
    profile: false,
  });

  // Initialize state when settings load
  useEffect(() => {
    if (settings) {
      setFamilyProfile(
        settings.family_profile
          ? JSON.stringify(settings.family_profile, null, 2)
          : getDefaultFamilyProfile()
      );
    } else if (!isLoading) {
      setFamilyProfile(getDefaultFamilyProfile());
    }
  }, [settings, isLoading]);

  const handleSaveFamilyProfile = async () => {
    try {
      const parsed = JSON.parse(familyProfile);
      await updateFamilyProfile.mutateAsync(parsed);
      setHasUnsavedChanges((prev) => ({ ...prev, profile: false }));
      toast.success("Family profile saved");
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        toast.error("Failed to save family profile");
      }
    }
  };

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

  const handleUploadFile = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    changeKey: "profile"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setter(content);
      setHasUnsavedChanges((prev) => ({ ...prev, [changeKey]: true }));
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/travel">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Travel Settings
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Setup files for the 2-phase travel planning workflow
          </p>
        </div>
        <Link href="/travel/guide">
          <Button variant="outline" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            View Workflow Guide
          </Button>
        </Link>
      </div>

      {/* Overview of Two Projects */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Two Claude Projects Required</CardTitle>
          <CardDescription>
            Two phases using separate Claude Projects, then display in your app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Map className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                  Project 1: Trip Planner
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Phase 1</strong> — Conversational planning
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• TRIP-PLANNER-PROJECT-INSTRUCTIONS.md</li>
                <li>• family-travel-profile.json</li>
                <li>• trip-skeleton-template.json</li>
              </ul>
              <div className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                Output: trip-skeleton.json
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold text-green-700 dark:text-green-400">
                  Project 2: Research Agent
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Phase 2</strong> — Deep research + COMPLETE content
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• RESEARCH-AGENT-INSTRUCTIONS-V3.md</li>
                <li>• family-travel-profile.json</li>
                <li>• research-output-template-v3-complete.json</li>
              </ul>
              <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                Output: segment-N-research.json (complete)
              </div>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-purple-500" />
                <h4 className="font-semibold text-purple-700 dark:text-purple-400">
                  Your App
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Display</strong> — Beautiful travel guide
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Import JSON once</li>
                <li>• Everything ready to view</li>
                <li>• No additional processing</li>
              </ul>
              <div className="mt-2 text-xs font-medium text-purple-600 dark:text-purple-400">
                Just display the content
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
            <strong className="text-green-700 dark:text-green-400">Key:</strong>
            <span className="text-muted-foreground ml-2">
              Phase 2 outputs COMPLETE content (2000-4000 word histories, 500-1000 word deep-dives, full kid scripts).
              No expansion phase needed.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs for Projects + Shared Files */}
      <Tabs defaultValue="trip-planner" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trip-planner" className="flex items-center gap-1.5">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Trip Planner</span>
            <span className="sm:hidden">Phase 1</span>
          </TabsTrigger>
          <TabsTrigger value="research-agent" className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Research Agent</span>
            <span className="sm:hidden">Phase 2</span>
          </TabsTrigger>
          <TabsTrigger value="family-profile" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Family Profile</span>
            <span className="sm:hidden">Profile</span>
            {hasUnsavedChanges.profile && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <FileJson className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Trip Planner Project (Phase 1) */}
        <TabsContent value="trip-planner">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-blue-500" />
                  Trip Planner Project Instructions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleDownload(
                      getTripPlannerInstructions(),
                      "TRIP-PLANNER-PROJECT-INSTRUCTIONS.md",
                      "text/markdown"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardTitle>
              <CardDescription>
                Paste this into your Claude Project&apos;s Project Instructions for the Trip Planner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[500px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {getTripPlannerInstructions()}
                </pre>
              </div>
              <div className="p-3 rounded-lg border border-dashed">
                <h4 className="text-sm font-medium mb-2">Setup Checklist for &quot;Trip Planner&quot; Project:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Create new Claude Project named &quot;Trip Planner&quot;</li>
                  <li>Paste the instructions above as Project Instructions</li>
                  <li>Upload <code>family-travel-profile.json</code> (from Family Profile tab)</li>
                  <li>Upload <code>trip-skeleton-template.json</code> (from Templates tab)</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Research Agent Project (Phase 2) */}
        <TabsContent value="research-agent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-500" />
                  Research Agent Project Instructions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleDownload(
                      getResearchAgentInstructions(),
                      "RESEARCH-AGENT-INSTRUCTIONS-V3.md",
                      "text/markdown"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardTitle>
              <CardDescription>
                Paste this into your Claude Project&apos;s Project Instructions for segment research
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[500px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {getResearchAgentInstructions()}
                </pre>
              </div>
              <div className="p-3 rounded-lg border border-dashed">
                <h4 className="text-sm font-medium mb-2">Setup Checklist for &quot;Travel Research Agent&quot; Project:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Create new Claude Project named &quot;Travel Research Agent&quot;</li>
                  <li>Paste the instructions above as Project Instructions</li>
                  <li>Upload <code>family-travel-profile.json</code> (from Family Profile tab)</li>
                  <li>Upload <code>research-output-template-v3-complete.json</code> (from Templates tab)</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Profile (Shared) */}
        <TabsContent value="family-profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Travel Profile
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="upload-profile"
                    className="hidden"
                    accept=".json"
                    onChange={(e) => handleUploadFile(e, setFamilyProfile, "profile")}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("upload-profile")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownload(
                        familyProfile,
                        "family-travel-profile.json",
                        "application/json"
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Used by BOTH Claude Projects. Upload to each as a Knowledge file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={familyProfile}
                onChange={(e) => {
                  setFamilyProfile(e.target.value);
                  setHasUnsavedChanges((prev) => ({ ...prev, profile: true }));
                }}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Enter family profile JSON..."
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {hasUnsavedChanges.profile ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      Unsaved changes
                    </span>
                  ) : settings?.family_profile ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved
                    </span>
                  ) : null}
                </p>
                <Button
                  onClick={handleSaveFamilyProfile}
                  disabled={updateFamilyProfile.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates (View Only) */}
        <TabsContent value="templates" className="space-y-4">
          {/* Trip Skeleton Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-blue-500" />
                  Trip Skeleton Template (Phase 1)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleDownload(
                      getSkeletonTemplate(),
                      "trip-skeleton-template.json",
                      "application/json"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardTitle>
              <CardDescription>
                Upload to &quot;Trip Planner&quot; project. Defines the trip skeleton structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[300px]">
                <pre className="text-xs font-mono whitespace-pre">
                  {getSkeletonTemplate()}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Research Output Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-500" />
                  Research Output Template v3 (Phase 2 - Complete)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleDownload(
                      getResearchOutputTemplate(),
                      "research-output-template-v3-complete.json",
                      "application/json"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </CardTitle>
              <CardDescription>
                Upload to &quot;Travel Research Agent&quot; project. Outputs COMPLETE content (no expansion needed).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[300px]">
                <pre className="text-xs font-mono whitespace-pre">
                  {getResearchOutputTemplate()}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Default Templates and Instructions
// ============================================================================

function getTripPlannerInstructions(): string {
  return `# Trip Planning Project - System Instructions

## Role

You are a travel planning strategist helping design the overall structure of a family trip. Your job is NOT to research specific restaurants or activities (that comes later), but to help figure out:

- What regions/cities to visit
- How many days in each place
- What order to visit them (optimizing for geography, logistics, experience flow)
- Key themes or must-do experiences per region
- Accommodation strategy
- Transportation between segments
- Realistic pacing for the family

## Your Approach

1. **Listen first** — Understand what the family wants from this trip
2. **Ask clarifying questions** — Don't assume, ask about priorities
3. **Propose options** — Give 2-3 different approaches with trade-offs
4. **Iterate** — Refine based on feedback
5. **Finalize** — Once agreed, output the trip skeleton

## What You Consider

**Geography & Logistics:**
- Driving distances between places
- One-way vs round-trip flights
- Rental car logistics (pick up/drop off locations)
- Toll roads, border crossings
- Ferry or train alternatives

**Pacing for Family:**
- Maximum 3 hours driving per day (with kids)
- Need rest days every 4-5 days
- Don't pack the first or last day
- Buffer for travel days between regions

**Experience Flow:**
- Don't cluster similar experiences (beach, beach, beach)
- Build to highlights, don't front-load everything
- Consider weather patterns by region
- End on a high note, not logistics

## Conversation Flow

### Phase 1: Discovery
Ask about:
- Total trip length and hard dates
- Must-see places or experiences
- Things they want to avoid
- Previous trips to this country/region
- Energy level and pace preference
- Any bookings already made (flights, hotels)

### Phase 2: Options
Present 2-3 different itinerary approaches:
- "The Classic" — Hit the highlights
- "The Deep Dive" — Fewer places, more time each
- "The Adventure" — Off-beaten-path focus

For each, show:
- Route description
- Day allocation per segment
- Trade-offs

### Phase 3: Refinement
Based on feedback:
- Adjust day counts
- Swap regions in/out
- Reorder for better flow
- Address concerns

### Phase 4: Finalization
Once agreed, output:
1. **Trip Overview Document** — Readable summary with reasoning (trip-plan.md)
2. **Trip Skeleton JSON** — Structured data for app import (trip-skeleton.json)

---

## Output Formats

### Trip Overview (trip-plan.md)
A readable markdown document summarizing:
- Overall vision and route
- Each segment with theme and key experiences
- Logistics (flights, car rental, driving summary)
- Pacing notes and budget considerations

### Trip Skeleton (trip-skeleton.json)
Structured JSON following the trip-skeleton-template.json format:
- Trip metadata (name, dates, logistics)
- Array of segment shells (name, dates, theme - NO detailed research)
- Accommodation strategy per segment
- Driving times between segments

---

## Important Notes

1. **Don't research specific places yet** — That's Phase 2 (Segment Research). Here we're just deciding "5 days in Lisbon" not "visit Jerónimos at 10am."

2. **The key_experiences are placeholders** — They're the obvious things to anchor the segment. The real research comes later.

3. **Be opinionated but flexible** — Give recommendations with reasoning, but adapt to their preferences.

4. **Think about the WHOLE trip** — Each segment decision affects others. Don't optimize one segment at the expense of overall flow.

5. **Family context matters** — Reference their travel style, kids' ages, preferences from the family profile.

---

## Knowledge Files You Have

- \`family-travel-profile.json\` — Their family info, travel style, preferences
- \`trip-skeleton-template.json\` — The JSON structure to output`;
}

function getResearchAgentInstructions(): string {
  return `# Travel Research Agent - Project Instructions (v3)

## Your Role

You are a travel research agent AND tour guide writer. Your job is to:
1. Research destinations deeply (50+ sources)
2. Output COMPLETE, ready-to-use content in JSON format

**The JSON you output will be imported directly into a database. The app will display it as a beautiful travel guide. There is no "expansion phase" - you must include ALL content now.**

---

## Critical Understanding

When the user uploads your JSON to their app:
- Every database field gets populated
- The frontend displays rich, beautiful content
- NO additional processing happens

**If you output summaries instead of full content, the app will display summaries.**
**If you output full narratives, the app will display full narratives.**

---

## What You Output

For each segment, output ONE JSON file: \`segment-N-research.json\`

This file must contain:

### 1. Complete City Info (2000-4000 words)

The \`segment.city_info.deep_history\` section should read like a tour guide briefing:
- Full historical narrative with specific dates, names, stories
- Written engagingly, not as bullet points
- Organized into titled sections
- Each section explains relevance to what they'll see

### 2. Complete Day Schedules

The \`days\` array should have SPECIFIC times:
- "9:00-11:00am" NOT "morning"
- Include activity notes and tips

### 3. Complete Deep-Dives for Must-Do Items

Every item with \`priority: "must_do"\` needs a full \`deep_dive\` section (500-1000 words):
- **what_it_is**: 1-2 sentence summary
- **why_it_matters**: 200-400 word narrative on significance
- **the_story**: 300-600 word origin/history story
- **what_youll_see**: Detailed highlights with descriptions
- **interesting_facts**: Fascinating details

### 4. Complete Kid Engagement Scripts

The \`kid_engagement\` section needs ACTUAL SCRIPTS - sentences to say to each child:
\`\`\`json
{
  "age_7": {
    "scripts": [
      "Count how many different things you can find carved in stone — ropes, anchors, shells, animals, plants",
      "Vasco da Gama is buried right here. He sailed to India when no one knew if it was possible."
    ]
  },
  "age_5": {
    "scripts": [
      "Look at the ceiling! Does it look like trees growing up and spreading out?",
      "Can you find a stone lion? A stone elephant?"
    ]
  },
  "age_3": {
    "scripts": [
      "Let them run (carefully) in the cloister garden",
      "Keep moving — 90 minutes max"
    ]
  }
}
\`\`\`

---

## Research Depth

For each segment:

1. **Search broadly** (50+ sources):
   - Official tourism sites
   - TripAdvisor, Google reviews
   - Travel blogs
   - Wikipedia for history
   - AllTrails for hikes
   - Local food blogs for restaurants

2. **Go deep on must-dos**:
   - Read multiple sources per item
   - Get the full story, not summaries
   - Find insider tips and specific details

3. **Capture everything**:
   - Source URLs for reference
   - Specific addresses, hours, costs
   - The stories and context, not just facts

---

## Item Priorities

- **must_do** (5-8 per segment): Full deep-dive content required
- **recommended** (5-8 per segment): Substantive content, shorter deep-dive
- **optional** (5-8 per segment): Basic info, practical details
- **backup** (3-5 per segment): Alternatives if plans change

Total: 20-30 items per segment

---

## Output Checklist

Before outputting JSON, verify:

- [ ] \`city_info.deep_history\` is 2000-4000 words of narrative
- [ ] Each day has specific times (9:00am, not "morning")
- [ ] Each \`must_do\` item has 500-1000 word \`deep_dive\`
- [ ] \`kid_engagement\` has actual scripts, not summaries
- [ ] All practical details filled (hours, costs, addresses)
- [ ] Source URLs included for every item
- [ ] JSON is valid (no trailing commas)

---

## Remember

**The app displays exactly what you output.**

- Output summaries → App shows summaries
- Output full narratives → App shows full narratives
- Output "morning" → App shows "morning"
- Output "9:00-11:00am" → App shows "9:00-11:00am"

**Do the work now. There is no Phase 2.**`;
}

function getDefaultFamilyProfile(): string {
  return JSON.stringify(
    {
      profile_version: "1.0",
      last_updated: new Date().toISOString().split("T")[0],
      family: {
        name: "Your Family",
        home_base: "Your City, Country",
        home_airport: "XXX",
        adults: [
          { name: "Adult 1", role: "Parent", notes: "" },
          { name: "Adult 2", role: "Parent", notes: "" },
        ],
        children: [
          {
            name: "Child 1",
            birth_year: 2018,
            age_at_travel: 7,
            personality: "",
            engagement_style: "",
          },
        ],
      },
      travel_style: {
        philosophy: "Slow travel with intentional experiences",
        daily_rhythm: {
          morning: {
            time: "7:00-11:00",
            type: "active",
            examples: ["hikes", "attractions", "beaches"],
            notes: "Best energy, do demanding activities",
          },
          midday: {
            time: "12:00-15:00",
            type: "rest",
            examples: ["lunch", "pool", "nap"],
            notes: "Younger kids need downtime",
          },
          afternoon: {
            time: "15:00-18:00",
            type: "moderate",
            examples: ["exploring", "shopping", "easy activities"],
          },
          evening: {
            time: "18:00-21:00",
            type: "dinner & wind-down",
            notes: "Early dinner, kids in bed by 8:30",
          },
        },
        pace: {
          level: "relaxed",
          max_activities_per_day: 2,
          rest_days_frequency: "every 3-4 days",
          driving_tolerance: "3 hours max",
        },
      },
      preferences: {
        must_haves: [{ item: "Pool access", frequency: "most days" }],
        strong_preferences: ["Local food over tourist restaurants"],
        avoid: [{ item: "Crowded tourist traps", reason: "Kids don't do well" }],
      },
      output_preferences: {
        detail_level: "comprehensive",
        style: "practical with context",
        include: {
          source_urls: true,
          kid_assessments: true,
          backup_options: true,
        },
      },
    },
    null,
    2
  );
}

function getSkeletonTemplate(): string {
  return JSON.stringify(
    {
      _template_info: {
        name: "Trip Skeleton Template",
        version: "1.0",
        description: "Output from Phase 1 (Trip Planning). Creates the trip structure with segment shells. Segment details filled in during Phase 2 (Segment Research).",
        phase: "1 - Trip Planning"
      },
      trip: {
        name: "STRING - e.g., 'Portugal Summer 2025'",
        destination_country: "STRING",
        destination_country_code: "STRING - ISO code",
        start_date: "YYYY-MM-DD",
        end_date: "YYYY-MM-DD",
        total_days: "INTEGER",
        total_nights: "INTEGER",
        traveler_count: "INTEGER",
        status: "planning",
        overview: "STRING - 2-3 paragraph trip vision",
        route_description: "STRING - geographical flow",
        logistics: {
          flights: {
            outbound: { from: "STRING", to: "STRING", date: "YYYY-MM-DD", notes: "STRING" },
            return: { from: "STRING", to: "STRING", date: "YYYY-MM-DD", notes: "STRING" }
          },
          car_rental: {
            needed: "BOOLEAN",
            pick_up_location: "STRING",
            pick_up_date: "YYYY-MM-DD",
            drop_off_location: "STRING",
            drop_off_date: "YYYY-MM-DD",
            vehicle_type: "STRING",
            notes: "STRING"
          },
          driving_summary: {
            total_hours: "DECIMAL",
            longest_single_drive: "STRING",
            notes: "STRING"
          }
        },
        budget: {
          strategy: "STRING",
          accommodation_split: "STRING - e.g., '60% points, 40% paid'",
          splurge_moments: ["ARRAY"],
          save_moments: ["ARRAY"]
        },
        pacing_notes: "STRING"
      },
      segments: [
        {
          segment_number: "INTEGER - 1, 2, 3, etc.",
          name: "STRING - e.g., 'Lisbon & Belém'",
          region: "STRING",
          start_date: "YYYY-MM-DD",
          end_date: "YYYY-MM-DD",
          nights: "INTEGER",
          days: "INTEGER",
          theme: "STRING - What this segment is about",
          why_here: "STRING - Why this place is in the itinerary",
          key_experiences: ["ARRAY - High-level must-dos (placeholders, not detailed research)"],
          location: {
            location_name: "STRING",
            country: "STRING",
            latitude: "DECIMAL",
            longitude: "DECIMAL",
            timezone: "STRING"
          },
          accommodation: {
            strategy: "STRING",
            suggested_area: "STRING",
            points_or_paid: "STRING",
            must_haves: ["ARRAY"],
            notes: "STRING"
          },
          driving: {
            from_previous: "STRING or null",
            to_next: "STRING or null",
            car_needed_here: "BOOLEAN"
          },
          priority: "must_do|recommended|flexible",
          notes: "STRING"
        }
      ],
      decision_log: {
        decisions: [
          {
            topic: "STRING - e.g., 'Route direction'",
            decision: "STRING",
            reasoning: "STRING",
            alternatives_considered: ["ARRAY"]
          }
        ]
      }
    },
    null,
    2
  );
}

function getResearchOutputTemplate(): string {
  return JSON.stringify(
    {
      _template_version: "3.0",
      _key_principle: "This JSON contains COMPLETE content. When imported to the app, all database fields are populated and ready to display. No expansion phase needed.",
      metadata: {
        trip_name: "STRING",
        segment_number: "INTEGER",
        segment_name: "STRING",
        dates: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
        total_days: "INTEGER",
        total_nights: "INTEGER",
        generated_at: "ISO DATETIME",
        version: "3.0"
      },
      segment: {
        name: "STRING",
        description: "STRING - 2-3 sentence hook",
        theme: "STRING - The story of this segment",
        location: {
          location_name: "STRING",
          country: "STRING",
          country_code: "STRING",
          latitude: "DECIMAL",
          longitude: "DECIMAL",
          timezone: "STRING"
        },
        city_info: {
          _instruction: "WRITE EVERYTHING HERE. Full tour-guide briefing.",
          intro: "STRING - 2-3 paragraphs. The hook. Why this place matters.",
          deep_history: {
            _instruction: "FULL NARRATIVE. 2000-4000 words total.",
            sections: [{
              title: "STRING - e.g., 'The Ancient Foundations (1200 BC - 711 AD)'",
              content: "STRING - 300-600 words of NARRATIVE. Tell the story.",
              relevance: "STRING - What this means for your visit"
            }]
          },
          culture: {
            overview: "STRING - 200-400 words on cultural identity",
            traditions: [{
              name: "STRING",
              story: "STRING - 200-300 words. The full story.",
              where_to_experience: "STRING",
              kid_friendly: "BOOLEAN"
            }]
          },
          cuisine: {
            overview: "STRING - Food culture narrative",
            signature_foods: [{
              name: "STRING",
              story: "STRING - 100-200 words. Origin story.",
              where_to_try: "STRING",
              kid_appeal: "STRING"
            }]
          }
        },
        accommodation: {
          recommendation: "STRING",
          area: "STRING",
          why: "STRING",
          specific_hotels: [{ name: "STRING", why_recommended: "STRING", booking_url: "STRING" }]
        },
        packing_list: [{ item: "STRING", why: "STRING" }],
        booking_priorities: {
          book_now: [{ item: "STRING", reason: "STRING", url: "STRING" }],
          book_week_ahead: [{ item: "STRING", reason: "STRING" }],
          day_before: [{ item: "STRING", reason: "STRING" }]
        }
      },
      days: {
        _instruction: "COMPLETE day-by-day schedules with specific times.",
        days: [{
          day_number: "INTEGER",
          date: "YYYY-MM-DD",
          day_of_week: "STRING",
          title: "STRING - e.g., 'Arrival & First Taste'",
          theme: "STRING",
          overview: "STRING - 2-3 sentence overview",
          schedule: [{
            time: "STRING - e.g., '9:00-11:00am'",
            activity_name: "STRING - matches research_item name",
            activity_type: "main_activity|meal|rest|transport|free_time",
            location: "STRING",
            notes: "STRING",
            is_deep_dive: "BOOLEAN"
          }],
          meals: {
            breakfast: { plan: "STRING", location: "STRING" },
            lunch: { plan: "STRING", location: "STRING" },
            dinner: { plan: "STRING", restaurant_name: "STRING" }
          },
          backup_plan: {
            if_rain: "STRING",
            if_tired: "STRING",
            if_kids_meltdown: "STRING"
          }
        }]
      },
      research_items: [{
        _instruction: "COMPLETE content for each item. Must-do items get full deep-dives.",
        item_type: "restaurant|attraction|hike|beach|activity|viewpoint|shop",
        name: "STRING",
        priority: "must_do|recommended|optional|backup",
        source_url: "STRING",
        source_name: "STRING",
        additional_sources: [{ url: "STRING", name: "STRING" }],
        location: {
          area: "STRING",
          address: "STRING",
          latitude: "DECIMAL",
          longitude: "DECIMAL",
          google_maps_url: "STRING"
        },
        practical: {
          hours: "STRING - e.g., '10am-6pm, closed Mondays'",
          cost: {
            description: "STRING",
            adult: "STRING",
            child: "STRING",
            family_total: "STRING",
            tips: "STRING"
          },
          time_needed: "STRING",
          reservation: { required: "BOOLEAN", how: "STRING", url: "STRING" },
          best_time: "STRING",
          avoid: "STRING",
          stroller: "STRING",
          tips: ["ARRAY"]
        },
        ratings: { score: "DECIMAL", count: "INTEGER", summary: "STRING" },
        deep_dive: {
          _instruction: "FULL CONTENT for must_do items. 500-1000 words.",
          what_it_is: "STRING - 1-2 sentences",
          why_it_matters: { content: "STRING - 200-400 words" },
          the_story: { content: "STRING - 300-600 words" },
          what_youll_see: [{
            name: "STRING",
            highlights: [{ name: "STRING", description: "STRING - 50-100 words" }]
          }],
          interesting_facts: ["ARRAY"],
          connections: "STRING"
        },
        kid_engagement: {
          _instruction: "FULL SCRIPTS for each age. Actual things to say.",
          age_7: {
            scripts: ["STRING - full sentences to say"],
            activities: ["ARRAY"],
            questions_to_ask: ["ARRAY"]
          },
          age_5: {
            scripts: ["STRING"],
            activities: ["ARRAY"]
          },
          age_3: {
            scripts: ["STRING"],
            activities: ["ARRAY"],
            attention_span: "STRING",
            carrier_needed: "BOOLEAN"
          },
          conversation_starters: ["ARRAY"],
          games: ["ARRAY"]
        },
        photo_opportunities: [{
          shot: "STRING",
          where: "STRING",
          when: "STRING",
          tip: "STRING"
        }],
        assigned_day: "INTEGER",
        assigned_time: "STRING - e.g., '9:00-11:00am'"
      }],
      _output_quality_checklist: {
        "city_info.deep_history": "Is this 2000-4000 words of NARRATIVE (not bullets)?",
        "days": "Does each day have specific times, not just 'morning/afternoon'?",
        "must_do_items": "Does each must_do item have full deep_dive content (500+ words)?",
        "kid_engagement": "Are these SCRIPTS (actual sentences to say), not summaries?",
        "practical_details": "Hours, costs, tips filled for every item?"
      }
    },
    null,
    2
  );
}
