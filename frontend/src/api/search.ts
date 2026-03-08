import { api, toQuery } from './client';
import type { Color, SearchResults } from './types';

export interface SearchParams {
  q: string;
  tag?: string | null;
  color?: Color | null;
  collectionId?: number | null;
}

export const searchApi = {
  search: ({ q, tag, color, collectionId }: SearchParams) =>
    api.get<SearchResults>(`/search${toQuery({ q, tag, color, collection_id: collectionId })}`),
};
