import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { useLocationStore } from '../../src/stores/location.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { theme } from '../../src/theme';
import { ActivityIndicator, View, StyleSheet, AppState } from 'react-native';
import { api } from '../../src/services/api';

const PRESENCE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function AppLayout() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { hasLocation } = useLocationStore();
  const { hasCompletedOnboarding, loadOnboardingState } = useOnboardingStore();
  const router = useRouter();
  const segments = useSegments();

  // Load persisted onboarding state on mount
  useEffect(() => {
    loadOnboardingState();
  }, []);

  // Presence heartbeat: mark user as online while app is active
  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = () => {
      api.post('/users/presence').catch(() => {/* silent */});
    };

    // Send immediately on mount
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, PRESENCE_INTERVAL_MS);

    // Also react to app coming to foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sendHeartbeat();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    } else {
      // Check if user already has a running level on their profile object
      const hasRunningLevelOnProfile = Boolean(user?.runningLevel);
      if (!hasCompletedOnboarding && !hasRunningLevelOnProfile && (segments as any)[1] !== 'onboarding') {
        // First-time user: send to running level picker
        router.replace('/onboarding');
      } else if (!hasLocation && (segments as any)[1] !== 'location' && (segments as any)[1] !== 'onboarding') {
        // After onboarding: set location
        router.replace('/(app)/location');
      }
    }
  }, [isAuthenticated, authLoading, hasCompletedOnboarding, hasLocation, user, segments]);

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
