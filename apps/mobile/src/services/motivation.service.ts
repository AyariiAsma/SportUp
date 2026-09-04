import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

export interface TodayMotivation {
  id: string;
  quote: string;
  author: string;
  likesCount: number;
  isLiked: boolean;
}

export const motivationService = {
  async getTodayMotivation(): Promise<TodayMotivation> {
    const res = await api.get<ApiResponse<TodayMotivation>>('/motivation/today');
    return res.data.data;
  },

  async toggleLikeTodayMotivation(): Promise<{ id: string; isLiked: boolean; likesCount: number }> {
    const res = await api.post<ApiResponse<{ id: string; isLiked: boolean; likesCount: number }>>('/motivation/today/like');
    return res.data.data;
  },
};
