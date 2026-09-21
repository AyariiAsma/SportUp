import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { getDistance } from 'geolib';

export type RunSplit = {
  km: number;
  timeSec: number;
  paceSec: number;
};

export type LocationPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

export function useLiveRunTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [currentPaceSec, setCurrentPaceSec] = useState(0);
  const [avgPaceSec, setAvgPaceSec] = useState(0);
  const [route, setRoute] = useState<LocationPoint[]>([]);
  const [splits, setSplits] = useState<RunSplit[]>([]);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to hold latest values for callbacks
  const stateRef = useRef({
    distanceKm: 0,
    durationSec: 0,
    splits: [] as RunSplit[],
    route: [] as LocationPoint[],
  });

  useEffect(() => {
    stateRef.current = { distanceKm, durationSec, splits, route };
  }, [distanceKm, durationSec, splits, route]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied');
      return;
    }

    // Reset stats
    setDistanceKm(0);
    setDurationSec(0);
    setCurrentPaceSec(0);
    setAvgPaceSec(0);
    setRoute([]);
    setSplits([]);
    setIsTracking(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);

    // Start GPS watch
    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => {
        handleNewLocation(location);
      }
    );
    
    Speech.speak('Run started. Good luck!');
  };

  const handleNewLocation = (location: Location.LocationObject) => {
    const newPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
    };

    setRoute((prevRoute) => {
      if (prevRoute.length === 0) return [newPoint];

      const lastPoint = prevRoute[prevRoute.length - 1];
      
      // Calculate distance between last point and new point in meters
      const deltaMeters = getDistance(
        { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
        { latitude: newPoint.latitude, longitude: newPoint.longitude }
      );

      if (deltaMeters < 2) return prevRoute; // ignore tiny GPS jitters

      const deltaKm = deltaMeters / 1000;
      const newTotalDistance = stateRef.current.distanceKm + deltaKm;
      
      setDistanceKm(newTotalDistance);

      // Average Pace (sec/km)
      const currentDuration = stateRef.current.durationSec;
      if (newTotalDistance > 0.05) { // after 50 meters
        setAvgPaceSec(currentDuration / newTotalDistance);
      }

      // Current Pace: time taken for this segment
      const timeDeltaSec = (newPoint.timestamp - lastPoint.timestamp) / 1000;
      if (deltaKm > 0) {
        const paceForSegment = timeDeltaSec / deltaKm;
        // Smooth it slightly
        setCurrentPaceSec((prev) => (prev === 0 ? paceForSegment : (prev + paceForSegment) / 2));
      }

      // Splits Logic
      const completedKms = Math.floor(newTotalDistance);
      const previousSplitsCount = stateRef.current.splits.length;

      if (completedKms > previousSplitsCount) {
        // We just crossed a KM boundary!
        const kmSplit = completedKms;
        // Time for this specific km: total time - time of previous split
        const timeOfPreviousSplits = stateRef.current.splits.reduce((acc, s) => acc + s.timeSec, 0);
        const timeForThisKm = currentDuration - timeOfPreviousSplits;

        const newSplit: RunSplit = {
          km: kmSplit,
          timeSec: timeForThisKm,
          paceSec: timeForThisKm,
        };

        setSplits((prev) => [...prev, newSplit]);

        // Audio Feedback
        const mins = Math.floor(timeForThisKm / 60);
        const secs = Math.floor(timeForThisKm % 60);
        Speech.speak(`Kilometer ${kmSplit} completed. Pace: ${mins} minutes ${secs} seconds.`);
      }

      return [...prevRoute, newPoint];
    });
  };

  const pauseTracking = () => {
    setIsTracking(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationSub.current) locationSub.current.remove();
    Speech.speak('Run paused.');
  };

  const resumeTracking = async () => {
    setIsTracking(true);
    timerRef.current = setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => handleNewLocation(location)
    );
    Speech.speak('Run resumed.');
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationSub.current) locationSub.current.remove();
    Speech.speak('Run finished.');
  };

  return {
    isTracking,
    distanceKm,
    durationSec,
    currentPaceSec,
    avgPaceSec,
    splits,
    route,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
  };
}
