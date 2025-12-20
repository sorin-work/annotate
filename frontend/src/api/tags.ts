import { api } from './client';
import type { Tag } from './types';

export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  rename: (id: number, name: string) => api.patch<Tag>(`/tags/${id}`, { name }),
  remove: (id: number) => api.delete(`/tags/${id}`),
};
