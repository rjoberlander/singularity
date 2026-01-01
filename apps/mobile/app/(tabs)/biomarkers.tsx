import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBiomarkers } from '@/lib/hooks';
import { BiomarkerAddModal } from '@/components/biomarkers/BiomarkerAddModal';
import type { Biomarker } from '@singularity/shared-types';

type BiomarkerStatus = 'low' | 'normal' | 'high' | 'optimal';

interface BiomarkerCardProps {
  biomarker: Biomarker;
  onPress?: () => void;
}

function getStatus(biomarker: Biomarker): BiomarkerStatus {
  if (biomarker.status) return biomarker.status;

  // Calculate status from reference ranges if available
  if (biomarker.optimal_range_low !== undefined && biomarker.optimal_range_high !== undefined) {
    if (biomarker.value >= biomarker.optimal_range_low && biomarker.value <= biomarker.optimal_range_high) {
      return 'optimal';
    }
  }

  if (biomarker.reference_range_low !== undefined && biomarker.reference_range_high !== undefined) {
    if (biomarker.value < biomarker.reference_range_low) return 'low';
    if (biomarker.value > biomarker.reference_range_high) return 'high';
    return 'normal';
  }

  return 'normal';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BiomarkerCard({ biomarker, onPress }: BiomarkerCardProps) {
  const status = getStatus(biomarker);

  const statusColors = {
    low: '#ef4444',
    normal: '#10b981',
    high: '#f59e0b',
    optimal: '#22c55e',
  };

  const statusLabels = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    optimal: 'Optimal',
  };

  const referenceRange = biomarker.reference_range_low !== undefined && biomarker.reference_range_high !== undefined
    ? `${biomarker.reference_range_low} - ${biomarker.reference_range_high}`
    : undefined;

  return (
    <TouchableOpacity style={styles.biomarkerCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.biomarkerHeader}>
        <View style={styles.biomarkerNameContainer}>
          <Text style={styles.biomarkerName}>{biomarker.name}</Text>
          {biomarker.category && (
            <Text style={styles.categoryText}>{biomarker.category}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[status] }]}>
            {statusLabels[status]}
          </Text>
        </View>
      </View>
      <View style={styles.biomarkerValue}>
        <Text style={styles.valueText}>{biomarker.value}</Text>
        <Text style={styles.unitText}>{biomarker.unit}</Text>
      </View>
      {referenceRange && (
        <Text style={styles.referenceRange}>Reference: {referenceRange}</Text>
      )}
      <Text style={styles.dateText}>{formatDate(biomarker.date_tested)}</Text>
    </TouchableOpacity>
  );
}

// Get unique categories from biomarkers
function getCategories(biomarkers: Biomarker[]): string[] {
  const categories = new Set<string>();
  biomarkers.forEach(b => {
    if (b.category) categories.add(b.category);
  });
  return Array.from(categories).sort();
}

export default function Biomarkers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: biomarkers, isLoading, error, refetch } = useBiomarkers({ limit: 1000 });

  // Get categories for filter chips
  const categories = useMemo(() => {
    if (!biomarkers) return [];
    return getCategories(biomarkers);
  }, [biomarkers]);

  // Filter biomarkers based on search and category
  const filteredBiomarkers = useMemo(() => {
    if (!biomarkers) return [];

    return biomarkers
      .filter(b => {
        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchesName = b.name.toLowerCase().includes(query);
          const matchesCategory = b.category?.toLowerCase().includes(query);
          if (!matchesName && !matchesCategory) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && b.category !== selectedCategory) {
          return false;
        }

        return true;
      })
      // Sort by date (most recent first)
      .sort((a, b) => new Date(b.date_tested).getTime() - new Date(a.date_tested).getTime());
  }, [biomarkers, searchQuery, selectedCategory]);

  // Group biomarkers by name and get latest value for each
  const latestBiomarkers = useMemo(() => {
    const byName = new Map<string, Biomarker>();

    filteredBiomarkers.forEach(b => {
      const existing = byName.get(b.name);
      if (!existing || new Date(b.date_tested) > new Date(existing.date_tested)) {
        byName.set(b.name, b);
      }
    });

    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBiomarkers]);

  const handleAddSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading biomarkers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to load biomarkers</Text>
        <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search biomarkers..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.filterChip, selectedCategory === category && styles.filterChipActive]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.filterText, selectedCategory === category && styles.filterTextActive]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Biomarkers List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {latestBiomarkers.length > 0 ? (
          latestBiomarkers.map((biomarker) => (
            <BiomarkerCard key={biomarker.id} biomarker={biomarker} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="pulse-outline" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>No biomarkers yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first lab results to start tracking
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsAddModalOpen(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Modal */}
      <BiomarkerAddModal
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
    maxHeight: 44,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111111',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10b981',
  },
  filterText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
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
  biomarkerCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  biomarkerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  biomarkerNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  biomarkerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  categoryText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  biomarkerValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  unitText: {
    fontSize: 16,
    color: '#9ca3af',
    marginLeft: 6,
  },
  referenceRange: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#4b5563',
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
