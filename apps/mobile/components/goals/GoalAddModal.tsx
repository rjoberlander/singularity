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
import { useCreateGoal } from '@/lib/hooks';
import type { Goal } from '@singularity/shared-types';

const CATEGORY_OPTIONS = [
  'Vitamins',
  'Hormones',
  'Metabolic',
  'Cardiovascular',
  'Lifestyle',
  'Fitness',
  'Sleep',
  'Mental Health',
  'Other',
];

const DIRECTION_OPTIONS: { value: Goal['direction']; label: string; icon: string }[] = [
  { value: 'increase', label: 'Increase', icon: 'trending-up' },
  { value: 'decrease', label: 'Decrease', icon: 'trending-down' },
  { value: 'maintain', label: 'Maintain', icon: 'remove' },
];

interface GoalAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GoalAddModal({ visible, onClose, onSuccess }: GoalAddModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [targetBiomarker, setTargetBiomarker] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [direction, setDirection] = useState<Goal['direction']>('increase');
  const [notes, setNotes] = useState('');

  const createGoal = useCreateGoal();

  const resetForm = () => {
    setTitle('');
    setCategory('');
    setTargetBiomarker('');
    setCurrentValue('');
    setTargetValue('');
    setDirection('increase');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }

    const data: Partial<Goal> = {
      title: title.trim(),
      category: category || undefined,
      target_biomarker: targetBiomarker.trim() || undefined,
      current_value: currentValue ? parseFloat(currentValue) : undefined,
      target_value: targetValue ? parseFloat(targetValue) : undefined,
      direction,
      status: 'active',
      priority: 1,
      notes: notes.trim() || undefined,
    };

    try {
      await createGoal.mutateAsync(data);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create goal:', error);
      Alert.alert('Error', 'Failed to save goal. Please try again.');
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
          <Text style={styles.headerTitle}>Add Goal</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createGoal.isPending || !title.trim()}
            style={[
              styles.saveButton,
              (createGoal.isPending || !title.trim()) && styles.saveButtonDisabled,
            ]}
          >
            {createGoal.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Goal Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Optimize Vitamin D Levels"
              placeholderTextColor="#6b7280"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORY_OPTIONS.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(category === cat ? '' : cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Direction */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Direction</Text>
            <View style={styles.directionRow}>
              {DIRECTION_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.directionChip, direction === option.value && styles.directionChipActive]}
                  onPress={() => setDirection(option.value)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={direction === option.value ? '#fff' : '#9ca3af'}
                  />
                  <Text style={[styles.directionText, direction === option.value && styles.directionTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Target Biomarker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Biomarker (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Vitamin D, HbA1c"
              placeholderTextColor="#6b7280"
              value={targetBiomarker}
              onChangeText={setTargetBiomarker}
            />
          </View>

          {/* Values Row */}
          {targetBiomarker.trim() && (
            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Current Value</Text>
                <TextInput
                  style={styles.input}
                  placeholder="45"
                  placeholderTextColor="#6b7280"
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Target Value</Text>
                <TextInput
                  style={styles.input}
                  placeholder="70"
                  placeholderTextColor="#6b7280"
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional notes about this goal..."
              placeholderTextColor="#6b7280"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
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
  rowContainer: {
    flexDirection: 'row',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
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
  directionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  directionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 12,
  },
  directionChipActive: {
    backgroundColor: '#10b981',
  },
  directionText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  directionTextActive: {
    color: '#fff',
  },
});
