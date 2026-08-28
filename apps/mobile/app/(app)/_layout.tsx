import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { useLocationStore } from '../../src/stores/location.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { theme } from '../../src/theme';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function AppLayout() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { hasLocation } = useLocationStore();
  const { hasCompletedOnboarding, loadOnboardingState } = useOnboardingStore();
  const router = useRouter();
  const segments = useSegments();

  // Load persisted onboarding state on mount
  useEffect(() => {
    loadOnboardingState();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    } else if (!hasCompletedOnboarding && segments[1] !== 'onboarding') {
      // First-time user: send to running level picker
      router.replace('/onboarding');
    } else if (!hasLocation && segments[1] !== 'location' && segments[1] !== 'onboarding') {
      // After onboarding: set location
      router.replace('/(app)/location');
    }
  }, [isAuthenticated, authLoading, hasCompletedOnboarding, hasLocation, segments]);

  if (authLoading || !isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: theme.colors.background }
    }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
