import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from '../src/services/auth.service';
import { theme } from '../src/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    authService.initializeAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background }
      }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
