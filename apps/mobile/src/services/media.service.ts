import { getApiUrl } from './api';
import { storage } from '../utils/storage';

export interface UploadedMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
  sizeBytes: number;
}

export const mediaService = {
  async uploadMedia(uri: string): Promise<UploadedMedia> {
    const token = await storage.getItem('access_token');
    const formData = new FormData();

    // Construct file object
    const uriParts = uri.split('/');
    const rawFileName = uriParts[uriParts.length - 1] || 'photo.jpg';
    const fileName = rawFileName.includes('.') ? rawFileName : `${rawFileName}.jpg`;
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : fileExt === 'gif' ? 'image/gif' : 'image/jpeg';

    formData.append('file', {
      uri: uri,
      name: fileName,
      type: mimeType,
    } as any);

    const uploadUrl = `${getApiUrl()}/media/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.data);
          } catch (err) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed during media upload'));
      };

      xhr.send(formData as any);
    });
  },
};
