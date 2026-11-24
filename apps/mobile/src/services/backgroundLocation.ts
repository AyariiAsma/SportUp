import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

export const LOCATION_TASK_NAME = 'SPORTUP_BACKGROUND_TRACKING_TASK';

// Type for listener callback
type LocationUpdateCallback = (location: Location.LocationObject) => void;
let locationUpdateListener: LocationUpdateCallback | null = null;

export function registerLocationListener(callback: LocationUpdateCallback) {
  locationUpdateListener = callback;
}

export function unregisterLocationListener() {
  locationUpdateListener = null;
}

// Define the background task if not in web environment
if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.warn('Background location task error:', error);
      return;
    }

    if (data && data.locations && data.locations.length > 0) {
      const locations = data.locations as Location.LocationObject[];
      for (const loc of locations) {
        if (locationUpdateListener) {
          locationUpdateListener(loc);
        }
      }
    }
  });
}

export async function requestAllLocationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    // Background permission is optional on iOS during first prompt or can be requested
    if (Platform.OS === 'android') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      return bgStatus === 'granted' || fgStatus === 'granted';
    }

    return true;
  } catch (err) {
    console.warn('Error requesting location permissions:', err);
    return false;
  }
}

export async function startBackgroundTracking(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) return true;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1500,
      distanceInterval: 3,
      deferredUpdatesInterval: 2000,
      deferredUpdatesDistance: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'SportUp Activity Recording',
        notificationBody: 'Tracking your workout route, pace, and elevation in the background...',
        notificationColor: '#FF6B35',
      },
    });
    return true;
  } catch (err) {
    console.warn('Failed to start background tracking:', err);
    return false;
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.warn('Failed to stop background tracking:', err);
  }
}
