/**
 * Settings Screen
 * Manage AI API keys and app settings
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
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import {
  AIAPIKey,
  getAIAPIKeys,
  createAIAPIKey,
  deleteAIAPIKey,
  testAIAPIKey,
  togglePrimaryKey
} from '../../services/aiApiKeyService';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const [keys, setKeys] = useState<AIAPIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ provider: 'anthropic', key_name: '', api_key: '' });
  const [testing, setTesting] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await getAIAPIKeys();
      setKeys(data);
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleAddKey = async () => {
    if (!newKey.key_name || !newKey.api_key) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await createAIAPIKey({
        provider: newKey.provider,
        key_name: newKey.key_name,
        api_key: newKey.api_key,
        is_primary: keys.filter(k => k.provider === newKey.provider).length === 0
      });
      setNewKey({ provider: 'anthropic', key_name: '', api_key: '' });
      setShowAddForm(false);
      loadKeys();
      Alert.alert('Success', 'API key added successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add key');
    }
  };

  const handleDeleteKey = (key: AIAPIKey) => {
    Alert.alert(
      'Delete API Key',
      `Are you sure you want to delete "${key.key_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAIAPIKey(key.id);
              loadKeys();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete key');
            }
          }
        }
      ]
    );
  };

  const handleTestKey = async (key: AIAPIKey) => {
    setTesting(key.id);
    try {
      const result = await testAIAPIKey(key.id);
      Alert.alert(
        result.success ? 'Success' : 'Failed',
        result.success
          ? `Connection successful (${result.response_time_ms}ms)`
          : result.error || 'Connection failed'
      );
      loadKeys();
    } catch (error) {
      Alert.alert('Error', 'Failed to test key');
    } finally {
      setTesting(null);
    }
  };

  const handleTogglePrimary = async (key: AIAPIKey) => {
    try {
      await togglePrimaryKey(key.id);
      loadKeys();
    } catch (error) {
      Alert.alert('Error', 'Failed to update key');
    }
  };

  const getStatusColor = (status: AIAPIKey['health_status']) => {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#eab308';
      case 'unhealthy':
      case 'critical': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const providers = ['anthropic', 'openai', 'perplexity'] as const;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadKeys(); }}
            tintColor="#10b981"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your AI API keys</Text>
        </View>

        {/* AI API Keys Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI API Keys</Text>
            <TouchableOpacity
              onPress={() => setShowAddForm(!showAddForm)}
              style={styles.addButton}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Add Key Form */}
          {showAddForm && (
            <View style={styles.addForm}>
              <Text style={styles.label}>Provider</Text>
              <View style={styles.providerRow}>
                {providers.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setNewKey({ ...newKey, provider: p })}
                    style={[
                      styles.providerChip,
                      newKey.provider === p && styles.providerChipActive
                    ]}
                  >
                    <Text style={[
                      styles.providerChipText,
                      newKey.provider === p && styles.providerChipTextActive
                    ]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Key Name</Text>
              <TextInput
                value={newKey.key_name}
                onChangeText={(text) => setNewKey({ ...newKey, key_name: text })}
                placeholder="e.g., Production Key"
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.label}>API Key</Text>
              <TextInput
                value={newKey.api_key}
                onChangeText={(text) => setNewKey({ ...newKey, api_key: text })}
                placeholder="sk-..."
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <View style={styles.formButtons}>
                <TouchableOpacity onPress={handleAddKey} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAddForm(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Keys List */}
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : keys.length === 0 ? (
            <Text style={styles.emptyText}>
              No API keys configured. Add one to use the AI assistant.
            </Text>
          ) : (
            keys.map((key) => (
              <View key={key.id} style={styles.keyItem}>
                <View style={styles.keyInfo}>
                  <View style={styles.keyHeader}>
                    <Text style={styles.keyProvider}>{key.provider}</Text>
                    {key.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                    <View
                      style={[styles.statusDot, { backgroundColor: getStatusColor(key.health_status) }]}
                    />
                  </View>
                  <Text style={styles.keyName}>{key.key_name}</Text>
                  <Text style={styles.keyMasked}>{key.api_key_masked}</Text>
                </View>
                <View style={styles.keyActions}>
                  <TouchableOpacity
                    onPress={() => handleTogglePrimary(key)}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name={key.is_primary ? 'star' : 'star-outline'}
                      size={20}
                      color={key.is_primary ? '#10b981' : '#6b7280'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleTestKey(key)}
                    style={styles.actionButton}
                    disabled={testing === key.id}
                  >
                    <Ionicons
                      name="flask"
                      size={20}
                      color={testing === key.id ? '#6b7280' : '#3b82f6'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteKey(key)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut }
            ]);
          }}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  addForm: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: 6,
  },
  providerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  providerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  providerChipActive: {
    backgroundColor: '#10b981',
  },
  providerChipText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  providerChipTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: '#fff',
    fontSize: 15,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  keyInfo: {
    flex: 1,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyProvider: {
    fontWeight: '500',
    color: '#fff',
    textTransform: 'capitalize',
  },
  primaryBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  primaryBadgeText: {
    color: '#10b981',
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  keyName: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  keyMasked: {
    color: '#4b5563',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  keyActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
