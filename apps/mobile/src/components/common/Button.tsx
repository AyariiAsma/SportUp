import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { theme } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({ 
  title, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  style, 
  disabled,
  ...props 
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (variant === 'primary') return theme.colors.primary;
    if (variant === 'secondary') return theme.colors.surfaceElevated;
    if (variant === 'outline') return 'transparent';
    if (variant === 'ghost') return 'transparent';
    return theme.colors.primary;
  };

  const getTextColor = () => {
    if (variant === 'outline') return theme.colors.primary;
    if (variant === 'ghost') return theme.colors.textSecondary;
    return '#FFFFFF';
  };

  const getBorder = () => {
    if (variant === 'outline') return { borderWidth: 1, borderColor: theme.colors.primary };
    return {};
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[size],
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            { color: getTextColor(), fontSize: size === 'lg' ? 18 : 16 }
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.border.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  sm: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  md: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  lg: {
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.xl,
  },
  text: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
