import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import type { DocumentSummary } from '../api/types';
import { mockApi, renderApp, user } from '../test/utils';
import LibraryPage from './LibraryPage';

const walden: DocumentSummary = {
  id: 5,
  title: 'Walden',
  source_type: 'markdown',
  author: 'Henry David Thoreau',
  word_count: 2300,
  highlight_count: 3,
  excerpt: 'I went to the woods because I wished to live deliberately.',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_opened_at: null,
  reading_progress: 0.42,
};

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('LibraryPage', () => {
  it('lists documents with their reading progress', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /collections': [],
      'GET /documents': { items: [walden], total: 1 },
    });
    renderApp(<LibraryPage />);
    expect(await screen.findByRole('heading', { name: 'Walden' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progress in Walden' })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
  });

  it('filters by reading status', async () => {
    const { fetchMock } = mockApi({
      'GET /auth/me': user,
      'GET /collections': [],
      'GET /documents': { items: [walden], total: 1 },
    });
    renderApp(<LibraryPage />);
    await screen.findByRole('heading', { name: 'Walden' });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Reading status' }),
      'reading',
    );
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('status=reading'))).toBe(
        true,
      ),
    );
  });
});
