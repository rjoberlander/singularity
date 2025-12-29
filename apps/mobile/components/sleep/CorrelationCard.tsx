/**
 * Correlation Card
 * Displays supplement-sleep correlation data
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SupplementCorrelation {
  supplement_id: string;
  supplement_name: string;
  supplement_brand: string | null;
  nights_taken: number;
  nights_not_taken: number;
  avg_sleep_score_with: number | null;
  avg_sleep_score_without: number | null;
  avg_deep_sleep_pct_with: number | null;
  avg_deep_sleep_pct_without: number | null;
  avg_hrv_with: number | null;
  avg_hrv_without: number | null;
  wake_2_4_am_rate_with: number;
  wake_2_4_am_rate_without: number;
  sleep_score_diff: number | null;
  deep_sleep_diff: number | null;
  hrv_diff: number | null;
  wake_rate_diff: number;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: 'high' | 'medium' | 'low';
}

interface CorrelationCardProps {
  correlation: SupplementCorrelation;
  compact?: boolean;
}

export function CorrelationCard({ correlation, compact = false }: CorrelationCardProps) {
  const {
    supplement_name,
    supplement_brand,
    nights_taken,
    nights_not_taken,
    avg_sleep_score_with,
    avg_sleep_score_without,
    sleep_score_diff,
    deep_sleep_diff,
    hrv_diff,
    wake_rate_diff,
    impact,
    confidence,
  } = correlation;

  const impactColor =
    impact === 'positive' ? '#22c55e' : impact === 'negative' ? '#ef4444' : '#6b7280';

  const impactIcon =
    impact === 'positive'
      ? 'trending-up'
      : impact === 'negative'
      ? 'trending-down'
      : 'remove';

  const confidenceLabel =
    confidence === 'high'
      ? 'High confidence'
      : confidence === 'medium'
      ? 'Medium confidence'
      : 'Low confidence';

  if (compact) {
    return (
      <View className="bg-gray-800 rounded-lg p-3 mb-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white font-medium">{supplement_name}</Text>
            {supplement_brand && (
              <Text className="text-gray-400 text-xs">{supplement_brand}</Text>
            )}
          </View>
          <View className="flex-row items-center">
            <Ionicons name={impactIcon as any} size={16} color={impactColor} />
            <Text className="ml-1 font-semibold" style={{ color: impactColor }}>
              {sleep_score_diff !== null
                ? `${sleep_score_diff > 0 ? '+' : ''}${sleep_score_diff.toFixed(0)}`
                : '--'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-gray-800 rounded-xl p-4 mb-3">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-white font-semibold text-lg">{supplement_name}</Text>
          {supplement_brand && (
            <Text className="text-gray-400 text-sm">{supplement_brand}</Text>
          )}
        </View>
        <View className="items-end">
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: impactColor + '20' }}
          >
            <Text style={{ color: impactColor }} className="text-sm font-medium capitalize">
              {impact}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs mt-1">{confidenceLabel}</Text>
        </View>
      </View>

      {/* Sample size */}
      <View className="flex-row mb-3">
        <View className="bg-gray-700 rounded-lg px-3 py-1 mr-2">
          <Text className="text-gray-300 text-xs">
            {nights_taken} nights with
          </Text>
        </View>
        <View className="bg-gray-700 rounded-lg px-3 py-1">
          <Text className="text-gray-300 text-xs">
            {nights_not_taken} nights without
          </Text>
        </View>
      </View>

      {/* Comparison bars */}
      <View className="mb-3">
        <Text className="text-gray-400 text-xs mb-2">Sleep Score Comparison</Text>
        <View className="flex-row items-center">
          {/* With supplement */}
          <View className="flex-1 mr-2">
            <View className="flex-row items-center mb-1">
              <Text className="text-gray-400 text-xs flex-1">With</Text>
              <Text className="text-white font-semibold">
                {avg_sleep_score_with?.toFixed(0) ?? '--'}
              </Text>
            </View>
            <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${avg_sleep_score_with ?? 0}%`,
                  backgroundColor: impactColor,
                }}
              />
            </View>
          </View>
          {/* Without supplement */}
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-gray-400 text-xs flex-1">Without</Text>
              <Text className="text-white font-semibold">
                {avg_sleep_score_without?.toFixed(0) ?? '--'}
              </Text>
            </View>
            <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-gray-500 rounded-full"
                style={{ width: `${avg_sleep_score_without ?? 0}%` }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Metrics grid */}
      <View className="flex-row flex-wrap">
        <MetricDiff
          label="Sleep Score"
          diff={sleep_score_diff}
          suffix=""
        />
        <MetricDiff
          label="Deep Sleep"
          diff={deep_sleep_diff}
          suffix="%"
        />
        <MetricDiff
          label="HRV"
          diff={hrv_diff}
          suffix=" ms"
        />
        <MetricDiff
          label="2-4am Wake"
          diff={-wake_rate_diff} // Negative is better for wake rate
          suffix="%"
          inverted
        />
      </View>
    </View>
  );
}

interface MetricDiffProps {
  label: string;
  diff: number | null;
  suffix: string;
  inverted?: boolean;
}

function MetricDiff({ label, diff, suffix, inverted = false }: MetricDiffProps) {
  const isPositive = diff !== null && (inverted ? diff < 0 : diff > 0);
  const isNegative = diff !== null && (inverted ? diff > 0 : diff < 0);
  const color = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#6b7280';
  const displayDiff = inverted && diff !== null ? -diff : diff;

  return (
    <View className="w-1/2 mb-2">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text style={{ color }} className="font-semibold">
        {displayDiff !== null
          ? `${displayDiff > 0 ? '+' : ''}${displayDiff.toFixed(0)}${suffix}`
          : '--'}
      </Text>
    </View>
  );
}

export default CorrelationCard;
