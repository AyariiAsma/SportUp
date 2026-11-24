import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useTrackingStore } from '../stores/tracking.store';
import {
  requestAllLocationPermissions,
  startBackgroundTracking,
  stopBackgroundTracking,
  registerLocationListener,
  unregisterLocationListener,
} from '../services/backgroundLocation';
import { Platform } from 'react-native';

export function useLiveRunTracking() {
  const store = useTrackingStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundSubRef = useRef<Location.LocationSubscription | null>(null);

  // Check for crashed/uncompleted session on mount
  useEffect(() => {
    store.checkForCrashedSession();
  }, []);

  // Manage 1-second interval timer based on tracking status
  useEffect(() => {
    if (store.trackingStatus === 'TRACKING' || store.trackingStatus === 'AUTO_PAUSED') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          store.tickTimer();
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [store.trackingStatus]);

  // Start tracking with full background + foreground location
  const start = async (eventId?: string, eventTitle?: string) => {
    const granted = await requestAllLocationPermissions();
    if (!granted) {
      console.warn('Location permission was not granted');
      return false;
    }

    store.startTracking(eventId, eventTitle);

    // Register callback for location updates
    registerLocationListener((loc) => {
      store.processLocationPoint(loc);
    });

    // Start background tracking if native
    if (Platform.OS !== 'web') {
      await startBackgroundTracking();
    }

    // Also run foreground watch for high-frequency updates while app is active
    foregroundSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1500,
        distanceInterval: 3,
      },
      (location) => {
        store.processLocationPoint(location);
      }
    );

    return true;
  };

  const pause = () => {
    store.pauseTracking();
  };

  const resume = async () => {
    store.resumeTracking();
    if (Platform.OS !== 'web') {
      await startBackgroundTracking();
    }
  };

  const stop = async () => {
    store.stopTracking();
    unregisterLocationListener();
    if (foregroundSubRef.current) {
      foregroundSubRef.current.remove();
      foregroundSubRef.current = null;
    }
    if (Platform.OS !== 'web') {
      await stopBackgroundTracking();
    }
  };

  const discard = async () => {
    store.discardTracking();
    unregisterLocationListener();
    if (foregroundSubRef.current) {
      foregroundSubRef.current.remove();
      foregroundSubRef.current = null;
    }
    if (Platform.OS !== 'web') {
      await stopBackgroundTracking();
    }
  };

  return {
    ...store,
    isTracking: store.trackingStatus === 'TRACKING' || store.trackingStatus === 'AUTO_PAUSED',
    isPaused: store.trackingStatus === 'PAUSED',
    isAutoPaused: store.trackingStatus === 'AUTO_PAUSED',
    startTracking: start,
    pauseTracking: pause,
    resumeTracking: resume,
    stopTracking: stop,
    discardTracking: discard,
  };
}
