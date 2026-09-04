import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  city: string | null;
  region: string | null;
  runningLevel: string;
  rankScore: number;
  totalDistanceKm: number;
  isOnline: boolean;
  runsJoined: number;
  rankInfo: {
    score: number;
    level: string;
    nextLevel: string | null;
    pointsToNextLevel: number;
    progress: number;
  };
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  meta: { total: number; take: number; skip: number };
}

export const rankService = {
  async getLeaderboard(limit = 50, offset = 0): Promise<LeaderboardResponse> {
    const response = await api.get<ApiResponse<LeaderboardEntry[]> & { meta: LeaderboardResponse['meta'] }>(
      '/rank/leaderboard',
      { params: { limit, offset } },
    );
    return { data: response.data.data, meta: (response.data as any).meta };
  },

  async getUserRank(userId: string): Promise<LeaderboardEntry & { rank: number }> {
    const response = await api.get<ApiResponse<LeaderboardEntry & { rank: number }>>(
      `/rank/users/${userId}`,
    );
    return response.data.data;
  },
};
