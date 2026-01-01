import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { useBiomarkers, useSupplements, useGoals, useRoutines } from '@/lib/hooks';
import type { Biomarker } from '@singularity/shared-types';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLoading?: boolean;
  onPress?: () => void;
}

function StatCard({ title, value, subtitle, icon, color, isLoading, onPress }: StatCardProps) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardInner}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={color} style={styles.cardLoader} />
        ) : (
          <>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface QuickActionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function QuickAction({ title, icon, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#10b981" />
      <Text style={styles.quickActionText}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
    </TouchableOpacity>
  );
}

// Get unique biomarkers by name
function getUniqueBiomarkerCount(biomarkers: Biomarker[]): number {
  const uniqueNames = new Set(biomarkers.map(b => b.name));
  return uniqueNames.size;
}

// Get recent biomarkers for activity feed
function getRecentBiomarkers(biomarkers: Biomarker[]): Biomarker[] {
  return [...biomarkers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
}

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch all data
  const {
    data: biomarkers,
    isLoading: biomarkersLoading,
    refetch: refetchBiomarkers,
  } = useBiomarkers({ limit: 500 });

  const {
    data: supplements,
    isLoading: supplementsLoading,
    refetch: refetchSupplements,
  } = useSupplements();

  const {
    data: goals,
    isLoading: goalsLoading,
    refetch: refetchGoals,
  } = useGoals();

  const {
    data: routines,
    isLoading: routinesLoading,
    refetch: refetchRoutines,
  } = useRoutines();

  // Calculate stats
  const stats = useMemo(() => {
    return {
      biomarkerCount: biomarkers ? getUniqueBiomarkerCount(biomarkers) : 0,
      supplementCount: supplements ? supplements.filter(s => s.is_active).length : 0,
      goalCount: goals ? goals.filter(g => g.status === 'active').length : 0,
      routineCount: routines ? routines.length : 0,
    };
  }, [biomarkers, supplements, goals, routines]);

  // Get recent activity
  const recentActivity = useMemo(() => {
    if (!biomarkers || biomarkers.length === 0) return [];
    return getRecentBiomarkers(biomarkers);
  }, [biomarkers]);

  const isRefreshing = biomarkersLoading || supplementsLoading || goalsLoading || routinesLoading;

  const handleRefresh = () => {
    refetchBiomarkers();
    refetchSupplements();
    refetchGoals();
    refetchRoutines();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#10b981"
          colors={['#10b981']}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name || user?.email?.split('@')[0] || 'User'}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Biomarkers"
          value={stats.biomarkerCount}
          subtitle="tracked"
          icon="pulse-outline"
          color="#10b981"
          isLoading={biomarkersLoading}
          onPress={() => router.push('/(tabs)/biomarkers')}
        />
        <StatCard
          title="Supplements"
          value={stats.supplementCount}
          subtitle="active"
          icon="fitness-outline"
          color="#3b82f6"
          isLoading={supplementsLoading}
          onPress={() => router.push('/(tabs)/supplements')}
        />
        <StatCard
          title="Goals"
          value={stats.goalCount}
          subtitle="in progress"
          icon="trophy-outline"
          color="#f59e0b"
          isLoading={goalsLoading}
          onPress={() => router.push('/(tabs)/goals')}
        />
        <StatCard
          title="Routines"
          value={stats.routineCount}
          subtitle="daily"
          icon="time-outline"
          color="#8b5cf6"
          isLoading={routinesLoading}
          onPress={() => router.push('/(tabs)/routines')}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <QuickAction
            title="Add Biomarker"
            icon="pulse-outline"
            onPress={() => router.push('/(tabs)/biomarkers')}
          />
          <QuickAction
            title="Add Supplement"
            icon="add-circle-outline"
            onPress={() => router.push('/(tabs)/supplements')}
          />
          <QuickAction
            title="View Goals"
            icon="trophy-outline"
            onPress={() => router.push('/(tabs)/goals')}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Biomarkers</Text>
        {biomarkersLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color="#10b981" />
          </View>
        ) : recentActivity.length > 0 ? (
          <View style={styles.activityContainer}>
            {recentActivity.map((biomarker) => (
              <View key={biomarker.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name="pulse" size={16} color="#10b981" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{biomarker.name}</Text>
                  <Text style={styles.activityValue}>
                    {biomarker.value} {biomarker.unit}
                  </Text>
                </View>
                <Text style={styles.activityDate}>
                  {formatDate(biomarker.date_tested)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#374151" />
            <Text style={styles.emptyStateText}>No biomarkers yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start tracking your health to see updates here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '50%',
    padding: 6,
  },
  cardInner: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLoader: {
    marginTop: 16,
    marginBottom: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  statTitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  quickActionsContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  loadingState: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  activityContainer: {
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10b98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  activityValue: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
});
