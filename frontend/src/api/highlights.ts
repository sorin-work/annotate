import { api, toQuery } from './client';
import type { Color, Highlight, HighlightWithDocument, Page } from './types';

export interface NewHighlight {
  start_offset: number;
  end_offset: number;
  color: Color;
  note?: string | null;
  tags?: string[];
}

export interface HighlightChanges {
  color?: Color;
  note?: string | null;
  tags?: string[];
}

export type BulkAction =
  { delete: true } | { color?: Color; add_tags?: string[]; remove_tags?: string[] };

export type HighlightSort = 'newest' | 'oldest' | 'document';

export interface HighlightFilters {
  q?: string;
  tag?: string | null;
  color?: Color | null;
  documentId?: number | null;
  collectionId?: number | null;
  sort?: HighlightSort;
  limit?: number;
  offset?: number;
}

export const highlightsApi = {
  forDocument: (documentId: number) => api.get<Highlight[]>(`/documents/${documentId}/highlights`),
  create: (documentId: number, data: NewHighlight) =>
    api.post<Highlight>(`/documents/${documentId}/highlights`, data),
  update: (id: number, changes: HighlightChanges) =>
    api.patch<Highlight>(`/highlights/${id}`, changes),
  remove: (id: number) => api.delete(`/highlights/${id}`),
  bulk: (ids: number[], action: BulkAction) =>
    api.post<{ updated: number; deleted: number }>('/highlights/bulk', { ids, ...action }),
  list: (filters: HighlightFilters = {}) =>
    api.get<Page<HighlightWithDocument>>(
      `/highlights${toQuery({
        q: filters.q,
        tag: filters.tag,
        color: filters.color,
        document_id: filters.documentId,
        collection_id: filters.collectionId,
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
      })}`,
    ),
};
