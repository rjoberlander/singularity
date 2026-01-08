"use client";

import { useState, useMemo, useCallback } from "react";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { useBiomarkerStars, useStarBiomarker, useUnstarBiomarker } from "@/hooks/useBiomarkerStars";
import { BiomarkerChartCard } from "@/components/biomarkers/BiomarkerChartCard";
import { BiomarkerAddCombinedModal } from "@/components/biomarkers/BiomarkerAddCombinedModal";
import { BiomarkerChatInput } from "@/components/biomarkers/BiomarkerChatInput";
import { BiomarkerDuplicatesModal, findDuplicateBiomarkers } from "@/components/biomarkers/BiomarkerDuplicatesModal";
import { BiomarkerDetailModal } from "@/components/biomarkers/BiomarkerDetailModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronUp,
  ChevronDown,
  Calendar,
  Plus,
  Droplet,
  RefreshCcw,
  CircleDot,
  CirclePlus,
  Activity,
  Zap,
  Sparkles,
  Sun,
  Gem,
  Beaker,
  Bean,
  Flame,
  Heart,
  Shield,
  LucideIcon,
  Copy,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Star,
} from "lucide-react";
import { BIOMARKER_REFERENCE, BiomarkerReference, getCategories } from "@/data/biomarkerReference";
import { Biomarker } from "@/types";
import { calculateTrend } from "@/utils/trendCalculation";

// Status colors: green (optimal), yellow (suboptimal), brown (critical)
const STATUS_COLORS = {
  optimal: "#6B8E5A",    // Green - in optimal range
  suboptimal: "#D4A84B", // Yellow - in suboptimal range (not optimal but not critical)
  critical: "#8B4513",   // Brown - outside all ranges (critical)
  empty: "#9CA3AF",
};

// Category colors for button backgrounds (transparent)
const CATEGORY_COLORS: Record<string, string> = {
  all: "rgba(107, 142, 90, 0.2)",      // green
  blood: "rgba(220, 38, 38, 0.2)",     // red
  lipid: "rgba(249, 115, 22, 0.2)",    // orange
  metabolic: "rgba(234, 179, 8, 0.2)", // yellow
  thyroid: "rgba(139, 92, 246, 0.2)",  // purple
  hormone: "rgba(236, 72, 153, 0.2)",  // pink
  vitamin: "rgba(34, 197, 94, 0.2)",   // green
  mineral: "rgba(20, 184, 166, 0.2)",  // teal
  liver: "rgba(168, 85, 247, 0.2)",    // violet
  kidney: "rgba(59, 130, 246, 0.2)",   // blue
  inflammation: "rgba(239, 68, 68, 0.2)", // red-500
  cardiac: "rgba(244, 63, 94, 0.2)",   // rose
  immune: "rgba(6, 182, 212, 0.2)",    // cyan
};

// Category icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  blood: Droplet,
  lipid: CircleDot,
  metabolic: Activity,
  thyroid: Zap,
  hormone: Sparkles,
  vitamin: Sun,
  mineral: Gem,
  liver: Beaker,
  kidney: Bean,
  inflammation: Flame,
  cardiac: Heart,
  immune: Shield,
};

type FilterType = "all" | "withData" | "critical" | "suboptimal" | "optimal" | "starred";
type SortType = "name" | "category" | "status" | "date";

function getValueStatus(
  value: number,
  ref: BiomarkerReference
): "optimal" | "suboptimal" | "critical" {
  // 3 statuses: optimal (green), suboptimal (yellow), critical (brown)
  if (value >= ref.optimalRange.low && value <= ref.optimalRange.high) {
    return "optimal";
  }
  // Check if in suboptimal range
  const suboptLow = ref.suboptimalLowRange;
  const suboptHigh = ref.suboptimalHighRange;
  if (
    (suboptLow && value >= suboptLow.low && value < ref.optimalRange.low) ||
    (suboptHigh && value > ref.optimalRange.high && value <= suboptHigh.high)
  ) {
    return "suboptimal";
  }
  return "critical";
}

