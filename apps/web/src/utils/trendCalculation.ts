/**
 * Trend Calculation Utility
 * Calculates biomarker trends with smart date handling and health assessment
 */

import { Biomarker } from "@/types";
import { BiomarkerReference } from "@/data/biomarkerReference";

export type TrendDirection = "up" | "down" | "stable";
export type TrendHealth = "good" | "bad" | "neutral" | "warning";

export interface TrendWarning {
  type: "old_data_included" | "insufficient_data" | "outdated";
  message: string;
}

export interface TrendResult {
  direction: TrendDirection | null;
  health: TrendHealth | null;
  percentChange: number | null;
  warnings: TrendWarning[];
  dataPointsUsed: number;
  oldestDataDate: string | null;
  newestDataDate: string | null;
}

// Constants
const RECENT_DATA_WINDOW_MONTHS = 18; // Prefer data within 18 months
const OUTDATED_THRESHOLD_MONTHS = 24; // Warning if last reading > 24 months old
const MIN_DATA_POINTS_FOR_TREND = 3; // Need at least 3 readings for trend
const PREFERRED_DATA_POINTS = 4; // Ideally use last 4 readings
const STABLE_THRESHOLD_PERCENT = 5; // Changes under 5% considered stable

/**
 * Calculate months between two dates
 */
function monthsBetween(date1: Date, date2: Date): number {
  const months =
    (date2.getFullYear() - date1.getFullYear()) * 12 +
    (date2.getMonth() - date1.getMonth());
  return Math.abs(months);
}

/**
 * Calculate linear regression slope for a set of values
 * Returns normalized slope (per data point)
 */
function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}

/**
 * Determine trend direction from slope and values
 */
function getTrendDirection(
  slope: number,
  values: number[]
): TrendDirection {
  if (values.length < 2) return "stable";

  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  if (avgValue === 0) return "stable";

  // Calculate percent change per reading
  const percentChangePerReading = (slope / avgValue) * 100;

  // If total percent change across all readings is less than threshold, it's stable
  const totalPercentChange = percentChangePerReading * (values.length - 1);

  if (Math.abs(totalPercentChange) < STABLE_THRESHOLD_PERCENT) {
    return "stable";
  }

  return slope > 0 ? "up" : "down";
}

/**
 * Determine if the trend is healthy based on biomarker preference and current position
 */
function assessTrendHealth(
  direction: TrendDirection,
  latestValue: number,
  reference: BiomarkerReference
): TrendHealth {
  if (direction === "stable") {
    // For stable trends, color based on current value's range
    const { optimalRange, suboptimalLowRange, suboptimalHighRange } = reference;

    // Check if in optimal range (green)
    if (latestValue >= optimalRange.low && latestValue <= optimalRange.high) {
      return "good";
    }

    // Check if in suboptimal range (orange/warning)
    const inSuboptimalLow = suboptimalLowRange &&
      latestValue >= suboptimalLowRange.low && latestValue < optimalRange.low;
    const inSuboptimalHigh = suboptimalHighRange &&
      latestValue > optimalRange.high && latestValue <= suboptimalHighRange.high;

    if (inSuboptimalLow || inSuboptimalHigh) {
      return "warning";
    }

    // Otherwise in critical range (red)
    return "bad";
  }

  const preference = reference.trendPreference;

  switch (preference) {
    case "lower_is_better":
      // Going down is good, going up is bad
      return direction === "down" ? "good" : "bad";

    case "higher_is_better":
      // Going up is good, going down is bad
      return direction === "up" ? "good" : "bad";

    case "range_is_optimal":
      // Depends on where you are relative to optimal range
      const { optimalRange } = reference;
      const belowOptimal = latestValue < optimalRange.low;
      const aboveOptimal = latestValue > optimalRange.high;

      if (belowOptimal) {
        // Below optimal: going up is good, going down is bad
        return direction === "up" ? "good" : "bad";
      } else if (aboveOptimal) {
        // Above optimal: going down is good, going up is bad
        return direction === "down" ? "good" : "bad";
      } else {
        // In optimal range: either direction is neutral (staying in range)
        return "neutral";
      }

    default:
      return "neutral";
  }
}

/**
 * Calculate percent change from first to last value
 */
function calculatePercentChange(values: number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return null;
  return ((last - first) / first) * 100;
}

