import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

// For MVP, we'll define simple Post types locally if not fully exported
export interface Post {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  authorId: string;
  author: {
    name: string;
    username: string;
  };
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
}

export const postService = {
  async getFeed(): Promise<Post[]> {
    const response = await api.get<ApiResponse<Post[]>>('/posts');
    return response.data.data;
  },

  async createPost(content: string, mediaUrl?: string): Promise<Post> {
    const response = await api.post<ApiResponse<Post>>('/posts', { content, mediaUrl });
    return response.data.data;
  },

  async likePost(id: string): Promise<void> {
    await api.post(`/posts/${id}/like`);
  },

  async unlikePost(id: string): Promise<void> {
    await api.post(`/posts/${id}/unlike`);
  },
};
