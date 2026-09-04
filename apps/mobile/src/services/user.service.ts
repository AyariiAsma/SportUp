import { api } from './api';
import type { ApiResponse, UserProfile } from '@sportup/shared';

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  isOnline?: boolean;
}

export const userSearchService = {
  async searchUsers(query: string): Promise<SearchUser[]> {
    if (!query || query.length < 2) return [];
    try {
      const response = await api.get<ApiResponse<SearchUser[]>>('/users/search', {
        params: { q: query, limit: 10 },
      });
      return response.data.data;
    } catch {
      return [];
    }
  },

  async getOnlineUsers(): Promise<SearchUser[]> {
    try {
      const response = await api.get<ApiResponse<SearchUser[]>>('/users/online');
      return response.data.data;
    } catch {
      return [];
    }
  },

  async followUser(userId: string): Promise<void> {
    await api.post(`/users/${userId}/follow`);
  },

  async unfollowUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/follow`);
  },

  async getFollowers(userId: string): Promise<SearchUser[]> {
    const response = await api.get<ApiResponse<SearchUser[]>>(`/users/${userId}/followers`);
    return response.data.data;
  },

  async getFollowing(userId: string): Promise<SearchUser[]> {
    const response = await api.get<ApiResponse<SearchUser[]>>(`/users/${userId}/following`);
    return response.data.data;
  },

  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await api.get<ApiResponse<UserProfile>>(`/users/${userId}`);
    return response.data.data;
  },
};
