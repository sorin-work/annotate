import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import type { HighlightWithDocument } from '../api/types';
import { mockApi, renderApp, user } from '../test/utils';
import HighlightsPage from './HighlightsPage';

function makeHighlight(id: number, quote: string): HighlightWithDocument {
  return {
    id,
    document_id: 1,
    document_title: 'Walden',
    start_offset: id * 10,
    end_offset: id * 10 + quote.length,
    quote,
    color: 'yellow',
    note: null,
    tags: [],
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  };
}

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('HighlightsPage', () => {
  it('asks the api for the chosen order', async () => {
    const { fetchMock } = mockApi({
      'GET /auth/me': user,
      'GET /tags': [],
      'GET /collections': [],
      'GET /highlights': { items: [makeHighlight(1, 'Simplify')], total: 1 },
    });
    renderApp(<HighlightsPage />, { route: '/highlights' });
    expect(await screen.findByText('Simplify')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'oldest');
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('sort=oldest'))).toBe(true),
    );
  });
});
