import { api } from './api';
import type { ApiResponse, Sport } from '@sportup/shared';

export const sportService = {
  async getSports(): Promise<Sport[]> {
    const response = await api.get<ApiResponse<Sport[]>>('/sports');
    return response.data.data;
  },
};
