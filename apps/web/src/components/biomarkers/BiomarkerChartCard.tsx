"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Droplet,
  CircleDot,
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
import { Biomarker } from "@/types";
import { BiomarkerReference } from "@/data/biomarkerReference";

// Status colors matching the reference image
const STATUS_COLORS = {
  optimal: "#6B8E5A",    // Green
  normal: "#C7A45C",     // Tan/brown
  outOfRange: "#8B4513", // Dark brown/maroon
  empty: "#6B7280",      // Grey for no data
};

// Category colors for card backgrounds (super transparent)
const CATEGORY_COLORS: Record<string, string> = {
  blood: "rgba(220, 38, 38, 0.08)",     // red
  lipid: "rgba(249, 115, 22, 0.08)",    // orange
  metabolic: "rgba(234, 179, 8, 0.08)", // yellow
  thyroid: "rgba(139, 92, 246, 0.08)",  // purple
  hormone: "rgba(236, 72, 153, 0.08)",  // pink
  vitamin: "rgba(34, 197, 94, 0.08)",   // green
  mineral: "rgba(20, 184, 166, 0.08)",  // teal
  liver: "rgba(168, 85, 247, 0.08)",    // violet
  kidney: "rgba(59, 130, 246, 0.08)",   // blue
  inflammation: "rgba(239, 68, 68, 0.08)", // red-500
  cardiac: "rgba(244, 63, 94, 0.08)",   // rose
  immune: "rgba(6, 182, 212, 0.08)",    // cyan
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

interface BiomarkerChartCardProps {
  reference: BiomarkerReference;
  history: Biomarker[];
  onClick?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

export function BiomarkerChartCard({
  reference,
  history,
  onClick,
}: BiomarkerChartCardProps) {
  const isEmpty = history.length === 0;

  // Get sorted history (chronological)
  const sortedHistory = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(a.date_tested).getTime() - new Date(b.date_tested).getTime())
      .slice(-5); // Max 5 data bars to leave room for reference bar
  }, [history]);

  const latestValue = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  // Chart dimensions - compact
  const chartHeight = 85;
  const chartWidth = 260;
  const barWidth = 28;
  const barGap = 8;
  const yAxisWidth = 35;
  const refBarWidth = 14; // Width of the reference bar on the left
  const refBarGap = 10; // Gap between reference bar and data bars

  // Get range values
  const optLow = reference.optimalRange.low;
  const optHigh = reference.optimalRange.high;
  const refLow = reference.referenceRange.low;
  const refHigh = reference.referenceRange.high;

  // Calculate Y-axis range
  const { minY, maxY, yTicks } = useMemo(() => {
    const values = sortedHistory.map((d) => d.value);
    const maxValue = values.length > 0 ? Math.max(...values) : refHigh;

    // Always start from 0
    const chartMin = 0;
    const chartMax = Math.max(maxValue * 1.15, refHigh * 1.15);
    const chartRange = chartMax - chartMin;

    // Determine decimal places based on range magnitude
    const getDecimalPlaces = (range: number): number => {
      if (range >= 100) return 0;
      if (range >= 10) return 1;
      if (range >= 1) return 2;
      return 3;
    };

    const decimals = getDecimalPlaces(chartRange);
    const multiplier = Math.pow(10, decimals);

    const formatTick = (t: number): number => {
      if (t === 0) return 0;
      return Math.round(t * multiplier) / multiplier;
    };

    // For very small ranges (< 2), just show 0 and max
    if (chartRange < 2) {
      const formattedMax = formatTick(chartMax);
      // Add a mid-point if range is big enough
      if (chartRange > 0.5) {
        const mid = formatTick(chartRange / 2);
        if (mid !== 0 && mid !== formattedMax) {
          return {
            minY: chartMin,
            maxY: chartMax,
            yTicks: [0, mid, formattedMax],
          };
        }
      }
      return {
        minY: chartMin,
        maxY: chartMax,
        yTicks: [0, formattedMax],
      };
    }

    // For larger ranges, use meaningful boundaries
    const minTickSpacing = chartRange * 0.15; // At least 15% apart

    // Start with key boundaries
    const candidateTicks: number[] = [0];

    // Add range boundaries
    if (optHigh > 0 && optHigh < chartMax) candidateTicks.push(optHigh);
    if (refHigh > 0 && refHigh < chartMax && refHigh !== optHigh) candidateTicks.push(refHigh);

    // Add max
    candidateTicks.push(chartMax);

    // Sort
    candidateTicks.sort((a, b) => a - b);

    // Filter out ticks that are too close together
    const filteredTicks: number[] = [candidateTicks[0]];
    for (let i = 1; i < candidateTicks.length; i++) {
      const lastTick = filteredTicks[filteredTicks.length - 1];
      const currentTick = candidateTicks[i];
      const isLast = i === candidateTicks.length - 1;

      // Always keep the last tick (max)
      if (isLast) {
        // But only if it's different from the previous after formatting
        if (formatTick(currentTick) !== formatTick(lastTick)) {
          filteredTicks.push(currentTick);
        }
      } else if (currentTick - lastTick >= minTickSpacing) {
        filteredTicks.push(currentTick);
      }
    }

    // Format and deduplicate
    const formattedTicks = [...new Set(filteredTicks.map(formatTick))];

    return {
      minY: chartMin,
      maxY: chartMax,
      yTicks: formattedTicks,
    };
  }, [sortedHistory, optHigh, refHigh]);

  // Helper to convert value to Y position
  const valueToY = (value: number) => {
    return chartHeight - ((value - minY) / (maxY - minY)) * chartHeight;
  };

  // Calculate the reference bar segments (shows all range zones)
  const referenceBarSegments = useMemo(() => {
    const segments: { y: number; height: number; color: string }[] = [];
    const baseY = valueToY(minY);

    // Bottom out-of-range (below optLow) - brown
    if (optLow > minY) {
      const y = valueToY(optLow);
      segments.push({
        y,
        height: baseY - y,
        color: STATUS_COLORS.outOfRange,
      });
    }

    // Optimal range (optLow to optHigh) - green
    const optStartY = valueToY(Math.max(optLow, minY));
    const optEndY = valueToY(Math.min(optHigh, maxY));
    segments.push({
      y: optEndY,
      height: optStartY - optEndY,
      color: STATUS_COLORS.optimal,
    });

    // Normal range above optimal (optHigh to refHigh) - yellow/tan
    if (refHigh > optHigh) {
      const normalStartY = valueToY(optHigh);
      const normalEndY = valueToY(Math.min(refHigh, maxY));
      segments.push({
        y: normalEndY,
        height: normalStartY - normalEndY,
        color: STATUS_COLORS.normal,
      });
    }

    // Top out-of-range (above refHigh) - brown
    if (maxY > refHigh) {
      const outStartY = valueToY(refHigh);
      const outEndY = valueToY(maxY);
      segments.push({
        y: outEndY,
        height: outStartY - outEndY,
        color: STATUS_COLORS.outOfRange,
      });
    }

    return segments;
  }, [minY, maxY, optLow, optHigh, refHigh, valueToY]);

  // Calculate data bars - each bar is single color based on where value falls
  const bars = useMemo(() => {
    if (isEmpty) return [];

    const numBars = sortedHistory.length;
    const dataStartX = yAxisWidth + refBarWidth + refBarGap;
    const availableWidth = chartWidth - dataStartX;
    const totalBarsWidth = numBars * barWidth + (numBars - 1) * barGap;
    const startX = dataStartX + (availableWidth - totalBarsWidth) / 2;

    return sortedHistory.map((b, i) => {
      const x = startX + i * (barWidth + barGap);
      const value = b.value;
      const topY = valueToY(value);
      const bottomY = valueToY(minY);
      const height = bottomY - topY;

      // Determine bar color based on where value falls
      let color: string;
      if (value < optLow || value > refHigh) {
        color = STATUS_COLORS.outOfRange;
      } else if (value >= optLow && value <= optHigh) {
        color = STATUS_COLORS.optimal;
      } else {
        color = STATUS_COLORS.normal;
      }

      return {
        x,
        y: topY,
        height: Math.max(height, 2),
        value,
        date: b.date_tested,
        color,
      };
    });
  }, [sortedHistory, isEmpty, yAxisWidth, refBarWidth, refBarGap, chartWidth, barWidth, barGap, valueToY, minY, optLow, optHigh, refHigh]);

  // Generate placeholder bars for empty state
  const emptyBars = useMemo(() => {
    if (!isEmpty) return [];

    const seed = reference.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (i: number) => ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;

    const numBars = 5;
    const dataStartX = yAxisWidth + refBarWidth + refBarGap;
    const availableWidth = chartWidth - dataStartX;
    const totalBarsWidth = numBars * barWidth + (numBars - 1) * barGap;
    const startX = dataStartX + (availableWidth - totalBarsWidth) / 2;

    return Array.from({ length: numBars }, (_, i) => {
      const heightPercent = 0.3 + pseudoRandom(i) * 0.5;
      const height = heightPercent * chartHeight;
      const x = startX + i * (barWidth + barGap);
      const y = chartHeight - height;

      return { x, y, height, width: barWidth };
    });
  }, [isEmpty, reference.name, chartWidth, yAxisWidth, refBarWidth, refBarGap, barWidth, barGap, chartHeight]);

  // Get badge status
  const getBadgeStatus = () => {
    if (!latestValue) return "empty";
    const value = latestValue.value;
    if (value < refLow || value > refHigh) {
      return "outOfRange";
    }
    if (value >= optLow && value <= optHigh) {
      return "optimal";
    }
    return "normal";
  };

  const badgeStatus = getBadgeStatus();
  const badgeColor = STATUS_COLORS[badgeStatus];

  const getStatusIcon = () => {
    if (badgeStatus === "optimal") return "\u2191";
    if (badgeStatus === "outOfRange") return "\u25C6";
    return "\u25C6";
  };

  // Get category background color
  const categoryBgColor = CATEGORY_COLORS[reference.category] || "transparent";

  return (
    <Card
      className={`hover:border-primary/50 transition-colors cursor-pointer ${
        isEmpty
          ? "border-zinc-200 dark:border-zinc-800"
          : "border-stone-200 dark:border-zinc-700"
      }`}
      style={{ backgroundColor: categoryBgColor }}
      onClick={onClick}
    >
      <CardContent className="p-2.5 pb-1.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {(() => {
              const IconComponent = CATEGORY_ICONS[reference.category] || Plus;
              return <IconComponent className={`w-3.5 h-3.5 ${isEmpty ? "text-zinc-400 dark:text-zinc-500" : "text-foreground"}`} />;
            })()}
            <h3 className={`font-medium text-sm ${isEmpty ? "text-zinc-500 dark:text-zinc-400" : "text-foreground"}`}>
              {reference.name}
            </h3>
          </div>
          {latestValue ? (
            <span
              className="px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1"
              style={{ backgroundColor: badgeColor }}
            >
              <span>{getStatusIcon()}</span>
              <span>
                {latestValue.value} {reference.unit}
              </span>
            </span>
          ) : (
            <span
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: STATUS_COLORS.empty }}
            >
              No Data
            </span>
          )}
        </div>

        {/* Chart */}
        <svg
          width="100%"
          viewBox={`0 0 ${chartWidth} ${chartHeight + 16}`}
          className="overflow-visible"
        >
          {/* Y-axis labels */}
          {yTicks.map((tick, i) => {
            const y = valueToY(tick);
            return (
              <g key={i}>
                <text
                  x={yAxisWidth - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className={`text-[11px] font-medium ${isEmpty ? "fill-zinc-400 dark:fill-zinc-500" : "fill-stone-600 dark:fill-zinc-400"}`}
                >
                  {tick}
                </text>
                <line
                  x1={yAxisWidth}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  className={isEmpty ? "stroke-zinc-300 dark:stroke-zinc-700" : "stroke-stone-300 dark:stroke-zinc-600"}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
              </g>
            );
          })}

          {/* Reference bar on the left showing all range zones */}
          <defs>
            <clipPath id={`refbar-clip-${reference.name.replace(/\s+/g, '-')}`}>
              <rect
                x={yAxisWidth}
                y={referenceBarSegments.length > 0 ? referenceBarSegments[referenceBarSegments.length - 1].y : 0}
                width={refBarWidth}
                height={valueToY(minY) - (referenceBarSegments.length > 0 ? referenceBarSegments[referenceBarSegments.length - 1].y : 0)}
                rx="4"
                ry="4"
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#refbar-clip-${reference.name.replace(/\s+/g, '-')})`}>
            {referenceBarSegments.map((seg, i) => (
              <rect
                key={i}
                x={yAxisWidth}
                y={seg.y}
                width={refBarWidth}
                height={Math.max(seg.height, 1)}
                fill={seg.color}
                className={isEmpty ? "opacity-40" : ""}
              />
            ))}
          </g>

          {/* Data bars */}
          {bars.map((bar, i) => (
            <g key={i}>
              <rect
                x={bar.x}
                y={bar.y}
                width={barWidth}
                height={bar.height}
                fill={bar.color}
                rx="2"
              />
              {/* Value label inside bar */}
              <text
                x={bar.x + barWidth / 2}
                y={bar.y + bar.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] fill-white font-semibold"
              >
                {bar.value}
              </text>
              {/* Date label below bar */}
              <text
                x={bar.x + barWidth / 2}
                y={chartHeight + 11}
                textAnchor="middle"
                className="text-[9px] fill-stone-500 dark:fill-zinc-400"
              >
                {formatDate(bar.date)}
              </text>
            </g>
          ))}

          {/* Empty state placeholder bars */}
          {emptyBars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              className="fill-zinc-300 dark:fill-zinc-600"
              rx="2"
            />
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
