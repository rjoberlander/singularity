"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useBiomarkers } from "@/hooks/useBiomarkers";
import { BiomarkerChartCard } from "@/components/biomarkers/BiomarkerChartCard";
import { BiomarkerExtractionModal } from "@/components/biomarkers/BiomarkerExtractionModal";
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
} from "lucide-react";
import { BIOMARKER_REFERENCE, BiomarkerReference, getCategories } from "@/data/biomarkerReference";
import { Biomarker } from "@/types";

// Status colors matching the reference image
const STATUS_COLORS = {
  optimal: "#6B8E5A",
  normal: "#C7A45C",
  outOfRange: "#8B4513",
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

type FilterType = "all" | "withData" | "outOfRange" | "optimal" | "normal";
type SortType = "name" | "category" | "status" | "date";

function getValueStatus(
  value: number,
  ref: BiomarkerReference
): "optimal" | "normal" | "outOfRange" {
  if (value < ref.referenceRange.low || value > ref.referenceRange.high) {
    return "outOfRange";
  }
  if (value >= ref.optimalRange.low && value <= ref.optimalRange.high) {
    return "optimal";
  }
  return "normal";
}

export default function BiomarkersPage() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("status");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [extractionInput, setExtractionInput] = useState<{ text?: string; file?: File } | undefined>();
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

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let optimal = 0;
    let normal = 0;
    let outOfRange = 0;
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
        else if (status === "normal") normal++;
        else outOfRange++;
      }
    });

    const total = BIOMARKER_REFERENCE.length;
    const withData = total - noData;

    return {
      optimal,
      normal,
      outOfRange,
      noData,
      total,
      withData,
      optimalPercent: withData > 0 ? Math.round((optimal / withData) * 100) : 0,
      normalPercent: withData > 0 ? Math.round((normal / withData) * 100) : 0,
      outOfRangePercent: withData > 0 ? Math.round((outOfRange / withData) * 100) : 0,
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
      if (filterType === "outOfRange" || filterType === "optimal" || filterType === "normal") {
        if (!hasData) return false;
        const latest = history.sort(
          (a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime()
        )[0];
        const status = getValueStatus(latest.value, ref);
        if (filterType === "outOfRange" && status !== "outOfRange") return false;
        if (filterType === "optimal" && status !== "optimal") return false;
        if (filterType === "normal" && status !== "normal") return false;
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

        // Sort by status: outOfRange first, then normal, then optimal
        const latestA = historyA.sort(
          (x, y) => new Date(y.date_tested).getTime() - new Date(x.date_tested).getTime()
        )[0];
        const latestB = historyB.sort(
          (x, y) => new Date(y.date_tested).getTime() - new Date(x.date_tested).getTime()
        )[0];
        const statusA = getValueStatus(latestA.value, a);
        const statusB = getValueStatus(latestB.value, b);

        const statusOrder = { outOfRange: 0, normal: 1, optimal: 2 };
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

  const handleChatSubmit = (data: { text?: string; file?: File }) => {
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
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  style={selectedCategory !== "all" ? { backgroundColor: CATEGORY_COLORS.all } : undefined}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    style={selectedCategory !== cat ? { backgroundColor: CATEGORY_COLORS[cat] || "transparent" } : undefined}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="ml-auto">
                <Link href="/biomarkers/add">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                </Link>
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

                        {/* Normal */}
                        <div
                          className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "normal" ? "bg-muted" : ""}`}
                          onClick={() => setFilterType(filterType === "normal" ? "all" : "normal")}
                        >
                          <Droplet className="w-4 h-4 shrink-0" style={{ color: STATUS_COLORS.normal }} />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${summaryStats.normalPercent}%`,
                                backgroundColor: STATUS_COLORS.normal,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {summaryStats.normalPercent}%
                          </span>
                        </div>

                        {/* Out of Range */}
                        <div
                          className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50 ${filterType === "outOfRange" ? "bg-muted" : ""}`}
                          onClick={() => setFilterType(filterType === "outOfRange" ? "all" : "outOfRange")}
                        >
                          <CirclePlus className="w-4 h-4 shrink-0" style={{ color: STATUS_COLORS.outOfRange }} />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${summaryStats.outOfRangePercent}%`,
                                backgroundColor: STATUS_COLORS.outOfRange,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {summaryStats.outOfRangePercent}%
                          </span>
                        </div>

                        {/* No Data */}
                        <div
                          className={`flex items-center gap-2 cursor-pointer rounded p-0.5 -m-0.5 transition-colors hover:bg-muted/50`}
                          onClick={() => setFilterType("all")}
                        >
                          <RefreshCcw className="w-4 h-4 shrink-0" style={{ color: STATUS_COLORS.empty }} />
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((summaryStats.noData / summaryStats.total) * 100)}%`,
                                backgroundColor: STATUS_COLORS.empty,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                            {Math.round((summaryStats.noData / summaryStats.total) * 100)}%
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
    </div>
  );
}
