import { useState, useEffect, useRef, useCallback } from 'react';
import { GeoPoint, SplitLap, RunSession, SportType } from '../types';
import { calculateDistanceKm, formatDuration, formatPace, getAutoRunTitle } from '../utils/geo';

// Pre-defined scenic route for desktop simulator: Carthage to La Marsa corniche
const SCENIC_SIMULATOR_POINTS: GeoPoint[] = [
  { lat: 36.8528, lng: 10.3233 },
  { lat: 36.8545, lng: 10.3250 },
  { lat: 36.8570, lng: 10.3275 },
  { lat: 36.8600, lng: 10.3300 },
  { lat: 36.8635, lng: 10.3325 },
  { lat: 36.8670, lng: 10.3340 },
  { lat: 36.8710, lng: 10.3350 },
  { lat: 36.8755, lng: 10.3345 },
  { lat: 36.8800, lng: 10.3320 },
  { lat: 36.8845, lng: 10.3285 },
  { lat: 36.8885, lng: 10.3250 },
  { lat: 36.8920, lng: 10.3210 },
  { lat: 36.8960, lng: 10.3180 },
  { lat: 36.9000, lng: 10.3150 },
];

export function useLiveTracker(onSaveRun?: (run: RunSession) => void) {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [currentPaceSec, setCurrentPaceSec] = useState(0);
  const [avgPaceSec, setAvgPaceSec] = useState(0);
  const [splits, setSplits] = useState<SplitLap[]>([]);
  const [route, setRoute] = useState<GeoPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);
  const [linkedEvent, setLinkedEvent] = useState<{ id: string; title: string } | null>(null);

  // Split tracking ref
  const lastSplitDistanceRef = useRef(0);
  const lastSplitTimeRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const simIndexRef = useRef(0);

  // Audio coach announcement
  const speakCue = useCallback((message: string) => {
    if (!audioCuesEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech ignored if browser blocked
    }
  }, [audioCuesEnabled]);

  // Main timer
  useEffect(() => {
    let timer: any = null;
    if (status === 'running') {
      timer = setInterval(() => {
        setDurationSec(prev => {
          const next = prev + 1;
          setAvgPaceSec(distanceKm > 0.05 ? next / distanceKm : 0);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, distanceKm]);

  // Split checking logic
  const checkSplit = useCallback((newTotalKm: number, currentDuration: number) => {
    const nextKmMarker = Math.floor(newTotalKm);
    if (nextKmMarker > lastSplitDistanceRef.current && nextKmMarker >= 1) {
      const lapTimeSec = currentDuration - lastSplitTimeRef.current;
      const lapPace = formatPace(lapTimeSec);
      const newSplit: SplitLap = {
        km: nextKmMarker,
        timeSec: lapTimeSec,
        paceMinKm: lapPace,
      };

      setSplits(prev => [...prev, newSplit]);
      lastSplitDistanceRef.current = nextKmMarker;
      lastSplitTimeRef.current = currentDuration;

      // Announce split via speech synthesis
      speakCue(`Kilometer ${nextKmMarker} completed. Pace: ${newSplit.paceMinKm} per kilometer. Total distance ${nextKmMarker} kilometers.`);
    }
  }, [speakCue]);

  // Record a new GPS coordinate
  const addLocationPoint = useCallback((point: GeoPoint) => {
    setCurrentLocation(point);
    setRoute(prevRoute => {
      if (prevRoute.length === 0) {
        return [point];
      }
      const lastPoint = prevRoute[prevRoute.length - 1];
      const deltaKm = calculateDistanceKm(lastPoint, point);

      // Filter out tiny jitter (< 2 meters)
      if (deltaKm < 0.002) {
        return prevRoute;
      }

      setDistanceKm(prevDist => {
        const updatedDist = prevDist + deltaKm;
        // Estimate current pace from last delta
        const timeDiffSec = (point.timestamp && lastPoint.timestamp) 
          ? (point.timestamp - lastPoint.timestamp) / 1000 
          : 1;
        if (deltaKm > 0 && timeDiffSec > 0) {
          setCurrentPaceSec(timeDiffSec / deltaKm);
        }
        checkSplit(updatedDist, durationSec);
        return updatedDist;
      });

      return [...prevRoute, point];
    });
  }, [durationSec, checkSplit]);

  // Simulation runner (advances simulated route every second)
  useEffect(() => {
    let simInterval: any = null;
    if (status === 'running' && isSimulated) {
      simInterval = setInterval(() => {
        const maxIdx = SCENIC_SIMULATOR_POINTS.length - 1;
        simIndexRef.current = (simIndexRef.current + 1) % SCENIC_SIMULATOR_POINTS.length;
        const basePoint = SCENIC_SIMULATOR_POINTS[simIndexRef.current];
        // add slight realistic jitter
        const jittered: GeoPoint = {
          lat: basePoint.lat + (Math.random() - 0.5) * 0.0001,
          lng: basePoint.lng + (Math.random() - 0.5) * 0.0001,
          timestamp: Date.now(),
        };
        addLocationPoint(jittered);
      }, 1000);
    }
    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [status, isSimulated, addLocationPoint]);

  // Real browser geolocation watcher
  useEffect(() => {
    if (status === 'running' && !isSimulated && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          addLocationPoint({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            elevation: pos.coords.altitude || 0,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          // If real GPS fails (e.g. desktop permissions denied), automatically switch to simulation mode
          setIsSimulated(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    } else {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [status, isSimulated, addLocationPoint]);

  const startTracking = (withSimulation = false, event?: { id: string; title: string }) => {
    setStatus('running');
    setIsSimulated(withSimulation);
    if (event) setLinkedEvent(event);
    speakCue('Workout started. Have a great run!');
    // If starting fresh and simulated, initialize start point
    if (route.length === 0 && withSimulation) {
      simIndexRef.current = 0;
      addLocationPoint({ ...SCENIC_SIMULATOR_POINTS[0], timestamp: Date.now() });
    }
  };

  const pauseTracking = () => {
    setStatus('paused');
    speakCue('Workout paused.');
  };

  const resumeTracking = () => {
    setStatus('running');
    speakCue('Resuming workout.');
  };

  const finishTracking = (customTitle?: string): RunSession => {
    setStatus('finished');
    const finalTitle = customTitle || getAutoRunTitle(linkedEvent?.title);
    const caloriesBurned = Math.round(distanceKm * 65); // Standard average ~65 kcal/km
    const session: RunSession = {
      id: `run-${Date.now()}`,
      userId: 'usr-1',
      title: finalTitle,
      sport: 'running' as SportType,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationSec,
      avgPace: formatPace(avgPaceSec),
      calories: caloriesBurned,
      createdAt: 'Just now',
      splits,
      route,
      eventId: linkedEvent?.id,
      eventTitle: linkedEvent?.title,
    };

    speakCue(`Workout finished! You ran ${distanceKm.toFixed(2)} kilometers with an average pace of ${session.avgPace} per kilometer. Amazing job!`);

    if (onSaveRun) {
      onSaveRun(session);
    }
    return session;
  };

  const resetTracking = () => {
    setStatus('idle');
    setDistanceKm(0);
    setDurationSec(0);
    setCurrentPaceSec(0);
    setAvgPaceSec(0);
    setSplits([]);
    setRoute([]);
    setCurrentLocation(null);
    setLinkedEvent(null);
    lastSplitDistanceRef.current = 0;
    lastSplitTimeRef.current = 0;
    simIndexRef.current = 0;
  };

  return {
    status,
    distanceKm,
    durationSec,
    durationFormatted: formatDuration(durationSec),
    currentPace: formatPace(currentPaceSec),
    avgPace: formatPace(avgPaceSec),
    splits,
    route,
    currentLocation,
    audioCuesEnabled,
    setAudioCuesEnabled,
    isSimulated,
    setIsSimulated,
    linkedEvent,
    setLinkedEvent,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    resetTracking,
  };
}
