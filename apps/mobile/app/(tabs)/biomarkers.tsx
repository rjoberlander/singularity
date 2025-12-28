import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BiomarkerCardProps {
  name: string;
  value: number;
  unit: string;
  status: 'low' | 'normal' | 'high' | 'optimal';
  date: string;
  referenceRange?: string;
}

function BiomarkerCard({ name, value, unit, status, date, referenceRange }: BiomarkerCardProps) {
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

  return (
    <TouchableOpacity style={styles.biomarkerCard} activeOpacity={0.7}>
      <View style={styles.biomarkerHeader}>
        <Text style={styles.biomarkerName}>{name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[status] }]}>
            {statusLabels[status]}
          </Text>
        </View>
      </View>
      <View style={styles.biomarkerValue}>
        <Text style={styles.valueText}>{value}</Text>
        <Text style={styles.unitText}>{unit}</Text>
      </View>
      {referenceRange && (
        <Text style={styles.referenceRange}>Reference: {referenceRange}</Text>
      )}
      <Text style={styles.dateText}>{date}</Text>
    </TouchableOpacity>
  );
}

const SAMPLE_BIOMARKERS: BiomarkerCardProps[] = [
  { name: 'Vitamin D', value: 45, unit: 'ng/mL', status: 'normal', date: 'Dec 15, 2024', referenceRange: '30-100' },
  { name: 'Testosterone', value: 650, unit: 'ng/dL', status: 'optimal', date: 'Dec 15, 2024', referenceRange: '300-1000' },
  { name: 'Ferritin', value: 28, unit: 'ng/mL', status: 'low', date: 'Dec 15, 2024', referenceRange: '30-400' },
  { name: 'HbA1c', value: 5.4, unit: '%', status: 'normal', date: 'Dec 10, 2024', referenceRange: '< 5.7' },
];

export default function Biomarkers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [biomarkers] = useState<BiomarkerCardProps[]>(SAMPLE_BIOMARKERS);

  const filteredBiomarkers = biomarkers.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      </View>

      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
          <Text style={[styles.filterText, styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>Blood</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>Hormones</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>Vitamins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterText}>Metabolic</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Biomarkers List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredBiomarkers.length > 0 ? (
          filteredBiomarkers.map((biomarker, index) => (
            <BiomarkerCard key={index} {...biomarker} />
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
    alignItems: 'center',
    marginBottom: 12,
  },
  biomarkerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
