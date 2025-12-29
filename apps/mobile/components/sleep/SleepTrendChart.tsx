/**
 * Sleep Trend Chart
 * Displays sleep score trends over time as a bar/line chart
 */

import React from 'react';
import { View, Text } from 'react-native';
import { SleepTrend, getSleepScoreColor } from '../../services/eightSleepService';

interface SleepTrendChartProps {
  trends: SleepTrend[];
  metric?: 'sleep_score' | 'deep_sleep_pct' | 'avg_hrv' | 'time_slept_hours';
  height?: number;
  showLabels?: boolean;
}

export function SleepTrendChart({
  trends,
  metric = 'sleep_score',
  height = 120,
  showLabels = true,
}: SleepTrendChartProps) {
  if (trends.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-gray-400">No trend data available</Text>
      </View>
    );
  }

  // Get values for the selected metric
  const values = trends.map((t) => {
    switch (metric) {
      case 'sleep_score':
        return t.sleep_score;
      case 'deep_sleep_pct':
        return t.deep_sleep_pct;
      case 'avg_hrv':
        return t.avg_hrv;
      case 'time_slept_hours':
        return t.time_slept_hours;
      default:
        return t.sleep_score;
    }
  });

  // Find min/max for scaling
  const validValues = values.filter((v) => v !== null) as number[];
  const maxValue = Math.max(...validValues, 1);
  const minValue = Math.min(...validValues, 0);
  const range = maxValue - minValue || 1;

  // Get label for metric
  const metricLabel = {
    sleep_score: 'Sleep Score',
    deep_sleep_pct: 'Deep Sleep %',
    avg_hrv: 'HRV',
    time_slept_hours: 'Hours Slept',
  }[metric];

  // Calculate average
  const average =
    validValues.length > 0
      ? validValues.reduce((a, b) => a + b, 0) / validValues.length
      : null;

  // Bar width calculation
  const barWidth = `${100 / Math.min(trends.length, 14)}%`;

  return (
    <View>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-400 text-sm">{metricLabel}</Text>
        {average !== null && (
          <Text className="text-white text-sm">
            Avg: {average.toFixed(metric === 'time_slept_hours' ? 1 : 0)}
            {metric === 'deep_sleep_pct' ? '%' : ''}
          </Text>
        )}
      </View>

      {/* Chart */}
      <View style={{ height }} className="flex-row items-end justify-between">
        {trends.slice(-14).map((trend, index) => {
          const value = values[trends.length - 14 + index] ?? values[index];
          const barHeight = value !== null ? ((value - minValue) / range) * 100 : 0;

          return (
            <View
              key={trend.date}
              style={{ width: barWidth }}
              className="items-center px-0.5"
            >
              {/* Bar */}
              <View
                style={{
                  height: `${Math.max(barHeight, 5)}%`,
                  backgroundColor:
                    metric === 'sleep_score'
                      ? getSleepScoreColor(value)
                      : value !== null
                      ? '#10b981'
                      : '#374151',
                }}
                className="w-full rounded-t-sm"
              />

              {/* 2-4am wake indicator */}
              {trend.woke_2_4_am && (
                <View className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1" />
              )}
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View className="flex-row justify-between mt-2">
          <Text className="text-gray-500 text-xs">
            {formatShortDate(trends[Math.max(0, trends.length - 14)].date)}
          </Text>
          <Text className="text-gray-500 text-xs">
            {formatShortDate(trends[trends.length - 1].date)}
          </Text>
        </View>
      )}

      {/* Legend */}
      <View className="flex-row justify-center mt-2">
        <View className="flex-row items-center mr-4">
          <View className="w-2 h-2 bg-orange-500 rounded-full mr-1" />
          <Text className="text-gray-400 text-xs">2-4am wake</Text>
        </View>
      </View>
    </View>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default SleepTrendChart;