export default function BiomarkersPage() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("status");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [addModalInput, setAddModalInput] = useState<{ text?: string; files?: File[] } | undefined>();
  const [addModalInitialTab, setAddModalInitialTab] = useState<"ai" | "manual">("ai");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState<{ reference: BiomarkerReference; history: Biomarker[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: biomarkers, isLoading, error, refetch } = useBiomarkers({ limit: 1000 });
  const { data: starredBiomarkers } = useBiomarkerStars();
  const starMutation = useStarBiomarker();
  const unstarMutation = useUnstarBiomarker();

  // Create a Set of starred biomarker names for quick lookup
  const starredNames = useMemo(() => {
    return new Set(starredBiomarkers?.map(s => s.biomarker_name) || []);
  }, [starredBiomarkers]);

  // Handle star toggle
  const handleToggleStar = useCallback((biomarkerName: string) => {
    if (starredNames.has(biomarkerName)) {
      unstarMutation.mutate(biomarkerName);
    } else {
      starMutation.mutate({ biomarker_name: biomarkerName });
    }
  }, [starredNames, starMutation, unstarMutation]);

  // Detect duplicates in the biomarkers data
  const duplicateGroups = useMemo(() => {
    if (!biomarkers) return [];
    return findDuplicateBiomarkers(biomarkers);
  }, [biomarkers]);

  const totalDuplicates = useMemo(() => {
    return duplicateGroups.reduce((sum, group) => sum + group.entries.length - 1, 0);
  }, [duplicateGroups]);

  // Group user biomarkers by name for quick lookup
  const biomarkersByName = useMemo(() => {
    const map = new Map<string, Biomarker[]>();
    if (!biomarkers) return map;

    biomarkers.forEach((b) => {
      const name = b.name.toLowerCase();
      // Try to match with reference
      const matched = BIOMARKER_REFERENCE.find(
        (ref) =>
          ref.name.toLowerCase() === name ||
          ref.aliases.some((a) => a.toLowerCase() === name)
      );
      const key = matched ? matched.name : b.name;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(b);
    });

    return map;
  }, [biomarkers]);

  // Calculate summary stats (3 categories: optimal, suboptimal, critical) with trends
  const summaryStats = useMemo(() => {
    let optimal = 0;
    let suboptimal = 0;
    let critical = 0;
    let noData = 0;

    // Track trends within each status
    // Now tracks direction (up/down/stable) with health assessment
    const trends = {
      optimal: { up: 0, down: 0, stable: 0, upHealth: [] as ('good' | 'bad' | 'neutral')[], downHealth: [] as ('good' | 'bad' | 'neutral')[] },
      suboptimal: { up: 0, down: 0, stable: 0, upHealth: [] as ('good' | 'bad' | 'neutral')[], downHealth: [] as ('good' | 'bad' | 'neutral')[] },
      critical: { up: 0, down: 0, stable: 0, upHealth: [] as ('good' | 'bad' | 'neutral')[], downHealth: [] as ('good' | 'bad' | 'neutral')[] },
    };

    BIOMARKER_REFERENCE.forEach((ref) => {
      const history = biomarkersByName.get(ref.name) || [];
      if (history.length === 0) {
        noData++;
      } else {
        const sorted = [...history].sort(
          (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
        );
        const latest = sorted[0];
        const status = getValueStatus(latest.value, ref);

        if (status === "optimal") optimal++;
        else if (status === "suboptimal") suboptimal++;
        else critical++;

        // Calculate trend using same logic as card (requires 3+ readings)
        const trendResult = calculateTrend(history, ref);

        if (trendResult.direction === null) {
          // No trend (insufficient data) - don't count in trends
          // This keeps summary consistent with card icons
        } else if (trendResult.direction === "stable") {
          trends[status].stable++;
        } else if (trendResult.direction === "up") {
          trends[status].up++;
          trends[status].upHealth.push(trendResult.health || 'neutral');
        } else if (trendResult.direction === "down") {
          trends[status].down++;
          trends[status].downHealth.push(trendResult.health || 'neutral');
        }
      }
    });

    const total = BIOMARKER_REFERENCE.length;
    const withData = total - noData;

    return {
      optimal,
      suboptimal,
      critical,
      noData,
      total,
      withData,
      optimalPercent: withData > 0 ? Math.round((optimal / withData) * 100) : 0,
      suboptimalPercent: withData > 0 ? Math.round((suboptimal / withData) * 100) : 0,
      criticalPercent: withData > 0 ? Math.round((critical / withData) * 100) : 0,
      trends,
    };
  }, [biomarkersByName]);

  // Get filtered and sorted biomarkers
  const displayBiomarkers = useMemo(() => {
    let filtered = BIOMARKER_REFERENCE.filter((ref) => {
      // Category filter
      if (selectedCategory !== "all" && ref.category !== selectedCategory) {
        return false;
      }

      const history = biomarkersByName.get(ref.name) || [];
      const hasData = history.length > 0;

      // Filter type
      if (filterType === "withData" && !hasData) return false;
      if (filterType === "starred" && !starredNames.has(ref.name)) return false;
      if (filterType === "critical" || filterType === "suboptimal" || filterType === "optimal") {
        if (!hasData) return false;
        const latest = history.sort(
          (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
        )[0];
        const status = getValueStatus(latest.value, ref);
        if (filterType === "critical" && status !== "critical") return false;
        if (filterType === "suboptimal" && status !== "suboptimal") return false;
        if (filterType === "optimal" && status !== "optimal") return false;
      }

      // Search filter with fuzzy matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = ref.name.toLowerCase();
        const category = ref.category.toLowerCase();

        // Direct match
        if (name.includes(query) || category.includes(query)) {
          return true;
        }

        // Alias match
        const aliasMatch = ref.aliases.some(alias => alias.toLowerCase().includes(query));
        if (aliasMatch) return true;

        // Fuzzy match - check if query words appear in name
        const queryWords = query.split(/\s+/);
        if (queryWords.every(word => name.includes(word))) {
          return true;
        }

        // Abbreviation match (e.g., "ldl" matches "LDL Cholesterol")
        const abbreviation = name.split(/\s+/).map(w => w[0]).join("").toLowerCase();
        if (abbreviation.includes(query) || query.includes(abbreviation)) {
          return true;
        }

        return false;
      }

      return true;
    });

    // Sort - always put items with no data at the bottom
    filtered.sort((a, b) => {
      const historyA = biomarkersByName.get(a.name) || [];
      const historyB = biomarkersByName.get(b.name) || [];
      const hasDataA = historyA.length > 0;
      const hasDataB = historyB.length > 0;

      // Always put items without data at the bottom
      if (hasDataA && !hasDataB) return -1;
      if (!hasDataA && hasDataB) return 1;
      if (!hasDataA && !hasDataB) return a.name.localeCompare(b.name);

      // Both have data - apply the selected sort
      if (sortType === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortType === "category") {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
        return a.name.localeCompare(b.name);
      }
      if (sortType === "status") {
        // Sort by status: critical first, then suboptimal, then optimal
        // Use same logic as BiomarkerChartCard: sort ascending by date, then by id for stable sort
        const sortedA = [...historyA].sort((x, y) => {
          const dateDiff = new Date(x.date_tested).getTime() - new Date(y.date_tested).getTime();
          if (dateDiff !== 0) return dateDiff;
          // Secondary sort by id for stable ordering when dates match
          return (x.id || '').localeCompare(y.id || '');
        });
        const sortedB = [...historyB].sort((x, y) => {
          const dateDiff = new Date(x.date_tested).getTime() - new Date(y.date_tested).getTime();
          if (dateDiff !== 0) return dateDiff;
          return (x.id || '').localeCompare(y.id || '');
        });
        // Get the last (most recent) entry, matching BiomarkerChartCard logic
        const latestA = sortedA[sortedA.length - 1];
        const latestB = sortedB[sortedB.length - 1];
        const statusA = getValueStatus(latestA.value, a);
        const statusB = getValueStatus(latestB.value, b);

        const statusOrder: Record<string, number> = { critical: 0, suboptimal: 1, optimal: 2 };
        const statusCompare = statusOrder[statusA] - statusOrder[statusB];
        if (statusCompare !== 0) return statusCompare;
        return a.name.localeCompare(b.name);
      }
      if (sortType === "date") {
        const sortedA = [...historyA].sort(
          (x, y) => new Date(y.date_tested).getTime() - new Date(x.date_tested).getTime()
        );
        const sortedB = [...historyB].sort(
          (x, y) => new Date(y.date_tested).getTime() - new Date(x.date_tested).getTime()
        );
        return new Date(sortedB[0].date_tested).getTime() - new Date(sortedA[0].date_tested).getTime();
      }
      return 0;
    });

    return filtered;
  }, [filterType, sortType, selectedCategory, biomarkersByName, searchQuery, starredNames]);

  const categories = getCategories();

  // Get the most recent test date
  const latestTestDate = useMemo(() => {
    if (!biomarkers || biomarkers.length === 0) return null;
    const sorted = [...biomarkers].sort(
      (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
    );
    return new Date(sorted[0].date_tested);
  }, [biomarkers]);

  const formatLatestDate = () => {
    if (!latestTestDate) return "No tests yet";
    return latestTestDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleChatSubmit = (data: { text?: string; files?: File[] }) => {
    setAddModalInput(data);
    setAddModalInitialTab("ai");
    setIsProcessing(true);
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) {
      setAddModalInput(undefined);
      setIsProcessing(false);
    }
  };

  const handleAddManually = () => {
    setAddModalInput(undefined);
    setAddModalInitialTab("manual");
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h1 className="text-2xl font-semibold">Biomarkers & Lab Results</h1>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Empty State - Show inline add when no biomarkers */}
            {!isLoading && !error && biomarkers && biomarkers.length === 0 ? (
              <div className="max-w-md mx-auto py-8">
                <div className="text-center mb-6">
                  <Droplet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No biomarkers yet</h3>
                  <p className="text-muted-foreground">
                    Import lab results or add biomarkers to start tracking your health data
                  </p>
                </div>

                {/* Inline Add Interface */}
                <div className="space-y-4">
                  {/* AI Extraction Input */}
                  <BiomarkerChatInput
                    onSubmit={handleChatSubmit}
                    isProcessing={isProcessing}
                  />

                  {/* Add Manually Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAddManually}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                </div>
              </div>
            ) : (
            <>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date */}
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-background">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatLatestDate()}</span>
              </div>

              {/* Category Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  className="px-2"
                  onClick={() => setSelectedCategory("all")}
                  style={selectedCategory !== "all" ? { backgroundColor: CATEGORY_COLORS.all } : undefined}
                >
                  All
                </Button>
                {categories.map((cat) => {
                  const IconComponent = CATEGORY_ICONS[cat];
                  return (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      className="px-2"
                      onClick={() => setSelectedCategory(cat)}
                      style={selectedCategory !== cat ? { backgroundColor: CATEGORY_COLORS[cat] || "transparent" } : undefined}
                    >
                      {IconComponent && <IconComponent className="w-3.5 h-3.5 mr-1" />}
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Button>
                  );
                })}
              </div>

            </div>

            {/* Main Content */}
            <div className="flex gap-4">
              {/* Left Sidebar - Summary */}
              <div className="w-52 flex-shrink-0 space-y-4">
                {/* Search Bar */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">SEARCH BIOMARKERS</h3>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search... (LDL, vitamin)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-7 h-8 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  </div>
                  {searchQuery && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {displayBiomarkers.length} of {BIOMARKER_REFERENCE.length} shown
                    </p>
                  )}
                </div>

                {/* Biomarker Summary */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">BIOMARKER SUMMARY</h3>
                  {summaryStats.withData > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        For this Test {summaryStats.optimalPercent}% of your biomarkers were optimized!
                      </p>
                      <div className="space-y-2">
                        {/* Optimal */}
                        <div>
                          <div
                            className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "optimal" ? "bg-muted" : ""}`}
                            onClick={() => setFilterType(filterType === "optimal" ? "all" : "optimal")}
                          >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLORS.optimal} strokeWidth="2">
                              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12" strokeLinecap="round"/>
                              <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${summaryStats.optimalPercent}%`,
                                  backgroundColor: STATUS_COLORS.optimal,
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                style={{ backgroundColor: STATUS_COLORS.optimal, color: '#1a1a1a' }}
                              >
                                {summaryStats.optimal}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                                {summaryStats.optimalPercent}%
                              </span>
                            </div>
                          </div>
                          {/* Trend sublist - UP=red (worse), DOWN=green (better), STABLE=gray */}
                          {(summaryStats.trends.optimal.up > 0 || summaryStats.trends.optimal.down > 0 || summaryStats.trends.optimal.stable > 0) && (
                            <div className="ml-6 mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
                              {summaryStats.trends.optimal.up > 0 && (
                                <span className="flex items-center gap-0.5 text-red-400">
                                  <ArrowUp className="w-2.5 h-2.5" />{summaryStats.trends.optimal.up}
                                </span>
                              )}
                              {summaryStats.trends.optimal.down > 0 && (
                                <span className="flex items-center gap-0.5 text-green-500">
                                  <ArrowDown className="w-2.5 h-2.5" />{summaryStats.trends.optimal.down}
                                </span>
                              )}
                              {summaryStats.trends.optimal.stable > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <ArrowRight className="w-2.5 h-2.5" />{summaryStats.trends.optimal.stable}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Suboptimal (Yellow) */}
                        <div>
                          <div
                            className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "suboptimal" ? "bg-muted" : ""}`}
                            onClick={() => setFilterType(filterType === "suboptimal" ? "all" : "suboptimal")}
                          >
                            <CirclePlus className="w-4 h-4 shrink-0" style={{ color: STATUS_COLORS.suboptimal }} />
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${summaryStats.suboptimalPercent}%`,
                                  backgroundColor: STATUS_COLORS.suboptimal,
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                style={{ backgroundColor: STATUS_COLORS.suboptimal, color: '#1a1a1a' }}
                              >
                                {summaryStats.suboptimal}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                                {summaryStats.suboptimalPercent}%
                              </span>
                            </div>
                          </div>
                          {/* Trend sublist - UP=red (worse), DOWN=green (better), STABLE=gray */}
                          {(summaryStats.trends.suboptimal.up > 0 || summaryStats.trends.suboptimal.down > 0 || summaryStats.trends.suboptimal.stable > 0) && (
                            <div className="ml-6 mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
                              {summaryStats.trends.suboptimal.up > 0 && (
                                <span className="flex items-center gap-0.5 text-red-400">
                                  <ArrowUp className="w-2.5 h-2.5" />{summaryStats.trends.suboptimal.up}
                                </span>
                              )}
                              {summaryStats.trends.suboptimal.down > 0 && (
                                <span className="flex items-center gap-0.5 text-green-500">
                                  <ArrowDown className="w-2.5 h-2.5" />{summaryStats.trends.suboptimal.down}
                                </span>
                              )}
                              {summaryStats.trends.suboptimal.stable > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <ArrowRight className="w-2.5 h-2.5" />{summaryStats.trends.suboptimal.stable}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Critical (Brown/Red) */}
                        <div>
                          <div
                            className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "critical" ? "bg-muted" : ""}`}
                            onClick={() => setFilterType(filterType === "critical" ? "all" : "critical")}
                          >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLORS.critical} strokeWidth="2">
                              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${summaryStats.criticalPercent}%`,
                                  backgroundColor: STATUS_COLORS.critical,
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1 ml-auto">
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                                style={{ backgroundColor: STATUS_COLORS.critical, color: '#fff' }}
                              >
                                {summaryStats.critical}
                              </span>
                              <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                                {summaryStats.criticalPercent}%
                              </span>
                            </div>
                          </div>
                          {/* Trend sublist - UP=red (worse), DOWN=green (better), STABLE=gray */}
                          {(summaryStats.trends.critical.up > 0 || summaryStats.trends.critical.down > 0 || summaryStats.trends.critical.stable > 0) && (
                            <div className="ml-6 mt-0.5 flex gap-2 text-[10px] text-muted-foreground">
                              {summaryStats.trends.critical.up > 0 && (
                                <span className="flex items-center gap-0.5 text-red-400">
                                  <ArrowUp className="w-2.5 h-2.5" />{summaryStats.trends.critical.up}
                                </span>
                              )}
                              {summaryStats.trends.critical.down > 0 && (
                                <span className="flex items-center gap-0.5 text-green-500">
                                  <ArrowDown className="w-2.5 h-2.5" />{summaryStats.trends.critical.down}
                                </span>
                              )}
                              {summaryStats.trends.critical.stable > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <ArrowRight className="w-2.5 h-2.5" />{summaryStats.trends.critical.stable}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No biomarker data yet. Import lab results or add biomarkers to see your summary.
                    </p>
                  )}
                </div>

                {/* Duplicates Warning */}
                {totalDuplicates > 0 && (
                  <div className="pt-3">
                    <Button
                      variant="outline"
                      className="w-full bg-yellow-500/10 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/20"
                      onClick={() => setIsDuplicatesModalOpen(true)}
                      data-testid="duplicates-button"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {totalDuplicates} Duplicate{totalDuplicates !== 1 ? "s" : ""} detected
                    </Button>
                  </div>
                )}

                {/* Chat Input - Under summary */}
                <div className="pt-4">
                  <BiomarkerChatInput onSubmit={handleChatSubmit} isProcessing={isProcessing} />
                </div>

                {/* Add Manually Button */}
                <div className="pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddManually}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                </div>
              </div>

              {/* Right Content - Biomarker Cards */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground">BIOMARKERS</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSortType("status")}
                      className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-xs transition-colors ${
                        sortType === "status"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {/* Critical ! */}
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-[10px] opacity-60">›</span>
                      {/* Suboptimal + */}
                      <CirclePlus className="w-3 h-3" />
                      <span className="text-[10px] opacity-60">›</span>
                      {/* Optimal ✓ */}
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12" strokeLinecap="round"/>
                        <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setSortType("category")}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                        sortType === "category"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Activity className="w-3 h-3" />
                      Category
                    </button>
                    <button
                      onClick={() => setSortType("name")}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                        sortType === "name"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      A→Z
                    </button>
                    <button
                      onClick={() => setSortType("date")}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                        sortType === "date"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      Recent
                    </button>
                    <span className="text-muted-foreground mx-1">|</span>
                    <button
                      onClick={() => setFilterType(filterType === "starred" ? "all" : "starred")}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                        filterType === "starred"
                          ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                          : "text-muted-foreground hover:text-yellow-500 hover:bg-muted"
                      }`}
                    >
                      <Star className={`w-3 h-3 ${filterType === "starred" ? "fill-current" : ""}`} />
                      {starredNames.size > 0 && <span>{starredNames.size}</span>}
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-[160px] rounded-lg" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-destructive">Failed to load biomarkers</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please check your connection and try again
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {displayBiomarkers.map((ref) => {
                      const history = biomarkersByName.get(ref.name) || [];
                      return (
                        <BiomarkerChartCard
                          key={ref.name}
                          reference={ref}
                          history={history}
                          isStarred={starredNames.has(ref.name)}
                          onToggleStar={() => handleToggleStar(ref.name)}
                          onClick={() => {
                            setSelectedBiomarker({ reference: ref, history });
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {displayBiomarkers.length === 0 && !isLoading && !error && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No biomarkers match your current filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </>
            )}
          </>
        )}
      </div>

      {/* Add Biomarkers Modal (Combined AI + Manual) */}
      <BiomarkerAddCombinedModal
        open={isAddModalOpen}
        onOpenChange={handleAddModalClose}
        initialInput={addModalInput}
        initialTab={addModalInitialTab}
        onSuccess={() => {
          refetch();
          handleAddModalClose(false);
        }}
      />

      {/* Duplicates Modal */}
      <BiomarkerDuplicatesModal
        open={isDuplicatesModalOpen}
        onOpenChange={setIsDuplicatesModalOpen}
        duplicates={duplicateGroups}
        onSuccess={() => refetch()}
      />

      {/* Biomarker Detail Modal */}
      {selectedBiomarker && (
        <BiomarkerDetailModal
          isOpen={!!selectedBiomarker}
          onClose={() => setSelectedBiomarker(null)}
          reference={selectedBiomarker.reference}
          history={selectedBiomarker.history}
          onDataChange={() => refetch()}
        />
      )}
    </div>
  );
}
