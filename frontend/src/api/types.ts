export interface User {
  id: number;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export type SourceType = 'text' | 'markdown' | 'pdf';

export interface DocumentSummary {
  id: number;
  title: string;
  source_type: SourceType;
  author: string | null;
  word_count: number;
  highlight_count: number;
  excerpt: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
  original_filename: string | null;
  source_url: string | null;
  collections: { id: number; name: string }[];
}

export const COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;
export type Color = (typeof COLORS)[number];

export interface Highlight {
  id: number;
  document_id: number;
  start_offset: number;
  end_offset: number;
  quote: string;
  color: Color;
  note: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface HighlightWithDocument extends Highlight {
  document_title: string;
}

export interface Tag {
  id: number;
  name: string;
  highlight_count: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionDetail extends Collection {
  documents: DocumentSummary[];
}

export interface SearchResults {
  query: string;
  documents: { id: number; title: string; author: string | null; snippet: string }[];
  highlights: HighlightWithDocument[];
}
