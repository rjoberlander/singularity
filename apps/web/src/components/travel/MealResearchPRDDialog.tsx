"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface MealResearchPRDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MealResearchPRDDialog({ open, onOpenChange }: MealResearchPRDDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">Meal Research PRD</DialogTitle>
          <p className="text-xs text-muted-foreground">Route-aware restaurant planning specification. Edit in <code className="bg-muted px-1 rounded">docs/prd-meal-research.md</code></p>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">

            {/* Problem */}
            <section>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Problem</h3>
              <p className="text-sm text-muted-foreground">
                Generic meal placeholders provide no value. Meals should be the most researched, opinionated part of the trip — not an afterthought.
              </p>
            </section>

            {/* Core Principles */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Core Principles</h3>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">Route-Aware</span>
                  <span className="text-muted-foreground ml-1">— Each meal placed within that day&apos;s activity area. Walkable preferred.</span>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="font-semibold text-orange-800 dark:text-orange-300">Region-Matched</span>
                  <span className="text-muted-foreground ml-1">— Alentejo = pork/bread. Algarve = cataplana. Douro = river fish. Porto = francesinha.</span>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="font-semibold text-purple-800 dark:text-purple-300">Research-Backed</span>
                  <span className="text-muted-foreground ml-1">— Food blogs, review dish callouts, regional specialty matching — not just Google stars.</span>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="font-semibold text-blue-800 dark:text-blue-300">Independent</span>
                  <span className="text-muted-foreground ml-1">— Ignores existing meal names. Reads the schedule for location context only, then does its own research.</span>
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                  <span className="font-semibold text-rose-800 dark:text-rose-300">Plan Everything</span>
                  <span className="text-muted-foreground ml-1">— Always plans breakfast, lunch, dinner for every day. Never skips meals. You decide at trip time whether to use the plan or eat at the hotel.</span>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="font-semibold text-green-800 dark:text-green-300">Opinionated</span>
                  <span className="text-muted-foreground ml-1">— &quot;Order THIS dish&quot; — not just &quot;go to this restaurant.&quot;</span>
                </div>
              </div>
            </section>

            {/* Research Signals */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Research Signals (Priority Order)</h3>
              <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                <li><span className="text-foreground font-medium">Food blog recommendations</span> — local bloggers, Eater-style guides, &quot;where locals eat&quot;</li>
                <li><span className="text-foreground font-medium">TripAdvisor/Yelp dish callouts</span> — what reviewers say to order, not star ratings</li>
                <li><span className="text-foreground font-medium">Regional specialty matching</span> — restaurant known for that region&apos;s dishes</li>
                <li><span className="text-foreground font-medium">Google rating baseline</span> — 4.0+ / 100+ reviews as filter, not primary signal</li>
                <li><span className="text-foreground font-medium">Proximity</span> — within that day&apos;s area, walkable &gt; driving</li>
              </ol>
            </section>

            {/* Meal Types */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Meal Types</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1.5 pr-3 font-medium">Meal</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Format</th>
                      <th className="text-left py-1.5 font-medium">Research Depth</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/30">
                      <td className="py-1.5 pr-3 font-medium text-foreground">Dinner</td>
                      <td className="py-1.5 pr-3">Main event — sit-down</td>
                      <td className="py-1.5">Full: blogs, reviews, dishes, reservation tips</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-1.5 pr-3 font-medium text-foreground">Lunch</td>
                      <td className="py-1.5 pr-3">Casual — market, tasca, café</td>
                      <td className="py-1.5">Solid: local rec, what to order, lighter than dinner</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-3 font-medium text-foreground">Breakfast</td>
                      <td className="py-1.5 pr-3">Café / pastelaria / bakery</td>
                      <td className="py-1.5">Researched: best local café, what pastry to try</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Output Per Restaurant */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Output Per Restaurant</h3>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="p-1.5 bg-muted/50 rounded"><span className="font-medium">Name</span> + Google rating</div>
                <div className="p-1.5 bg-muted/50 rounded"><span className="font-medium">Top 3 dishes</span> to order with descriptions</div>
                <div className="p-1.5 bg-muted/50 rounded"><span className="font-medium">Why this place</span> — local insight</div>
                <div className="p-1.5 bg-muted/50 rounded"><span className="font-medium">Logistics</span> — reservations, cash, walk-in tips</div>
                <div className="p-1.5 bg-muted/50 rounded"><span className="font-medium">Kid-friendly dishes</span> — FYI only, not a filter</div>
                <div className="p-1.5 bg-muted/50 rounded"><span className="font-medium">Photos</span> — up to 10 from Google Places</div>
              </div>
            </section>

            {/* Options */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Options Per Meal</h3>
              <div className="flex gap-2 text-xs">
                <Badge variant="default" className="bg-amber-600">1 Primary Pick</Badge>
                <Badge variant="outline">+ 1 Backup</Badge>
              </div>
            </section>

            {/* Algorithm */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">How It Works</h3>
              <ol className="text-xs space-y-1.5 list-decimal list-inside text-muted-foreground">
                <li>Load all days in segment with activities + coordinates</li>
                <li>For each day, compute the activity area center (cluster of that day&apos;s activity locations)</li>
                <li>For each meal slot (breakfast near hotel/first activity, lunch near midday area, dinner near last activity/hotel):</li>
                <li className="ml-4">Call <span className="font-mono text-foreground">Perplexity</span> with day-specific location + regional food context</li>
                <li className="ml-4">Call <span className="font-mono text-foreground">Claude</span> to extract structured restaurant data</li>
                <li className="ml-4">Call <span className="font-mono text-foreground">Google Places</span> to ground with place_id, coords, photos</li>
                <li>Write meals to DB: insert new or replace existing, reorder sort_order to fit day flow</li>
              </ol>
            </section>

            {/* Schedule Integration */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Schedule Integration</h3>
              <p className="text-xs text-muted-foreground">
                Full control over meal activities: <span className="text-foreground font-medium">insert</span> if none exist,{" "}
                <span className="text-foreground font-medium">replace</span> existing placeholders,{" "}
                <span className="text-foreground font-medium">reorder</span> so the day flows naturally.
                Non-meal activities are never touched.
              </p>
            </section>

            {/* Preferences */}
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Preferences</h3>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-1.5 pr-3 font-medium">Setting</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Default</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/30"><td className="py-1 pr-3 text-foreground">Dining style</td><td className="py-1">Adventurous</td></tr>
                    <tr className="border-b border-border/30"><td className="py-1 pr-3 text-foreground">Budget</td><td className="py-1">No limit</td></tr>
                    <tr className="border-b border-border/30"><td className="py-1 pr-3 text-foreground">Priorities</td><td className="py-1">Authenticity + Local specialties</td></tr>
                    <tr className="border-b border-border/30"><td className="py-1 pr-3 text-foreground">Avoid</td><td className="py-1">Tourist traps</td></tr>
                    <tr className="border-b border-border/30"><td className="py-1 pr-3 text-foreground">Cuisine interests</td><td className="py-1">Regional specialties</td></tr>
                    <tr className="border-b border-border/30"><td className="py-1 pr-3 text-foreground">Dietary</td><td className="py-1">None</td></tr>
                    <tr><td className="py-1 pr-3 text-foreground">Family context</td><td className="py-1">From profile</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
