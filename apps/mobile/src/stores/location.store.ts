import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  setLocation: (lat: number, lng: number, city?: string) => void;
  clearLocation: () => void;
  hasLocation: boolean;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  city: null,
  hasLocation: false,
  setLocation: (latitude, longitude, city) => 
    set({ latitude, longitude, city, hasLocation: true }),
  clearLocation: () => 
    set({ latitude: null, longitude: null, city: null, hasLocation: false }),
}));
