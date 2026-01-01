/**
 * Sleep Trend Chart
 * Displays sleep score trends over time as a bar/line chart
 */

import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trend data available</Text>
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
  const barWidthPercent = 100 / Math.min(trends.length, 14);
  const barWidth = `${barWidthPercent}%` as DimensionValue;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>{metricLabel}</Text>
        {average !== null && (
          <Text style={styles.headerAverage}>
            Avg: {average.toFixed(metric === 'time_slept_hours' ? 1 : 0)}
            {metric === 'deep_sleep_pct' ? '%' : ''}
          </Text>
        )}
      </View>

      {/* Chart */}
      <View style={[styles.chartContainer, { height }]}>
        {trends.slice(-14).map((trend, index) => {
          const value = values[trends.length - 14 + index] ?? values[index];
          const barHeight = value !== null ? ((value - minValue) / range) * 100 : 0;

          return (
            <View
              key={trend.date}
              style={[styles.barColumn, { width: barWidth }]}
            >
              {/* Bar */}
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(barHeight, 5)}%` as DimensionValue,
                    backgroundColor:
                      metric === 'sleep_score'
                        ? getSleepScoreColor(value)
                        : value !== null
                        ? '#10b981'
                        : '#374151',
                  },
                ]}
              />

              {/* 2-4am wake indicator */}
              {trend.woke_2_4_am && <View style={styles.wakeIndicator} />}
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View style={styles.xAxisLabels}>
          <Text style={styles.xAxisLabel}>
            {formatShortDate(trends[Math.max(0, trends.length - 14)].date)}
          </Text>
          <Text style={styles.xAxisLabel}>
            {formatShortDate(trends[trends.length - 1].date)}
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>2-4am wake</Text>
        </View>
      </View>
    </View>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#9ca3af',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  headerAverage: {
    color: '#fff',
    fontSize: 14,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  wakeIndicator: {
    width: 6,
    height: 6,
    backgroundColor: '#f97316',
    borderRadius: 3,
    marginTop: 4,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xAxisLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    backgroundColor: '#f97316',
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});

export default SleepTrendChart;
