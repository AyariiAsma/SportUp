import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { theme } from '../../theme';
import { useState } from 'react';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  selectedValue: string;
  onValueChange: (itemValue: string) => void;
  options: Option[];
  placeholder?: string;
}

export function Select({ label, error, selectedValue, onValueChange, options, placeholder }: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find(o => o.value === selectedValue);
  const displayValue = selectedOption ? selectedOption.label : (placeholder || 'Select...');

  const filteredOptions = searchQuery.trim() === ''
    ? options
    : options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleClose = () => {
    setModalVisible(false);
    setIsFocused(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
        onPress={() => {
          setIsFocused(true);
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, !selectedOption && styles.placeholderText]}>
          {displayValue}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder || label || 'Select Option'}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            {options.length > 5 && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>
            )}
            
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                    onPress={() => {
                      onValueChange(item.value);
                      handleClose();
                    }}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.medium,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'space-between',
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#1E2A40',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputText: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.md,
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
  },
  dropdownIcon: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.medium,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.border.radius.xl,
    borderTopRightRadius: theme.border.radius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
  },
  closeButtonText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.md,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.size.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.surfaceElevated,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(255,107,53,0.05)',
    borderRadius: theme.border.radius.md,
    borderBottomWidth: 0,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.medium,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
  },
  checkIcon: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
