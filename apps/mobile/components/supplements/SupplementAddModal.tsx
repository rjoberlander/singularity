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
import { useCreateSupplement } from '@/lib/hooks';
import type { CreateSupplementRequest, SupplementTiming, SupplementFrequency } from '@singularity/shared-types';

const TIMING_OPTIONS: { value: SupplementTiming; label: string }[] = [
  { value: 'wake_up', label: 'Wake up' },
  { value: 'am', label: 'Morning' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'pm', label: 'Afternoon' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'before_bed', label: 'Before bed' },
];

const FREQUENCY_OPTIONS: { value: SupplementFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_other_day', label: 'Every other day' },
  { value: 'as_needed', label: 'As needed' },
];

const CATEGORY_OPTIONS = [
  'Vitamin',
  'Mineral',
  'Amino Acid',
  'Fatty Acid',
  'Probiotic',
  'Herb',
  'Antioxidant',
  'Nootropic',
  'Protein',
  'Other',
];

interface SupplementAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SupplementAddModal({ visible, onClose, onSuccess }: SupplementAddModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [intakeQuantity, setIntakeQuantity] = useState('1');
  const [intakeForm, setIntakeForm] = useState('capsule');
  const [dosePerServing, setDosePerServing] = useState('');
  const [doseUnit, setDoseUnit] = useState('mg');
  const [category, setCategory] = useState('');
  const [selectedTimings, setSelectedTimings] = useState<SupplementTiming[]>(['am']);
  const [frequency, setFrequency] = useState<SupplementFrequency>('daily');
  const [reason, setReason] = useState('');

  const createSupplement = useCreateSupplement();

  const resetForm = () => {
    setName('');
    setBrand('');
    setIntakeQuantity('1');
    setIntakeForm('capsule');
    setDosePerServing('');
    setDoseUnit('mg');
    setCategory('');
    setSelectedTimings(['am']);
    setFrequency('daily');
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleTiming = (timing: SupplementTiming) => {
    setSelectedTimings(prev => {
      if (prev.includes(timing)) {
        return prev.filter(t => t !== timing);
      }
      return [...prev, timing];
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter supplement name');
      return;
    }

    const data: CreateSupplementRequest = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      intake_quantity: parseInt(intakeQuantity) || 1,
      intake_form: intakeForm,
      dose_per_serving: dosePerServing ? parseFloat(dosePerServing) : undefined,
      dose_unit: doseUnit || undefined,
      category: category || undefined,
      timings: selectedTimings,
      frequency,
      reason: reason.trim() || undefined,
    };

    try {
      await createSupplement.mutateAsync(data);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create supplement:', error);
      Alert.alert('Error', 'Failed to save supplement. Please try again.');
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
          <Text style={styles.headerTitle}>Add Supplement</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createSupplement.isPending || !name.trim()}
            style={[
              styles.saveButton,
              (createSupplement.isPending || !name.trim()) && styles.saveButtonDisabled,
            ]}
          >
            {createSupplement.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Supplement Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Vitamin D3"
              placeholderTextColor="#6b7280"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Brand */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Thorne, NOW Foods"
              placeholderTextColor="#6b7280"
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {/* Dosage Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor="#6b7280"
                value={intakeQuantity}
                onChangeText={setIntakeQuantity}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Form</Text>
              <TextInput
                style={styles.input}
                placeholder="capsule"
                placeholderTextColor="#6b7280"
                value={intakeForm}
                onChangeText={setIntakeForm}
              />
            </View>
          </View>

          {/* Dose Amount Row */}
          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
              <Text style={styles.label}>Dose per serving</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                placeholderTextColor="#6b7280"
                value={dosePerServing}
                onChangeText={setDosePerServing}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="IU"
                placeholderTextColor="#6b7280"
                value={doseUnit}
                onChangeText={setDoseUnit}
              />
            </View>
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

          {/* Timing */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>When to take</Text>
            <View style={styles.chipGrid}>
              {TIMING_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, selectedTimings.includes(option.value) && styles.chipActive]}
                  onPress={() => toggleTiming(option.value)}
                >
                  <Text style={[styles.chipText, selectedTimings.includes(option.value) && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.chipGrid}>
              {FREQUENCY_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, frequency === option.value && styles.chipActive]}
                  onPress={() => setFrequency(option.value)}
                >
                  <Text style={[styles.chipText, frequency === option.value && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason for taking</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Immune support, bone health"
              placeholderTextColor="#6b7280"
              value={reason}
              onChangeText={setReason}
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
});
