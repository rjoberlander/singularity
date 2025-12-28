import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SupplementCardProps {
  name: string;
  brand?: string;
  dose: string;
  timing: string;
  frequency: string;
  isActive: boolean;
  pricePerServing?: number;
  onToggle: () => void;
}

function SupplementCard({ name, brand, dose, timing, frequency, isActive, pricePerServing, onToggle }: SupplementCardProps) {
  return (
    <View style={[styles.supplementCard, !isActive && styles.supplementCardInactive]}>
      <View style={styles.supplementHeader}>
        <View style={styles.supplementInfo}>
          <Text style={[styles.supplementName, !isActive && styles.textInactive]}>{name}</Text>
          {brand && <Text style={styles.brandText}>{brand}</Text>}
        </View>
        <Switch
          value={isActive}
          onValueChange={onToggle}
          trackColor={{ false: '#374151', true: '#10b98140' }}
          thumbColor={isActive ? '#10b981' : '#6b7280'}
        />
      </View>

      <View style={styles.doseRow}>
        <View style={styles.doseBadge}>
          <Text style={styles.doseText}>{dose}</Text>
        </View>
        {pricePerServing && (
          <Text style={styles.priceText}>${pricePerServing.toFixed(2)}/serving</Text>
        )}
      </View>

      <View style={styles.scheduleRow}>
        <View style={styles.scheduleItem}>
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.scheduleText}>{timing}</Text>
        </View>
        <View style={styles.scheduleItem}>
          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
          <Text style={styles.scheduleText}>{frequency}</Text>
        </View>
      </View>
    </View>
  );
}

interface Supplement {
  id: string;
  name: string;
  brand?: string;
  dose: string;
  timing: string;
  frequency: string;
  isActive: boolean;
  pricePerServing?: number;
}

const SAMPLE_SUPPLEMENTS: Supplement[] = [
  { id: '1', name: 'Vitamin D3', brand: 'Thorne', dose: '5000 IU', timing: 'Morning', frequency: 'Daily', isActive: true, pricePerServing: 0.25 },
  { id: '2', name: 'Omega-3', brand: 'Nordic Naturals', dose: '2000mg', timing: 'With meals', frequency: 'Daily', isActive: true, pricePerServing: 0.45 },
  { id: '3', name: 'Magnesium Glycinate', brand: 'Pure Encapsulations', dose: '400mg', timing: 'Evening', frequency: 'Daily', isActive: true, pricePerServing: 0.35 },
  { id: '4', name: 'Creatine', brand: 'Thorne', dose: '5g', timing: 'Post-workout', frequency: 'Daily', isActive: false, pricePerServing: 0.20 },
];

export default function Supplements() {
  const [supplements, setSupplements] = useState<Supplement[]>(SAMPLE_SUPPLEMENTS);
  const [showInactive, setShowInactive] = useState(false);

  const toggleSupplement = (id: string) => {
    setSupplements(prev =>
      prev.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const activeCount = supplements.filter(s => s.isActive).length;
  const totalCost = supplements
    .filter(s => s.isActive)
    .reduce((sum, s) => sum + (s.pricePerServing || 0), 0);

  const displayedSupplements = showInactive
    ? supplements
    : supplements.filter(s => s.isActive);

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${totalCost.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Daily Cost</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${(totalCost * 30).toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Monthly</Text>
        </View>
      </View>

      {/* Filter Toggle */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Show inactive</Text>
        <Switch
          value={showInactive}
          onValueChange={setShowInactive}
          trackColor={{ false: '#374151', true: '#10b98140' }}
          thumbColor={showInactive ? '#10b981' : '#6b7280'}
        />
      </View>

      {/* Supplements List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {displayedSupplements.length > 0 ? (
          displayedSupplements.map(supplement => (
            <SupplementCard
              key={supplement.id}
              {...supplement}
              onToggle={() => toggleSupplement(supplement.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No supplements yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your supplements to track your stack
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#1f1f1f',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  supplementCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  supplementCardInactive: {
    opacity: 0.6,
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplementInfo: {
    flex: 1,
  },
  supplementName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  textInactive: {
    color: '#6b7280',
  },
  brandText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  doseBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  doseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  priceText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    fontSize: 14,
    color: '#6b7280',
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
