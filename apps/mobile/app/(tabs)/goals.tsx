import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '@/lib/hooks';
import { GoalAddModal } from '@/components/goals/GoalAddModal';
import type { Goal } from '@singularity/shared-types';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
}

function calculateProgress(goal: Goal): number {
  if (goal.current_value === undefined || goal.target_value === undefined) {
    return 0;
  }

  const current = goal.current_value;
  const target = goal.target_value;

  if (goal.direction === 'increase') {
    // Progress towards increasing value
    if (current >= target) return 100;
    if (current <= 0) return 0;
    return Math.round((current / target) * 100);
  } else if (goal.direction === 'decrease') {
    // Progress towards decreasing value (inverse)
    if (current <= target) return 100;
    // Assume starting from 2x target as baseline
    const start = target * 2;
    if (current >= start) return 0;
    return Math.round(((start - current) / (start - target)) * 100);
  }

  // maintain
  const diff = Math.abs(current - target);
  const tolerance = target * 0.1; // 10% tolerance
  if (diff <= tolerance) return 100;
  return Math.max(0, Math.round((1 - diff / target) * 100));
}

function GoalCard({ goal, onPress }: GoalCardProps) {
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

  const progress = calculateProgress(goal);

  return (
    <TouchableOpacity style={styles.goalCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitleRow}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColors[goal.status] }]} />
        </View>
        {goal.category && <Text style={styles.categoryText}>{goal.category}</Text>}
      </View>

      {goal.target_biomarker && goal.current_value !== undefined && goal.target_value !== undefined && (
        <View style={styles.biomarkerTarget}>
          <View style={styles.targetRow}>
            <Text style={styles.biomarkerName}>{goal.target_biomarker}</Text>
            <Ionicons
              name={directionIcons[goal.direction]}
              size={20}
              color={goal.direction === 'decrease' ? '#ef4444' : '#10b981'}
            />
          </View>
          <View style={styles.valuesRow}>
            <Text style={styles.currentValue}>{goal.current_value}</Text>
            <Ionicons name="arrow-forward" size={16} color="#6b7280" />
            <Text style={styles.targetValue}>{goal.target_value}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% complete</Text>
        </View>
      )}

      {goal.interventions && goal.interventions.length > 0 && (
        <View style={styles.interventions}>
          <Text style={styles.interventionsLabel}>Interventions:</Text>
          {goal.interventions.slice(0, 3).map((intervention) => (
            <View key={intervention.id} style={styles.interventionItem}>
              <Ionicons
                name={intervention.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={intervention.status === 'completed' ? '#10b981' : '#6b7280'}
              />
              <Text style={styles.interventionText}>{intervention.intervention}</Text>
            </View>
          ))}
          {goal.interventions.length > 3 && (
            <Text style={styles.moreText}>+{goal.interventions.length - 3} more</Text>
          )}
        </View>
      )}

      {goal.notes && (
        <Text style={styles.notesText} numberOfLines={2}>{goal.notes}</Text>
      )}
    </TouchableOpacity>
  );
}

type FilterType = 'all' | 'active' | 'achieved';

export default function Goals() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: goals, isLoading, error, refetch } = useGoals();

  // Calculate stats
  const stats = useMemo(() => {
    if (!goals) return { activeCount: 0, achievedCount: 0 };

    return {
      activeCount: goals.filter(g => g.status === 'active').length,
      achievedCount: goals.filter(g => g.status === 'achieved').length,
    };
  }, [goals]);

  // Filter goals
  const filteredGoals = useMemo(() => {
    if (!goals) return [];

    return goals
      .filter(g => {
        if (filter === 'all') return true;
        return g.status === filter;
      })
      // Sort: active first, then by priority
      .sort((a, b) => {
        if (a.status !== b.status) {
          if (a.status === 'active') return -1;
          if (b.status === 'active') return 1;
        }
        return a.priority - b.priority;
      });
  }, [goals, filter]);

  const handleAddSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading goals...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to load goals</Text>
        <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flag-outline" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Active Goals</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy-outline" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.achievedCount}</Text>
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
          filteredGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
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
      <TouchableOpacity style={styles.fab} onPress={() => setIsAddModalOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <GoalAddModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  errorSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    paddingBottom: 100,
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
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
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
