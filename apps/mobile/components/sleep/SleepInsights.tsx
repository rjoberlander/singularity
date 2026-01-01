/**
 * Sleep Insights Component
 * Displays correlations, recommendations, and analysis
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CorrelationCard, SupplementCorrelation } from './CorrelationCard';
import { SleepTrendChart } from './SleepTrendChart';
import { SleepTrend, getSleepTrends } from '../../services/eightSleepService';

interface CorrelationSummary {
  period_days: number;
  total_nights_analyzed: number;
  top_positive_supplements: SupplementCorrelation[];
  top_negative_supplements: SupplementCorrelation[];
  daily_factors: DailyFactor[];
  recommendations: string[];
}

interface DailyFactor {
  factor: string;
  nights_with: number;
  nights_without: number;
  avg_score_with: number | null;
  avg_score_without: number | null;
  score_diff: number | null;
  impact: 'positive' | 'negative' | 'neutral';
}

interface SleepInsightsProps {
  onClose?: () => void;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

export function SleepInsights({ onClose }: SleepInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CorrelationSummary | null>(null);
  const [trends, setTrends] = useState<SleepTrend[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'sleep_score' | 'deep_sleep_pct' | 'avg_hrv' | 'time_slept_hours'>('sleep_score');
  const [activeTab, setActiveTab] = useState<'trends' | 'supplements' | 'factors'>('trends');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load trends
      const trendsData = await getSleepTrends(30);
      setTrends(trendsData.trends);

      // Load correlation summary
      const response = await fetch(`${API_BASE_URL}/api/v1/eight-sleep/correlations/summary?days=90`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Analyzing your sleep data...</Text>
      </View>
    );
  }

  const metrics = [
    { key: 'sleep_score' as const, label: 'Score' },
    { key: 'deep_sleep_pct' as const, label: 'Deep' },
    { key: 'avg_hrv' as const, label: 'HRV' },
    { key: 'time_slept_hours' as const, label: 'Hours' },
  ];

  const getImpactColor = (impact: string) => {
    if (impact === 'positive') return '#22c55e';
    if (impact === 'negative') return '#ef4444';
    return '#6b7280';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with close button */}
      {onClose && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sleep Insights</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary stats */}
      {summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Analysis Period</Text>
          <Text style={styles.summaryValue}>
            {summary.total_nights_analyzed} nights analyzed over {summary.period_days} days
          </Text>
        </View>
      )}

      {/* Recommendations */}
      {summary && summary.recommendations.length > 0 && (
        <View style={styles.recommendationsCard}>
          <View style={styles.recommendationsHeader}>
            <Ionicons name="bulb" size={20} color="#10b981" />
            <Text style={styles.recommendationsTitle}>Insights</Text>
          </View>
          {summary.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationText}>
              {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Tab selector */}
      <View style={styles.tabContainer}>
        {[
          { key: 'trends', label: 'Trends' },
          { key: 'supplements', label: 'Supplements' },
          { key: 'factors', label: 'Factors' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <View>
          {/* Metric selector */}
          <View style={styles.metricSelector}>
            {metrics.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSelectedMetric(m.key)}
                style={[styles.metricButton, selectedMetric === m.key && styles.metricButtonActive]}
              >
                <Text style={[styles.metricButtonText, selectedMetric === m.key && styles.metricButtonTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            <SleepTrendChart
              trends={trends}
              metric={selectedMetric}
              height={150}
              showLabels
            />
          </View>

          {/* 30-day stats */}
          {trends.length > 0 && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>30-Day Overview</Text>
              <View style={styles.statsGrid}>
                <StatBox
                  label="Best Score"
                  value={Math.max(...trends.map((t) => t.sleep_score || 0))}
                  suffix=""
                />
                <StatBox
                  label="Avg Deep Sleep"
                  value={
                    trends.reduce((sum, t) => sum + (t.deep_sleep_pct || 0), 0) /
                    trends.filter((t) => t.deep_sleep_pct !== null).length
                  }
                  suffix="%"
                />
                <StatBox
                  label="Avg HRV"
                  value={
                    trends.reduce((sum, t) => sum + (t.avg_hrv || 0), 0) /
                    trends.filter((t) => t.avg_hrv !== null).length
                  }
                  suffix=" ms"
                />
                <StatBox
                  label="2-4am Wakes"
                  value={trends.filter((t) => t.woke_2_4_am).length}
                  suffix={` of ${trends.length}`}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Supplements Tab */}
      {activeTab === 'supplements' && (
        <View>
          {summary?.top_positive_supplements && summary.top_positive_supplements.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={16} color="#22c55e" />
                <Text style={styles.sectionTitlePositive}>Positive Impact</Text>
              </View>
              {summary.top_positive_supplements.map((corr) => (
                <CorrelationCard key={corr.supplement_id} correlation={corr} />
              ))}
            </>
          )}

          {summary?.top_negative_supplements && summary.top_negative_supplements.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <Ionicons name="trending-down" size={16} color="#ef4444" />
                <Text style={styles.sectionTitleNegative}>Negative Impact</Text>
              </View>
              {summary.top_negative_supplements.map((corr) => (
                <CorrelationCard key={corr.supplement_id} correlation={corr} />
              ))}
            </>
          )}

          {(!summary?.top_positive_supplements?.length && !summary?.top_negative_supplements?.length) && (
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyStateText}>
                Not enough data yet to analyze supplement correlations.
                {'\n'}Keep tracking for insights!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Factors Tab */}
      {activeTab === 'factors' && (
        <View>
          {summary?.daily_factors && summary.daily_factors.length > 0 ? (
            summary.daily_factors.map((factor) => (
              <View key={factor.factor} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorName}>{factor.factor}</Text>
                  <View style={[styles.factorBadge, { backgroundColor: getImpactColor(factor.impact) + '20' }]}>
                    <Text style={[styles.factorBadgeText, { color: getImpactColor(factor.impact) }]}>
                      {factor.impact}
                    </Text>
                  </View>
                </View>

                <View style={styles.factorStats}>
                  <View style={styles.factorStatCol}>
                    <Text style={styles.factorStatLabel}>With factor</Text>
                    <Text style={styles.factorStatValue}>
                      {factor.avg_score_with?.toFixed(0) ?? '--'} score
                    </Text>
                    <Text style={styles.factorStatNights}>{factor.nights_with} nights</Text>
                  </View>
                  <View style={styles.factorStatCol}>
                    <Text style={styles.factorStatLabel}>Without factor</Text>
                    <Text style={styles.factorStatValue}>
                      {factor.avg_score_without?.toFixed(0) ?? '--'} score
                    </Text>
                    <Text style={styles.factorStatNights}>{factor.nights_without} nights</Text>
                  </View>
                  <View style={styles.factorDiffCol}>
                    <Text style={styles.factorStatLabel}>Difference</Text>
                    <Text
                      style={[
                        styles.factorDiffValue,
                        { color: getImpactColor((factor.score_diff ?? 0) > 0 ? 'positive' : (factor.score_diff ?? 0) < 0 ? 'negative' : 'neutral') },
                      ]}
                    >
                      {factor.score_diff !== null
                        ? `${factor.score_diff > 0 ? '+' : ''}${factor.score_diff.toFixed(0)}`
                        : '--'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyStateText}>
                Mark daily factors (alcohol, caffeine, exercise, stress)
                {'\n'}in your sleep notes to see correlations here.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  suffix: string;
}

function StatBox({ label, value, suffix }: StatBoxProps) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxLabel}>{label}</Text>
      <Text style={styles.statBoxValue}>
        {isNaN(value) ? '--' : value.toFixed(0)}{suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  recommendationsCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationsTitle: {
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendationText: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#374151',
  },
  tabText: {
    textAlign: 'center',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  metricSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 8,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: '#1f1f1f',
  },
  metricButtonActive: {
    backgroundColor: '#10b981',
  },
  metricButtonText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9ca3af',
  },
  metricButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
  },
  statsTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '50%',
    marginBottom: 12,
  },
  statBoxLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  statBoxValue: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitlePositive: {
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitleNegative: {
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  factorCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  factorName: {
    color: '#fff',
    fontWeight: '600',
  },
  factorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  factorBadgeText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  factorStats: {
    flexDirection: 'row',
  },
  factorStatCol: {
    flex: 1,
    marginRight: 16,
  },
  factorDiffCol: {
    alignItems: 'flex-end',
  },
  factorStatLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  factorStatValue: {
    color: '#fff',
    fontWeight: '600',
  },
  factorStatNights: {
    color: '#6b7280',
    fontSize: 12,
  },
  factorDiffValue: {
    fontWeight: '700',
    fontSize: 18,
  },
});

export default SleepInsights;
