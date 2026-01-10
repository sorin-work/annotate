import { api } from './client';
import type { Collection, CollectionDetail } from './types';

export const collectionsApi = {
  list: () => api.get<Collection[]>('/collections'),
  get: (id: number) => api.get<CollectionDetail>(`/collections/${id}`),
  create: (name: string, description?: string | null) =>
    api.post<Collection>('/collections', { name, description: description || null }),
  update: (id: number, data: { name?: string; description?: string | null }) =>
    api.patch<Collection>(`/collections/${id}`, data),
  remove: (id: number) => api.delete(`/collections/${id}`),
  addDocument: (id: number, documentId: number) =>
    api.post<Collection>(`/collections/${id}/documents`, { document_id: documentId }),
  removeDocument: (id: number, documentId: number) =>
    api.delete(`/collections/${id}/documents/${documentId}`),
};
