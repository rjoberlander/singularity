"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Send,
  Sparkles,
} from "lucide-react";
import { Biomarker } from "@/types";
import { BiomarkerReference } from "@/data/biomarkerReference";
import {
  calculateTrend,
  getTrendColor,
  formatPercentChange,
} from "@/utils/trendCalculation";
import { useAnalyzeBiomarkerTrend } from "@/hooks/useAI";

// Status colors
const STATUS_COLORS: Record<string, string> = {
  optimal: "#6B8E5A",
  suboptimal: "#D4A84B",
  critical: "#8B4513",
};

interface BiomarkerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: BiomarkerReference;
  history: Biomarker[];
}

export function BiomarkerDetailModal({
  isOpen,
  onClose,
  reference,
  history,
}: BiomarkerDetailModalProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const analyzeMutation = useAnalyzeBiomarkerTrend();

  // Sort history chronologically
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.date_tested).getTime() - new Date(b.date_tested).getTime()
    );
  }, [history]);

  const latestValue = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  // Calculate trend
  const trendResult = useMemo(() => {
    return calculateTrend(history, reference);
  }, [history, reference]);

  // Get status of a value
  const getValueStatus = (value: number) => {
    const { optimalRange, suboptimalLowRange, suboptimalHighRange } = reference;
    if (value >= optimalRange.low && value <= optimalRange.high) return "optimal";
    if (
      (suboptimalLowRange && value >= suboptimalLowRange.low && value < optimalRange.low) ||
      (suboptimalHighRange && value > optimalRange.high && value <= suboptimalHighRange.high)
    ) return "suboptimal";
    return "critical";
  };

  const currentStatus = latestValue ? getValueStatus(latestValue.value) : "unknown";

  // Trigger AI analysis
  const handleAnalyze = async () => {
    if (!latestValue) return;

    const historyData = sortedHistory.map(b => ({
      value: b.value,
      date: b.date_tested,
    }));

    try {
      const result = await analyzeMutation.mutateAsync({
        biomarkerName: reference.name,
        currentValue: latestValue.value,
        unit: reference.unit,
        optimalRange: reference.optimalRange,
        trendDirection: trendResult.direction || "stable",
        percentChange: trendResult.percentChange,
        history: historyData,
      });
      setAiAnalysis(result.analysis);
    } catch {
      setAiAnalysis("Failed to generate analysis. Please try again.");
    }
  };

  // Get trend icon and color
  const TrendIcon = trendResult.direction === "up"
    ? TrendingUp
    : trendResult.direction === "down"
      ? TrendingDown
      : ArrowRight;
  const trendColor = getTrendColor(trendResult.health);

  // Chart dimensions
  const chartWidth = 320;
  const chartHeight = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate chart scales
  const chartData = useMemo(() => {
    if (sortedHistory.length === 0) return null;

    const values = sortedHistory.map(d => d.value);
    const minValue = Math.min(...values, reference.optimalRange.low * 0.8);
    const maxValue = Math.max(...values, reference.optimalRange.high * 1.2);
    const valueRange = maxValue - minValue;

    const scaleY = (v: number) =>
      padding.top + innerHeight - ((v - minValue) / valueRange) * innerHeight;

    const scaleX = (i: number) =>
      padding.left + (i / Math.max(sortedHistory.length - 1, 1)) * innerWidth;

    // Generate path
    const points = sortedHistory.map((d, i) => ({
      x: scaleX(i),
      y: scaleY(d.value),
      value: d.value,
      date: d.date_tested,
      status: getValueStatus(d.value),
    }));

    const linePath = points.length > 1
      ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
      : '';

    // Zone backgrounds
    const optimalTop = scaleY(reference.optimalRange.high);
    const optimalBottom = scaleY(reference.optimalRange.low);

    return {
      points,
      linePath,
      minValue,
      maxValue,
      scaleY,
      optimalTop,
      optimalBottom,
    };
  }, [sortedHistory, reference, innerHeight, innerWidth, padding]);

  // Format date for chart
  const formatChartDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0].slice(-2)}`;
    }
    return dateString;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-base">{reference.name}</span>
            {latestValue && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: STATUS_COLORS[currentStatus] || "#6B7280" }}
              >
                {latestValue.value} {reference.unit}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Compact description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {reference.description}
        </p>

        {/* Line Chart with Trend */}
        {chartData && sortedHistory.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-2">
            {/* Trend indicator */}
            <div className="flex items-center gap-2 mb-1">
              <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
              <span className="text-xs font-medium">
                {trendResult.direction === "up" ? "Trending Up" :
                 trendResult.direction === "down" ? "Trending Down" : "Stable"}
              </span>
              {trendResult.percentChange !== null && (
                <span className="text-xs text-muted-foreground">
                  {formatPercentChange(trendResult.percentChange)}
                </span>
              )}
            </div>

            {/* SVG Chart */}
            <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
              {/* Optimal zone background */}
              <rect
                x={padding.left}
                y={chartData.optimalTop}
                width={innerWidth}
                height={chartData.optimalBottom - chartData.optimalTop}
                fill={STATUS_COLORS.optimal}
                opacity={0.15}
              />

              {/* Y-axis labels */}
              <text x={padding.left - 4} y={chartData.optimalTop} textAnchor="end" dominantBaseline="middle" className="text-[8px] fill-muted-foreground">
                {reference.optimalRange.high}
              </text>
              <text x={padding.left - 4} y={chartData.optimalBottom} textAnchor="end" dominantBaseline="middle" className="text-[8px] fill-muted-foreground">
                {reference.optimalRange.low}
              </text>

              {/* Grid line at optimal boundaries */}
              <line x1={padding.left} y1={chartData.optimalTop} x2={chartWidth - padding.right} y2={chartData.optimalTop} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />
              <line x1={padding.left} y1={chartData.optimalBottom} x2={chartWidth - padding.right} y2={chartData.optimalBottom} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2,2" />

              {/* Line path */}
              {chartData.linePath && (
                <path
                  d={chartData.linePath}
                  fill="none"
                  stroke={trendColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartData.points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={STATUS_COLORS[point.status]}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  {/* Value label on last point */}
                  {i === chartData.points.length - 1 && (
                    <text
                      x={point.x}
                      y={point.y - 8}
                      textAnchor="middle"
                      className="text-[9px] font-medium fill-foreground"
                    >
                      {point.value}
                    </text>
                  )}
                  {/* Date labels - first and last */}
                  {(i === 0 || i === chartData.points.length - 1) && (
                    <text
                      x={point.x}
                      y={chartHeight - 4}
                      textAnchor={i === 0 ? "start" : "end"}
                      className="text-[8px] fill-muted-foreground"
                    >
                      {formatChartDate(point.date)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        )}

        {/* Reference ranges - compact inline */}
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400">
            Optimal: {reference.optimalRange.low}-{reference.optimalRange.high}
          </span>
          {reference.suboptimalLowRange && (
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              Low: {reference.suboptimalLowRange.low}-{reference.suboptimalLowRange.high}
            </span>
          )}
          {reference.suboptimalHighRange && (
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              High: {reference.suboptimalHighRange.low}-{reference.suboptimalHighRange.high}
            </span>
          )}
        </div>

        {/* Health direction - one line */}
        <p className="text-[10px] text-muted-foreground">
          {reference.trendPreference === "lower_is_better" && (
            <>For {reference.name}, <span className="text-green-500">lower is better</span>.</>
          )}
          {reference.trendPreference === "higher_is_better" && (
            <>For {reference.name}, <span className="text-green-500">higher is better</span>.</>
          )}
          {reference.trendPreference === "range_is_optimal" && (
            <>For {reference.name}, <span className="text-green-500">staying in range</span> is ideal.</>
          )}
        </p>

        {/* AI Analysis Section */}
        <div className="border-t pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              AI Analysis
            </span>
            {!aiAnalysis && !analyzeMutation.isPending && (
              <Button
                onClick={handleAnalyze}
                disabled={!latestValue}
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2"
              >
                Analyze
              </Button>
            )}
          </div>

          {analyzeMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </div>
          )}

          {aiAnalysis && (
            <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded p-2 max-h-32 overflow-y-auto">
              {aiAnalysis}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] px-1 mt-1"
                onClick={() => {
                  setAiAnalysis(null);
                  handleAnalyze();
                }}
              >
                Re-analyze
              </Button>
            </div>
          )}

          {!aiAnalysis && !analyzeMutation.isPending && (
            <p className="text-[10px] text-muted-foreground">
              Click Analyze for personalized insights about your {reference.name} levels.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
