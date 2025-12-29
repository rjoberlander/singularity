/**
 * Sleep Insights Component
 * Displays correlations, recommendations, and analysis
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-gray-400 mt-4">Analyzing your sleep data...</Text>
      </View>
    );
  }

  const metrics = [
    { key: 'sleep_score' as const, label: 'Score' },
    { key: 'deep_sleep_pct' as const, label: 'Deep' },
    { key: 'avg_hrv' as const, label: 'HRV' },
    { key: 'time_slept_hours' as const, label: 'Hours' },
  ];

  return (
    <ScrollView className="flex-1">
      {/* Header with close button */}
      {onClose && (
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-white">Sleep Insights</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Summary stats */}
      {summary && (
        <View className="bg-gray-800 rounded-xl p-4 mb-4">
          <Text className="text-gray-400 text-sm mb-2">Analysis Period</Text>
          <Text className="text-white text-lg font-semibold">
            {summary.total_nights_analyzed} nights analyzed over {summary.period_days} days
          </Text>
        </View>
      )}

      {/* Recommendations */}
      {summary && summary.recommendations.length > 0 && (
        <View className="bg-emerald-900/30 rounded-xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="bulb" size={20} color="#10b981" />
            <Text className="text-emerald-400 font-semibold ml-2">Insights</Text>
          </View>
          {summary.recommendations.map((rec, index) => (
            <Text key={index} className="text-gray-300 text-sm mb-2">
              {rec}
            </Text>
          ))}
        </View>
      )}

      {/* Tab selector */}
      <View className="flex-row bg-gray-800 rounded-lg p-1 mb-4">
        {[
          { key: 'trends', label: 'Trends' },
          { key: 'supplements', label: 'Supplements' },
          { key: 'factors', label: 'Factors' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 rounded-md ${
              activeTab === tab.key ? 'bg-gray-700' : ''
            }`}
          >
            <Text
              className={`text-center ${
                activeTab === tab.key ? 'text-white font-medium' : 'text-gray-400'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <View>
          {/* Metric selector */}
          <View className="flex-row mb-4">
            {metrics.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSelectedMetric(m.key)}
                className={`flex-1 py-2 mr-1 rounded-lg ${
                  selectedMetric === m.key ? 'bg-emerald-600' : 'bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-sm ${
                    selectedMetric === m.key ? 'text-white font-medium' : 'text-gray-400'
                  }`}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          <View className="bg-gray-800 rounded-xl p-4 mb-4">
            <SleepTrendChart
              trends={trends}
              metric={selectedMetric}
              height={150}
              showLabels
            />
          </View>

          {/* 30-day stats */}
          {trends.length > 0 && (
            <View className="bg-gray-800 rounded-xl p-4">
              <Text className="text-white font-semibold mb-3">30-Day Overview</Text>
              <View className="flex-row flex-wrap">
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
              <View className="flex-row items-center mb-2">
                <Ionicons name="trending-up" size={16} color="#22c55e" />
                <Text className="text-emerald-400 font-semibold ml-2">
                  Positive Impact
                </Text>
              </View>
              {summary.top_positive_supplements.map((corr) => (
                <CorrelationCard key={corr.supplement_id} correlation={corr} />
              ))}
            </>
          )}

          {summary?.top_negative_supplements && summary.top_negative_supplements.length > 0 && (
            <>
              <View className="flex-row items-center mb-2 mt-4">
                <Ionicons name="trending-down" size={16} color="#ef4444" />
                <Text className="text-red-400 font-semibold ml-2">
                  Negative Impact
                </Text>
              </View>
              {summary.top_negative_supplements.map((corr) => (
                <CorrelationCard key={corr.supplement_id} correlation={corr} />
              ))}
            </>
          )}

          {(!summary?.top_positive_supplements?.length && !summary?.top_negative_supplements?.length) && (
            <View className="items-center py-8">
              <Ionicons name="flask-outline" size={48} color="#6b7280" />
              <Text className="text-gray-400 mt-4 text-center">
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
              <View key={factor.factor} className="bg-gray-800 rounded-xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-semibold">{factor.factor}</Text>
                  <View
                    className="px-2 py-1 rounded-full"
                    style={{
                      backgroundColor:
                        factor.impact === 'positive'
                          ? '#22c55e20'
                          : factor.impact === 'negative'
                          ? '#ef444420'
                          : '#6b728020',
                    }}
                  >
                    <Text
                      className="text-sm capitalize"
                      style={{
                        color:
                          factor.impact === 'positive'
                            ? '#22c55e'
                            : factor.impact === 'negative'
                            ? '#ef4444'
                            : '#6b7280',
                      }}
                    >
                      {factor.impact}
                    </Text>
                  </View>
                </View>

                <View className="flex-row">
                  <View className="flex-1 mr-4">
                    <Text className="text-gray-400 text-xs">With factor</Text>
                    <Text className="text-white font-semibold">
                      {factor.avg_score_with?.toFixed(0) ?? '--'} score
                    </Text>
                    <Text className="text-gray-500 text-xs">{factor.nights_with} nights</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-400 text-xs">Without factor</Text>
                    <Text className="text-white font-semibold">
                      {factor.avg_score_without?.toFixed(0) ?? '--'} score
                    </Text>
                    <Text className="text-gray-500 text-xs">{factor.nights_without} nights</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-400 text-xs">Difference</Text>
                    <Text
                      className="font-bold text-lg"
                      style={{
                        color:
                          (factor.score_diff ?? 0) > 0
                            ? '#22c55e'
                            : (factor.score_diff ?? 0) < 0
                            ? '#ef4444'
                            : '#6b7280',
                      }}
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
            <View className="items-center py-8">
              <Ionicons name="analytics-outline" size={48} color="#6b7280" />
              <Text className="text-gray-400 mt-4 text-center">
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
    <View className="w-1/2 mb-3">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="text-white font-semibold text-lg">
        {isNaN(value) ? '--' : value.toFixed(0)}{suffix}
      </Text>
    </View>
  );
}

export default SleepInsights;
