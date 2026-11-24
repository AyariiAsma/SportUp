import { api } from './api';
import {
  CreateClubInput,
  ClubQueryInput,
  SportActivityType,
} from '@sportup/shared';

export interface ClubItem {
  id: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  country?: string | null;
  sportType: SportActivityType;
  isPrivate: boolean;
  membersCount: number;
  challengesCount: number;
  isMember: boolean;
  myRole?: 'MEMBER' | 'ADMIN' | 'OWNER' | null;
}

export interface ClubPostItem {
  id: string;
  content: string;
  mediaUrls: string[];
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
}

export interface ClubLeaderboardEntry {
  rank: number;
  totalDistanceKm: number;
  activitiesCount: number;
  totalDurationSec: number;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
}

export const clubService = {
  async exploreClubs(params?: ClubQueryInput): Promise<{ clubs: ClubItem[]; total: number }> {
    const res = await api.get('/clubs/explore', { params });
    return res.data.data;
  },

  async getClubDetails(id: string): Promise<ClubItem & { members: any[]; posts: ClubPostItem[] }> {
    const res = await api.get(`/clubs/${id}`);
    return res.data.data;
  },

  async createClub(data: CreateClubInput): Promise<ClubItem> {
    const res = await api.post('/clubs', data);
    return res.data.data;
  },

  async joinClub(id: string): Promise<{ isMember: boolean; message: string }> {
    const res = await api.post(`/clubs/${id}/join`);
    return res.data.data;
  },

  async getClubPosts(id: string): Promise<ClubPostItem[]> {
    const res = await api.get(`/clubs/${id}/posts`);
    return res.data.data;
  },

  async createClubPost(id: string, content: string, mediaUrls: string[] = []): Promise<ClubPostItem> {
    const res = await api.post(`/clubs/${id}/posts`, { content, mediaUrls });
    return res.data.data;
  },

  async getClubLeaderboard(id: string): Promise<ClubLeaderboardEntry[]> {
    const res = await api.get(`/clubs/${id}/leaderboard`);
    return res.data.data;
  },
};
