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
import { useCreateBiomarker } from '@/lib/hooks';
import type { CreateBiomarkerRequest } from '@singularity/shared-types';

// Common biomarker presets for quick selection
const COMMON_BIOMARKERS = [
  { name: 'Vitamin D', unit: 'ng/mL', category: 'vitamin' },
  { name: 'Vitamin B12', unit: 'pg/mL', category: 'vitamin' },
  { name: 'Ferritin', unit: 'ng/mL', category: 'blood' },
  { name: 'Iron', unit: 'mcg/dL', category: 'blood' },
  { name: 'Testosterone', unit: 'ng/dL', category: 'hormone' },
  { name: 'TSH', unit: 'mIU/L', category: 'thyroid' },
  { name: 'HbA1c', unit: '%', category: 'metabolic' },
  { name: 'Fasting Glucose', unit: 'mg/dL', category: 'metabolic' },
  { name: 'Total Cholesterol', unit: 'mg/dL', category: 'lipid' },
  { name: 'LDL Cholesterol', unit: 'mg/dL', category: 'lipid' },
  { name: 'HDL Cholesterol', unit: 'mg/dL', category: 'lipid' },
  { name: 'Triglycerides', unit: 'mg/dL', category: 'lipid' },
  { name: 'Creatinine', unit: 'mg/dL', category: 'kidney' },
  { name: 'eGFR', unit: 'mL/min/1.73m²', category: 'kidney' },
  { name: 'ALT', unit: 'U/L', category: 'liver' },
  { name: 'AST', unit: 'U/L', category: 'liver' },
];

interface BiomarkerAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BiomarkerAddModal({ visible, onClose, onSuccess }: BiomarkerAddModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [dateTested, setDateTested] = useState(new Date().toISOString().split('T')[0]);
  const [showPresets, setShowPresets] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const createBiomarker = useCreateBiomarker();

  const resetForm = () => {
    setName('');
    setValue('');
    setUnit('');
    setCategory('');
    setDateTested(new Date().toISOString().split('T')[0]);
    setShowPresets(true);
    setSearchQuery('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectPreset = (preset: typeof COMMON_BIOMARKERS[0]) => {
    setName(preset.name);
    setUnit(preset.unit);
    setCategory(preset.category);
    setShowPresets(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !value.trim() || !unit.trim()) {
      Alert.alert('Error', 'Please fill in biomarker name, value, and unit');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      Alert.alert('Error', 'Please enter a valid numeric value');
      return;
    }

    const data: CreateBiomarkerRequest = {
      name: name.trim(),
      value: numericValue,
      unit: unit.trim(),
      date_tested: dateTested,
      category: category.trim() || undefined,
    };

    try {
      await createBiomarker.mutateAsync(data);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create biomarker:', error);
      Alert.alert('Error', 'Failed to save biomarker. Please try again.');
    }
  };

  const filteredPresets = COMMON_BIOMARKERS.filter(preset =>
    preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preset.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <Text style={styles.headerTitle}>Add Biomarker</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={createBiomarker.isPending || !name.trim() || !value.trim()}
            style={[
              styles.saveButton,
              (createBiomarker.isPending || !name.trim() || !value.trim()) && styles.saveButtonDisabled,
            ]}
          >
            {createBiomarker.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {showPresets ? (
            /* Preset Selection */
            <View style={styles.presetSection}>
              <Text style={styles.sectionTitle}>Select a biomarker</Text>
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

              <View style={styles.presetGrid}>
                {filteredPresets.map((preset) => (
                  <TouchableOpacity
                    key={preset.name}
                    style={styles.presetChip}
                    onPress={() => handleSelectPreset(preset)}
                  >
                    <Text style={styles.presetName}>{preset.name}</Text>
                    <Text style={styles.presetCategory}>{preset.category}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.customButton}
                onPress={() => setShowPresets(false)}
              >
                <Ionicons name="create-outline" size={20} color="#10b981" />
                <Text style={styles.customButtonText}>Enter custom biomarker</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Manual Entry Form */
            <View style={styles.formSection}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowPresets(true)}
              >
                <Ionicons name="arrow-back" size={20} color="#10b981" />
                <Text style={styles.backButtonText}>Back to presets</Text>
              </TouchableOpacity>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Biomarker Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Vitamin D"
                  placeholderTextColor="#6b7280"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Value and Unit Row */}
              <View style={styles.rowInputGroup}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Value *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="45"
                    placeholderTextColor="#6b7280"
                    value={value}
                    onChangeText={setValue}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ng/mL"
                    placeholderTextColor="#6b7280"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., vitamin, hormone, blood"
                  placeholderTextColor="#6b7280"
                  value={category}
                  onChangeText={setCategory}
                />
              </View>

              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date Tested</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#6b7280"
                  value={dateTested}
                  onChangeText={setDateTested}
                />
              </View>
            </View>
          )}
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
  },
  presetSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  presetChip: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  presetName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  presetCategory: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  customButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  formSection: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#10b981',
    fontSize: 14,
    marginLeft: 6,
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputGroup: {
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
});
