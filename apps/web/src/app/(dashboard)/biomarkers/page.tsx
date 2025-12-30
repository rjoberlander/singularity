"use client";

import { useState, useMemo } from "react";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { BiomarkerChartCard } from "@/components/biomarkers/BiomarkerChartCard";
import { BiomarkerExtractionModal } from "@/components/biomarkers/BiomarkerExtractionModal";
import { BiomarkerAddModal } from "@/components/biomarkers/BiomarkerAddModal";
import { BiomarkerChatInput } from "@/components/biomarkers/BiomarkerChatInput";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { BIOMARKER_REFERENCE, BiomarkerReference, getCategories } from "@/data/biomarkerReference";
import { Biomarker } from "@/types";

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

type FilterType = "all" | "withData" | "critical" | "suboptimal" | "optimal";
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
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [extractionInput, setExtractionInput] = useState<{ text?: string; files?: File[] } | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: biomarkers, isLoading, error, refetch } = useBiomarkers({ limit: 1000 });

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

  // Calculate summary stats (3 categories: optimal, suboptimal, critical)
  const summaryStats = useMemo(() => {
    let optimal = 0;
    let suboptimal = 0;
    let critical = 0;
    let noData = 0;

    BIOMARKER_REFERENCE.forEach((ref) => {
      const history = biomarkersByName.get(ref.name) || [];
      if (history.length === 0) {
        noData++;
      } else {
        const latest = history.sort(
          (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
        )[0];
        const status = getValueStatus(latest.value, ref);
        if (status === "optimal") optimal++;
        else if (status === "suboptimal") suboptimal++;
        else critical++;
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

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortType === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortType === "category") {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
        return a.name.localeCompare(b.name);
      }
      if (sortType === "status") {
        const historyA = biomarkersByName.get(a.name) || [];
        const historyB = biomarkersByName.get(b.name) || [];
        const hasDataA = historyA.length > 0;
        const hasDataB = historyB.length > 0;

        // Biomarkers with data come first
        if (hasDataA && !hasDataB) return -1;
        if (!hasDataA && hasDataB) return 1;
        if (!hasDataA && !hasDataB) return a.name.localeCompare(b.name);

        // Sort by status: critical first, then suboptimal, then optimal
        const latestA = historyA.sort(
          (x, y) => new Date(y.date_tested).getTime() - new Date(x.date_tested).getTime()
        )[0];
        const latestB = historyB.sort(
          (x, y) => new Date(y.date_tested).getTime() - new Date(x.date_tested).getTime()
        )[0];
        const statusA = getValueStatus(latestA.value, a);
        const statusB = getValueStatus(latestB.value, b);

        const statusOrder: Record<string, number> = { critical: 0, suboptimal: 1, optimal: 2 };
        return statusOrder[statusA] - statusOrder[statusB];
      }
      if (sortType === "date") {
        const historyA = biomarkersByName.get(a.name) || [];
        const historyB = biomarkersByName.get(b.name) || [];
        const latestA = historyA[0];
        const latestB = historyB[0];

        if (!latestA && !latestB) return a.name.localeCompare(b.name);
        if (!latestA) return 1;
        if (!latestB) return -1;

        return new Date(latestB.date_tested).getTime() - new Date(latestA.date_tested).getTime();
      }
      return 0;
    });

    return filtered;
  }, [filterType, sortType, selectedCategory, biomarkersByName]);

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
    setExtractionInput(data);
    setIsProcessing(true);
    setIsExtractionModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsExtractionModalOpen(open);
    if (!open) {
      setExtractionInput(undefined);
      setIsProcessing(false);
    }
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
                {/* Biomarker Summary */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1.5">BIOMARKER SUMMARY</h3>
                  {summaryStats.withData > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        For this Test {summaryStats.optimalPercent}% of your biomarkers were optimized!
                      </p>
                      <div className="space-y-1.5">
                        {/* Optimal */}
                        <div
                          className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "optimal" ? "bg-muted" : ""}`}
                          onClick={() => setFilterType(filterType === "optimal" ? "all" : "optimal")}
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLORS.optimal} strokeWidth="2">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12" strokeLinecap="round"/>
                            <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${summaryStats.optimalPercent}%`,
                                backgroundColor: STATUS_COLORS.optimal,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {summaryStats.optimalPercent}%
                          </span>
                        </div>

                        {/* Suboptimal (Yellow) */}
                        <div
                          className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "suboptimal" ? "bg-muted" : ""}`}
                          onClick={() => setFilterType(filterType === "suboptimal" ? "all" : "suboptimal")}
                        >
                          <CirclePlus className="w-4 h-4 shrink-0" style={{ color: STATUS_COLORS.suboptimal }} />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${summaryStats.suboptimalPercent}%`,
                                backgroundColor: STATUS_COLORS.suboptimal,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {summaryStats.suboptimalPercent}%
                          </span>
                        </div>

                        {/* Critical (Brown/Red) */}
                        <div
                          className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "critical" ? "bg-muted" : ""}`}
                          onClick={() => setFilterType(filterType === "critical" ? "all" : "critical")}
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLORS.critical} strokeWidth="2">
                            <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${summaryStats.criticalPercent}%`,
                                backgroundColor: STATUS_COLORS.critical,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {summaryStats.criticalPercent}%
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No biomarker data yet. Import lab results or add biomarkers to see your summary.
                    </p>
                  )}
                </div>

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
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                </div>
              </div>

              {/* Right Content - Biomarker Cards */}
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">ALL BIOMARKERS</h3>

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
                          onClick={() => {
                            // TODO: Navigate to detail view
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
      </div>

      {/* Extraction Modal */}
      <BiomarkerExtractionModal
        open={isExtractionModalOpen}
        onOpenChange={handleModalClose}
        initialInput={extractionInput}
        onSuccess={() => {
          refetch();
          handleModalClose(false);
        }}
      />

      {/* Add Manually Modal */}
      <BiomarkerAddModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
