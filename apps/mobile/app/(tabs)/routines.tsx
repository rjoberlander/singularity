import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RoutineItemProps {
  title: string;
  time?: string;
  duration?: string;
  linkedSupplement?: string;
  completed?: boolean;
  onToggle?: () => void;
}

function RoutineItem({ title, time, duration, linkedSupplement, completed, onToggle }: RoutineItemProps) {
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
        <Text style={[styles.routineItemTitle, completed && styles.textCompleted]}>{title}</Text>
        <View style={styles.routineItemMeta}>
          {time && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{time}</Text>
            </View>
          )}
          {duration && (
            <View style={styles.metaItem}>
              <Ionicons name="hourglass-outline" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          )}
          {linkedSupplement && (
            <View style={[styles.metaItem, styles.supplementTag]}>
              <Ionicons name="fitness-outline" size={12} color="#10b981" />
              <Text style={[styles.metaText, { color: '#10b981' }]}>{linkedSupplement}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface Routine {
  id: string;
  name: string;
  timeOfDay: string;
  items: {
    id: string;
    title: string;
    time?: string;
    duration?: string;
    linkedSupplement?: string;
    completed: boolean;
  }[];
}

const SAMPLE_ROUTINES: Routine[] = [
  {
    id: '1',
    name: 'Morning Routine',
    timeOfDay: 'morning',
    items: [
      { id: '1', title: 'Wake up + hydrate', time: '6:00 AM', completed: true },
      { id: '2', title: 'Take morning supplements', linkedSupplement: 'Vitamin D3, Omega-3', completed: true },
      { id: '3', title: 'Cold shower', duration: '3 min', completed: false },
      { id: '4', title: 'Meditation', duration: '10 min', completed: false },
    ],
  },
  {
    id: '2',
    name: 'Evening Routine',
    timeOfDay: 'evening',
    items: [
      { id: '5', title: 'Take evening supplements', time: '8:00 PM', linkedSupplement: 'Magnesium', completed: false },
      { id: '6', title: 'Blue light blocking', time: '9:00 PM', completed: false },
      { id: '7', title: 'Reading', duration: '30 min', completed: false },
      { id: '8', title: 'Sleep', time: '10:00 PM', completed: false },
    ],
  },
];

export default function Routines() {
  const [routines, setRoutines] = useState<Routine[]>(SAMPLE_ROUTINES);
  const [selectedDay, setSelectedDay] = useState('Today');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();

  const toggleItem = (routineId: string, itemId: string) => {
    setRoutines(prev =>
      prev.map(routine => {
        if (routine.id !== routineId) return routine;
        return {
          ...routine,
          items: routine.items.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        };
      })
    );
  };

  const totalItems = routines.reduce((sum, r) => sum + r.items.length, 0);
  const completedItems = routines.reduce(
    (sum, r) => sum + r.items.filter(i => i.completed).length,
    0
  );
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressSubtext}>
          {completedItems} of {totalItems} tasks completed
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
        {routines.map(routine => (
          <View key={routine.id} style={styles.routineSection}>
            <View style={styles.routineHeader}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <Text style={styles.routineCount}>
                {routine.items.filter(i => i.completed).length}/{routine.items.length}
              </Text>
            </View>
            {routine.items.map(item => (
              <RoutineItem
                key={item.id}
                {...item}
                onToggle={() => toggleItem(routine.id, item.id)}
              />
            ))}
          </View>
        ))}
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
  },
  routineSection: {
    marginBottom: 24,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
