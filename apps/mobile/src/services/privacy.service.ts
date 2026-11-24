import { api } from './api';
import { CreatePrivacyZoneInput } from '@sportup/shared';

export interface PrivacyZoneItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  createdAt: string;
}

export const privacyService = {
  async getPrivacyZones(): Promise<PrivacyZoneItem[]> {
    const res = await api.get('/privacy/zones');
    return res.data.data;
  },

  async createPrivacyZone(data: CreatePrivacyZoneInput): Promise<PrivacyZoneItem> {
    const res = await api.post('/privacy/zones', data);
    return res.data.data;
  },

  async deletePrivacyZone(id: string): Promise<{ message: string }> {
    const res = await api.delete(`/privacy/zones/${id}`);
    return res.data.data;
  },
};
