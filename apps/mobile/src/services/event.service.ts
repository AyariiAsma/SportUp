import { api } from './api';
import type {
  ApiResponse,
  SportEvent,
  EventDetail,
  EventComment,
  EventParticipant,
  CreateEventInput,
} from '@sportup/shared';
import type { AttendanceStatus } from '@sportup/shared';

export const eventService = {
  async getEvents(params?: { lat?: number; lng?: number; region?: string; city?: string; sportId?: string }): Promise<SportEvent[]> {
    const response = await api.get<{ success: boolean; data: SportEvent[] }>('/events', {
      params,
    });
    return response.data.data;
  },

  async getNearbyEvents(lat: number, lng: number, radius = 50): Promise<SportEvent[]> {
    const response = await api.get<{ success: boolean; data: SportEvent[] }>('/events', {
      params: { lat, lng, radiusKm: radius, sortBy: 'distance' },
    });
    return response.data.data;
  },

  async getMyEvents(): Promise<{ organized: SportEvent[]; joined: SportEvent[] }> {
    const response = await api.get<ApiResponse<{ organized: SportEvent[]; joined: SportEvent[] }>>('/events/my');
    return response.data.data;
  },

  async getEventById(id: string): Promise<EventDetail> {
    const response = await api.get<ApiResponse<EventDetail>>(`/events/${id}`);
    return response.data.data;
  },

  async createEvent(data: CreateEventInput): Promise<SportEvent> {
    const response = await api.post<ApiResponse<SportEvent>>('/events', data);
    return response.data.data;
  },

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/events/${id}`);
  },

  async joinEvent(id: string): Promise<void> {
    await api.post(`/events/${id}/join`);
  },

  async leaveEvent(id: string): Promise<void> {
    await api.delete(`/events/${id}/join`);
  },

  async getParticipants(eventId: string): Promise<EventParticipant[]> {
    const response = await api.get<ApiResponse<EventParticipant[]>>(`/events/${eventId}/participants`);
    return response.data.data;
  },

  async markAttendance(
    eventId: string,
    userId: string,
    attendance: AttendanceStatus,
  ): Promise<{ attendance: AttendanceStatus; pointsAwarded: number; rankScore?: number; runningLevel?: string }> {
    const response = await api.patch<ApiResponse<{ attendance: AttendanceStatus; pointsAwarded: number; rankScore?: number; runningLevel?: string }>>(
      `/events/${eventId}/participants/${userId}/attendance`,
      { attendance },
    );
    return response.data.data;
  },

  async getComments(eventId: string): Promise<EventComment[]> {
    const response = await api.get<ApiResponse<EventComment[]>>(`/events/${eventId}/comments`);
    return response.data.data;
  },

  async postComment(eventId: string, content: string, parentCommentId?: string): Promise<EventComment> {
    const response = await api.post<ApiResponse<EventComment>>(`/events/${eventId}/comments`, { content, parentCommentId });
    return response.data.data;
  },

  async deleteComment(eventId: string, commentId: string): Promise<void> {
    await api.delete(`/events/${eventId}/comments/${commentId}`);
  },

  async sendInvitation(eventId: string, inviteeId: string): Promise<void> {
    await api.post(`/events/${eventId}/invitations`, { inviteeId });
  },

  async getInvitations(eventId: string): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>(`/events/${eventId}/invitations`);
    return response.data.data;
  },

  async getMyInvitations(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/events/invitations/my');
    return response.data.data;
  },

  async respondToInvitation(invitationId: string, status: 'ACCEPTED' | 'DECLINED'): Promise<void> {
    await api.put(`/events/invitations/${invitationId}`, { status });
  },

  async likeEvent(eventId: string): Promise<{ liked: boolean }> {
    const response = await api.post<{ success: boolean; liked: boolean }>(`/events/${eventId}/like`);
    return { liked: response.data.liked };
  },

  async likeComment(eventId: string, commentId: string): Promise<{ liked: boolean }> {
    const response = await api.post<{ success: boolean; liked: boolean }>(`/events/${eventId}/comments/${commentId}/like`);
    return { liked: response.data.liked };
  },
};
