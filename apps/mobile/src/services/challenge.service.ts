import { api } from './api';
import {
  CreateChallengeInput,
  ChallengeQueryInput,
  ChallengeType,
  SportActivityType,
} from '@sportup/shared';

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  badgeKey?: string | null;
  badgeIconUrl?: string | null;
  type: ChallengeType;
  targetValue: number;
  sportType: SportActivityType;
  startDate: string;
  endDate: string;
  club?: { id: string; name: string; avatarUrl?: string | null } | null;
  participantsCount: number;
  isJoined: boolean;
  myProgress: number;
  myProgressPercentage: number;
  isCompleted: boolean;
}

export const challengeService = {
  async getChallenges(params?: ChallengeQueryInput): Promise<ChallengeItem[]> {
    const res = await api.get('/challenges', { params });
    return res.data.data;
  },

  async getMyChallenges(): Promise<ChallengeItem[]> {
    const res = await api.get('/challenges/my');
    return res.data.data;
  },

  async getChallengeDetails(id: string): Promise<ChallengeItem & { participants: any[] }> {
    const res = await api.get(`/challenges/${id}`);
    return res.data.data;
  },

  async createChallenge(data: CreateChallengeInput): Promise<ChallengeItem> {
    const res = await api.post('/challenges', data);
    return res.data.data;
  },

  async joinChallenge(id: string): Promise<{ message: string }> {
    const res = await api.post(`/challenges/${id}/join`);
    return res.data.data;
  },
};
