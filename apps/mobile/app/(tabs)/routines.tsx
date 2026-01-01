import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoutines } from '@/lib/hooks';
import { RoutineAddModal } from '@/components/routines/RoutineAddModal';
import type { Routine, RoutineItem as RoutineItemType } from '@singularity/shared-types';

interface RoutineItemProps {
  item: RoutineItemType;
  onToggle?: () => void;
}

function RoutineItemCard({ item, onToggle }: RoutineItemProps) {
  const completed = item.completed || false;

  return (
    <TouchableOpacity
      style={[styles.routineItem, completed && styles.routineItemCompleted]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, completed && styles.checkboxCompleted]}>
        {completed && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
      <View style={styles.routineItemContent}>
        <Text style={[styles.routineItemTitle, completed && styles.textCompleted]}>
          {item.title}
        </Text>
        <View style={styles.routineItemMeta}>
          {item.time && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{item.time}</Text>
            </View>
          )}
          {item.duration && (
            <View style={styles.metaItem}>
              <Ionicons name="hourglass-outline" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{item.duration}</Text>
            </View>
          )}
          {item.linked_supplement && (
            <View style={[styles.metaItem, styles.supplementTag]}>
              <Ionicons name="fitness-outline" size={12} color="#10b981" />
              <Text style={[styles.metaText, { color: '#10b981' }]}>{item.linked_supplement}</Text>
            </View>
          )}
        </View>
        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function Routines() {
  const [selectedDay, setSelectedDay] = useState('Today');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Local completion state (since API may not persist per-day completion)
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const { data: routines, isLoading, error, refetch } = useRoutines();

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();

  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Calculate progress stats
  const stats = useMemo(() => {
    if (!routines) return { totalItems: 0, completedCount: 0, progress: 0 };

    let totalItems = 0;
    routines.forEach(r => {
      totalItems += (r.items?.length || 0);
    });

    const completedCount = completedItems.size;
    const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

    return { totalItems, completedCount, progress };
  }, [routines, completedItems]);

  // Enhance routine items with local completion state
  const enhancedRoutines = useMemo(() => {
    if (!routines) return [];

    return routines.map(routine => ({
      ...routine,
      items: (routine.items || []).map(item => ({
        ...item,
        completed: completedItems.has(item.id),
      })),
    }));
  }, [routines, completedItems]);

  const handleAddSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading routines...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to load routines</Text>
        <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressPercent}>{Math.round(stats.progress)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${stats.progress}%` }]} />
        </View>
        <Text style={styles.progressSubtext}>
          {stats.completedCount} of {stats.totalItems} tasks completed
        </Text>
      </View>

      {/* Day Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
        {days.map((day, index) => {
          const isToday = index === (today === 0 ? 6 : today - 1);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, isToday && styles.dayChipActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayText, isToday && styles.dayTextActive]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Routines List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {enhancedRoutines.length > 0 ? (
          enhancedRoutines.map(routine => (
            <View key={routine.id} style={styles.routineSection}>
              <View style={styles.routineHeader}>
                <View>
                  <Text style={styles.routineName}>{routine.name}</Text>
                  {routine.time_of_day && (
                    <Text style={styles.routineTime}>{routine.time_of_day}</Text>
                  )}
                </View>
                <Text style={styles.routineCount}>
                  {routine.items?.filter(i => i.completed).length || 0}/{routine.items?.length || 0}
                </Text>
              </View>
              {routine.items && routine.items.length > 0 ? (
                routine.items.map(item => (
                  <RoutineItemCard
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id)}
                  />
                ))
              ) : (
                <View style={styles.emptyRoutine}>
                  <Text style={styles.emptyRoutineText}>No items in this routine</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first routine to track daily habits
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsAddModalOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <RoutineAddModal
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
  progressCard: {
    backgroundColor: '#111111',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1f1f1f',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  daySelector: {
    paddingHorizontal: 16,
    marginBottom: 16,
    maxHeight: 44,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: '#10b981',
  },
  dayText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextActive: {
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
  routineSection: {
    marginBottom: 24,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  routineTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  routineCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  routineItemCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  routineItemContent: {
    flex: 1,
  },
  routineItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 6,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  routineItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  supplementTag: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyRoutine: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyRoutineText: {
    color: '#6b7280',
    fontSize: 14,
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
