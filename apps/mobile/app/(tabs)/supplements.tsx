import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupplements, useToggleSupplement } from '@/lib/hooks';
import { SupplementAddModal } from '@/components/supplements/SupplementAddModal';
import type { Supplement } from '@singularity/shared-types';

// Format timing display
function formatTiming(timing?: string | string[]): string {
  if (!timing) return 'Anytime';

  const timingLabels: Record<string, string> = {
    wake_up: 'Wake up',
    am: 'Morning',
    lunch: 'Lunch',
    pm: 'Afternoon',
    dinner: 'Dinner',
    before_bed: 'Before bed',
    specific: 'Specific time',
  };

  if (Array.isArray(timing)) {
    return timing.map(t => timingLabels[t] || t).join(', ');
  }

  return timingLabels[timing] || timing;
}

// Format frequency display
function formatFrequency(frequency?: string): string {
  const frequencyLabels: Record<string, string> = {
    daily: 'Daily',
    every_other_day: 'Every other day',
    custom: 'Custom',
    as_needed: 'As needed',
  };

  if (!frequency) return 'Daily';
  return frequencyLabels[frequency] || frequency;
}

// Format dose display
function formatDose(supplement: Supplement): string {
  const quantity = supplement.intake_quantity || 1;
  const form = supplement.intake_form || 'dose';
  const doseAmount = supplement.dose_per_serving;
  const doseUnit = supplement.dose_unit;

  if (doseAmount && doseUnit) {
    return `${quantity} ${form} (${doseAmount}${doseUnit})`;
  }

  return `${quantity} ${form}`;
}

interface SupplementCardProps {
  supplement: Supplement;
  onToggle: () => void;
  onPress?: () => void;
}

function SupplementCard({ supplement, onToggle, onPress }: SupplementCardProps) {
  const dose = formatDose(supplement);
  const timing = formatTiming(supplement.timings || supplement.timing);
  const frequency = formatFrequency(supplement.frequency);

  return (
    <TouchableOpacity
      style={[styles.supplementCard, !supplement.is_active && styles.supplementCardInactive]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.supplementHeader}>
        <View style={styles.supplementInfo}>
          <Text style={[styles.supplementName, !supplement.is_active && styles.textInactive]}>
            {supplement.name}
          </Text>
          {supplement.brand && <Text style={styles.brandText}>{supplement.brand}</Text>}
        </View>
        <Switch
          value={supplement.is_active}
          onValueChange={onToggle}
          trackColor={{ false: '#374151', true: '#10b98140' }}
          thumbColor={supplement.is_active ? '#10b981' : '#6b7280'}
        />
      </View>

      <View style={styles.doseRow}>
        <View style={styles.doseBadge}>
          <Text style={styles.doseText}>{dose}</Text>
        </View>
        {supplement.price_per_serving && (
          <Text style={styles.priceText}>${supplement.price_per_serving.toFixed(2)}/serving</Text>
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

      {supplement.reason && (
        <Text style={styles.reasonText} numberOfLines={2}>{supplement.reason}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function Supplements() {
  const [showInactive, setShowInactive] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: supplements, isLoading, error, refetch } = useSupplements();
  const toggleMutation = useToggleSupplement();

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id);
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!supplements) return { activeCount: 0, dailyCost: 0, monthlyCost: 0 };

    const activeSupplements = supplements.filter(s => s.is_active);
    const dailyCost = activeSupplements.reduce((sum, s) => sum + (s.price_per_serving || 0), 0);

    return {
      activeCount: activeSupplements.length,
      dailyCost,
      monthlyCost: dailyCost * 30,
    };
  }, [supplements]);

  const displayedSupplements = useMemo(() => {
    if (!supplements) return [];
    const filtered = showInactive ? supplements : supplements.filter(s => s.is_active);
    // Sort: active first, then by name
    return filtered.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [supplements, showInactive]);

  const handleAddSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading supplements...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to load supplements</Text>
        <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${stats.dailyCost.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Daily Cost</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${stats.monthlyCost.toFixed(0)}</Text>
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
              supplement={supplement}
              onToggle={() => handleToggle(supplement.id)}
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
      <TouchableOpacity style={styles.fab} onPress={() => setIsAddModalOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <SupplementAddModal
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
    paddingBottom: 100,
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
  reasonText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 10,
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
