import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

export const mediaService = {
  async uploadMedia(uri: string): Promise<string> {
    const formData = new FormData();
    
    // Construct file object
    const uriParts = uri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    const fileType = fileName.split('.').pop();

    formData.append('file', {
      uri,
      name: fileName,
      type: `image/${fileType}`,
    } as any);

    const response = await api.post<ApiResponse<{ url: string }>>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.url;
  },
};
