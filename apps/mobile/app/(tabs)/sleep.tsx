/**
 * Sleep Tab
 * Eight Sleep integration for sleep tracking
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  IntegrationStatus,
  SleepSession,
  SleepAnalysis,
  SleepTrend,
  connectEightSleep,
  disconnectEightSleep,
  getEightSleepStatus,
  syncEightSleep,
  getSleepSessions,
  getSleepAnalysis,
  getSleepTrends,
  updateEightSleepSettings,
  formatDuration,
  getSleepScoreColor,
  getSleepStageColor,
  formatTime,
  formatDate,
  COMMON_TIMEZONES,
  getCorrelationSummary,
  CorrelationSummary,
} from '../../services/eightSleepService';
import { SleepTrendChart } from '../../components/sleep/SleepTrendChart';
import { CorrelationCard, SupplementCorrelation } from '../../components/sleep/CorrelationCard';

type ViewMode = 'dashboard' | 'insights' | 'history' | 'settings';

export default function SleepScreen() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [lastNight, setLastNight] = useState<SleepSession | null>(null);
  const [analysis, setAnalysis] = useState<SleepAnalysis | null>(null);
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [trends, setTrends] = useState<SleepTrend[]>([]);
  const [correlationSummary, setCorrelationSummary] = useState<CorrelationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedMetric, setSelectedMetric] = useState<'sleep_score' | 'deep_sleep_pct' | 'avg_hrv' | 'time_slept_hours'>('sleep_score');

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncTime, setSyncTime] = useState('08:00');
  const [syncTimezone, setSyncTimezone] = useState('America/Los_Angeles');
  const [connecting, setConnecting] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const statusData = await getEightSleepStatus();
      setStatus(statusData);

      if (statusData.connected) {
        const [sessionsData, analysisData, trendsData] = await Promise.all([
          getSleepSessions({ limit: 14 }),
          getSleepAnalysis(30),
          getSleepTrends(30),
        ]);

        setSessions(sessionsData.sessions);
        setAnalysis(analysisData);
        setTrends(trendsData.trends);

        if (sessionsData.sessions.length > 0) {
          setLastNight(sessionsData.sessions[0]);
        }

        getCorrelationSummary(90)
          .then(setCorrelationSummary)
          .catch((err) => console.log('Correlation data not available yet:', err));
      }
    } catch (error) {
      console.error('Failed to load sleep data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnect = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setConnecting(true);
    try {
      await connectEightSleep({
        email,
        password,
        sync_time: syncTime + ':00',
        sync_timezone: syncTimezone,
      });

      Alert.alert('Success', 'Eight Sleep connected! Syncing your sleep data...');
      setShowConnectForm(false);
      setEmail('');
      setPassword('');
      loadData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Eight Sleep',
      'This will remove your Eight Sleep connection and all synced sleep data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectEightSleep();
              setStatus({ connected: false, sync_enabled: false, consecutive_failures: 0 });
              setLastNight(null);
              setAnalysis(null);
              setSessions([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect');
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncEightSleep();
      Alert.alert('Sync Complete', `Synced ${result.sessions_synced} nights of sleep data`);
      loadData();
    } catch (error) {
      Alert.alert('Sync Failed', error instanceof Error ? error.message : 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateSettings = async (settings: {
    sync_enabled?: boolean;
    sync_time?: string;
    sync_timezone?: string;
  }) => {
    setSettingsLoading(true);
    try {
      await updateEightSleepSettings(settings);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const renderSleepScore = (score: number | null, size: 'large' | 'small' = 'large') => {
    const dimension = size === 'large' ? 128 : 64;
    const textSize = size === 'large' ? 36 : 20;

    return (
      <View
        style={[
          styles.sleepScoreCircle,
          { width: dimension, height: dimension, backgroundColor: getSleepScoreColor(score) + '20' }
        ]}
      >
        <Text style={[styles.sleepScoreText, { fontSize: textSize, color: getSleepScoreColor(score) }]}>
          {score ?? '--'}
        </Text>
        {size === 'large' && <Text style={styles.sleepScoreLabel}>Sleep Score</Text>}
      </View>
    );
  };

  const renderSleepStages = (session: SleepSession) => {
    const total =
      (session.deep_sleep_minutes || 0) +
      (session.rem_sleep_minutes || 0) +
      (session.light_sleep_minutes || 0) +
      (session.awake_minutes || 0);

    if (total === 0) return null;

    const stages = [
      { key: 'deep', minutes: session.deep_sleep_minutes || 0, color: getSleepStageColor('deep') },
      { key: 'rem', minutes: session.rem_sleep_minutes || 0, color: getSleepStageColor('rem') },
      { key: 'light', minutes: session.light_sleep_minutes || 0, color: getSleepStageColor('light') },
      { key: 'awake', minutes: session.awake_minutes || 0, color: getSleepStageColor('awake') },
    ];

    return (
      <View>
        <View style={styles.stagesBar}>
          {stages.map((stage) => (
            <View
              key={stage.key}
              style={{ width: `${(stage.minutes / total) * 100}%`, backgroundColor: stage.color, height: 12 }}
            />
          ))}
        </View>
        <View style={styles.stagesLabels}>
          {stages.map((stage) => (
            <View key={stage.key} style={styles.stageLabel}>
              <View style={styles.stageLabelRow}>
                <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                <Text style={styles.stageName}>{stage.key}</Text>
              </View>
              <Text style={styles.stageDuration}>{formatDuration(stage.minutes)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!status?.connected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <View style={styles.notConnectedIcon}>
            <Ionicons name="moon-outline" size={48} color="#6b7280" />
          </View>
          <Text style={styles.notConnectedTitle}>Connect Eight Sleep</Text>
          <Text style={styles.notConnectedText}>
            Link your Eight Sleep account to automatically track your sleep data and correlate it with your supplement protocols.
          </Text>

          {showConnectForm ? (
            <View style={styles.connectForm}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Connect Eight Sleep</Text>
                <TouchableOpacity onPress={() => setShowConnectForm(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Your credentials are encrypted and stored securely. We use them only to sync your sleep data.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Your Eight Sleep password"
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <TouchableOpacity
                onPress={handleConnect}
                disabled={connecting}
                style={styles.connectButton}
              >
                {connecting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect Eight Sleep</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowConnectForm(true)} style={styles.getStartedButton}>
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor="#10b981"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sleep</Text>
            <Text style={styles.subtitle}>Eight Sleep connected</Text>
          </View>
          <View style={styles.syncStatus}>
            <View style={[
              styles.syncDot,
              { backgroundColor: status.last_sync_status === 'success' ? '#10b981' : status.last_sync_status === 'failed' ? '#ef4444' : '#6b7280' }
            ]} />
            <Text style={styles.syncText}>
              {status.last_sync_status === 'success' ? 'Synced' : status.last_sync_status === 'failed' ? 'Failed' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabsContainer}>
          {(['dashboard', 'insights', 'history', 'settings'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.tab, viewMode === mode && styles.tabActive]}
            >
              <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dashboard */}
        {viewMode === 'dashboard' && lastNight && (
          <View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardLabel}>Last Night</Text>
                  <Text style={styles.cardTitle}>{formatDate(lastNight.date)}</Text>
                </View>
                {renderSleepScore(lastNight.sleep_score)}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Time Asleep</Text>
                  <Text style={styles.metricValue}>{formatDuration(lastNight.time_slept)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Time in Bed</Text>
                  <Text style={styles.metricValue}>{formatDuration(lastNight.time_in_bed)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Wake Events</Text>
                  <Text style={styles.metricValue}>{lastNight.wake_events}</Text>
                </View>
              </View>

              {lastNight.woke_between_2_and_4_am && (
                <View style={styles.alertBox}>
                  <Ionicons name="warning" size={16} color="#f97316" />
                  <Text style={styles.alertText}>
                    Woke between 2-4am at {formatTime(lastNight.wake_time_between_2_and_4_am)}
                  </Text>
                </View>
              )}

              {renderSleepStages(lastNight)}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Vitals</Text>
              <View style={styles.vitalsRow}>
                <View style={styles.vitalItem}>
                  <Ionicons name="heart" size={20} color="#ef4444" />
                  <Text style={styles.vitalLabel}>Avg HR</Text>
                  <Text style={styles.vitalValue}>{lastNight.avg_heart_rate?.toFixed(0) ?? '--'}</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Ionicons name="pulse" size={20} color="#8b5cf6" />
                  <Text style={styles.vitalLabel}>Avg HRV</Text>
                  <Text style={styles.vitalValue}>{lastNight.avg_hrv?.toFixed(0) ?? '--'}</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Ionicons name="cloud-outline" size={20} color="#3b82f6" />
                  <Text style={styles.vitalLabel}>Breathing</Text>
                  <Text style={styles.vitalValue}>{lastNight.avg_breathing_rate?.toFixed(1) ?? '--'}</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Ionicons name="thermometer-outline" size={20} color="#10b981" />
                  <Text style={styles.vitalLabel}>Bed Temp</Text>
                  <Text style={styles.vitalValue}>{lastNight.avg_bed_temp?.toFixed(0) ?? '--'}°</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {viewMode === 'dashboard' && !lastNight && (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyStateText}>No sleep data yet</Text>
            <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.syncNowButton}>
              <Text style={styles.syncNowButtonText}>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History */}
        {viewMode === 'history' && (
          <View>
            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No sleep sessions found</Text>
              </View>
            ) : (
              sessions.map((session) => (
                <View key={session.id} style={styles.historyCard}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{formatDate(session.date)}</Text>
                    <Text style={styles.historyDuration}>{formatDuration(session.time_slept)} sleep</Text>
                    {session.woke_between_2_and_4_am && (
                      <View style={styles.historyAlert}>
                        <Ionicons name="warning" size={12} color="#f97316" />
                        <Text style={styles.historyAlertText}>2-4am wake</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyRight}>
                    <View style={styles.historyDeep}>
                      <Text style={styles.historyDeepLabel}>Deep</Text>
                      <Text style={styles.historyDeepValue}>{session.deep_sleep_pct?.toFixed(0)}%</Text>
                    </View>
                    {renderSleepScore(session.sleep_score, 'small')}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Settings */}
        {viewMode === 'settings' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Sync Settings</Text>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>Auto-sync enabled</Text>
                  <Text style={styles.settingSubtitle}>Automatically sync each morning</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleUpdateSettings({ sync_enabled: !status?.sync_enabled })}
                  disabled={settingsLoading}
                  style={[styles.toggle, status?.sync_enabled && styles.toggleActive]}
                >
                  <View style={[styles.toggleThumb, status?.sync_enabled && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingLabel}>Last sync</Text>
                <Text style={styles.settingValue}>
                  {status?.last_sync_at ? new Date(status.last_sync_at).toLocaleString() : 'Never'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.syncButton}>
              {syncing ? (
                <ActivityIndicator color="#10b981" />
              ) : (
                <>
                  <Ionicons name="sync" size={20} color="#10b981" />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
              <Text style={styles.disconnectButtonText}>Disconnect Eight Sleep</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Insights */}
        {viewMode === 'insights' && (
          <View>
            {trends.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>30-Day Trend</Text>
                <SleepTrendChart trends={trends} metric={selectedMetric} height={140} showLabels />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyStateText}>
                  Keep syncing your sleep data to unlock insights{'\n'}and supplement correlations!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  syncStatus: { flexDirection: 'row', alignItems: 'center' },
  syncDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  syncText: { fontSize: 14, color: '#6b7280' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#111111', borderRadius: 8, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 6 },
  tabActive: { backgroundColor: '#1f1f1f' },
  tabText: { textAlign: 'center', color: '#6b7280', fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '500' },
  card: { backgroundColor: '#111111', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardLabel: { fontSize: 14, color: '#6b7280' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cardSectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  sleepScoreCircle: { borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  sleepScoreText: { fontWeight: '700' },
  sleepScoreLabel: { fontSize: 12, color: '#6b7280' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metric: { alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#6b7280' },
  metricValue: { fontSize: 18, fontWeight: '600', color: '#fff' },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9731620', borderRadius: 8, padding: 12, marginBottom: 16 },
  alertText: { color: '#f97316', marginLeft: 8, fontSize: 14 },
  stagesBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  stagesLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stageLabel: { alignItems: 'center' },
  stageLabelRow: { flexDirection: 'row', alignItems: 'center' },
  stageDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  stageName: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  stageDuration: { fontSize: 12, color: '#fff' },
  vitalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vitalItem: { alignItems: 'center', flex: 1 },
  vitalLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  vitalValue: { fontSize: 16, fontWeight: '600', color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyStateText: { color: '#6b7280', marginTop: 16, textAlign: 'center' },
  syncNowButton: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  syncNowButtonText: { color: '#fff', fontWeight: '500' },
  historyCard: { backgroundColor: '#111111', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 15, fontWeight: '600', color: '#fff' },
  historyDuration: { fontSize: 14, color: '#6b7280' },
  historyAlert: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  historyAlertText: { fontSize: 12, color: '#f97316', marginLeft: 4 },
  historyRight: { flexDirection: 'row', alignItems: 'center' },
  historyDeep: { alignItems: 'flex-end', marginRight: 12 },
  historyDeepLabel: { fontSize: 12, color: '#6b7280' },
  historyDeepValue: { fontSize: 14, color: '#fff' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  settingLabel: { fontSize: 15, color: '#fff' },
  settingSubtitle: { fontSize: 13, color: '#6b7280' },
  settingSection: { marginTop: 12 },
  settingValue: { fontSize: 14, color: '#fff', marginTop: 4 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#374151', padding: 2 },
  toggleActive: { backgroundColor: '#10b981' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbActive: { marginLeft: 20 },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111', borderRadius: 12, padding: 16, marginBottom: 16 },
  syncButtonText: { color: '#10b981', fontWeight: '600', marginLeft: 8 },
  disconnectButton: { backgroundColor: '#ef444420', borderRadius: 12, padding: 16, alignItems: 'center' },
  disconnectButtonText: { color: '#ef4444', fontWeight: '600' },
  notConnectedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notConnectedIcon: { backgroundColor: '#111111', borderRadius: 48, padding: 24, marginBottom: 16 },
  notConnectedTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 8 },
  notConnectedText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  getStartedButton: { backgroundColor: '#10b981', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  getStartedButtonText: { color: '#fff', fontWeight: '600' },
  connectForm: { backgroundColor: '#111111', borderRadius: 16, padding: 16, width: '100%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  warningBox: { backgroundColor: '#f9731620', borderRadius: 8, padding: 12, marginBottom: 16 },
  warningText: { fontSize: 12, color: '#f97316' },
  inputLabel: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  input: { backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12, color: '#fff', fontSize: 15 },
  connectButton: { backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  connectButtonText: { color: '#fff', fontWeight: '600' },
});
