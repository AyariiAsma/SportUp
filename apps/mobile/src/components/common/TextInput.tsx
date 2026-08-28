import { View, TextInput as RNTextInput, Text, StyleSheet, TextInputProps as RNTextInputProps } from 'react-native';
import { theme } from '../../theme';
import { useState } from 'react';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  type?: string;
}

export function TextInput({ label, error, icon, style, onFocus, onBlur, ...props }: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <RNTextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...(props as any)}
          {...({ type: props.type } as any)}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.border.radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 56,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#1E2A40',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  iconContainer: {
    paddingLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.size.xs,
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.medium,
  },
});
