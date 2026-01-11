"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  BookOpen,
  Settings,
  Upload,
  CheckCircle2,
  FileJson,
  Users,
  ListChecks,
  Plane,
  Zap,
  Search,
  Map,
  MessageSquare,
  Eye,
} from "lucide-react";

/**
 * Travel Workflow Guide Page - 2-Phase System (v3)
 *
 * The workflow is:
 * Phase 1: Trip Planning (Claude Project 1: Trip Planner) -> trip-skeleton.json
 * Phase 2: Segment Research (Claude Project 2: Research Agent) -> segment-N-research.json (COMPLETE content)
 * DONE: Display beautiful guide in app
 *
 * No expansion phase needed - Phase 2 outputs full narratives, kid scripts, and deep-dives.
 */
export default function TravelGuidePage() {
  return (
    <div className="container max-w-4xl py-6 space-y-8">
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
              <BookOpen className="h-6 w-6" />
              Trip Planning Workflow
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Two Claude Projects for comprehensive trip planning
          </p>
        </div>
      </div>

      {/* Simple Summary */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            How It Works
          </CardTitle>
          <CardDescription>
            Plan → Research → Display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre className="whitespace-pre">{`PHASE 1: "Let's plan Portugal" (back-and-forth conversation)
         → trip-skeleton.json
         → Import: Creates trip + 9 empty segment shells

PHASE 2: "Research Segment 1: Lisbon" (one per segment)
         → segment-1-research.json (COMPLETE content)
         → Import: Fills segment with everything

         Repeat for segments 2-9...

DONE: View beautiful guide in your app`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Two-Phase Architecture */}
      <Card>
        <CardHeader>
          <CardTitle>Two-Phase Architecture</CardTitle>
          <CardDescription>
            Phase 2 outputs COMPLETE content. No expansion phase needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Phase 1 */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Map className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">Phase 1: Planning</h4>
              </div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                Claude Project 1: &quot;Trip Planner&quot;
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Conversational back-and-forth</li>
                <li>• Figure out trip structure</li>
                <li>• Which regions, how many days</li>
                <li>• May take 2-3 conversations</li>
              </ul>
              <div className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
                Output: trip-skeleton.json
              </div>
            </div>

            {/* Phase 2 */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold text-green-700 dark:text-green-400">Phase 2: Research</h4>
              </div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                Claude Project 2: &quot;Research Agent&quot;
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Deep research per segment</li>
                <li>• COMPLETE narratives included</li>
                <li>• Kid scripts for each age</li>
                <li>• 2000-4000 word histories</li>
              </ul>
              <div className="mt-3 text-xs font-medium text-green-600 dark:text-green-400">
                Output: segment-N-research.json
              </div>
            </div>

            {/* Display */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-purple-500" />
                <h4 className="font-semibold text-purple-700 dark:text-purple-400">Display</h4>
              </div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
                Your App
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Import JSON once</li>
                <li>• Everything ready to view</li>
                <li>• Beautiful travel guide</li>
                <li>• No additional processing</li>
              </ul>
              <div className="mt-3 text-xs font-medium text-purple-600 dark:text-purple-400">
                Just display the content
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
            <strong className="text-green-700 dark:text-green-400">Key change from v2:</strong>
            <span className="text-muted-foreground ml-2">
              Phase 2 now outputs COMPLETE content (500-1000 word deep-dives, full kid scripts).
              No more &quot;Expand&quot; buttons or Phase 3.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Two Claude Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Two Claude Projects Required
          </CardTitle>
          <CardDescription>
            Different purposes require different instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-dashed space-y-3">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold">Project 1: &quot;Trip Planner&quot;</h4>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Purpose:</strong> Figure out overall trip structure</p>
                <p><strong>Style:</strong> Conversational, asks questions, proposes options</p>
                <p><strong>Duration:</strong> May take 2-3 sessions over days</p>
              </div>
              <div className="text-xs space-y-1">
                <div className="font-medium">Files to upload:</div>
                <ul className="text-muted-foreground">
                  <li>• TRIP-PLANNER-PROJECT-INSTRUCTIONS.md</li>
                  <li>• family-travel-profile.json</li>
                  <li>• trip-skeleton-template.json</li>
                </ul>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-dashed space-y-3">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold">Project 2: &quot;Travel Research Agent&quot;</h4>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Purpose:</strong> Deep research + COMPLETE content per segment</p>
                <p><strong>Style:</strong> Structured output, full narratives</p>
                <p><strong>Duration:</strong> One conversation per segment</p>
              </div>
              <div className="text-xs space-y-1">
                <div className="font-medium">Files to upload:</div>
                <ul className="text-muted-foreground">
                  <li>• RESEARCH-AGENT-INSTRUCTIONS-V3.md</li>
                  <li>• family-travel-profile.json</li>
                  <li>• research-output-template-v3-complete.json</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <strong className="text-amber-700 dark:text-amber-400">Why two projects?</strong>
            <span className="text-muted-foreground ml-2">
              Trip Planner is conversational and iterative. Research Agent outputs structured, complete content.
              Mixing them confuses the AI about which mode it&apos;s in.
            </span>
          </div>
          <Link href="/travel/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Download All Files from Settings
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* What Phase 2 Outputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            What Phase 2 Outputs
          </CardTitle>
          <CardDescription>
            segment-N-research.json contains COMPLETE content ready to display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium">city_info.deep_history</h4>
              <p className="text-sm text-muted-foreground">
                2000-4000 words of engaging narrative. Full historical story, not bullet points.
              </p>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium">deep_dive (per must-do item)</h4>
              <p className="text-sm text-muted-foreground">
                500-1000 words: what it is, why it matters, the story, what you&apos;ll see.
              </p>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium">kid_engagement</h4>
              <p className="text-sm text-muted-foreground">
                Actual SCRIPTS for each age (7, 5, 3): sentences to say, games to play.
              </p>
            </div>
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium">day schedules</h4>
              <p className="text-sm text-muted-foreground">
                Specific times (&quot;9:00-11:00am&quot;), not just &quot;morning&quot;.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              <strong>The key principle:</strong> The app displays exactly what Claude outputs.
              Output summaries → app shows summaries. Output full narratives → app shows full narratives.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/travel/settings">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Download all project files
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/travel/import">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload skeleton or research JSON
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/travel">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">My Trips</h3>
                  <p className="text-sm text-muted-foreground">
                    View and manage your trips
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Example Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Portugal Example</CardTitle>
          <CardDescription>
            A 30-day trip with 9 segments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre className="whitespace-pre">{`WEEK 1: Phase 1 - Planning
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Day 1-3: Conversations in Trip Planner project
         "Let's plan Portugal..."
         Back and forth on route, segments, logistics

Day 4:   Finalize and download trip-skeleton.json
         Import to app → Trip created + 9 empty segment shells


WEEK 2: Phase 2 - Research Segments 1-3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Day 1:   New conversation in Research Agent project
         "Research Segment 1: Lisbon & Belém (June 17-21)"
         Download segment-1-research.json
         Import → Segment 1 filled with COMPLETE content

Day 2:   "Research Segment 2: Cascais & Sintra (June 22-24)"
         → segment-2-research.json → Import

Day 3:   "Research Segment 3: Lagos & Sagres (June 25-29)"
         → segment-3-research.json → Import


WEEK 3: Phase 2 - Research Segments 4-6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Same pattern...


WEEK 4: Phase 2 - Research Segments 7-9
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Same pattern...


DONE
━━━━
All segments filled with complete content
View beautiful trip guide in your app
Make any manual edits/adjustments
Export to PDF for offline use`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {/* Step 1: One-Time Setup */}
            <AccordionItem value="step-1">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    1
                  </div>
                  <span>One-Time Setup</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Create Your Family Profile
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Edit and save your family profile in Settings. This is used by both Claude Projects.
                  </p>
                  <Link href="/travel/settings">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Settings
                    </Button>
                  </Link>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Map className="h-4 w-4 text-blue-500" />
                    Set Up &quot;Trip Planner&quot; Project
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Go to Claude.ai → Projects → Create New</li>
                    <li>Name it &quot;Trip Planner&quot;</li>
                    <li>Paste TRIP-PLANNER-PROJECT-INSTRUCTIONS.md as instructions</li>
                    <li>Upload: family-travel-profile.json, trip-skeleton-template.json</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Search className="h-4 w-4 text-green-500" />
                    Set Up &quot;Travel Research Agent&quot; Project
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Go to Claude.ai → Projects → Create New</li>
                    <li>Name it &quot;Travel Research Agent&quot;</li>
                    <li>Paste RESEARCH-AGENT-INSTRUCTIONS-V3.md as instructions</li>
                    <li>Upload: family-travel-profile.json, research-output-template-v3-complete.json</li>
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 2: Phase 1 - Trip Planning */}
            <AccordionItem value="step-2">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-semibold">
                    2
                  </div>
                  <span>Phase 1: Plan Your Trip</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 space-y-4">
                <p className="text-sm text-muted-foreground">
                  In the <strong>Trip Planner</strong> project, have a conversation about your trip:
                </p>
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  <pre>
{`"I want to plan a month in Portugal with my family this summer.
Flying out of LAX, June 17 - July 17, 2025."`}
                  </pre>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Claude asks about priorities, must-sees, pace preferences</li>
                  <li>Proposes 2-3 different itinerary approaches</li>
                  <li>You go back and forth refining over 1-3 conversations</li>
                  <li>When finalized, Claude outputs trip-skeleton.json</li>
                </ul>
                <div className="p-3 rounded-lg bg-blue-500/10 text-sm">
                  <strong className="text-blue-700 dark:text-blue-400">Output:</strong>
                  <span className="text-muted-foreground ml-2">
                    trip-skeleton.json with trip metadata + 9 segment shells
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 3: Import Skeleton */}
            <AccordionItem value="step-3">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    3
                  </div>
                  <span>Import Trip Skeleton</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 space-y-4">
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Download trip-skeleton.json from Claude</li>
                  <li>Go to Import Page</li>
                  <li>Select &quot;Trip Skeleton&quot; mode</li>
                  <li>Upload or paste the JSON</li>
                  <li>Click Import</li>
                </ol>
                <div className="flex items-center gap-2 text-sm">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Creates: Trip + 9 empty Segment shells (no details yet)
                  </span>
                </div>
                <Link href="/travel/import">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Go to Import
                  </Button>
                </Link>
              </AccordionContent>
            </AccordionItem>

            {/* Step 4: Phase 2 - Research */}
            <AccordionItem value="step-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-semibold">
                    4
                  </div>
                  <span>Phase 2: Research Each Segment</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 space-y-4">
                <p className="text-sm text-muted-foreground">
                  In the <strong>Travel Research Agent</strong> project, research ONE segment per conversation:
                </p>
                <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                  <pre>
{`Research Segment 1: Lisbon & Belém

Trip: Portugal Summer 2025
Dates: June 17-21, 2025 (5 days, 4 nights)
Location: Belém district, Lisbon
Accommodation: Hyatt Regency Lisbon

Theme: Age of Discovery history, iconic Lisbon experiences

Please output segment-1-research.json with COMPLETE content:
- Full city_info.deep_history (2000-4000 words)
- 25+ research items with deep-dives (500-1000 words each)
- Kid engagement SCRIPTS for each age (actual sentences to say)
- Day-by-day schedules with specific times`}
                  </pre>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 text-sm">
                  <strong className="text-green-700 dark:text-green-400">Key:</strong>
                  <span className="text-muted-foreground ml-2">
                    One NEW conversation per segment. The JSON contains COMPLETE content - no expansion needed later.
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Step 5: Import Segment Research */}
            <AccordionItem value="step-5">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    5
                  </div>
                  <span>Import Segment Research</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 space-y-4">
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Download segment-1-research.json from Claude</li>
                  <li>Go to Import Page</li>
                  <li>Select &quot;Segment Research → Existing Trip&quot; mode</li>
                  <li>Choose your trip and the segment shell to fill</li>
                  <li>Upload and import</li>
                </ol>
                <div className="flex items-center gap-2 text-sm">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Fills: Segment with COMPLETE city_info, days with schedules, 25-30 items with full deep-dives
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Repeat steps 4-5 for each segment (Segment 2, 3, 4...)
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Step 6: Done */}
            <AccordionItem value="step-6">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-semibold">
                    6
                  </div>
                  <span>View Your Trip Guide</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-11 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Once all segments are researched and imported:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>View your complete trip guide in the app</li>
                  <li>Browse segment overviews with full history narratives</li>
                  <li>See day-by-day schedules with specific times</li>
                  <li>Read deep-dives for each must-do activity</li>
                  <li>Access kid engagement scripts for each age</li>
                  <li>Make any manual edits or adjustments</li>
                </ul>
                <div className="p-3 rounded-lg bg-purple-500/10 text-sm">
                  <strong className="text-purple-700 dark:text-purple-400">That&apos;s it!</strong>
                  <span className="text-muted-foreground ml-2">
                    No expansion phase. Everything is ready to view after import.
                  </span>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Setup Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Map className="h-4 w-4 text-blue-500" />
                Trip Planner Project
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Create Claude Project &quot;Trip Planner&quot;
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Paste TRIP-PLANNER-PROJECT-INSTRUCTIONS.md
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Upload family-travel-profile.json
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Upload trip-skeleton-template.json
                  </span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Search className="h-4 w-4 text-green-500" />
                Research Agent Project
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Create Claude Project &quot;Travel Research Agent&quot;
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Paste RESEARCH-AGENT-INSTRUCTIONS-V3.md
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Upload family-travel-profile.json
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Upload research-output-template-v3-complete.json
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Investment */}
      <Card>
        <CardHeader>
          <CardTitle>Time Investment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Activity</th>
                  <th className="text-left py-2 font-medium">Time</th>
                  <th className="text-left py-2 font-medium">Frequency</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 text-muted-foreground">Phase 1 conversation</td>
                  <td className="py-2">2-3 hours</td>
                  <td className="py-2">Once per trip</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-muted-foreground">Phase 2 per segment</td>
                  <td className="py-2">30-45 min</td>
                  <td className="py-2">Once per segment</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-muted-foreground">Import to app</td>
                  <td className="py-2">2 min</td>
                  <td className="py-2">Once per segment</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Total for 30-day trip</td>
                  <td className="py-2 font-medium">~10 hours</td>
                  <td className="py-2 text-muted-foreground">Spread over weeks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
