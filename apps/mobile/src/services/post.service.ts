import { api } from './api';
import type { ApiResponse } from '@sportup/shared';

export interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface PostComment {
  id: string;
  content: string;
  authorId: string;
  author: PostAuthor;
  createdAt: string;
  parentCommentId?: string;
  replies?: PostComment[];
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
}

export interface PostTag {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
}

export interface Post {
  id: string;
  content?: string;
  category: string;
  authorId: string;
  author: PostAuthor;
  media: PostMedia[];
  tags?: PostTag[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  isLiked?: boolean;
  isPublic: boolean;
}

// Resolve media URL to absolute URL
const BASE_URL = (() => {
  const { Platform } = require('react-native');
  return Platform.OS === 'web'
    ? 'http://localhost:3000/api/v1'
    : 'http://10.171.29.159:3000/api/v1';
})();

export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Strip /api/v1 from base and prepend
  const base = BASE_URL.replace('/api/v1', '');
  return `${base}${url}`;
}

export const postService = {
  async getFeed(page = 1, limit = 20): Promise<{ posts: Post[]; total: number; totalPages: number }> {
    const response = await api.get<ApiResponse<Post[]>>('/posts', { params: { page, limit } });
    const data = response.data as any;
    return {
      posts: data.data || [],
      total: data.pagination?.total || 0,
      totalPages: data.pagination?.totalPages || 1,
    };
  },

  async createPost(content: string, mediaIds?: string[], tags?: string[]): Promise<Post> {
    const response = await api.post<ApiResponse<Post>>('/posts', { content, mediaIds, tags });
    return response.data.data;
  },

  async updatePost(id: string, content: string): Promise<Post> {
    const response = await api.put<ApiResponse<Post>>(`/posts/${id}`, { content });
    return response.data.data;
  },

  async deletePost(id: string): Promise<void> {
    await api.delete(`/posts/${id}`);
  },

  async likePost(id: string): Promise<void> {
    await api.post(`/posts/${id}/like`);
  },

  async unlikePost(id: string): Promise<void> {
    await api.delete(`/posts/${id}/like`);
  },

  async getComments(postId: string): Promise<PostComment[]> {
    const response = await api.get<ApiResponse<PostComment[]>>(`/posts/${postId}/comments`);
    return response.data.data;
  },

  async addComment(postId: string, content: string, parentCommentId?: string): Promise<PostComment> {
    const response = await api.post<ApiResponse<PostComment>>(`/posts/${postId}/comments`, {
      content,
      parentCommentId,
    });
    return response.data.data;
  },

  async editComment(postId: string, commentId: string, content: string): Promise<PostComment> {
    const response = await api.put<ApiResponse<PostComment>>(`/posts/${postId}/comments/${commentId}`, { content });
    return response.data.data;
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await api.delete(`/posts/${postId}/comments/${commentId}`);
  },
};
