import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

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
};
