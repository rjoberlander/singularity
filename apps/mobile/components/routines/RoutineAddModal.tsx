import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCreateRoutine } from '@/lib/hooks';
import type { Routine } from '@singularity/shared-types';

const TIME_OF_DAY_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

interface RoutineAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RoutineAddModal({ visible, onClose, onSuccess }: RoutineAddModalProps) {
  const [name, setName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [items, setItems] = useState<{ title: string; time?: string; duration?: string }[]>([
    { title: '', time: '', duration: '' },
  ]);

  const createRoutine = useCreateRoutine();

  const resetForm = () => {
    setName('');
    setTimeOfDay('morning');
    setItems([{ title: '', time: '', duration: '' }]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addItem = () => {
    setItems([...items, { title: '', time: '', duration: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: 'title' | 'time' | 'duration', value: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    const validItems = items.filter(item => item.title.trim());
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to the routine');
      return;
    }

    const data: Partial<Routine> = {
      name: name.trim(),
      time_of_day: timeOfDay,
      items: validItems.map((item, index) => ({
        id: `temp-${index}`,
        routine_id: '',
        title: item.title.trim(),
        time: item.time?.trim() || undefined,
        duration: item.duration?.trim() || undefined,
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        sort_order: index,
        created_at: new Date().toISOString(),
      })),
    };

    try {
      await createRoutine.mutateAsync(data);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create routine:', error);
      Alert.alert('Error', 'Failed to save routine. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Routine</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createRoutine.isPending || !name.trim()}
            style={[
              styles.saveButton,
              (createRoutine.isPending || !name.trim()) && styles.saveButtonDisabled,
            ]}
          >
            {createRoutine.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Routine Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Morning Routine"
              placeholderTextColor="#6b7280"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Time of Day */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time of Day</Text>
            <View style={styles.chipGrid}>
              {TIME_OF_DAY_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, timeOfDay === option.value && styles.chipActive]}
                  onPress={() => setTimeOfDay(option.value)}
                >
                  <Text style={[styles.chipText, timeOfDay === option.value && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Items */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Routine Items</Text>
            {items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>#{index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="What to do..."
                  placeholderTextColor="#6b7280"
                  value={item.title}
                  onChangeText={value => updateItem(index, 'title', value)}
                />
                <View style={styles.itemRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
                    <TextInput
                      style={styles.inputSmall}
                      placeholder="Time (e.g., 6:00 AM)"
                      placeholderTextColor="#6b7280"
                      value={item.time}
                      onChangeText={value => updateItem(index, 'time', value)}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                    <TextInput
                      style={styles.inputSmall}
                      placeholder="Duration (e.g., 10 min)"
                      placeholderTextColor="#6b7280"
                      value={item.duration}
                      onChangeText={value => updateItem(index, 'duration', value)}
                    />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
              <Ionicons name="add-circle-outline" size={20} color="#10b981" />
              <Text style={styles.addItemButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputSmall: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#10b981',
  },
  chipText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#fff',
  },
  itemCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
