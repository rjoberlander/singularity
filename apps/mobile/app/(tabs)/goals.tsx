import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GoalCardProps {
  title: string;
  category?: string;
  targetBiomarker?: string;
  currentValue?: number;
  targetValue?: number;
  direction: 'increase' | 'decrease' | 'maintain';
  status: 'active' | 'achieved' | 'paused';
  progress: number;
  interventions: string[];
}

function GoalCard({
  title,
  category,
  targetBiomarker,
  currentValue,
  targetValue,
  direction,
  status,
  progress,
  interventions
}: GoalCardProps) {
  const statusColors = {
    active: '#10b981',
    achieved: '#22c55e',
    paused: '#6b7280',
  };

  const directionIcons = {
    increase: 'trending-up',
    decrease: 'trending-down',
    maintain: 'remove',
  } as const;

  return (
    <TouchableOpacity style={styles.goalCard} activeOpacity={0.7}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleRow}>
          <Text style={styles.goalTitle}>{title}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
        </View>
        {category && <Text style={styles.categoryText}>{category}</Text>}
      </View>

      {targetBiomarker && currentValue !== undefined && targetValue !== undefined && (
        <View style={styles.biomarkerTarget}>
          <View style={styles.targetRow}>
            <Text style={styles.biomarkerName}>{targetBiomarker}</Text>
            <Ionicons
              name={directionIcons[direction]}
              size={20}
              color={direction === 'decrease' ? '#ef4444' : '#10b981'}
            />
          </View>
          <View style={styles.valuesRow}>
            <Text style={styles.currentValue}>{currentValue}</Text>
            <Ionicons name="arrow-forward" size={16} color="#6b7280" />
            <Text style={styles.targetValue}>{targetValue}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% complete</Text>
        </View>
      )}

      {interventions.length > 0 && (
        <View style={styles.interventions}>
          <Text style={styles.interventionsLabel}>Interventions:</Text>
          {interventions.map((intervention, index) => (
            <View key={index} style={styles.interventionItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.interventionText}>{intervention}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const SAMPLE_GOALS: GoalCardProps[] = [
  {
    title: 'Optimize Vitamin D Levels',
    category: 'Vitamins',
    targetBiomarker: 'Vitamin D',
    currentValue: 45,
    targetValue: 70,
    direction: 'increase',
    status: 'active',
    progress: 64,
    interventions: ['5000 IU D3 daily', 'Morning sunlight exposure'],
  },
  {
    title: 'Reduce Inflammation',
    category: 'Metabolic',
    targetBiomarker: 'hs-CRP',
    currentValue: 2.1,
    targetValue: 1.0,
    direction: 'decrease',
    status: 'active',
    progress: 45,
    interventions: ['Omega-3 supplementation', 'Anti-inflammatory diet'],
  },
  {
    title: 'Improve Sleep Quality',
    category: 'Lifestyle',
    direction: 'maintain',
    status: 'active',
    progress: 75,
    interventions: ['Magnesium before bed', 'Blue light blocking', 'Consistent sleep schedule'],
  },
];

export default function Goals() {
  const [goals] = useState<GoalCardProps[]>(SAMPLE_GOALS);
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('all');

  const filteredGoals = goals.filter(g => {
    if (filter === 'all') return true;
    return g.status === filter;
  });

  const activeCount = goals.filter(g => g.status === 'active').length;
  const achievedCount = goals.filter(g => g.status === 'achieved').length;

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flag-outline" size={24} color="#10b981" />
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Goals</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{achievedCount}</Text>
          <Text style={styles.statLabel}>Achieved</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'achieved' && styles.filterTabActive]}
          onPress={() => setFilter('achieved')}
        >
          <Text style={[styles.filterTabText, filter === 'achieved' && styles.filterTabTextActive]}>
            Achieved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Goals List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredGoals.length > 0 ? (
          filteredGoals.map((goal, index) => <GoalCard key={index} {...goal} />)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySubtitle}>
              Set your first health goal to start tracking progress
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#111111',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#10b981',
  },
  filterTabText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  goalCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  biomarkerTarget: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  biomarkerName: {
    fontSize: 14,
    color: '#9ca3af',
  },
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  targetValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1f1f1f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  interventions: {
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    paddingTop: 12,
  },
  interventionsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  interventionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  interventionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
