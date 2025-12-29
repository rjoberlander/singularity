"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { format } from "date-fns";
import { Biomarker } from "@/types";

interface BiomarkerChartProps {
  data: Biomarker[];
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  optimalRangeLow?: number;
  optimalRangeHigh?: number;
}

export function BiomarkerChart({
  data,
  referenceRangeLow,
  referenceRangeHigh,
  optimalRangeLow,
  optimalRangeHigh,
}: BiomarkerChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No historical data available
      </div>
    );
  }

  const chartData = data
    .map((d) => ({
      date: format(new Date(d.date_tested), "MMM d, yyyy"),
      value: d.value,
      timestamp: new Date(d.date_tested).getTime(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Calculate Y axis domain
  const values = chartData.map((d) => d.value);
  const minValue = Math.min(
    ...values,
    referenceRangeLow ?? Infinity,
    optimalRangeLow ?? Infinity
  );
  const maxValue = Math.max(
    ...values,
    referenceRangeHigh ?? -Infinity,
    optimalRangeHigh ?? -Infinity
  );
  const padding = (maxValue - minValue) * 0.1;
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;

  return (
    <div className="h-[200px] sm:h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="date"
            stroke="#666"
            tick={{ fill: "#999", fontSize: 10 }}
            tickFormatter={(value) => {
              // Shorter format for mobile - just show month/day
              const parts = value.split(", ");
              return parts[0]; // "MMM d" part only
            }}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#666"
            tick={{ fill: "#999", fontSize: 10 }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#fff" }}
          />

          {/* Reference range area */}
          {referenceRangeLow !== undefined && referenceRangeHigh !== undefined && (
            <ReferenceArea
              y1={referenceRangeLow}
              y2={referenceRangeHigh}
              fill="#10b981"
              fillOpacity={0.1}
            />
          )}

          {/* Optimal range area */}
          {optimalRangeLow !== undefined && optimalRangeHigh !== undefined && (
            <ReferenceArea
              y1={optimalRangeLow}
              y2={optimalRangeHigh}
              fill="#22c55e"
              fillOpacity={0.2}
            />
          )}

          {/* Reference lines - labels hidden on mobile for cleaner look */}
          {referenceRangeLow !== undefined && (
            <ReferenceLine
              y={referenceRangeLow}
              stroke="#ef4444"
              strokeDasharray="5 5"
            />
          )}
          {referenceRangeHigh !== undefined && (
            <ReferenceLine
              y={referenceRangeHigh}
              stroke="#f59e0b"
              strokeDasharray="5 5"
            />
          )}

          <Line
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
