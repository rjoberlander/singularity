"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TripPlanningPRDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    number: 1,
    id: "basics",
    title: "Trip Basics",
    color: "bg-slate-50 dark:bg-slate-900/30",
    accent: "text-slate-700 dark:text-slate-300",
    description: "Foundation data: dates, destination, origin, transportation, flights.",
    enrichment: null,
    dod: [
      "Start and end dates set",
      "Destination and origin specified",
      "Transportation type selected",
      "Flights added (if flying)",
    ],
  },
  {
    number: 2,
    id: "segments",
    title: "Segments",
    color: "bg-emerald-50 dark:bg-emerald-900/20",
    accent: "text-emerald-700 dark:text-emerald-300",
    description: "Organize the trip into regional groupings that cover all dates. Import research JSON per segment to create activities and days.",
    enrichment: "Segment-level Google Places fetch (optional — gets rating, photos for the destination itself).",
    dod: [
      "All trip dates covered by segments (no gaps)",
      "Each segment has a name, location, and dates",
      "Research JSON imported for each segment (creates activities + days)",
    ],
  },
  {
    number: 3,
    id: "accommodations",
    title: "Accommodations",
    color: "bg-blue-50 dark:bg-blue-900/20",
    accent: "text-blue-700 dark:text-blue-300",
    description: "Add hotels or lodging for each segment. Each accommodation gets its own enrichment pipeline.",
    enrichment: "Google Places (rating, photos, coordinates) + AI enrichment (parking, breakfast, amenities, guest insights from reviews).",
    dod: [
      "Every segment has at least one accommodation",
      "All accommodations Google-enriched (photos, rating)",
      "All accommodations AI-enriched (parking, breakfast, amenities, guest insights)",
    ],
  },
  {
    number: 4,
    id: "activities",
    title: "Activities",
    color: "bg-amber-50 dark:bg-amber-900/20",
    accent: "text-amber-700 dark:text-amber-300",
    description: "Review imported activities, verify coverage, and run Google Places enrichment. This is the gate check before meal research.",
    enrichment: "Google Places enrichment per activity (photos, ratings, opening hours, coordinates). Auto-triggers AI deep content + restaurant review analysis.",
    dod: [
      "All segments have imported activities",
      "Google Places enrichment run for all segments",
      "Activities have photos and ratings",
    ],
  },
  {
    number: 5,
    id: "meals",
    title: "Meal Research",
    color: "bg-orange-50 dark:bg-orange-900/20",
    accent: "text-orange-700 dark:text-orange-300",
    description: "Research authentic local restaurants using Perplexity web search + Claude synthesis. Each researched meal gets Google Places grounding and review analysis.",
    enrichment: "Perplexity web research \u2192 Claude synthesis \u2192 Google Places grounding (coordinates, photos, rating) \u2192 Review analysis (signature dishes, ambience, tips).",
    dod: [
      "Meal preferences configured",
      "All segments researched",
      "Restaurants have Google Place IDs and photos",
      "Restaurants have signature dish recommendations",
    ],
  },
  {
    number: 6,
    id: "enrichment",
    title: "Enrichment (Gap-Filler)",
    color: "bg-purple-50 dark:bg-purple-900/20",
    accent: "text-purple-700 dark:text-purple-300",
    description: "The catch-all step. Fills gaps from previous steps and generates narrative layers at trip, segment, and day levels. Each previous step owns its own enrichment \u2014 this step catches what they missed.",
    enrichment: null,
    dod: [
      "80%+ activities have deep_dive content",
      "All restaurants have review analysis (signature dishes)",
      "Trip-level country overview generated",
      "All segments have narrative synthesis",
      "All days have tour-guide narrative",
    ],
  },
  {
    number: 7,
    id: "schedule",
    title: "Schedule & Timing",
    color: "bg-rose-50 dark:bg-rose-900/20",
    accent: "text-rose-700 dark:text-rose-300",
    description: "Compute travel times between activities, assemble the AI-generated daily schedule with 15-minute precision, and validate for conflicts.",
    enrichment: null,
    dod: [
      "Travel times computed for all segments",
      "Schedule assembled with 15-min precision",
      "No opening hours conflicts",
      "No booking or duration issues",
    ],
  },
];

const gapFillerItems = [
  { label: "Activity deep_dive gaps", desc: "Activities with Google Place ID but missing rich content (what_it_is, the_story, photo_spots, practical_details)" },
  { label: "Restaurant review gaps", desc: "Food activities missing signature dishes, ambience, timing tips, family tips" },
  { label: "Trip overview", desc: "30,000ft country context: history, culture, customs, currency, language, family travel tips" },
  { label: "Segment narratives", desc: "Synthesis of what you're doing in each region: ties together accommodation + activities + meals + local tips" },
  { label: "Day narratives", desc: "Tour-guide context for each day, weaving activities together with historical/cultural thread" },
];

export function TripPlanningPRDDialog({ open, onOpenChange }: TripPlanningPRDDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Trip Planning Guide</DialogTitle>
          <p className="text-xs text-muted-foreground">7-step pipeline from trip basics to final schedule. Each step owns its enrichment.</p>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className={`rounded-lg p-3 ${step.color}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{step.number}</Badge>
                  <span className={`font-semibold text-sm ${step.accent}`}>{step.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{step.description}</p>

                {step.enrichment && (
                  <div className="text-[11px] mb-2">
                    <span className="font-medium">Enrichment owned:</span>{" "}
                    <span className="text-muted-foreground">{step.enrichment}</span>
                  </div>
                )}

                {step.id === "enrichment" && (
                  <div className="space-y-1.5 mb-2">
                    <p className="text-[11px] font-medium">What this step catches:</p>
                    {gapFillerItems.map((item, i) => (
                      <div key={i} className="text-[11px] pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground ml-1">— {item.desc}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-[11px]">
                  <span className="font-medium">Done when:</span>
                  <ul className="mt-0.5 space-y-0.5">
                    {step.dod.map((item, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">&#x2713;</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {/* Enrichment hierarchy */}
            <div className="rounded-lg p-3 bg-muted/50">
              <p className="font-semibold text-sm mb-2">Content Depth Hierarchy</p>
              <div className="text-[11px] space-y-1 font-mono">
                <div className="text-muted-foreground">Portugal <span className="text-xs">(trip overview — country context)</span></div>
                <div className="pl-3 text-muted-foreground">&gt; Lisbon <span className="text-xs">(segment narrative — what you're doing here)</span></div>
                <div className="pl-6 text-muted-foreground">&gt; Day 3 <span className="text-xs">(day narrative — tour guide thread)</span></div>
                <div className="pl-9 text-muted-foreground">&gt; Jerónimos Monastery <span className="text-xs">(activity deep_dive)</span></div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
