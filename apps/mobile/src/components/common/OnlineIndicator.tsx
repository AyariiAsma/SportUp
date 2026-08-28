import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface Props {
  isOnline?: boolean;
  size?: 'sm' | 'md';
}

/**
 * A small colored dot shown next to avatars to indicate online/offline status.
 * Green = online, grey = offline / unknown.
 */
export function OnlineIndicator({ isOnline, size = 'sm' }: Props) {
  const dotSize = size === 'md' ? 12 : 9;
  const borderSize = size === 'md' ? 2 : 1.5;

  return (
    <View
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          borderWidth: borderSize,
          backgroundColor: isOnline ? '#4CAF50' : '#6B7280',
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderColor: theme.colors.background,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
