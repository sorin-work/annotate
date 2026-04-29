import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import type { DocumentDetail, Highlight } from '../api/types';
import { mockApi, renderApp, user } from '../test/utils';
import DocumentPage from './DocumentPage';

const content = 'Our life is frittered away by detail.\n\nSimplicity, simplicity, simplicity!';

const doc: DocumentDetail = {
  id: 5,
  title: 'Walden',
  source_type: 'text',
  author: 'Henry David Thoreau',
  word_count: 11,
  highlight_count: 1,
  excerpt: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_opened_at: null,
  content,
  original_filename: null,
  source_url: null,
  collections: [{ id: 2, name: 'Philosophy' }],
};

const highlight: Highlight = {
  id: 11,
  document_id: 5,
  start_offset: 0,
  end_offset: 37,
  quote: 'Our life is frittered away by detail.',
  color: 'yellow',
  note: 'Notifications, these days.',
  tags: ['attention'],
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('DocumentPage', () => {
  it('shows the document with its highlights in the sidebar', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /documents/5': doc,
      'GET /documents/5/highlights': [highlight],
      'GET /tags': [{ id: 1, name: 'attention', highlight_count: 1 }],
    });
    renderApp(<DocumentPage />, { route: '/documents/5', path: '/documents/:id' });

    expect(await screen.findByRole('heading', { name: 'Walden' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Philosophy' })).toBeInTheDocument();

    const sidebar = screen.getByRole('complementary', { name: 'Highlights' });
    expect(await within(sidebar).findByText('1 highlight')).toBeInTheDocument();
    expect(within(sidebar).getByText('Notifications, these days.')).toBeInTheDocument();

    const mark = within(screen.getByTestId('reader')).getByText(highlight.quote);
    expect(mark.tagName).toBe('MARK');
  });

  it('saves a note on the selected highlight', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'GET /documents/5': doc,
      'GET /documents/5/highlights': [highlight],
      'GET /tags': [],
      'PATCH /highlights/11': { ...highlight, note: 'Rewritten note' },
    });
    renderApp(<DocumentPage />, { route: '/documents/5', path: '/documents/:id' });

    const sidebar = await screen.findByRole('complementary', { name: 'Highlights' });
    await userEvent.click(await within(sidebar).findByRole('button', { name: /frittered/ }));

    const note = within(sidebar).getByPlaceholderText('Why does this matter?');
    await userEvent.clear(note);
    await userEvent.type(note, 'Rewritten note');
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Save note' }));

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')).toEqual({
        method: 'PATCH',
        path: '/highlights/11',
        body: { note: 'Rewritten note' },
      }),
    );
  });

  it('shows an error for a missing document', async () => {
    mockApi({ 'GET /auth/me': user, 'GET /documents/404/highlights': [], 'GET /tags': [] });
    renderApp(<DocumentPage />, { route: '/documents/404', path: '/documents/:id' });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the library' })).toBeInTheDocument();
  });
});
