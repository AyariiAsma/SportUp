import { api } from './api';

export interface EventFinisherItem {
  id: string;
  rank: number;
  timeSec: number;
  distanceKm: number;
  paceSec: number;
  completedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
}

export interface EventAnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  };
}

export const eventExtService = {
  async getCheckinCode(eventId: string): Promise<{ eventId: string; eventTitle: string; checkinToken: string }> {
    const res = await api.get(`/events/${eventId}/checkin-code`);
    return res.data.data;
  },

  async checkin(eventId: string, checkinToken: string): Promise<{ message: string; participant: any }> {
    const res = await api.post(`/events/${eventId}/checkin`, { checkinToken });
    return res.data.data;
  },

  async getEventResults(eventId: string): Promise<EventFinisherItem[]> {
    const res = await api.get(`/events/${eventId}/results`);
    return res.data.data;
  },

  async getAnnouncements(eventId: string): Promise<EventAnnouncementItem[]> {
    const res = await api.get(`/events/${eventId}/announcements`);
    return res.data.data;
  },

  async postAnnouncement(eventId: string, title: string, content: string, isPinned = false): Promise<EventAnnouncementItem> {
    const res = await api.post(`/events/${eventId}/announcements`, { title, content, isPinned });
    return res.data.data;
  },

  async toggleKudos(runSessionId: string): Promise<{ hasKudos: boolean; count: number }> {
    const res = await api.post(`/runs/${runSessionId}/kudos`);
    return res.data.data;
  },
};
