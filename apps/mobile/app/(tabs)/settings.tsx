/**
 * Settings Screen
 * Manage AI API keys and app settings
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadKeys(); }} />
        }
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Settings</Text>
          <Text className="text-gray-600 dark:text-gray-400">Manage your AI API keys</Text>
        </View>

        {/* AI API Keys Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">AI API Keys</Text>
            <TouchableOpacity
              onPress={() => setShowAddForm(!showAddForm)}
              className="bg-purple-600 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white ml-1 font-medium">Add</Text>
            </TouchableOpacity>
          </View>

          {/* Add Key Form */}
          {showAddForm && (
            <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</Text>
              <View className="flex-row mb-3">
                {providers.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setNewKey({ ...newKey, provider: p })}
                    className={`px-3 py-2 rounded-lg mr-2 ${
                      newKey.provider === p
                        ? 'bg-purple-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <Text className={newKey.provider === p ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name</Text>
              <TextInput
                value={newKey.key_name}
                onChangeText={(text) => setNewKey({ ...newKey, key_name: text })}
                placeholder="e.g., Production Key"
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mb-3 text-gray-900 dark:text-white"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</Text>
              <TextInput
                value={newKey.api_key}
                onChangeText={(text) => setNewKey({ ...newKey, api_key: text })}
                placeholder="sk-..."
                secureTextEntry
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mb-3 text-gray-900 dark:text-white"
                placeholderTextColor="#9ca3af"
              />

              <View className="flex-row">
                <TouchableOpacity
                  onPress={handleAddKey}
                  className="bg-purple-600 px-4 py-2 rounded-lg mr-2"
                >
                  <Text className="text-white font-medium">Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAddForm(false)}
                  className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-300 font-medium">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Keys List */}
          {loading ? (
            <Text className="text-gray-500 dark:text-gray-400 text-center py-4">Loading...</Text>
          ) : keys.length === 0 ? (
            <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
              No API keys configured. Add one to use the AI assistant.
            </Text>
          ) : (
            keys.map((key) => (
              <View key={key.id} className="border-b border-gray-200 dark:border-gray-700 py-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-medium text-gray-900 dark:text-white capitalize">{key.provider}</Text>
                      {key.is_primary && (
                        <View className="bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded ml-2">
                          <Text className="text-purple-700 dark:text-purple-300 text-xs">Primary</Text>
                        </View>
                      )}
                      <View
                        style={{ backgroundColor: getStatusColor(key.health_status) }}
                        className="w-2 h-2 rounded-full ml-2"
                      />
                    </View>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">{key.key_name}</Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-xs font-mono">{key.api_key_masked}</Text>
                  </View>
                  <View className="flex-row">
                    <TouchableOpacity
                      onPress={() => handleTogglePrimary(key)}
                      className="p-2"
                    >
                      <Ionicons
                        name={key.is_primary ? 'star' : 'star-outline'}
                        size={20}
                        color={key.is_primary ? '#9333ea' : '#9ca3af'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleTestKey(key)}
                      className="p-2"
                      disabled={testing === key.id}
                    >
                      <Ionicons
                        name="flask"
                        size={20}
                        color={testing === key.id ? '#9ca3af' : '#3b82f6'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteKey(key)}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
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
          className="bg-red-500 py-3 rounded-xl items-center"
        >
          <Text className="text-white font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
