import { screen, waitFor, within } from '@testing-library/react';
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
    comment_count: 0,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  };
}

beforeEach(() => tokenStore.set('token'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it('tags and deletes selected highlights in one go', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'GET /tags': [{ id: 1, name: 'later', highlight_count: 0 }],
      'GET /collections': [],
      'GET /highlights': {
        items: [
          makeHighlight(1, 'Simplify'),
          makeHighlight(2, 'Be still'),
          makeHighlight(3, 'Read'),
        ],
        total: 3,
      },
      'POST /highlights/bulk': { updated: 2, deleted: 0 },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderApp(<HighlightsPage />, { route: '/highlights' });

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select “Simplify”' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select “Read”' }));
    const bar = screen.getByRole('region', { name: 'Bulk actions' });
    expect(bar).toHaveTextContent('2 highlights selected');

    await userEvent.type(within(bar).getByLabelText('Tag to add'), 'reread');
    await userEvent.click(within(bar).getByRole('button', { name: 'Add tag' }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({
        ids: [1, 3],
        add_tags: ['reread'],
      }),
    );

    await userEvent.click(within(bar).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({
        ids: [1, 3],
        delete: true,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument(),
    );
  });
});
