import { create } from 'zustand';
import { storage } from '../utils/storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => Promise<void>;
  resetOnboardingState: () => void;
  loadOnboardingState: () => Promise<void>;
}

const ONBOARDING_KEY = 'onboarding_completed';

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasCompletedOnboarding: false,

  loadOnboardingState: async () => {
    const value = await storage.getItem(ONBOARDING_KEY);
    set({ hasCompletedOnboarding: value === 'true' });
  },

  setOnboardingComplete: async () => {
    await storage.setItem(ONBOARDING_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },

  resetOnboardingState: () => {
    set({ hasCompletedOnboarding: false });
  },
}));
