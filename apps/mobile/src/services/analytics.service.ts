import { api } from './api';
import {
  SportActivityType,
  CreateGoalInput,
  CreateSegmentInput,
  PersonalRecordItem,
} from '@sportup/shared';

export interface DashboardResponse {
  period: 'week' | 'month' | 'year';
  summary: {
    totalDistanceKm: number;
    totalDurationSec: number;
    totalElevationGainM: number;
    totalCalories: number;
    totalWorkouts: number;
    avgPaceSec: number;
  };
  trainingLoad: {
    score: number;
    level: 'RECOVERY' | 'MAINTENANCE' | 'OPTIMAL' | 'OVERREACHING';
    totalDurationMin: number;
    totalDistanceKm: number;
  };
  timeline: Array<{
    date: string;
    distanceKm: number;
    durationMin: number;
    elevationGainM: number;
  }>;
  heatmapPoints: Array<{ lat: number; lng: number }>;
}

export interface AthleteGoalItem {
  id: string;
  sportType: SportActivityType;
  period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  targetType: 'DISTANCE_KM' | 'DURATION_MIN' | 'ACTIVITIES_COUNT';
  targetValue: number;
  currentValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  startDate: string;
  endDate: string;
}

export interface SegmentItem {
  id: string;
  name: string;
  sportType: SportActivityType;
  distanceM: number;
  elevationGainM: number;
  distanceFromUserKm?: number | null;
  totalEffortsCount: number;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
}

export interface SegmentLeaderboardEntry {
  rank: number;
  effortId: string;
  elapsedTimeSec: number;
  formattedTime: string;
  avgSpeedKmh: number;
  avgPaceSec: number;
  startDate: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
}

export const analyticsService = {
  async getDashboard(period: 'week' | 'month' | 'year' = 'week', sportType?: SportActivityType): Promise<DashboardResponse> {
    const res = await api.get('/analytics/dashboard', {
      params: { period, sportType },
    });
    return res.data.data;
  },

  async getPersonalRecords(): Promise<PersonalRecordItem[]> {
    const res = await api.get('/analytics/personal-records');
    return res.data.data;
  },

  async getGoals(): Promise<AthleteGoalItem[]> {
    const res = await api.get('/analytics/goals');
    return res.data.data;
  },

  async createGoal(data: CreateGoalInput): Promise<AthleteGoalItem> {
    const res = await api.post('/analytics/goals', data);
    return res.data.data;
  },

  async exploreSegments(params?: { lat?: number; lng?: number; radiusKm?: number; sportType?: SportActivityType }): Promise<SegmentItem[]> {
    const res = await api.get('/segments/explore', { params });
    return res.data.data;
  },

  async getSegmentLeaderboard(segmentId: string, timeframe: 'all_time' | 'this_month' = 'all_time'): Promise<SegmentLeaderboardEntry[]> {
    const res = await api.get(`/segments/${segmentId}/leaderboard`, {
      params: { timeframe },
    });
    return res.data.data;
  },

  async createSegment(data: CreateSegmentInput): Promise<SegmentItem> {
    const res = await api.post('/segments', data);
    return res.data.data;
  },
};
