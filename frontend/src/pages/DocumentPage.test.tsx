import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import type { DocumentDetail, Highlight } from '../api/types';
import { mockApi, renderApp, testQueryClient, user } from '../test/utils';
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
  reading_progress: 0,
  content,
  original_filename: null,
  source_url: null,
  last_position: null,
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
  comment_count: 0,
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

  it('highlights the selection in a colour with the number keys', async () => {
    const created = { ...highlight, id: 12, start_offset: 39, end_offset: 49, color: 'blue' };
    const { calls } = mockApi({
      'GET /auth/me': user,
      'GET /documents/5': doc,
      'GET /documents/5/highlights': [],
      'GET /tags': [],
      'POST /documents/5/highlights': created,
    });
    renderApp(<DocumentPage />, { route: '/documents/5', path: '/documents/:id' });

    const text = (await screen.findByText(/^Simplicity/)).firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 10);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.mouseUp(screen.getByTestId('reader'));
    expect(await screen.findByRole('toolbar', { name: 'Highlight selection' })).toBeInTheDocument();

    await userEvent.keyboard('3');
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        start_offset: 39,
        end_offset: 49,
        color: 'blue',
      }),
    );
  });

  it('steps through highlights with j and k without focusing the note', async () => {
    const second = { ...highlight, id: 12, start_offset: 39, end_offset: 49, quote: 'Simplicity' };
    mockApi({
      'GET /auth/me': user,
      'GET /documents/5': doc,
      'GET /documents/5/highlights': [highlight, second],
      'GET /tags': [],
    });
    renderApp(<DocumentPage />, { route: '/documents/5', path: '/documents/:id' });
    const sidebar = await screen.findByRole('complementary', { name: 'Highlights' });
    await within(sidebar).findByText('2 highlights');

    await userEvent.keyboard('j');
    const note = within(sidebar).getByPlaceholderText('Why does this matter?');
    expect(note).toHaveValue('Notifications, these days.');
    expect(note).not.toHaveFocus();

    await userEvent.keyboard('j');
    expect(within(sidebar).getByPlaceholderText('Why does this matter?')).toHaveValue(
      'Notifications, these days.',
    );
    expect(document.getElementById('highlight-12')).toHaveClass('active');

    await userEvent.keyboard('n');
    expect(within(sidebar).getByPlaceholderText('Why does this matter?')).toHaveFocus();
    // Typing in the note doesn't trigger shortcuts; leave it before pressing Escape.
    (document.activeElement as HTMLElement).blur();

    await userEvent.keyboard('{Escape}');
    expect(within(sidebar).queryByPlaceholderText('Why does this matter?')).not.toBeInTheDocument();
  });

  it('can undo deleting a highlight', async () => {
    const { calls } = mockApi({
      'GET /auth/me': user,
      'GET /documents/5': doc,
      'GET /documents/5/highlights': [highlight],
      'GET /tags': [],
      'DELETE /highlights/11': undefined,
      'POST /documents/5/highlights': { ...highlight, id: 13 },
    });
    renderApp(<DocumentPage />, { route: '/documents/5', path: '/documents/:id' });
    const sidebar = await screen.findByRole('complementary', { name: 'Highlights' });
    await userEvent.click(await within(sidebar).findByRole('button', { name: /frittered/ }));
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Highlight deleted')).toBeInTheDocument();
    expect(within(sidebar).getByText('0 highlights')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        start_offset: 0,
        end_offset: 37,
        color: 'yellow',
        note: 'Notifications, these days.',
        tags: ['attention'],
      }),
    );
    expect(await within(sidebar).findByText('1 highlight')).toBeInTheDocument();
  });

  it('marks the dashboard and activity as out of date after highlighting', async () => {
    mockApi({
      'GET /auth/me': user,
      'GET /documents/5': doc,
      'GET /documents/5/highlights': [],
      'GET /tags': [],
      'POST /documents/5/highlights': { ...highlight, id: 12 },
    });
    const queryClient = testQueryClient();
    queryClient.setQueryData(['stats'], { highlights: 0 });
    queryClient.setQueryData(['activity'], { pages: [], pageParams: [] });
    renderApp(<DocumentPage />, { route: '/documents/5', path: '/documents/:id', queryClient });

    const text = (await screen.findByText(/^Our life/)).firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 8);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.mouseUp(screen.getByTestId('reader'));
    await userEvent.keyboard('1');

    await waitFor(() => expect(queryClient.getQueryState(['stats'])?.isInvalidated).toBe(true));
    expect(queryClient.getQueryState(['activity'])?.isInvalidated).toBe(true);
  });
});
