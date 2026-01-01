/**
 * Correlation Card
 * Displays supplement-sleep correlation data
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
      <View style={styles.compactCard}>
        <View style={styles.compactRow}>
          <View style={styles.flex1}>
            <Text style={styles.supplementName}>{supplement_name}</Text>
            {supplement_brand && (
              <Text style={styles.supplementBrandSmall}>{supplement_brand}</Text>
            )}
          </View>
          <View style={styles.compactMetric}>
            <Ionicons name={impactIcon as any} size={16} color={impactColor} />
            <Text style={[styles.compactDiff, { color: impactColor }]}>
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
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.title}>{supplement_name}</Text>
          {supplement_brand && (
            <Text style={styles.supplementBrand}>{supplement_brand}</Text>
          )}
        </View>
        <View style={styles.impactContainer}>
          <View style={[styles.impactBadge, { backgroundColor: impactColor + '20' }]}>
            <Text style={[styles.impactText, { color: impactColor }]}>
              {impact}
            </Text>
          </View>
          <Text style={styles.confidenceText}>{confidenceLabel}</Text>
        </View>
      </View>

      {/* Sample size */}
      <View style={styles.sampleSizeRow}>
        <View style={styles.sampleBadge}>
          <Text style={styles.sampleText}>
            {nights_taken} nights with
          </Text>
        </View>
        <View style={styles.sampleBadge}>
          <Text style={styles.sampleText}>
            {nights_not_taken} nights without
          </Text>
        </View>
      </View>

      {/* Comparison bars */}
      <View style={styles.comparisonSection}>
        <Text style={styles.comparisonLabel}>Sleep Score Comparison</Text>
        <View style={styles.comparisonRow}>
          {/* With supplement */}
          <View style={styles.comparisonCol}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderLabel}>With</Text>
              <Text style={styles.comparisonValue}>
                {avg_sleep_score_with?.toFixed(0) ?? '--'}
              </Text>
            </View>
            <View style={styles.barBackground}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${avg_sleep_score_with ?? 0}%`,
                    backgroundColor: impactColor,
                  },
                ]}
              />
            </View>
          </View>
          {/* Without supplement */}
          <View style={[styles.comparisonCol, { marginLeft: 8 }]}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderLabel}>Without</Text>
              <Text style={styles.comparisonValue}>
                {avg_sleep_score_without?.toFixed(0) ?? '--'}
              </Text>
            </View>
            <View style={styles.barBackground}>
              <View
                style={[
                  styles.barFill,
                  styles.barFillGray,
                  { width: `${avg_sleep_score_without ?? 0}%` },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Metrics grid */}
      <View style={styles.metricsGrid}>
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
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>
        {displayDiff !== null
          ? `${displayDiff > 0 ? '+' : ''}${displayDiff.toFixed(0)}${suffix}`
          : '--'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact card styles
  compactCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDiff: {
    marginLeft: 4,
    fontWeight: '600',
  },
  supplementBrandSmall: {
    color: '#9ca3af',
    fontSize: 12,
  },

  // Full card styles
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  supplementName: {
    color: '#fff',
    fontWeight: '500',
  },
  supplementBrand: {
    color: '#9ca3af',
    fontSize: 14,
  },
  impactContainer: {
    alignItems: 'flex-end',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  confidenceText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },

  // Sample size
  sampleSizeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sampleBadge: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  sampleText: {
    color: '#d1d5db',
    fontSize: 12,
  },

  // Comparison section
  comparisonSection: {
    marginBottom: 12,
  },
  comparisonLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonCol: {
    flex: 1,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  comparisonHeaderLabel: {
    color: '#9ca3af',
    fontSize: 12,
    flex: 1,
  },
  comparisonValue: {
    color: '#fff',
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barFillGray: {
    backgroundColor: '#6b7280',
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    marginBottom: 8,
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  metricValue: {
    fontWeight: '600',
  },
});

export default CorrelationCard;
