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
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
  original_filename: string | null;
  source_url: string | null;
}
