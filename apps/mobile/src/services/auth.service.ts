import { api } from './api';
import { storage } from '../utils/storage';
import { useAuthStore } from '../stores/auth.store';
import { useOnboardingStore } from '../stores/onboarding.store';
import type { LoginInput, RegisterInput, AuthResponse, ApiResponse, UserProfile } from '@sportup/shared';

export const authService = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    const { user, tokens } = response.data.data;
    
    await storage.setItem('access_token', tokens.accessToken);
    await storage.setItem('refresh_token', tokens.refreshToken);
    
    useAuthStore.getState().setUser(user);
    return response.data.data;
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    const { user, tokens } = response.data.data;
    
    await storage.setItem('access_token', tokens.accessToken);
    await storage.setItem('refresh_token', tokens.refreshToken);
    
    // Ensure onboarding state is reset for a brand new user
    await storage.deleteItem('onboarding_completed');
    useOnboardingStore.getState().resetOnboardingState();

    useAuthStore.getState().setUser(user);
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = await storage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      await storage.deleteItem('access_token');
      await storage.deleteItem('refresh_token');
      useAuthStore.getState().logout();
    }
  },

  async getMe(): Promise<UserProfile> {
    const response = await api.get<ApiResponse<UserProfile>>('/users/me');
    useAuthStore.getState().setUser(response.data.data);
    return response.data.data;
  },

  async initializeAuth(): Promise<void> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    try {
      const token = await storage.getItem('access_token');
      if (token) {
        await this.getMe();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      await storage.deleteItem('access_token');
      await storage.deleteItem('refresh_token');
    } finally {
      store.setLoading(false);
    }
  }
};
