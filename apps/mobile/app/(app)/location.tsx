import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { theme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';
import { useLocationStore } from '../../src/stores/location.store';
import { useState } from 'react';

export default function LocationScreen() {
  const router = useRouter();
  const setLocation = useLocationStore((state) => state.setLocation);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need your location to show nearby sports events. You can enter a city manually.'
        );
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const city = geocode[0]?.city || geocode[0]?.region || 'Unknown Location';
      
      setLocation(location.coords.latitude, location.coords.longitude, city);
      router.replace('/(app)/(tabs)/home');
      
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const skipLocation = () => {
    // Set a default fallback location (e.g., Paris or user's saved city)
    setLocation(48.8566, 2.3522, 'Paris (Default)');
    router.replace('/(app)/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.title}>Find Nearby Activities</Text>
          <Text style={styles.subtitle}>
            Enable location services to discover sporting events, groups, and activities around you.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button 
            title="Use My Location" 
            size="lg"
            onPress={requestLocation}
            isLoading={isLoading}
            style={styles.btn}
          />
          <Button 
            title="I'll enter a city later" 
            variant="ghost"
            size="lg"
            onPress={skipLocation}
            style={styles.btn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.size.md,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    paddingBottom: theme.spacing.xl,
  },
  btn: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
});
