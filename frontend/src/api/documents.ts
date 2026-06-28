import { api, toQuery } from './client';
import type { DocumentDetail, DocumentSummary, Page } from './types';

export type DocumentSort = 'recent' | 'created' | 'title';

export interface DocumentFilters {
  q?: string;
  collectionId?: number | null;
  sort?: DocumentSort;
  limit?: number;
  offset?: number;
}

export interface NewDocument {
  title: string;
  content: string;
  source_type: 'text' | 'markdown';
  author?: string | null;
  source_url?: string | null;
}

export const documentsApi = {
  list: (filters: DocumentFilters = {}) =>
    api.get<Page<DocumentSummary>>(
      `/documents${toQuery({
        q: filters.q,
        collection_id: filters.collectionId,
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
      })}`,
    ),
  get: (id: number) => api.get<DocumentDetail>(`/documents/${id}`),
  create: (data: NewDocument) => api.post<DocumentDetail>('/documents', data),
  upload: (file: File, title?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return api.upload<DocumentDetail>('/documents/upload', form);
  },
  update: (
    id: number,
    data: Partial<{ title: string; author: string | null; source_url: string | null }>,
  ) => api.patch<DocumentDetail>(`/documents/${id}`, data),
  remove: (id: number) => api.delete(`/documents/${id}`),
  saveProgress: (id: number, progress: number, position: number | null, keepalive = false) =>
    api.put<{ progress: number; position: number | null }>(
      `/documents/${id}/progress`,
      { progress, position },
      { keepalive },
    ),
};