/**
 * Main function to calculate biomarker trend
 */
export function calculateTrend(
  history: Biomarker[],
  reference: BiomarkerReference
): TrendResult {
  const warnings: TrendWarning[] = [];
  const now = new Date();

  // Sort history chronologically (oldest first)
  const sortedHistory = [...history].sort(
    (a, b) =>
      new Date(a.date_tested).getTime() - new Date(b.date_tested).getTime()
  );

  if (sortedHistory.length === 0) {
    return {
      direction: null,
      health: null,
      percentChange: null,
      warnings: [
        { type: "insufficient_data", message: "No data available" },
      ],
      dataPointsUsed: 0,
      oldestDataDate: null,
      newestDataDate: null,
    };
  }

  // Check if most recent reading is outdated (> 24 months)
  const mostRecent = sortedHistory[sortedHistory.length - 1];
  const mostRecentDate = new Date(mostRecent.date_tested);
  const monthsSinceLastReading = monthsBetween(mostRecentDate, now);

  if (monthsSinceLastReading > OUTDATED_THRESHOLD_MONTHS) {
    warnings.push({
      type: "outdated",
      message: `Last tested ${monthsSinceLastReading} months ago - consider retesting`,
    });
  }

  // Not enough data points for trend
  if (sortedHistory.length < MIN_DATA_POINTS_FOR_TREND) {
    return {
      direction: null,
      health: null,
      percentChange: null,
      warnings: [
        {
          type: "insufficient_data",
          message: `Need at least ${MIN_DATA_POINTS_FOR_TREND} readings to calculate trend`,
        },
        ...warnings,
      ],
      dataPointsUsed: sortedHistory.length,
      oldestDataDate: sortedHistory[0].date_tested,
      newestDataDate: mostRecent.date_tested,
    };
  }

  // Try to get data within the recent window (18 months)
  const cutoffDate = new Date(now);
  cutoffDate.setMonth(cutoffDate.getMonth() - RECENT_DATA_WINDOW_MONTHS);

  const recentHistory = sortedHistory.filter(
    (b) => new Date(b.date_tested) >= cutoffDate
  );

  let dataToUse: Biomarker[];
  let includesOldData = false;

  if (recentHistory.length >= MIN_DATA_POINTS_FOR_TREND) {
    // Enough recent data - use last PREFERRED_DATA_POINTS from recent history
    dataToUse = recentHistory.slice(-PREFERRED_DATA_POINTS);
  } else {
    // Not enough recent data - fall back to all data
    dataToUse = sortedHistory.slice(-PREFERRED_DATA_POINTS);

    // Check if any data is older than 18 months
    const oldestInSet = new Date(dataToUse[0].date_tested);
    if (oldestInSet < cutoffDate) {
      includesOldData = true;
      warnings.push({
        type: "old_data_included",
        message: "Includes data older than 18 months - trend may not reflect recent changes",
      });
    }
  }

  // Extract values for calculation
  const values = dataToUse.map((b) => b.value);

  // Calculate trend
  const slope = calculateSlope(values);
  const direction = getTrendDirection(slope, values);
  const health = assessTrendHealth(
    direction,
    values[values.length - 1],
    reference
  );
  const percentChange = calculatePercentChange(values);

  return {
    direction,
    health,
    percentChange,
    warnings,
    dataPointsUsed: dataToUse.length,
    oldestDataDate: dataToUse[0].date_tested,
    newestDataDate: dataToUse[dataToUse.length - 1].date_tested,
  };
}

/**
 * Get trend icon based on direction
 */
export function getTrendIcon(direction: TrendDirection | null): string {
  switch (direction) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "stable":
      return "→";
    default:
      return "—";
  }
}

/**
 * Get trend color based on health assessment
 */
export function getTrendColor(health: TrendHealth | null): string {
  switch (health) {
    case "good":
      return "#22c55e"; // Green
    case "bad":
      return "#ef4444"; // Red
    case "warning":
      return "#f97316"; // Orange
    case "neutral":
      return "#a3a3a3"; // Gray
    default:
      return "#a3a3a3"; // Gray
  }
}

/**
 * Format percent change for display
 */
export function formatPercentChange(percentChange: number | null): string {
  if (percentChange === null) return "";
  const sign = percentChange > 0 ? "+" : "";
  return `${sign}${percentChange.toFixed(1)}%`;
}
