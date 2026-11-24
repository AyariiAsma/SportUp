import { GeoPoint } from '../types';

// Haversine formula to calculate distance between two coordinates in kilometers
export function calculateDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatPace(paceSecPerKm: number): string {
  if (!isFinite(paceSecPerKm) || paceSecPerKm <= 0 || paceSecPerKm > 3600) {
    return "--'--\"";
  }
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.floor(paceSecPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
}

// Generate default run name based on time of day
export function getAutoRunTitle(eventTitle?: string): string {
  if (eventTitle) return `${eventTitle} (Live Run)`;
  const hour = new Date().getHours();
  if (hour < 11) return 'Morning Run 🌅';
  if (hour < 15) return 'Midday Lunch Run ☀️';
  if (hour < 19) return 'Evening Sunset Run 🌇';
  return 'Night Run 🌙';
}
