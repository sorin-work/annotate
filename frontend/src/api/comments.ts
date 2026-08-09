import { api } from './client';
import type { Comment } from './types';

export const commentsApi = {
  list: (highlightId: number) => api.get<Comment[]>(`/highlights/${highlightId}/comments`),
  add: (highlightId: number, body: string) =>
    api.post<Comment>(`/highlights/${highlightId}/comments`, { body }),
  update: (id: number, body: string) => api.patch<Comment>(`/comments/${id}`, { body }),
  remove: (id: number) => api.delete(`/comments/${id}`),
};
