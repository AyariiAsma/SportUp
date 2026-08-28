import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

export interface UploadedMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
  sizeBytes: number;
}

export const mediaService = {
  async uploadMedia(uri: string): Promise<UploadedMedia> {
    const formData = new FormData();

    // Construct file object
    const uriParts = uri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : fileExt === 'gif' ? 'image/gif' : 'image/jpeg';

    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await api.post<ApiResponse<UploadedMedia>>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },
};
